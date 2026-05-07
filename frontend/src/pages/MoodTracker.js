import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2">
      <p className="text-xs text-[#A3B8AF]">{label}</p>
      <p className="text-sm font-bold text-[#6B8E7B]">{payload[0].value}/10</p>
    </div>
  );
};

export default function MoodTracker() {
  const { user, moodLogs, setMoodLogs } = useStore();
  const [score, setScore] = useState([5]);
  const [notes, setNotes] = useState("");
  const [logging, setLogging] = useState(false);
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/mood/history?days=30`, { headers: authHeaders });
      setMoodLogs(res.data.mood_logs || []);
    } catch (e) { /* silent */ }
  };

  const handleLog = async () => {
    setLogging(true);
    try {
      await axios.post(`${API}/mood/log`, { mood_score: score[0], notes: notes || null }, { headers: authHeaders });
      toast.success(`Mood logged: ${score[0]}/10`);
      setNotes("");
      fetchHistory();
    } catch (e) {
      toast.error("Failed to log mood");
    } finally {
      setLogging(false);
    }
  };

  const fetchInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await axios.post(`${API}/mood/insights`, {}, { headers: authHeaders });
      setInsight(res.data);
    } catch (e) {
      toast.error("Could not generate insight");
    } finally {
      setLoadingInsight(false);
    }
  };

  const chartData = moodLogs.map((log) => ({
    date: new Date(log.logged_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
    score: log.mood_score,
  }));

  const avg = moodLogs.length > 0
    ? (moodLogs.reduce((s, l) => s + l.mood_score, 0) / moodLogs.length).toFixed(1)
    : null;

  const trend = () => {
    if (moodLogs.length < 5) return "stable";
    const recent = moodLogs.slice(-5).reduce((s, l) => s + l.mood_score, 0) / 5;
    const older = moodLogs.slice(0, 5).reduce((s, l) => s + l.mood_score, 0) / 5;
    if (recent > older + 0.5) return "up";
    if (recent < older - 0.5) return "down";
    return "stable";
  };

  const TrendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus }[trend()];
  const trendColor = { up: "#4ADE80", down: "#E17055", stable: "#A3B8AF" }[trend()];

  const getMoodLabel = (s) => {
    if (s <= 2) return "Very Low";
    if (s <= 4) return "Low";
    if (s <= 6) return "Moderate";
    if (s <= 8) return "Good";
    return "Excellent";
  };

  return (
    <div className="space-y-8" data-testid="mood-tracker-page">
      <div>
        <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Mood Tracker</h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Track your emotional journey. Every entry matters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Form */}
        <div className="rounded-3xl bg-[#14221D] border border-[#2A4036] p-8" data-testid="mood-log-form">
          <h2 className="font-['Manrope'] font-bold text-[#F0F4F2] mb-6">How are you feeling?</h2>

          <div className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-['Manrope'] font-bold text-[#6B8E7B]">{score[0]}</p>
              <p className="text-sm text-[#A3B8AF] mt-1">{getMoodLabel(score[0])}</p>
            </div>

            <Slider
              value={score}
              onValueChange={setScore}
              min={1}
              max={10}
              step={1}
              data-testid="mood-score-slider"
              className="mood-slider"
            />
            <div className="flex justify-between text-[10px] text-[#A3B8AF]/60 uppercase tracking-wider">
              <span>Low</span>
              <span>High</span>
            </div>

            <Textarea
              placeholder="Optional: What's contributing to this mood?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="mood-notes-input"
              className="min-h-[80px] rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 resize-none text-sm focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
            />

            <Button
              onClick={handleLog}
              disabled={logging}
              data-testid="submit-mood-btn"
              className="w-full h-11 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Manrope'] font-bold transition-all duration-300"
            >
              {logging ? "Logging..." : "Log Mood"}
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 rounded-3xl bg-[#14221D] border border-[#2A4036] p-8" data-testid="mood-chart-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-['Manrope'] font-bold text-[#F0F4F2]">30-Day Trend</h2>
            <div className="flex items-center gap-4">
              {avg && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#A3B8AF]">Avg</span>
                  <span className="text-sm font-bold text-[#6B8E7B]">{avg}</span>
                </div>
              )}
              {moodLogs.length >= 5 && (
                <div className="flex items-center gap-1">
                  <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
                  <span className="text-xs capitalize" style={{ color: trendColor }}>{trend()}</span>
                </div>
              )}
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B8E7B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6B8E7B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#A3B8AF", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 10]} tick={{ fill: "#A3B8AF", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#6B8E7B" strokeWidth={2} fill="url(#moodGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-[#A3B8AF] text-sm" data-testid="chart-empty">
              <div className="text-center">
                <Activity className="w-8 h-8 text-[#2A4036] mx-auto mb-2" />
                <p>Start logging moods to see your trend</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div className="rounded-3xl bg-[#14221D] border border-[#2A4036] p-8" data-testid="mood-insight-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6B8E7B]" />
            <h2 className="font-['Manrope'] font-bold text-[#F0F4F2]">AI Mood Insight</h2>
          </div>
          <Button
            onClick={fetchInsight}
            disabled={loadingInsight || moodLogs.length < 3}
            data-testid="generate-insight-btn"
            className="rounded-xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-xs"
          >
            {loadingInsight ? "Analyzing..." : "Generate Insight"}
          </Button>
        </div>
        {insight ? (
          <p className="text-sm text-[#A3B8AF] leading-relaxed" data-testid="insight-text">{insight.insight}</p>
        ) : (
          <p className="text-sm text-[#A3B8AF]/50">
            {moodLogs.length < 3
              ? "Log at least 3 mood entries to unlock AI-powered insights."
              : "Click 'Generate Insight' to get personalized analysis of your mood patterns."}
          </p>
        )}
      </div>
    </div>
  );
}
