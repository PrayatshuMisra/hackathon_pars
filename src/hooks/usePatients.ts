import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Patient {
  id: string;
  user_id: string;
  name: string;
  age: number;
  gender: string;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  o2_saturation: number;
  temperature: number;
  respiratory_rate: number;
  pain_score: number;
  gcs_score: number;
  arrival_mode: string;
  diabetes: boolean;
  hypertension: boolean;
  heart_disease: boolean;
  risk_score: number | null;
  risk_label: string | null;
  explanation: string | null;
  department?: string | null;  // Added field
  created_at: string;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPatients = async () => {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPatients(sortByRisk(data as Patient[]));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchPatients();

    const channel = supabase
      .channel("patients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        fetchPatients();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addPatient = async (patient: Omit<Patient, "id" | "user_id" | "created_at">) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("patients")
      .insert({ ...patient, user_id: user.id })
      .select()
      .single();
    if (error) { console.error("Insert error:", error); return null; }
    return data as Patient;
  };

  return { patients, loading, addPatient, refetch: fetchPatients };
}

function sortByRisk(patients: Patient[]): Patient[] {
  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return [...patients].sort((a, b) => {
    const aOrder = order[a.risk_label || "LOW"] ?? 3;
    const bOrder = order[b.risk_label || "LOW"] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
