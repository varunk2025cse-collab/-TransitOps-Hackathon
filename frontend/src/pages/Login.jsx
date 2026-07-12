import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { authAPI } from '../services/api';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setUser = useStore((s) => s.setUser);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login || !password) return toast.error('Please fill all fields.');
    setLoading(true);
    try {
      const res = await authAPI.login({ login, password, db: 'transitops' });
      const data = res.data;
      if (data.status === 'success') {
        setUser(data.data);
        toast.success(`Welcome back, ${data.data.name}!`);
        navigate('/dashboard');
      } else {
        toast.error(data.message || 'Login failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connection error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-brand-900 to-gray-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative w-full max-w-md mx-4 animate-slide-up">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white text-2xl font-extrabold shadow-xl mb-4">
              T
            </div>
            <h1 className="text-2xl font-extrabold text-white">TransitOps AI</h1>
            <p className="text-sm text-gray-300 mt-1">Enterprise Fleet Intelligence Platform</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email / Username</label>
              <input
                id="login-email"
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                placeholder="admin@transitops.ai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-500 to-brand-700 hover:from-brand-600 hover:to-brand-800 text-white font-bold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            TransitOps AI © 2026 · Enterprise Fleet Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}
