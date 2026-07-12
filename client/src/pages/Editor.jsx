import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Editor() {
  const { projectId } = useParams();

  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="text-slate-400 hover:text-slate-200 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-slate-100 font-medium">Editor</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-slate-400 text-sm">
          Canvas editor for project <span className="text-slate-200">{projectId}</span> coming in Phase 6.
        </p>
      </main>
    </div>
  );
}
