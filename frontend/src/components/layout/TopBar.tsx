import { Bot } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

const B = '3px solid #000';
const Y = '#f5c518';

export function TopBar() {
  const isLoading = useChatStore((s) => s.isLoading);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff', borderBottom: B }}>
      
      {/* Left side: Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ background: Y, border: B, borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={28} color="#000" strokeWidth={2.5} />
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', color: '#000', fontFamily: 'Impact, sans-serif' }}>
            ANDY
          </h1>
          <div style={{ width: 3, height: 24, background: '#000' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#000', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Agentic Engineering Copilot
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#000', fontFamily: 'var(--font-mono)' }}>
              Qwen2.5 72B GPTQ-Int4 <span style={{ color: '#22c55e' }}>●</span> Local Runtime (96GB VRAM)
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: B, borderRadius: 4, padding: '6px 14px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLoading ? Y : '#22c55e', animation: isLoading ? 'pulse 1s infinite' : 'none' }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#000', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            {isLoading ? 'Processing' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}
