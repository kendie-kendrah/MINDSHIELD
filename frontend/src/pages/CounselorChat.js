import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, User, Stethoscope, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATE_CONFIG = {
  NORMAL: { color: "#4ADE80", bg: "bg-[#4ADE80]/10", label: "Normal" },
  MILD_DISTRESS: { color: "#FCD34D", bg: "bg-[#FCD34D]/10", label: "Mild Distress" },
  CRISIS: { color: "#E17055", bg: "bg-[#E17055]/10", label: "Crisis" },
};

export default function CounselorChat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useStore();
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  const isCounselor = user?.role === "counselor";
  const authHeaders = { Authorization: `Bearer ${user?.token}` };
  const baseRoute = isCounselor ? `${API}/counselor/conversations` : `${API}/conversations`;

  useEffect(() => {
    fetchMessages();
    // Poll every 3 seconds for near real-time
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${baseRoute}/${conversationId}/messages`, { headers: authHeaders });
      setMessages(res.data.messages || []);
      setConversation(res.data.conversation || null);
    } catch (e) { /* silent polling errors */ }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    try {
      const res = await axios.post(
        `${baseRoute}/${conversationId}/messages`,
        { body: text },
        { headers: authHeaders }
      );
      setMessages((prev) => [...prev, res.data]);
    } catch (e) {
      setInput(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherName = isCounselor ? conversation?.patient_pseudonym : conversation?.counselor_pseudonym;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-64px)]" data-testid="counselor-chat-page">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#2A4036]">
        <button
          onClick={() => navigate(isCounselor ? "/counselor/dashboard" : "/appointments")}
          data-testid="chat-back-btn"
          className="text-[#A3B8AF] hover:text-[#F0F4F2] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-[#6B8E7B]/20 flex items-center justify-center">
          {isCounselor ? <User className="w-5 h-5 text-[#6B8E7B]" /> : <Stethoscope className="w-5 h-5 text-[#6B8E7B]" />}
        </div>
        <div>
          <h2 className="font-['Manrope'] font-bold text-[#F0F4F2] text-sm">{otherName || "Loading..."}</h2>
          <p className="text-xs text-[#4ADE80]">
            {isCounselor ? "Patient" : "Counselor"} - Encrypted Session
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-[#A3B8AF]">
          <Shield className="w-3 h-3" /> Secure
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-6">
        <div className="max-w-3xl mx-auto space-y-4 px-2">
          {messages.length === 0 && (
            <div className="text-center py-16 animate-fade-up" data-testid="chat-empty">
              <p className="text-sm text-[#A3B8AF]">
                {isCounselor
                  ? "Start the conversation with your patient. Be empathetic and supportive."
                  : "Your counselor is available. Share what's on your mind."}
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            const stateConf = STATE_CONFIG[msg.emotional_state];
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} animate-fade-up`} data-testid={`msg-${msg.id}`}>
                <div className="max-w-[80%]">
                  {!isMine && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs text-[#A3B8AF] font-medium">{msg.sender_pseudonym}</span>
                      {msg.emotional_state && stateConf && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${stateConf.bg}`}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stateConf.color }} />
                          <span className="text-[10px] font-medium" style={{ color: stateConf.color }}>{stateConf.label}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {isMine && msg.emotional_state && stateConf && isCounselor === false && (
                    <div className="flex justify-end mb-1.5">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${stateConf.bg}`}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stateConf.color }} />
                        <span className="text-[10px] font-medium" style={{ color: stateConf.color }}>{stateConf.label}</span>
                      </div>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isMine ? "bg-[#1C2F28] text-[#F0F4F2]" : "glass text-[#F0F4F2]"
                  }`}>
                    {msg.body}
                  </div>
                  <p className={`text-[10px] text-[#A3B8AF]/50 mt-1 ${isMine ? "text-right" : ""}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex justify-end animate-fade-up">
              <div className="bg-[#1C2F28] rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#6B8E7B] animate-spin" />
                <span className="text-sm text-[#A3B8AF]">Sending...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="pt-3 border-t border-[#2A4036]">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCounselor ? "Type your response..." : "Share what's on your mind..."}
            disabled={sending}
            data-testid="conversation-chat-input"
            className="flex-1 h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            data-testid="conversation-send-btn"
            className="h-12 w-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] transition-all duration-300 hover:scale-105"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
