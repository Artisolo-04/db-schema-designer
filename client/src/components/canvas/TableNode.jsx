import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Table2, Plus, Trash2, Key, Asterisk, Fingerprint } from 'lucide-react';
import { useState } from 'react';
import { COLUMN_TYPES } from '../../utils/columnTypes.js';
import { createDefaultColumn } from '../../utils/schemaDefaults.js';
import EditableText from './EditableText.jsx';
import TypeSelect from './TypeSelect.jsx';
import { useCanvasContext } from './Canvas.jsx';
import RelationshipPicker from './RelationshipPicker.jsx';

const FLAGS = [
  { key: 'isPrimaryKey', label: 'Primary key', icon: Key },
  { key: 'isNotNull', label: 'Not null', icon: Asterisk },
  { key: 'isUnique', label: 'Unique', icon: Fingerprint },
];

export default function TableNode({ id, data }) {
  const { setNodes } = useReactFlow();
  const { nodes: allNodes, onCreateRelationship } = useCanvasContext();

  function updateData(updater) {
    setNodes((nds) =>
      nds.map((node) => (node.id === id ? { ...node, data: updater(node.data) } : node))
    );
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
    <div className="min-w-[280px] glass-card overflow-visible shadow-xl shadow-black/40 nodrag-target">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2 border-b border-surface-border cursor-grab active:cursor-grabbing rounded-t-xl">
        <Table2 className="w-4 h-4 text-brand-400 shrink-0" />
        <EditableText
          value={data.name}
          onChange={setTableName}
          className="text-sm font-medium text-slate-100 truncate flex-1 hover:text-brand-300 transition"
          inputClassName="text-sm font-medium bg-surface-3 border border-brand-500/50 rounded px-1.5 py-0.5 text-slate-100 flex-1 outline-none nodrag"
          placeholder="table_name"
        />
        <button
          onClick={() => setNodes((nds) => nds.filter((n) => n.id !== id))}
          className="nodrag text-slate-500 hover:text-red-400 transition shrink-0"
          title="Delete table"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="py-1">
        {columns.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-500 italic">No columns yet</div>
        ) : (
          columns.map((col) => (
            <div
              key={col.id}
              className="group relative px-3 py-2 hover:bg-surface-2/60 transition border-b border-surface-border/50 last:border-b-0"
            >
              <Handle
                type="source"
                position={Position.Left}
                id={`${col.id}__left`}
                className="!bg-brand-500/70 !border !border-brand-400/50 hover:!bg-brand-400 transition"
                style={{
                  left: -6,
                  width: 6,
                  height: 12,
                  borderRadius: '6px 0 0 6px',
                  transform: 'translateY(-50%)',
                }}
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.id}__right`}
                className="!bg-brand-500/70 !border !border-brand-400/50 hover:!bg-brand-400 transition"
                style={{
                  right: -6,
                  width: 6,
                  height: 12,
                  borderRadius: '0 6px 6px 0',
                  transform: 'translateY(-50%)',
                }}
              />

              <div className="flex items-center gap-1.5 nodrag">
                <EditableText
                  value={col.name}
                  onChange={(name) => updateColumn(col.id, { name })}
                  className="text-xs text-slate-200 truncate flex-1 min-w-0 hover:text-brand-300 transition"
                  inputClassName="text-xs bg-surface-3 border border-brand-500/50 rounded px-1 py-0.5 text-slate-100 flex-1 min-w-0 outline-none"
                  placeholder="column_name"
                />

                <TypeSelect
                  value={col.type}
                  options={COLUMN_TYPES}
                  onChange={(type) => updateColumn(col.id, { type })}
                />

                <button
                  onClick={() => deleteColumn(col.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition shrink-0"
                  title="Delete column"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-1 mt-1.5 nodrag relative">
                {FLAGS.map(({ key, label, icon: Icon }) => {
                  const active = !!col[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleFlag(col.id, key)}
                      title={label}
                      className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border transition
                        ${active
                          ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                          : 'bg-transparent border-surface-border text-slate-600 hover:text-slate-400 hover:border-slate-600'}`}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      {key === 'isPrimaryKey' ? 'PK' : key === 'isNotNull' ? 'NN' : 'UQ'}
                    </button>
                  );
                })}

                <div className="ml-auto">
                  <RelationshipPicker
                    targets={(allNodes || []).flatMap((node) =>
                      (node.data?.columns || [])
                        .filter((c) => c.id !== col.id && (c.isPrimaryKey || c.isUnique))
                        .map((column) => ({ tableName: node.data.name, column }))
                    )}
                    onSelect={(targetColId) => onCreateRelationship(col.id, targetColId)}
                  />
                </div>

              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={addColumn}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-400
                  hover:text-brand-300 hover:bg-surface-2/60 transition border-t border-surface-border nodrag rounded-b-xl"
      >
        <Plus className="w-3 h-3" />
        Add column
      </button>
    </div>
  );
}
