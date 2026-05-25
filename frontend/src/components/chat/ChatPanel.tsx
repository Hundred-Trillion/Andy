import React, { useState, useRef, useEffect } from 'react';
import { Send, Play, Paperclip, MessageSquare, Settings, BookOpen, Plus, Bot, User, ExternalLink } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useViewportStore } from '@/stores/viewportStore';
import { getModelDownloadUrl } from '@/lib/api';
import type { Message, StatusMessage } from '@/lib/types';

const B = '3px solid #000';
const Y = '#f5c518';
const bg = '#fff';

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const useReferences = useChatStore((s) => s.useReferences);
  const toggleReferences = useChatStore((s) => s.toggleReferences);
  const casualMode = useChatStore((s) => s.casualMode);
  const toggleCasualMode = useChatStore((s) => s.toggleCasualMode);
  const setModel = useViewportStore((s) => s.setModel);
  const clearModel = useViewportStore((s) => s.clearModel);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  useEffect(() => { const l = messages[messages.length - 1]; if (l?.role === 'assistant' && l.model) setModel(l.model); }, [messages, setModel]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const t = input.trim(); if (!t || isLoading) return; setInput(''); sendMessage(t); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: bg, overflow: 'hidden' }}>
      
      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: B, background: bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Impact, sans-serif', fontSize: 18, color: '#000', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          <MessageSquare size={18} />
          ENGINEERING WORKSPACE
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { clearMessages(); clearModel(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: Y, color: '#000', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, border: B, borderRadius: 4, cursor: 'pointer' }}
          >
            NEW SESSION <Plus size={14}/>
          </button>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && <EmptyState />}
        {messages.map((msg) => {
          if (isLoading && msg.role === 'assistant' && !msg.content && !msg.model && (!msg.status_messages || msg.status_messages.length === 0)) {
            return null;
          }
          return <ChatMessage key={msg.id} msg={msg} />;
        })}
        {isLoading && <ThinkingIndicator />}
      </div>

      {/* ── Input Area ──────────────────────────────────────── */}
      <div style={{ padding: '16px', background: bg, borderTop: B }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12 }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe an engineering task..."
            disabled={isLoading}
            style={{ flex: 1, padding: '0 16px', background: '#fff', border: B, borderRadius: 4, color: '#000', fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none' }}
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', background: Y, border: B, borderRadius: 4, color: '#000', fontFamily: 'Impact, sans-serif', fontSize: 18, letterSpacing: '0.05em', cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed', opacity: input.trim() && !isLoading ? 1 : 0.7, flexShrink: 0 }}
          >
            SEND <Play fill="#000" size={16} />
          </button>
        </form>
      </div>

      {/* ── Bottom Tabs ──────────────────────────────────────── */}
      <div style={{ display: 'flex', background: '#000', borderTop: B, height: 44, flexShrink: 0 }}>
        <Tab active={true} icon={<MessageSquare size={16}/>} label="CONVERSATION" />
        <Tab active={casualMode} icon={<Settings size={16}/>} label="CASUAL MODE" onClick={toggleCasualMode} />
        <Tab active={useReferences} icon={<BookOpen size={16}/>} label="REFERENCES" onClick={toggleReferences} />
      </div>
    </div>
  );
}

function Tab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: active ? '#fff' : '#000', color: active ? '#000' : '#fff', borderRight: B, fontFamily: 'Impact, sans-serif', fontSize: 14, letterSpacing: '0.05em', cursor: onClick ? 'pointer' : 'default' }}>
      {icon} {label} {onClick && <span style={{ fontSize: 10, padding: '2px 6px', background: active ? '#000' : '#fff', color: active ? '#fff' : '#000', borderRadius: 4 }}>{active ? 'ON' : 'OFF'}</span>}
    </div>
  );
}

function ChatMessage({ msg }: { msg: Message }) {
  const isBot = msg.role === 'assistant';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '2px solid #000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 4, background: isBot ? Y : '#000', border: B, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isBot ? <Bot size={20} color="#000" /> : <User size={20} color="#fff" />}
          </div>
          <span style={{ fontFamily: 'Impact, sans-serif', fontSize: 16, color: '#000', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            {isBot ? 'ANDY' : 'USER'}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#666' }}>{msg.timestamp}</span>
      </div>
      
      <div style={{ paddingLeft: 44, color: '#000', fontSize: 13, fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {msg.status_messages && msg.status_messages.length > 0 && (
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msg.status_messages.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: s.status === 'error' ? '#ef4444' : '#000', fontWeight: 600 }}>
                {s.status === 'running' ? <Play size={10} fill="#000" style={{ animation: 'pulse 1.5s infinite' }} /> : <Play size={10} fill="#000" />}
                {s.step}
              </div>
            ))}
          </div>
        )}
        
        {msg.content}
        
        {msg.model?.step_url && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: B, borderRadius: 4, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 800, fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>📄</span> {msg.model.model_id}.step
            </div>
            <a href={msg.model.step_url} download style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', background: Y, border: B, borderRadius: 4, color: '#000', textDecoration: 'none', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', fontFamily: 'Impact, sans-serif', letterSpacing: '0.05em' }}>
              OPEN FILE <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 4, background: Y, border: B, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Bot size={20} color="#000" style={{ animation: 'pulse 1.5s infinite' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: '#000' }}>THINKING...</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: Y, border: B, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Bot size={40} color="#000" />
      </div>
      <div style={{ fontFamily: 'Impact, sans-serif', fontSize: 24, letterSpacing: '0.02em', color: '#000', marginBottom: 8, textTransform: 'uppercase' }}>ANDY Copilot</div>
      <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#666', maxWidth: 280, marginBottom: 24, lineHeight: 1.5 }}>
        Describe an engineering task to generate parametric CAD geometry.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 320 }}>
        <Chip text="Generate a box with length 100" />
        <Chip text="Create a nose cone for Mach 1.5" />
        <Chip text="Design a swept fin with 4mm thickness" />
      </div>
    </div>
  );
}

function Chip({ text }: { text: string }) {
  const send = useChatStore((s) => s.sendMessage);
  const busy = useChatStore((s) => s.isLoading);
  return (
    <button
      onClick={() => !busy && send(text)}
      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: '#fff', border: B, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer' }}
    >
      "{text}"
    </button>
  );
}
