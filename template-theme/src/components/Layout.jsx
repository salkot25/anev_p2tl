import React from "react";
import {
  LayoutDashboard,
  FileInput,
  LogOut,
  FileText,
  Settings as SettingsIcon,
  Bot,
  Plus,
  Users,
  Sun,
  Moon,
  Folder,
} from "lucide-react";

// Fallback icon resolver for template customization
const resolveIcon = (id, customIcon) => {
  if (customIcon) return customIcon;
  
  const iconMap = {
    overview: <LayoutDashboard size={20} />,
    dashboard: <LayoutDashboard size={20} />,
    input: <FileInput size={20} />,
    recap: <Users size={20} />,
    reports: <FileText size={20} />,
    ai: <Bot size={20} />,
    settings: <SettingsIcon size={20} />,
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
  appName = "Enterprise App",
  appSubtitle = "Management Dashboard",
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
      className={`bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200 ${
        currentTab === "ai_chat" || currentTab === "chat"
          ? "h-[100dvh] md:h-screen overflow-hidden"
          : "min-h-screen md:block"
      }`}
    >
      {/* Mobile Top AppBar Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {appName.substring(0, 1)}
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
        <div className="flex items-center gap-1">
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
            onClick={() => setCurrentTab("settings")}
            className={`p-2 rounded-xl transition-colors ${
              currentTab === "settings"
                ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            aria-label="Settings"
          >
            <SettingsIcon size={18} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors"
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-600/20">
              {appName.substring(0, 1)}
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
                  ? "bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20"
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
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                {userName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200 leading-tight">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500">{userRole}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={`relative flex-1 min-w-0 ${
          currentTab === "ai_chat" || currentTab === "chat"
            ? "overflow-hidden pb-chat-mobile flex flex-col md:h-screen md:pb-0 md:ml-64"
            : "pb-tabs-mobile md:pb-0 overflow-visible md:ml-64"
        }`}
      >
        {/* Desktop Topbar */}
        <header className="hidden md:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 items-center justify-between sticky top-0 z-10 transition-colors">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              {activeTabLabel}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              General systems administration dashboard view.
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
        <main
          className={`flex-1 ${
            currentTab === "ai_chat" || currentTab === "chat"
              ? "overflow-hidden min-h-0 flex flex-col"
              : "overflow-x-hidden min-h-0 md:overflow-visible"
          }`}
        >
          <div
            className={`w-full ${
              currentTab === "ai_chat" || currentTab === "chat"
                ? "max-w-[1152px] mx-auto p-0 md:p-6 flex-1 min-h-0 flex flex-col"
                : "max-w-[1152px] mx-auto p-4 md:p-8 min-h-0"
            }`}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 flex justify-around items-center px-4 py-2 z-30 pb-safe mobile-bottom-nav transition-colors">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl min-w-[64px] transition-all duration-200 shrink-0 cursor-pointer outline-none"
            >
              <div
                className={`p-1 mb-0.5 transition-transform duration-200 ${isActive ? "scale-110 text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-slate-400"}`}
              >
                {tab.icon}
              </div>
              <span
                className={`text-[10px] leading-none ${isActive ? "font-bold text-blue-600 dark:text-blue-400" : "font-semibold text-slate-500 dark:text-slate-400"}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full mt-1 animate-fade-in"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
