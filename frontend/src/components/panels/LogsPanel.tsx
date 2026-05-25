import { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: formatTimestamp(), level: 'info', message: 'ANDY v1 system initialized' },
    { timestamp: formatTimestamp(), level: 'info', message: 'Nemotron 3 Super connection established' },
    { timestamp: formatTimestamp(), level: 'debug', message: 'Qdrant vector store ready' },
    { timestamp: formatTimestamp(), level: 'info', message: 'Parametric CAD engine loaded (6 templates)' },
    { timestamp: formatTimestamp(), level: 'info', message: 'System ready — awaiting engineering input' },
  ]);

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-andy-yellow">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        <span>System Logs</span>
        <span className="ml-auto text-[9px] font-mono text-andy-text-muted bg-andy-border px-1.5 py-0.5 rounded">
          {logs.length}
        </span>
      </div>
      <div className="p-2 overflow-y-auto max-h-[200px] font-mono text-[10px]">
        {logs.map((log, i) => (
          <div key={i} className="flex items-start gap-2 py-0.5 hover:bg-andy-surface-hover/50">
            <span className="text-andy-text-muted shrink-0">{log.timestamp}</span>
            <span
              className={`shrink-0 uppercase font-bold w-[40px] ${
                log.level === 'error' ? 'text-andy-error' :
                log.level === 'warn' ? 'text-andy-yellow' :
                log.level === 'debug' ? 'text-andy-text-muted' :
                'text-andy-info'
              }`}
            >
              {log.level}
            </span>
            <span className="text-andy-text-dim">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
