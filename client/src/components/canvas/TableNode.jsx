import { Handle, Position } from '@xyflow/react';
import { Table2 } from 'lucide-react';

export default function TableNode({ data }) {
  const columns = data.columns || [];

  return (
    <div className="min-w-[220px] glass-card overflow-hidden shadow-xl shadow-black/40">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-2 border-b border-surface-border">
        <Table2 className="w-4 h-4 text-brand-400 shrink-0" />
        <span className="text-sm font-medium text-slate-100 truncate">
          {data.name || 'untitled_table'}
        </span>
      </div>

      <div className="py-1">
        {columns.length === 0 ? (
          <div className="px-3 py-3 text-xs text-slate-500 italic">No columns yet</div>
        ) : (
          columns.map((col) => (
            <div
              key={col.id}
              className="relative flex items-center justify-between px-3 py-1.5 text-xs hover:bg-surface-2/60 transition"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={col.id}
                className="!left-0"
              />
              <span className="text-slate-300">{col.name}</span>
              <span className="text-slate-500">{col.type}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={col.id}
                className="!right-0"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
