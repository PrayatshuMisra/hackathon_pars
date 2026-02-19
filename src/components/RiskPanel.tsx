import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  Activity, 
  Info, 
  UserRound, 
  ClipboardList, 
  Stethoscope, 
  Clock,
  ShieldAlert,
  ChevronRight,
  Users,
  Building2,
  FileText,
  Siren
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTranslation } from "react-i18next";
import { TriageResult } from "@/hooks/useTriage";
import { Patient } from "@/hooks/usePatients";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  result: TriageResult | null;
  patients: Patient[];
  apiError: string | null;
  selectedPatient?: Patient | null;
  loading?: boolean;
}

// 🎨 DYNAMIC THEME CONFIGURATION
const THEME = {
  HIGH: {
    primary: "#ef4444", 
    hex: "#ef4444",
    bg: "bg-red-950/40",
    border: "border-red-500/50",
    text: "text-red-500",
    textBright: "text-red-400",
    glow: "shadow-[0_0_30px_rgba(239,68,68,0.3)]",
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
    iconBg: "bg-red-500/10",
  },
  MEDIUM: {
    primary: "#f59e0b", 
    hex: "#f59e0b",
    bg: "bg-amber-950/40",
    border: "border-amber-500/50",
    text: "text-amber-500",
    textBright: "text-amber-400",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    iconBg: "bg-amber-500/10",
  },
  LOW: {
    primary: "#10b981", 
    hex: "#10b981",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/50",
    text: "text-emerald-500",
    textBright: "text-emerald-400",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    iconBg: "bg-emerald-500/10",
  }
};

const PROTOCOLS = {
  HIGH: [
    { text: "Immediate Bed Assignment (Zone A)", icon: Stethoscope, urgent: true },
    { text: "Continuous Cardiac Monitoring", icon: Activity, urgent: true },
    { text: "Notify Senior Resident / Attending", icon: ShieldAlert, urgent: true },
  ],
  MEDIUM: [
    { text: "Assign to Urgent Care (Zone B)", icon: Stethoscope, urgent: false },
    { text: "Full Vitals Panel Required", icon: Activity, urgent: true },
    { text: "Pain Management Assessment", icon: UserRound, urgent: false },
  ],
  LOW: [
    { text: "Move to Waiting Area (Zone C)", icon: UserRound, urgent: false },
    { text: "Standard Intake Interview", icon: ClipboardList, urgent: false },
    { text: "Re-assess if symptoms worsen", icon: Clock, urgent: false },
  ]
};

export default function RiskPanel({ result, patients, apiError, selectedPatient, loading }: Props) {
  const { t, i18n } = useTranslation();
  
  // Default to first patient if specific selection missing (e.g. live view)
  const activePatient = selectedPatient || patients[0]; 

  const handleExportPDF = () => {
    if (!activePatient) return;

    // Force English for PDF
    const tEn = i18n.getFixedT('en');

    const doc = new jsPDF();
    const primaryColor = [22, 163, 74]; // Emerald-ish branding for PARS
    const darkColor = [33, 33, 33];
    const lightGray = [245, 245, 245];

    // --- 1. PROFESSIONAL HEADER ---
    // Top Bar
    doc.setFillColor(30, 41, 59); // Dark slate
    doc.rect(0, 0, 210, 30, 'F');

    // Logo / Title area
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(tEn('app.title'), 14, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(tEn('risk.subtitle'), 14, 24);

    // Meta Data (Top Right)
    doc.setFontSize(9);
    doc.text(`${tEn('pdf.date')}:`, 150, 12);
    doc.text(new Date().toLocaleDateString('en-US').toUpperCase(), 175, 12);
    
    doc.text(`${tEn('pdf.time')}:`, 150, 17);
    doc.text(new Date().toLocaleTimeString('en-US').toUpperCase(), 175, 17);

    doc.text(`${tEn('pdf.case_id')}:`, 150, 22);
    doc.text(`#${activePatient.id.slice(0, 6).toUpperCase()}`, 175, 22);

    // --- 2. PATIENT IDENTITY ---
    let currentY = 45;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(tEn('risk.patient_identity'), 14, currentY);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, currentY + 2, 196, currentY + 2); // Underline

    const patientData = [
      [`${tEn('pdf.name')}:  ${activePatient.name}`, `${tEn('pdf.age_sex')}:  ${activePatient.age} / ${activePatient.gender}`],
      [`${tEn('pdf.arrival')}:  ${activePatient.arrival_mode.toUpperCase()}`, `${tEn('pdf.history')}:  ${[
          activePatient.diabetes ? tEn('pdf.diabetic') : "",
          activePatient.hypertension ? tEn('pdf.htn') : "",
          activePatient.heart_disease ? tEn('pdf.cardiac') : ""
        ].filter(Boolean).join(", ") || tEn('pdf.none_reported')}`
      ]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      body: patientData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3, textColor: 50 },
      columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { fontStyle: 'bold' } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // --- 3. SUBJECTIVE: CHIEF COMPLAINT ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(tEn('risk.chief_complaint'), 14, currentY);
    doc.line(14, currentY + 2, 196, currentY + 2);

    // Background box for complaint
    const complaintText = activePatient.chief_complaint || activePatient.explanation || tEn('risk.no_symptoms');
    const splitComplaint = doc.splitTextToSize(complaintText, 180);
    const boxHeight = (splitComplaint.length * 6) + 10;

    doc.setFillColor(248, 250, 252); // Very light slate
    doc.setDrawColor(226, 232, 240); // Border
    doc.roundedRect(14, currentY + 5, 182, boxHeight, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(60, 60, 60);
    doc.text(splitComplaint, 18, currentY + 12);

    currentY += boxHeight + 15;

    // --- 4. OBJECTIVE: VITALS GRID ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(tEn('risk.objective_vitals'), 14, currentY);
    doc.line(14, currentY + 2, 196, currentY + 2);

    const vitals = [
      [tEn('triage.hr'), `${activePatient.heart_rate ?? '--'} bpm`, tEn('triage.bp_sys'), `${activePatient.systolic_bp ?? '--'}/${activePatient.diastolic_bp ?? '--'} mmHg`, tEn('triage.spo2'), `${activePatient.o2_saturation ?? '--'}%`],
      [tEn('triage.temp'), `${activePatient.temperature ?? '--'}°C`, tEn('triage.rr'), `${activePatient.respiratory_rate ?? '--'}/min`, tEn('triage.pain_score'), `${activePatient.pain_score ?? '--'}/10`],
      [tEn('triage.gcs_score'), `${activePatient.gcs_score ?? '--'}/15`, "", "", "", ""]
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [[tEn('pdf.metric'), tEn('pdf.value'), tEn('pdf.metric'), tEn('pdf.value'), tEn('pdf.metric'), tEn('pdf.value')]],
      body: vitals,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9, halign: 'center' },
      bodyStyles: { fontSize: 10, cellPadding: 4, halign: 'center' },
      columnStyles: { 
        0: { fontStyle: 'bold', fillColor: 245 }, 
        2: { fontStyle: 'bold', fillColor: 245 },
        4: { fontStyle: 'bold', fillColor: 245 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- 5. PARS ASSESSMENT (The "Conclusion") ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(tEn('risk.assessment'), 14, currentY);
    doc.line(14, currentY + 2, 196, currentY + 2);

    // Dynamic Color for Risk
    let rColor = [46, 204, 113]; // Green
    if (activePatient.risk_label === "MEDIUM") rColor = [243, 156, 18]; // Orange
    if (activePatient.risk_label === "HIGH") rColor = [231, 76, 60]; // Red

    // Risk Badge Box
    doc.setFillColor(rColor[0], rColor[1], rColor[2]);
    doc.rect(14, currentY + 8, 40, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(tEn('risk.triage_level'), 34, currentY + 14, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(activePatient.risk_label || "N/A", 34, currentY + 23, { align: "center" });


    // Routing Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(255, 255, 255);

    // Calculate best doctor
    const doctors = result?.referral?.doctors || [];
    const bestDoc = doctors.length > 0 ? doctors.reduce((prev: any, current: any) => (prev.experience > current.experience) ? prev : current, doctors[0]) : null;

    const docBoxHeight = bestDoc ? 40 : 25;
    doc.roundedRect(64, currentY + 8, 132, docBoxHeight, 3, 3); // Border only

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(tEn('risk.recommended_dept').toUpperCase(), 70, currentY + 16);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const deptKey = activePatient.department || "General_Medicine";
    // Force English department name
    const dept = tEn(`departments.${deptKey}`, deptKey.replace(/_/g, " ")).toUpperCase();
    doc.text(dept, 70, currentY + 24);

    if (bestDoc) {
       // Separator line
       doc.setDrawColor(230, 230, 230);
       doc.line(70, currentY + 28, 186, currentY + 28);

       doc.setTextColor(100, 100, 100);
       doc.setFontSize(8);
       doc.setFont("helvetica", "bold");
       doc.text("RECOMMENDED SPECIALIST", 70, currentY + 35);

       doc.setTextColor(33, 150, 243); // Blue for doctor name
       doc.setFontSize(12);
       doc.setFont("helvetica", "bold");
       doc.text(`${bestDoc.name}`, 70, currentY + 42);

       doc.setTextColor(150, 150, 150);
       doc.setFontSize(9);
       doc.setFont("helvetica", "normal");
       doc.text(`(${bestDoc.experience} Years Exp)`, 130, currentY + 42);
    }

    // --- FOOTER ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text(tEn('risk.footer_note'), 105, pageHeight - 10, { align: "center" });

    doc.save(`PARS_Report_${activePatient.name.replace(/\s+/g, '_')}.pdf`);
  };

  const [randomProtocol, setRandomProtocol] = useState<any>(null);
  const [showFullList, setShowFullList] = useState(false);
  
  // Define defaults safely for loading state
  const riskKey = result?.risk_label as keyof typeof THEME || "LOW";
  const currentTheme = THEME[riskKey];
  const scorePercent = result ? Math.round(result.risk_score * 100) : 0;

  const availableSpecialists = result?.referral?.doctors.filter(d => d.available) || [];
  const bestSpecialist = availableSpecialists.length > 0 
    ? availableSpecialists.reduce((max, doc) => doc.experience > max.experience ? doc : max, availableSpecialists[0])
    : null;

  useEffect(() => {
    if (result) {
      const protocols = PROTOCOLS[result.risk_label as keyof typeof PROTOCOLS] || PROTOCOLS.LOW;
      const random = protocols[Math.floor(Math.random() * protocols.length)];
      setRandomProtocol(random);
    }
  }, [result]);

  if (loading) {
     return (
        <div className="flex h-full flex-col bg-zinc-950 border-l border-zinc-800 relative overflow-hidden">
           {/* Skeleton Header */}
           <div className="relative z-10 flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-950/80 backdrop-blur-sm">
              <Skeleton className="h-10 w-10 rounded-md bg-zinc-800" />
              <Skeleton className="h-8 w-24 rounded-full bg-zinc-800" />
           </div>
           
           <ScrollArea className="relative z-10 flex-1 px-5 py-6">
              <div className="space-y-8 flex flex-col items-center">
                 {/* Skeleton Gauge */}
                 <div className="relative flex flex-col items-center justify-center py-4">
                    <Skeleton className="h-60 w-60 rounded-full bg-zinc-900" />
                 </div>
                 
                 {/* Skeleton Reasoning */}
                 <div className="w-full rounded border border-zinc-800 bg-zinc-900/50 p-5 space-y-2">
                    <Skeleton className="h-4 w-1/3 bg-zinc-800" />
                    <Skeleton className="h-3 w-full bg-zinc-800" />
                    <Skeleton className="h-3 w-5/6 bg-zinc-800" />
                    <Skeleton className="h-3 w-4/6 bg-zinc-800" />
                 </div>

                 {/* Skeleton Referral */}
                 <div className="w-full space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex justify-between">
                       <Skeleton className="h-4 w-32 bg-zinc-800" />
                       <Skeleton className="h-3 w-20 bg-zinc-800" />
                    </div>
                    <Skeleton className="h-40 w-full rounded-xl bg-zinc-900" />
                 </div>
              </div>
           </ScrollArea>
        </div>
     );
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950 border-l border-zinc-800 relative overflow-hidden transition-colors duration-500">
      <div 
        className="absolute inset-0 z-0 opacity-[0.05] transition-all duration-500" 
        style={{ 
          backgroundImage: `radial-gradient(${currentTheme.hex} 1px, transparent 1px)`, 
          backgroundSize: "20px 20px" 
        }} 
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`rounded-md p-2 border border-zinc-800 bg-zinc-900 transition-colors duration-300 ${result ? currentTheme.text : 'text-zinc-600'}`}>
            <Activity className={`h-5 w-5 ${result?.risk_label === 'HIGH' ? 'animate-pulse' : ''}`} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* EXPORT BUTTON */}
          {result && activePatient && (
              <button
                onClick={handleExportPDF}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all
                  ${currentTheme.border} ${currentTheme.bg} ${currentTheme.text} hover:bg-opacity-80`}
              >
                <FileText className="h-3 w-3" />
                {t('risk.export_pdf')}
              </button>
          )}
          {result && (
            <Badge variant="outline" className={`${currentTheme.border} ${currentTheme.text} ${currentTheme.bg} transition-all duration-500`}>
              {t('risk.live')}
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="relative z-10 flex-1 px-5 py-6">

        <div className="space-y-8">
          
          {/* Error State */}
          {apiError && (
            <div className="flex items-center gap-3 rounded border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-mono text-xs">{t('risk.err_api')}</span>
            </div>
          )}

          {/* 1. DYNAMIC GAUGE */}
          <div className="relative flex flex-col items-center justify-center py-4">
            <div className="relative h-60 w-60">
              <div 
                className="absolute inset-0 rounded-full blur-[60px] opacity-20 transition-colors duration-700"
                style={{ backgroundColor: currentTheme.hex }}
              />
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="4" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={currentTheme.hex}
                  strokeWidth="4"
                  strokeLinecap="square"
                  strokeDasharray={264}
                  initial={{ strokeDashoffset: 264 }}
                  animate={{ strokeDashoffset: 264 - (264 * scorePercent) / 100 }}
                  transition={{ duration: 1.2, type: "spring", bounce: 0 }}
                  className="drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div 
                  key={scorePercent}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <span className={`text-6xl font-black tracking-tighter drop-shadow-md font-mono transition-colors duration-500 ${currentTheme.text}`}>
                    {scorePercent}%
                  </span>
                  <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mt-2">{t('risk.risk_index')}</span>
                </motion.div>
              </div>
            </div>

            {result && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`mt-[-10px] flex flex-col items-center gap-1`}
              >
                <div className={`px-8 py-2 rounded border bg-black transition-all duration-500 ${currentTheme.border} ${currentTheme.glow}`}>
                  <span className={`text-sm font-bold tracking-widest uppercase ${currentTheme.text}`}>
                    {result.risk_label} {t('risk.priority')}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* 2. CLINICAL REASONING */}
          {result && (
            <div className="rounded border border-zinc-800 bg-zinc-900/50 p-5 relative overflow-hidden group">
              <div 
                className="absolute left-0 top-0 h-full w-[2px] transition-colors duration-500"
                style={{ backgroundColor: currentTheme.hex }}
              />
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-zinc-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{t('risk.pars_assessment')}</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300 font-mono min-h-[3rem]">
                <span className="mr-2 text-zinc-500">{">"}</span>
                {result.details.split("").map((char, index) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.05, delay: index * 0.015 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </p>
            </div>
          )}

          {/* 3. SPECIALIST REFERRAL WITH BIG HEADER */}
          {result?.referral && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
               <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100 uppercase tracking-wide">
                    <ShieldAlert className={`h-4 w-4 ${currentTheme.text}`} />
                    {t('risk.specialist_match')}
                  </h3>
                  <button 
                    onClick={() => setShowFullList(true)}
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:underline ${currentTheme.textBright}`}
                  >
                    {t('risk.view_full_list')} <ChevronRight size={10} />
                  </button>
               </div>

               {/* --- THE BIG DEPARTMENT BANNER --- */}
               <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
                  {/* Background Glow */}
                  <div className={`absolute inset-0 opacity-10 bg-gradient-to-r ${currentTheme.text.replace('text', 'from')} to-transparent`} />
                  
                  <div className="relative p-6 flex flex-col items-center justify-center text-center gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{t('risk.recommended_dept')}</p>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight font-serif-display">
                          {t(`departments.${result.referral.department}`, result.referral.department.replace(/_/g, " "))}
                        </h2>
                      </div>
                  </div>

                  {/* Best Match Doctor Preview */}
                  <div className="border-t border-zinc-800/50 bg-black/20 p-3">
                    {availableSpecialists.length > 0 ? (
                       availableSpecialists.map((doc, idx) => {
                         const isRecommended = doc.name === bestSpecialist?.name;
                         if (!isRecommended) return null; 

                         return (
                           <div key={idx} className="flex items-center justify-between px-2">
                              <div className="flex items-center gap-3">
                                 <div className={`flex h-8 w-8 items-center justify-center rounded font-bold text-[10px] 
                                   ${currentTheme.bg} ${currentTheme.text} border ${currentTheme.border}`}>
                                   {doc.name.split(" ")[1]?.[0] || doc.name.charAt(0)}
                                 </div>
                                 <div className="text-left">
                                    <div className="text-xs font-bold text-white flex items-center gap-2">
                                      {doc.name}
                                      <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-zinc-800 text-zinc-400 border-0">{t('risk.top_match')}</Badge>
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                      {t('risk.senior_resident')} • {doc.experience}y {t('risk.exp')}
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              </div>
                           </div>
                         );
                       })
                    ) : (
                      <div className="text-center text-[10px] text-zinc-500 py-1">{t('risk.no_specialists')}</div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {/* 4. PRIORITY ACTION PROTOCOL (Moved below referral) */}
          {result && randomProtocol && (
            <div className="space-y-4">
               <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-100 uppercase tracking-wide">
                    <ClipboardList className={`h-4 w-4 ${currentTheme.text}`} />
                    {t('risk.priority_action')}
                  </h3>
               </div>
               
               <motion.div
                  key={randomProtocol.text}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`flex items-center gap-4 rounded-lg border bg-zinc-900/50 p-4 transition-colors 
                    ${randomProtocol.urgent ? `border-l-[4px] ${currentTheme.text.replace("text", "border-l")} ${currentTheme.border}` : 'border-zinc-800'}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 border border-zinc-800 
                    ${randomProtocol.urgent ? currentTheme.text : 'text-zinc-600'}`}>
                    <randomProtocol.icon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{t('risk.recommended_step')}</p>
                    <p className={`text-sm font-bold font-mono ${randomProtocol.urgent ? 'text-white' : 'text-zinc-300'}`}>
                      {randomProtocol.text.toUpperCase()}
                    </p>
                  </div>
                </motion.div>
            </div>
          )}

          {!result && (
            <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
              <Siren className="mb-4 h-12 w-12 text-zinc-500" />
              <p className="text-sm font-mono text-zinc-500">{t('risk.awaiting_data')}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* FULL LIST DIALOG */}
      <Dialog open={showFullList} onOpenChange={setShowFullList}>
        <DialogContent className="sm:max-w-md border border-zinc-800 bg-zinc-950 p-0 gap-0 shadow-2xl">
          <div className={`bg-opacity-20 border-b p-6 ${currentTheme.bg} ${currentTheme.border}`}>
            <DialogHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white uppercase tracking-tight">
                  <Users className={`h-5 w-5 ${currentTheme.text}`} />
                  {t('risk.full_list')}
                </DialogTitle>
                <div className={`px-2 py-1 border rounded text-[10px] font-mono ${currentTheme.badge}`}>
                  {availableSpecialists.length} {t('risk.available')}
                </div>
              </div>
              <DialogDescription className="text-zinc-400 font-mono text-xs">
                {t('risk.on_call')} <span className="text-white font-bold">{t(`departments.${result?.referral?.department}`, result?.referral?.department?.replace(/_/g, " "))}</span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[60vh] p-4">
             <div className="space-y-3">
                {availableSpecialists.map((doc, idx) => {
                   const isRecommended = doc.name === bestSpecialist?.name;
                   
                   return (
                     <div 
                       key={idx} 
                       className={`flex items-center justify-between rounded border p-4 transition-all hover:bg-zinc-900/50
                         ${isRecommended 
                           ? `border-zinc-700 bg-zinc-900/20` 
                           : 'border-zinc-800 bg-transparent'
                         }`}
                     >
                        <div className="flex items-center gap-4">
                           <div className={`flex h-10 w-10 items-center justify-center rounded font-bold text-sm 
                             ${isRecommended ? 'text-white' : 'bg-zinc-800 text-zinc-400'}`}
                             style={{ backgroundColor: isRecommended ? currentTheme.hex : undefined }}>
                             {doc.name.split(" ")[1]?.[0] || doc.name.charAt(0)}
                           </div>
                           
                           <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-sm ${isRecommended ? 'text-white' : 'text-zinc-300'}`}>
                                  {doc.name}
                                </span>
                                {isRecommended && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-black uppercase tracking-wider`}
                                    style={{ backgroundColor: currentTheme.hex }}>
                                    {t('risk.best_match')}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-1">
                                <span>{t('risk.senior_resident')}</span>
                                <span className="text-zinc-700">|</span>
                                <span className={isRecommended ? currentTheme.textBright : ""}>
                                  {doc.experience} {t('risk.years_exp')}
                                </span>
                              </div>
                           </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                           <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              {t('risk.online')}
                           </span>
                        </div>
                     </div>
                   );
                })}
             </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}