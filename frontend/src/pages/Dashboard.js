import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUICK_LINKS = [
  { path: "/chat", label: "AI Chat", emoji: "💬", desc: "Talk with MindShield AI" },
  { path: "/mood", label: "Mood Tracker", emoji: "📈", desc: "Log how you feel today" },
  { path: "/forum", label: "Community", emoji: "🤝", desc: "Anonymous peer support" },
  { path: "/appointments", label: "Appointments", emoji: "📅", desc: "Book a session" },
  { path: "/resources", label: "Resources", emoji: "📚", desc: "Coping tools & guides" },
];

const MOOD_OPTIONS = [
  { score: 2, emoji: "😢", label: "Struggling" },
  { score: 4, emoji: "😟", label: "Low" },
  { score: 6, emoji: "😐", label: "Okay" },
  { score: 8, emoji: "😌", label: "Good" },
  { score: 10, emoji: "😃", label: "Great" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [moodChoice, setMoodChoice] = useState(null);
  const [logging, setLogging] = useState(false);
  const [recentMood, setRecentMood] = useState(null);
  const [insight, setInsight] = useState(null);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => {
    fetchRecentMood();
  }, []);

  const fetchRecentMood = async () => {
    try {
      const res = await axios.get(`${API}/mood/history?days=7`, { headers: authHeaders });
      const logs = res.data.mood_logs;
      if (logs.length > 0) {
        const avg = logs.reduce((s, l) => s + l.mood_score, 0) / logs.length;
        setRecentMood({ average: avg.toFixed(1), count: logs.length });
      }
    } catch (e) { /* silent */ }
  };

  const handleQuickMood = async () => {
    if (!moodChoice) return;
    setLogging(true);
    try {
      await axios.post(`${API}/mood/log`, { mood_score: moodChoice.score }, { headers: authHeaders });
      toast.success(`${moodChoice.emoji} Mood logged: ${moodChoice.label}`);
      setMoodChoice(null);
      fetchRecentMood();
    } catch (e) {
      toast.error("Failed to log mood");
    } finally {
      setLogging(false);
    }
  };

  const fetchInsight = async () => {
    try {
      const res = await axios.post(`${API}/mood/insights`, {}, { headers: authHeaders });
      setInsight(res.data);
    } catch (e) { /* silent */ }
  };

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Greeting */}
      <div className="animate-fade-up">
        <h1 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold tracking-tight text-[#F0F4F2]">
          {getTimeGreeting()}, {user?.pseudonym}
        </h1>
        <p className="mt-2 text-sm text-[#A3B8AF] leading-relaxed">
          Your safe space for mental wellness. How are you feeling today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger-children">
        {/* Quick Mood Log - emoji picker */}
        <div className="md:col-span-2 rounded-3xl bg-[#14221D] border border-[#2A4036] p-8 card-lift animate-fade-up" data-testid="quick-mood-card">
          <h2 className="font-['Fraunces'] font-semibold text-[#F0F4F2] text-lg mb-1">How are you feeling?</h2>
          <p className="text-xs text-[#A3B8AF] mb-6">Tap an emoji to log a quick mood</p>

          <div className="flex justify-between gap-2 mb-6" data-testid="mood-emoji-row">
            {MOOD_OPTIONS.map((m) => {
              const active = moodChoice?.score === m.score;
              return (
                <button
                  key={m.score}
                  onClick={() => setMoodChoice(m)}
                  data-testid={`mood-emoji-${m.score}`}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all duration-300 ${active ? "bg-[#6B8E7B]/20 ring-2 ring-[#6B8E7B] scale-105" : "bg-white/[0.02] hover:bg-white/[0.05] hover:scale-105"}`}
                >
                  <span className="text-3xl" aria-hidden>{m.emoji}</span>
                  <span className={`text-[10px] font-medium ${active ? "text-[#6B8E7B]" : "text-[#A3B8AF]"}`}>{m.label}</span>
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleQuickMood}
            disabled={!moodChoice || logging}
            data-testid="log-mood-btn"
            className="w-full h-11 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] disabled:bg-[#6B8E7B]/30 text-[#0C1411] disabled:text-[#0C1411]/50 font-['Fraunces'] font-semibold text-sm transition-all duration-300"
          >
            {logging ? "Logging..." : moodChoice ? `Log ${moodChoice.label}` : "Pick an emoji to log"}
          </Button>
        </div>

        {/* Mood Summary */}
        <div className="rounded-3xl bg-[#14221D] border border-[#2A4036] p-8 card-lift animate-fade-up" data-testid="mood-summary-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#F4A261]" />
            <h3 className="text-sm font-['Fraunces'] font-semibold text-[#F0F4F2]">This Week</h3>
          </div>
          {recentMood ? (
            <div className="space-y-2">
              <p className="text-3xl font-['Fraunces'] font-semibold text-[#6B8E7B]">{recentMood.average}</p>
              <p className="text-xs text-[#A3B8AF]">Average from {recentMood.count} entries</p>
            </div>
          ) : (
            <p className="text-sm text-[#A3B8AF]">No mood data yet. Start logging to see trends.</p>
          )}
          <Button
            onClick={fetchInsight}
            data-testid="get-insight-btn"
            className="mt-4 w-full h-9 rounded-xl bg-white/5 hover:bg-white/10 text-[#A3B8AF] text-xs transition-all duration-300"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Get AI Insight
          </Button>
          {insight && (
            <p className="mt-3 text-xs text-[#A3B8AF] leading-relaxed" data-testid="mood-insight-text">{insight.insight}</p>
          )}
        </div>

        {/* Start Chat CTA */}
        <div
          className="rounded-3xl bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 p-8 card-lift cursor-pointer animate-fade-up"
          onClick={() => navigate("/chat")}
          data-testid="chat-cta-card"
        >
          <div className="text-3xl mb-4" aria-hidden>💬</div>
          <h3 className="font-['Fraunces'] font-semibold text-[#F0F4F2] text-lg mb-1">Talk to MindShield</h3>
          <p className="text-xs text-[#A3B8AF] leading-relaxed">AI-powered support, available 24/7. Completely anonymous.</p>
          <div className="flex items-center gap-1 mt-4 text-xs text-[#6B8E7B] font-medium">
            Start chatting <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Quick Links */}
        {QUICK_LINKS.map((link) => (
          <div
            key={link.path}
            onClick={() => navigate(link.path)}
            className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-6 card-lift cursor-pointer animate-fade-up"
            data-testid={`quick-link-${link.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <div className="text-2xl mb-3" aria-hidden>{link.emoji}</div>
            <h3 className="text-sm font-['Fraunces'] font-semibold text-[#F0F4F2]">{link.label}</h3>
            <p className="text-xs text-[#A3B8AF] mt-1">{link.desc}</p>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-[#A3B8AF]/50 text-center leading-relaxed max-w-lg mx-auto">
        MindShield is not a substitute for professional mental health care. In emergencies, call NEMA Crisis Line: 0800 033 3567
      </p>
    </div>
  );
}
