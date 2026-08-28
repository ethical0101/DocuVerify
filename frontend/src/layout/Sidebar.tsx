import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ScanSearch, FolderSearch, ListChecks, FileText, BookOpen,
  Columns2, Settings, X, Building2, Database, Cpu, Layers, Users, ScrollText,
  LogOut, ChevronLeft, ChevronRight, Terminal, Sun, Moon
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const BASE_NAV = [
  {
    label: "OVERVIEW",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "INVESTIGATE",
    items: [
      { to: "/investigate", label: "New Investigation", icon: ScanSearch },
      { to: "/investigations", label: "Investigations", icon: FolderSearch },
      { to: "/evidence", label: "Evidence Explorer", icon: ListChecks },
    ],
  },
  {
    label: "ANALYSIS",
    items: [
      { to: "/methodology", label: "Methodology", icon: FileText },
      { to: "/about", label: "About", icon: BookOpen },
    ],
  },
  {
    label: "TOOLS",
    items: [{ to: "/compare", label: "Compare Docs", icon: Columns2 }],
  },
];

const ENTERPRISE_NAV = {
  label: "ENTERPRISE",
  items: [
    { to: "/enterprise/dashboard", label: "Organization", icon: Building2 },
    { to: "/enterprise/datasets", label: "Datasets", icon: Database },
    { to: "/enterprise/training", label: "Model Training", icon: Cpu },
    { to: "/enterprise/models", label: "Model Registry", icon: Layers },
    { to: "/enterprise/users", label: "Users", icon: Users },
    { to: "/enterprise/audit-log", label: "Audit Log", icon: ScrollText },
  ],
};

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user, organization, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const groups = user?.role === "admin" ? [...BASE_NAV.slice(0, 2), ENTERPRISE_NAV, ...BASE_NAV.slice(2)] : BASE_NAV;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Helper to extract first character for Avatar
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className={`flex flex-col h-full bg-panel border-r border-border transition-all duration-300 ${collapsed ? "w-18" : "w-64"}`}>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border/40">
        <NavLink to="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-white select-none">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0 shadow-lg shadow-accent/10">
            <ScanSearch className="w-4 h-4 text-accent-bright" />
          </div>
          {!collapsed && (
            <span className="font-mono text-sm tracking-widest bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
              DOCUVERIFY
            </span>
          )}
        </NavLink>
        {onNavigate && (
          <button onClick={onNavigate} className="lg:hidden text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Organization Info */}
      {organization && !collapsed && (
        <div className="px-4 py-3 bg-white/[0.01] border-b border-border/20 flex items-center gap-2">
          <Terminal className="w-3 h-3 text-accent" />
          <div className="text-[11px] font-mono text-white/45 truncate">{organization.name.toUpperCase()}</div>
        </div>
      )}

      {/* Navigation Group items */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-4 space-y-5">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed ? (
              <div className="text-[10px] font-bold tracking-widest text-white/45 px-3 py-1 font-sans">
                {group.label}
              </div>
            ) : (
              <div className="h-px bg-border/40 my-2 mx-2" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg text-sm font-medium transition-all group duration-150 border ${
                      collapsed ? "justify-center p-2" : "pl-3 pr-2.5 py-2"
                    } ${
                      isActive
                        ? "bg-accent/10 text-white shadow-sm border-accent/20"
                        : "text-white/70 hover:text-white hover:bg-white/[0.04] border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? "text-accent-bright" : "text-white/50 group-hover:text-white/80"}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile & Settings */}
      <div className="px-2 py-3 border-t border-border/40 bg-white/[0.01] space-y-1.5">
        {/* Settings button */}
        <NavLink
          to="/settings"
          onClick={onNavigate}
          title={collapsed ? "Settings" : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg text-sm font-medium transition-all border ${
              collapsed ? "justify-center p-2" : "pl-3 pr-2.5 py-2"
            } ${
              isActive
                ? "bg-accent/10 text-white border-accent/20"
                : "text-white/75 hover:text-white hover:bg-white/[0.04] border-transparent"
            }`
          }
        >
          <Settings className="w-4 h-4 text-white/55" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={collapsed ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
          className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all border border-transparent hover:bg-white/[0.04] cursor-pointer ${
            collapsed ? "justify-center p-2" : "pl-3 pr-2.5 py-2 text-left"
          }`}
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              {!collapsed && <span className="text-white/80">Light Mode</span>}
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-blue-500 shrink-0" />
              {!collapsed && <span className="text-white/85">Dark Mode</span>}
            </>
          )}
        </button>

        {/* User Card */}
        {user && (
          <div className={`flex items-center rounded-lg bg-white/[0.02] border border-border/40 p-2 ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0 text-accent-bright font-semibold text-xs shadow-md shadow-accent/5">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white/90 font-medium truncate">{user.email}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
                    user.role === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Log Out / In */}
        {user ? (
          <button
            onClick={handleLogout}
            title={collapsed ? `Sign out (${user.email})` : undefined}
            className={`w-full flex items-center rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors ${
              collapsed ? "justify-center p-2" : "gap-3 pl-3 pr-2.5 py-2 text-left"
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Sign out</span>}
          </button>
        ) : (
          <NavLink
            to="/login"
            onClick={onNavigate}
            title={collapsed ? "Sign in" : undefined}
            className={`flex items-center rounded-lg text-sm text-accent hover:bg-accent/10 transition-colors ${
              collapsed ? "justify-center p-2" : "gap-3 pl-3 pr-2.5 py-2"
            }`}
          >
            <LogOut className="w-4 h-4 rotate-180 shrink-0" />
            {!collapsed && <span>Sign in</span>}
          </NavLink>
        )}
      </div>

      {/* Collapse Trigger for Desktop & System Status */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-black/20 text-xs text-white/50 font-mono">
        <div className="flex items-center gap-2 select-none">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-risk-low"></span>
          </div>
          {!collapsed && <span>SYS ONLINE</span>}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
