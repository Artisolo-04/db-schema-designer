export function validateSchema(tables, edges) {
  const warnings = [];

  const columnById = {};
  tables.forEach((table) => {
    (table.data?.columns || []).forEach((col) => {
      columnById[col.id] = { table, column: col };
    });
  });

  edges.forEach((edge) => {
    const from = columnById[edge.data?.sourceColumnId];
    const to = columnById[edge.data?.targetColumnId];
    if (!from || !to) return;

    const toIsReferenceable = to.column.isPrimaryKey || to.column.isUnique;
    const fromIsReferenceable = from.column.isPrimaryKey || from.column.isUnique;

    let child = from;
    if (!toIsReferenceable && fromIsReferenceable) {
      child = to;
    }

    const onDelete = edge.data?.onDelete || 'CASCADE';
    const onUpdate = edge.data?.onUpdate || 'CASCADE';

    if (child.column.isNotNull && onDelete === 'SET NULL') {
      warnings.push({
        edgeId: edge.id,
        tableName: child.table.data?.name,
        columnName: child.column.name,
        message: `${child.table.data?.name}.${child.column.name} is NOT NULL but ON DELETE is SET NULL — this will error at runtime.`,
      });
    }

    if (child.column.isNotNull && onUpdate === 'SET NULL') {
      warnings.push({
        edgeId: edge.id,
        tableName: child.table.data?.name,
        columnName: child.column.name,
        message: `${child.table.data?.name}.${child.column.name} is NOT NULL but ON UPDATE is SET NULL — this will error at runtime.`,
      });
    }
  });

  return warnings;
}
