import { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Search } from 'lucide-react';

const VISIBLE_ROWS = 6;
const ROW_HEIGHT = 32;

export default function RelationshipPicker({ targets, onSelect, onOpen }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(({ tableName, column }) =>
      `${tableName}.${column.name}`.toLowerCase().includes(q)
    );
  }, [targets, query]);

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
      setHighlight(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlight];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  function handleWheel(e) {
    e.stopPropagation();
  }

  function selectTarget(columnId) {
    onSelect(columnId);
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
      if (filtered[highlight]) selectTarget(filtered[highlight].column.id);
    }
  }

  return (
    <div ref={rootRef} className="relative nodrag">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) onOpen?.();
            return next;
          });
        }}
        title="Link to another column"
        className={`text-slate-500 hover:text-brand-300 transition ${open ? 'text-brand-300' : ''}`}
      >
        <Link2 className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-[9999] w-48 dropdown-panel bg-surface-2 border border-surface-border
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
              placeholder="Search column…"
              className="bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none w-full"
            />
          </div>

          <div
            ref={listRef}
            className="custom-scroll nowheel overflow-y-auto p-1"
            onWheel={handleWheel}
            style={{ maxHeight: VISIBLE_ROWS * ROW_HEIGHT }}
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 italic">No matches</div>
            ) : (
              filtered.map(({ tableName, column }, i) => (
                <button
                  key={column.id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => selectTarget(column.id)}
                  className={`w-full flex items-center px-2.5 rounded-lg text-left text-xs
                    transition-colors mb-0.5 last:mb-0
                    ${i === highlight
                      ? 'bg-brand-500/15 text-brand-200'
                      : 'text-slate-300 hover:bg-surface-3 hover:text-slate-100'}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="truncate">
                    <span className="text-slate-500">{tableName}.</span>{column.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
