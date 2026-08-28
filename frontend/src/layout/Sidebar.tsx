import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ScanSearch, FolderSearch, ListChecks, FileText, BookOpen,
  Columns2, Settings, Circle, X, Building2, Database, Cpu, Layers, Users, ScrollText,
  LogOut,
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
      { to: "/methodology", label: "Models & Methodology", icon: FileText },
      { to: "/about", label: "About & Limitations", icon: BookOpen },
    ],
  },
  {
    label: "TOOLS",
    items: [{ to: "/compare", label: "Compare Documents", icon: Columns2 }],
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

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const groups = user?.role === "admin" ? [...BASE_NAV.slice(0, 2), ENTERPRISE_NAV, ...BASE_NAV.slice(2)] : BASE_NAV;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex flex-col h-full w-64 bg-panel border-r border-border">
      <div className="flex items-center justify-between px-5 py-5">
        <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ScanSearch className="w-5 h-5 text-accent" />
          DocuVerify
        </NavLink>
        <button onClick={onNavigate} className="lg:hidden text-white/40 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {organization && (
        <div className="px-5 pb-3 -mt-1">
          <div className="text-xs text-white/40 truncate">{organization.name}</div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] tracking-widest text-white/30 px-3 mb-2">{group.label}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
                      isActive ? "bg-accent/15 text-accent" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3 space-y-0.5">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition ${
              isActive ? "bg-accent/15 text-accent" : "text-white/60 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <Settings className="w-4 h-4" /> Settings
        </NavLink>
        {user ? (
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5">
            <LogOut className="w-4 h-4" /> Sign out ({user.email})
          </button>
        ) : (
          <NavLink
            to="/login"
            onClick={onNavigate}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-accent hover:bg-accent/10"
          >
            <LogOut className="w-4 h-4 rotate-180" /> Sign in
          </NavLink>
        )}
      </div>

      <div className="px-5 py-4 border-t border-border flex items-center gap-2 text-xs text-white/40">
        <Circle className="w-2 h-2 fill-risk-low text-risk-low" />
        System Online
      </div>
    </div>
  );
}
