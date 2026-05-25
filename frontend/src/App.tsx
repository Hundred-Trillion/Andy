import { useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { BottomBar } from '@/components/layout/BottomBar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { CadViewport } from '@/components/viewport/CadViewport';
import { ParametersPanel } from '@/components/panels/ParametersPanel';
import { SessionHistoryPanel } from '@/components/panels/SessionHistoryPanel';
import { useViewportStore } from '@/stores/viewportStore';

export default function App() {
  const startFreshSession = useViewportStore((s) => s.startFreshSession);
  
  useEffect(() => {
    // Every time the user opens the app, force a fresh session
    startFreshSession();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: '#0b0b0b' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', gap: 12, padding: '12px 16px', minHeight: 0 }}>
        <div style={{ width: 220, flexShrink: 0, border: '3px solid #000', borderRadius: 8, overflow: 'hidden' }}>
          <SessionHistoryPanel />
        </div>
        <div style={{ width: '32%', minWidth: 360, border: '3px solid #000', borderRadius: 8, overflow: 'hidden' }}>
          <ChatPanel />
        </div>
        <div style={{ flex: 1, border: '3px solid #000', borderRadius: 8, overflow: 'hidden' }}>
          <CadViewport />
        </div>
        <div style={{ width: '280px', minWidth: 260, border: '3px solid #000', borderRadius: 8, overflow: 'hidden' }}>
          <ParametersPanel />
        </div>
      </div>
      <BottomBar />
    </div>
  );
}
