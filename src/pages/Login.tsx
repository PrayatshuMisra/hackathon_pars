import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Globe, ArrowLeft, Activity, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Login() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [loginMode, setLoginMode] = useState<"selection" | "hospital">("selection");

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setMessage(t('login.verification_sent'));
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/");
    }

    setLoading(false);
  };

  return (
    // Reduced pt-24 to pt-10 to remove the large top gap
    <div className="relative h-screen w-full flex flex-col items-center justify-start pt-10 overflow-hidden bg-black text-white font-sans selection:bg-red-500/30">

      {/* --- BACKGROUND VIDEO --- */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
      >
        <source src="/login-vid.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* --- LANGUAGE SWITCHER --- */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1.5 rounded-lg border border-white/10 hover:border-red-500/50 transition-colors">
            <Globe className="h-3 w-3 text-white/70 ml-2" />
            <Select onValueChange={changeLanguage} defaultValue={i18n.language}>
                <SelectTrigger className="w-[90px] h-7 bg-transparent border-none text-[10px] uppercase tracking-wider text-white focus:ring-0">
                    <SelectValue placeholder="Lang" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="en">ENGLISH</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                    <SelectItem value="ta">தமிழ்</SelectItem>
                    <SelectItem value="te">తెలుగు</SelectItem>
                    <SelectItem value="bn">বাংলা</SelectItem>
                    <SelectItem value="pa">ਪੰਜਾਬੀ</SelectItem>
                    <SelectItem value="mr">मराठी</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* --- MAIN CONTENT CONTAINER --- */}
      {/* Reduced vertical gaps between elements (gap-2) for a tighter fit */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-4xl px-6 gap-2 md:gap-3">

        {/* 1. LOGO */}
        <motion.img
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          src="/logo.png"
          alt="PARS Logo"
          className="h-16 md:h-18 w-auto drop-shadow-[0_0_15px_rgba(255,0,0,0.4)]"
        />

        {/* 2. TITLES */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-0"
        >
          <h2 className="text-sm md:text-base font-medium tracking-[0.2em] text-gray-300 uppercase mb-0">
            {t('login.operation', 'OPERATION')}
          </h2>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-sm leading-tight">
            P.A.R.S.
          </h1>
          <div className="h-1 w-16 bg-red-600 mx-auto mt-2 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
        </motion.div>

        {/* 3. DESCRIPTION */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-gray-400 text-xs md:text-sm max-w-lg leading-relaxed pt-2"
        >
          {t('login.desc', 'A real-time clinical support interface engineered for high-pressure environments. Leverages predictive analytics to facilitate rapid acuity scoring, patient prioritization, and care coordination.')}
        </motion.p>

        {/* 4. SELECTION CARDS OR FORM */}
        <div className="w-full flex justify-center h-[180px] flex-shrink-0 mt-4">
          <AnimatePresence mode="wait">
            
            {loginMode === "selection" ? (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl"
              >
                {/* 🔴 HOSPITAL CARD */}
                <button
                  onClick={() => setLoginMode("hospital")}
                  className="
                    group relative flex flex-col items-center justify-center p-3 rounded-2xl 
                    border border-red-500/20 bg-red-950/10 backdrop-blur-md 
                    hover:bg-red-900/20 hover:border-red-500/50 hover:shadow-[0_0_30px_rgba(220,38,38,0.15)]
                    transition-all duration-300 w-full overflow-hidden h-full
                  "
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="h-8 w-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2 group-hover:bg-red-600 group-hover:text-white transition-all text-red-400">
                    <Activity className="h-4 w-4" />
                  </div>
                  
                  <h3 className="text-sm font-bold text-red-100 mb-0 tracking-wide group-hover:text-white transition-colors">
                    {t('login.hospital_attendant')}
                  </h3>
                  <span className="text-[8px] uppercase tracking-widest text-red-300/50 group-hover:text-red-300 transition-colors">
                    Authorized Personnel
                  </span>
                </button>

                {/* 🔵 PATIENT CARD */}
                <button
                  onClick={() => navigate("/patient")}
                  className="
                    group relative flex flex-col items-center justify-center p-3 rounded-2xl 
                    border border-blue-500/20 bg-blue-950/10 backdrop-blur-md 
                    hover:bg-blue-900/20 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]
                    transition-all duration-300 w-full overflow-hidden h-full
                  "
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-all text-blue-400">
                    <User className="h-4 w-4" />
                  </div>
                  
                  <h3 className="text-sm font-bold text-blue-100 mb-0 tracking-wide group-hover:text-white transition-colors">
                    {t('login.patient_login')}
                  </h3>
                  <span className="text-[8px] uppercase tracking-widest text-blue-300/50 group-hover:text-blue-300 transition-colors">
                    Self Check-In Kiosk
                  </span>
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm"
              >
                <Card className="bg-black/80 border-red-500/30 backdrop-blur-xl shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                  <CardHeader className="space-y-1 pb-2 pt-4 px-6">
                    <button 
                      onClick={() => setLoginMode("selection")}
                      className="flex items-center text-xs text-gray-500 hover:text-white mb-2 transition-colors w-fit"
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" /> {t('login.back')}
                    </button>
                    <CardTitle className="text-lg font-bold text-white text-center">
                      {isSignUp ? t('login.create_account') : t('login.secure_login')}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="px-6 pb-6 pt-0">
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400 ml-1">OFFICIAL EMAIL</Label>
                        <Input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ID@hospital.com"
                          className="h-9 text-xs bg-white/5 border-white/10 focus:border-red-500 focus:ring-0 text-white placeholder:text-gray-600"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400 ml-1">ACCESS CODE</Label>
                        <Input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••"
                          className="h-9 text-xs bg-white/5 border-white/10 focus:border-red-500 focus:ring-0 text-white placeholder:text-gray-600"
                        />
                      </div>

                      {error && (
                        <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 p-2 rounded text-[10px] text-red-300">
                          <AlertTriangle className="h-3 w-3" /> {error}
                        </div>
                      )}

                      {message && (
                        <div className="bg-green-950/50 border border-green-800 p-2 rounded text-[10px] text-green-300 text-center">
                          {message}
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider py-2 h-10 mt-1 text-xs"
                      >
                        {loading ? "AUTHENTICATING..." : (isSignUp ? "REGISTER ID" : "ACCESS SYSTEM")}
                      </Button>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
                          className="text-[10px] text-gray-500 hover:text-white transition-colors"
                        >
                          {isSignUp ? t('login.already_registered') : t('login.new_to_pars')} 
                          <span className="text-red-400 ml-1 underline underline-offset-2">
                            {isSignUp ? "Log In" : "Request Access"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}