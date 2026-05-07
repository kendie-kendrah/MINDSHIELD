import { ShieldCheck } from "lucide-react";

export default function AnonymousBadge({ compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass badge-shimmer" data-testid="anonymous-badge-compact">
        <ShieldCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass badge-shimmer" data-testid="anonymous-badge">
      <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
      <span className="text-xs font-medium text-[#4ADE80] tracking-wide uppercase">Protected</span>
    </div>
  );
}
