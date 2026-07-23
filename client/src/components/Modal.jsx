import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, children, maxWidthClass = 'max-w-sm' }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative glass-card w-full ${maxWidthClass} p-6 shadow-2xl shadow-black/50`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-slate-100 font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
