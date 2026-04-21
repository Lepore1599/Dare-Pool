import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface Section {
  heading: string;
  body: string;
}

interface LegalPageProps {
  title: string;
  subtitle?: string;
  sections: Section[];
  intro?: string;
}

export function LegalPage({ title, subtitle, intro, sections }: LegalPageProps) {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-5 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground mb-1">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {intro && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 bg-card border border-card-border rounded-xl px-4 py-3">
          {intro}
        </p>
      )}

      <div className="space-y-5">
        {sections.map((s, i) => (
          <div key={i} className="bg-card border border-card-border rounded-xl px-4 py-4">
            <h2 className="font-bold text-foreground text-sm mb-2">{s.heading}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.body}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8 pb-4">DarePool · All rights reserved</p>
    </div>
  );
}
