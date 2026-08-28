import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScanSearch } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight mb-8">
        <ScanSearch className="w-5 h-5 text-accent" /> DocuVerify
      </Link>

      <div className="glass rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Sign in</h1>
        <p className="text-white/50 text-sm mb-6">Access your organization's investigation workspace.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus />
          <Field label="Password" type="password" value={password} onChange={setPassword} />

          {error && <div className="text-risk-high text-sm">{error}</div>}

          <button
            type="submit" disabled={submitting}
            className="w-full rounded-lg bg-accent py-2.5 font-medium disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/40">
          No organization yet? <Link to="/register" className="text-accent hover:underline">Register</Link>
        </div>

        <div className="mt-5 pt-5 border-t border-white/10 text-xs text-white/30 space-y-1">
          <div>Demo admin: admin@demo.docuverify.local</div>
          <div>Demo HR: hr@demo.docuverify.local</div>
          <div>Password: demopass123 (after running scripts/setup_demo.py)</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, type, value, onChange, autoFocus }: {
  label: string; type: string; value: string; onChange: (v: string) => void; autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-white/50 mb-1.5 block">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} required autoFocus={autoFocus}
        className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/60"
      />
    </label>
  );
}
