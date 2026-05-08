import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, MessageCircle, Users, Activity, Calendar, BookOpen, LogOut, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import useStore from "@/store/useStore";
import AnonymousBadge from "@/components/AnonymousBadge";
import CrisisAlert from "@/components/CrisisAlert";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/chat", label: "AI Chat", icon: MessageCircle },
  { path: "/forum", label: "Forum", icon: Users },
  { path: "/mood", label: "Mood Tracker", icon: Activity },
  { path: "/appointments", label: "Appointments", icon: Calendar },
  { path: "/resources", label: "Resources", icon: BookOpen },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearUser, showCrisisAlert, setShowCrisisAlert } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  return (
    <div className="flex h-screen overflow-hidden" data-testid="app-layout">
      {showCrisisAlert && <CrisisAlert onDismiss={() => setShowCrisisAlert(false)} />}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass-strong flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-testid="sidebar"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6B8E7B]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#6B8E7B]" />
          </div>
          <span className="font-['Fraunces'] font-bold text-lg tracking-tight text-[#F0F4F2]">MindShield</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "nav-link-active text-[#F0F4F2] bg-[#6B8E7B]/15"
                    : "text-[#A3B8AF] hover:text-[#F0F4F2] hover:bg-white/5"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 space-y-3 border-t border-[#2A4036]">
          <AnonymousBadge />
          <div className="px-3 py-2">
            <p className="text-xs text-[#A3B8AF] truncate font-['Figtree']">{user?.pseudonym}</p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[#A3B8AF] hover:text-[#E17055] hover:bg-[#E17055]/10 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 glass-strong">
          <button onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-btn" className="text-[#A3B8AF]">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#6B8E7B]" />
            <span className="font-['Fraunces'] font-bold">MindShield</span>
          </div>
          <AnonymousBadge compact />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
