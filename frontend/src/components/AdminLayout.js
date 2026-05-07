import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Users, ShieldCheck, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import useStore from "@/store/useStore";

const NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Analytics", icon: BarChart3 },
  { path: "/admin/management", label: "Management", icon: Users },
  { path: "/admin/moderation", label: "Moderation", icon: ShieldCheck },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearUser } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { clearUser(); navigate("/admin"); };

  return (
    <div className="flex h-screen overflow-hidden" data-testid="admin-layout">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass-strong flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} data-testid="admin-sidebar">
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E17055]/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#E17055]" />
          </div>
          <div>
            <span className="font-['Manrope'] font-bold text-sm text-[#F0F4F2]">MindShield</span>
            <p className="text-[10px] text-[#E17055] uppercase tracking-wider">Admin</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                data-testid={`admin-nav-${item.label.toLowerCase()}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? "nav-link-active text-[#F0F4F2] bg-[#6B8E7B]/15" : "text-[#A3B8AF] hover:text-[#F0F4F2] hover:bg-white/5"}`}>
                <item.icon className="w-[18px] h-[18px]" /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#2A4036]">
          <button onClick={handleLogout} data-testid="admin-logout" className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#A3B8AF] hover:text-[#E17055] hover:bg-[#E17055]/10 transition-all duration-300">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center justify-between p-4 glass-strong">
          <button onClick={() => setSidebarOpen(true)} data-testid="admin-mobile-menu" className="text-[#A3B8AF]"><Menu className="w-6 h-6" /></button>
          <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[#E17055]" /><span className="font-['Manrope'] font-bold text-sm">Admin</span></div>
          <div />
        </header>
        <div className="flex-1 overflow-y-auto"><div className="max-w-7xl mx-auto p-6 lg:p-8">{children}</div></div>
      </main>
    </div>
  );
}
