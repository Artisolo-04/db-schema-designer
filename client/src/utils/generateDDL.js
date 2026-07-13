

function quoteIdent(name) {
  const clean = (name || '').trim();
  return `"${clean || 'unnamed'}"`;
}

function columnLine(col) {
  const parts = [quoteIdent(col.name), col.type || 'text'];
  if (col.isPrimaryKey) parts.push('PRIMARY KEY');
  if (col.isNotNull && !col.isPrimaryKey) parts.push('NOT NULL');
  if (col.isUnique && !col.isPrimaryKey) parts.push('UNIQUE');
  return `  ${parts.join(' ')}`;
}

export function generateDDL(tables = [], edges = []) {
  if (!tables.length) {
    return '-- Add a table on the canvas to generate SQL';
  }

  const columnById = {};
  tables.forEach((table) => {
    (table.data?.columns || []).forEach((col) => {
      columnById[col.id] = { table, column: col };
    });
  });

  const createStatements = tables.map((table) => {
    const columns = table.data?.columns || [];
    const body = columns.length
      ? columns.map(columnLine).join(',\n')
      : '  -- no columns yet';
    return `CREATE TABLE ${quoteIdent(table.data?.name)} (\n${body}\n);`;
  });

  const fkStatements = edges
    .map((edge, i) => {
      const from = columnById[edge.sourceHandle];
      const to = columnById[edge.targetHandle];
      if (!from || !to) return null;

      const constraintName = `fk_${from.table.data.name}_${from.column.name}_${i}`;
      return (
        `ALTER TABLE ${quoteIdent(from.table.data.name)}\n` +
        `  ADD CONSTRAINT ${quoteIdent(constraintName)}\n` +
        `  FOREIGN KEY (${quoteIdent(from.column.name)})\n` +
        `  REFERENCES ${quoteIdent(to.table.data.name)}(${quoteIdent(to.column.name)});`
      );
    })
    .filter(Boolean);

  return [...createStatements, ...fkStatements].join('\n\n');
}
