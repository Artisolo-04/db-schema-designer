import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

const ROW_HEIGHT = 32;
const PANEL_WIDTH = 192;
const VISIBLE_ROWS = 5;
const LIST_PADDING = 8;
const ITEM_GAP = 4;

export default function Dropdown({ value, options, onChange, className = '', fullWidth = false }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: PANEL_WIDTH });
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = fullWidth ? rect.width : PANEL_WIDTH;
    setCoords({
      top: rect.bottom + 6,
      left: fullWidth ? rect.left : Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8),
      width,
    });
  }, [fullWidth]);

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

  const visibleCount = Math.min(options.length, VISIBLE_ROWS);
  const maxHeight = visibleCount * ROW_HEIGHT + Math.max(visibleCount - 1, 0) * ITEM_GAP + LIST_PADDING;

  return (
    <div className={`relative nodrag ${fullWidth ? 'w-full' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-1.5 text-[11px] font-medium bg-surface-3 border rounded-md px-2 py-1 transition-colors
                    ${fullWidth ? 'w-full justify-between' : ''}
                    ${open ? 'border-brand-500/60 text-slate-100' : 'border-surface-border text-slate-400 hover:border-slate-600 hover:text-slate-200'}`}
      >
        <span className={`truncate ${fullWidth ? '' : 'max-w-[90px]'}`}>{value}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
          className="dropdown-panel z-[9999] bg-surface-2 border border-surface-border rounded-xl overflow-hidden"
        >
          <div
            className="custom-scroll nowheel overflow-y-auto p-1 flex flex-col gap-1"
            style={{ maxHeight }}
          >
            {options.map((opt) => {
              const active = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  style={{ height: ROW_HEIGHT, flexShrink: 0 }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 rounded-lg text-[12px] text-left transition-colors
                    ${active
                      ? 'bg-brand-500/15 text-brand-200 font-medium'
                      : 'text-slate-300 hover:bg-surface-3 hover:text-slate-100'}`}
                >
                  <span className="truncate">{opt}</span>
                  {active && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
