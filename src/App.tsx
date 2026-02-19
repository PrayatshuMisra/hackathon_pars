import React, { useRef, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PatientIntake from "./pages/PatientIntake";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// --- STATIC BACKGROUND WITH OVERLAY ---
const ImageBackground = ({ src }: { src: string }) => {
  return (
    <div className="fixed inset-0 min-w-full min-h-full overflow-hidden z-0 pointer-events-none bg-black">
      <img
        src={src}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Black Overlay */}
      <div className="absolute inset-0 w-full h-full bg-black/70 z-[5]"></div>
    </div>
  );
};
// --------------------------------------------

const InnerApp = () => {
    // We need useLocation, so this component must be inside BrowserRouter
    const { pathname } = useLocation();
    const isLoginPage = pathname === "/login";

    return (
        <>
            {!isLoginPage && (
                <ImageBackground src="/rest-bg.png" />
            )}
            
            <div style={{ position: 'relative', zIndex: 10 }}>
                <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/patient" element={<PatientIntake />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </div>
        </>
    );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <InnerApp />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;