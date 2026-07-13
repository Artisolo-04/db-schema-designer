import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, MoreVertical, Pencil, Trash2, LogOut, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { listProjects, createProject, renameProject, deleteProject } from '../api/projects.js';
import { getErrorMessage } from '../api/client.js';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import FormField from '../components/FormField.jsx';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject(createName.trim());
      setProjects((prev) => [project, ...prev]);
      setCreateOpen(false);
      setCreateName('');
      showToast('Project created');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setCreating(false);
    }
  }

  function openRename(project) {
    setRenameTarget(project);
    setRenameName(project.name);
    setOpenMenuId(null);
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!renameName.trim() || !renameTarget) return;
    setRenaming(true);
    try {
      const updated = await renameProject(renameTarget.id, renameName.trim());
      setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setRenameTarget(null);
      showToast('Project renamed');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Project deleted');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen" onClick={() => setOpenMenuId(null)}>
      <header className="border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <LayoutGrid className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-slate-100 font-semibold">SchemaFlow</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Your projects</h1>
            <p className="text-sm text-slate-400 mt-1">Design and manage your database schemas</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New project
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card h-36 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center text-center py-20 px-6">
            <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-slate-100 font-medium mb-1">No projects yet</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-xs">
              Create your first project to start designing a database schema visually.
            </p>
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              New project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="glass-card p-5 cursor-pointer hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-150 relative group"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 border border-surface-border flex items-center justify-center group-hover:border-brand-500/30 transition">
                    <Database className="w-5 h-5 text-brand-400" />
                  </div>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-surface-2 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-9 w-40 glass-card py-1 shadow-xl shadow-black/40 z-10">
                        <button
                          onClick={() => openRename(project)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-surface-2 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Rename
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(project); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-slate-100 font-medium truncate mb-1">{project.name}</h3>
                <p className="text-xs text-slate-500">Updated {formatDate(project.updated_at)}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal open={createOpen} title="New project" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreate}>
          <FormField
            label="Project name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. E-commerce schema"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create project'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!renameTarget} title="Rename project" onClose={() => setRenameTarget(null)}>
        <form onSubmit={handleRename}>
          <FormField
            label="Project name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="Project name"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setRenameTarget(null)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={renaming} className="btn-primary">
              {renaming ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete project?"
        message={`"${deleteTarget?.name}" and its diagram will be permanently deleted. This can't be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
