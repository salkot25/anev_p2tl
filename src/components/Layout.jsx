import {
  LayoutDashboard,
  LogOut,
  FileText,
  Sun,
  Moon,
  Folder,
  Database,
  Send,
  Settings
} from "lucide-react";

// Fallback icon resolver for template customization
const resolveIcon = (id, customIcon) => {
  if (customIcon) return customIcon;
  
  const iconMap = {
    dashboard: <LayoutDashboard size={20} />,
    list: <FileText size={20} />,
    bankto: <Database size={20} />,
    laporan: <Send size={20} className="-rotate-45 relative right-[0.5px] top-[0.5px]" />,
    pengaturan: <Settings size={20} />
  };

  return iconMap[id.toLowerCase()] || <Folder size={20} />;
};

export default function Layout({
  children,
  currentTab,
  setCurrentTab,
  onLogout,
  theme,
  setTheme,
  tabsList = [],
  appName = "Anev P2TL",
  appSubtitle = "PLN Salatiga",
  userName = "Admin User",
  userRole = "Administrator"
}) {
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Coordinated global tabs list order
  const tabs = tabsList.map(tab => ({
    id: tab.id,
    label: tab.label,
    icon: resolveIcon(tab.id, tab.icon)
  }));

  const todayStr = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const activeTabLabel = tabs.find((t) => t.id === currentTab)?.label || "Dashboard";

  return (
    <div
      className="bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200 min-h-screen md:block"
    >
      {/* Mobile Top AppBar Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md">
            <img src={`${import.meta.env.BASE_URL}logo192.png`} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
              {appName}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {todayStr}
            </p>
          </div>
        </div>

        {/* AppBar Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? (
              <Sun
                size={18}
                className="text-amber-500 fill-amber-500/10 animate-sun-spin"
              />
            ) : (
              <Moon
                size={18}
                className="text-violet-400 fill-violet-400/10 animate-moon-sway"
              />
            )}
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex-shrink-0 border-r border-slate-800/60">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-600/20">
              <img src={`${import.meta.env.BASE_URL}logo192.png`} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                {appName}
              </h1>
              <p className="text-xs text-slate-400">{appSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-2">
          <div className="h-px bg-slate-800"></div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                currentTab === tab.id
                  ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/60 mx-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                {userName.substring(0, 2)}
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-slate-200 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500 leading-none mt-1">{userRole}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="relative flex-1 min-w-0 pb-tabs-mobile md:pb-0 overflow-visible md:ml-64"
      >
        {/* Desktop Topbar */}
        <header className="hidden md:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 items-center justify-between sticky top-0 z-10 transition-colors">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              {activeTabLabel}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Menu analisis, monitoring target, dan pengunggahan berkas P2TL.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0"
              title={theme === "light" ? "Mode Gelap" : "Mode Terang"}
            >
              {theme === "light" ? (
                <Sun
                  size={18}
                  className="text-amber-500 fill-amber-500/10 animate-sun-spin"
                />
              ) : (
                <Moon
                  size={18}
                  className="text-violet-400 fill-violet-400/10 animate-moon-sway"
                />
              )}
            </button>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              {todayStr}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="overflow-x-hidden min-h-0 md:overflow-visible">
          <div className="max-w-[1152px] mx-auto p-4 md:p-8 min-h-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-4 right-4 h-16 z-30 pointer-events-none">
        {/* Navigation Bar Backplate */}
        <div className="w-full h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-around items-center px-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-[0_8px_32px_rgba(15,23,42,0.08)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)] transition-all duration-300 pointer-events-auto">
          {(() => {
            // Keep 'laporan' in the exact center (index 2) of the mobile bottom nav for symmetry
            const mobileTabs = [...tabs];
            const laporanIdx = mobileTabs.findIndex(t => t.id === 'laporan');
            if (laporanIdx !== -1 && mobileTabs.length === 5) {
              const [laporanTab] = mobileTabs.splice(laporanIdx, 1);
              mobileTabs.splice(2, 0, laporanTab);
            }
            return mobileTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              const isLaporan = tab.id === 'laporan';

              if (isLaporan) {
                return (
                  <div key={tab.id} className="w-16 h-12 flex items-center justify-center pointer-events-none" />
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className="flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] transition-all duration-200 shrink-0 cursor-pointer outline-none active:scale-95"
                >
                  <div
                    className={`p-1 transition-transform duration-200 ${
                      isActive 
                        ? "scale-110 text-blue-600 dark:text-blue-400 font-bold" 
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {tab.icon}
                  </div>
                  <span
                    className={`text-[9.5px] font-semibold transition-colors duration-200 ${
                      isActive 
                        ? "font-bold text-blue-600 dark:text-blue-400" 
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1 shadow-sm shadow-blue-500/50 animate-fade-in"></div>
                  )}
                </button>
              );
            });
          })()}
        </div>

        {/* Floating Action Button (FAB) Laporan - Sibling of the backplate to prevent transparency / rendering issues */}
        {tabs.some(t => t.id === 'laporan') && (
          <button
            onClick={() => setCurrentTab('laporan')}
            className={`absolute bottom-3.5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-90 cursor-pointer pointer-events-auto z-40 ${
              currentTab === 'laporan'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-650 text-white scale-110 shadow-blue-500/35 border-4 border-white dark:border-slate-900' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-650 text-white border-4 border-white dark:border-slate-900 shadow-md shadow-blue-500/15 dark:shadow-none hover:scale-105'
            }`}
            aria-label="Laporan Menu Utama"
          >
            <Send size={22} className="-rotate-45 relative right-[0.5px] top-[0.5px]" />
          </button>
        )}
      </div>
    </div>
  );
}
