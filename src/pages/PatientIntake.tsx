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
   Navigation
} from "lucide-react";
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
  const { predict, loading, result, setResult } = useTriage();
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

                      {/* VOICE INPUT WITH MODE SELECTOR */}
                      {hasSupport && (
                        <div className="flex items-center gap-2">
                          {/* Voice Mode Selector */}
                          <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value as any)}
                            className="h-8 px-2 rounded-md bg-background border border-border text-xs font-medium shadow-sm hover:border-primary/50 transition-all"
                            disabled={isListening || isProcessing}
                          >
                            <option value="web">🌐 Web Speech</option>
                            <option value="whisper">🎙️ Whisper AI</option>
                          </select>

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
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                                       <Activity className="h-4 w-4 text-primary" /> Available Specialists
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       {result.referral?.doctors?.map((doc: any, i: number) => (
                                          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border">
                                             <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                                DR
                                             </div>
                                             <div>
                                                <p className="font-bold text-sm">{doc.name}</p>
                                                <div className="flex items-center gap-2">
                                                   <Badge variant="outline" className="text-[10px] h-5 border-primary/20 bg-primary/5 text-primary">
                                                      {result.referral?.department}
                                                   </Badge>
                                                   <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                                                      <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span> Available
                                                   </span>
                                                </div>
                                             </div>
                                          </div>
                                       )) || <p className="text-sm text-muted-foreground">No specific doctor assigned. Please wait at the front desk.</p>}
                                    </div>

                                    <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10 text-center">
                                       <h4 className="font-bold text-primary mb-1">You are in the Queue</h4>
                                       <p className="text-xs text-muted-foreground">
                                          Please enter the waiting area. Your estimated wait time is <strong>10 minutes</strong>.
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

                           {/* 3. EMERGENCY ACTIONS ROW */}
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


                  </div>
                  </motion.div>
               )}

               {/* --- VIEW 3: SELF CHECK-IN MODAL --- */}
               {step === "self-check-in" && (
                  <motion.div
                     key="self-check-in"
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                  >
                     <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
                           <div>
                              <h2 className="text-xl font-bold">Self Check-In</h2>
                              <p className="text-xs text-muted-foreground">For non-emergency cases only.</p>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => setStep("form")}>✕</Button>
                        </div>

                        <div className="p-6 space-y-4">
                           <div className="space-y-2">
                              <Label>Full Name</Label>
                              <Input
                                 placeholder="e.g. John Doe"
                                 {...register("name")}
                              />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <Label>Age</Label>
                                 <Input
                                    type="number"
                                    placeholder="30"
                                    {...register("age")}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <Label>Gender</Label>
                                 <Select value={watch("gender")} onValueChange={v => setValue("gender", v as any)}>
                                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="Male">Male</SelectItem>
                                       <SelectItem value="Female">Female</SelectItem>
                                       <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <Label>Symptoms</Label>
                              <Textarea
                                 placeholder="Briefly describe your symptoms..."
                                 rows={3}
                                 {...register("symptoms")}
                              />
                           </div>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/20">
                           <Button
                              className="w-full"
                              onClick={async () => {
                                 const values = form.getValues();
                                 const payload = {
                                    name: values.name,
                                    age: values.age ? Number(values.age) : 30,
                                    gender: values.gender || "Male",
                                    symptoms: values.symptoms || "General checkup"
                                 };

                                 try {
                                    // 1. Call simplified endpoint
                                    const res = await fetch(`${import.meta.env.VITE_FASTAPI_URL}/self-check-in`, {
                                       method: "POST",
                                       headers: { "Content-Type": "application/json" },
                                       body: JSON.stringify(payload)
                                    });
                                    const data = await res.json();

                                    // 2. Add to Supabase Queue (Real Queue Integration)
                                    const { error: dbError } = await supabase.from("patients").insert({
                                       name: payload.name,
                                       age: payload.age,
                                       gender: payload.gender,
                                       chief_complaint: payload.symptoms,
                                       risk_label: "LOW",
                                       risk_score: 0.1,
                                       department: data.referral?.department,
                                       explanation: data.details,
                                       // Default Vitals for Self Check-In (Stable)
                                       heart_rate: 75,
                                       systolic_bp: 120,
                                       diastolic_bp: 80,
                                       o2_saturation: 98,
                                       temperature: 37,
                                       respiratory_rate: 16,
                                       pain_score: 0,
                                       gcs_score: 15,
                                       arrival_mode: "Walk-in",
                                       user_id: (await supabase.auth.getUser()).data.user?.id || "00000000-0000-0000-0000-000000000000"
                                    });

                                    if (dbError) console.error("Queue Error:", dbError);

                                    // 3. Mark as Self Check-In for View Logic
                                    setResult({ ...data, isSelfCheckIn: true });
                                    setStep("result");
                                    toast.success("Check-In Successful", { description: "You have been added to the queue." });

                                 } catch (err) {
                                    console.error(err);
                                    toast.error("Check-In Failed");
                                 }
                              }}
                           >
                              Confirm Check-In
                           </Button>
                        </div>
                     </div>
                  

               </motion.div>
            )}

            </AnimatePresence>
         </main>
      </div>
   );
}