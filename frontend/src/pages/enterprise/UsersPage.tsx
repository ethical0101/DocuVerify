import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { listOrgUsers, addOrgUser, updateOrgUser, type OrgUser } from "../../api/enterpriseClient";

export default function UsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("hr");
  const [error, setError] = useState<string | null>(null);

  function refresh() { listOrgUsers().then(setUsers).catch(() => {}); }
  useEffect(refresh, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addOrgUser(email, password, role);
      setEmail(""); setPassword(""); setShowForm(false);
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
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Users</h1>
          <p className="text-white/50 text-sm">Manage who can access your organization's DocuVerify instance.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="text-sm bg-accent rounded-lg px-4 py-2 font-medium flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={onAdd} className="glass rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required
                   className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required
                   className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none" />
            <select value={role} onChange={(e) => setRole(e.target.value)}
                    className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="hr" className="bg-ink-900">HR / Verifier</option>
              <option value="admin" className="bg-ink-900">Admin</option>
              <option value="viewer" className="bg-ink-900">Viewer</option>
            </select>
          </div>
          {error && <div className="text-risk-high text-sm">{error}</div>}
          <button type="submit" className="text-sm bg-accent rounded-lg px-4 py-2 font-medium">Create</button>
        </form>
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="glass rounded-lg p-4 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{u.email}</div>
              <div className="text-xs text-white/40 capitalize">{u.role} &middot; {u.status}</div>
            </div>
            <button onClick={() => toggleStatus(u)} className="text-xs glass rounded-lg px-3 py-1.5 text-white/60 hover:text-white">
              {u.status === "active" ? "Disable" : "Activate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
