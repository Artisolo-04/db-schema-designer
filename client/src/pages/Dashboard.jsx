import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <button
          onClick={logout}
          className="text-sm text-slate-500 hover:text-slate-800 transition"
        >
          Log out
        </button>
      </div>
      <p className="text-slate-600">
        Logged in as <span className="font-medium">{user?.email}</span>
      </p>
      <p className="text-slate-400 text-sm mt-2">Project list coming in Phase 5.</p>
    </div>
  );
}
