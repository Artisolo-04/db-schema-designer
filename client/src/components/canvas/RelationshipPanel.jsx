import { useMemo } from 'react';
import { usePresence } from './hooks/usePresence.js';
import { AlertTriangle, ArrowLeftRight, GitCommit, GitFork, Shuffle, Table2, Trash2, X } from 'lucide-react';
import Dropdown from './Dropdown.jsx';
import SqlPreview from '../SqlPreview.jsx';
import { buildForeignKeyClause } from '../../utils/generateDDL.js';

const RELATIONSHIP_TYPES = [
  { value: 'one-to-one', label: 'One to one', desc: 'Each row links to exactly one row', icon: GitCommit },
  { value: 'one-to-many', label: 'One to many', desc: 'One row links to many rows', icon: GitFork },
  { value: 'many-to-many', label: 'Many to many', desc: 'Many rows link to many rows', icon: Shuffle },
];

const ACTION_OPTIONS = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION'];

const CARDINALITY_BADGES = {
  'one-to-one': { source: '1', target: '1' },
  'one-to-many': { source: 'N', target: '1' },
  'many-to-many': { source: 'N', target: 'N' },
};

function CardinalityBadge({ value }) {
  return (
    <span
      className="w-6 h-6 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
      style={{
        background: 'linear-gradient(180deg, var(--color-brand-400) 0%, var(--color-brand-600) 100%)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.25) inset, 0 2px 8px -2px rgba(108,92,231,0.6)',
      }}
    >
      {value}
    </span>
  );
}

function MiniTableCard({ tableName, columnName, columns, onChangeColumn }) {
  const options = (columns || []).map((c) => c.name);
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-surface-border bg-surface-2 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
        <Table2 className="w-3.5 h-3.5 text-brand-300 shrink-0" />
        <span className="truncate">{tableName}</span>
      </div>
      <div className="mt-1.5">
        <Dropdown
          value={columnName}
          options={options}
          onChange={(name) => {
            const col = (columns || []).find((c) => c.name === name);
            if (col) onChangeColumn(col.id);
          }}
          fullWidth
        />
      </div>
    </div>
  );
}

function MiniConnector({ onReverse, badges }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-0.5 shrink-0">
      <div className="flex items-center gap-1.5">
        <CardinalityBadge value={badges.source} />
        <div className="flex items-center gap-0.5">
          <span className="w-2 h-px bg-brand-400/70" />
          <span className="w-2 h-px bg-brand-400/70" />
        </div>
        <CardinalityBadge value={badges.target} />
      </div>
      <button
        onClick={onReverse}
        title="Reverse relationship direction"
        className="text-slate-500 hover:text-brand-300 transition p-1.5 rounded-md hover:bg-surface-3"
      >
        <ArrowLeftRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function RelationshipPanel({
  edge, onChangeType, onChangeOnDelete, onChangeOnUpdate,
  onChangeSourceColumn, onChangeTargetColumn, onReverse, onDelete, onClose,
}) {
  const sql = useMemo(() => {
    if (!edge) return '';
    return buildForeignKeyClause({
      childTableName: edge.sourceTableName,
      childColumnName: edge.sourceColumnName,
      parentTableName: edge.targetTableName,
      parentColumnName: edge.targetColumnName,
      constraintName: `fk_${edge.sourceTableName}_${edge.sourceColumnName}`,
      onDelete: edge.onDelete,
      onUpdate: edge.onUpdate,
    });
  }, [edge]);

  const typeMismatch = !!edge && edge.sourceColumnType && edge.targetColumnType && edge.sourceColumnType !== edge.targetColumnType;
  const badges = edge ? (CARDINALITY_BADGES[edge.relationshipType] || CARDINALITY_BADGES['one-to-many']) : CARDINALITY_BADGES['one-to-many'];

  const childIsSource = !!edge && !(!edge.targetIsReferenceable && edge.sourceIsReferenceable);
  const childIsNotNull = !!edge && (childIsSource ? edge.sourceIsNotNull : edge.targetIsNotNull);
  const childLabel = edge
    ? (childIsSource
        ? `${edge.sourceTableName}.${edge.sourceColumnName}`
        : `${edge.targetTableName}.${edge.targetColumnName}`)
    : '';
  const nullConflict = !!edge && childIsNotNull && (edge.onDelete === 'SET NULL' || edge.onUpdate === 'SET NULL');
  const nullConflictAction = edge && edge.onDelete === 'SET NULL' && edge.onUpdate === 'SET NULL'
    ? 'ON DELETE and ON UPDATE are'
    : edge && edge.onDelete === 'SET NULL' ? 'ON DELETE is' : 'ON UPDATE is';

  const typeMismatchPresence = usePresence(typeMismatch);
  const nullConflictPresence = usePresence(nullConflict);

  if (!edge) return null;

  return (
    <div className="h-full w-full flex flex-col p-4 gap-4 bg-surface-1 overflow-y-auto custom-scroll">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-slate-100">Relationship</div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition shrink-0" title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-stretch gap-1.5">
        <MiniTableCard
          tableName={edge.sourceTableName}
          columnName={edge.sourceColumnName}
          columns={edge.sourceTableColumns}
          onChangeColumn={onChangeSourceColumn}
        />
        <MiniConnector onReverse={onReverse} badges={badges} />
        <MiniTableCard
          tableName={edge.targetTableName}
          columnName={edge.targetColumnName}
          columns={edge.targetTableColumns}
          onChangeColumn={onChangeTargetColumn}
        />
      </div>

      {typeMismatchPresence.mounted && (
        <div
          key="type-mismatch-warning"
          className={`flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 ${
            typeMismatchPresence.leaving ? 'warning-banner-leaving' : 'warning-banner'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300 leading-relaxed">
            Column type mismatch: <span className="font-mono">{edge.sourceColumnType}</span> vs{' '}
            <span className="font-mono">{edge.targetColumnType}</span>. This foreign key may fail in SQL.
          </div>
        </div>
      )}

        {nullConflictPresence.mounted && (
          <div
            key="null-conflict-warning"
            className={`flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 ${
              nullConflictPresence.leaving ? 'warning-banner-leaving' : 'warning-banner'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-300 leading-relaxed">
              <span className="font-mono">{childLabel}</span> is NOT NULL but {nullConflictAction} SET NULL.
              This will fail at runtime — remove NOT NULL on that column or choose a different action.
            </div>
          </div>
        )}

      <div className="flex flex-col gap-2">
        {RELATIONSHIP_TYPES.map(({ value, label, desc, icon: Icon }) => {
          const active = edge.relationshipType === value;
          return (
            <button
              key={value}
              onClick={() => onChangeType(value)}
              className={`text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition
                ${active
                  ? 'bg-brand-500/15 border-brand-500 text-slate-100'
                  : 'bg-surface-2 border-surface-border text-slate-300 hover:bg-surface-3 hover:border-slate-600'}`}
            >
              <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors
                ${active ? 'bg-brand-500/25' : 'bg-surface-3'}`}>
                <Icon className={`w-4 h-4 ${active ? 'text-brand-300' : 'text-slate-500'}`} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-surface-border pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">On Delete</span>
          <Dropdown value={edge.onDelete} options={ACTION_OPTIONS} onChange={onChangeOnDelete} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">On Update</span>
          <Dropdown value={edge.onUpdate} options={ACTION_OPTIONS} onChange={onChangeOnUpdate} />
        </div>
      </div>

      <div className="border-t border-surface-border pt-4">
        <div className="text-xs text-slate-400 mb-2">SQL preview</div>
        <SqlPreview sql={sql} filename="foreign_key.sql" />
      </div>

      <div className="mt-auto pt-2">
        <button onClick={onDelete} className="btn-danger w-full">
          <Trash2 className="w-4 h-4" />
          Delete relationship
        </button>
      </div>
    </div>
  );
}
