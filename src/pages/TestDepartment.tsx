import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientIntake() {
  const [result, setResult] = useState(null);
  
  // Simulate API response
  useEffect(() => {
    setTimeout(() => {
      const mockResult = {
        risk_score: 0.85,
        risk_label: "HIGH",
        details: "Critical condition detected",
        referral: {
          department: "Toxicology",
          doctors: [
            { name: "Dr. Smith", experience: 10, available: true }
          ]
        }
      };
      console.log("[TEST] Setting result:", mockResult);
      setResult(mockResult);
    }, 1000);
  }, []);

  return (
    <div>
      <h1>Department Display Test</h1>
      {result && (
        <div>
          <h2>Result Object:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          
          <h2>Department Display (Method 1 - Optional Chaining):</h2>
          <p>{result.referral?.department?.replace(/_/g, " ") || "General Medicine"}</p>
          
          <h2>Department Display (Method 2 - Explicit Checks):</h2>
          <p>{result && result.referral && result.referral.department 
            ? result.referral.department.replace(/_/g, " ") 
            : "General Medicine"}</p>
          
          <h2>Department Display (Method 3 - Direct Access):</h2>
          <p>{result.referral.department}</p>
        </div>
      )}
    </div>
  );
}
