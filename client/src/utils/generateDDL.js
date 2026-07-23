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

export function buildForeignKeyClause({
  childTableName,
  childColumnName,
  parentTableName,
  parentColumnName,
  constraintName,
  onDelete = 'CASCADE',
  onUpdate = 'CASCADE',
}) {
  return (
    `ALTER TABLE ${quoteIdent(childTableName)}\n` +
    `  ADD CONSTRAINT ${quoteIdent(constraintName)}\n` +
    `  FOREIGN KEY (${quoteIdent(childColumnName)})\n` +
    `  REFERENCES ${quoteIdent(parentTableName)}(${quoteIdent(parentColumnName)})\n` +
    `  ON DELETE ${onDelete}\n` +
    `  ON UPDATE ${onUpdate};`
  );
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
      const from = columnById[edge.data?.sourceColumnId];
      const to = columnById[edge.data?.targetColumnId];
      if (!from || !to) return null;

      const toIsReferenceable = to.column.isPrimaryKey || to.column.isUnique;
      const fromIsReferenceable = from.column.isPrimaryKey || from.column.isUnique;

      let child = from;
      let parent = to;
      if (!toIsReferenceable && fromIsReferenceable) {
        child = to;
        parent = from;
      }

      const constraintName = `fk_${child.table.data.name}_${child.column.name}_${i}`;
      return buildForeignKeyClause({
        childTableName: child.table.data.name,
        childColumnName: child.column.name,
        parentTableName: parent.table.data.name,
        parentColumnName: parent.column.name,
        constraintName,
        onDelete: edge.data?.onDelete || 'CASCADE',
        onUpdate: edge.data?.onUpdate || 'CASCADE',
      });
    })
    .filter(Boolean);

  return [...createStatements, ...fkStatements].join('\n\n');
}
