import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, User, Check, X as XIcon, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_STYLES = {
  PENDING: { bg: "bg-[#FCD34D]/10", text: "text-[#FCD34D]" },
  CONFIRMED: { bg: "bg-[#4ADE80]/10", text: "text-[#4ADE80]" },
  CANCELLED: { bg: "bg-[#E17055]/10", text: "text-[#E17055]" },
};

export default function Appointments() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [counselors, setCounselors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [counselorRes, apptRes, convRes] = await Promise.all([
        axios.get(`${API}/appointments/counselors`),
        axios.get(`${API}/appointments`, { headers: authHeaders }),
        axios.get(`${API}/conversations`, { headers: authHeaders }).catch(() => ({ data: { conversations: [] } })),
      ]);
      setCounselors(counselorRes.data.counselors || []);
      setAppointments(apptRes.data.appointments || []);
      setConversations(convRes.data.conversations || []);
    } catch (e) {
      toast.error("Failed to load appointments data");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedCounselor || !selectedSlot) return;
    try {
      const scheduledDate = new Date();
      const [day, time] = selectedSlot.split(" ");
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const targetDay = days.indexOf(day);
      const currentDay = scheduledDate.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      scheduledDate.setDate(scheduledDate.getDate() + daysToAdd);
      const [hours, mins] = time.split(":");
      scheduledDate.setHours(parseInt(hours), parseInt(mins), 0, 0);

      await axios.post(
        `${API}/appointments`,
        {
          counselor_id: selectedCounselor.id,
          scheduled_at: scheduledDate.toISOString(),
          notes: notes || null,
        },
        { headers: authHeaders }
      );
      toast.success("Appointment booked successfully");
      setDialogOpen(false);
      setSelectedCounselor(null);
      setSelectedSlot("");
      setNotes("");
      fetchData();
    } catch (e) {
      toast.error("Failed to book appointment");
    }
  };

  return (
    <div className="space-y-8" data-testid="appointments-page">
      <div>
        <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Appointments</h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Book anonymous sessions with professional counselors.</p>
      </div>

      {/* Counselors */}
      <div>
        <h2 className="font-['Manrope'] font-bold text-[#F0F4F2] text-lg mb-4">Available Counselors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {counselors.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-6 card-lift animate-fade-up"
              data-testid={`counselor-${c.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#6B8E7B]/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-[#6B8E7B]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-['Manrope'] font-bold text-[#F0F4F2]">{c.pseudonym}</h3>
                  <p className="text-xs text-[#6B8E7B] mt-0.5">{c.specialty}</p>
                  <p className="text-xs text-[#A3B8AF] mt-2 leading-relaxed">{c.bio}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.available_slots?.slice(0, 3).map((slot) => (
                      <span key={slot} className="px-2 py-0.5 rounded-lg bg-white/5 text-[10px] text-[#A3B8AF]">
                        <Clock className="w-2.5 h-2.5 inline mr-1" />{slot}
                      </span>
                    ))}
                    {c.available_slots?.length > 3 && (
                      <span className="text-[10px] text-[#6B8E7B]">+{c.available_slots.length - 3} more</span>
                    )}
                  </div>
                  <Dialog open={dialogOpen && selectedCounselor?.id === c.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (open) setSelectedCounselor(c);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        data-testid={`book-btn-${c.id}`}
                        className="mt-4 rounded-xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-xs"
                        onClick={() => setSelectedCounselor(c)}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" /> Book Session
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#14221D] border-[#2A4036] rounded-3xl max-w-md">
                      <DialogHeader>
                        <DialogTitle className="font-['Manrope'] text-[#F0F4F2]">
                          Book with {selectedCounselor?.pseudonym}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                          <SelectTrigger data-testid="slot-select" className="rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2]">
                            <SelectValue placeholder="Choose a time slot" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#14221D] border-[#2A4036]">
                            {selectedCounselor?.available_slots?.map((slot) => (
                              <SelectItem key={slot} value={slot} className="text-[#F0F4F2] focus:bg-[#1C2F28] focus:text-[#F0F4F2]">{slot}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Textarea
                          placeholder="Any notes for the counselor? (optional)"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          data-testid="appointment-notes"
                          className="min-h-[80px] rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 resize-none text-sm focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
                        />
                        <Button
                          onClick={handleBook}
                          disabled={!selectedSlot}
                          data-testid="confirm-booking-btn"
                          className="w-full rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-medium"
                        >
                          Confirm Booking
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <h2 className="font-['Manrope'] font-bold text-[#F0F4F2] text-lg mb-4">Your Appointments</h2>
        {appointments.length === 0 ? (
          <div className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-8 text-center" data-testid="no-appointments">
            <Calendar className="w-8 h-8 text-[#2A4036] mx-auto mb-2" />
            <p className="text-sm text-[#A3B8AF]">No appointments yet. Book a session with a counselor above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => {
              const style = STATUS_STYLES[appt.status] || STATUS_STYLES.PENDING;
              return (
                <div
                  key={appt.id}
                  className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-5 flex items-center justify-between"
                  data-testid={`appointment-${appt.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#6B8E7B]/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-[#6B8E7B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F0F4F2]">{appt.counselor_pseudonym}</p>
                      <p className="text-xs text-[#A3B8AF]">
                        {new Date(appt.scheduled_at).toLocaleDateString("en", {
                          weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${style.bg} ${style.text}`}>
                      {appt.status}
                    </span>
                    {appt.status === "CONFIRMED" && (() => {
                      const conv = conversations.find(c => c.counselor_id === appt.counselor_id);
                      return conv ? (
                        <Button
                          onClick={() => navigate(`/appointments/chat/${conv.id}`)}
                          data-testid={`chat-counselor-${appt.id}`}
                          className="h-8 rounded-xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat
                        </Button>
                      ) : null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
