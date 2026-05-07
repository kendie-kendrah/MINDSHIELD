import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Check, X as XIcon, MessageCircle, Clock, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookRes, convRes] = await Promise.all([
        axios.get(`${API}/counselor/bookings`, { headers: authHeaders }),
        axios.get(`${API}/counselor/conversations`, { headers: authHeaders }),
      ]);
      setBookings(bookRes.data.bookings || []);
      setConversations(convRes.data.conversations || []);
    } catch (e) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
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
        <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">
          Counselor Dashboard
        </h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Manage bookings and support your patients.</p>
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
            <p className="text-2xl font-['Manrope'] font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Active Conversations */}
      {conversations.length > 0 && (
        <div>
          <h2 className="font-['Manrope'] font-bold text-[#F0F4F2] text-lg mb-4">Active Conversations</h2>
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
          <h2 className="font-['Manrope'] font-bold text-[#F0F4F2] text-lg">Bookings</h2>
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
