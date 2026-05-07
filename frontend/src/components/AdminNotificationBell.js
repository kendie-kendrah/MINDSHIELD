import { useState, useEffect, useRef } from "react";
import { Bell, AlertTriangle, Flag, X, Check, UserPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_CONFIG = {
  CRISIS: { icon: AlertTriangle, color: "#E17055", bg: "bg-[#E17055]/10", label: "Crisis" },
  FLAGGED_POST: { icon: Flag, color: "#FCD34D", bg: "bg-[#FCD34D]/10", label: "Flagged" },
};

export default function AdminNotificationBell() {
  const { user } = useStore();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const panelRef = useRef(null);
  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  // Poll unread count every 5s
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchCount = async () => {
    try {
      const res = await axios.get(`${API}/admin/notifications/count`, { headers: authHeaders });
      setCount(res.data.count || 0);
    } catch (e) { /* silent */ }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/notifications`, { headers: authHeaders });
      setNotifications(res.data.notifications || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const togglePanel = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const markRead = async (id) => {
    try {
      await axios.put(`${API}/admin/notifications/${id}/read`, {}, { headers: authHeaders });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setCount((c) => Math.max(0, c - 1));
    } catch (e) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/admin/notifications/read-all`, {}, { headers: authHeaders });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch (e) { /* silent */ }
  };

  const connectToCounselor = async (userId) => {
    setConnecting(userId);
    try {
      const res = await axios.post(`${API}/admin/connect-to-counselor`, { user_id: userId }, { headers: authHeaders });
      if (res.data.already_exists) {
        toast.success(`Already connected to ${res.data.counselor_pseudonym}`);
      } else {
        toast.success(`Connected to ${res.data.counselor_pseudonym} (${res.data.counselor_specialty})`);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to connect");
    } finally {
      setConnecting(null);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef} data-testid="notification-bell-container">
      {/* Bell Button */}
      <button
        onClick={togglePanel}
        data-testid="notification-bell-btn"
        className="relative p-2 rounded-xl text-[#A3B8AF] hover:text-[#F0F4F2] hover:bg-white/5 transition-all duration-300"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#E17055] text-[10px] text-white font-bold flex items-center justify-center animate-pulse-soft" data-testid="notification-count">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-12 w-96 rounded-2xl glass-strong border border-[#2A4036] shadow-2xl z-[200] animate-fade-up" data-testid="notification-panel">
          <div className="flex items-center justify-between p-4 border-b border-[#2A4036]">
            <h3 className="font-['Manrope'] font-bold text-sm text-[#F0F4F2]">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button onClick={markAllRead} data-testid="mark-all-read-btn" className="text-[10px] text-[#6B8E7B] hover:text-[#83A894] transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#A3B8AF] hover:text-[#F0F4F2]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
            {loading && <div className="p-6 text-center text-sm text-[#A3B8AF]">Loading...</div>}
            {!loading && notifications.length === 0 && (
              <div className="p-6 text-center text-sm text-[#A3B8AF]" data-testid="no-notifications">No notifications yet</div>
            )}
            {!loading && notifications.map((n) => {
              const conf = TYPE_CONFIG[n.type] || TYPE_CONFIG.CRISIS;
              const Icon = conf.icon;
              return (
                <div
                  key={n.id}
                  className={`p-4 border-b border-[#2A4036] transition-all duration-300 ${n.read ? "opacity-60" : "bg-white/[0.02]"}`}
                  data-testid={`notification-${n.id}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg ${conf.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" style={{ color: conf.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium" style={{ color: conf.color }}>{conf.label}</span>
                        <span className="text-[10px] text-[#A3B8AF] flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-sm text-[#F0F4F2] font-medium mt-0.5">{n.title}</p>
                      <p className="text-xs text-[#A3B8AF] mt-0.5 leading-relaxed">{n.message}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2">
                        {n.type === "CRISIS" && n.user_id && (
                          <Button
                            onClick={() => connectToCounselor(n.user_id)}
                            disabled={connecting === n.user_id}
                            data-testid={`connect-counselor-${n.id}`}
                            className="h-7 rounded-lg bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-[10px] px-2.5"
                          >
                            <UserPlus className="w-3 h-3 mr-1" />
                            {connecting === n.user_id ? "Connecting..." : "Connect to Counselor"}
                          </Button>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => markRead(n.id)}
                            data-testid={`mark-read-${n.id}`}
                            className="text-[10px] text-[#A3B8AF] hover:text-[#6B8E7B] transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
