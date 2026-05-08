import { useState, useEffect, useRef } from "react";
import { Send, Shield, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/* eslint-disable no-unused-vars */
const STATE_CONFIG = {
  NORMAL: { color: "#4ADE80", bg: "bg-[#4ADE80]/10", label: "Normal", dot: "normal" },
  MILD_DISTRESS: { color: "#FCD34D", bg: "bg-[#FCD34D]/10", label: "Mild Distress", dot: "mild" },
  CRISIS: { color: "#E17055", bg: "bg-[#E17055]/10", label: "Crisis", dot: "crisis" },
};

function MessageBubble({ msg }) {
  const isAI = msg.sender_type === "ai";
  const stateConf = STATE_CONFIG[msg.emotional_state] || STATE_CONFIG.NORMAL;

  return (
    <div className={`flex ${isAI ? "justify-start" : "justify-end"} animate-fade-up`} data-testid={`message-${msg.id}`}>
      <div className={`max-w-[80%] lg:max-w-[70%] ${isAI ? "" : ""}`}>
        {isAI && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-lg bg-[#6B8E7B]/20 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#6B8E7B]" />
            </div>
            <span className="text-xs text-[#A3B8AF] font-medium">MindShield AI</span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${stateConf.bg}`}>
              <span className={`state-dot ${stateConf.dot}`} />
              <span className="text-[10px] font-medium" style={{ color: stateConf.color }}>{stateConf.label}</span>
            </div>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isAI
              ? "glass text-[#F0F4F2]"
              : "bg-[#1C2F28] text-[#F0F4F2]"
          }`}
        >
          {msg.body}
        </div>
        <p className={`text-[10px] text-[#A3B8AF]/50 mt-1 ${isAI ? "" : "text-right"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user, messages, setMessages, addMessage, setShowCrisisAlert } = useStore();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await axios.get(`${API}/messages/${user?.id}`, { headers: authHeaders });
      setMessages(res.data.messages || []);
    } catch (e) { /* silent on first load */ }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic user message
    const tempMsg = {
      id: `temp-${Date.now()}`,
      body: text,
      sender_type: "user",
      emotional_state: null,
      created_at: new Date().toISOString(),
    };
    addMessage(tempMsg);

    try {
      const res = await axios.post(
        `${API}/messages`,
        { message: text, session_id: user?.id },
        { headers: authHeaders }
      );

      // Replace temp message with real ones
      const currentMsgs = useStore.getState().messages;
      const filtered = currentMsgs.filter((m) => m.id !== tempMsg.id);
      setMessages([...filtered, res.data.user_message, res.data.ai_response]);

      // Check for crisis
      if (res.data.ai_response.escalate || res.data.ai_response.emotional_state === "CRISIS") {
        setShowCrisisAlert(true);
      }
    } catch (e) {
      addMessage({
        id: `error-${Date.now()}`,
        body: "I'm having trouble connecting right now. Please try again in a moment.",
        sender_type: "ai",
        emotional_state: "NORMAL",
        created_at: new Date().toISOString(),
      });
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-[calc(100vh-64px)]" data-testid="chat-page">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#2A4036]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#6B8E7B]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#6B8E7B]" />
          </div>
          <div>
            <h2 className="font-['Fraunces'] font-bold text-[#F0F4F2]">MindShield AI</h2>
            <p className="text-xs text-[#4ADE80]">Always available</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs text-[#A3B8AF]">
          <Shield className="w-3 h-3" />
          Encrypted
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-6">
        <div className="max-w-3xl mx-auto space-y-4 px-2">
          {messages.length === 0 && (
            <div className="text-center py-12 animate-fade-up max-w-md mx-auto" data-testid="chat-empty-state">
              <div className="text-5xl mb-4" aria-hidden>👋</div>
              <h3 className="font-['Fraunces'] font-semibold text-2xl text-[#F0F4F2] mb-2">Hi there.</h3>
              <p className="text-sm text-[#A3B8AF] leading-relaxed mb-8">
                How are you feeling today? Whatever's on your mind, this is a private, judgement-free space.
              </p>
              <div className="grid grid-cols-2 gap-3" data-testid="chat-prompt-grid">
                {[
                  { text: "I'm feeling anxious", emoji: "🌪️" },
                  { text: "I need to vent", emoji: "🗣️" },
                  { text: "I want coping tips", emoji: "🌱" },
                  { text: "Just say hi", emoji: "👋" },
                ].map((s) => (
                  <button
                    key={s.text}
                    onClick={() => setInput(s.text)}
                    data-testid={`suggestion-${s.text.slice(0, 12).replace(/\s/g, '-').toLowerCase()}`}
                    className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl glass border border-[#2A4036] text-sm text-[#F0F4F2] hover:bg-white/[0.06] hover:border-[#6B8E7B]/40 hover:-translate-y-0.5 transition-all duration-300 text-left"
                  >
                    <span className="text-xl flex-shrink-0" aria-hidden>{s.emoji}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {sending && (
            <div className="flex justify-start animate-fade-up">
              <div className="glass rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#6B8E7B] animate-spin" />
                <span className="text-sm text-[#A3B8AF]">MindShield is thinking...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Disclaimer */}
      <div className="flex items-center justify-center gap-1.5 py-2 text-[10px] text-[#A3B8AF]/40">
        <AlertTriangle className="w-3 h-3" />
        MindShield is not a substitute for professional care. In emergencies call 0800 033 3567
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-[#2A4036]">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what's on your mind..."
            disabled={sending}
            data-testid="chat-input"
            className="flex-1 h-12 rounded-2xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            data-testid="chat-send-btn"
            className="h-12 w-12 rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] transition-all duration-300 hover:scale-105"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
