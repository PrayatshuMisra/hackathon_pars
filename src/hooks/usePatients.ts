import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Patient {
  id: string;
  user_id: string;
  name: string;
  age: number;
  gender: string;
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  o2_saturation: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  pain_score: number | null;
  gcs_score: number | null;
  arrival_mode: string;
  diabetes: boolean | null;
  hypertension: boolean | null;
  heart_disease: boolean | null;
  risk_score: number | null;
  risk_label: string | null;
  explanation: string | null;
  department?: string | null;
  chief_complaint?: string | null;
  created_at: string;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Helper to ensure risk sorting is consistent
  const sortPatients = (list: Patient[]) => sortByRisk(list);

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPatients(sortPatients(data as Patient[]));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;

    // 1. Initial Fetch
    fetchPatients();

    // 2. Realtime Subscription (Optimized)
    const channel = supabase
      .channel("patients-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "patients" },
        (payload) => {
          const newPatient = payload.new as Patient;

          setPatients((prev) => {
            // Prevent duplicates if Optimistic UI already added it
            if (prev.some((p) => p.id === newPatient.id)) return prev;
            return sortPatients([newPatient, ...prev]);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 3. Auto-Discharge Logic (The Queue Filter)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      const active = patients.filter(p => {
        const createdAt = new Date(p.created_at);
        const timeDiff = now.getTime() - createdAt.getTime();

        let retentionTime = 45 * 1000; // Default for LOW and unknown (45s)

        if (p.risk_label === "HIGH") {
          retentionTime = 30 * 1000; // 30 minutes
        } else if (p.risk_label === "MEDIUM") {
          retentionTime = 40 * 1000; // 40 seconds
        }

        return timeDiff < retentionTime;
      });

      // Only update state if count changes to prevent re-render flickers
      setActivePatients(prev => {
        if (prev.length === active.length && prev.every((p, i) => p.id === active[i].id)) return prev;
        return active;
      });

    }, 1000);

    return () => clearInterval(interval);
  }, [patients]);

  const addPatient = async (patient: Omit<Patient, "id" | "user_id" | "created_at">) => {
    if (!user) return null;
    const { ...patientData } = patient; // Keep department in patientData

    // A. Optimistic Update (Immediate UI feedback)
    const tempId = crypto.randomUUID();
    const tempPatient = {
      ...patient,
      id: tempId,
      user_id: user.id,
      created_at: new Date().toISOString(),
      department: patient.department || null,
      chief_complaint: patient.chief_complaint || null,
    } as Patient;

    setPatients(prev => sortPatients([tempPatient, ...prev]));

    // B. Actual DB Insert
    const { data, error } = await supabase
      .from("patients")
      .insert({ ...patientData, user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      // Rollback on error
      setPatients(prev => prev.filter(p => p.id !== tempId));
      return null;
    }

    const confirmedPatient = data as Patient;

    // C. Reconcile Optimistic with Real Data
    setPatients(prev =>
      sortPatients(prev.map(p => (p.id === tempId ? confirmedPatient : p)))
    );

    return confirmedPatient;
  };

  return { activePatients, patients, loading, addPatient };
}

// Sorting Utility
function sortByRisk(patients: Patient[]): Patient[] {
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...patients].sort((a, b) => {
    const aOrder = order[a.risk_label || "LOW"] ?? 3;
    const bOrder = order[b.risk_label || "LOW"] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}