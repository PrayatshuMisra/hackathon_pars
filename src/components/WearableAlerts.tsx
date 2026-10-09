import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Activity, BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

export default function WearableAlerts() {
  const { t } = useTranslation();
  const [criticalVitals, setCriticalVitals] = useState<any>(null);
  const [silencedUntil, setSilencedUntil] = useState<number>(0);
  
  const consecutiveCriticalRef = useRef(0);
  const CRITICAL_HR = 120;
  const CRITICAL_O2 = 85;
  const REQUIRED_CONSECUTIVE_SECONDS = 10;
  const SILENCE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Connect to the backend WebSocket
    const ws = new WebSocket("ws://localhost:8000/ws/dashboard");
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const vitals = data.vitals;
        
        // Check if currently silenced
        if (Date.now() < silencedUntil) {
           consecutiveCriticalRef.current = 0;
           setCriticalVitals(null);
           return;
        }

        const isCritical = vitals.Heart_Rate > CRITICAL_HR || vitals.O2_Saturation < CRITICAL_O2;
        
        if (isCritical) {
          consecutiveCriticalRef.current += 1;
          
          // Debounce: Only alert if critical for X consecutive seconds
          if (consecutiveCriticalRef.current >= REQUIRED_CONSECUTIVE_SECONDS) {
             setCriticalVitals({ patient_id: data.patient_id, ...vitals });
          }
        } else {
          // Reset if vitals return to normal
          consecutiveCriticalRef.current = 0;
          setCriticalVitals(null);
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [silencedUntil]);

  const handleAcknowledge = () => {
    setSilencedUntil(Date.now() + SILENCE_DURATION_MS);
    setCriticalVitals(null);
    consecutiveCriticalRef.current = 0;
    toast("Alarm Silenced", {
      description: "Wearable alerts muted for 5 minutes.",
      icon: <BellOff className="h-4 w-4" />
    });
  };

  return (
    <AnimatePresence>
      {criticalVitals && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-red-950/90 border-2 border-red-500 rounded-xl p-4 shadow-[0_0_50px_rgba(239,68,68,0.5)] backdrop-blur-md flex items-center justify-between"
        >
          <div className="flex items-center gap-4 text-red-50">
            <Activity className="h-8 w-8 animate-ping text-red-500" />
            <div>
              <h3 className="font-bold text-lg uppercase tracking-wider text-red-400">Critical Wearable Alert</h3>
              <p className="text-sm font-mono mt-1">
                Patient: <span className="text-white font-bold">{criticalVitals.patient_id}</span>
              </p>
              <div className="flex gap-4 mt-1 text-sm font-mono font-bold">
                <span className={criticalVitals.Heart_Rate > CRITICAL_HR ? "text-red-400" : ""}>
                  HR: {criticalVitals.Heart_Rate}
                </span>
                <span className={criticalVitals.O2_Saturation < CRITICAL_O2 ? "text-red-400" : ""}>
                  SpO2: {criticalVitals.O2_Saturation}%
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleAcknowledge}
            className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 px-4 rounded-lg uppercase text-xs tracking-wider transition-colors shadow-lg"
          >
            Acknowledge
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
