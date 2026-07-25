import { useMemo } from 'react';
import { Shapes, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import SqlPreview from '../SqlPreview.jsx';
import { buildCreateEnumTypeClause } from '../../utils/generateDDL.js';

function generateEnumId() {
  return `enum_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function EnumTypesPanel({ enumTypes, onChangeEnumTypes }) {
  const types = enumTypes || [];

  const sql = useMemo(() => {
    const statements = types
      .filter((t) => (t.name || '').trim() && (t.values || []).length > 0)
      .map((t) => buildCreateEnumTypeClause({ name: t.name, values: t.values }));
    return statements.length ? statements.join('\n') : '-- Add a type and values to generate SQL';
  }, [types]);

  function addType() {
    onChangeEnumTypes([{ id: generateEnumId(), name: '', values: [] }, ...types]);
  }

  function updateType(typeId, patch) {
    onChangeEnumTypes(types.map((t) => (t.id === typeId ? { ...t, ...patch } : t)));
  }

  function deleteType(typeId) {
    onChangeEnumTypes(types.filter((t) => t.id !== typeId));
  }

  function addValue(typeId) {
    const t = types.find((t) => t.id === typeId);
    if (!t) return;
    updateType(typeId, { values: [...(t.values || []), ''] });
  }

  function updateValue(typeId, index, value) {
    const t = types.find((t) => t.id === typeId);
    if (!t) return;
    updateType(typeId, { values: t.values.map((v, i) => (i === index ? value : v)) });
  }

  function deleteValue(typeId, index) {
    const t = types.find((t) => t.id === typeId);
    if (!t) return;
    updateType(typeId, { values: t.values.filter((_, i) => i !== index) });
  }

  function moveValue(typeId, index, direction) {
    const t = types.find((t) => t.id === typeId);
    if (!t) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= t.values.length) return;
    const nextValues = [...t.values];
    [nextValues[index], nextValues[nextIndex]] = [nextValues[nextIndex], nextValues[index]];
    updateType(typeId, { values: nextValues });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="aspect-square flex items-center justify-center shrink-0">
            <Shapes className="w-4 h-4 text-brand-300 shrink-0" />
          </div>
          <span className="shrink-0">{types.length} - custom type{types.length === 1 ? '' : 's'}</span>
        </div>
        <button
          onClick={addType}
          title="Add type"
          className="w-8 h-8 aspect-square rounded-lg flex items-center justify-center shrink-0 text-white transition hover:brightness-110 active:scale-95 mr-0.5"
          style={{
            background: 'linear-gradient(180deg, var(--color-brand-400) 0%, var(--color-brand-600) 100%)',
            boxShadow: '0 1px 0 0 rgba(255,255,255,0.25) inset, 0 2px 8px -2px rgba(108,92,231,0.6)',
          }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[45vh] overflow-y-auto custom-scroll flex flex-col gap-3 pr-1">
        {types.length === 0 && (
          <div className="text-xs text-slate-500 italic px-1 py-4 text-center">
            No custom types yet — use the + button above.
          </div>
        )}

        {types.map((t) => (
          <div key={t.id} className="rounded-xl border border-surface-border bg-surface-2 p-3 flex flex-col gap-2.5">
            <div className="group relative flex items-center gap-2 rounded-xl border border-white/10 bg-surface-2/40 p-1.5 backdrop-blur-md transition-all duration-200">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)] transition-colors"
              >
                <Shapes className="h-4 w-4" />
              </span>

              <input
                type="text"
                value={t.name}
                onChange={(e) => updateType(t.id, { name: e.target.value })}
                placeholder="type_name"
                aria-label="Type name"
                className="h-8 py-0 px-2.5 flex-1 min-w-0 box-border rounded-lg bg-surface-3/30 text-xs font-mono text-slate-100 placeholder:text-slate-500 outline-none transition-all border border-white/5 focus:bg-surface-3/70 focus:border-brand-500/30"
              />

              <button
                type="button"
                onClick={() => deleteType(t.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-80 transition-all duration-200 hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                title="Delete type"
                aria-label={`Delete type ${t.name || 'unnamed'}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {(t.values || []).map((v, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={v}
                    onChange={(e) => updateValue(t.id, i, e.target.value)}
                    placeholder="value"
                    aria-label="Enum value"
                    className="h-8 flex-1 min-w-0 rounded-md bg-surface-3 border border-surface-border px-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-brand-500/50"
                  />
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveValue(t.id, i, -1)}
                      disabled={i === 0}
                      className="flex h-7 w-6 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-surface-3 disabled:opacity-25 disabled:hover:bg-transparent transition"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveValue(t.id, i, 1)}
                      disabled={i === t.values.length - 1}
                      className="flex h-7 w-6 items-center justify-center rounded text-slate-500 hover:text-slate-200 hover:bg-surface-3 disabled:opacity-25 disabled:hover:bg-transparent transition"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteValue(t.id, i)}
                      className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete value"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addValue(t.id)}
                className="flex items-center justify-center gap-1.5 h-8 rounded-md border border-dashed border-surface-border text-xs text-slate-400 hover:text-brand-300 hover:border-brand-500/40 transition"
              >
                <Plus className="w-3 h-3" />
                Add value
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-surface-border pt-3">
        <div className="text-xs text-slate-400 mb-2">SQL preview</div>
        <SqlPreview sql={sql} filename="types.sql" />
      </div>
    </div>
  );
}
