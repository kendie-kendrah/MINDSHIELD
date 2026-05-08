import { useState, useEffect } from "react";
import { Flag, Trash2, AlertTriangle, MessageSquare, Clock, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminModeration() {
  const { user } = useStore();
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [crisisAlerts, setCrisisAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, crisisRes] = await Promise.all([
        axios.get(`${API}/admin/posts`, { headers: authHeaders }),
        axios.get(`${API}/admin/crisis-alerts`, { headers: authHeaders }),
      ]);
      setPosts(postsRes.data.posts || []);
      setCrisisAlerts(crisisRes.data.alerts || []);
    } catch (e) { toast.error("Failed to load moderation data"); }
    finally { setLoading(false); }
  };

  const toggleFlag = async (postId) => {
    try {
      const res = await axios.put(`${API}/admin/posts/${postId}/flag`, {}, { headers: authHeaders });
      toast.success(res.data.is_flagged ? "Post flagged" : "Post unflagged");
      fetchData();
    } catch (e) { toast.error("Failed to update post"); }
  };

  const removePost = async (postId) => {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await axios.delete(`${API}/admin/posts/${postId}`, { headers: authHeaders });
      toast.success("Post deleted");
      fetchData();
    } catch (e) { toast.error("Failed to delete post"); }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-6" data-testid="admin-moderation">
      <div>
        <h1 className="font-['Fraunces'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Moderation</h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Review content and monitor crisis events.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-[#14221D] border border-[#2A4036] rounded-2xl p-1 h-auto">
          <TabsTrigger value="posts" data-testid="mod-tab-posts" className="rounded-xl text-sm data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-4 py-2">
            <MessageSquare className="w-4 h-4 mr-2" /> Forum Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="crisis" data-testid="mod-tab-crisis" className="rounded-xl text-sm data-[state=active]:bg-[#E17055]/20 data-[state=active]:text-[#E17055] text-[#A3B8AF] px-4 py-2">
            <AlertTriangle className="w-4 h-4 mr-2" /> Crisis Log ({crisisAlerts.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && <div className="text-center py-12 text-[#A3B8AF]">Loading...</div>}

      {/* Forum Posts */}
      {!loading && tab === "posts" && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-[#A3B8AF]">No forum posts yet.</div>
          ) : posts.map((post) => (
            <div key={post.id} className={`rounded-xl border p-5 ${post.is_flagged ? "bg-[#E17055]/5 border-[#E17055]/20" : "bg-[#14221D] border-[#2A4036]"}`} data-testid={`mod-post-${post.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-[#6B8E7B]/10 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-[#6B8E7B]" />
                    </div>
                    <span className="text-sm font-medium text-[#F0F4F2]">{post.pseudonym}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#6B8E7B]/10 text-[10px] text-[#6B8E7B] uppercase tracking-wider">{post.topic}</span>
                    {post.is_flagged && (
                      <span className="px-2 py-0.5 rounded-full bg-[#E17055]/10 text-[10px] text-[#E17055] font-medium uppercase tracking-wider">Flagged</span>
                    )}
                    <span className="text-[10px] text-[#A3B8AF] flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-sm text-[#F0F4F2] leading-relaxed">{post.body}</p>
                  {post.is_flagged && post.flag_reason && (
                    <div className="mt-3 rounded-lg bg-[#E17055]/10 border border-[#E17055]/20 px-3 py-2" data-testid={`flag-reason-${post.id}`}>
                      <p className="text-[10px] text-[#E17055] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> AI Flag Reason
                      </p>
                      <p className="text-xs text-[#F0F4F2]/90 leading-relaxed">{post.flag_reason}</p>
                    </div>
                  )}
                  {post.replies?.length > 0 && (
                    <p className="text-xs text-[#A3B8AF] mt-2">{post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button onClick={() => toggleFlag(post.id)} data-testid={`flag-post-${post.id}`}
                    className={`h-8 w-8 p-0 rounded-lg ${post.is_flagged ? "bg-[#FCD34D]/10 hover:bg-[#FCD34D]/20 text-[#FCD34D]" : "bg-white/5 hover:bg-white/10 text-[#A3B8AF]"}`}>
                    <Flag className="w-3.5 h-3.5" />
                  </Button>
                  <Button onClick={() => removePost(post.id)} data-testid={`delete-post-${post.id}`}
                    className="h-8 w-8 p-0 rounded-lg bg-[#E17055]/10 hover:bg-[#E17055]/20 text-[#E17055]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crisis Log */}
      {!loading && tab === "crisis" && (
        <div className="space-y-2">
          {crisisAlerts.length === 0 ? (
            <div className="text-center py-12 text-[#A3B8AF]" data-testid="no-crisis-alerts">
              <ShieldCheck className="w-8 h-8 text-[#4ADE80] mx-auto mb-2" />
              <p>No crisis events recorded. That's a good sign.</p>
            </div>
          ) : crisisAlerts.map((alert) => (
            <div key={alert.id} className="rounded-xl bg-[#14221D] border border-[#E17055]/20 p-4 flex items-center justify-between" data-testid={`crisis-log-${alert.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E17055]/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-[#E17055]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0F4F2]">{alert.user_pseudonym}</p>
                  <p className="text-[10px] text-[#A3B8AF]">Session: {alert.session_id?.slice(0, 12)}... | Message: {alert.message_id?.slice(0, 8)}...</p>
                </div>
              </div>
              <p className="text-xs text-[#A3B8AF]">{new Date(alert.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
