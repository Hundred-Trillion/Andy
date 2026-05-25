import type { ChatRequest, ChatResponse, SSEEvent, StatusMessage, TemplateInfo } from './types';

const API_BASE = '/api';

/* ── Generic Fetch Wrapper ──────────────────────────────────── */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API Error ${res.status}: ${err}`);
  }
  return res.json();
}

/* ── Chat API with SSE Streaming ────────────────────────────── */
export async function sendChatMessage(
  request: ChatRequest,
  onStatus: (status: StatusMessage) => void,
  onResponse: (response: ChatResponse) => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    } catch {
      onError('Backend is not running. Start the backend with: cd backend && uvicorn app.main:app --reload');
      return;
    }

    if (!res.ok) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        onError('Backend server is not running. Start it with:\n\ncd backend && pip install -r requirements.txt && uvicorn app.main:app --reload');
      } else {
        const err = await res.text().catch(() => 'Unknown error');
        onError(`API Error ${res.status}: ${err}`);
      }
      return;
    }

    const contentType = res.headers.get('content-type') || '';

    // Handle SSE streaming
    if (contentType.includes('text/event-stream')) {
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedResponse = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (!receivedResponse) {
            onError('Stream ended unexpectedly without a final response from the agent.');
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              if (event.type === 'status') {
                onStatus(event.data as StatusMessage);
              } else if (event.type === 'response') {
                receivedResponse = true;
                onResponse(event.data as ChatResponse);
              } else if (event.type === 'error') {
                receivedResponse = true;
                onError((event.data as { message: string }).message);
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      }
    } else {
      // Handle regular JSON response
      const data: ChatResponse = await res.json();
      // Emit all status messages
      for (const status of data.status_messages || []) {
        onStatus(status);
      }
      onResponse(data);
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/* ── CAD API ────────────────────────────────────────────────── */
export async function getTemplates(): Promise<TemplateInfo[]> {
  return apiFetch<TemplateInfo[]>('/templates');
}

export async function generateCad(components: import('./types').AssemblyComponent[]) {
  return apiFetch<ChatResponse>('/generate-cad', {
    method: 'POST',
    body: JSON.stringify({ components }),
  });
}

export function getModelDownloadUrl(modelId: string, format: 'step' | 'stl'): string {
  return `${API_BASE}/models/${modelId}/download/${format}`;
}

export function getModelStlUrl(modelId: string): string {
  return `${API_BASE}/models/${modelId}/download/stl`;
}

/* ── References API ─────────────────────────────────────────── */
export async function searchReferences(query: string) {
  return apiFetch('/references/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export async function ingestDocuments() {
  return apiFetch('/references/ingest', { method: 'POST' });
}

/* ── Decompose API ─────────────────────────────────────────── */
export async function decomposeModel(filePath?: string, componentId?: string): Promise<{
  components: import('./types').AssemblyComponent[];
  total_solids: number;
  source: string;
}> {
  return apiFetch('/decompose', {
    method: 'POST',
    body: JSON.stringify({ file_path: filePath, component_id: componentId }),
  });
}

/* ── Merge API ─────────────────────────────────────────────── */
export async function mergeComponents(components: import('./types').AssemblyComponent[]): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/merge', {
    method: 'POST',
    body: JSON.stringify({ components }),
  });
}

/* ── Health Check ───────────────────────────────────────────── */
export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health');
}
