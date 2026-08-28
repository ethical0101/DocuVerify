import { useEffect, useState } from "react";
import { getAuditLog, type AuditEvent } from "../../api/enterpriseClient";

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => { getAuditLog().then(setEvents).catch(() => {}); }, []);

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Audit Log</h1>
      <p className="text-white/50 text-sm mb-6">Who did what, when. Never logs document contents.</p>

      {events.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-white/40 text-sm">No events recorded yet.</div>
      ) : (
        <div className="glass rounded-xl divide-y divide-white/5">
          {events.map((e) => (
            <div key={e.id} className="p-4 flex items-start justify-between gap-4 text-sm">
              <div>
                <div className="font-medium capitalize">{e.event.replaceAll("_", " ")}</div>
                {e.detail && <div className="text-xs text-white/50 mt-0.5">{e.detail}</div>}
                <div className="text-xs text-white/30 mt-0.5">{e.user_email}</div>
              </div>
              <div className="text-xs text-white/30 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
