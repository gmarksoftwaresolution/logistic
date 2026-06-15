import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ArrowLeft,
  Users, Truck, Home, Handshake, CheckCircle2, MapPin,
  Activity, Building2, User, Smartphone
} from 'lucide-react';
import mainImg from '../assets/main.png';
import logoImg from '../assets/logo.png';

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export const GramunatiLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="#073318" opacity="0.1" />
    <circle cx="50" cy="50" r="35" fill="white" />
    {/* Intersecting logistics nodes */}
    <path d="M50 20 C66.5685 20 80 33.4315 80 50 C80 66.5685 66.5685 80 50 80 C33.4315 80 20 66.5685 20 50" stroke="#073318" strokeWidth="8" strokeLinecap="round" />
    <path d="M50 80 C33.4315 80 20 66.5685 20 50 C20 33.4315 33.4315 20 50 20" stroke="#B2D534" strokeWidth="8" strokeLinecap="round" strokeDasharray="12 12" />
    <circle cx="50" cy="50" r="12" fill="#073318" />
    <circle cx="50" cy="50" r="6" fill="#B2D534" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showAuth, setShowAuth] = useState(false);
  
  // Steps Control
  const [loginStep, setLoginStep] = useState<'mobile' | 'otp'>('mobile');
  const [signupStep, setSignupStep] = useState<'mobile' | 'otp' | 'hub-info' | 'contact-info'>('mobile');

  // Input Values
  const [mobileNum, setMobileNum] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const [hubName, setHubName] = useState('');
  const [hubArea, setHubArea] = useState('');
  const [areaHubMobile, setAreaHubMobile] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactMobile, setContactMobile] = useState('');

  // States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Countdown Timer Effect for Resend OTP
  React.useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Resend OTP Action Handler
  const handleResendOtp = () => {
    setErrorMsg('');
    setSuccessMsg('OTP code has been resent successfully!');
    setResendTimer(90); // Reset timer to 90 seconds
    setOtpDigits(['', '', '', '', '', '']);
    setOtpVal('');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 6-Digit OTP digit box key input tracking handlers
  const handleOtpDigitChange = (value: string, index: number) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setOtpVal(newDigits.join(''));

    // Shift focus forward if digit is filled
    if (cleanVal && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setOtpVal(newDigits.join(''));
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setOtpVal(newDigits.join(''));
      }
    }
  };

  // Handlers for Login
  const handleGetLoginOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!mobileNum || mobileNum.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/check-mobile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNum,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMsg(data.message || "This mobile number is not registered. Please sign up first.");
        return;
      }

      setSuccessMsg('OTP sent successfully to ' + mobileNum);
      setResendTimer(90); // Start 90s timer
      setOtpDigits(['', '', '', '', '', '']);
      setOtpVal('');
      setTimeout(() => {
        setLoginStep('otp');
        setSuccessMsg('');
      }, 500);
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  const handleVerifyLoginOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (otpVal.length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }
    
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: mobileNum,
          otp: otpVal,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMsg(data.message || "Invalid Mobile Number or OTP");
        return;
      }

      // Save credentials for subsequent API calls
      localStorage.setItem("gmu_token", data.token);
      localStorage.setItem("gmu_user", JSON.stringify(data.user));

      setSuccessMsg('Login Successful! Redirecting...');
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1200);
    } catch (err) {
      setErrorMsg("Unable to connect to backend on http://localhost:5000. Ensure server is running.");
    }
  };

  // Handlers for Signup
  const handleGetSignupOtp = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!mobileNum || mobileNum.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSuccessMsg('OTP sent successfully to ' + mobileNum);
    setResendTimer(90); // Start 90s timer
    setOtpDigits(['', '', '', '', '', '']);
    setOtpVal('');
    setTimeout(() => {
      setSignupStep('otp');
      setSuccessMsg('');
    }, 1000);
  };

  const handleVerifySignupOtp = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (otpVal.length < 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }
    setSuccessMsg('Mobile verified! Proceeding to Hub setup...');
    setTimeout(() => {
      setSignupStep('hub-info');
      setSuccessMsg('');
    }, 1000);
  };

  const handleHubInfoNext = () => {
    setErrorMsg('');
    if (!hubName.trim()) {
      setErrorMsg('Hub Name is a required field.');
      return;
    }
    if (!hubArea.trim()) {
      setErrorMsg('Hub Area (City) is a required field.');
      return;
    }
    setSignupStep('contact-info');
  };

  const handleContactInfoSubmit = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!contactName.trim()) {
      setErrorMsg('Contact Person Name is a required field.');
      return;
    }
    if (!contactMobile || contactMobile.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for the contact person.');
      return;
    }
    setSuccessMsg('Account registered successfully! Redirecting...');
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1200);
  };

  const renderAlerts = () => (
    <div className="relative min-h-[30px] z-10 w-full mb-1">
      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div 
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs md:text-sm font-normal text-red-600 text-left py-1 flex items-start gap-1.5"
          >
            <span className="mt-[2px]">⚠️</span>
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs md:text-sm font-normal text-[#073318] text-left py-1 flex items-start gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[#073318] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={`w-full min-h-screen relative overflow-hidden font-sans select-none transition-colors duration-700 bg-[#05080E] text-slate-100`}>
      
      {/* Background radial glowing effects / Cinematic lighting */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[800px] w-[800px] rounded-full filter blur-[180px] bg-emerald-950/30 opacity-70" />
        <div className="absolute top-[20%] right-[-10%] h-[750px] w-[750px] rounded-full filter blur-[200px] bg-[#B2D534]/5 opacity-55" />
        <div className="absolute bottom-[-10%] left-[20%] h-[600px] w-[600px] rounded-full filter blur-[150px] bg-emerald-900/20 opacity-40" />
      </div>

      {/* Slide transitions container for vertical slide animation */}
      <div className="w-full h-screen relative overflow-hidden">
        
        {/* ==========================================
            1. HERO SCREEN SECTION (100vh)
            ========================================== */}
        <motion.div
          animate={{ y: showAuth ? "-100vh" : "0vh" }}
          transition={{ type: "spring", stiffness: 90, damping: 20, mass: 0.8 }}
          className="w-full h-full flex flex-col justify-between p-6 md:p-8 relative select-none overflow-y-auto lg:overflow-hidden"
        >
          {/* Photo background matching the uploaded design */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <img src={mainImg} alt="Valley Background photo" className="w-full h-full object-cover object-center blur-[3px]" />
          </div>

          {/* Centered Logo / Header section */}
          <header className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center pt-6 z-10">
            <img src={logoImg} alt="Gramunati Logo" className="h-16 w-16 object-contain" />
            <h1 className="font-sans font-semibold text-2xl text-[#102a1c] tracking-tight mt-3">
              Gramunati Hub
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-[1.5px] w-6 bg-[#135d30]" />
              <span className="text-[10px] font-semibold text-[#135d30] uppercase tracking-widest leading-none">
                Logistics Coop
              </span>
              <div className="h-[1.5px] w-6 bg-[#135d30]" />
            </div>
          </header>

          {/* Center-aligned Title / CTA area with a smooth radial glowing white shade underneath instead of a visible box */}
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-5 z-10 my-auto relative">
            {/* Smooth glowing white sunburst radial shade */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[380px] rounded-full bg-white/45 filter blur-[90px] pointer-events-none -z-10" />
            <h2 className="font-sans font-bold text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[1.05] drop-shadow-sm">
              <span className="text-[#102a1c]">Empowering</span>
              <br />
              <span className="text-[#135d30]">Rural Logistics.</span>
            </h2>
            
            {/* Small Leaf/Circle Decorator */}
            <div className="flex items-center justify-center gap-3 py-1">
              <div className="h-[1.5px] w-14 bg-[#135d30]/30" />
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#135d30]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#B2D534] border border-[#135d30]" />
                <div className="h-1.5 w-1.5 rounded-full bg-[#135d30]" />
              </div>
              <div className="h-[1.5px] w-14 bg-[#135d30]/30" />
            </div>

            <p className="text-[#1c2d22] text-sm sm:text-base font-semibold max-w-xl leading-relaxed">
              Welcome to Gramunati Hub node. Manage Self-Help Groups (SHGs), schedule fleet dispatchers, and monitor cargo operations with maximum data integrity.
            </p>

            {/* Start Now Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginStep('mobile');
                setErrorMsg('');
                setSuccessMsg('');
                setShowAuth(true);
              }}
              className="h-[60px] px-9 rounded-2xl bg-[#073318] hover:bg-[#0a4d23] text-white shadow-[0_8px_25px_rgba(7,51,24,0.45)] hover:shadow-[0_12px_30px_rgba(7,51,24,0.6)] hover:scale-[1.01] transition-all duration-300 font-sans font-semibold text-sm uppercase tracking-widest cursor-pointer flex items-center justify-center gap-4 group mt-3 border border-white/10"
            >
              <span>Start Now</span>
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-white transition-transform group-hover:translate-x-1 shrink-0 shadow-sm">
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </div>
            </button>
          </div>

          {/* Bottom glassy stat pill */}
          <div className="w-full max-w-5xl mx-auto bg-[#0a2717]/85 backdrop-blur-xl rounded-[28px] px-6 py-4.5 flex flex-wrap items-center justify-around gap-4 border border-white/10 shadow-[0_20px_50px_rgba(7,51,24,0.35)] z-10 mb-4">
            {[
              { val: "500+", lbl: "SHGs Verified", icon: Users },
              { val: "1,200+", lbl: "Deliveries Done", icon: Truck },
              { val: "50+", lbl: "Regional Hubs", icon: Home },
              { val: "250+", lbl: "Transporters", icon: Handshake },
              { val: "99.8%", lbl: "Dispatcher On-Time", icon: Activity }
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3.5 py-1 px-1">
                <div className="h-9 w-9 rounded-full bg-[#B2D534]/15 flex items-center justify-center text-[#B2D534] border border-[#B2D534]/20 shrink-0">
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-left flex flex-col justify-center">
                  <span className="font-sans font-normal text-sm text-white tracking-tight leading-none">{stat.val}</span>
                  <span className="text-[9px] text-[#B2D534] font-normal uppercase tracking-wider mt-1">{stat.lbl}</span>
                </div>
              </div>
            ))}
          </div>

        </motion.div>

        {/* ==========================================
            2. AUTHENTICATION VIEW SCREEN (100vh)
            ========================================== */}
        <motion.div
          animate={{ y: showAuth ? "0vh" : "100vh" }}
          transition={{ type: "spring", stiffness: 90, damping: 20, mass: 0.8 }}
          className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 md:p-6 pb-2 z-20 overflow-y-auto lg:overflow-hidden"
        >
          {/* Clean light gradient background from the theme and soft glowing ambient lighting */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none bg-gradient-to-tr from-[#F2F4F7] via-[#ebf1e4] to-[#f5f8f2] overflow-hidden">
            {/* Ambient green glow blob in the bottom left with smooth drifting floating motion */}
            <motion.div 
              animate={{ 
                scale: [1, 1.08, 1],
                x: [0, 25, 0],
                y: [0, -25, 0] 
              }}
              transition={{ 
                duration: 14, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full filter blur-[150px] bg-[#B2D534]/18 opacity-45 pointer-events-none" 
            />
            {/* Ambient forest green glow blob in the top right with smooth drifting floating motion */}
            <motion.div 
              animate={{ 
                scale: [1, 1.12, 1],
                x: [0, -35, 0],
                y: [0, 35, 0] 
              }}
              transition={{ 
                duration: 18, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="absolute -top-40 -right-40 h-[650px] w-[650px] rounded-full filter blur-[180px] bg-[#073318]/5 opacity-35 pointer-events-none" 
            />
          </div>
          
          {/* FLOATING NAVBAR WITH ONLY BACK BUTTON */}
          <header className="w-full max-w-7xl mx-auto z-50">
            <div className="w-full px-6 py-4 flex items-center justify-start">
              {/* Back CTA home link */}
              <button 
                type="button"
                onClick={() => setShowAuth(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#073318]/90 backdrop-blur-xl shadow-lg border border-white/10 hover:bg-[#073318] transition-all text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Home</span>
              </button>
            </div>
          </header>

          {/* MAIN CENTERED AUTH CARD SECTION */}
          <div className="w-full max-w-[560px] mx-auto flex items-center justify-center my-auto px-6 z-10 py-4 relative">
            <div className="w-full">
              <div className="w-full p-8 md:p-10 rounded-[36px] border border-slate-200/60 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.12)] hover:shadow-[0_32px_75px_rgba(0,0,0,0.18)] transition-shadow duration-500 relative overflow-hidden flex flex-col">
                
                {/* Header Greeting greeting */}
                <div className="text-center mb-6">
                  <h3 className="font-sans font-semibold text-2xl tracking-tight text-[#073318] leading-none">
                    {activeTab === 'login' ? "Welcome Back! 👋" : "Register New Hub 🌾"}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    {activeTab === 'login' 
                      ? "Log in using your registered mobile number & OTP verification."
                      : "Create a new hub coordinator profile on the Gramunati Network."
                    }
                  </p>
                </div>



                {/* SLIDING WIZARD FORMS AREA */}
                <div className="overflow-hidden relative min-h-[280px]">
                  <AnimatePresence mode="wait">
                    
                    {/* A. LOGIN WIZARD TAB */}
                    {activeTab === 'login' && (
                      <motion.div
                        key="login-tab"
                        initial={{ x: -24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -24, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="space-y-4"
                      >
                        
                        {/* Step 1: Mobile Input view */}
                        {loginStep === 'mobile' && (
                          <div className="space-y-4">
                            <div className="space-y-2 text-left">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Mobile Number
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                  <Smartphone className="h-4 w-4" />
                                </span>
                                <input
                                  type="tel"
                                  placeholder="Enter 10-digit mobile number"
                                  value={mobileNum}
                                  onChange={(e) => setMobileNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                  className="w-full h-[54px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold tracking-[0.2em] text-[#073318] placeholder-slate-400 placeholder:font-normal placeholder:tracking-normal outline-none"
                                />
                              </div>
                            </div>

                            {renderAlerts()}

                            <motion.button
                              type="button"
                              onClick={handleGetLoginOtp}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="w-full h-[54px] py-3 px-6 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all bg-[#073318] hover:bg-[#0a4d23] text-white shadow-lg flex items-center justify-between cursor-pointer group mt-4"
                            >
                              <span className="mx-auto">Get verification OTP</span>
                              <div className="h-6 w-6 rounded-lg bg-[#073318]/10 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                              </div>
                            </motion.button>
                          </div>
                        )}

                        {/* Step 2: OTP Input Verification view */}
                        {loginStep === 'otp' && (
                          <div className="space-y-4">
                            <div className="space-y-2 text-left">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Verification OTP Code
                              </label>
                              <div className="grid grid-cols-6 gap-2">
                                {otpDigits.map((dig, idx) => (
                                  <input
                                    key={idx}
                                    id={`otp-input-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={dig}
                                    onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                    className="h-[54px] w-full text-center rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-lg font-semibold text-[#073318] outline-none"
                                  />
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1">
                                <button
                                  type="button"
                                  onClick={() => setLoginStep('mobile')}
                                  className="text-slate-500 hover:text-[#073318] font-medium transition-colors underline cursor-pointer"
                                >
                                  Edit Mobile Number
                                </button>
                                <div>
                                  {resendTimer > 0 ? (
                                    <span className="text-slate-500 font-medium select-none">
                                      Resend in {formatTimer(resendTimer)}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleResendOtp}
                                      className="text-[#B2D534] hover:underline font-semibold transition-colors cursor-pointer"
                                    >
                                      Resend OTP Code
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {renderAlerts()}

                            <motion.button
                              type="button"
                              onClick={handleVerifyLoginOtp}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="w-full h-[54px] py-3 px-6 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all bg-[#073318] hover:bg-[#0a4d23] text-white shadow-lg flex items-center justify-between cursor-pointer group mt-4"
                            >
                              <span className="mx-auto">Verify & Login Node</span>
                              <div className="h-6 w-6 rounded-lg bg-[#073318]/10 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                              </div>
                            </motion.button>
                          </div>
                        )}

                      </motion.div>
                    )}

                    {/* B. SIGN UP WIZARD TAB */}
                    {activeTab === 'signup' && (
                      <motion.div
                        key="signup-tab"
                        initial={{ x: 24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 24, opacity: 0 }}
                        transition={{ duration: 0.22, ease: "easeInOut" }}
                        className="space-y-4"
                      >
                        
                        {/* Step 1: Mobile Input view */}
                        {signupStep === 'mobile' && (
                          <div className="space-y-4">
                            <div className="space-y-2 text-left">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Mobile Number
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                  <Smartphone className="h-4 w-4" />
                                </span>
                                <input
                                  type="tel"
                                  placeholder="Enter 10-digit mobile number"
                                  value={mobileNum}
                                  onChange={(e) => setMobileNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                  className="w-full h-[54px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold tracking-[0.2em] text-[#073318] placeholder-slate-400 placeholder:font-normal placeholder:tracking-normal outline-none"
                                />
                              </div>
                            </div>

                            {renderAlerts()}

                            <motion.button
                              type="button"
                              onClick={handleGetSignupOtp}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="w-full h-[54px] py-3 px-6 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all bg-[#073318] hover:bg-[#0a4d23] text-white shadow-lg flex items-center justify-between cursor-pointer group mt-4"
                            >
                              <span className="mx-auto">Get registration OTP</span>
                              <div className="h-6 w-6 rounded-lg bg-[#073318]/10 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                              </div>
                            </motion.button>
                          </div>
                        )}

                        {/* Step 2: OTP Verification view */}
                        {signupStep === 'otp' && (
                          <div className="space-y-4">
                            <div className="space-y-2 text-left">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                Verification OTP Code
                              </label>
                              <div className="grid grid-cols-6 gap-2">
                                {otpDigits.map((dig, idx) => (
                                  <input
                                    key={idx}
                                    id={`otp-input-${idx}`}
                                    type="text"
                                    maxLength={1}
                                    value={dig}
                                    onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                                    onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                    className="h-[54px] w-full text-center rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-lg font-semibold text-[#073318] outline-none"
                                  />
                                ))}
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSignupStep('mobile')}
                                  className="text-slate-500 hover:text-[#073318] font-medium transition-colors underline cursor-pointer"
                                >
                                  Edit Mobile Number
                                </button>
                                <div>
                                  {resendTimer > 0 ? (
                                    <span className="text-slate-500 font-medium select-none">
                                      Resend in {formatTimer(resendTimer)}
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={handleResendOtp}
                                      className="text-[#B2D534] hover:underline font-semibold transition-colors cursor-pointer"
                                    >
                                      Resend OTP Code
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {renderAlerts()}

                            <motion.button
                              type="button"
                              onClick={handleVerifySignupOtp}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="w-full h-[54px] py-3 px-6 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all bg-[#073318] hover:bg-[#0a4d23] text-white shadow-lg flex items-center justify-between cursor-pointer group mt-4"
                            >
                              <span className="mx-auto">Verify & Continue</span>
                              <div className="h-6 w-6 rounded-lg bg-[#073318]/10 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                              </div>
                            </motion.button>
                          </div>
                        )}

                        {/* Step 3: Hub Profile setup view */}
                        {signupStep === 'hub-info' && (
                          <div className="space-y-4">
                            <div className="space-y-3 text-left">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Hub Name
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                    <Building2 className="h-4 w-4" />
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Enter cooperative hub name"
                                    value={hubName}
                                    onChange={(e) => setHubName(e.target.value)}
                                    className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold text-[#073318] placeholder-slate-400 placeholder:font-normal outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Hub Area / City
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                    <MapPin className="h-4 w-4" />
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Enter target service area/city"
                                    value={hubArea}
                                    onChange={(e) => setHubArea(e.target.value)}
                                    className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold text-[#073318] placeholder-slate-400 placeholder:font-normal outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Area Hub Mobile (Optional)
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                    <Smartphone className="h-4 w-4" />
                                  </span>
                                  <input
                                    type="tel"
                                    placeholder="Enter alternative mobile number"
                                    value={areaHubMobile}
                                    onChange={(e) => setAreaHubMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold tracking-[0.2em] text-[#073318] placeholder-slate-400 placeholder:font-normal placeholder:tracking-normal outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {renderAlerts()}

                            <motion.button
                              type="button"
                              onClick={handleHubInfoNext}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              className="w-full h-[54px] py-3 px-6 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all bg-[#073318] hover:bg-[#0a4d23] text-white shadow-lg flex items-center justify-between cursor-pointer group mt-4"
                            >
                              <span className="mx-auto">Continue to contact details</span>
                              <div className="h-6 w-6 rounded-lg bg-[#073318]/10 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                              </div>
                            </motion.button>
                          </div>
                        )}

                        {/* Step 4: Contact details setup view */}
                        {signupStep === 'contact-info' && (
                          <div className="space-y-4">
                            <div className="space-y-3 text-left">
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Contact Person Name
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                    <User className="h-4 w-4" />
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Enter full name of manager"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold text-[#073318] placeholder-slate-400 placeholder:font-normal outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                  Contact Person Mobile Number
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                                    <Smartphone className="h-4 w-4" />
                                  </span>
                                  <input
                                    type="tel"
                                    placeholder="Enter 10-digit mobile number"
                                    value={contactMobile}
                                    onChange={(e) => setContactMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="w-full h-[52px] pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:border-[#B2D534] focus:ring-2 focus:ring-[#B2D534]/15 transition-all text-sm font-semibold tracking-[0.2em] text-[#073318] placeholder-slate-400 placeholder:font-normal placeholder:tracking-normal outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {renderAlerts()}

                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setSignupStep('hub-info')}
                                className="h-[54px] px-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all font-semibold text-xs uppercase tracking-widest text-white cursor-pointer"
                              >
                                Back
                              </button>

                              <motion.button
                                type="button"
                                onClick={handleContactInfoSubmit}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="flex-1 h-[54px] py-3 px-6 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all bg-[#073318] hover:bg-[#0a4d23] text-white shadow-lg flex items-center justify-between cursor-pointer group"
                              >
                                <span className="mx-auto">Submit registration</span>
                                <div className="h-6 w-6 rounded-lg bg-[#073318]/10 flex items-center justify-center transition-transform group-hover:translate-x-1 shrink-0">
                                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                                </div>
                              </motion.button>
                            </div>
                          </div>
                        )}

                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>



                {/* BOTTOM REDIRECT CTA LINK */}
                <div className="text-center pt-5 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'login') {
                        setActiveTab('signup');
                        setSignupStep('mobile');
                        setMobileNum('');
                        setOtpVal('');
                        setHubName('');
                        setAreaHubMobile('');
                        setContactName('');
                        setContactMobile('');
                      } else {
                        setActiveTab('login');
                        setLoginStep('mobile');
                        setMobileNum('');
                        setOtpVal('');
                      }
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-semibold text-[11px] text-[#073318] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer group/sign"
                  >
                    <span>
                      {activeTab === 'login' ? "Don’t have an account? Sign Up" : "Already registered? Login"}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 stroke-[2.5] group-hover/sign:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* EMPTY FOOTER GIVING BALANCED DEPTH */}
          <footer className="w-full text-center text-[10px] text-[#135d30] font-semibold tracking-widest uppercase py-2 z-10">
            © 2026 Gramunati Commerce Network • Secure Node
          </footer>

        </motion.div>

      </div>
    </div>
  );
};
