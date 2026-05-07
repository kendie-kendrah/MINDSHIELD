import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bell, AlertTriangle, Flag, X, Check, UserPlus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
// Build the ws:// or wss:// URL from the configured backend URL
const WS_URL = `${process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws")}/api/ws/admin/notifications`;

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
  const [wsConnected, setWsConnected] = useState(false);
  const panelRef = useRef(null);
  const bellRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  // Initial fetch on mount
  useEffect(() => {
    fetchCount();
    fetchNotifications();
  }, []);

  // WebSocket: real-time push of new notifications and read events
  useEffect(() => {
    if (!user?.token) return;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(user.token)}`);
        wsRef.current = ws;

        ws.onopen = () => setWsConnected(true);

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            if (data.event === "notification.new" && data.notification) {
              setNotifications((prev) => [data.notification, ...prev]);
              setCount((c) => c + 1);
              const isCrisis = data.notification.type === "CRISIS";
              toast(isCrisis ? "🚨 Crisis Detected" : "🚩 Flagged Post", {
                description: data.notification.title,
                duration: 6000,
              });
            } else if (data.event === "notification.read_all") {
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              setCount(0);
            } else if (data.event === "notification.cleared") {
              setNotifications([]);
              setCount(0);
            }
          } catch (e) { /* ignore */ }
        };

        ws.onclose = () => {
          setWsConnected(false);
          wsRef.current = null;
          if (!cancelled) {
            // Reconnect with backoff
            reconnectTimerRef.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          try { ws.close(); } catch (e) { /* ignore */ }
        };
      } catch (e) {
        reconnectTimerRef.current = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) { /* ignore */ }
        wsRef.current = null;
      }
    };
  }, [user?.token]);

  // Close on outside click (handles both the bell and the portaled panel)
  useEffect(() => {
    const handler = (e) => {
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      const inBell = bellRef.current && bellRef.current.contains(e.target);
      if (!inPanel && !inBell) setOpen(false);
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
    if (!open) {
      // Quick refresh in case anything was missed while WS was down
      fetchNotifications();
      fetchCount();
    }
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

  const clearAll = async () => {
    if (!window.confirm("Delete ALL notifications? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/admin/notifications`, { headers: authHeaders });
      setNotifications([]);
      setCount(0);
      toast.success("All notifications cleared");
    } catch (e) {
      toast.error("Failed to clear notifications");
    }
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
    <div className="relative" data-testid="notification-bell-container">
      {/* Bell Button */}
      <button
        ref={bellRef}
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

      {/* Dropdown Panel — rendered to document.body via Portal so it escapes the admin header's backdrop-filter stacking context */}
      {open && createPortal(
        <div
          className="fixed top-16 right-4 lg:right-8 w-[420px] max-w-[92vw] rounded-2xl border-2 border-[#6B8E7B]/40 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.95)] animate-fade-up overflow-hidden"
          style={{ backgroundColor: "#0B1614", zIndex: 9999 }}
          data-testid="notification-panel"
          ref={panelRef}
        >
          <div className="flex items-center justify-between p-4 border-b border-[#2A4036]" style={{ backgroundColor: "#14221D" }}>
            <div className="flex items-center gap-2">
              <h3 className="font-['Manrope'] font-extrabold text-base text-white tracking-tight">Notifications</h3>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${wsConnected ? "bg-[#4ADE80]/15 text-[#4ADE80]" : "bg-[#A3B8AF]/15 text-[#A3B8AF]"}`}
                data-testid="ws-status"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-[#4ADE80] animate-pulse" : "bg-[#A3B8AF]"}`} />
                {wsConnected ? "Live" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button onClick={markAllRead} data-testid="mark-all-read-btn" className="text-xs font-semibold text-[#83A894] hover:text-[#A3D4B7] transition-colors">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} data-testid="clear-all-btn" className="text-xs font-semibold text-[#E17055] hover:text-[#F47A60] transition-colors">
                  Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#A3B8AF] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <ScrollArea className="max-h-[440px]">
            {loading && <div className="p-6 text-center text-sm text-[#A3B8AF]">Loading...</div>}
            {!loading && notifications.length === 0 && (
              <div className="p-8 text-center text-sm text-[#A3B8AF]" data-testid="no-notifications">No notifications yet</div>
            )}
            {!loading && notifications.map((n) => {
              const conf = TYPE_CONFIG[n.type] || TYPE_CONFIG.CRISIS;
              const Icon = conf.icon;
              return (
                <div
                  key={n.id}
                  className="p-4 border-b border-[#2A4036] transition-all duration-300"
                  style={{ backgroundColor: n.read ? "#0B1614" : "#14221D", opacity: n.read ? 0.85 : 1 }}
                  data-testid={`notification-${n.id}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-9 h-9 rounded-lg ${conf.bg} flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10`}>
                      <Icon className="w-[18px] h-[18px]" style={{ color: conf.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: conf.color }}>{conf.label}</span>
                        <span className="text-[11px] font-medium text-[#A3B8AF] flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-[15px] text-white font-bold mt-1 leading-snug">{n.title}</p>
                      <p className="text-[13px] text-[#D4DCD8] mt-1 leading-relaxed font-medium">{n.message}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {n.type === "CRISIS" && n.user_id && (
                          <Button
                            onClick={() => connectToCounselor(n.user_id)}
                            disabled={connecting === n.user_id}
                            data-testid={`connect-counselor-${n.id}`}
                            className="h-8 rounded-lg bg-[#6B8E7B]/30 hover:bg-[#6B8E7B]/50 text-[#A3D4B7] text-xs font-semibold px-3 border border-[#6B8E7B]/40"
                          >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                            {connecting === n.user_id ? "Connecting..." : "Connect to Counselor"}
                          </Button>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => markRead(n.id)}
                            data-testid={`mark-read-${n.id}`}
                            className="text-xs font-semibold text-[#A3B8AF] hover:text-[#83A894] transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>,
        document.body
      )}
    </div>
  );
}
