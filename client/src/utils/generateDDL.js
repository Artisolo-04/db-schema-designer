import { DIALECTS, mapColumnType } from './dialects.js';

function quoteIdent(name, dialect = 'postgres') {
  const clean = (name || '').trim();
  const d = DIALECTS[dialect] || DIALECTS.postgres;
  return d.quoteIdent(clean || 'unnamed');
}

function findEnumType(rawType, enumTypes = []) {
  return enumTypes.find((et) => et.name === rawType) || null;
}

function columnLine(col, dialect, enumTypes, inlineFkClause) {
  const rawType = col.type || 'text';
  const enumType = findEnumType(rawType, enumTypes);
  const ident = quoteIdent(col.name, dialect);

  let typeSql;
  let checkClause = '';

  if (enumType) {
    const vals = (enumType.values || [])
      .map((v) => `'${String(v).replace(/'/g, "''")}'`)
      .join(', ');
    if (dialect === 'mysql') {
      typeSql = `ENUM(${vals})`;
    } else if (dialect === 'sqlite') {
      typeSql = 'TEXT';
      checkClause = ` CHECK (${ident} IN (${vals}))`;
    } else {
      typeSql = rawType;
    }
  } else {
    typeSql = mapColumnType(dialect, rawType);
  }

  const parts = [ident, typeSql];

  const isSqliteInlinePk =
    dialect === 'sqlite' && col.__sqliteSinglePk && typeSql === 'INTEGER';

  if (isSqliteInlinePk) {
    parts.push('PRIMARY KEY AUTOINCREMENT');
  } else {
    if (col.isNotNull || col.isPrimaryKey) parts.push('NOT NULL');
    if (col.isUnique && !col.isPrimaryKey) parts.push('UNIQUE');
    if (dialect === 'mysql' && col.isPrimaryKey) {
      if (DIALECTS.mysql.isAutoIncrement(typeSql)) parts.push('AUTO_INCREMENT');
    }
  }

  return `  ${parts.join(' ')}${checkClause}${inlineFkClause || ''}`;
}

export function buildForeignKeyClause({
  childTableName,
  childColumnName,
  parentTableName,
  parentColumnName,
  constraintName,
  onDelete = 'CASCADE',
  onUpdate = 'CASCADE',
}, dialect = 'postgres') {
  return (
    `ALTER TABLE ${quoteIdent(childTableName, dialect)}\n` +
    `  ADD CONSTRAINT ${quoteIdent(constraintName, dialect)}\n` +
    `  FOREIGN KEY (${quoteIdent(childColumnName, dialect)})\n` +
    `  REFERENCES ${quoteIdent(parentTableName, dialect)}(${quoteIdent(parentColumnName, dialect)})\n` +
    `  ON DELETE ${onDelete}\n` +
    `  ON UPDATE ${onUpdate};`
  );
}

export function buildCreateIndexClause({
  tableName,
  indexName,
  columnNames = [],
  isUnique = false,
}, dialect = 'postgres') {
  const cols = columnNames.map((c) => quoteIdent(c, dialect)).join(', ');
  const keyword = isUnique ? 'CREATE UNIQUE INDEX' : 'CREATE INDEX';
  return `${keyword} ${quoteIdent(indexName, dialect)} ON ${quoteIdent(tableName, dialect)} (${cols});`;
}

export function buildCreateEnumTypeClause({ name, values = [] }, dialect = 'postgres') {
  const vals = values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  return `CREATE TYPE ${quoteIdent(name, dialect)} AS ENUM (${vals});`;
}

export function generateDDL(tables = [], edges = [], enumTypes = [], dialect = 'postgres') {
  if (!tables.length) {
    return '-- Add a table on the canvas to generate SQL';
  }

  const columnById = {};
  tables.forEach((table) => {
    (table.data?.columns || []).forEach((col) => {
      columnById[col.id] = { table, column: col };
    });
  });

  const resolvedFks = edges
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

      return {
        child,
        parent,
        constraintName: `fk_${child.table.data.name}_${child.column.name}_${i}`,
        onDelete: edge.data?.onDelete || 'CASCADE',
        onUpdate: edge.data?.onUpdate || 'CASCADE',
      };
    })
    .filter(Boolean);

  const inlineFkByColumnId = {};
  if (dialect === 'sqlite') {
    resolvedFks.forEach((fk) => {
      inlineFkByColumnId[fk.child.column.id] =
        ` REFERENCES ${quoteIdent(fk.parent.table.data.name, dialect)}` +
        `(${quoteIdent(fk.parent.column.name, dialect)}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate}`;
    });
  }

  const createStatements = tables.map((table) => {
    const columns = table.data?.columns || [];
    const pkColumns = columns.filter((c) => c.isPrimaryKey);
    const singlePkCol = pkColumns.length === 1 ? pkColumns[0] : null;

    const singlePkIsInteger =
      dialect === 'sqlite' &&
      singlePkCol &&
      !findEnumType(singlePkCol.type, enumTypes) &&
      mapColumnType(dialect, singlePkCol.type || 'text') === 'INTEGER';

    const annotatedColumns = columns.map((c) => ({
      ...c,
      __sqliteSinglePk: !!(singlePkIsInteger && singlePkCol && c.id === singlePkCol.id),
    }));

    const lines = annotatedColumns.length
      ? annotatedColumns.map((c) =>
          columnLine(c, dialect, enumTypes, dialect === 'sqlite' ? inlineFkByColumnId[c.id] : null)
        )
      : ['  -- no columns yet'];

    if (pkColumns.length > 0 && !singlePkIsInteger) {
      const pkNames = pkColumns.map((c) => quoteIdent(c.name, dialect)).join(', ');
      lines.push(`  PRIMARY KEY (${pkNames})`);
    }

    return `CREATE TABLE ${quoteIdent(table.data?.name, dialect)} (\n${lines.join(',\n')}\n);`;
  });

  const indexStatements = tables.flatMap((table) => {
    const indexes = table.data?.indexes || [];
    const columnByColId = {};
    (table.data?.columns || []).forEach((c) => { columnByColId[c.id] = c; });

    return indexes
      .filter((idx) => (idx.columns || []).length > 0)
      .map((idx) => {
        const columnNames = idx.columns
          .map((colId) => columnByColId[colId]?.name)
          .filter(Boolean);
        if (!columnNames.length) return null;
        return buildCreateIndexClause({
          tableName: table.data?.name,
          indexName: idx.name || `idx_${table.data?.name}_${columnNames.join('_')}`,
          columnNames,
          isUnique: !!idx.isUnique,
        }, dialect);
      })
      .filter(Boolean);
  });

  const fkStatements = dialect === 'sqlite'
    ? []
    : resolvedFks.map((fk) =>
        buildForeignKeyClause({
          childTableName: fk.child.table.data.name,
          childColumnName: fk.child.column.name,
          parentTableName: fk.parent.table.data.name,
          parentColumnName: fk.parent.column.name,
          constraintName: fk.constraintName,
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        }, dialect)
      );

  const usedTypeNames = new Set();
  tables.forEach((table) => {
    (table.data?.columns || []).forEach((col) => {
      if (col.type) usedTypeNames.add(col.type);
    });
  });

  const enumStatements = dialect === 'postgres'
    ? enumTypes
        .filter((et) => usedTypeNames.has(et.name))
        .map((et) => buildCreateEnumTypeClause({ name: et.name, values: et.values || [] }, dialect))
    : [];

  return [...enumStatements, ...createStatements, ...indexStatements, ...fkStatements].join('\n\n');
}
