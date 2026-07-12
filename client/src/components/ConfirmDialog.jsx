import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger = true }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-card w-full max-w-sm p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3 mb-2">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                          ${danger ? 'bg-red-500/10' : 'bg-brand-500/10'}`}>
            <AlertTriangle className={`w-4.5 h-4.5 ${danger ? 'text-red-400' : 'text-brand-400'}`} />
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
