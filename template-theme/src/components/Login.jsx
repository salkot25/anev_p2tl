import React, { useState } from 'react';
import { Lock, User, Loader2 } from 'lucide-react';

export default function Login({ 
  onLogin, 
  title = "Enterprise Hub", 
  subtitle = "Management System", 
  copyright = "© 2026 Enterprise Corp"
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulating authentication flow
    setTimeout(() => {
      if (username.trim() && password.trim()) {
        onLogin({
          name: username,
          role: username.toLowerCase() === 'admin' ? 'Administrator' : 'Operator'
        });
      } else {
        setError('Harap masukkan nama pengguna dan kata sandi yang valid.');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background Decorative Neon Blurs */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-sm w-full relative z-10 animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-blue-600 items-center justify-center text-white text-3xl font-extrabold mb-5 shadow-2xl shadow-blue-500/30">
            {title.substring(0, 1)}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Nama Pengguna</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="Masukkan nama pengguna"
                  required
                  autoComplete="username"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kata Sandi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-xl text-xs font-medium animate-fade-in">
                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0"></div>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-blue-600/30 mt-2 cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Masuk Sistem'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          {copyright}
        </p>
      </div>
    </div>
  );
}
