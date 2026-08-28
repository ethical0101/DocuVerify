import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

export default function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 glass rounded-lg p-2 text-white/70"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Outlet />
      </div>
    </div>
  );
}
