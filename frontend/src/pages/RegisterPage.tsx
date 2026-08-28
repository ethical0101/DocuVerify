import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScanSearch, ShieldAlert, Sparkles, User, Lock, Building2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Field } from "./LoginPage";

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

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(orgName, email, password);
      navigate("/enterprise/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Registration failed.");
    } finally {
      setSubmitting(false);
    }
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

        {/* Brand visual text */}
        <div className="max-w-xl my-auto space-y-6 z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/25 px-3.5 py-1 text-xs text-accent-bright font-mono">
            <Sparkles className="w-3.5 h-3.5" /> ENTERPRISE ADAPTIVE LAYER
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Adapt forensics to your ecosystem.
          </h1>
          <p className="text-white/60 leading-relaxed text-base font-sans">
            Register your organization to access model customization. Upload sample documents, validate class distributions, and train custom classifiers that check templates alongside the base forensic indicators.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-white/35 font-mono z-10 border-t border-border/20 pt-5">
          <span>SECURE ORG REGISTRY</span>
          <span>ENTERPRISE CONFIGURATION</span>
        </div>
      </motion.div>

      {/* Right Panel: Register Form */}
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
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans">Register Organization</h2>
            <p className="text-white/50 text-sm font-sans">Set up your workspace and customize classification weights.</p>
          </motion.div>

          <motion.form variants={fadeInItem} onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-3">
              <Field
                id="orgName" label="Organization Name" type="text" value={orgName}
                onChange={(v) => setOrgName(v)} placeholder="e.g. Acme Verification Corp" icon={Building2}
              />
              <Field
                id="email" label="Administrator Email" type="email" value={email}
                onChange={(v) => setEmail(v)} placeholder="e.g. admin@acme.com" icon={User}
              />
              <Field
                id="password" label="Account Password" type="password" value={password}
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
              {submitting ? "PROVISIONING WORKSPACE..." : "CREATE TERMINAL REGISTER"}
            </button>
          </motion.form>

          <motion.p variants={fadeInItem} className="text-center text-xs text-white/40 font-sans">
            Already have an organization workspace?{" "}
            <Link to="/login" className="text-accent hover:text-accent-bright hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
