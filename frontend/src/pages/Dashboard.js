import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Activity, Users, Calendar, BookOpen, TrendingUp, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUICK_LINKS = [
  { path: "/chat", label: "AI Chat", icon: MessageCircle, desc: "Talk with MindShield AI", color: "#6B8E7B" },
  { path: "/mood", label: "Mood Tracker", icon: Activity, desc: "Log how you feel today", color: "#FCD34D" },
  { path: "/forum", label: "Community", icon: Users, desc: "Anonymous peer support", color: "#83A894" },
  { path: "/appointments", label: "Appointments", icon: Calendar, desc: "Book a session", color: "#4ADE80" },
  { path: "/resources", label: "Resources", icon: BookOpen, desc: "Coping tools & guides", color: "#A3B8AF" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [moodScore, setMoodScore] = useState([5]);
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
    setLogging(true);
    try {
      await axios.post(`${API}/mood/log`, { mood_score: moodScore[0] }, { headers: authHeaders });
      toast.success(`Mood logged: ${moodScore[0]}/10`);
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

  const getMoodEmoji = (score) => {
    if (score <= 3) return "Struggling";
    if (score <= 5) return "Managing";
    if (score <= 7) return "Good";
    return "Great";
  };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Greeting */}
      <div className="animate-fade-up">
        <h1 className="font-['Manrope'] text-3xl sm:text-4xl font-bold tracking-tight text-[#F0F4F2]">
          {getTimeGreeting()}, {user?.pseudonym}
        </h1>
        <p className="mt-2 text-sm text-[#A3B8AF] leading-relaxed">
          Your safe space for mental wellness. How are you feeling today?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 stagger-children">
        {/* Quick Mood Log - spans 2 cols */}
        <div className="md:col-span-2 rounded-3xl bg-[#14221D] border border-[#2A4036] p-8 card-lift animate-fade-up" data-testid="quick-mood-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-['Manrope'] font-bold text-[#F0F4F2]">Quick Mood Check</h2>
            <span className="text-2xl font-['Manrope'] font-bold text-[#6B8E7B]">{moodScore[0]}/10</span>
          </div>

          <div className="space-y-4">
            <Slider
              value={moodScore}
              onValueChange={setMoodScore}
              min={1}
              max={10}
              step={1}
              data-testid="mood-slider"
              className="mood-slider"
            />
            <div className="flex justify-between text-xs text-[#A3B8AF]">
              <span>Struggling</span>
              <span className="font-medium text-[#6B8E7B]">{getMoodEmoji(moodScore[0])}</span>
              <span>Thriving</span>
            </div>
            <Button
              onClick={handleQuickMood}
              disabled={logging}
              data-testid="log-mood-btn"
              className="w-full h-10 rounded-2xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] font-medium text-sm transition-all duration-300"
            >
              {logging ? "Logging..." : "Log Today's Mood"}
            </Button>
          </div>
        </div>

        {/* Mood Summary */}
        <div className="rounded-3xl bg-[#14221D] border border-[#2A4036] p-8 card-lift animate-fade-up" data-testid="mood-summary-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#6B8E7B]" />
            <h3 className="text-sm font-['Manrope'] font-bold text-[#F0F4F2]">This Week</h3>
          </div>
          {recentMood ? (
            <div className="space-y-2">
              <p className="text-3xl font-['Manrope'] font-bold text-[#6B8E7B]">{recentMood.average}</p>
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
          <MessageCircle className="w-8 h-8 text-[#6B8E7B] mb-4" />
          <h3 className="font-['Manrope'] font-bold text-[#F0F4F2] mb-1">Talk to MindShield</h3>
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
            <link.icon className="w-5 h-5 mb-3" style={{ color: link.color }} />
            <h3 className="text-sm font-['Manrope'] font-bold text-[#F0F4F2]">{link.label}</h3>
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
