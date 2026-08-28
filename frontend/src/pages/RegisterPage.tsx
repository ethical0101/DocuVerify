import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScanSearch } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Field } from "./LoginPage";

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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight mb-8">
        <ScanSearch className="w-5 h-5 text-accent" /> DocuVerify
      </Link>

      <div className="glass rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-1">Register your organization</h1>
        <p className="text-white/50 text-sm mb-6">
          Creates your organization and its first admin account -- you can add HR/verifier users afterward.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Organization name" type="text" value={orgName} onChange={setOrgName} autoFocus />
          <Field label="Admin email" type="email" value={email} onChange={setEmail} />
          <Field label="Password (min. 8 characters)" type="password" value={password} onChange={setPassword} />

          {error && <div className="text-risk-high text-sm">{error}</div>}

          <button
            type="submit" disabled={submitting}
            className="w-full rounded-lg bg-accent py-2.5 font-medium disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create organization"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-white/40">
          Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
