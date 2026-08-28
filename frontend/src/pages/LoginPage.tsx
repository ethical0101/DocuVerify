import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanSearch, ShieldAlert, Sparkles, User, Lock, Terminal } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const slideInLeft = {
  hidden: { x: -40, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 90, damping: 18 } 
  }
};

const fadeInItem = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 100, damping: 15 } 
  }
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillCredentials(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demopass123");
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-ink-950 cyber-grid relative overflow-hidden">
      {/* Left Panel: Value Proposition & Aesthetics */}
      <motion.div 
        variants={slideInLeft}
        initial="hidden"
        animate="visible"
        className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-panel via-ink-950 to-ink-900 border-r border-border/40 relative overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/5 filter blur-3xl" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-accent/5 filter blur-3xl" />

        {/* Brand */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/35 flex items-center justify-center shadow-lg shadow-accent/5">
            <ScanSearch className="w-5 h-5 text-accent-bright" />
          </div>
          <span className="font-mono font-bold tracking-widest text-sm text-white">DOCUVERIFY</span>
        </div>

        {/* Cinematic copy */}
        <div className="max-w-xl my-auto space-y-8 z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/25 px-3.5 py-1 text-xs text-accent-bright font-mono">
              <Sparkles className="w-3.5 h-3.5" /> ENTERPRISE FORENSIC HUB
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Investigate authenticity through <span className="bg-gradient-to-r from-accent-bright to-signal-bright bg-clip-text text-transparent">evidence</span>, not just a binary verdict.
            </h1>
            <p className="text-white/60 leading-relaxed text-base font-sans">
              DocuVerify evaluates document uploads across visual forensics, optical typography anomalies, layout alignment, and natural language consistency to generate explainable alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-white/35 font-mono z-10 border-t border-border/20 pt-5">
          <span>SECURE PROTOCOL</span>
          <span>ESTIMATION VERSION 2.0</span>
        </div>
      </motion.div>

      {/* Right Panel: Login Form */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col justify-center px-6 sm:px-16 lg:px-20 py-12 relative z-10"
      >
        <div className="max-w-md w-full mx-auto space-y-8">
          <motion.div variants={fadeInItem} className="space-y-2">
            <div className="lg:hidden flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent-bright shadow-lg shadow-accent/10">
                <ScanSearch className="w-4 h-4" />
              </div>
              <span className="font-mono font-bold tracking-widest text-xs text-white">DOCUVERIFY</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans">Log in to DocuVerify</h2>
            <p className="text-white/50 text-sm font-sans">Enter organization account credentials to authenticate session.</p>
          </motion.div>

          <motion.form variants={fadeInItem} onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-3">
              <Field
                id="email" label="Organization Email" type="email" value={email}
                onChange={(v) => setEmail(v)} placeholder="e.g. inspector@agency.gov" icon={User}
              />
              <Field
                id="password" label="Access Key Password" type="password" value={password}
                onChange={(v) => setPassword(v)} placeholder="••••••••••••" icon={Lock}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-risk-high bg-risk-high/10 border border-risk-high/20 rounded-lg p-3 font-mono">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit" disabled={submitting}
              className="w-full bg-accent hover:bg-accent-bright text-white text-xs font-bold py-3 rounded-lg shadow-lg shadow-accent/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? "VERIFYING SECURITY TOKENS..." : "SIGN IN TO TERMINAL"}
            </button>
          </motion.form>

          {/* Quick Demo Autofill section */}
          <motion.div variants={fadeInItem} className="glass rounded-xl p-5 border border-border/60 bg-white/[0.01] space-y-3">
            <div className="text-[10px] font-bold text-white/35 font-mono uppercase tracking-widest flex items-center gap-1.5 border-b border-border/20 pb-2">
              <Terminal className="w-3.5 h-3.5 text-accent-bright" /> DEMO SHORTCUT PATHWAY
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <DemoCard 
                label="Admin Account" email="admin@demo.docuverify.local" role="FULL PRIVILEGES"
                onClick={() => fillCredentials("admin@demo.docuverify.local")}
              />
              <DemoCard 
                label="HR Evaluator" email="hr@demo.docuverify.local" role="READ/INSPECT ONLY"
                onClick={() => fillCredentials("hr@demo.docuverify.local")}
              />
            </div>
          </motion.div>

          <motion.p variants={fadeInItem} className="text-center text-xs text-white/40 font-sans">
            Need an organization workspace?{" "}
            <Link to="/register" className="text-accent hover:text-accent-bright hover:underline font-semibold transition-colors">
              Register here
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

export function Field({ id, label, type, value, onChange, placeholder, icon: Icon }: {
  id: string; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string; icon: any;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-mono block">
        {label}
      </label>
      <div className="relative flex items-center">
        <Icon className="absolute left-3 w-4 h-4 text-white/30" />
        <input
          id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required placeholder={placeholder}
          className="w-full bg-black/40 border border-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white outline-none"
        />
      </div>
    </div>
  );
}

function DemoCard({ label, email, role, onClick }: { label: string; email: string; role: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex flex-col text-left p-2.5 rounded-lg border border-border bg-black/25 hover:bg-white/[0.02] hover:border-accent/40 transition-all group cursor-pointer"
    >
      <span className="font-bold text-white/80 group-hover:text-accent-bright transition-colors">{label}</span>
      <span className="text-[9px] text-white/35 font-mono truncate w-full mt-0.5">{email}</span>
      <span className="text-[8px] font-bold font-mono tracking-wider mt-1 text-white/20 bg-white/5 border border-border rounded px-1.5 py-0.2 w-fit">{role}</span>
    </button>
  );
}
