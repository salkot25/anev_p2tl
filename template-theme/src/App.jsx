import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './components/Login';

function App() {
  // Theme state synced with LocalStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Authentication session mockup
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('app_auth_session') === 'true';
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('overview');

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('app_auth_session', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('app_auth_session');
    setCurrentTab('overview');
  };

  // Define tab navigation structure to pass into Layout
  // This can be easily customized in your next project!
  const menuTabs = [
    { id: "overview", label: "Dashboard" },
    { id: "input", label: "Data Input" },
    { id: "settings", label: "Settings" }
  ];

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin}
        title="Enterprise Hub"
        subtitle="Manage and analyze your core workflows"
        copyright="© 2026 Enterprise Corp"
      />
    );
  }

  return (
    <Layout 
      currentTab={currentTab} 
      setCurrentTab={setCurrentTab} 
      onLogout={handleLogout} 
      theme={theme} 
      setTheme={setTheme}
      tabsList={menuTabs}
      appName="Enterprise Hub"
      appSubtitle="Core Dashboard"
      userName={currentUser?.name || "Admin"}
      userRole={currentUser?.role || "Administrator"}
    >
      {/* View switching logic */}
      {currentTab === 'overview' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Welcome to the Dashboard Overview!</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              This is the default overview page. You can customize this page by editing the App.jsx file or replacing this view with your own custom dashboard components.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Metric 0{num}</span>
                <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">1,248</h4>
                <p className="text-xs text-emerald-600 font-medium mt-1">+12% from last week</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTab === 'input' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Sample Input Form</h3>
            <form onSubmit={(e) => { e.preventDefault(); alert("Form submitted!"); }} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Record Name</label>
                <input 
                  type="text" 
                  placeholder="Enter record name..." 
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                Submit Data
              </button>
            </form>
          </div>
        </div>
      )}

      {currentTab === 'settings' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">System Settings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Configure parameters, database hooks, API integrations, and general settings here.
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
