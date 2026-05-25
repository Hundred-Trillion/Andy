import { useViewportStore } from '@/stores/viewportStore';
import { MessageSquare, Plus, Clock, ChevronRight } from 'lucide-react';

export function SessionHistoryPanel() {
  const sessions = useViewportStore((s) => s.sessions);
  const activeSessionId = useViewportStore((s) => s.activeSessionId);
  const switchSession = useViewportStore((s) => s.switchSession);
  const addSession = useViewportStore((s) => s.addSession);

  // Group by rough date (e.g., today/older) just to look nice, or just list them reversed
  const reversedSessions = [...sessions].reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f3ef' }}>
      <div style={{ padding: '16px', borderBottom: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Impact, sans-serif', fontSize: 18, textTransform: 'uppercase', color: '#000', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} />
          Session History
        </div>
        <button 
          onClick={() => addSession()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5c518', border: '2px solid #000', borderRadius: 4, padding: '4px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
        >
          <Plus size={14} /> NEW
        </button>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {reversedSessions.map(session => (
          <button
            key={session.id}
            onClick={() => switchSession(session.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px',
              background: session.id === activeSessionId ? '#e2e8f0' : 'transparent',
              border: session.id === activeSessionId ? '2px solid #000' : '2px solid transparent',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.2s'
            }}
          >
            <MessageSquare size={16} color="#475569" />
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#000' }}>
                {session.name}
              </span>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                {session.components.length} parts
              </div>
            </div>
            {session.id === activeSessionId && <ChevronRight size={14} color="#000" />}
          </button>
        ))}
      </div>
    </div>
  );
}
