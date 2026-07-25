import { COLUMN_TYPES } from './columnTypes.js';

const POSTGRES_TYPE_MAP = {
  uuid: 'uuid',
  text: 'text',
  varchar: 'varchar',
  integer: 'integer',
  bigint: 'bigint',
  smallint: 'smallint',
  numeric: 'numeric',
  real: 'real',
  'double precision': 'double precision',
  boolean: 'boolean',
  date: 'date',
  timestamp: 'timestamp',
  timestamptz: 'timestamptz',
  time: 'time',
  jsonb: 'jsonb',
  json: 'json',
  bytea: 'bytea',
};

const MYSQL_TYPE_MAP = {
  uuid: 'CHAR(36)',
  text: 'TEXT',
  varchar: 'VARCHAR(255)',
  integer: 'INT',
  bigint: 'BIGINT',
  smallint: 'SMALLINT',
  numeric: 'DECIMAL',
  real: 'FLOAT',
  'double precision': 'DOUBLE',
  boolean: 'TINYINT(1)',
  date: 'DATE',
  timestamp: 'DATETIME',
  timestamptz: 'DATETIME',
  time: 'TIME',
  jsonb: 'JSON',
  json: 'JSON',
  bytea: 'BLOB',
};

const SQLITE_TYPE_MAP = {
  uuid: 'TEXT',
  text: 'TEXT',
  varchar: 'TEXT',
  integer: 'INTEGER',
  bigint: 'INTEGER',
  smallint: 'INTEGER',
  numeric: 'NUMERIC',
  real: 'REAL',
  'double precision': 'REAL',
  boolean: 'INTEGER',
  date: 'TEXT',
  timestamp: 'TEXT',
  timestamptz: 'TEXT',
  time: 'TEXT',
  jsonb: 'TEXT',
  json: 'TEXT',
  bytea: 'BLOB',
};

const MYSQL_INTEGER_TYPES = new Set(['INT', 'BIGINT', 'SMALLINT']);

export const DIALECTS = {
  postgres: {
    label: 'PostgreSQL',
    quoteIdent: (name) => `"${(name || '').trim() || 'unnamed'}"`,
    typeMap: POSTGRES_TYPE_MAP,
    isAutoIncrement: () => false,
  },
  mysql: {
    label: 'MySQL',
    quoteIdent: (name) => `\`${(name || '').trim() || 'unnamed'}\``,
    typeMap: MYSQL_TYPE_MAP,
    isAutoIncrement: (mappedType) => MYSQL_INTEGER_TYPES.has(mappedType),
  },
  sqlite: {
    label: 'SQLite',
    quoteIdent: (name) => `"${(name || '').trim() || 'unnamed'}"`,
    typeMap: SQLITE_TYPE_MAP,
    isAutoIncrement: () => false,
  },
};

export function mapColumnType(dialect, rawType) {
  const d = DIALECTS[dialect] || DIALECTS.postgres;
  if (Object.prototype.hasOwnProperty.call(d.typeMap, rawType)) {
    return d.typeMap[rawType];
  }
  return rawType;
}

if (typeof window !== 'undefined') {
  Object.entries(DIALECTS).forEach(([dialectName, d]) => {
    COLUMN_TYPES.forEach((t) => {
      if (!Object.prototype.hasOwnProperty.call(d.typeMap, t)) {
        console.warn(`[dialects] missing "${t}" mapping for dialect "${dialectName}"`);
      }
    });
  });
}
