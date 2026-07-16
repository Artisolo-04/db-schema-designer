let idCounter = 0;

export function generateId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function createDefaultColumn(overrides = {}) {
  return {
    id: generateId('col'),
    name: 'column_name',
    type: 'text',
    isPrimaryKey: false,
    isNotNull: false,
    isUnique: false,
    ...overrides,
  };
}

export function getNextTableName(existingNodes = []) {
  const usedNames = new Set(
    existingNodes
      .map((node) => node?.data?.name)
      .filter((name) => typeof name === 'string')
  );

  if (!usedNames.has('new_table')) return 'new_table';

  let n = 1;
  while (usedNames.has(`new_table_${n}`)) n += 1;
  return `new_table_${n}`;
}

export function createDefaultTable(position, existingNodes = []) {
  return {
    id: generateId('table'),
    type: 'tableNode',
    position,
    data: {
      name: getNextTableName(existingNodes),
      columns: [
        createDefaultColumn({ name: 'id', type: 'uuid', isPrimaryKey: true, isNotNull: true }),
      ],
    },
  };
}
