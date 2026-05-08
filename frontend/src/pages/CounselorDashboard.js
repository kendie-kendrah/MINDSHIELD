import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Check, X as XIcon, MessageCircle, Clock, User, AlertTriangle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLES = {
  PENDING: { bg: "bg-[#FCD34D]/10", text: "text-[#FCD34D]", label: "Pending" },
  CONFIRMED: { bg: "bg-[#4ADE80]/10", text: "text-[#4ADE80]", label: "Confirmed" },
  CANCELLED: { bg: "bg-[#E17055]/10", text: "text-[#E17055]", label: "Cancelled" },
};

export default function CounselorDashboard() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [bookings, setBookings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState("");
  const [savingAvailability, setSavingAvailability] = useState(false);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookRes, convRes, profRes] = await Promise.all([
        axios.get(`${API}/counselor/bookings`, { headers: authHeaders }),
        axios.get(`${API}/counselor/conversations`, { headers: authHeaders }),
        axios.get(`${API}/counselor/profile`, { headers: authHeaders }),
      ]);
      setBookings(bookRes.data.bookings || []);
      setConversations(convRes.data.conversations || []);
      setProfile(profRes.data);
      setSlots(profRes.data?.available_slots || []);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addSlot = () => {
    const trimmed = newSlot.trim();
    if (!trimmed) return;
    if (slots.includes(trimmed)) {
      toast.error("Slot already exists");
      return;
    }
    setSlots([...slots, trimmed]);
    setNewSlot("");
  };

  const removeSlot = (slot) => {
    setSlots(slots.filter((s) => s !== slot));
  };

  const saveAvailability = async () => {
    setSavingAvailability(true);
    try {
      const res = await axios.put(
        `${API}/counselor/availability`,
        { available_slots: slots },
        { headers: authHeaders }
      );
      setProfile(res.data);
      setSlots(res.data.available_slots || []);
      toast.success("Availability updated");
    } catch (e) {
      toast.error("Failed to update availability");
    } finally {
      setSavingAvailability(false);
    }
  };

  const updateStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/counselor/bookings/${bookingId}/status`, { status }, { headers: authHeaders });
      toast.success(`Booking ${status.toLowerCase()}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to update booking");
    }
  };

  const filteredBookings = bookings.filter((b) => filter === "all" || b.status === filter);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-8" data-testid="counselor-dashboard">
      <div>
        <h1 className="font-['Fraunces'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">
          Counselor Dashboard
        </h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Manage bookings and support your users.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: bookings.length, color: "#6B8E7B" },
          { label: "Pending", value: bookings.filter((b) => b.status === "PENDING").length, color: "#FCD34D" },
          { label: "Confirmed", value: bookings.filter((b) => b.status === "CONFIRMED").length, color: "#4ADE80" },
          { label: "Active Chats", value: conversations.length, color: "#83A894" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 animate-fade-up" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}>
            <p className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">{stat.label}</p>
            <p className="text-2xl font-['Fraunces'] font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Availability Editor */}
      <div className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-6 animate-fade-up" data-testid="availability-editor">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="font-['Fraunces'] font-bold text-[#F0F4F2] text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#6B8E7B]" /> My Availability
            </h2>
            <p className="text-xs text-[#A3B8AF] mt-1">
              {profile?.specialty ? `${profile.specialty} · ` : ""}Users will only be able to book the slots listed below.
            </p>
          </div>
          <Button
            onClick={saveAvailability}
            disabled={savingAvailability}
            data-testid="save-availability-btn"
            className="h-9 rounded-xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-xs px-4"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {savingAvailability ? "Saving..." : "Save changes"}
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Input
            value={newSlot}
            onChange={(e) => setNewSlot(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSlot(); } }}
            placeholder="e.g. Mon 10:00"
            data-testid="new-slot-input"
            className="flex-1 bg-[#0E1816] border-[#2A4036] text-sm text-[#F0F4F2] placeholder:text-[#A3B8AF]/60 focus-visible:ring-[#6B8E7B]"
          />
          <Button
            onClick={addSlot}
            data-testid="add-slot-btn"
            className="h-10 rounded-xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-xs px-4"
          >
            <Plus className="w-4 h-4 mr-1" /> Add slot
          </Button>
        </div>

        {slots.length === 0 ? (
          <p className="text-xs text-[#A3B8AF] italic" data-testid="no-slots">No availability set. Users won't be able to book until you add slots.</p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="slot-list">
            {slots.map((slot) => (
              <div
                key={slot}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B8E7B]/15 border border-[#6B8E7B]/30 text-xs text-[#F0F4F2]"
                data-testid={`slot-${slot.replace(/\s+/g, '-')}`}
              >
                <Clock className="w-3 h-3 text-[#6B8E7B]" />
                <span>{slot}</span>
                <button
                  onClick={() => removeSlot(slot)}
                  data-testid={`remove-slot-${slot.replace(/\s+/g, '-')}`}
                  className="text-[#A3B8AF] hover:text-[#E17055] transition-colors"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Conversations */}
      {conversations.length > 0 && (
        <div>
          <h2 className="font-['Fraunces'] font-bold text-[#F0F4F2] text-lg mb-4">Active Conversations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => navigate(`/counselor/chat/${conv.id}`)}
                className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 card-lift cursor-pointer animate-fade-up"
                data-testid={`conversation-${conv.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6B8E7B]/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#6B8E7B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F0F4F2]">{conv.patient_pseudonym}</p>
                      {conv.last_message && (
                        <p className="text-xs text-[#A3B8AF] truncate max-w-[200px]">{conv.last_message.body}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conv.last_message?.emotional_state === "CRISIS" && (
                      <AlertTriangle className="w-4 h-4 text-[#E17055]" />
                    )}
                    {conv.last_message?.emotional_state === "MILD_DISTRESS" && (
                      <div className="w-2 h-2 rounded-full bg-[#FCD34D]" />
                    )}
                    <MessageCircle className="w-4 h-4 text-[#6B8E7B]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Fraunces'] font-bold text-[#F0F4F2] text-lg">Bookings</h2>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="bg-[#14221D] border border-[#2A4036] rounded-xl p-1 h-auto">
              {["all", "PENDING", "CONFIRMED", "CANCELLED"].map((f) => (
                <TabsTrigger
                  key={f}
                  value={f}
                  data-testid={`booking-filter-${f.toLowerCase()}`}
                  className="rounded-lg text-xs data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-3 py-1.5"
                >
                  {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {loading && <div className="text-center py-12 text-[#A3B8AF]">Loading bookings...</div>}
        {!loading && filteredBookings.length === 0 && (
          <div className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-8 text-center" data-testid="no-bookings">
            <Calendar className="w-8 h-8 text-[#2A4036] mx-auto mb-2" />
            <p className="text-sm text-[#A3B8AF]">No bookings found.</p>
          </div>
        )}

        <div className="space-y-3 stagger-children">
          {filteredBookings.map((booking) => {
            const style = STATUS_STYLES[booking.status] || STATUS_STYLES.PENDING;
            return (
              <div key={booking.id} className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 animate-fade-up" data-testid={`booking-${booking.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#6B8E7B]/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#6B8E7B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F0F4F2]">{booking.patient_pseudonym}</p>
                      <div className="flex items-center gap-2 text-xs text-[#A3B8AF]">
                        <Clock className="w-3 h-3" />
                        {new Date(booking.scheduled_at).toLocaleDateString("en", {
                          weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      {booking.notes && (
                        <p className="text-xs text-[#A3B8AF]/70 mt-1 italic">"{booking.notes}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                    {booking.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => updateStatus(booking.id, "CONFIRMED")}
                          data-testid={`confirm-booking-${booking.id}`}
                          className="h-8 w-8 rounded-xl bg-[#4ADE80]/10 hover:bg-[#4ADE80]/20 text-[#4ADE80] p-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => updateStatus(booking.id, "CANCELLED")}
                          data-testid={`cancel-booking-${booking.id}`}
                          className="h-8 w-8 rounded-xl bg-[#E17055]/10 hover:bg-[#E17055]/20 text-[#E17055] p-0"
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
