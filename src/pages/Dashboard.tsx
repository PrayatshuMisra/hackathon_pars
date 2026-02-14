import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePatients, Patient } from "@/hooks/usePatients";
import { useTriage, PatientInput } from "@/hooks/useTriage";
import PatientQueue from "@/components/PatientQueue";
import TriageForm from "@/components/TriageForm";
import RiskPanel from "@/components/RiskPanel";
import Footer from "@/components/Footer";
import AdminStats from "@/components/AdminStats";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Shield,
  LayoutDashboard,
  Activity,
  Stethoscope,
  ChevronRight,
  Plus,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { patients, addPatient } = usePatients();
  const { predict, loading, error, result, setResult } = useTriage();

  const [activeTab, setActiveTab] = useState("intake");
  const [simActive, setSimActive] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSubmit = useCallback(async (data: PatientInput & { name: string }) => {
    const triageResult = await predict(data);
    if (triageResult) {
      await addPatient({
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
        department: triageResult.referral?.department, // Save department
      });
      setActiveTab("analysis");
    }
  }, [predict, addPatient]);

  useEffect(() => {
    if (simActive) {
      simRef.current = setInterval(() => {
        handleSubmit(randomPatientInput());
      }, 5000);
    } else {
      if (simRef.current) clearInterval(simRef.current);
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
      setActiveTab("analysis");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground font-sans selection:bg-primary/20">

      {/* 1. Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-serif-display">PARS</h1>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clinical Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end border-r border-border pr-4">
            <span className="text-sm font-semibold">{user?.email?.split('@')[0]}</span>
            <span className="text-[10px] text-muted-foreground uppercase">On Duty</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdmin(true)}
            className="hidden md:flex gap-2 border-primary/20 text-primary hover:bg-primary/10"
          >
            <LayoutDashboard className="h-4 w-4" />
            Admin
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT COLUMN: Patient Queue */}
        <aside className="w-[320px] lg:w-[380px] flex flex-col border-r border-border bg-card/20 backdrop-blur-sm">

          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/40">

            {/* LEFT GROUP */}
            <div className="flex items-center gap-3 min-w-0">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground shrink-0" />

              <h2 className="flex flex-col text-sm font-bold uppercase tracking-wider text-foreground leading-tight">
                Patient Record

                <Badge
                  variant="outline"
                  className="mt-1 w-fit border-border text-muted-foreground px-2 py-[2px]"
                >
                  {patients.length}
                </Badge>
              </h2>

            </div>


            {/* RIGHT GROUP */}
            <div className="flex items-center gap-4 shrink-0">

              {/* LIVE SIM */}
              <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-2.5 py-1">
                <Label
                  htmlFor="sim-mode"
                  className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer"
                >
                  Live Sim
                </Label>

                <Switch
                  id="sim-mode"
                  checked={simActive}
                  onCheckedChange={setSimActive}
                  className="scale-75 data-[state=checked]:bg-green-500"
                />

                {simActive && (
                  <Zap className="h-3 w-3 animate-pulse text-green-500" />
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={() => setActiveTab("intake")}
                className="hover:bg-primary/10 hover:text-primary"
              >
                <Plus className="h-5 w-5" />
              </Button>

            </div>

          </div>


          {/* PATIENT QUEUE */}
          <div className="flex-1 overflow-hidden">
            <PatientQueue
              patients={patients}
              selectedId={null}
              onSelect={handleSelectPatient}
            />
          </div>

        </aside>

        {/* RIGHT COLUMN: Work Bench */}
        <main className="flex-1 flex flex-col min-w-0 bg-background/50 relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full">
            <div className="px-6 lg:px-8 pt-2 pb-2 shrink-0">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-card/50 border border-border p-1">
                <TabsTrigger value="intake" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Triage Intake
                </TabsTrigger>
                <TabsTrigger value="analysis" disabled={!result} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Patient Analysis
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden px-4 lg:px-8 pb-4">
              <div className="mx-auto max-w-5xl h-full">

                <TabsContent value="intake" className="h-full mt-0 border-0 focus-visible:ring-0 data-[state=active]:flex flex-col">
                  <div className="flex flex-col h-full rounded-2xl border border-border bg-card/40 shadow-xl backdrop-blur-xl transition-all">
                    <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                      <TriageForm onSubmit={handleSubmit} loading={loading} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="h-full mt-0 border-0 focus-visible:ring-0 data-[state=active]:flex flex-col">
                  <div className="flex flex-col h-full rounded-2xl border border-border bg-card/40 shadow-xl overflow-hidden backdrop-blur-xl transition-all">
                    <div className="flex-1 overflow-hidden relative">
                      <div className="absolute inset-0">
                        <RiskPanel result={result} patients={patients} apiError={error} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </main>
      </div>

      <Footer />

      {/* Admin Overlay */}
      {showAdmin && (
        <AdminStats patients={patients} onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}