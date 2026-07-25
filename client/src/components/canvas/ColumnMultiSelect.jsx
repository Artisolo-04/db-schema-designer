import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const ROW_HEIGHT = 32;
const VISIBLE_ROWS = 6;
const LIST_PADDING = 8;
const ITEM_GAP = 4;

export default function ColumnMultiSelect({ columns = [], selectedIds = [], onToggle, placeholder = 'Select columns' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - rect.width - 8),
      width: rect.width,
    });
  }, []);

  function handleOpen(e) {
    e.stopPropagation();
    computePosition();
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleScrollOrResize(e) {
      if (panelRef.current && e.target && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  const visibleCount = Math.min(columns.length, VISIBLE_ROWS);
  const maxHeight = visibleCount * ROW_HEIGHT + Math.max(visibleCount - 1, 0) * ITEM_GAP + LIST_PADDING;

  const label = selectedIds.length === 0
    ? placeholder
    : columns.filter((c) => selectedIds.includes(c.id)).map((c) => c.name).join(', ');

  return (
    <div className="relative nodrag w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between h-10 gap-2 text-[11px] font-medium bg-surface-3 border rounded-lg px-2.5 py-2 transition-colors
          ${open ? 'border-brand-500/60 text-slate-100' : 'border-surface-border text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
      >
        <span className={`truncate ${selectedIds.length === 0 ? 'italic text-slate-500' : ''}`}>{label}</span>
        <span className="flex items-center gap-1.5 shrink-0">
          {selectedIds.length > 0 && (
            <span className="text-[10px] font-semibold bg-brand-500/20 text-brand-300 rounded-md p-1.5 leading-none">
              {selectedIds.length}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
          className="dropdown-panel z-[9999] bg-surface-2 border border-surface-border rounded-xl overflow-hidden shadow-xl shadow-black/50"
        >
          <div
            className="custom-scroll nowheel overflow-y-auto p-1 flex flex-col gap-1"
            style={{ maxHeight }}
          >
            {columns.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 italic">No columns yet</div>
            ) : (
              columns.map((col) => {
                const active = selectedIds.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => onToggle(col.id)}
                    style={{ height: ROW_HEIGHT, flexShrink: 0 }}
                    className={`w-full flex items-center gap-2 px-2.5 rounded-lg text-[12px] text-left transition-colors
                      ${active
                        ? 'bg-brand-500/15 text-brand-200 font-medium'
                        : 'text-slate-300 hover:bg-surface-3 hover:text-slate-100'}`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors
                      ${active ? 'bg-brand-500 border-brand-500' : 'border-surface-border bg-surface-3'}`}>
                      {active && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="truncate">{col.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
