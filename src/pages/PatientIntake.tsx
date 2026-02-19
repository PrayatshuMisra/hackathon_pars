import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
   ChevronLeft,
   Stethoscope,
   Activity,
   User,
   FileText,
   CheckCircle2,
   Mic,
   MicOff,
   Shield,
   Phone,
   MapPin,
   Ambulance,
   Hospital,
   Loader2,
   Calendar,
   Upload,
   Heart,
   Thermometer,
   Zap,
   Navigation,
   Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTriage, PatientInput } from "@/hooks/useTriage";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { parseVoiceInput } from "@/utils/voiceParser";
import VitalsMonitor from "@/components/VitalsMonitor";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema, type PatientFormValues } from "@/schemas/patientSchema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import i18n from "@/i18n";



// Interface for Real Hospital Data
interface HospitalData {
   name: string;
   lat: string;
   lon: string;
   address: string;
   distance?: number;
}

export default function PatientIntake() {
  const { t } = useTranslation();
  const { predict, selfCheckIn, loading, result, setResult } = useTriage();
  const [step, setStep] = useState<"form" | "result" | "self-check-in">("form");
  
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      age: undefined,
      gender: "Male",
      symptoms: "",
      emergencyName: "",
      emergencyPhone: ""
    }
  });

  const { register, handleSubmit: handleHookFormSubmit, setValue, watch, formState: { errors } } = form;
  const formValues = watch();

  // --- WEARABLE SIMULATION (Dummy) ---
  const [wearableConnected, setWearableConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnectWearable = () => {
    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setWearableConnected(true);
      toast.success("Wearable Device Connected", {
         description: "Receiving live telemetry from device WBL-2026-XJ"
      });
    }, 1500); 
  };

  const [extractedData, setExtractedData] = useState<Partial<PatientInput>>({});
  const submitFormRef = useRef<(() => void) | null>(null);


  // --- REAL VOICE LOGIC ---
  const handleVoiceResult = (text: string) => {
    const currentSymptoms = formValues.symptoms || "";
    setValue("symptoms", currentSymptoms ? `${currentSymptoms} ${text}` : text);

    const { extracted } = parseVoiceInput(text);
    
    if (extracted.name) setValue("name", extracted.name);
    if (extracted.Age) setValue("age", extracted.Age);
    if (extracted.Gender) setValue("gender", extracted.Gender as "Male" | "Female" | "Other");

    const { name, Age, Gender, ...others } = extracted as any;
    setExtractedData(prev => ({ ...prev, ...others }));
  };

  // --- PDF EXPORT LOGIC FOR SELF CHECK-IN ---
  const handleExportPDF = () => {
    if (!result) return;
    
    // Construct a temporary patient object from form data
    const values = form.getValues();
    const activePatient = {
       id: "SELF-CHECK-IN-" + Math.floor(Math.random() * 10000),
       name: values.name,
       age: values.age || 0,
       gender: values.gender,
       arrival_mode: "Walk-in",
       diabetes: null,
       hypertension: null,
       heart_disease: null,
       chief_complaint: values.symptoms,
       explanation: result.details,
       risk_label: "LOW",
       department: result.referral?.department,
       heart_rate: null,
       systolic_bp: null,
       diastolic_bp: null,
       o2_saturation: null,
       temperature: null,
       respiratory_rate: null,
       pain_score: null,
       gcs_score: 15
    };

    // Force English for PDF
    const tEn = i18n.getFixedT('en');

    const doc = new jsPDF();
    
    // --- 1. PROFESSIONAL HEADER ---
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
    doc.text(`#${activePatient.id.slice(0, 15).toUpperCase()}`, 175, 22);

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
      [`${tEn('pdf.arrival')}:  ${activePatient.arrival_mode.toUpperCase()}`, `${tEn('pdf.history')}:  ${tEn('pdf.none_reported')}`]
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
    const doctors = result.referral?.doctors || [];
    const bestDoc = doctors.length > 0 ? doctors.reduce((prev: any, current: any) => (prev.experience > current.experience) ? prev : current, doctors[0]) : null;

    const referralBoxHeight = bestDoc ? 40 : 25;
    doc.roundedRect(64, currentY + 8, 132, referralBoxHeight, 3, 3); // Border only

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

    doc.save(`PARS_Report_${activePatient.name?.replace(/\s+/g, '_') || "SelfCheckIn"}.pdf`);
  };

  const handleVoiceCommand = (command: "stop" | "submit") => {
    if (command === "submit" && submitFormRef.current) {
      // Trigger form submission via ref
      submitFormRef.current();
    }
    // "stop" command just stops listening, handled by the hook
  };

  const { isListening, isProcessing, toggleListening, mode, setMode, keyboardHintVisible, hasSupport } = useSpeechToText({ 
    onResult: handleVoiceResult,
    onCommand: handleVoiceCommand,
    continuous: true 
  });

  // --- REAL SMS LOGIC ---
  const [sendingSms, setSendingSms] = useState(false);
  
  const handleSendSMS = async () => {
    if (!formValues.emergencyPhone) {
      toast.error("Phone Number Required", { description: "Please enter a number to send alerts." });
      return;
    }

    setSendingSms(true);
    try {
      const { error } = await supabase.functions.invoke('send-emergency-sms', {
        body: { 
          to: formValues.emergencyPhone, 
          patient: formValues.name || "A Patient",
          location: "PARS Kiosk #4" 
        }
      });

      if (error) throw error;
      toast.success("SMS Alert Sent", { description: `Notification sent to ${formValues.emergencyPhone}` });

    } catch (err) {
      const message = `EMERGENCY ALERT: ${formValues.name || "The patient"} is currently at the hospital kiosk requesting assistance.`;
      window.open(`sms:${formValues.emergencyPhone}?body=${encodeURIComponent(message)}`, '_self');
      toast.info("Opening SMS App", { description: "Using device messenger as fallback." });
    } finally {
      setSendingSms(false);
    }
  };

  // --- REAL AMBULANCE LOGIC ---
  const handleCallAmbulance = () => {
    window.location.href = "tel:108"; 
    toast.warning("Dialing Emergency Services...", { duration: 2000 });
  };

   const [nearestHospital, setNearestHospital] = useState<HospitalData | null>(null);
   const [locating, setLocating] = useState(false);

   useEffect(() => {
    if (step === "result" && !nearestHospital) {
      setLocating(true);
      
      if (!navigator.geolocation) {
        toast.error("Geolocation not supported by this browser.");
        setLocating(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Create a Dynamic "Bounding Box" (~20km radius)
            const offset = 0.2; 
            const minLon = longitude - offset;
            const maxLon = longitude + offset;
            const minLat = latitude - offset;
            const maxLat = latitude + offset;

            // Query OpenStreetMap (Nominatim)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
              const hospital = data[0];
              setNearestHospital({
                name: hospital.name || "Local Emergency Center",
                lat: hospital.lat,
                lon: hospital.lon,
                address: hospital.display_name
              });
              toast.success("Nearest Facility Located", { description: hospital.name });
            } else {
               // Fallback to generic location if API fails to find "hospital"
               setNearestHospital({
                 name: "Emergency Services",
                 lat: latitude.toString(),
                 lon: longitude.toString(),
                 address: "Detected Location (Facility Data Unavailable)"
               });
               toast.info("Location Detected", { description: "Map centered on your position." });
            }
          } catch (error) {
            console.error("Map Error:", error);
            setNearestHospital({
              name: "Emergency Services",
              lat: latitude.toString(),
              lon: longitude.toString(),
              address: "Detected Location (Map Data Unavailable)"
            });
          } finally {
            setLocating(false);
          }
        },
        (error) => {
          console.error("GPS Error:", error);
          let errorMsg = "Location Access Required";
          if (error.code === 1) errorMsg = "Please allow location access to find hospitals.";
          else if (error.code === 2) errorMsg = "GPS signal unavailable.";
          else if (error.code === 3) errorMsg = "Location request timed out.";
          
          toast.error(errorMsg);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [step]); 

  // --- FORM SUBMISSION ---
  const onSubmit = async (data: PatientFormValues) => {
    const payload: PatientInput & { name: string } = {
      name: data.name,
      Age: data.age || 30,
      Gender: data.gender || "Male",
      Chief_Complaint: data.symptoms,
      Heart_Rate: 75,
      Systolic_BP: 120,
      Diastolic_BP: 80,
      O2_Saturation: 98,
      Temperature: 37.0,
      Respiratory_Rate: 16,
      Pain_Score: 0,
      GCS_Score: 15,
      Arrival_Mode: "Walk-in",
      Diabetes: false,
      Hypertension: false,
      Heart_Disease: false,
      ...extractedData
    };

    setStep("result");
    await predict(payload);
  };

  const onSelfCheckInSubmit = async (data: PatientFormValues) => {
    const payload = {
      name: data.name,
      age: data.age,
      gender: data.gender,
      symptoms: data.symptoms
    };
    
    // 1. Get Analysis
    const result = await selfCheckIn(payload);
    
    if (result) {
       setStep("result");
       
       // 2. Add to Queue
       try {
          const { error } = await supabase.from("patients").insert({
             name: payload.name,
             age: payload.age,
             gender: payload.gender,
             chief_complaint: payload.symptoms,
             risk_label: "LOW",
             risk_score: 0.1,
             department: result.referral?.department,
             explanation: result.details,
             // Default Vitals (NULL for Self Check-In as per requirement)
             heart_rate: null,
             systolic_bp: null,
             diastolic_bp: null,
             o2_saturation: null,
             temperature: null,
             respiratory_rate: null,
             pain_score: null,
             gcs_score: 15, // Assumed alert
             arrival_mode: "Walk-in",
             diabetes: null,
             hypertension: null,
             heart_disease: null,
             user_id: (await supabase.auth.getUser()).data.user?.id || "00000000-0000-0000-0000-000000000000"
          });
          
          if (error) console.error("Queue Error:", error);
          else toast.success("Check-In Successful", { description: "Added to main queue." });
       } catch (err) {
          console.error("DB Error:", err);
       }
    }
  };

  // Store submit function in ref for voice command access
  useEffect(() => {
    submitFormRef.current = () => {
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.dispatchEvent(submitEvent);
      }
    };
  }, []);

  return (
    <div className="flex h-dvh flex-col text-foreground font-sans selection:bg-primary/20 overflow-hidden relative">
      {/* Keyboard Shortcut Hint Overlay */}
      {keyboardHintVisible && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-medium">
            <kbd className="px-2 py-1 bg-primary-foreground/20 rounded text-xs font-mono">Right Alt</kbd>
            <span>{isListening ? "⏹️ Stopped" : "🎤 Started"}</span>
          </div>
        </div>
      )}


      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/30 backdrop-blur-md px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-serif-display">PARS</h1>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('intake.subtitle')}</p>
          </div>
        </div>

        <Link to="/login">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-2 h-4 w-4" /> {t('intake.back_login')}
          </Button>
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 bg-dot-pattern overflow-y-auto">
        
        <AnimatePresence mode="wait">
          
          {/* --- VIEW 1: INTAKE FORM --- */}
          {step === "form" && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-3xl flex flex-col h-full md:h-auto md:max-h-[85vh]"
            >
              <div className="rounded-2xl glass-panel shadow-2xl overflow-hidden flex flex-col h-full md:h-auto">
                
                {/* 1. AUTO-FILL TOOLBAR */}
                <div className="bg-muted/30 border-b border-border p-3 flex items-center justify-between gap-4">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-2">{t('intake.quick_fill')}</span>
                   </div>
                   
                   <div className="flex items-center gap-2">
                      {/* OCR UPLOAD */}
                      <div className="relative">
                        <input 
                           type="file" 
                           id="ehr-upload" 
                           accept=".pdf" 
                           className="hidden" 
                           onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append("file", file);
                              const toastId = toast.loading("Uploading & Parsing Document...");
                              try {
                                 const res = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/parse-document`, { method: "POST", body: formData });
                                 const data = await res.json();
                                 if (data.data) {
                                    const extracted = data.data;
                                    if (extracted.name) setValue("name", extracted.name);
                                    if (extracted.Age) setValue("age", extracted.Age);
                                    if (extracted.Gender) setValue("gender", extracted.Gender as "Male" | "Female" | "Other");
                                    if (extracted.Chief_Complaint) setValue("symptoms", extracted.Chief_Complaint);
                                    
                                    setExtractedData(prev => ({ ...prev, ...extracted }));
                                    toast.success("EHR Data Extracted Successfully", { id: toastId });
                                 }
                              } catch (err) {
                                 toast.error("OCR Service Unavailable", { id: toastId });
                              }
                           }}
                        />
                        <Label 
                           htmlFor="ehr-upload" 
                           className="flex items-center gap-2 h-8 px-3 rounded-md bg-background border border-border hover:border-primary/50 cursor-pointer transition-all text-xs font-medium shadow-sm"
                        >
                           <Upload className="h-3 w-3 text-primary" /> {t('intake.upload_record')}
                        </Label>
                      </div>

                      {/* SELF CHECK-IN BUTTON */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStep("self-check-in")}
                        className="h-8 text-xs font-medium border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                      >
                        <User className="h-3 w-3 mr-2" /> Self Check-In
                      </Button>

                      {/* VOICE INPUT WITH MODE SELECTOR */}
                      {hasSupport && (
                        <div className="flex items-center gap-2">
                          {/* Voice Mode Selector */}
                          

                          {/* Voice Button */}
                          <button
                            type="button"
                            onClick={toggleListening}
                            disabled={isProcessing}
                            className={`flex items-center gap-2 h-8 px-3 rounded-md border transition-all text-xs font-medium shadow-sm relative ${
                              isListening 
                                ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse" 
                                : isProcessing
                                ? "bg-blue-500/10 border-blue-500 text-blue-500"
                                : "bg-background border-border hover:border-primary/50"
                            }`}
                          >
                            {isProcessing ? (
                              <>
                                <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Processing...
                              </>
                            ) : isListening ? (
                              <>
                                <Mic className="h-3 w-3" />
                                {t('intake.listening')}
                              </>
                            ) : (
                              <>
                                <MicOff className="h-3 w-3 text-primary" />
                                {t('intake.dictate')}
                              </>
                            )}
                          </button>

                          {/* Voice Commands Hint */}
                          {isListening && (
                            <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border">
                              Say: <span className="font-bold text-primary">"stop"</span> or <span className="font-bold text-primary">"submit"</span>
                            </div>
                          )}
                        </div>
                      )}
                   </div>
                </div>

                {/* 2. FORM BODY */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/10">
                  <form id="intake-form" onSubmit={handleHookFormSubmit(onSubmit)} className="space-y-8">
                    
                    {/* SECTION: PATIENT IDENTITY */}
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                          <User className="h-4 w-4 text-primary" /> {t('intake.patient_identity')}
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          {/* Name */}
                          <div className="md:col-span-6 space-y-2">
                             <Label htmlFor="name" className="text-xs text-muted-foreground font-medium">{t('intake.full_name')}</Label>
                             <div className="relative group">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                   id="name"
                                   placeholder="e.g. Jane Doe"
                                   {...register("name")}
                                   className={`pl-9 bg-background/50 h-10 ${errors.name ? "border-red-500" : ""}`}
                                />
                                {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                             </div>
                          </div>

                          {/* Age */}
                          <div className="md:col-span-3 space-y-2">
                             <Label htmlFor="age" className="text-xs text-muted-foreground font-medium">{t('intake.age')}</Label>
                             <div className="relative group">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input 
                                   id="age"
                                   type="number"
                                   placeholder={t('intake.age_placeholder')}
                                   {...register("age")}
                                   className={`pl-9 bg-background/50 h-10 ${errors.age ? "border-red-500" : ""}`}
                                />
                                {errors.age && <span className="text-xs text-red-500">{errors.age.message}</span>}
                             </div>
                          </div>

                          {/* Gender */}
                          <div className="md:col-span-3 space-y-2">
                             <Label htmlFor="gender" className="text-xs text-muted-foreground font-medium">{t('intake.gender')}</Label>
                             <Select value={formValues.gender} onValueChange={v => setValue("gender", v as any)}>
                                <SelectTrigger className="bg-background/50 h-10">
                                   <SelectValue placeholder={t('intake.select')} />
                                </SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="Male">{t('intake.male')}</SelectItem>
                                   <SelectItem value="Female">{t('intake.female')}</SelectItem>
                                   <SelectItem value="Other">{t('intake.other')}</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                       </div>
                    </div>

                    {/* SECTION: SYMPTOMS & VITALS */}
                    <div className="space-y-4">
                       <div className="flex items-center justify-between border-b border-border pb-2">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                             <Stethoscope className="h-4 w-4 text-primary" /> {t('intake.chief_complaint')}
                          </h3>
                          {/* Live Vitals Badges (if detected via voice) */}
                          {(extractedData.Heart_Rate || extractedData.Temperature) && (
                             <div className="flex gap-2">
                                {extractedData.Heart_Rate && (
                                   <div className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded-full border border-red-500/20">
                                      <Heart className="h-3 w-3" /> {extractedData.Heart_Rate} BPM
                                   </div>
                                )}
                                {extractedData.Temperature && (
                                   <div className="flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full border border-orange-500/20">
                                      <Thermometer className="h-3 w-3" /> {extractedData.Temperature}°C
                                   </div>
                                )}
                             </div>
                          )}
                       </div>

                       <div className="relative">
                          <Textarea 
                             id="symptoms"
                             rows={6}
                             placeholder={t('intake.symptoms_placeholder')}
                             {...register("symptoms")}
                             className={`bg-background/50 min-h-[140px] text-base resize-none focus:ring-primary/20 transition-all ${isListening ? "ring-2 ring-red-500/50 border-red-500/50" : ""} ${errors.symptoms ? "border-red-500" : ""}`}
                          />
                          {errors.symptoms && <span className="text-xs text-red-500">{errors.symptoms.message}</span>}
                          
                          {/* FLOATING VOICE BUTTON */}
                          {hasSupport && (
                            <button
                              type="button"
                              onClick={toggleListening}
                              className={`absolute right-3 bottom-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md
                                ${isListening 
                                  ? "bg-red-500 text-white animate-pulse" 
                                  : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                }`}
                            >
                              {isListening ? (
                                <>
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                  </span>
                                  {t('intake.listening')}
                                </>
                              ) : (
                                <>
                                  <Mic className="h-3.5 w-3.5" />
                                  {t('intake.dictate')}
                                </>
                              )}
                            </button>
                          )}
                       </div>
                    </div>

                    {/* SECTION: EMERGENCY CONTACT */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                       <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" /> {t('intake.emergency_contact')}
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label htmlFor="ename" className="text-xs text-muted-foreground font-medium">{t('intake.contact_name')}</Label>
                             <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                   id="ename"
                                   placeholder={t('intake.contact_placeholder')}
                                   {...register("emergencyName")}
                                   className={`pl-9 bg-white/40 border-primary/10 h-10 ${errors.emergencyName ? "border-red-500" : ""}`}
                                />
                                {errors.emergencyName && <span className="text-xs text-red-500">{errors.emergencyName.message}</span>}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="ephone" className="text-xs text-muted-foreground font-medium">{t('intake.phone')}</Label>
                             <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                   id="ephone"
                                   type="tel"
                                   placeholder="(555) 000-0000"
                                   {...register("emergencyPhone")}
                                   className={`pl-9 bg-white/40 border-primary/10 h-10 ${errors.emergencyPhone ? "border-red-500" : ""}`}
                                />
                                {errors.emergencyPhone && <span className="text-xs text-red-500">{errors.emergencyPhone.message}</span>}
                             </div>
                          </div>
                       </div>
                    </div>

                  </form>
                </div>

                {/* 3. FOOTER */}
                <div className="p-4 border-t border-border bg-muted/20">
                   <Button 
                      type="submit"
                      form="intake-form"
                      disabled={loading}
                      className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl"
                   >
                      {loading ? (
                         <span className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> {t('intake.processing')}
                         </span>
                      ) : (
                         <span className="flex items-center gap-2">
                            {t('intake.submit')} <CheckCircle2 className="h-5 w-5" />
                         </span>
                      )}
                   </Button>
                </div>

              </div>
            </motion.div>
          )}
          
          {/* --- VIEW 1.5: SELF CHECK-IN FORM --- */}
          {step === "self-check-in" && (
            <motion.div 
              key="self-check-in"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-lg flex flex-col"
            >
              <div className="rounded-2xl glass-panel shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-bold text-foreground">Self Check-In</h2>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setStep("form")} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="h-4 w-4" />
                   </Button>
                </div>

                <div className="p-6">
                  <form onSubmit={handleHookFormSubmit(onSelfCheckInSubmit)} className="space-y-6">
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label htmlFor="sc-name">Full Name</Label>
                          <Input id="sc-name" {...register("name")} placeholder="Your Name" className="bg-background/50" />
                          {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label htmlFor="sc-age">Age</Label>
                             <Input id="sc-age" type="number" {...register("age")} placeholder="Age" className="bg-background/50" />
                             {errors.age && <span className="text-xs text-red-500">{errors.age.message}</span>}
                          </div>
                          <div className="space-y-2">
                             <Label htmlFor="sc-gender">Gender</Label>
                             <Select value={formValues.gender} onValueChange={v => setValue("gender", v as any)}>
                                <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="Male">Male</SelectItem>
                                   <SelectItem value="Female">Female</SelectItem>
                                   <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>
                       </div>

                       <div className="space-y-2">
                          <Label htmlFor="sc-symptoms">Symptoms</Label>
                          <Textarea id="sc-symptoms" {...register("symptoms")} placeholder="Briefly describe your symptoms..." className="bg-background/50 min-h-[100px]" />
                          {errors.symptoms && <span className="text-xs text-red-500">{errors.symptoms.message}</span>}
                       </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full font-bold">
                       {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Check In Now"}
                    </Button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- VIEW 2: RESULTS (Enhanced with Real Map) --- */}
          {step === "result" && result && (
             <motion.div 
               key="result"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="w-full max-w-5xl h-[85vh] flex flex-col"
             >
               <div className="flex items-center justify-between mb-4">
                 <div>
                   <h2 className="text-2xl font-bold font-serif-display text-foreground">{t('intake.assessment_complete')}</h2>
                   <p className="text-sm text-muted-foreground">{t('intake.assessment_desc')}</p>
                 </div>
                  <Button 
                    variant="outline" 
                    onClick={handleExportPDF}
                    className="gap-2 mr-2"
                  >
                    <Download className="h-4 w-4" /> {t('risk.export_pdf')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setStep("form"); setResult(null); form.reset(); setExtractedData({}); setNearestHospital(null); }}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t('intake.new_checkin')}
                  </Button>
      </div>




                  <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
                      
                      {/* 1. RECOMMENDED DEPARTMENT CARD */}
                      <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-lg">
                         <div className="p-6 flex flex-col items-center text-center space-y-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('intake.recommended_dept')}</p>
                              <h2 className="text-3xl font-black font-serif-display text-primary uppercase">
                                  {t(`departments.${result.referral?.department || "General_Medicine"}`, result.referral?.department?.replace(/_/g, " "))}
                              </h2>
                              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                  {result.details}
                            </p>
                            </div>
                         </div>
                      </div>


                           {result.isSelfCheckIn ? (
                              <div className="grid grid-cols-1 gap-4">
                                 <div className="rounded-xl border border-border bg-card/60 p-6">
                                    <div className="w-full bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-center justify-center gap-2 mb-4">
                                       <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                                       <span className="font-bold text-green-600 uppercase tracking-widest text-sm">Low Risk Assessment</span>
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                                       <Activity className="h-4 w-4 text-primary" /> Available Specialists
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       {(() => {
                                          const doctors = result.referral?.doctors || [];
                                          const maxExp = Math.max(...doctors.map((d: any) => d.experience || 0));
                                          
                                          return doctors.map((doc: any, i: number) => {
                                             const isRecommended = doc.experience === maxExp;
                                             return (
                                                <div 
                                                   key={i} 
                                                   className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                                      isRecommended 
                                                         ? "bg-primary/10 border-primary/30 shadow-sm relative overflow-hidden" 
                                                         : "bg-background/50 border-border"
                                                   }`}
                                                >
                                                   {isRecommended && (
                                                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                                                         Recommended
                                                      </div>
                                                   )}
                                                   <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                      DR
                                                   </div>
                                                   <div>
                                                      <p className="font-bold text-sm w-full truncate">{doc.name}</p>
                                                      <div className="flex items-center gap-2 mt-0.5">
                                                         <Badge variant="outline" className="text-[10px] h-5 border-primary/20 bg-primary/5 text-primary px-1">
                                                            {doc.experience}y Exp
                                                         </Badge>
                                                         <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Available
                                                         </span>
                                                      </div>
                                                   </div>
                                                </div>
                                             );
                                          });
                                       })() || <p className="text-sm text-muted-foreground">No specific doctor assigned. Please wait at the front desk.</p>}
                                    </div>

                                    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10 text-center">
                                       <h4 className="font-bold text-primary mb-1">Status Confirmed</h4>
                                       <p className="text-sm font-medium text-foreground">
                                          You are in the queue.
                                       </p>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              // ORIGINAL MAP VIEW FOR REMOTE/AMBULANCE
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">

                                 {/* INFO CARD */}
                                 <div className="rounded-xl border border-border bg-card/60 p-6 flex flex-col justify-between">
                                    <div>
                                       <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                                          <MapPin className="h-4 w-4 text-primary" /> Nearest Facility
                                       </h3>
                                       {locating ? (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                             <Loader2 className="h-4 w-4 animate-spin" /> Locating nearest hospital...
                                          </div>
                                       ) : nearestHospital ? (
                                          <div className="space-y-2">
                                             <h2 className="text-xl font-bold text-foreground leading-tight">
                                                {nearestHospital.name}
                                             </h2>
                                             <p className="text-xs text-muted-foreground line-clamp-3">
                                                {nearestHospital.address}
                                             </p>
                                          </div>
                                       ) : (
                                          <p className="text-sm text-muted-foreground">Location data unavailable.</p>
                                       )}
                                    </div>

                                    <Button
                                       className="w-full gap-2 mt-4"
                                       disabled={!nearestHospital}
                                       onClick={() => {
                                          if (nearestHospital) {
                                             // Open Real Google Maps Navigation
                                             window.open(`https://www.google.com/maps/dir/?api=1&destination=${nearestHospital.lat},${nearestHospital.lon}`, '_blank');
                                          }
                                       }}
                                    >
                                       <Navigation className="h-4 w-4" /> Navigate Now
                                    </Button>
                                 </div>

                                 {/* MAP EMBED */}
                                 <div className="rounded-xl border border-border bg-black/10 overflow-hidden relative">
                                    {nearestHospital ? (
                                       <iframe
                                          width="100%"
                                          height="100%"
                                          frameBorder="0"
                                          scrolling="no"
                                          marginHeight={0}
                                          marginWidth={0}
                                          // Using OpenStreetMap Embed (Free & Real) based on detected Lat/Lon
                                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(nearestHospital.lon) - 0.01}%2C${parseFloat(nearestHospital.lat) - 0.01}%2C${parseFloat(nearestHospital.lon) + 0.01}%2C${parseFloat(nearestHospital.lat) + 0.01}&layer=mapnik&marker=${nearestHospital.lat}%2C${nearestHospital.lon}`}
                                          className="w-full h-full opacity-80 hover:opacity-100 transition-opacity"
                                       ></iframe>
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                          {locating ? "Acquiring GPS..." : "Map Unavailable"}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}

                           {/* 3. EMERGENCY ACTIONS ROW (Hidden in Self Check-In) */}
                           {!result.isSelfCheckIn && (
                              <>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* CALL AMBULANCE */}
                                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-4">
                                       <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                                          <Ambulance className="h-6 w-6 text-red-500" />
                                       </div>
                                       <div>
                                          <h4 className="font-bold text-red-500">Call Ambulance</h4>
                                          <p className="text-xs text-red-400/80 mb-2">Immediate dispatch.</p>
                                          <Button size="sm" variant="destructive" className="w-full bg-red-500 hover:bg-red-600" onClick={handleCallAmbulance}>
                                             Call 108 Now
                                          </Button>
                                       </div>
                                    </div>

                                    {/* NOTIFY CONTACT */}
                                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-4">
                                       <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                          <Phone className="h-6 w-6 text-blue-500" />
                                       </div>
                                       <div className="flex-1">
                                          <h4 className="font-bold text-blue-500">Notify Emergency Contact</h4>
                                          <p className="text-xs text-blue-400/80 mb-2">{formValues.emergencyName || "Family/Friend"}</p>
                                          <Button size="sm" variant="default" className="w-full bg-blue-500 hover:bg-blue-600" onClick={handleSendSMS} disabled={sendingSms}>
                                             {sendingSms ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send SMS Alert"}
                                          </Button>
                                       </div>
                                    </div>
                                 </div>

                                 {/* 4. WEARABLE (Dummy) */}
                                 {!wearableConnected ? (
                                    <div className="rounded-xl border border-dashed border-border bg-black/5 p-6 flex items-center justify-between">
                                       <div className="flex items-center gap-4">
                                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Activity className="h-5 w-5 text-primary" /></div>
                                          <div><h4 className="font-bold text-sm">Wearable Device</h4><p className="text-xs text-muted-foreground">{t('intake.sync_desc')}</p></div>
                                       </div>
                                       <Button size="sm" onClick={handleConnectWearable} disabled={connecting}>{connecting ? "Connecting..." : "Connect"}</Button>
                                    </div>
                                 ) : (
                                    <motion.div
                                       initial={{ opacity: 0, scale: 0.95 }}
                                       animate={{ opacity: 1, scale: 1 }}
                                       className="space-y-2"
                                    >
                                       <div className="flex items-center justify-between px-2">
                                          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                             <Activity className="h-4 w-4 text-green-500" /> Live Vitals Stream
                                          </h3>
                                          <span className="text-[10px] font-mono text-green-500 animate-pulse">● LIVE</span>
                                       </div>
                                       <VitalsMonitor />
                                    </motion.div>
                                 )}
                              </>
                           )}


                  </div>
                  </motion.div>
               )}



            </AnimatePresence>
         </main>
      </div>
   );
}