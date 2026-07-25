import { useMemo } from 'react';
import { ListTree, Plus, Trash2, X, Check, Fingerprint, Rows3 } from 'lucide-react';
import SqlPreview from '../SqlPreview.jsx';
import ColumnMultiSelect from './ColumnMultiSelect.jsx';
import { buildCreateIndexClause } from '../../utils/generateDDL.js';

function generateIndexId() {
  return `idx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function CustomCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none group py-0.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 transition-colors
          ${checked ? 'bg-brand-500 border-brand-500' : 'border-surface-border bg-surface-3 group-hover:border-slate-600'}`}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </button>
      {label}
    </label>
  );
}

export default function IndexPanel({ table, onChangeIndexes, onClose }) {
  const columns = table?.columns || [];
  const indexes = table?.indexes || [];

  const sql = useMemo(() => {
    if (!table) return '';
    const columnByColId = {};
    columns.forEach((c) => { columnByColId[c.id] = c; });

    const statements = indexes
      .filter((idx) => (idx.columns || []).length > 0)
      .map((idx) => {
        const columnNames = idx.columns.map((colId) => columnByColId[colId]?.name).filter(Boolean);
        if (!columnNames.length) return null;
        return buildCreateIndexClause({
          tableName: table.name,
          indexName: idx.name || `idx_${table.name}_${columnNames.join('_')}`,
          columnNames,
          isUnique: !!idx.isUnique,
        });
      })
      .filter(Boolean);

    return statements.length ? statements.join('\n') : '-- Select columns to generate an index';
  }, [table, indexes, columns]);

  if (!table) return null;

  function addIndex() {
    const newIndex = { id: generateIndexId(), name: '', columns: [], isUnique: false };
    onChangeIndexes([newIndex, ...indexes]);
  }

  function updateIndex(indexId, patch) {
    onChangeIndexes(indexes.map((idx) => (idx.id === indexId ? { ...idx, ...patch } : idx)));
  }

  function deleteIndex(indexId) {
    onChangeIndexes(indexes.filter((idx) => idx.id !== indexId));
  }

  function toggleColumn(indexId, colId) {
    const idx = indexes.find((i) => i.id === indexId);
    if (!idx) return;
    const has = idx.columns.includes(colId);
    const nextColumns = has ? idx.columns.filter((c) => c !== colId) : [...idx.columns, colId];
    updateIndex(indexId, { columns: nextColumns });
  }

  return (
    <div className="h-full w-full flex flex-col bg-surface-1">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="text-sm font-medium text-slate-100">Indexes</div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition shrink-0" title="Close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 p-4 border-b border-surface-border ">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
          <div className="w-8 h-8 aspect-square rounded-lg flex items-center justify-center shrink-0">
            <ListTree className="w-4 h-4 text-brand-300 shrink-0" />
          </div>
          <span className="truncate font-medium text-slate-200">{table.name}</span>
          <span className="text-slate-600 shrink-0">·</span>
          <span className="shrink-0">{indexes.length}</span>
        </div>
        <button
          onClick={addIndex}
          title="Add index"
          className="w-8 h-8 aspect-square rounded-lg flex items-center justify-center shrink-0 text-white transition hover:brightness-110 active:scale-95 mr-0.5"
          style={{
            background: 'linear-gradient(180deg, var(--color-brand-400) 0%, var(--color-brand-600) 100%)',
            boxShadow: '0 1px 0 0 rgba(255,255,255,0.25) inset, 0 2px 8px -2px rgba(108,92,231,0.6)',
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scroll px-3 py-3 flex flex-col gap-3">
        {indexes.length === 0 && (
          <div className="w-full h-full flex items-center justify-center ">
            <div className="text-xs text-slate-500 italic px-1 py-2 text-center">No indexes yet — use the + button above.</div>
          </div>
        )}

        {indexes.map((idx) => (
          <div key={idx.id} className="rounded-xl border border-surface-border bg-surface-2 p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 border border-surface-border bg-surface-2/50 rounded-lg p-1.5 transition-colors focus-within:border-surface-border-hover">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                  idx.isUnique
                    ? 'bg-brand-500/15 text-brand-300'
                    : 'bg-surface-3 text-slate-400'
                }`}
              >
                {idx.isUnique ? (
                  <Fingerprint className="h-3.5 w-3.5" />
                ) : (
                  <Rows3 className="h-3.5 w-3.5" />
                )}
              </span>

              <input
                type="text"
                value={idx.name}
                onChange={(e) => updateIndex(idx.id, { name: e.target.value })}
                placeholder={`idx_${table.name}_...`}
                aria-label="Index name"
                className="h-full flex-1 min-w-0 rounded-md bg-brand-300/5 px-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-colors border border-brand-200/5 focus:border-brand-500/50 focus:bg-surface-4"
              />

              <button
                type="button"
                onClick={() => deleteIndex(idx.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                title="Delete index"
                aria-label={`Delete index ${idx.name || 'unnamed'}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <ColumnMultiSelect
              columns={columns}
              selectedIds={idx.columns}
              onToggle={(colId) => toggleColumn(idx.id, colId)}
              placeholder="Select columns"
            />

            <CustomCheckbox
              checked={!!idx.isUnique}
              onChange={(checked) => updateIndex(idx.id, { isUnique: checked })}
              label="Unique index"
            />
          </div>
        ))}
      </div>

      <div className="border-t border-surface-border px-4 py-4 shrink-0">
        <div className="text-xs text-slate-400 mb-2">SQL preview</div>
        <SqlPreview sql={sql} filename="indexes.sql" />
      </div>
    </div>
  );
}
