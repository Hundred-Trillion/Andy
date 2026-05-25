/* ── Types ───────────────────────────────────────────────────── */

export interface StatusMessage {
  step: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  timestamp: string;
}

export interface ReferenceDoc {
  title: string;
  source: string;
  snippet: string;
  score: number;
}

export interface CadParameters {
  [key: string]: number | string;
}

export interface AssemblyComponent {
  id: string;
  type: string;
  parameters: Record<string, any>;
  position: [number, number, number];
  rotation: [number, number, number];
  stl_url?: string;
  stl_file?: string;
  operation?: 'add' | 'cut';
  target_id?: string | null;
}

export interface CadModel {
  model_id: string;
  template?: string; // Legacy
  components: AssemblyComponent[];
  parameters?: CadParameters; // Legacy
  stl_url: string;
  step_url: string;
  metadata: {
    bounding_box?: { x: number; y: number; z: number };
    volume?: number;
    file_sizes?: { step: number; stl: number };
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status_messages?: StatusMessage[];
  model?: CadModel;
  references?: ReferenceDoc[];
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  chat_history?: { role: string; content: string }[];
  current_assembly?: AssemblyComponent[];
  casual_mode?: boolean;
  use_references?: boolean;
  isolated_id?: string | null;
}

export interface ChatResponse {
  message: string;
  model_url: string | null;
  step_file: string | null;
  stl_file: string | null;
  parameters: CadParameters | null; // Legacy
  components?: AssemblyComponent[];
  references: ReferenceDoc[] | null;
  status_messages: StatusMessage[];
  model_id: string | null;
}

export interface TemplateInfo {
  name: string;
  description: string;
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  name: string;
  type: string;
  default: number | string;
  unit: string;
  description: string;
}

export interface SSEEvent {
  type: 'status' | 'response' | 'error';
  data: StatusMessage | ChatResponse | { message: string };
}
