import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { highlightSql } from '../utils/highlightSql.js';

function renderLine(lineData) {
  return [...lineData.parts, ...lineData.withStrings].map((item, idx) => {
    if (typeof item === 'string') return <span key={idx}>{item}</span>;
    const cls = item.type === 'keyword' ? 'text-brand-300 font-semibold' : 'text-accent-teal';
    return <span key={item.key} className={cls}>{item.text}</span>;
  });
}

export default function SqlPreview({ sql, filename = 'schema.sql', maxHeightClass = '' }) {
  const [copied, setCopied] = useState(false);

  async function copySql() {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      
    }
  }

  const lines = highlightSql(sql || '');

  return (
    <div className="rounded-xl border border-surface-border overflow-hidden bg-[#0b0b13]">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-2 border-b border-surface-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-1.5 flex items-center gap-1 text-[10px] text-slate-500">
            <Terminal className="w-3 h-3" />
            {filename}
          </span>
        </div>
        <button
          onClick={copySql}
          className="text-slate-500 hover:text-slate-200 transition p-1 rounded-md hover:bg-surface-3"
          title="Copy SQL"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className={`text-[11px] leading-relaxed p-3 font-mono text-slate-300 whitespace-pre-wrap overflow-x-auto custom-scroll ${maxHeightClass}`}>
        {lines.map((lineData) => (
          <div key={lineData.lineIndex}>{renderLine(lineData)}</div>
        ))}
      </pre>
    </div>
  );
}
