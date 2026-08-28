import { useEffect, useState } from "react";
import { UserPlus, User, Mail, Lock, ShieldAlert } from "lucide-react";
import { listOrgUsers, addOrgUser, updateOrgUser, type OrgUser } from "../../api/enterpriseClient";

export default function UsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr");
  const [error, setError] = useState<string | null>(null);

  function refresh() { 
    listOrgUsers().then(setUsers).catch(() => {}); 
  }
  
  useEffect(refresh, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addOrgUser(email, password, role);
      setEmail(""); 
      setPassword(""); 
      setShowForm(false);
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Could not add user.");
    }
  }

  async function toggleStatus(u: OrgUser) {
    await updateOrgUser(u.id, { status: u.status === "active" ? "disabled" : "active" });
    refresh();
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> USER REGISTRY ADMIN
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Organization Users</h1>
          <p className="text-white/50 text-sm mt-1">
            Authorize or restrict access credentials for audit examiners and HR verifiers.
          </p>
        </div>
        
        <button 
          onClick={() => setShowForm((s) => !s)} 
          className="text-xs font-bold bg-accent hover:bg-accent-bright text-white rounded-lg px-4 py-2.5 transition-all shadow-md shadow-accent/15 flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Add User Account
        </button>
      </div>

      {/* Expandable Add User Form */}
      {showForm && (
        <form onSubmit={onAdd} className="glass rounded-xl p-5 border border-border/60 bg-white/[0.01] space-y-4">
          <div className="text-xs font-bold text-white/35 font-mono uppercase tracking-widest border-b border-border/20 pb-2">
            PROVISION NEW ACCESS PROFILE
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-white/35" />
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                type="email" 
                placeholder="Email Address" 
                required
                className="w-full bg-black/40 border border-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-accent/60" 
              />
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-white/35" />
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type="password" 
                placeholder="Initial Password" 
                required
                className="w-full bg-black/40 border border-border rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-accent/60" 
              />
            </div>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="bg-black/40 border border-border rounded-lg px-3.5 py-2.5 text-xs text-white outline-none"
            >
              <option value="hr" className="bg-panel">HR / Verifier</option>
              <option value="admin" className="bg-panel">Admin</option>
              <option value="viewer" className="bg-panel">Viewer</option>
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-risk-high bg-risk-high/10 border border-risk-high/20 rounded-lg p-2.5 font-mono">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button 
            type="submit" 
            className="rounded-lg bg-accent hover:bg-accent-bright px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-accent/15 cursor-pointer"
          >
            Create Credentials
          </button>
        </form>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {users.map((u) => {
          const initial = u.email ? u.email.charAt(0).toUpperCase() : "U";
          const isActive = u.status === "active";
          
          return (
            <div key={u.id} className="glass rounded-xl p-4 border border-border/60 flex items-center justify-between text-xs bg-white/[0.01]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-full bg-white/5 border border-border flex items-center justify-center shrink-0 text-white/50 font-bold font-mono">
                  {initial}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white/90 truncate max-w-[240px]">{u.email}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-white/40 font-mono text-[10px]">
                    <span className={`font-bold px-1 rounded ${
                      u.role === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
                    }`}>{u.role.toUpperCase()}</span>
                    <span>&middot;</span>
                    <span className={isActive ? "text-risk-low font-semibold" : "text-white/35 font-semibold"}>
                      {u.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => toggleStatus(u)} 
                className="text-xs font-semibold bg-white/[0.02] border border-border hover:bg-white/[0.04] rounded-lg px-3 py-1.5 text-white/70 hover:text-white transition-all cursor-pointer shrink-0"
              >
                {isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
