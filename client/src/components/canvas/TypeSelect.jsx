import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

const VISIBLE_ROWS = 6;
const ROW_HEIGHT = 32; 

export default function TypeSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(Math.max(0, options.indexOf(value)));
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]); 

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlight];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function selectValue(val) {
    onChange(val);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) selectValue(filtered[highlight]);
    }
  }

  return (
    <div ref={rootRef} className="relative nodrag">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 text-xs bg-surface-3 border rounded-md px-2 py-1 transition-colors shrink-0
                    ${open ? 'border-brand-500/60 text-slate-100' : 'border-surface-border text-slate-300 hover:border-slate-600'}
                    focus:outline-none`}
      >
        {value}
        <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 w-48 dropdown-panel bg-surface-2 border border-surface-border
                     rounded-xl shadow-xl shadow-black/50 overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-surface-border">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              placeholder="Search types…"
              className="bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none w-full"
            />
          </div>

          <div
            ref={listRef}
            className="custom-scroll nowheel overflow-y-auto p-1"
            style={{ maxHeight: VISIBLE_ROWS * ROW_HEIGHT }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 italic">No matching types</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => selectValue(opt)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 rounded-lg text-left text-xs
                    transition-colors mb-0.5 last:mb-0
                    ${i === highlight
                      ? 'bg-brand-500/15 text-brand-200'
                      : 'text-slate-300 hover:bg-surface-3 hover:text-slate-100'}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="truncate">{opt}</span>
                  {opt === value && <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
