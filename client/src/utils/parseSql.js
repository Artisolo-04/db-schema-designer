import { generateId, createDefaultColumn } from './schemaDefaults.js';

const TABLE_WIDTH = 320;
const ROW_H = 80;
const HEADER_H = 40;
const FOOTER_H = 40;
const EMPTY_H = 60;
const GRID_SIZE = 20;
const COLS_PER_ROW = 3;
const H_GAP = 80;
const V_GAP = 80;

function computeHeight(columnCount) {
  const body = columnCount > 0 ? columnCount * ROW_H : EMPTY_H;
  return HEADER_H + body + FOOTER_H;
}

function stripComments(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    if (inString) {
      current += ch;
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (ch === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function splitTopLevelCommas(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function unquoteIdent(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^"(.*)"$/) || trimmed.match(/^`(.*)`$/);
  return match ? match[1] : trimmed;
}

function parseColumnDef(defText, warnings, tableName) {
  const nameMatch = defText.match(/^("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s+([\s\S]+)$/);
  if (!nameMatch) {
    warnings.push(`Could not parse column definition in table "${tableName}": ${defText}`);
    return null;
  }
  const name = unquoteIdent(nameMatch[1]);
  let rest = nameMatch[2].trim();

  const typeMatch = rest.match(/^([A-Za-z][A-Za-z0-9_]*(?:\s+precision)?(?:\s*\([^)]*\))?(?:\[\])?)/i);
  const type = typeMatch ? typeMatch[1].trim().toLowerCase() : 'text';
  rest = rest.slice(typeMatch ? typeMatch[0].length : 0);

  const upperRest = rest.toUpperCase();
  const isPrimaryKey = /PRIMARY\s+KEY/.test(upperRest);
  const isNotNull = /NOT\s+NULL/.test(upperRest) || isPrimaryKey;
  const isUnique = /UNIQUE/.test(upperRest);

  let references = null;
  const refMatch = rest.match(/REFERENCES\s+("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\(\s*("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\)/i);
  if (refMatch) {
    references = { table: unquoteIdent(refMatch[1]), column: unquoteIdent(refMatch[2]) };
  }

  return {
    column: createDefaultColumn({ name, type, isPrimaryKey, isNotNull, isUnique }),
    references,
  };
}

function parseCreateTable(stmt, warnings) {
  const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)\s*$/i);
  if (!match) {
    warnings.push(`Could not parse CREATE TABLE statement: ${stmt.slice(0, 80)}...`);
    return null;
  }
  const tableName = unquoteIdent(match[1]);
  const body = match[2];
  const parts = splitTopLevelCommas(body);

  const columns = [];
  const pkNamesFromTableLevel = [];
  const uniqueGroupsFromTableLevel = [];
  const inlineReferences = [];

  parts.forEach((part) => {
    const trimmed = part.trim();
    const upper = trimmed.toUpperCase();

    if (/^PRIMARY\s+KEY\s*\(/i.test(trimmed)) {
      const inner = trimmed.match(/\(([\s\S]*)\)/);
      if (inner) {
        splitTopLevelCommas(inner[1]).forEach((n) => pkNamesFromTableLevel.push(unquoteIdent(n)));
      }
      return;
    }
    if (/^UNIQUE\s*\(/i.test(trimmed)) {
      const inner = trimmed.match(/\(([\s\S]*)\)/);
      if (inner) {
        uniqueGroupsFromTableLevel.push(splitTopLevelCommas(inner[1]).map(unquoteIdent));
      }
      return;
    }
    if (/^(CONSTRAINT|FOREIGN\s+KEY|CHECK)\b/i.test(trimmed)) {
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(\s*("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\)\s*REFERENCES\s+("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\(\s*("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\)/i);
      if (fkMatch) {
        inlineReferences.push({
          column: unquoteIdent(fkMatch[1]),
          refTable: unquoteIdent(fkMatch[2]),
          refColumn: unquoteIdent(fkMatch[3]),
        });
      } else {
        warnings.push(`Skipped unsupported table constraint in "${tableName}": ${trimmed.slice(0, 60)}...`);
      }
      return;
    }

    const parsed = parseColumnDef(trimmed, warnings, tableName);
    if (parsed) {
      columns.push(parsed.column);
      if (parsed.references) {
        inlineReferences.push({
          column: parsed.column.name,
          refTable: parsed.references.table,
          refColumn: parsed.references.column,
        });
      }
    }
  });

  columns.forEach((col) => {
    if (pkNamesFromTableLevel.includes(col.name)) {
      col.isPrimaryKey = true;
      col.isNotNull = true;
    }
    uniqueGroupsFromTableLevel.forEach((group) => {
      if (group.length === 1 && group[0] === col.name) col.isUnique = true;
    });
  });

  return { tableName, columns, inlineReferences };
}

function parseAlterTableForeignKey(stmt, warnings) {
  const alterMatch = stmt.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+(?:CONSTRAINT\s+("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s+)?FOREIGN\s+KEY\s*\(\s*("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\)\s*REFERENCES\s+("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\(\s*("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s*\)([\s\S]*)$/i);
  if (!alterMatch) {
    if (/ALTER\s+TABLE/i.test(stmt) && /FOREIGN\s+KEY/i.test(stmt)) {
      warnings.push(`Could not parse ALTER TABLE foreign key statement: ${stmt.slice(0, 80)}...`);
    }
    return null;
  }
  const tail = alterMatch[6] || '';
  const onDeleteMatch = tail.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i);
  const onUpdateMatch = tail.match(/ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i);

  return {
    childTable: unquoteIdent(alterMatch[1]),
    childColumn: unquoteIdent(alterMatch[3]),
    parentTable: unquoteIdent(alterMatch[4]),
    parentColumn: unquoteIdent(alterMatch[5]),
    onDelete: onDeleteMatch ? onDeleteMatch[1].toUpperCase().replace(/\s+/g, ' ') : 'CASCADE',
    onUpdate: onUpdateMatch ? onUpdateMatch[1].toUpperCase().replace(/\s+/g, ' ') : 'CASCADE',
  };
}

function parseCreateTypeEnum(stmt, warnings) {
  const match = stmt.match(/CREATE\s+TYPE\s+("(?:[^"]|"")+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_]*)\s+AS\s+ENUM\s*\(([\s\S]*)\)\s*$/i);
  if (!match) {
    warnings.push(`Could not parse CREATE TYPE statement: ${stmt.slice(0, 80)}...`);
    return null;
  }
  const name = unquoteIdent(match[1]);
  const values = splitTopLevelCommas(match[2]).map((v) => {
    const trimmed = v.trim();
    const strMatch = trimmed.match(/^'([\s\S]*)'$/);
    return strMatch ? strMatch[1].replace(/''/g, "'") : trimmed;
  });
  return { id: generateId('enum'), name, values };
}

function layoutPosition(index) {
  const col = index % COLS_PER_ROW;
  const row = Math.floor(index / COLS_PER_ROW);
  return {
    x: Math.round((col * (TABLE_WIDTH + H_GAP)) / GRID_SIZE) * GRID_SIZE,
    y: Math.round((row * 400 + row * V_GAP) / GRID_SIZE) * GRID_SIZE,
  };
}

export function parseSQL(sqlText) {
  const warnings = [];
  const tables = [];
  const edges = [];
  const enumTypes = [];
  const tableByName = {};

  if (!sqlText || !sqlText.trim()) {
    return { tables, edges, enumTypes, warnings: ['No SQL provided'] };
  }

  const cleaned = stripComments(sqlText);
  const statements = splitStatements(cleaned);

  const pendingForeignKeys = [];

  statements.forEach((stmt) => {
    const trimmed = stmt.trim();
    if (/^CREATE\s+TABLE/i.test(trimmed)) {
      const parsed = parseCreateTable(trimmed, warnings);
      if (!parsed) return;

      const id = generateId('table');
      const position = layoutPosition(tables.length);
      const tableNode = {
        id,
        type: 'tableNode',
        position,
        width: TABLE_WIDTH,
        height: computeHeight(parsed.columns.length),
        data: { name: parsed.tableName, columns: parsed.columns },
      };
      tables.push(tableNode);
      tableByName[parsed.tableName] = tableNode;

      parsed.inlineReferences.forEach((ref) => {
        pendingForeignKeys.push({
          childTable: parsed.tableName,
          childColumn: ref.column,
          parentTable: ref.refTable,
          parentColumn: ref.refColumn,
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        });
      });
      return;
    }

    if (/^CREATE\s+TYPE/i.test(trimmed)) {
      const enumType = parseCreateTypeEnum(trimmed, warnings);
      if (enumType) enumTypes.push(enumType);
      return;
    }

    if (/^ALTER\s+TABLE/i.test(trimmed)) {
      const fk = parseAlterTableForeignKey(trimmed, warnings);
      if (fk) pendingForeignKeys.push(fk);
      return;
    }

    if (trimmed) {
      warnings.push(`Skipped unsupported statement: ${trimmed.slice(0, 60)}...`);
    }
  });

  pendingForeignKeys.forEach((fk) => {
    const childTable = tableByName[fk.childTable];
    const parentTable = tableByName[fk.parentTable];
    if (!childTable || !parentTable) {
      warnings.push(`Foreign key references unknown table: ${fk.childTable}.${fk.childColumn} -> ${fk.parentTable}.${fk.parentColumn}`);
      return;
    }
    const childColumn = childTable.data.columns.find((c) => c.name === fk.childColumn);
    const parentColumn = parentTable.data.columns.find((c) => c.name === fk.parentColumn);
    if (!childColumn || !parentColumn) {
      warnings.push(`Foreign key references unknown column: ${fk.childTable}.${fk.childColumn} -> ${fk.parentTable}.${fk.parentColumn}`);
      return;
    }

    edges.push({
      id: generateId('edge'),
      source: childTable.id,
      target: parentTable.id,
      type: 'relationshipEdge',
      data: {
        sourceColumnId: childColumn.id,
        targetColumnId: parentColumn.id,
        sourceSide: 'right',
        targetSide: 'left',
        relationshipType: 'one-to-many',
        onDelete: fk.onDelete,
        onUpdate: fk.onUpdate,
      },
    });
  });

  return { tables, edges, enumTypes, warnings };
}
