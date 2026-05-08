import { useState, useEffect } from "react";
import { Users, Stethoscope, MessageCircle, Activity, AlertTriangle, FileText, Calendar, TrendingUp, Mail, ShieldCheck } from "lucide-react";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const { user } = useStore();
  const [stats, setStats] = useState(null);
  const [crisisAlerts, setCrisisAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, crisisRes] = await Promise.all([
        axios.get(`${API}/admin/analytics`, { headers: authHeaders }),
        axios.get(`${API}/admin/crisis-alerts`, { headers: authHeaders }),
      ]);
      setStats(statsRes.data);
      setCrisisAlerts(crisisRes.data.alerts || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  if (loading || !stats) return <div className="text-center py-20 text-[#A3B8AF]">Loading analytics...</div>;

  const STATS = [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "#6B8E7B" },
    { label: "Counselors", value: stats.total_counselors, icon: Stethoscope, color: "#83A894" },
    { label: "Messages", value: stats.total_messages, icon: MessageCircle, color: "#4ADE80" },
    { label: "Forum Posts", value: stats.total_forum_posts, icon: FileText, color: "#A3B8AF" },
    { label: "Mood Logs", value: stats.total_mood_logs, icon: Activity, color: "#FCD34D" },
    { label: "Avg Mood", value: stats.avg_mood + "/10", icon: TrendingUp, color: "#6B8E7B" },
    { label: "Appointments", value: stats.total_appointments, icon: Calendar, color: "#83A894" },
    { label: "Pending Appts", value: stats.pending_appointments, icon: Calendar, color: "#FCD34D" },
    { label: "Conversations", value: stats.total_conversations, icon: MessageCircle, color: "#4ADE80" },
    { label: "Crisis Alerts", value: stats.total_crisis_alerts, icon: AlertTriangle, color: "#E17055" },
    { label: "Flagged Posts", value: stats.flagged_posts, icon: ShieldCheck, color: "#E17055" },
    { label: "Pending Invites", value: stats.pending_invites, icon: Mail, color: "#FCD34D" },
  ];

  const RECENT = [
    { label: "New Users (7d)", value: stats.recent_users, color: "#6B8E7B" },
    { label: "Messages (7d)", value: stats.recent_messages, color: "#4ADE80" },
    { label: "Crisis Alerts (7d)", value: stats.recent_crisis, color: "#E17055" },
  ];

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <h1 className="font-['Fraunces'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Platform Analytics</h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Overview of MindShield platform activity.</p>
      </div>

      {/* Recent Activity Highlight */}
      <div className="grid grid-cols-3 gap-4">
        {RECENT.map((r) => (
          <div key={r.label} className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 text-center animate-fade-up" data-testid={`recent-${r.label.slice(0,8).toLowerCase().replace(/\s/g,'-')}`}>
            <p className="text-3xl font-['Fraunces'] font-bold" style={{ color: r.color }}>{r.value}</p>
            <p className="text-xs text-[#A3B8AF] mt-1">{r.label}</p>
          </div>
        ))}
      </div>

      {/* All Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 card-lift animate-fade-up" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g,'-')}`}>
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-['Fraunces'] font-bold text-[#F0F4F2]">{s.value}</p>
            <p className="text-[10px] text-[#A3B8AF] uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Crisis Alerts */}
      <div>
        <h2 className="font-['Fraunces'] font-bold text-[#F0F4F2] text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E17055]" /> Recent Crisis Alerts
        </h2>
        {crisisAlerts.length === 0 ? (
          <div className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-8 text-center">
            <p className="text-sm text-[#A3B8AF]">No crisis alerts recorded.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {crisisAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="rounded-xl bg-[#14221D] border border-[#E17055]/20 p-4 flex items-center justify-between" data-testid={`crisis-alert-${alert.id}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E17055]/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-[#E17055]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#F0F4F2] font-medium">{alert.user_pseudonym}</p>
                    <p className="text-[10px] text-[#A3B8AF]">Session: {alert.session_id?.slice(0, 8)}...</p>
                  </div>
                </div>
                <p className="text-xs text-[#A3B8AF]">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
