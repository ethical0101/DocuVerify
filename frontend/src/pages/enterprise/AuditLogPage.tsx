import { useEffect, useState } from "react";
import { ScrollText, User, Clock } from "lucide-react";
import { getAuditLog, type AuditEvent } from "../../api/enterpriseClient";

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => { 
    getAuditLog().then(setEvents).catch(() => {}); 
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="text-[10px] font-bold text-accent-bright font-mono uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5" /> SYSTEM LOG STREAM
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">Security Audit Log</h1>
        <p className="text-white/50 text-sm mt-1">
          Chronological record of enterprise operations. Document content hashes are never written to audit tables.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-white/40 text-sm border border-border/60">
          <ScrollText className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <div className="font-semibold text-white/80">No audit events logged</div>
          <p className="text-xs text-white/40 mt-1">Activities such as logins, dataset uploads, and training runs will trigger logs.</p>
        </div>
      ) : (
        <div className="relative border-l border-border/80 pl-6 ml-4 space-y-6">
          {events.map((e) => {
            const dateStr = new Date(e.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });
            
            return (
              <div key={e.id} className="relative group">
                {/* Timeline node circle indicator */}
                <div className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-border border border-panel group-hover:bg-accent transition-colors" />
                
                <div className="glass rounded-xl p-4 border border-border/60 bg-white/[0.01] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold font-mono text-white/95 uppercase tracking-wide">
                        {e.event.replaceAll("_", " ")}
                      </span>
                    </div>
                    
                    {e.detail && (
                      <p className="text-xs text-white/60 font-sans leading-relaxed">
                        {e.detail}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-mono">
                      <User className="w-3 h-3 text-white/20" />
                      <span>{e.user_email}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-[10px] text-white/35 font-mono">
                    <Clock className="w-3.5 h-3.5 text-white/25" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
