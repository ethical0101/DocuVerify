import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Ambient background glow orbs */}
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0 h-full z-10">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200" 
            onClick={() => setDrawerOpen(false)} 
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl z-50">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Workspace content */}
      <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin bg-ink-950 cyber-grid-animated relative z-10">
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 glass rounded-lg p-2 text-white/70 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
