import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CadModel, AssemblyComponent } from '@/lib/types';

export interface CadSession {
  id: string;
  name: string;
  components: AssemblyComponent[];
  currentModel: CadModel | null;
  selectedId: string | null;
  selectedIds: string[];
  isolatedId: string | null;
}

interface ViewportStore {
  // Session / tab state
  sessions: CadSession[];
  activeSessionId: string;

  // Currently active session mirror (backwards compatibility)
  currentModel: CadModel | null;
  modelUrl: string | null;
  components: AssemblyComponent[];
  selectedId: string | null;
  selectedIds: string[];
  isolatedId: string | null;

  // Viewport UI toggles
  wireframe: boolean;
  showDimensions: boolean;
  showGrid: boolean;
  revision: number;

  // Session Actions
  addSession: (name?: string) => void;
  switchSession: (id: string) => void;
  closeSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;

  // Existing setters (actions apply to active session)
  setModel: (model: CadModel) => void;
  setModelUrl: (url: string | null) => void;
  toggleWireframe: () => void;
  toggleDimensions: () => void;
  toggleGrid: () => void;
  setComponents: (comps: AssemblyComponent[]) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string) => void;
  setIsolatedId: (id: string | null) => void;
  clearModel: () => void;
}

const createDefaultSession = (id: string, name: string): CadSession => ({
  id,
  name,
  components: [],
  currentModel: null,
  selectedId: null,
  selectedIds: [],
  isolatedId: null,
});

export const useViewportStore = create<ViewportStore>()(
  persist(
    (set, get) => ({
      sessions: [createDefaultSession('session-1', 'Fin Assembly')],
      activeSessionId: 'session-1',

      currentModel: null,
      modelUrl: null,
      components: [],
      selectedId: null,
      selectedIds: [],
      isolatedId: null,

      wireframe: false,
      showDimensions: true,
      showGrid: true,
      revision: 0,

      addSession: (name) => {
        const id = `session-${Date.now()}`;
        const newName = name || `Session ${get().sessions.length + 1}`;
        const newSession = createDefaultSession(id, newName);
        
        set((s) => ({
          sessions: [...s.sessions, newSession],
          activeSessionId: id,
          currentModel: null,
          modelUrl: null,
          components: [],
          selectedId: null,
          selectedIds: [],
          isolatedId: null,
          revision: s.revision + 1,
        }));
      },

      switchSession: (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;
        
        set((s) => ({
          activeSessionId: id,
          currentModel: session.currentModel,
          modelUrl: session.currentModel ? session.currentModel.stl_url : null,
          components: session.components,
          selectedId: session.selectedId,
          selectedIds: session.selectedIds || [],
          isolatedId: session.isolatedId,
          revision: s.revision + 1,
        }));
      },

      closeSession: (id) => {
        const { sessions, activeSessionId } = get();
        if (sessions.length <= 1) return; // Must keep at least one tab open

        const nextSessions = sessions.filter((s) => s.id !== id);
        let nextActiveId = activeSessionId;
        
        if (activeSessionId === id) {
          // Switch to nearest remaining tab
          const closedIndex = sessions.findIndex((s) => s.id === id);
          const nextActiveIndex = closedIndex > 0 ? closedIndex - 1 : 0;
          nextActiveId = nextSessions[nextActiveIndex].id;
        }

        set({ sessions: nextSessions });
        get().switchSession(nextActiveId);
      },

      renameSession: (id, name) => set((s) => ({
        sessions: s.sessions.map((sess) => sess.id === id ? { ...sess, name } : sess)
      })),

      setModel: (model) => set((s) => {
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId
            ? { ...sess, currentModel: model, components: model.components || [] }
            : sess
        );
        return {
          sessions: updatedSessions,
          currentModel: model,
          modelUrl: model.stl_url,
          components: model.components || [],
          revision: s.revision + 1,
        };
      }),

      setModelUrl: (url) => set({ modelUrl: url }),

      toggleWireframe: () => set((s) => ({ wireframe: !s.wireframe })),
      toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

      setComponents: (comps) => set((s) => {
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId
            ? { ...sess, components: comps }
            : sess
        );
        return {
          sessions: updatedSessions,
          components: comps,
        };
      }),

      setSelectedId: (id) => set((s) => {
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId ? { ...sess, selectedId: id, selectedIds: id ? [id] : [] } : sess
        );
        return {
          sessions: updatedSessions,
          selectedId: id,
          selectedIds: id ? [id] : [],
        };
      }),

      setSelectedIds: (ids) => set((s) => {
        const primaryId = ids.length > 0 ? ids[ids.length - 1] : null;
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId ? { ...sess, selectedId: primaryId, selectedIds: ids } : sess
        );
        return {
          sessions: updatedSessions,
          selectedId: primaryId,
          selectedIds: ids,
        };
      }),

      toggleSelectedId: (id) => set((s) => {
        const prevIds = s.selectedIds || [];
        const nextIds = prevIds.includes(id)
          ? prevIds.filter((x) => x !== id)
          : [...prevIds, id];
        const primaryId = nextIds.length > 0 ? nextIds[nextIds.length - 1] : null;
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId ? { ...sess, selectedId: primaryId, selectedIds: nextIds } : sess
        );
        return {
          sessions: updatedSessions,
          selectedId: primaryId,
          selectedIds: nextIds,
        };
      }),

      setIsolatedId: (id) => set((s) => {
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId ? { ...sess, isolatedId: id } : sess
        );
        return {
          sessions: updatedSessions,
          isolatedId: id,
        };
      }),

      clearModel: () => set((s) => {
        const updatedSessions = s.sessions.map((sess) =>
          sess.id === s.activeSessionId
            ? { ...sess, currentModel: null, components: [], selectedId: null, isolatedId: null }
            : sess
        );
        return {
          sessions: updatedSessions,
          currentModel: null,
          modelUrl: null,
          components: [],
          selectedId: null,
          isolatedId: null,
          revision: s.revision + 1,
        };
      }),
    }),
    {
      name: 'andy-viewport',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        currentModel: state.currentModel,
        modelUrl: state.modelUrl,
        components: state.components,
        revision: state.revision,
      }),
    }
  )
);
