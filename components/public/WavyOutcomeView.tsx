"use client";
import React, { useState, useEffect } from "react";
import { WavyBackground } from "@/components/ui/wavy-background";
import { useSessionParams } from "@/lib/page-params";

interface WavyOutcomeViewProps {
  status: string;
  statusKeyword: string;
}

const STATUS_CONFIG: Record<string, { headline: string; sub: string; colors: string[]; glow: string }> = {
  complete: {
    headline: "Survey Complete",
    sub: "Thank you! Your response has been recorded.",
    colors: ["#22d3ee", "#38bdf8", "#818cf8", "#6ee7b7", "#34d399"],
    glow: "#22d3ee",
  },
  terminate: {
    headline: "Survey Terminated",
    sub: "Thank you for your time.",
    colors: ["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"],
    glow: "#e879f9",
  },
  quotafull: {
    headline: "Quota Full",
    sub: "We have reached our quota for this survey.",
    colors: ["#fbbf24", "#f59e0b", "#f97316", "#fb923c", "#fcd34d"],
    glow: "#fbbf24",
  },
  security: {
    headline: "Survey Terminated",
    sub: "This session was flagged for quality control.",
    colors: ["#f87171", "#ef4444", "#dc2626", "#fb923c", "#f97316"],
    glow: "#f87171",
  },
  duplicate: {
    headline: "Duplicate Entry",
    sub: "You have already participated in this survey.",
    colors: ["#a78bfa", "#8b5cf6", "#7c3aed", "#c084fc", "#818cf8"],
    glow: "#a78bfa",
  },
  paused: {
    headline: "Project Paused",
    sub: "This project is currently paused by the administrator.",
    colors: ["#fbbf24", "#f59e0b", "#f97316", "#fb923c", "#fcd34d"],
    glow: "#fbbf24",
  },
};

export function WavyOutcomeView({ status, statusKeyword }: WavyOutcomeViewProps) {
  const params = useSessionParams();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Tier 1: fetch by oi_session (most accurate, UUID-based)
    if (params.session && params.session !== "-") {
      setIsLoading(true);
      fetch(`/api/respondent-stats/${params.session}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) { setStats(data); setIsLoading(false); return; }
          // If session lookup failed, fall through to uid+code lookup
          tryLookupByUidCode();
        })
        .catch(() => tryLookupByUidCode());
      return;
    }
    // Tier 2: fetch by uid + code when session is not in URL
    // (TrustSample/Quantclix redirect back without oi_session)
    tryLookupByUidCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.session, params.uid, params.pid]);

  function tryLookupByUidCode() {
    const uid = params.uid;
    const code = params.pid; // pid is already aliased from ?code= or ?pid=
    if (!uid || uid === "-" || !code || code === "-") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch(`/api/respondent-stats/lookup?uid=${encodeURIComponent(uid)}&code=${encodeURIComponent(code)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStats(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }

  const sanitize = (val: string | null | undefined) => {
    if (!val) return "—";
    const bad = ["n/a", "[uid]", "{uid}", "[rid]", "{rid}", "null", "undefined", "-"];
    return bad.includes(val.toLowerCase().trim()) ? "—" : val;
  };

  const uid = sanitize(stats?.supplierRid || params.uid);
  const pid = sanitize(stats?.projectCode || params.pid);
  const loiRaw = parseInt(params.loi || "0", 10);
  const formatLoi = (s: number) => {
    if (!s || s <= 0) return "—";
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };
  const loiStr = stats?.loi !== undefined ? `${stats.loi} mins` : formatLoi(loiRaw);
  const dateStr = stats?.endTime
    ? new Date(stats.endTime * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const cfg = STATUS_CONFIG[statusKeyword] ?? STATUS_CONFIG.terminate;

  // Allow custom title/desc from query params (used by paused page)
  const customTitle = params.title || undefined;
  const customDesc = params.desc || undefined;

  const cards = [
    { label: "Project ID", value: pid },
    { label: "User ID", value: uid },
    { label: "IP Address", value: sanitize(stats?.ip || params.ip) },
    { label: "Status", value: status },
    { label: "LOI", value: loiStr },
    { label: "Date", value: dateStr },
  ];

  return (
    <WavyBackground
      containerClassName="min-h-screen w-full"
      backgroundFill="#000000"
      colors={cfg.colors}
      blur={8}
      speed="slow"
      waveOpacity={0.6}
    >
      <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40 font-medium">OpinionInsights</p>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-2xl">
            {customTitle || cfg.headline}
          </h1>
          <p className="text-white/60 text-base mt-1">
            {customDesc || cfg.sub}
          </p>
        </div>
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl">
          {cards.map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "rgba(0,0,0,0.5)",
                border: `1px solid ${cfg.glow}44`,
                boxShadow: `0 0 18px ${cfg.glow}22`,
              }}
              className="rounded-2xl backdrop-blur-md px-5 py-4 flex flex-col items-center gap-0.5 min-w-[130px]"
            >
              <span style={{ color: `${cfg.glow}99` }} className="text-[0.6rem] uppercase tracking-[0.2em] font-semibold">{label}</span>
              <span className="text-base font-black text-white tracking-wide break-all">{isLoading ? "…" : value}</span>
            </div>
          ))}
        </div>
        <a
          href="https://opinioninsights.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest text-white transition-all duration-300 hover:scale-105"
          style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${cfg.glow}66`, boxShadow: `0 0 24px ${cfg.glow}33` }}
        >
          Visit Site →
        </a>
      </div>
    </WavyBackground>
  );
}
