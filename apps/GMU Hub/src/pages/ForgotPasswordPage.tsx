import React, { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { GramunatiLogo } from './LandingPage';

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    // Simulate network latency
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage('Reset link has been dispatched to your email address!');
    }, 1200);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 md:p-6 transition-colors duration-500 font-sans ${theme === 'dark' ? 'bg-[#090D16]' : 'bg-[#F3F4F6]'}`}>
      
      <div className={`w-full max-w-md rounded-[2rem] p-8 md:p-10 shadow-2xl transition-colors duration-500 border ${
        theme === 'dark' 
          ? 'bg-[#0f172a]/60 backdrop-blur-xl border-slate-800 text-white' 
          : 'bg-white border-gray-100 text-slate-900'
      }`}>
        
        {/* Theme and Back actions */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => onNavigate('landing')}
            className={`flex items-center gap-2 text-xs font-semibold hover:underline cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>

          <div className={`flex items-center gap-2 p-1 rounded-full border shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
            <Sun className={`h-3.5 w-3.5 ${theme === 'light' ? 'text-amber-500' : 'text-gray-400'}`} />
            <button 
              onClick={handleThemeToggle}
              className="relative inline-flex h-4.5 w-8.5 items-center rounded-full transition-colors cursor-pointer outline-none"
              style={{ backgroundColor: theme === 'dark' ? '#0A5F38' : '#D1D5DB' }}
            >
              <span 
                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: theme === 'dark' ? 'translateX(16px)' : 'translateX(3px)' }}
              />
            </button>
            <Moon className={`h-3.5 w-3.5 ${theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-[#EBF7EE] rounded-2xl mb-4 text-brand-green">
            <GramunatiLogo className="h-9 w-9" />
          </div>
          <h2 className="font-display font-extrabold text-2xl tracking-tight">
            Forgot Password? 🔒
          </h2>
          <p className={`text-xs mt-2 max-w-[280px] mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Enter your email below and we will send you a secure link to reset your account credentials.
          </p>
        </div>

        {/* Form Alerts */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
            <span className="font-medium text-sm leading-none mt-0.5">!</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2.5">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 animate-pulse" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
              Registered Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="text"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || successMessage !== ''}
                className={`w-full text-sm pl-11 pr-4 py-3 rounded-xl border outline-none font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900/60 border-slate-700 text-white focus:border-brand-green focus:ring-1 focus:ring-brand-green'
                    : 'bg-white border-gray-300 text-slate-800 focus:border-brand-green focus:ring-1 focus:ring-brand-green'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || successMessage !== ''}
            className="w-full flex items-center justify-between bg-brand-green hover:bg-brand-green-hover text-white py-3.5 px-6 rounded-xl font-semibold shadow-lg shadow-brand-green/10 cursor-pointer transition-all hover:shadow-brand-green/20 group disabled:opacity-50 active:scale-[0.98]"
          >
            <span className="mx-auto select-none tracking-wide text-sm font-semibold">
              {isSubmitting ? 'Sending Request...' : 'Send Reset Link'}
            </span>
            <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center text-brand-green transition-transform duration-300 group-hover:translate-x-1 shrink-0">
              <ArrowRight className="h-4.5 w-4.5 stroke-[2.5]" />
            </div>
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('landing')}
            className="text-brand-green text-xs font-medium hover:underline cursor-pointer"
          >
            Return to Login Panel
          </button>
        </div>

      </div>

    </div>
  );
};
