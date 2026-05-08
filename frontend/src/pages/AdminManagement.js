import { useState, useEffect } from "react";
import { Users, Stethoscope, Mail, Trash2, Copy, Check, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SPECIALTIES = [
  "Anxiety & Stress Management", "Depression & Mood Disorders", "Relationships & Family",
  "Trauma & PTSD", "Grief & Loss", "Substance Abuse", "General Counseling",
];

export default function AdminManagement() {
  const { user } = useStore();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteSpecialty, setInviteSpecialty] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [copied, setCopied] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [uRes, cRes, iRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers: authHeaders }),
        axios.get(`${API}/admin/counselors`, { headers: authHeaders }),
        axios.get(`${API}/admin/invites`, { headers: authHeaders }),
      ]);
      setUsers(uRes.data.users || []);
      setCounselors(cRes.data.counselors || []);
      setInvites(iRes.data.invites || []);
    } catch (e) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  const removeUser = async (userId) => {
    if (!window.confirm("Remove this user and all their data? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: authHeaders });
      toast.success("User removed");
      fetchAll();
    } catch (e) { toast.error("Failed to remove user"); }
  };

  const removeCounselor = async (counselorId) => {
    if (!window.confirm("Remove this counselor and their bookings?")) return;
    try {
      await axios.delete(`${API}/admin/counselors/${counselorId}`, { headers: authHeaders });
      toast.success("Counselor removed");
      fetchAll();
    } catch (e) { toast.error("Failed to remove counselor"); }
  };

  const createInvite = async () => {
    try {
      const res = await axios.post(`${API}/admin/invites`, { specialty_hint: inviteSpecialty || null, note: inviteNote || null }, { headers: authHeaders });
      toast.success(`Invite created: ${res.data.code}`);
      setInviteDialogOpen(false);
      setInviteSpecialty("");
      setInviteNote("");
      fetchAll();
    } catch (e) { toast.error("Failed to create invite"); }
  };

  const revokeInvite = async (inviteId) => {
    try {
      await axios.delete(`${API}/admin/invites/${inviteId}`, { headers: authHeaders });
      toast.success("Invite revoked");
      fetchAll();
    } catch (e) { toast.error("Failed to revoke invite"); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success("Code copied");
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredUsers = users.filter(u => u.pseudonym.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCounselors = counselors.filter(c => c.pseudonym.toLowerCase().includes(searchQuery.toLowerCase()) || (c.specialty || "").toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="admin-management">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-['Fraunces'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Management</h1>
          <p className="text-sm text-[#A3B8AF] mt-1">Manage users, counselors, and invitations.</p>
        </div>
        {tab === "invites" && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-invite-btn" className="rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-medium">
                <Plus className="w-4 h-4 mr-2" /> Generate Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#14221D] border-[#2A4036] rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle className="font-['Fraunces'] text-[#F0F4F2]">Generate Counselor Invite</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Suggested Specialty (optional)</label>
                  <Select value={inviteSpecialty} onValueChange={setInviteSpecialty}>
                    <SelectTrigger className="rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2]">
                      <SelectValue placeholder="Any specialty" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#14221D] border-[#2A4036]">
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s} value={s} className="text-[#F0F4F2] focus:bg-[#1C2F28] focus:text-[#F0F4F2]">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#A3B8AF] uppercase tracking-[0.2em]">Note (optional)</label>
                  <Input
                    placeholder="e.g. For Dr. Abiola at UITH"
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    data-testid="invite-note-input"
                    className="h-10 rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 text-sm focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
                  />
                </div>
                <Button onClick={createInvite} data-testid="confirm-invite-btn" className="w-full rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-medium">
                  Generate One-Time Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder={`Search ${tab}...`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        data-testid="management-search"
        className="h-10 rounded-xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 text-sm max-w-sm focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#14221D] border border-[#2A4036] rounded-2xl p-1 h-auto">
          <TabsTrigger value="users" data-testid="tab-users" className="rounded-xl text-sm data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-4 py-2">
            <Users className="w-4 h-4 mr-2" /> Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="counselors" data-testid="tab-counselors" className="rounded-xl text-sm data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-4 py-2">
            <Stethoscope className="w-4 h-4 mr-2" /> Counselors ({counselors.length})
          </TabsTrigger>
          <TabsTrigger value="invites" data-testid="tab-invites" className="rounded-xl text-sm data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-4 py-2">
            <Mail className="w-4 h-4 mr-2" /> Invites ({invites.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && <div className="text-center py-12 text-[#A3B8AF]">Loading...</div>}

      {/* Users Tab */}
      {!loading && tab === "users" && (
        <div className="space-y-2">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-[#A3B8AF]">No users found.</div>
          ) : filteredUsers.map((u) => (
            <div key={u.id} className="rounded-xl bg-[#14221D] border border-[#2A4036] p-4 flex items-center justify-between" data-testid={`user-row-${u.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#6B8E7B]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#6B8E7B]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0F4F2]">{u.pseudonym}</p>
                  <p className="text-[10px] text-[#A3B8AF] font-mono">{u.id.slice(0, 16)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-[#A3B8AF]">{u.message_count} msgs | {u.mood_count} moods</p>
                  <p className="text-[10px] text-[#A3B8AF]/60">Joined {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <Button onClick={() => removeUser(u.id)} data-testid={`remove-user-${u.id}`} className="h-8 w-8 p-0 rounded-lg bg-[#E17055]/10 hover:bg-[#E17055]/20 text-[#E17055]">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counselors Tab */}
      {!loading && tab === "counselors" && (
        <div className="space-y-2">
          {filteredCounselors.length === 0 ? (
            <div className="text-center py-12 text-[#A3B8AF]">No counselors found.</div>
          ) : filteredCounselors.map((c) => (
            <div key={c.id} className="rounded-xl bg-[#14221D] border border-[#2A4036] p-4 flex items-center justify-between" data-testid={`counselor-row-${c.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#83A894]/10 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-[#83A894]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0F4F2]">{c.pseudonym}</p>
                  <p className="text-xs text-[#6B8E7B]">{c.specialty || "General"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-[#A3B8AF]">{c.booking_count} bookings | {c.conversation_count} chats</p>
                  <p className="text-[10px] text-[#A3B8AF]/60">{c.created_at ? `Since ${new Date(c.created_at).toLocaleDateString()}` : "Pre-seeded"}</p>
                </div>
                <Button onClick={() => removeCounselor(c.id)} data-testid={`remove-counselor-${c.id}`} className="h-8 w-8 p-0 rounded-lg bg-[#E17055]/10 hover:bg-[#E17055]/20 text-[#E17055]">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invites Tab */}
      {!loading && tab === "invites" && (
        <div className="space-y-2">
          {invites.length === 0 ? (
            <div className="text-center py-12 text-[#A3B8AF]" data-testid="no-invites">
              <Mail className="w-8 h-8 text-[#2A4036] mx-auto mb-2" />
              <p>No invite codes generated yet. Click "Generate Invite" to create one.</p>
            </div>
          ) : invites.map((inv) => (
            <div key={inv.id} className="rounded-xl bg-[#14221D] border border-[#2A4036] p-4 flex items-center justify-between" data-testid={`invite-row-${inv.id}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${inv.used ? "bg-[#A3B8AF]/10" : "bg-[#4ADE80]/10"}`}>
                  <Mail className={`w-4 h-4 ${inv.used ? "text-[#A3B8AF]" : "text-[#4ADE80]"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <code className={`text-sm font-mono font-bold ${inv.used ? "text-[#A3B8AF]/50 line-through" : "text-[#4ADE80]"}`}>{inv.code}</code>
                    {!inv.used && (
                      <button onClick={() => copyCode(inv.code)} className="text-[#A3B8AF] hover:text-[#6B8E7B] transition-colors">
                        {copied === inv.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#A3B8AF]">
                    {inv.used ? `Used by ${inv.used_by?.slice(0,8)}... on ${new Date(inv.used_at).toLocaleDateString()}` : "Unused"}
                    {inv.specialty_hint && ` | For: ${inv.specialty_hint}`}
                    {inv.note && ` | Note: ${inv.note}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${inv.used ? "bg-[#A3B8AF]/10 text-[#A3B8AF]" : "bg-[#4ADE80]/10 text-[#4ADE80]"}`}>
                  {inv.used ? "Used" : "Active"}
                </span>
                {!inv.used && (
                  <Button onClick={() => revokeInvite(inv.id)} data-testid={`revoke-invite-${inv.id}`} className="h-8 w-8 p-0 rounded-lg bg-[#E17055]/10 hover:bg-[#E17055]/20 text-[#E17055]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
