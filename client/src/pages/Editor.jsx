import { useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid } from 'lucide-react';
import Canvas from '../components/canvas/Canvas.jsx';

export default function Editor() {
  const { projectId } = useParams();
  const addTableRef = useRef(null);

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-surface-border shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-slate-400 hover:text-slate-200 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-slate-100 font-medium">Editor</span>
            </div>
          </div>

          <button
            onClick={() => addTableRef.current?.()}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add table
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <Canvas onAddTableRef={addTableRef} />
      </div>
    </div>
  );
}
