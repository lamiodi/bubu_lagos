import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import api from '../../utils/api';
import { setSessionKind } from '../../utils/api';
import { logger } from '../../lib/logger';
import { Lock } from 'lucide-react';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (token && user) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await api.post('/admin/login', { email, password });
      setSessionKind('admin');

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.adminUser));

      toast.success('Admin logged in successfully!');
      navigate('/admin');
    } catch (err) {
      logger.error('Admin login error:', err);
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="mb-8 text-center">
        <h1 className="font-heading text-3xl font-black tracking-widest text-black">BUBU LAGOS</h1>
        <p className="text-sm text-gray-500 mt-2 tracking-widest uppercase">Atelier Back-Office</p>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-gray-100 shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex justify-center items-center">
            <Lock className="text-black" size={24} />
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all rounded-md"
              required
              placeholder="admin@bubulagos.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all rounded-md"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md mt-4"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              // Dev-only: skip the network roundtrip so you can preview the admin
              // UI without a running backend. Sets a mock token + user and routes
              // to /admin. AdminRoute probes /admin/me; on network failure it
              // allows access optimistically.
              setSessionKind('admin');
              localStorage.setItem('adminToken', 'dev-preview-token');
              localStorage.setItem('adminUser', JSON.stringify({
                id: 0,
                email: 'preview@local',
                username: 'Preview Admin',
                role: 'super_admin',
              }));
              navigate('/admin');
            }}
            className="w-full mt-3 py-3 bg-white text-black text-[10px] font-bold uppercase tracking-widest border border-gray-200 hover:border-black transition-colors rounded-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            Preview without backend
          </button>
        )}
      </div>
    </div>
  );
}
