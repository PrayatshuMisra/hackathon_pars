import { useState } from "react";

const API_URL = import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000";

export interface PatientInput {
  Age: number;
  Gender: string;
  Heart_Rate: number;
  Systolic_BP: number;
  Diastolic_BP: number;
  O2_Saturation: number;
  Temperature: number;
  Respiratory_Rate: number;
  Pain_Score: number;
  GCS_Score: number;
  Arrival_Mode: string;
  Diabetes: boolean;
  Hypertension: boolean;
  Heart_Disease: boolean;
  Chief_Complaint?: string;
}

export interface Doctor {
  name: string;
  experience: number;
  available: boolean;
}

export interface ReferralData {
  department: string;
  doctors: Doctor[];
}

export interface TriageResult {
  risk_score: number;
  risk_label: string;
  details: string;
  referral?: ReferralData;
  isSelfCheckIn?: boolean;
}

export function useTriage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);

  const predict = async (data: PatientInput): Promise<TriageResult | null> => {
    setLoading(true);
    setResult(null); // Clear previous result to avoid "flash" of old data
    setError(null);
    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const triageResult: TriageResult = await response.json();
      console.log("[useTriage] API Response:", triageResult);
      setResult(triageResult);
      return triageResult;
    } catch (err: any) {
      console.error("[useTriage] API Call Failed:", err);
      const message = err.message || "Failed to connect to triage API";
      setError(message);
      // Fallback: client-side rule-based scoring
      const fallback = clientSideFallback(data);
      console.log("[useTriage] Using Fallback:", fallback);
      setResult(fallback);
      return fallback;
    } finally {
      setLoading(false);
    }
  };

  const selfCheckIn = async (data: SelfCheckInInput): Promise<TriageResult | null> => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/self-check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const triageResult: TriageResult = await response.json();
      const finalResult = { ...triageResult, isSelfCheckIn: true };
      setResult(finalResult);
      return finalResult;
    } catch (err: any) {
      console.error("[useTriage] Self Check-In Failed:", err);
      setError(err.message || "Failed to process self check-in");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { predict, selfCheckIn, loading, error, result, setResult };
}

export interface SelfCheckInInput {
  name: string;
  age: number;
  gender: string;
  symptoms: string;
}

function clientSideFallback(data: PatientInput): TriageResult {
  // Hybrid guardrails
  if (data.Heart_Rate > 180 || data.Systolic_BP < 70 || data.O2_Saturation < 85) {
    return {
      risk_score: 0.99,
      risk_label: "HIGH",
      details: "⚠️ Critical vitals detected: " +
        (data.Heart_Rate > 180 ? "Severe tachycardia. " : "") +
        (data.Systolic_BP < 70 ? "Hypotension detected. " : "") +
        (data.O2_Saturation < 85 ? "Dangerous hypoxemia. " : ""),
    };
  }

  let score = 0;
  // Age risk
  if (data.Age > 70) score += 0.15;
  else if (data.Age > 50) score += 0.08;
  // Heart rate
  if (data.Heart_Rate > 120) score += 0.15;
  else if (data.Heart_Rate > 100) score += 0.08;
  else if (data.Heart_Rate < 50) score += 0.12;
  // Blood pressure
  if (data.Systolic_BP < 90) score += 0.15;
  else if (data.Systolic_BP > 180) score += 0.12;
  // O2
  if (data.O2_Saturation < 90) score += 0.2;
  else if (data.O2_Saturation < 94) score += 0.1;
  // Temperature
  if (data.Temperature > 39.5) score += 0.1;
  else if (data.Temperature < 35) score += 0.12;
  // GCS
  if (data.GCS_Score <= 8) score += 0.25;
  else if (data.GCS_Score <= 12) score += 0.12;
  // Pain
  if (data.Pain_Score >= 8) score += 0.1;
  // Respiratory rate
  if (data.Respiratory_Rate > 30) score += 0.12;
  else if (data.Respiratory_Rate < 10) score += 0.15;
  // History
  if (data.Diabetes) score += 0.05;
  if (data.Hypertension) score += 0.05;
  if (data.Heart_Disease) score += 0.08;
  // Ambulance
  if (data.Arrival_Mode === "Ambulance") score += 0.08;

  const finalScore = Math.min(score, 0.99);
  const label = finalScore >= 0.75 ? "HIGH" : finalScore >= 0.40 ? "MEDIUM" : "LOW";

  const details: string[] = [];
  if (data.Heart_Rate > 120) details.push("Elevated heart rate");
  if (data.Systolic_BP < 90) details.push("Low blood pressure");
  if (data.O2_Saturation < 94) details.push("Low oxygen saturation");
  if (data.GCS_Score <= 12) details.push("Reduced consciousness");
  if (data.Temperature > 39.5) details.push("High fever");
  if (data.Pain_Score >= 8) details.push("Severe pain");
  if (details.length === 0) details.push("Vitals within acceptable range");

  return {
    risk_score: Math.round(finalScore * 100) / 100,
    risk_label: label,
    details: details.join(". ") + ".",
    referral: {
      department: "General Medicine",
      doctors: []
    }
  };
}
