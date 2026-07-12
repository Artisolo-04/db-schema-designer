let idCounter = 0;

export function generateId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function createDefaultTable(position) {
  return {
    id: generateId('table'),
    type: 'tableNode',
    position,
    data: {
      name: 'new_table',
      columns: [
        {
          id: generateId('col'),
          name: 'id',
          type: 'uuid',
          isPrimaryKey: true,
          isNotNull: true,
          isUnique: false,
        },
      ],
    },
  };
}
