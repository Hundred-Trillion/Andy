import { create } from 'zustand';
import type { Message, StatusMessage, CadModel, ReferenceDoc, ChatResponse } from '@/lib/types';
import { sendChatMessage, getModelDownloadUrl } from '@/lib/api';
import { useViewportStore } from '@/stores/viewportStore';

interface ChatStore {
  messages: Message[];
  isLoading: boolean;
  sessionId: string;
  casualMode: boolean;
  useReferences: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, model?: CadModel, references?: ReferenceDoc[], statusMessages?: StatusMessage[]) => void;
  addAssistantMessage: (content: string, model?: CadModel, references?: ReferenceDoc[], statusMessages?: StatusMessage[]) => void;
  updateLastAssistantStatus: (status: StatusMessage) => void;
  clearMessages: () => void;
  toggleCasualMode: () => void;
  toggleReferences: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: generateId(),
  casualMode: false,
  useReferences: false,

  sendMessage: async (content: string) => {
    const { sessionId } = get();

    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: formatTime(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isLoading: true }));

    // Add placeholder assistant message
    const assistantId = generateId();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: formatTime(),
      status_messages: [],
    };
    set((s) => ({ messages: [...s.messages, assistantMsg] }));

    try {
      const history = get().messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
        role: m.role,
        content: m.content
      }));
      const components = useViewportStore.getState().components;
      const isolatedId = useViewportStore.getState().isolatedId;

      await sendChatMessage(
        { 
          message: content, 
          session_id: sessionId,
          chat_history: history,
          current_assembly: components,
          casual_mode: get().casualMode,
          use_references: get().useReferences,
          isolated_id: isolatedId
        },
        // onStatus
        (status: StatusMessage) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, status_messages: [...(m.status_messages || []), status] }
                : m
            ),
          }));
        },
        // onResponse
        (response: ChatResponse) => {
          const model: CadModel | undefined = response.model_id
            ? {
                model_id: response.model_id,
                components: response.components || [],
                stl_url: getModelDownloadUrl(response.model_id, 'stl'),
                step_url: getModelDownloadUrl(response.model_id, 'step'),
                metadata: {},
              }
            : undefined;

          if (model) {
            useViewportStore.getState().setModel(model);
          }

          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: response.message,
                    model,
                    references: response.references || undefined,
                    status_messages: response.status_messages || m.status_messages,
                  }
                : m
            ),
            isLoading: false,
          }));
        },
        // onError
        (error: string) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Error: ${error}`,
                    status_messages: [
                      ...(m.status_messages || []),
                      { step: 'Error', status: 'error' as const, timestamp: formatTime() },
                    ],
                  }
                : m
            ),
            isLoading: false,
          }));
        },
      );
    } catch {
      set({ isLoading: false });
    }
  },

  addUserMessage: (content: string) => {
    set((s) => ({
      messages: [
        ...s.messages,
        { id: generateId(), role: 'user', content, timestamp: formatTime() },
      ],
    }));
  },

  addAssistantMessage: (content, model, references, statusMessages) => {
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: generateId(),
          role: 'assistant',
          content,
          timestamp: formatTime(),
          model,
          references,
          status_messages: statusMessages,
        },
      ],
    }));
  },

  updateLastAssistantStatus: (status: StatusMessage) => {
    set((s) => {
      const msgs = [...s.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = {
            ...msgs[i],
            status_messages: [...(msgs[i].status_messages || []), status],
          };
          break;
        }
      }
      return { messages: msgs };
    });
  },

  clearMessages: () => set({ messages: [], sessionId: generateId() }),
  toggleCasualMode: () => set((s) => ({ casualMode: !s.casualMode })),
  toggleReferences: () => set((s) => ({ useReferences: !s.useReferences })),
}));
