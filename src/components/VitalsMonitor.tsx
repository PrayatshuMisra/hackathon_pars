import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Thermometer, Wind, Footprints, Flame, Brain, Cpu, Heart } from 'lucide-react';
import { useVitalSigns, PatientCondition } from '@/hooks/useVitalSigns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

const CONDITIONS: { value: PatientCondition; label: string; color: string; hex: string; bgTint: string }[] = [
  { value: 'NORMAL',              label: 'Normal Sinus Rhythm',    color: 'text-emerald-400', hex: '#34d399', bgTint: 'rgba(52, 211, 153, 0.04)' },
  { value: 'TACHYCARDIA',         label: 'Tachycardia (High HR)',  color: 'text-rose-400',    hex: '#fb7185', bgTint: 'rgba(251, 113, 133, 0.06)' },
  { value: 'BRADYCARDIA',         label: 'Bradycardia (Low HR)',   color: 'text-blue-400',    hex: '#60a5fa', bgTint: 'rgba(96, 165, 250, 0.05)' },
  { value: 'HYPOXIA',             label: 'Hypoxia (Low SpO₂)',     color: 'text-indigo-400',  hex: '#818cf8', bgTint: 'rgba(129, 140, 248, 0.06)' },
  { value: 'HYPERTENSIVE_CRISIS', label: 'Hypertensive Crisis',    color: 'text-orange-400',  hex: '#fb923c', bgTint: 'rgba(251, 146, 60, 0.05)' },
  { value: 'SHOCK',               label: 'Shock / Hypotension',    color: 'text-red-500',     hex: '#ef4444', bgTint: 'rgba(239, 68, 68, 0.08)' },
];

const GlassCard = ({ children, className = '', glow }: { children: React.ReactNode, className?: string, glow: string }) => (
  <div 
    className={`relative rounded-[32px] border border-white/[0.06] backdrop-blur-3xl shadow-2xl overflow-hidden transition-colors duration-1000 ${className}`}
    style={{ backgroundColor: glow }}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
    <div className="relative z-10">{children}</div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Redesigned Watch Complications
// ─────────────────────────────────────────────────────────────────────────────
function Complication({ icon: Icon, value, label, alert, color = 'text-zinc-500' }: any) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className={alert ? 'text-red-400 animate-pulse' : color} />
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <span className={`text-[17px] font-bold tracking-tight tabular-nums leading-none ${alert ? 'text-red-400' : 'text-zinc-100'}`}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ultra-Realistic OLED Watch Face
// ─────────────────────────────────────────────────────────────────────────────
function SmartWatchFace({ current, condition, isAlert, hex }: any) {
  return (
    <div className="relative mx-auto flex items-center justify-center drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
      {/* Outer Hardware Bezel (Titanium finish) */}
      <div className="w-[280px] h-[340px] rounded-[56px] bg-gradient-to-b from-[#3a3a3c] via-[#1c1c1e] to-[#0a0a0b] p-[2px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-black/80">
        
        {/* Inner Physical Black Bezel (Screen border) */}
        <div className="w-full h-full rounded-[54px] bg-black p-[6px] shadow-inner">
          
          {/* Active OLED Screen Display */}
          <div className="relative w-full h-full rounded-[48px] bg-[#09090b] overflow-hidden flex flex-col justify-between py-6 px-4 border border-white/[0.02]">
            
            {/* Ambient OLED Center Glow based on condition */}
            <div 
              className="absolute inset-0 opacity-[0.15] blur-2xl transition-colors duration-1000 pointer-events-none" 
              style={{ background: `radial-gradient(circle at 50% 50%, ${hex}, transparent 70%)` }} 
            />
            
            {/* Glass Lens Glare / Reflection */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-[48px] pointer-events-none" />

            {/* Top Complications */}
            <div className="relative z-10 flex justify-between px-3 mt-1">
              <Complication icon={Activity} value={`${current.systolic}/${current.diastolic}`} label="NIBP" alert={condition === 'HYPERTENSIVE_CRISIS' || condition === 'SHOCK'} color="text-amber-500" />
              <Complication icon={Thermometer} value={current.temperature.toFixed(1)} label="TEMP" alert={current.temperature > 38.0} color="text-orange-500" />
            </div>

            {/* Center: BPM Ring */}
            <div className="relative z-10 flex justify-center my-1 scale-105">
              <HeartRateRing bpm={current.heartRate} alert={condition === 'TACHYCARDIA' || condition === 'BRADYCARDIA' || condition === 'SHOCK'} ringColor={hex} />
            </div>

            {/* Bottom Complications */}
            <div className="relative z-10 flex justify-between px-3 mb-1 items-end">
              <div className="flex flex-col items-center justify-center w-16">
                <SpO2Mini value={current.spo2} alert={condition === 'HYPOXIA'} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1.5">SpO₂</span>
              </div>
              <Complication icon={Wind} value={Math.round(12 + (current.heartRate / 10))} label="RESP" alert={condition === 'HYPOXIA'} color="text-indigo-400" />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function HeartRateRing({ bpm, alert, ringColor }: { bpm: number; alert: boolean, ringColor: string }) {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, (bpm - 30) / (200 - 30)));
  const dash = CIRC * pct;
  const color = alert ? '#ef4444' : ringColor; // Force red on alert

  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      {/* Background neon glow for OLED effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30 transition-all duration-1000"
        style={{ backgroundColor: color, transform: alert ? 'scale(1.1)' : 'scale(0.9)' }}
      />
      
      <svg width={130} height={130} className="absolute inset-0 z-10 drop-shadow-lg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={65} cy={65} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        {/* Active Ring */}
        <circle 
          cx={65} cy={65} r={R} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" 
          strokeDasharray={`${dash} ${CIRC}`} transform="rotate(-90 65 65)" 
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.25, 1, 0.5, 1)' }} 
          filter="url(#glow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <Heart size={14} className={`mb-0.5 ${alert ? 'text-red-400 animate-pulse' : 'text-zinc-300'}`} fill={alert ? 'currentColor' : 'none'} />
        <motion.span 
          key={bpm} initial={{ opacity: 0.8, y: 2 }} animate={{ opacity: 1, y: 0 }} 
          className="font-bold tracking-tighter text-white tabular-nums leading-none mt-1 drop-shadow-md" 
          style={{ fontSize: 44 }}
        >
          {bpm}
        </motion.span>
      </div>
    </div>
  );
}

function SpO2Mini({ value, alert }: { value: number; alert: boolean }) {
  const R = 18;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, (value - 80) / 20));
  const dash = CIRC * pct;
  const color = alert ? '#818cf8' : '#38bdf8';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg width={44} height={44} className="drop-shadow-md">
        <circle cx={22} cy={22} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle cx={22} cy={22} r={R} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${dash} ${CIRC}`} transform="rotate(-90 22 22)" style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.25, 1, 0.5, 1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[15px] font-bold tabular-nums tracking-tighter ${alert ? 'text-indigo-400' : 'text-white'}`}>{value}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Clinical Stress Bar & Charts
// ─────────────────────────────────────────────────────────────────────────────
function StressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-400">
          <Brain size={14} />
          <span className="text-[10px] font-semibold uppercase tracking-widest">Cognitive Stress</span>
        </div>
        <span className="text-sm font-bold text-white tabular-nums">{clamped}%</span>
      </div>
      <div className="relative h-1.5 w-full bg-black/60 rounded-full overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-90" style={{ background: 'linear-gradient(90deg, #10b981 0%, #fbbf24 50%, #ef4444 100%)' }} />
        <motion.div className="absolute top-0 bottom-0 right-0 bg-black/80 backdrop-blur-sm" animate={{ width: `${100 - clamped}%` }} transition={{ duration: 1, ease: "easeInOut" }} />
        <motion.div className="absolute top-0 bottom-0 w-[3px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" animate={{ left: `calc(${clamped}% - 1.5px)` }} transition={{ duration: 1, ease: "easeInOut" }} />
      </div>
    </div>
  );
}

function EnhancedChartStrip({ data, color, title, domain, ticks, unit = '' }: any) {
  return (
    <div className="flex flex-col gap-2 w-full bg-black/20 p-4 rounded-2xl border border-white/[0.03]">
      <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">{title}</span>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="time" hide />
            <YAxis domain={domain} ticks={ticks} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 9, fontWeight: 500 }} tickFormatter={(val) => `${val}${unit}`} />
            <Tooltip contentStyle={{ background: 'rgba(10,10,12,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#f4f4f5' }} itemStyle={{ color, fontWeight: 600 }} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#fill-${title})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function VitalsMonitor() {
  const { current, history, condition, setCondition } = useVitalSigns();
  const [tick, setTick] = useState(0);
  const isAlert = condition !== 'NORMAL';
  const condMeta = CONDITIONS.find(c => c.value === condition)!;

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <GlassCard glow={condMeta.bgTint} className="w-full max-w-5xl p-6 flex flex-col gap-6 font-sans">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 rounded-full bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
            <Cpu className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-zinc-200 tracking-wide leading-none">Telemetry Monitor</h3>
            <span className="text-[10px] text-zinc-500 font-mono mt-1 leading-none">ID: WBL-2026-XJ • Connected</span>
          </div>
        </div>

        <div className="flex items-center bg-black/30 rounded-lg p-1 border border-white/5 shadow-inner w-full md:w-auto z-50">
          <Select value={condition} onValueChange={(v) => setCondition(v as PatientCondition)}>
            <SelectTrigger className="w-full md:w-[220px] h-8 text-xs border-none bg-transparent focus:ring-0 text-zinc-200 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: condMeta.hex }} />
                <SelectValue placeholder="Select Condition" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-[#12141a] border-white/10 text-zinc-200 rounded-xl">
              {CONDITIONS.map(c => (
                <SelectItem key={c.value} value={c.value} className="text-xs cursor-pointer focus:bg-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Middle Row: Watch & Stats ── */}
      <div className="flex flex-col md:flex-row items-center gap-8">
        
        {/* Pass the dynamic hex color down to the watch */}
        <div className="w-full md:w-auto flex justify-center">
          <SmartWatchFace current={current} condition={condition} isAlert={isAlert} hex={condMeta.hex} />
        </div>

        {/* Stats Panel */}
        <div className="flex flex-col gap-6 w-full flex-1 bg-black/20 p-6 rounded-[24px] border border-white/[0.03] shadow-inner">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <span className="text-[11px] font-semibold tracking-widest text-zinc-400">Patient State</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={condition} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`text-xs font-bold tracking-wide ${condMeta.color}`}
              >
                {condMeta.label}
              </motion.div>
            </AnimatePresence>
          </div>

          <StressBar value={current.stressLevel} />

          <div className="flex gap-4 pt-1">
            <div className="flex flex-1 items-center justify-between bg-black/40 px-4 py-3 rounded-2xl border border-white/[0.03] shadow-inner">
              <div className="flex items-center gap-2">
                <Footprints size={14} className="text-[#38bdf8]" />
                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Steps</span>
              </div>
              <span className="text-sm font-bold text-white tabular-nums">{current.steps.toLocaleString()}</span>
            </div>
            
            <div className="flex flex-1 items-center justify-between bg-black/40 px-4 py-3 rounded-2xl border border-white/[0.03] shadow-inner">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-400" />
                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Kcal</span>
              </div>
              <span className="text-sm font-bold text-white tabular-nums">{current.calories}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Compact Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <EnhancedChartStrip data={history.heartRate} color="#34d399" title="HR Trend" domain={[60, 120]} ticks={[60, 90, 120]} />
        <EnhancedChartStrip data={history.spo2} color="#38bdf8" title="SpO₂ Trend" domain={[90, 100]} ticks={[90, 95, 100]} unit="%" />
        <EnhancedChartStrip data={history.stressLevel} color="#a1a1aa" title="Stress Trend" domain={[0, 100]} ticks={[0, 50, 100]} unit="%" />
      </div>

    </GlassCard>
  );
}