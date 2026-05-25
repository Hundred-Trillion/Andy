import { useChatStore } from '@/stores/chatStore';
import type { ReferenceDoc } from '@/lib/types';

export function ReferencesPanel() {
  const messages = useChatStore((s) => s.messages);

  // Collect all references from messages
  const allRefs: ReferenceDoc[] = [];
  for (const msg of messages) {
    if (msg.references) {
      for (const ref of msg.references) {
        if (!allRefs.find((r) => r.title === ref.title)) {
          allRefs.push(ref);
        }
      }
    }
  }

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-andy-yellow">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>References</span>
        {allRefs.length > 0 && (
          <span className="ml-auto text-[9px] font-mono text-andy-text-muted bg-andy-border px-1.5 py-0.5 rounded">
            {allRefs.length}
          </span>
        )}
      </div>
      <div className="p-3 overflow-y-auto max-h-[300px]">
        {allRefs.length === 0 ? (
          <div className="text-[11px] font-mono text-andy-text-muted text-center py-6">
            No references retrieved yet.
            <br />
            <span className="text-[10px]">Ask an engineering question to retrieve references.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {allRefs.map((ref, i) => (
              <div
                key={i}
                className="p-2 rounded border border-andy-border/50 hover:border-andy-yellow/20 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-andy-yellow font-bold shrink-0">[{i + 1}]</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono text-andy-text font-medium truncate">
                      {ref.title}
                    </div>
                    <div className="text-[9px] font-mono text-andy-text-muted mt-0.5">
                      {ref.source}
                    </div>
                    <div className="text-[10px] font-mono text-andy-text-dim mt-1 line-clamp-2 leading-relaxed">
                      {ref.snippet}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[8px] font-mono text-andy-text-muted uppercase tracking-wider">
                        Relevance:
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div
                            key={n}
                            className={`w-1 h-3 rounded-sm ${
                              n <= Math.ceil(ref.score * 5) ? 'bg-andy-yellow' : 'bg-andy-border'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
