import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Stethoscope, ArrowRight, Eye, EyeOff, KeyRound, Copy, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SPECIALTIES = [
  "Anxiety & Stress Management",
  "Depression & Mood Disorders",
  "Relationships & Family",
  "Trauma & PTSD",
  "Grief & Loss",
  "Substance Abuse",
  "General Counseling",
];

export default function CounselorLogin() {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [mode, setMode] = useState("login"); // login | register | credentials
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(null);

  // Login state
  const [loginId, setLoginId] = useState("");
  const [loginPin, setLoginPin] = useState("");

  // Register state
  const [accessCode, setAccessCode] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [pin, setPin] = useState("");

  const handleLogin = async () => {
    if (!loginId.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/counselor/login`, {
        user_id: loginId.trim(),
        pin: loginPin || null,
      });
      setUser({
        id: res.data.user_id,
        pseudonym: res.data.pseudonym,
        token: res.data.access_token,
        role: "counselor",
        specialty: res.data.specialty,
      });
      toast.success(`Welcome back, ${res.data.pseudonym}`);
      navigate("/counselor/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!accessCode.trim() || !specialty) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/counselor/register`, {
        access_code: accessCode.trim(),
        specialty,
        bio: bio || null,
        pin: pin || null,
      });
      setUser({
        id: res.data.user_id,
        pseudonym: res.data.pseudonym,
        token: res.data.access_token,
        role: "counselor",
        specialty: res.data.specialty,
      });
      toast.success(`Registered as ${res.data.pseudonym}`);
      setMode("credentials");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (mode === "credentials" && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="counselor-credentials-page">
        <div className="w-full max-w-md space-y-8 animate-fade-up">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center mx-auto">
              <Stethoscope className="w-8 h-8 text-[#4ADE80]" />
            </div>
            <h1 className="font-['Fraunces'] text-2xl font-bold tracking-tight text-[#F0F4F2]">
              Welcome, {user.pseudonym}
            </h1>
            <p className="text-sm text-[#A3B8AF] leading-relaxed">
              Your counselor account is ready. Save your UUID below — it is your only way to log in.
            </p>
          </div>

          <div className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 space-y-4">
            <div>
              <p className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em] mb-2">Pseudonym</p>
              <div className="flex items-center justify-between">
                <p className="font-['Fraunces'] font-bold text-[#F0F4F2]" data-testid="counselor-display-pseudonym">{user.pseudonym}</p>
                <button
                  onClick={() => copyToClipboard(user.pseudonym, "Pseudonym")}
                  data-testid="counselor-copy-pseudonym"
                  className="text-[#A3B8AF] hover:text-[#6B8E7B] transition-colors"
                >
                  {copied === "Pseudonym" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="border-t border-[#2A4036]" />
            <div>
              <p className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em] mb-2">Your UUID (use this to sign in)</p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs text-[#6B8E7B] font-mono break-all" data-testid="counselor-display-uuid">{user.id}</code>
                <button
                  onClick={() => copyToClipboard(user.id, "UUID")}
                  data-testid="counselor-copy-uuid"
                  className="text-[#A3B8AF] hover:text-[#6B8E7B] transition-colors flex-shrink-0"
                >
                  {copied === "UUID" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#E17055]/5 border border-[#E17055]/20 p-4">
            <p className="text-xs text-[#E17055] leading-relaxed">
              <Lock className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Save your UUID securely. You will need it to sign in. We do not store personal information and cannot recover your account.
            </p>
          </div>

          <Button
            onClick={() => navigate("/counselor/dashboard")}
            data-testid="counselor-enter-dashboard"
            className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold text-sm transition-all duration-300 hover:scale-[1.02]"
          >
            Enter Counselor Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="counselor-login-page">
      <div className="w-full max-w-md space-y-8 animate-fade-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 flex items-center justify-center mx-auto">
            <Stethoscope className="w-10 h-10 text-[#6B8E7B]" />
          </div>
          <div>
            <h1 className="font-['Fraunces'] text-3xl sm:text-4xl font-bold tracking-tighter text-[#F0F4F2]">
              Counselor Portal
            </h1>
            <p className="mt-2 text-sm text-[#A3B8AF] leading-relaxed">
              MindShield professional counselor access
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-2xl bg-[#14221D] border border-[#2A4036] p-1">
          <button
            onClick={() => setMode("login")}
            data-testid="counselor-mode-login"
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === "login" ? "bg-[#6B8E7B]/20 text-[#6B8E7B]" : "text-[#A3B8AF]"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("register")}
            data-testid="counselor-mode-register"
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              mode === "register" ? "bg-[#6B8E7B]/20 text-[#6B8E7B]" : "text-[#A3B8AF]"
            }`}
          >
            Register
          </button>
        </div>

        {mode === "login" && (
          <div className="space-y-4 animate-fade-up">
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Your UUID (not pseudonym)</label>
              <Input
                type="text"
                placeholder="e.g. a3b1c2d4-e5f6-7890-abcd-1234567890ef"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                data-testid="counselor-login-uuid"
                className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 font-mono text-xs focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">PIN (if set)</label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  placeholder="Enter PIN"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  data-testid="counselor-login-pin"
                  className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 pr-10 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
                />
                <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3B8AF]">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading || !loginId.trim()}
              data-testid="counselor-login-submit"
              className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? "Signing in..." : "Sign In as Counselor"}
            </Button>
          </div>
        )}

        {mode === "register" && (
          <div className="space-y-4 animate-fade-up">
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Access Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3B8AF]" />
                <Input
                  type="password"
                  placeholder="Enter counselor access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  data-testid="counselor-access-code"
                  className="h-12 pl-10 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger data-testid="counselor-specialty-select" className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2]">
                  <SelectValue placeholder="Select your specialty" />
                </SelectTrigger>
                <SelectContent className="bg-[#14221D] border-[#2A4036]">
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s} className="text-[#F0F4F2] focus:bg-[#1C2F28] focus:text-[#F0F4F2]">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Bio (optional)</label>
              <Input
                placeholder="Brief description of your practice"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                data-testid="counselor-bio-input"
                className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Security PIN (optional)</label>
              <Input
                type="password"
                placeholder="Set a PIN for login security"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                data-testid="counselor-pin-input"
                className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
            </div>
            <Button
              onClick={handleRegister}
              disabled={loading || !accessCode.trim() || !specialty}
              data-testid="counselor-register-submit"
              className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? "Registering..." : "Register as Counselor"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        <div className="text-center space-y-2">
          <button
            onClick={() => navigate("/")}
            data-testid="back-to-user-login"
            className="text-sm text-[#6B8E7B] hover:text-[#83A894] transition-colors"
          >
            Back to user login
          </button>
        </div>
      </div>
    </div>
  );
}
