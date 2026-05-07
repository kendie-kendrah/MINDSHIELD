import { useState, useEffect } from "react";
import { BookOpen, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ["all", "CBT", "COPING", "CRISIS", "PSYCHOEDUCATION"];
const CATEGORY_LABELS = {
  all: "All",
  CBT: "CBT Techniques",
  COPING: "Coping Tools",
  CRISIS: "Crisis Resources",
  PSYCHOEDUCATION: "Psychoeducation",
};
const CATEGORY_COLORS = {
  CBT: "#6B8E7B",
  COPING: "#4ADE80",
  CRISIS: "#E17055",
  PSYCHOEDUCATION: "#FCD34D",
};

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchResources(); }, [category]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/resources?category=${category}`);
      setResources(res.data.resources || []);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const filtered = resources.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="resources-page">
      <div>
        <h1 className="font-['Manrope'] text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F4F2]">Resources</h1>
        <p className="text-sm text-[#A3B8AF] mt-1">Evidence-based tools and guides for your mental wellbeing.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3B8AF]" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="resource-search"
            className="pl-10 h-10 rounded-xl bg-[#14221D] border-[#2A4036] text-[#F0F4F2] placeholder:text-[#A3B8AF]/40 focus:border-[#6B8E7B] focus:ring-[#6B8E7B]"
          />
        </div>
      </div>

      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="bg-[#14221D] border border-[#2A4036] rounded-2xl p-1 h-auto flex-wrap" data-testid="resource-category-tabs">
          {CATEGORIES.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              data-testid={`resource-tab-${c.toLowerCase()}`}
              className="rounded-xl text-xs data-[state=active]:bg-[#6B8E7B]/20 data-[state=active]:text-[#6B8E7B] text-[#A3B8AF] px-3 py-2"
            >
              {CATEGORY_LABELS[c]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        {loading && <div className="col-span-2 text-center py-12 text-[#A3B8AF]">Loading resources...</div>}
        {!loading && filtered.length === 0 && (
          <div className="col-span-2 text-center py-12 animate-fade-up" data-testid="resources-empty">
            <BookOpen className="w-10 h-10 text-[#2A4036] mx-auto mb-3" />
            <p className="text-sm text-[#A3B8AF]">No resources found.</p>
          </div>
        )}
        {filtered.map((resource) => {
          const isExpanded = expanded === resource.id;
          const color = CATEGORY_COLORS[resource.category] || "#6B8E7B";
          return (
            <div
              key={resource.id}
              className={`rounded-2xl bg-[#14221D] border border-[#2A4036] overflow-hidden card-lift animate-fade-up ${
                isExpanded ? "md:col-span-2" : ""
              }`}
              data-testid={`resource-${resource.id}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <BookOpen className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-['Manrope'] font-bold text-[#F0F4F2] text-sm">{resource.title}</h3>
                      <span
                        className="inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-medium uppercase tracking-wider"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {resource.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : resource.id)}
                    data-testid={`expand-resource-${resource.id}`}
                    className="text-[#A3B8AF] hover:text-[#F0F4F2] transition-colors flex-shrink-0 mt-1"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {!isExpanded && (
                  <p className="text-xs text-[#A3B8AF] mt-3 line-clamp-2 leading-relaxed">
                    {resource.content.substring(0, 120)}...
                  </p>
                )}

                {isExpanded && (
                  <div className="mt-4 text-sm text-[#A3B8AF] leading-relaxed whitespace-pre-line" data-testid={`resource-content-${resource.id}`}>
                    {resource.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
