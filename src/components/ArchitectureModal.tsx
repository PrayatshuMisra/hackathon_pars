import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Database, Brain, Globe, FileText, Mic, ShieldCheck, BarChart2 } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
}

const LAYERS = [
    {
        label: "Patient Input Layer",
        icon: FileText,
        color: "#3b82f6",
        items: ["Manual Form (Vitals + History)", "Voice Input (Web Speech / Whisper)", "EHR / EMR PDF Upload (Gemini OCR)"],
    },
    {
        label: "AI Risk Classification Engine",
        icon: Brain,
        color: "#8b5cf6",
        items: ["5-layer Dense Neural Network", "Rule-based Guardrails (Safety Override)", "Hybrid fallback scoring"],
    },
    {
        label: "Department Recommendation Engine",
        icon: Layers,
        color: "#f59e0b",
        items: ["NLP symptom classification (spaCy)", "Keyword + semantic mapping", "13 specialist departments"],
    },
    {
        label: "Explainability Layer",
        icon: ShieldCheck,
        color: "#10b981",
        items: ["AI Confidence Score (0–100%)", "Feature Contribution visualization", "Per-vital deviation analysis"],
    },
    {
        label: "Dashboard & Analytics",
        icon: BarChart2,
        color: "#ef4444",
        items: ["Real-time patient queue", "Department volume charts", "Bias & Fairness analysis", "Model performance metrics"],
    },
    {
        label: "Data Layer",
        icon: Database,
        color: "#64748b",
        items: ["Supabase (PostgreSQL)", "50,000 synthetic patient records", "Realtime subscriptions"],
    },
];

const TECH_STACK = [
    { layer: "Frontend", tech: "React 18 + TypeScript + Vite", detail: "Framer Motion, Recharts, i18n (6 languages)" },
    { layer: "Backend API", tech: "FastAPI (Python)", detail: "Uvicorn, CORS, async endpoints" },
    { layer: "ML Model", tech: "TensorFlow / Keras", detail: "Regression NN → risk score 0–1" },
    { layer: "NLP / Dept", tech: "spaCy + Sentence Transformers", detail: "Semantic symptom-to-department mapping" },
    { layer: "OCR / EHR", tech: "Gemini 1.5 Flash API", detail: "PDF text + scanned image extraction" },
    { layer: "Voice Input", tech: "Web Speech API + Whisper", detail: "Hybrid real-time transcription" },
    { layer: "Database", tech: "Supabase (PostgreSQL)", detail: "Realtime patient queue with RLS" },
    { layer: "Deployment", tech: "Vercel (Frontend) + Render (Backend)", detail: "CI/CD via GitHub" },
];

export default function ArchitectureModal({ open, onClose }: Props) {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-zinc-950 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/10 rounded-lg">
                                    <Layers className="h-5 w-5 text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-white">System Architecture</h2>
                                    <p className="text-xs text-zinc-400 font-mono">PARS — Patient AI Risk Stratification System</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-violet-500/20">

                            {/* Architecture Pipeline */}
                            <div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">System Data Flow</h3>

                                {/* Visual flow diagram */}
                                <div className="flex flex-col gap-0">
                                    {LAYERS.map((layer, i) => {
                                        const Icon = layer.icon;
                                        return (
                                            <div key={layer.label}>
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.07 }}
                                                    className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:bg-zinc-900/70 transition-colors"
                                                    style={{ borderLeftColor: layer.color, borderLeftWidth: 3 }}
                                                >
                                                    <div
                                                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                                        style={{ backgroundColor: layer.color + "20" }}
                                                    >
                                                        <Icon className="h-4 w-4" style={{ color: layer.color }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span
                                                                className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                                                style={{ backgroundColor: layer.color + "20", color: layer.color }}
                                                            >
                                                                Layer {i + 1}
                                                            </span>
                                                            <span className="text-sm font-bold text-white">{layer.label}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {layer.items.map((item) => (
                                                                <span key={item} className="text-[11px] font-mono text-zinc-400 bg-zinc-800/60 rounded px-2 py-0.5">
                                                                    {item}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                                {i < LAYERS.length - 1 && (
                                                    <div className="flex justify-center py-1">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <div className="w-px h-3 bg-zinc-700" />
                                                            <div
                                                                className="w-2 h-2 border-b-2 border-r-2 border-zinc-600 rotate-45"
                                                                style={{ marginTop: "-4px" }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tech Stack Table */}
                            <div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Technology Stack</h3>
                                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-zinc-800 bg-zinc-900">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Layer</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Technology</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-zinc-400">Detail</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {TECH_STACK.map((row, i) => (
                                                <tr
                                                    key={row.layer}
                                                    className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${i % 2 === 0 ? "bg-zinc-900/20" : ""}`}
                                                >
                                                    <td className="px-4 py-3 font-bold text-xs text-violet-400 font-mono">{row.layer}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-white">{row.tech}</td>
                                                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{row.detail}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Evaluation Coverage */}
                            <div>
                                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Evaluation Criteria Coverage</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { label: "Innovation & Problem Understanding", weight: "15%", covered: true },
                                        { label: "Technical Implementation", weight: "25%", covered: true },
                                        { label: "AI Model Performance", weight: "20%", covered: true },
                                        { label: "Explainability & Transparency", weight: "15%", covered: true },
                                        { label: "UI/UX & Demonstration", weight: "15%", covered: true },
                                        { label: "Scalability & Practical Applicability", weight: "10%", covered: true },
                                    ].map((c) => (
                                        <div
                                            key={c.label}
                                            className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2"
                                        >
                                            <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                            <div>
                                                <p className="text-[10px] font-bold text-white leading-tight">{c.label}</p>
                                                <p className="text-[9px] font-black text-emerald-400 mt-0.5">{c.weight} ✓</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/80 shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Globe className="h-3.5 w-3.5 text-zinc-500" />
                                <span className="text-[10px] font-mono text-zinc-500">Built for AI-Powered Smart Patient Triage Hackathon • 32hr Sprint</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
