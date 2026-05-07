import { useState, useEffect } from "react";
import { Users, Plus, MessageSquare, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import useStore from "@/store/useStore";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOPICS = ["all", "Anxiety", "Depression", "Relationships", "General"];

export default function Forum() {
  const { user, forumPosts, setForumPosts } = useStore();
  const [topic, setTopic] = useState("all");
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({ topic: "General", body: "" });
  const [replyText, setReplyText] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  useEffect(() => { fetchPosts(); }, [topic]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/forum/posts?topic=${topic}`);
      setForumPosts(res.data.posts || []);
    } catch (e) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.body.trim()) return;
    try {
      await axios.post(`${API}/forum/posts`, newPost, { headers: authHeaders });
      toast.success("Post shared anonymously");
      setNewPost({ topic: "General", body: "" });
      setDialogOpen(false);
      fetchPosts();
    } catch (e) {
      toast.error("Failed to create post");
    }
  };

  const handleReply = async (postId) => {
    const text = replyText[postId];
    if (!text?.trim()) return;
    try {
      await axios.post(`${API}/forum/posts/${postId}/reply`, { body: text }, { headers: authHeaders });
      setReplyText((p) => ({ ...p, [postId]: "" }));
      toast.success("Reply posted");
      fetchPosts();
    } catch (e) {
      toast.error("Failed to reply");
    }
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
    <div className="space-y-6" data-testid="forum-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Community Forum</h1>
          <p className="text-sm text-[#A3B8AF] mt-1">Anonymous peer support. You are not alone.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-post-btn" className="rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-medium">
              <Plus className="w-4 h-4 mr-2" /> New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#14221D] border-[#2A4036] rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Manrope'] text-[#F0F4F2]">Share with the Community</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Select value={newPost.topic} onValueChange={(v) => setNewPost((p) => ({ ...p, topic: v }))}>
                <SelectTrigger data-testid="post-topic-select" className="rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14221D] border-[#2A4036]">
                  {TOPICS.filter((t) => t !== "all").map((t) => (
                    <SelectItem key={t} value={t} className="text-[#F0F4F2] focus:bg-[#1C2F28] focus:text-[#F0F4F2]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="What's on your mind? Share anonymously..."
                value={newPost.body}
                onChange={(e) => setNewPost((p) => ({ ...p, body: e.target.value }))}
                data-testid="post-body-input"
                className="min-h-[120px] rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 resize-none focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
              />
              <Button
                onClick={handleCreatePost}
                disabled={!newPost.body.trim()}
                data-testid="submit-post-btn"
                className="w-full rounded-2xl bg-[#6B8E7B] hover:bg-[#83A894] text-[#0C1411] font-medium"
              >
                Post Anonymously
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={topic} onValueChange={setTopic}>
        <TabsList className="bg-[#14221D] border border-[#2A4036] rounded-2xl p-1 h-auto flex-wrap" data-testid="forum-topic-tabs">
          {TOPICS.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              data-testid={`tab-${t.toLowerCase()}`}
              className="rounded-xl text-sm data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-4 py-2"
            >
              {t === "all" ? "All Topics" : t}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-4 stagger-children">
        {loading && (
          <div className="text-center py-12 text-[#A3B8AF]">Loading posts...</div>
        )}
        {!loading && forumPosts.length === 0 && (
          <div className="text-center py-12 animate-fade-up" data-testid="forum-empty">
            <Users className="w-10 h-10 text-[#2A4036] mx-auto mb-3" />
            <p className="text-sm text-[#A3B8AF]">No posts yet. Be the first to share.</p>
          </div>
        )}
        {forumPosts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl bg-[#14221D] border border-[#2A4036] p-6 card-lift animate-fade-up"
            data-testid={`forum-post-${post.id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#6B8E7B]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#6B8E7B]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0F4F2]">{post.pseudonym}</p>
                  <div className="flex items-center gap-2 text-[10px] text-[#A3B8AF]">
                    <Clock className="w-3 h-3" /> {timeAgo(post.created_at)}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#6B8E7B]/10 text-[10px] text-[#6B8E7B] font-medium uppercase tracking-wider">
                {post.topic}
              </span>
            </div>

            <p className="text-sm text-[#F0F4F2] leading-relaxed mb-4">{post.body}</p>

            {/* Replies */}
            {post.replies?.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-xs text-[#6B8E7B] hover:text-[#83A894] transition-colors mb-2"
                  data-testid={`toggle-replies-${post.id}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
                </button>
                {expandedPost === post.id && (
                  <div className="space-y-2 ml-4 pl-4 border-l border-[#2A4036]">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-[#A3B8AF]">{reply.pseudonym}</span>
                          <span className="text-[10px] text-[#A3B8AF]/50">{timeAgo(reply.created_at)}</span>
                        </div>
                        <p className="text-xs text-[#F0F4F2] leading-relaxed">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Reply input */}
            <div className="flex gap-2">
              <Input
                placeholder="Write a reply..."
                value={replyText[post.id] || ""}
                onChange={(e) => setReplyText((p) => ({ ...p, [post.id]: e.target.value }))}
                data-testid={`reply-input-${post.id}`}
                className="flex-1 h-9 rounded-xl bg-[#0C1411] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 text-xs focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
                onKeyDown={(e) => { if (e.key === "Enter") handleReply(post.id); }}
              />
              <Button
                onClick={() => handleReply(post.id)}
                disabled={!replyText[post.id]?.trim()}
                data-testid={`reply-btn-${post.id}`}
                className="h-9 rounded-xl bg-[#6B8E7B]/20 hover:bg-[#6B8E7B]/30 text-[#6B8E7B] text-xs"
              >
                Reply
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
