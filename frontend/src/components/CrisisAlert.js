import { AlertTriangle, Phone, X } from "lucide-react";

const HELPLINES = [
  { name: "NEMA Crisis Line", number: "0800 033 3567" },
  { name: "Suicide Prevention", number: "0800 800 2000" },
  { name: "LASUTH Mental Health", number: "01-342-9000" },
];

export default function CrisisAlert({ onDismiss }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] crisis-pulse animate-fade-up"
      data-testid="crisis-alert-banner"
    >
      <div className="mx-4 mt-4 lg:mx-auto lg:max-w-2xl rounded-2xl bg-[#E17055]/10 border border-[#E17055]/30 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E17055]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-[#E17055]" />
            </div>
            <div>
              <h4 className="font-['Fraunces'] font-bold text-[#F0F4F2] text-sm">You are not alone. Help is available.</h4>
              <p className="text-xs text-[#A3B8AF] mt-1 leading-relaxed">
                If you are in crisis, please reach out to a trained professional:
              </p>
              <div className="mt-3 space-y-2">
                {HELPLINES.map((h) => (
                  <a
                    key={h.number}
                    href={`tel:${h.number.replace(/\s/g, '')}`}
                    data-testid={`crisis-helpline-${h.number.replace(/\s/g, '-')}`}
                    className="flex items-center gap-2 text-sm text-[#E17055] hover:text-[#E17055]/80 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span className="font-medium">{h.name}:</span>
                    <span className="font-['Fraunces'] font-bold">{h.number}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onDismiss}
            data-testid="crisis-alert-dismiss"
            className="text-[#A3B8AF] hover:text-[#F0F4F2] transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
