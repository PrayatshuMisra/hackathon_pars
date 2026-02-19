import { motion, AnimatePresence } from "framer-motion";
import { Activity, Clock } from "lucide-react";
import { Patient } from "@/hooks/usePatients";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  patients: Patient[];
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

export default function PatientQueue({ patients, selectedId, onSelect, loading }: Props) {
  const { t } = useTranslation();

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
              className={`cursor-pointer rounded-lg border-l-4 p-3 transition-colors ${
                selectedId === p.id 
                  ? "bg-primary/5 ring-1 ring-primary/20" 
                  : "bg-card hover:bg-accent"
              } ${
                p.risk_label === "HIGH" ? "border-l-risk-high border-t-border border-r-border border-b-border" :
                p.risk_label === "MEDIUM" ? "border-l-risk-medium border-t-border border-r-border border-b-border" :
                p.risk_label === "LOW" ? "border-l-risk-low border-t-border border-r-border border-b-border" :
                "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                      {getDisplayId(p.id)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.age}y • {p.gender} • {p.arrival_mode}
                  </p>
                </div>
                <div className={`rounded-full border px-2 py-0.5 text-xs font-bold ${riskColor(p.risk_label)} ${
                  p.risk_label === "HIGH" ? "animate-pulse" : ""
                }`}>
                  {p.risk_label || t('queue.pending')}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {p.heart_rate && <span>HR {p.heart_rate}</span>}
                {p.systolic_bp && <span>BP {p.systolic_bp}/{p.diastolic_bp}</span>}
                {p.o2_saturation && <span>O₂ {p.o2_saturation}%</span>}
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
    </div>
  );
}