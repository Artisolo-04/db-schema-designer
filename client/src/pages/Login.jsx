import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import FormField from '../components/FormField.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-slate-100 font-semibold text-lg">SchemaFlow</span>
        </div>

        <div className="glass-card p-8 shadow-2xl shadow-black/40">
          <h1 className="text-xl font-semibold text-slate-100 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-400 mb-6">Log in to your account</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FormField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <FormField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={8} />

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="text-sm text-slate-400 mt-6 text-center">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 font-medium hover:text-brand-300 transition">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
