import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLogin() {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/admin/login`, { username: username.trim(), password });
      setUser({
        id: "admin",
        pseudonym: "Administrator",
        token: res.data.access_token,
        role: "admin",
      });
      toast.success("Welcome, Administrator");
      navigate("/admin/dashboard");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid admin credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="admin-login-page">
      <div className="w-full max-w-md space-y-8 animate-fade-up">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-[#6B8E7B]/10 border border-[#6B8E7B]/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-10 h-10 text-[#6B8E7B]" />
          </div>
          <div>
            <h1 className="font-['Fraunces'] text-3xl sm:text-4xl font-bold tracking-tighter text-[#F0F4F2]">Admin Panel</h1>
            <p className="mt-2 text-sm text-[#A3B8AF]">MindShield platform administration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3B8AF]" />
              <Input
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="admin-username"
                className="h-12 pl-10 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3B8AF]" />
              <Input
                type={showPass ? "text" : "password"}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                data-testid="admin-password"
                className="h-12 pl-10 pr-10 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/50 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3B8AF]">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            onClick={handleLogin}
            disabled={loading || !username.trim() || !password.trim()}
            data-testid="admin-login-submit"
            className="w-full h-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-['Fraunces'] font-bold transition-all duration-300 hover:scale-[1.02]"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </div>
        <div className="text-center">
          <button onClick={() => navigate("/")} className="text-xs text-[#A3B8AF]/50 hover:text-[#6B8E7B] transition-colors">
            Back to MindShield
          </button>
        </div>
      </div>
    </div>
  );
}
