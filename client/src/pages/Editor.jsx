import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, LayoutGrid, Code2, Copy, Check, Loader2 } from 'lucide-react';
import Canvas from '../components/canvas/Canvas.jsx';
import RelationshipPanel from '../components/canvas/RelationshipPanel.jsx';
import Modal from '../components/Modal.jsx';
import { fetchProjectData, saveProjectData } from '../api/projects.js';
import { getErrorMessage } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { generateDDL } from '../utils/generateDDL.js';

const SAVE_DELAY_MS = 1200;

export default function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const addTableRef = useRef(null);
  const relationshipApiRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const latestStateRef = useRef({ nodes: [], edges: [] });

  const [loading, setLoading] = useState(true);
  const [initialNodes, setInitialNodes] = useState([]);
  const [initialEdges, setInitialEdges] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState(null);

  const [sqlOpen, setSqlOpen] = useState(false);
  const [sqlText, setSqlText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const diagram = await fetchProjectData(projectId);
        if (cancelled) return;
        const nodes = diagram?.tables ?? [];
        const edges = diagram?.edges ?? [];
        setInitialNodes(nodes);
        setInitialEdges(edges);
        latestStateRef.current = { nodes, edges };
      } catch (err) {
        if (cancelled) return;
        showToast(getErrorMessage(err), 'error');
        navigate('/dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    
  }, [projectId]);

  const handleCanvasChange = useCallback(
    (nodes, edges) => {
      latestStateRef.current = { nodes, edges };
      setSaving(true);

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveProjectData(projectId, {
            tables: latestStateRef.current.nodes,
            edges: latestStateRef.current.edges,
          });
        } catch (err) {
          showToast(getErrorMessage(err), 'error');
        } finally {
          setSaving(false);
        }
      }, SAVE_DELAY_MS);
    },
    [projectId, showToast]
  );

  function handleRelationshipTypeChange(type) {
    if (!selectedEdge) return;
    if (type === 'many-to-many') {
      relationshipApiRef.current?.convertToManyToMany(selectedEdge.linkId);
      setSelectedEdge(null);
      return;
    }
    relationshipApiRef.current?.updateRelationship(selectedEdge.linkId, { relationshipType: type });
    setSelectedEdge((prev) => (prev ? { ...prev, relationshipType: type } : prev));
  }

  function handleOnDeleteChange(value) {
    if (!selectedEdge) return;
    relationshipApiRef.current?.updateRelationship(selectedEdge.linkId, { onDelete: value });
    setSelectedEdge((prev) => (prev ? { ...prev, onDelete: value } : prev));
  }

  function handleOnUpdateChange(value) {
    if (!selectedEdge) return;
    relationshipApiRef.current?.updateRelationship(selectedEdge.linkId, { onUpdate: value });
    setSelectedEdge((prev) => (prev ? { ...prev, onUpdate: value } : prev));
  }

  function handleChangeSourceColumn(columnId) {
    if (!selectedEdge) return;
    relationshipApiRef.current?.changeRelationshipColumn(selectedEdge.linkId, 'source', columnId);
  }

  function handleChangeTargetColumn(columnId) {
    if (!selectedEdge) return;
    relationshipApiRef.current?.changeRelationshipColumn(selectedEdge.linkId, 'target', columnId);
  }

  function handleReverseRelationship() {
    if (!selectedEdge) return;
    relationshipApiRef.current?.swapRelationshipEndpoints(selectedEdge.linkId);
  }

  function handleDeleteRelationship() {
    if (!selectedEdge) return;
    relationshipApiRef.current?.deleteRelationship(selectedEdge.linkId);
    setSelectedEdge(null);
  }

  function openSql() {
    const { nodes, edges } = latestStateRef.current;
    setSqlText(generateDDL(nodes, edges));
    setCopied(false);
    setSqlOpen(true);
  }

  async function copySql() {
    try {
      await navigator.clipboard.writeText(sqlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading project…
      </div>
    );
  }

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
            <span className="text-xs text-slate-500">{saving ? 'Saving…' : 'Saved'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={openSql} className="btn-secondary">
              <Code2 className="w-4 h-4" />
              Generate SQL
            </button>
            <button onClick={() => addTableRef.current?.()} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add table
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div
          className="h-full min-w-0 transition-[flex-basis] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ flexBasis: selectedEdge ? '75%' : '100%' }}
        >
          <Canvas
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            onAddTableRef={addTableRef}
            onChange={handleCanvasChange}
            onEdgeSelect={setSelectedEdge}
            relationshipApiRef={relationshipApiRef}
          />
        </div>

        <div
          className="h-full shrink-0 overflow-hidden border-l border-surface-border bg-surface-1 transition-[flex-basis] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ flexBasis: selectedEdge ? '25%' : '0%' }}
        >
          <RelationshipPanel
            edge={selectedEdge}
            onChangeType={handleRelationshipTypeChange}
            onChangeOnDelete={handleOnDeleteChange}
            onChangeOnUpdate={handleOnUpdateChange}
            onChangeSourceColumn={handleChangeSourceColumn}
            onChangeTargetColumn={handleChangeTargetColumn}
            onReverse={handleReverseRelationship}
            onDelete={handleDeleteRelationship}
            onClose={() => setSelectedEdge(null)}
          />
        </div>
      </div>

      <Modal open={sqlOpen} title="Generated SQL" onClose={() => setSqlOpen(false)}>
        <pre className="max-h-96 overflow-auto text-xs bg-surface-2 border border-surface-border rounded-lg p-3 text-slate-300 whitespace-pre-wrap">
          {sqlText}
        </pre>
        <button onClick={copySql} className="btn-primary w-full mt-4">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy to clipboard'}
        </button>
      </Modal>
    </div>
  );
}
