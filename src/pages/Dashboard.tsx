import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePatients, Patient } from "@/hooks/usePatients";
import { useTriage, PatientInput } from "@/hooks/useTriage";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion"; // <--- IMPORT ADDED
import PatientQueue from "@/components/PatientQueue";
import TriageForm from "@/components/TriageForm";
import RiskPanel from "@/components/RiskPanel";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminStats from "@/components/AdminStats";
import { 
  LogOut, 
  LayoutDashboard, 
  Stethoscope,
  Plus,
  Zap,
  Globe
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RANDOM_NAMES = ["J. Smith", "M. Garcia", "A. Chen", "R. Patel", "K. Williams", "S. Johnson", "D. Brown", "L. Martinez", "T. Anderson", "N. Taylor"];

function randomPatientInput(): PatientInput & { name: string } {
  return {
    name: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)],
    Age: Math.floor(Math.random() * 70) + 18,
    Gender: Math.random() > 0.5 ? "Male" : "Female",
    Heart_Rate: Math.floor(Math.random() * 100) + 50,
    Systolic_BP: Math.floor(Math.random() * 100) + 80,
    Diastolic_BP: Math.floor(Math.random() * 50) + 50,
    O2_Saturation: Math.floor(Math.random() * 15) + 85,
    Temperature: +(35 + Math.random() * 5).toFixed(1),
    Respiratory_Rate: Math.floor(Math.random() * 25) + 8,
    Pain_Score: Math.floor(Math.random() * 11),
    GCS_Score: Math.floor(Math.random() * 13) + 3,
    Arrival_Mode: Math.random() > 0.7 ? "Ambulance" : "Walk-in",
    Diabetes: Math.random() > 0.8,
    Hypertension: Math.random() > 0.7,
    Heart_Disease: Math.random() > 0.85,
  };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { activePatients, patients, addPatient } = usePatients();
  const { predict, loading, error, result, setResult } = useTriage();
  const { t, i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState("intake");
  const [simActive, setSimActive] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sortOrder, setSortOrder] = useState<"priority" | "recent" | "old">("priority"); 
  
  // Refs for logic
  const simActiveRef = useRef(false);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevActivePatients = useRef<Patient[]>([]); 

  useEffect(() => {
    simActiveRef.current = simActive;
  }, [simActive]);

  // 1. QUEUE MONITORING
  useEffect(() => {
    const removedPatients = prevActivePatients.current.filter(
      (prev) => !activePatients.some((curr) => curr.id === prev.id)
    );

    removedPatients.forEach((patient) => {
      const isJustIdSwap = activePatients.some((curr) => curr.name === patient.name);

      if (!isJustIdSwap) {
        toast.success(`${t('dashboard.processed_toast')}: ${patient.name}`, {
          description: t('dashboard.processed_desc'),
          duration: 4000,
          icon: <div className="bg-green-500 rounded-full p-1"><Stethoscope size={12} className="text-white" /></div>
        });
      }
    });

    prevActivePatients.current = activePatients;
  }, [activePatients, t]);


  // 2. SUBMISSION LOGIC
  const handleSubmit = useCallback(async (data: PatientInput & { name: string }, isAuto: boolean = false) => {
    if (isAuto && !simActiveRef.current) return;

    const triageResult = await predict(data);
    
    if (isAuto && !simActiveRef.current) return;

    if (triageResult) {
      const newPatient = await addPatient({
        name: data.name,
        age: data.Age,
        gender: data.Gender,
        heart_rate: data.Heart_Rate,
        systolic_bp: data.Systolic_BP,
        diastolic_bp: data.Diastolic_BP,
        o2_saturation: data.O2_Saturation,
        temperature: data.Temperature,
        respiratory_rate: data.Respiratory_Rate,
        pain_score: data.Pain_Score,
        gcs_score: data.GCS_Score,
        arrival_mode: data.Arrival_Mode,
        diabetes: data.Diabetes,
        hypertension: data.Hypertension,
        heart_disease: data.Heart_Disease,
        risk_score: triageResult.risk_score,
        risk_label: triageResult.risk_label,
        explanation: triageResult.details,
        department: triageResult.referral?.department,
        chief_complaint: data.Chief_Complaint,
      });

      toast.success(`${isAuto ? '🤖 [SIM]' : '✅'} ${t('dashboard.triaged_toast')}: ${data.name}`, {
        description: `${t('risk.risk_index')}: ${triageResult.risk_label} | ${t('dashboard.assigned_queue')}`,
        duration: 3000,
      });

      if (!isAuto) {
        setActiveTab("analysis");
      }

      if (newPatient) {
        if (!isAuto) setSelectedPatient(newPatient); 
        const rawDept = triageResult.referral?.department || "General Medicine";
        try {
           await supabase.from("patient_assignments").insert({
             patient_id: newPatient.id,
             patient_name: data.name,
             department: rawDept,
             doctor_name: "Assigned via Triage", 
           });
        } catch (err) {
           console.error("Analytics Error:", err);
        }
      }
    }
  }, [predict, addPatient, t]);

  // 3. SIMULATION LOOP
  useEffect(() => {
    if (simActive) {
      handleSubmit(randomPatientInput(), true);
      simRef.current = setInterval(() => {
        if (simActiveRef.current) {
            handleSubmit(randomPatientInput(), true);
        }
      }, 5000);
    } else {
      if (simRef.current) {
        clearInterval(simRef.current);
        simRef.current = null;
      }
    }
    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [simActive, handleSubmit]);

  const handleSelectPatient = (p: Patient) => {
    if (p.risk_score != null && p.risk_label) {
      setResult({
        risk_score: Number(p.risk_score),
        risk_label: p.risk_label,
        details: p.explanation || "",
      });
      setSelectedPatient(p);
      setActiveTab("analysis"); 
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const sortedPatients = [...activePatients].sort((a, b) => {
    if (sortOrder === "priority") {
      const riskOrder = { "HIGH": 0, "MEDIUM": 1, "LOW": 2 };
      const riskA = riskOrder[a.risk_label as keyof typeof riskOrder] ?? 3;
      const riskB = riskOrder[b.risk_label as keyof typeof riskOrder] ?? 3;
      return riskA - riskB;
    } else {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === "recent" ? timeB - timeA : timeA - timeB;
    }
  });

  const toggleSort = () => {
    if (sortOrder === "priority") setSortOrder("recent");
    else if (sortOrder === "recent") setSortOrder("old");
    else setSortOrder("priority");
  };

  return (
    <div className="flex h-screen flex-col text-foreground font-sans selection:bg-primary/20 p-4 gap-4 overflow-hidden">
      
      {/* --- HEADER --- */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 mx-auto w-full shrink-0"
      >
        <div className="flex h-20 items-center justify-between rounded-3xl border border-border/40 bg-background/80 px-6 shadow-xl backdrop-blur-xl transition-all hover:border-border/60 hover:shadow-2xl">
          
          {/* --- Brand Section --- */}
          <div className="flex items-center gap-4">
            
            {/* UPDATED LOGO SECTION */}
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              src="/logo.png"
              alt="PARS Logo"
              // Adjusted h-16 to h-12 md:h-14 to fit inside the h-20 header comfortably with padding
              className="h-12 md:h-14 w-auto drop-shadow-[0_0_15px_rgba(255,0,0,0.4)]"
            />
            
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-serif-display">
                {t('app.title')}
              </h1>
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-muted-foreground/30 rounded-full"></span>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* --- Right Actions Section --- */}
          <div className="flex items-center gap-4">
            
            {/* Language Selector */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-secondary/50 px-3 py-1.5 border border-transparent hover:border-border transition-colors">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <Select onValueChange={changeLanguage} defaultValue={i18n.language}>
                <SelectTrigger className="h-6 w-[90px] border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 shadow-none text-muted-foreground hover:text-foreground">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent align="end" className="min-w-[8rem]">
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="hi">🇮🇳 हिंदी</SelectItem>
                  <SelectItem value="ta">🇮🇳 தமிழ்</SelectItem>
                  <SelectItem value="te">🇮🇳 తెలుగు</SelectItem>
                  <SelectItem value="bn">🇮🇳 বাংলা</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border/60 hidden md:block" />

            {/* User Profile Area */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold leading-none">
                  {user?.email?.split('@')[0] || "Dr. Staff"}
                </span>
                <span className="mt-1 text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                  {t('app.on_duty')}
                </span>
              </div>
            </div>

            {/* Action Buttons Group */}
            <div className="flex items-center gap-2 pl-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAdmin(true)}
                className="hidden lg:flex gap-2 shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t('app.admin')}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={signOut} 
                className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>

          </div>
        </div>
      </motion.header>

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col md:flex-row gap-4 overflow-hidden">
        
        {/* LEFT COLUMN: Queue */}
        <motion.aside 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full md:w-[320px] lg:w-[380px] flex flex-col shrink-0 rounded-2xl glass-panel overflow-hidden h-[300px] md:h-auto transition-all"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/40">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{t('dashboard.patient_record')}</h2>
              <Badge variant="outline" className="ml-1 border-white/10 text-muted-foreground px-2 py-[2px] bg-black/20">
                {activePatients.length}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5">
                <Label htmlFor="sim-mode" className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer hidden sm:block">
                  {t('dashboard.live_sim')}
                </Label>
                <Switch
                  id="sim-mode"
                  checked={simActive}
                  onCheckedChange={setSimActive}
                  className="scale-75 data-[state=checked]:bg-green-500"
                />
                {simActive && <Zap className="h-3 w-3 animate-pulse text-green-500" />}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleSort}
                className="hover:bg-primary/20 hover:text-primary rounded-lg text-xs px-2 py-1 h-7"
                title={
                  sortOrder === "priority" ? "Sorted by Risk Priority (HIGH→MEDIUM→LOW)" :
                  sortOrder === "recent" ? "Sorted by Time (Newest First)" :
                  "Sorted by Time (Oldest First)"
                }
              >
                {sortOrder === "priority" ? "Priority" : sortOrder === "recent" ? "Recent" : "Old"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setActiveTab("intake")}
                className="hover:bg-primary/20 hover:text-primary rounded-lg"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <PatientQueue
              patients={sortedPatients}
              selectedId={null}
              onSelect={handleSelectPatient}
              loading={activePatients.length === 0 && loading} 
            />
          </div>
        </motion.aside>

        {/* RIGHT COLUMN: Workbench */}
        <motion.main 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
          className="flex-1 flex flex-col min-w-0 relative rounded-2xl overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="pb-4 shrink-0">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 glass-panel rounded-xl p-1">
                <TabsTrigger value="intake" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                 {t('dashboard.triage_intake')}
                </TabsTrigger>
                <TabsTrigger value="analysis" disabled={!result} className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                  {t('dashboard.patient_analysis')}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="h-full">
                <TabsContent value="intake" className="h-full mt-0 border-0 focus-visible:ring-0 data-[state=active]:flex flex-col">
                  <div className="flex flex-col h-full rounded-2xl glass-panel shadow-xl transition-all">
                      <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent rounded-2xl">
                        <TriageForm onSubmit={(data) => handleSubmit(data, false)} loading={loading} />
                      </div>
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="h-full mt-0 border-0 focus-visible:ring-0 data-[state=active]:flex flex-col">
                  <div className="flex flex-col h-full rounded-2xl glass-panel shadow-xl overflow-hidden transition-all">
                      <div className="flex-1 overflow-hidden relative rounded-2xl">
                        <div className="absolute inset-0">
                           <RiskPanel result={result} patients={patients} apiError={error} selectedPatient={selectedPatient} loading={loading} />
                        </div>
                      </div>
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </motion.main>
      </div>

      <Footer />
      {showAdmin && (
        <AdminStats patients={patients} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}