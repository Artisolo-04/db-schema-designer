import { Table2, Plus, Trash2, Key, Asterisk, Fingerprint } from 'lucide-react';
import { COLUMN_TYPES } from '../../utils/columnTypes.js';
import { createDefaultColumn } from '../../utils/schemaDefaults.js';
import EditableText from './EditableText.jsx';
import TypeSelect from './TypeSelect.jsx';
import RelationshipPicker from './RelationshipPicker.jsx';

const FLAGS = [
  { key: 'isPrimaryKey', label: 'Primary key', icon: Key },
  { key: 'isNotNull', label: 'Not null', icon: Asterisk },
  { key: 'isUnique', label: 'Unique', icon: Fingerprint },
];

export default function TableNode({ id, data, onUpdateData, onDeleteTable, onCreateRelationship, allTables, bringToFront }) {
  function updateData(updater) {
    onUpdateData?.(id, updater);
  }

  function setTableName(name) {
    updateData((d) => ({ ...d, name }));
  }

  function addColumn() {
    updateData((d) => ({ ...d, columns: [...d.columns, createDefaultColumn()] }));
  }

  function deleteColumn(colId) {
    updateData((d) => ({ ...d, columns: d.columns.filter((c) => c.id !== colId) }));
  }

  function updateColumn(colId, patch) {
    updateData((d) => ({
      ...d,
      columns: d.columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
    }));
  }

  function toggleFlag(colId, flagKey) {
    updateData((d) => ({
      ...d,
      columns: d.columns.map((c) =>
        c.id === colId ? { ...c, [flagKey]: !c[flagKey] } : c
      ),
    }));
  }

  const columns = data.columns || [];

  return (
    <div className="w-full h-full glass-card overflow-none shadow-xl shadow-black/40 nodrag-target flex flex-col" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
      {}
      <div className="flex items-center gap-3 px-4 py-0 bg-surface-2 border-b border-surface-border cursor-grab active:cursor-grabbing flex-shrink-0 rounded-t-2xl overflow-hidden" style={{ height: '40px' }}>
        <Table2 className="w-4 h-4 text-brand-400 shrink-0" />
        <EditableText
          value={data.name}
          onChange={setTableName}
          className="text-sm font-semibold text-slate-100 truncate flex-1 hover:text-brand-300 transition"
          inputClassName="text-sm font-semibold bg-surface-3 border border-brand-500/50 rounded px-2 py-1 text-slate-100 flex-1 outline-none nodrag"
          placeholder="table_name"
        />
        <button
          onClick={() => onDeleteTable?.(id)}
          className="nodrag text-slate-500 hover:text-red-400 transition shrink-0"
          title="Delete table"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {}
      <div className="flex-1 overflow-none">
        {columns.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4 py-3 text-xs text-slate-500 italic">
            No columns yet
          </div>
        ) : (
          <div className="divide-y divide-surface-border/50">
            {columns.map((col) => (
              <div
                key={col.id}
                className="group relative px-3 hover:bg-surface-2/40 transition flex flex-col justify-between nodrag-target"
                style={{ height: '80px' }}
              >
                {}
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <EditableText
                    value={col.name}
                    onChange={(name) => updateColumn(col.id, { name })}
                    className="text-xs text-slate-200 truncate flex-1 min-w-0 hover:text-brand-300 transition font-medium"
                    inputClassName="text-xs bg-surface-3 border border-brand-500/50 rounded px-1.5 py-0.5 text-slate-100 flex-1 min-w-0 outline-none"
                    placeholder="column_name"
                  />

                  <TypeSelect
                    value={col.type}
                    options={COLUMN_TYPES}
                    onChange={(type) => updateColumn(col.id, { type })}
                    onOpen={() => bringToFront?.(id)}
                  />

                  <button
                    onClick={() => deleteColumn(col.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition shrink-0 p-0.5"
                    title="Delete column"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {}
                <div className="flex items-center gap-2 pb-2 pt-1">
                  <div className="flex items-center gap-0.5">
                    {FLAGS.map(({ key, label, icon: Icon }) => {
                      const active = !!col[key];
                      return (
                        <button
                          key={key}
                          onClick={() => toggleFlag(col.id, key)}
                          title={label}
                          className={`flex items-center justify-center w-6 h-6 rounded border transition text-[10px]
                            ${active
                              ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                              : 'bg-transparent border-surface-border text-slate-600 hover:text-slate-400 hover:border-slate-600'}`}
                        >
                          <Icon className="w-3 h-3" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="ml-auto">
                    <RelationshipPicker
                      targets={(allTables || []).flatMap((table) =>
                        (table.data?.columns || [])
                          .filter((c) => c.id !== col.id && (c.isPrimaryKey || c.isUnique))
                          .map((column) => ({ tableName: table.data.name, column }))
                      )}
                      onSelect={(targetColId) => onCreateRelationship?.(col.id, targetColId)}
                      onOpen={() => bringToFront?.(id)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {}
      <button
        onClick={addColumn}
        className="w-full flex items-center justify-center gap-1.5 px-3 text-xs text-slate-400 hover:text-brand-300 hover:bg-surface-2/60 transition border-t border-surface-border nodrag flex-shrink-0 rounded-b-2xl"
        style={{ height: '40px' }}
      >
        <Plus className="w-3.5 h-3.5" />
        Add column
      </button>
    </div>
  );
}
