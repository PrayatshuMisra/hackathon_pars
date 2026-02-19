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

// --- SEAMLESS VIDEO LOOPER WITH OVERLAY ---
const SeamlessBackground = ({ src }: { src: string }) => {
  const [activeVideo, setActiveVideo] = useState(1);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const currentVideo = e.currentTarget;
    const timeLeft = currentVideo.duration - currentVideo.currentTime;
    const CROSSFADE_TIME = 1.5; // Start overlapping 1.5s before end

    // If we are near the end, start the OTHER video
    if (timeLeft < CROSSFADE_TIME) {
      const nextVideo = activeVideo === 1 ? videoRef2.current : videoRef1.current;
      
      // If the next video is paused, play it and swap active state
      if (nextVideo && nextVideo.paused) {
        nextVideo.currentTime = 0;
        nextVideo.play();
        setActiveVideo(activeVideo === 1 ? 2 : 1);
      }
    }
  };

  // Helper to determine opacity based on active state
  const getOpacity = (id: number) => (activeVideo === id ? 1 : 0);

  return (
    <div className="fixed inset-0 min-w-full min-h-full overflow-hidden z-0 pointer-events-none bg-black">
      {/* Video 1 */}
      <video
        ref={videoRef1}
        autoPlay
        muted
        playsInline
        onTimeUpdate={activeVideo === 1 ? handleTimeUpdate : undefined}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-linear"
        style={{ opacity: getOpacity(1) }} // Filter removed here
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Video 2 (Buffer) */}
      <video
        ref={videoRef2}
        muted
        playsInline
        onTimeUpdate={activeVideo === 2 ? handleTimeUpdate : undefined}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-linear"
        style={{ opacity: getOpacity(2) }} // Filter removed here
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* --- NEW BLACK OVERLAY LAYER --- */}
      {/* bg-black/60 sets a black background with 60% opacity. 
         Change '/60' to make it darker (/80) or lighter (/40).
      */}
      <div className="absolute inset-0 w-full h-full bg-black/60 z-[5]"></div>
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
                <SeamlessBackground src="/rest-site.mp4" />
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