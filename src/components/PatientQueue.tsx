import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock, History, RefreshCw } from "lucide-react";
import { Patient } from "@/hooks/usePatients";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  patients: Patient[];          // Active queue (filtered by retention time)
  allPatients?: Patient[];      // All-time patients for history tab
  selectedId: string | null;
  onSelect: (p: Patient) => void;
  loading?: boolean;
}

function riskColor(label: string | null) {
  switch (label) {
    case "HIGH": return "border-risk-high bg-risk-high/10 text-risk-high";
    case "MEDIUM": return "border-risk-medium bg-risk-medium/10 text-risk-medium";
    case "LOW": return "border-risk-low bg-risk-low/10 text-risk-low";
    default: return "border-border bg-secondary text-muted-foreground";
  }
}

function riskBg(label: string | null) {
  switch (label) {
    case "HIGH": return "border-l-risk-high border-t-border border-r-border border-b-border";
    case "MEDIUM": return "border-l-risk-medium border-t-border border-r-border border-b-border";
    case "LOW": return "border-l-risk-low border-t-border border-r-border border-b-border";
    default: return "border-border";
  }
}

function getDisplayId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    hash = Math.imul(1664525, hash) + 1013904223 | 0;
    const index = Math.abs(hash) % chars.length;
    result += chars[index];
  }
  return `sdv-id-${result}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PatientQueue({ patients, allPatients = [], selectedId, onSelect, loading }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");
  const [searchName, setSearchName] = useState("");

  // Build returning patient index: name → sorted visits
  const returningPatients = useMemo(() => {
    const map: Record<string, Patient[]> = {};
    allPatients.forEach(p => {
      const key = p.name.trim().toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    // Keep only names with > 1 visit OR all if we want full history
    return Object.entries(map)
      .map(([, visits]) => visits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
      .sort((a, b) => new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime());
  }, [allPatients]);

  const filteredHistory = useMemo(() => {
    if (!searchName.trim()) return returningPatients;
    const q = searchName.toLowerCase();
    return returningPatients.filter(visits => visits[0].name.toLowerCase().includes(q));
  }, [returningPatients, searchName]);

  if (loading) {
    return (
      <div className="flex h-full flex-col p-2 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-card/50">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-3 mt-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab Switcher */}
      <div className="flex border-b border-border shrink-0 px-2 pt-1">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === "queue"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <Activity className="h-3 w-3" />
          Queue ({patients.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === "history"
              ? "border-violet-400 text-violet-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          <History className="h-3 w-3" />
          Past Visits ({allPatients.length})
        </button>
      </div>

      {/* Queue Tab */}
      {activeTab === "queue" && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <AnimatePresence mode="popLayout">
            {patients.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onClick={() => onSelect(p)}
                className={`cursor-pointer rounded-lg border-l-4 p-3 transition-colors ${selectedId === p.id
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : "bg-card hover:bg-accent"
                  } ${riskBg(p.risk_label)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{p.name}</p>
                      {allPatients.filter(h => h.name.trim().toLowerCase() === p.name.trim().toLowerCase()).length > 1 && (
                        <span className="text-[9px] font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded px-1 py-0.5 flex items-center gap-0.5">
                          <RefreshCw className="h-2.5 w-2.5" /> RETURNING
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                        {getDisplayId(p.id)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.age}y • {p.gender} • {p.arrival_mode}
                    </p>
                  </div>
                  <div className={`rounded-full border px-2 py-0.5 text-xs font-bold ${riskColor(p.risk_label)} ${p.risk_label === "HIGH" ? "animate-pulse" : ""
                    }`}>
                    {p.risk_label || t('queue.pending')}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {p.heart_rate && <span>HR {p.heart_rate}</span>}
                  {p.systolic_bp && <span>BP {p.systolic_bp}/{p.diastolic_bp}</span>}
                  {p.o2_saturation && <span>O₂ {p.o2_saturation}%</span>}
                  {p.pain_score != null && <span>Pain {p.pain_score}/10</span>}
                  <span className="ml-auto flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {patients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="mb-2 h-8 w-8" />
              <p className="text-sm">{t('queue.empty')}</p>
              <p className="text-xs">{t('queue.submit_or_sim')}</p>
            </div>
          )}
        </div>
      )}

      {/* Past Visits Tab */}
      {activeTab === "history" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search bar */}
          <div className="px-2 pt-2 pb-1 shrink-0">
            <input
              type="text"
              placeholder="Search patient name..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="mb-2 h-8 w-8" />
                <p className="text-sm">No patient history yet</p>
                <p className="text-xs">Visits appear here as patients are triaged</p>
              </div>
            ) : (
              filteredHistory.map((visits) => {
                const latest = visits[0];
                const isReturning = visits.length > 1;
                return (
                  <div key={latest.name + latest.id} className="rounded-lg border border-border bg-card/40 overflow-hidden">
                    {/* Patient header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/60">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{latest.name}</p>
                        {isReturning && (
                          <span className="text-[9px] font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded px-1.5 py-0.5 flex items-center gap-1">
                            <RefreshCw className="h-2.5 w-2.5" /> {visits.length} VISITS
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {latest.age}y • {latest.gender}
                      </span>
                    </div>

                    {/* Visit timeline */}
                    <div className="divide-y divide-border/30">
                      {visits.map((v, vi) => (
                        <div
                          key={v.id}
                          className={`flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors ${vi === 0 ? "bg-card/20" : ""}`}
                          onClick={() => onSelect(v)}
                        >
                          <div className="flex flex-col items-center mt-1 shrink-0">
                            <div className={`h-2 w-2 rounded-full ${v.risk_label === "HIGH" ? "bg-red-500" :
                                v.risk_label === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500"
                              } ${vi === 0 ? "ring-2 ring-offset-1 ring-offset-background ring-primary/30" : ""}`} />
                            {vi < visits.length - 1 && <div className="w-px flex-1 bg-border/40 mt-1" style={{ minHeight: "12px" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${v.risk_label === "HIGH" ? "bg-red-500/10 text-red-400" :
                                  v.risk_label === "MEDIUM" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                                }`}>{v.risk_label || "—"}</span>
                              <span className="text-[9px] text-muted-foreground font-mono shrink-0">{timeAgo(v.created_at)}</span>
                            </div>
                            {v.chief_complaint && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.chief_complaint}</p>
                            )}
                            {v.department && (
                              <p className="text-[9px] text-violet-400/80 font-mono">{v.department.replace(/_/g, " ")}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}