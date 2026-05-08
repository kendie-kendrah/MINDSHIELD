import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ShieldCheck, Copy, Check, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useStore();
  const [step, setStep] = useState("welcome"); // welcome | created | login
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(null);
  const [loginId, setLoginId] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, { pin: pin || null });
      setUser({
        id: res.data.user_id,
        pseudonym: res.data.pseudonym,
        token: res.data.access_token,
        privateKey: res.data.private_key,
      });
      setStep("created");
      toast.success("Identity created securely");
    } catch (e) {
      toast.error("Failed to create identity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, {
        user_id: loginId.trim(),
        pin: loginPin || null,
      });
      setUser({
        id: res.data.user_id,
        pseudonym: res.data.pseudonym,
        token: res.data.access_token,
      });
      toast.success(`Welcome back, ${res.data.pseudonym}`);
      navigate("/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Login failed. Check your UUID.");
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

  if (step === "created" && user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" data-testid="onboarding-created">
        <div className="w-full max-w-md space-y-8 animate-fade-up">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#4ADE80]/10 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-[#4ADE80]" />
            </div>
            <h1 className="font-['Fraunces'] text-2xl font-semibold tracking-tight text-[#F0F4F2]">
              Your identity is ready
            </h1>
            <p className="text-sm text-[#A3B8AF] leading-relaxed">
              Save your UUID below. It is your only way to access MindShield. We store nothing else.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 space-y-4">
              <div>
                <p className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em] mb-2">Pseudonym</p>
                <div className="flex items-center justify-between">
                  <p className="font-['Fraunces'] font-bold text-[#F0F4F2]" data-testid="display-pseudonym">{user.pseudonym}</p>
                  <button
                    onClick={() => copyToClipboard(user.pseudonym, "Pseudonym")}
                    data-testid="copy-pseudonym-btn"
                    className="text-[#A3B8AF] hover:text-[#6B8E7B] transition-colors"
                  >
                    {copied === "Pseudonym" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="border-t border-[#2A4036]" />
              <div>
                <p className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em] mb-2">Your UUID</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs text-[#6B8E7B] font-mono break-all" data-testid="display-uuid">{user.id}</code>
                  <button
                    onClick={() => copyToClipboard(user.id, "UUID")}
                    data-testid="copy-uuid-btn"
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
                Save your UUID securely. If you lose it, your account cannot be recovered. We do not store any personal information.
              </p>
            </div>
          </div>

          <Button
            onClick={() => navigate("/dashboard")}
            data-testid="enter-platform-btn"
            className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold text-sm transition-all duration-300 hover:scale-[1.02]"
          >
            Enter MindShield
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="onboarding-page">
      <div className="w-full max-w-md space-y-8 animate-fade-up">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-10 h-10 text-[#6B8E7B]" />
          </div>
          <div>
            <h1 className="font-['Fraunces'] text-4xl sm:text-5xl font-semibold tracking-tight text-[#F0F4F2]">
              MindShield
            </h1>
            <p className="mt-3 text-base text-[#A3B8AF] leading-relaxed max-w-xs mx-auto">
              Speak freely, heal confidently, and stay completely anonymous every step of the way.
            </p>
          </div>
        </div>

        {step === "welcome" && (
          <div className="space-y-6 stagger-children">
            {/* Feature emojis */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🛡️", label: "100% Anonymous" },
                { emoji: "🔒", label: "End-to-End Encrypted" },
                { emoji: "💬", label: "Talk Any Time" },
                { emoji: "🌱", label: "Built for You" },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-4 text-center animate-fade-up flex flex-col items-center gap-1.5">
                  <span className="text-2xl" aria-hidden>{f.emoji}</span>
                  <p className="text-xs text-[#A3B8AF] font-medium">{f.label}</p>
                </div>
              ))}
            </div>

            {/* Optional PIN */}
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Optional Security PIN</label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  placeholder="Set a PIN for extra security"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  data-testid="pin-input"
                  className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 pr-10 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3B8AF]"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleRegister}
              disabled={loading}
              data-testid="get-started-btn"
              className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold text-sm transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? "Creating your identity..." : "Get Started Anonymously"}
            </Button>

            <div className="text-center">
              <button
                onClick={() => setStep("login")}
                data-testid="switch-to-login-btn"
                className="text-sm text-[#6B8E7B] hover:text-[#83A894] transition-colors"
              >
                Already have a UUID? Sign in
              </button>
            </div>
          </div>
        )}

        {step === "login" && (
          <div className="space-y-5 animate-fade-up">
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Your UUID</label>
              <Input
                type="text"
                placeholder="Paste your UUID here"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                data-testid="login-uuid-input"
                className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 font-mono text-xs focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">PIN (if set)</label>
              <Input
                type="password"
                placeholder="Enter your PIN"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                data-testid="login-pin-input"
                className="h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading || !loginId.trim()}
              data-testid="login-submit-btn"
              className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold text-sm transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center">
              <button
                onClick={() => setStep("welcome")}
                data-testid="switch-to-register-btn"
                className="text-sm text-[#6B8E7B] hover:text-[#83A894] transition-colors"
              >
                Create a new identity instead
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-[#A3B8AF]/60 leading-relaxed">
          MindShield is not a substitute for professional care.
          In emergencies, call 0800 033 3567.
        </p>
        <div className="text-center">
          <button
            onClick={() => navigate("/counselor")}
            data-testid="counselor-portal-link"
            className="text-xs text-[#A3B8AF]/50 hover:text-[#6B8E7B] transition-colors"
          >
            Counselor Portal
          </button>
        </div>
      </div>
    </div>
  );
}
