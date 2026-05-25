import React, { Suspense, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Html, Environment, Edges } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { useViewportStore } from '@/stores/viewportStore';
import { Box, Orbit, Grid3x3, Ruler, Download, AlertTriangle, X, ChevronUp, Scissors, Combine, Eye, FolderOpen, Plus, Pencil } from 'lucide-react';
import { getModelDownloadUrl, generateCad, decomposeModel, mergeComponents } from '@/lib/api';
import type { AssemblyComponent } from '@/lib/types';

class ErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

const B = 'var(--color-border)';  // border
const P = 'var(--color-panel)';  // panel
const Y = 'var(--color-y)';  // yellow
const W = 'var(--color-w)';  // text color

const C = {
  panel: '#ffffff',
  card: '#f8f9fa',
  border: '#000000',
  yellow: '#000000',
  white: '#000000',
  mono: 'var(--font-mono)',
};

/* ── Pencil-sketch graph paper grid ─────────────────────────── */
function SketchGrid() {
  const minor = useMemo(() => {
    const size = 100000;
    const half = size / 2;
    const step = 100; // minor lines every 100mm
    const pos: number[] = [];
    for (let i = -half; i <= half; i += step) {
      pos.push(-half, 0, i, half, 0, i); // along X
      pos.push(i, 0, -half, i, 0, half); // along Z
    }
    const buf = new THREE.BufferGeometry();
    buf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return buf;
  }, []);

  const major = useMemo(() => {
    const size = 100000;
    const half = size / 2;
    const step = 500; // major lines every 500mm
    const pos: number[] = [];
    for (let i = -half; i <= half; i += step) {
      pos.push(-half, 0, i, half, 0, i);
      pos.push(i, 0, -half, i, 0, half);
    }
    const buf = new THREE.BufferGeometry();
    buf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return buf;
  }, []);

  // Axis lines through origin
  const axes = useMemo(() => {
    const pos: number[] = [];
    // X axis (red) — long line along X
    pos.push(-10000, 0.5, 0, 10000, 0.5, 0);
    // Z axis (blue) — long line along Z
    pos.push(0, 0.5, -10000, 0, 0.5, 10000);
    const buf = new THREE.BufferGeometry();
    buf.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return buf;
  }, []);

  return (
    <group>
      {/* Minor grid — faint pencil lines */}
      <lineSegments geometry={minor}>
        <lineBasicMaterial color="#d4d4d4" transparent opacity={0.5} />
      </lineSegments>
      {/* Major grid — slightly darker pencil lines */}
      <lineSegments geometry={major}>
        <lineBasicMaterial color="#aaaaaa" transparent opacity={0.6} />
      </lineSegments>
      {/* X axis — subtle red */}
      <line>
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" args={[new Float32Array([-10000, 0.5, 0, 10000, 0.5, 0]), 3]} count={2} />
        </bufferGeometry>
        <lineBasicMaterial color="#e57373" transparent opacity={0.6} />
      </line>
      {/* Z axis — subtle blue */}
      <line>
        <bufferGeometry attach="geometry">
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0.5, -10000, 0, 0.5, 10000]), 3]} count={2} />
        </bufferGeometry>
        <lineBasicMaterial color="#64b5f6" transparent opacity={0.6} />
      </line>
    </group>
  );
}

/* ── Auto-placement helper ──────────────────────────────────── */
function findFreePosition(existingComponents: AssemblyComponent[]): [number, number, number] {
  const spacing = 150;
  const occupied = new Set(existingComponents.map(c => `${Math.round(c.position[0] / spacing)},${Math.round(c.position[2] / spacing)}`));
  
  // Spiral outward from origin
  for (let ring = 0; ring < 20; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dz = -ring; dz <= ring; dz++) {
        if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue; // only border of ring
        const key = `${dx},${dz}`;
        if (!occupied.has(key)) {
          return [dx * spacing, 0, dz * spacing];
        }
      }
    }
  }
  return [Math.random() * 500, 0, Math.random() * 500];
}

export function CadViewport() {
  const wireframe = useViewportStore((s) => s.wireframe);
  const showDimensions = useViewportStore((s) => s.showDimensions);
  const currentModel = useViewportStore((s) => s.currentModel);
  const components = useViewportStore((s) => s.components);
  const setModel = useViewportStore((s) => s.setModel);
  const clearModel = useViewportStore((s) => s.clearModel);
  const setComponents = useViewportStore((s) => s.setComponents);
  const toggleWireframe = useViewportStore((s) => s.toggleWireframe);
  const toggleDimensions = useViewportStore((s) => s.toggleDimensions);
  const revision = useViewportStore((s) => s.revision);

  const selectedId = useViewportStore((s) => s.selectedId);
  const setSelectedId = useViewportStore((s) => s.setSelectedId);
  const selectedIds = useViewportStore((s) => s.selectedIds || []);
  const setSelectedIds = useViewportStore((s) => s.setSelectedIds);
  const toggleSelectedId = useViewportStore((s) => s.toggleSelectedId);
  const isolatedId = useViewportStore((s) => s.isolatedId);
  const setIsolatedId = useViewportStore((s) => s.setIsolatedId);

  // Multi-session hooks
  const sessions = useViewportStore((s) => s.sessions);
  const activeSessionId = useViewportStore((s) => s.activeSessionId);
  const addSession = useViewportStore((s) => s.addSession);
  const switchSession = useViewportStore((s) => s.switchSession);
  const closeSession = useViewportStore((s) => s.closeSession);
  const renameSession = useViewportStore((s) => s.renameSession);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orbitRef = useRef<any>(null);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<AssemblyComponent[][]>([]);
  const [redoStack, setRedoStack] = useState<AssemblyComponent[][]>([]);

  const [isProcessing, setIsProcessing] = useState(false);

  // Box Mode — shows bounding box wireframe for every component
  const [showBoxMode, setShowBoxMode] = useState(false);

  // Dynamic left+right simultaneous mouse button panning
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!orbitRef.current) return;
      // THREE.MOUSE.ROTATE is 0, THREE.MOUSE.PAN is 2
      if (e.buttons === 3) {
        // Both left and right mouse buttons are pressed
        orbitRef.current.mouseButtons.LEFT = 2; // THREE.MOUSE.PAN
      } else {
        orbitRef.current.mouseButtons.LEFT = 0; // THREE.MOUSE.ROTATE
      }
    };
    window.addEventListener('mousedown', handleMouse);
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('mouseup', handleMouse);
    return () => {
      window.removeEventListener('mousedown', handleMouse);
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('mouseup', handleMouse);
    };
  }, []);

  const updateComponentsWithHistory = async (newComps: AssemblyComponent[]) => {
    // Save current components configuration to undo stack
    setUndoStack(prev => [...prev.slice(-49), components]);
    setRedoStack([]); // Clear redo stack on new action
    
    setComponents(newComps);
    setIsProcessing(true);
    try {
      const resp = await generateCad(newComps);
      if (resp.model_id) {
        setModel({
          model_id: resp.model_id,
          components: resp.components || [],
          stl_url: getModelDownloadUrl(resp.model_id, 'stl'),
          step_url: getModelDownloadUrl(resp.model_id, 'step'),
          metadata: {},
        });
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const nextUndo = undoStack.slice(0, -1);
    
    setRedoStack(prev => [...prev, components]);
    setUndoStack(nextUndo);
    
    setComponents(previous);
    setIsProcessing(true);
    try {
      const resp = await generateCad(previous);
      if (resp.model_id) {
        setModel({
          model_id: resp.model_id,
          components: resp.components || [],
          stl_url: getModelDownloadUrl(resp.model_id, 'stl'),
          step_url: getModelDownloadUrl(resp.model_id, 'step'),
          metadata: {},
        });
      }
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    
    setUndoStack(prev => [...prev, components]);
    setRedoStack(nextRedo);
    
    setComponents(next);
    setIsProcessing(true);
    try {
      const resp = await generateCad(next);
      if (resp.model_id) {
        setModel({
          model_id: resp.model_id,
          components: resp.components || [],
          stl_url: getModelDownloadUrl(resp.model_id, 'stl'),
          step_url: getModelDownloadUrl(resp.model_id, 'step'),
          metadata: {},
        });
      }
    } catch (err) {
      console.error('Redo failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Toolbar Primitives
  const handleQuickAdd = async (type: string, defaults: any) => {
    const pos = findFreePosition(components);
    const newComp: AssemblyComponent = {
      id: `${type}_${Math.floor(Math.random() * 10000)}`,
      type,
      parameters: { ...defaults },
      position: pos,
      rotation: [0, 0, 0],
    };
    const newComps = [...components, newComp];
    updateComponentsWithHistory(newComps);
  };

  // Merge all or only selected components into one
  const handleMergeAll = async () => {
    // If multiple components are selected, merge only the selected ones!
    // Otherwise, merge all components in the session.
    const compsToMerge = selectedIds.length >= 2 
      ? components.filter(c => selectedIds.includes(c.id))
      : components;

    if (compsToMerge.length < 2) return;
    setIsProcessing(true);
    try {
      const resp = await mergeComponents(compsToMerge);
      if (resp.model_id && resp.components) {
        if (selectedIds.length >= 2) {
          // In-place replacement: remove selected components and append the new merged components!
          const remainingComps = components.filter(c => !selectedIds.includes(c.id));
          const newComps = [...remainingComps, ...resp.components];
          updateComponentsWithHistory(newComps);
          setSelectedIds([]);
          // Force update Model STL/STEP so that it continues to render the fully updated scene cleanly
          setModel({
            ...currentModel!,
            components: newComps,
            stl_url: getModelDownloadUrl(resp.model_id, 'stl'),
            step_url: getModelDownloadUrl(resp.model_id, 'step'),
            model_id: resp.model_id,
            metadata: {}
          });
        } else {
          // Merged all
          updateComponentsWithHistory(resp.components);
          setModel({
            ...currentModel!,
            components: resp.components,
            stl_url: getModelDownloadUrl(resp.model_id, 'stl'),
            step_url: getModelDownloadUrl(resp.model_id, 'step'),
            model_id: resp.model_id,
            metadata: {}
          });
        }
      }
    } catch (e: any) { 
      console.error('Merge failed:', e); 
    } finally {
      setIsProcessing(false);
    }
  };

  // Render all components to avoid React Three Fiber unmounting/re-layout glitches. Visibility is controlled downstream.
  const visibleComponents = components;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
      {/* ── Header with Chrome-style tabs ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 48, borderBottom: `1px solid ${C.border}`, flexShrink: 0, gap: 16 }}>
        {/* Sleek Chrome-style session tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflowX: 'auto', paddingRight: 10, height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 12, borderRight: '1px solid #e2e8f0', paddingRight: 12, height: 24 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={Y} strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CAD</span>
          </div>

          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            const isEditing = editingSessionId === sess.id;
            
            return (
              <div 
                key={sess.id}
                onClick={() => !isActive && switchSession(sess.id)}
                onDoubleClick={() => {
                  setEditingSessionId(sess.id);
                  setEditingName(sess.name);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 12px',
                  background: isActive ? '#ffffff' : 'transparent',
                  borderLeft: isActive ? '2px solid #000000' : '1px solid transparent',
                  borderRight: isActive ? '2px solid #000000' : '1px solid transparent',
                  borderTop: isActive ? '2px solid #000000' : '1px solid transparent',
                  borderBottom: isActive ? '2px solid #ffffff' : '1px solid transparent',
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#000000' : '#888888',
                  transition: 'all 0.1s ease',
                  position: 'relative',
                  top: 9, // aligns perfectly with bottom border
                  height: 30,
                  zIndex: isActive ? 5 : 1,
                }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => {
                      if (editingName.trim()) renameSession(sess.id, editingName.trim());
                      setEditingSessionId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingName.trim()) renameSession(sess.id, editingName.trim());
                        setEditingSessionId(null);
                      }
                    }}
                    autoFocus
                    style={{
                      border: 'none',
                      background: 'transparent',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      width: 80,
                      outline: 'none',
                      color: '#000',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{sess.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSessionId(sess.id);
                        setEditingName(sess.name);
                      }}
                      title="Rename Session Tab"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isActive ? 0.6 : 0.3,
                        transition: 'opacity 0.1s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = isActive ? '0.6' : '0.3'}
                    >
                      <Pencil size={8} color="#000" />
                    </button>
                  </div>
                )}
                
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSession(sess.id);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 2,
                      borderRadius: '50%',
                      color: '#888',
                    }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Add Session Plus Button */}
          <button
            onClick={() => addSession()}
            title="Create New Session"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 4,
              border: '2px solid #000',
              background: '#fff',
              cursor: 'pointer',
              marginLeft: 4,
              position: 'relative',
              top: 8,
            }}
          >
            <Plus size={10} color="#000" strokeWidth={3} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isolatedId && (
            <button onClick={() => setIsolatedId(null)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
              <Eye size={11}/> Show All
            </button>
          )}
          {components.length >= 2 && (
            <button onClick={handleMergeAll} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: selectedIds.length >= 2 ? '#b45309' : '#059669', color: '#fff', border: 'none', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>
              <Combine size={11}/> {selectedIds.length >= 2 ? `Merge Selected (${selectedIds.length})` : 'Merge All'}
            </button>
          )}
          <button 
            onClick={handleUndo} 
            disabled={undoStack.length === 0} 
            title="Undo Last Action" 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              border: '2px solid #000000',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              background: undoStack.length === 0 ? '#f1f5f9' : '#ffffff',
              color: undoStack.length === 0 ? '#cbd5e1' : '#000000',
              cursor: undoStack.length === 0 ? 'default' : 'pointer',
              opacity: undoStack.length === 0 ? 0.5 : 1,
              transition: 'all 0.1s ease',
            }}
          >
            ↩️ Undo
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0} 
            title="Redo Next Action" 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              border: '2px solid #000000',
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              background: redoStack.length === 0 ? '#f1f5f9' : '#ffffff',
              color: redoStack.length === 0 ? '#cbd5e1' : '#000000',
              cursor: redoStack.length === 0 ? 'default' : 'pointer',
              opacity: redoStack.length === 0 ? 0.5 : 1,
              transition: 'all 0.1s ease',
            }}
          >
            ↪️ Redo
          </button>
          <TBtn icon={<Grid3x3 size={12}/>} label="Wireframe" active={wireframe} onClick={toggleWireframe} />
          <TBtn icon={<Box size={12}/>} label="Box Mode" active={showBoxMode} onClick={() => setShowBoxMode(b => !b)} />
          <TBtn icon={<Ruler size={12}/>} label="Dimensions" active={showDimensions} onClick={toggleDimensions} />
          {currentModel && (
            <>
              <a href={getModelDownloadUrl(currentModel.model_id, 'step')} download
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: `1px solid ${B}`, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: '#999', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 4 }}>
                <Download size={11}/> STEP
              </a>
              <a href={getModelDownloadUrl(currentModel.model_id, 'stl')} download
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: `1px solid ${B}`, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: '#999', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em', marginLeft: 4 }}>
                <Download size={11}/> STL
              </a>
            </>
          )}
        </div>
      </div>

      {/* ── 3D Scene ─────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', background: '#f5f3ef' }}>
        {isProcessing && (
          <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: Y, border: `2px solid ${B}`, borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 12, height: 12, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>Generating CAD...</span>
          </div>
        )}
        <Canvas
          camera={{ position: [300, 200, 300], fov: 45, near: 0.1, far: 200000 }}
          gl={{ antialias: true, alpha: false }}
          onCreated={({ gl }) => gl.setClearColor('#f5f3ef')}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[200, 300, 200]} intensity={1.5} />
          <directionalLight position={[-100, -50, -200]} intensity={0.5} color="#e0e7ff" />
          <Environment preset="city" />
          <SketchGrid />
          <ErrorBoundary fallback={<Html center><div style={{ padding: '8px 16px', background: '#301010', border: '1px solid #f87171', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, minWidth: 220 }}><AlertTriangle size={14}/> Error rendering STL</div></Html>}>
            {visibleComponents.map((comp) => (
              <Suspense key={`${comp.id}-${revision}`} fallback={
                <group position={comp.position}>
                  <mesh>
                    <boxGeometry args={[40, 40, 40]} />
                    <meshBasicMaterial color="#cbd5e1" wireframe transparent opacity={0.3} />
                  </mesh>
                </group>
              }>
                <InteractiveModel 
                  key={`${comp.id}-${revision}`} 
                  comp={comp} 
                  wireframe={wireframe}
                  showBoxMode={showBoxMode}
                  revision={revision} 
                  isSelected={selectedIds.includes(comp.id)}
                  isIsolated={isolatedId === comp.id}
                  visible={!isolatedId || isolatedId === comp.id}
                  onClick={(shiftKey) => {
                    if (shiftKey) {
                      toggleSelectedId(comp.id);
                    } else {
                      setSelectedId(comp.id);
                    }
                  }}
                  onDoubleClick={() => {
                    const nextIsolated = isolatedId === comp.id ? null : comp.id;
                    setIsolatedId(nextIsolated);
                  }}
                  onUpdate={(updatedComp) => {
                    const newComps = components.map(c => c.id === updatedComp.id ? updatedComp : c);
                    updateComponentsWithHistory(newComps);
                  }}
                  onClose={() => setSelectedId(null)}
                  onDelete={(id) => {
                     const newComps = components.filter(c => c.id !== id);
                     setSelectedId(null);
                     if (newComps.length === 0) {
                       setUndoStack(prev => [...prev.slice(-49), components]);
                       setRedoStack([]);
                       setComponents([]);
                       clearModel();
                     } else {
                       updateComponentsWithHistory(newComps);
                     }
                  }}
                  onDuplicate={(compToCopy) => {
                     const pos = findFreePosition(components);
                     const newComp = { ...compToCopy, id: `part_${Date.now()}`, position: pos as [number, number, number] };
                     const newComps = [...components, newComp];
                     updateComponentsWithHistory(newComps);
                  }}
                  onDecompose={async (comp) => {
                    const filePath = comp.parameters?.file_path || comp.stl_file;
                    if (!filePath) return;
                    try {
                      const result = await decomposeModel(filePath);
                      if (result.components?.length > 0) {
                        const newParts = result.components.map((p: any, i: number) => ({
                          ...p,
                          position: [comp.position[0] + (i % 5) * 150, comp.position[1], comp.position[2] + Math.floor(i / 5) * 150],
                        }));
                        const newComps = components.filter(c => c.id !== comp.id).concat(newParts);
                        updateComponentsWithHistory(newComps);
                      }
                    } catch (e: any) {
                      console.error('Decompose failed:', e);
                    }
                  }}
                  onDragStart={() => { setDraggingId(comp.id); if (orbitRef.current) orbitRef.current.enabled = false; }}
                  onDragEnd={(newPos) => {
                    setDraggingId(null);
                    if (orbitRef.current) orbitRef.current.enabled = true;
                    const newComps = components.map(c => c.id === comp.id ? { ...c, position: newPos } : c);
                    updateComponentsWithHistory(newComps);
                  }}
                />
              </Suspense>
            ))}
          </ErrorBoundary>
          {components.length === 0 && <Ghost />}
          <OrbitControls ref={orbitRef} enableDamping dampingFactor={0.1} minDistance={10} maxDistance={100000} />
          <GizmoHelper alignment="top-right" margin={[60, 60]}><GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" /></GizmoHelper>
          <axesHelper args={[200]} />
        </Canvas>

        {/* Floating Manual CAD Toolbar - Sleek Glassmorphism */}
        <div style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px) saturate(120%)',
          border: '3px solid #000000',
          borderRadius: 12,
          padding: '16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 10,
          alignItems: 'center',
          width: 60,
        }}>
          <div style={{ fontSize: 8, fontWeight: 900, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: '#000', textTransform: 'uppercase', borderBottom: '3px solid #000', width: '100%', textAlign: 'center', paddingBottom: 6, marginBottom: 4 }}>DRAW</div>
          
          <button onClick={() => handleQuickAdd('box', { length: 100, width: 50, height: 20 })} 
            title="Create Box"
            style={{ width: 40, height: 40, background: '#fff', border: '3px solid #000', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 18, height: 18, background: '#000' }} />
          </button>

          <button onClick={() => handleQuickAdd('cylinder', { diameter: 50, height: 100 })} 
            title="Create Cylinder"
            style={{ width: 40, height: 40, background: '#fff', border: '3px solid #000', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#000', border: '1px solid #fff', boxShadow: '0 0 0 2px #000' }} />
          </button>

          <button onClick={() => handleQuickAdd('sphere', { radius: 25 })} 
            title="Create Sphere"
            style={{ width: 40, height: 40, background: '#fff', border: '3px solid #000', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #555, #000)' }} />
          </button>

          <button onClick={() => handleQuickAdd('tube', { outer_diameter: 50, inner_diameter: 44, length: 200 })} 
            title="Create Tube"
            style={{ width: 40, height: 40, background: '#fff', border: '3px solid #000', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '4px solid #000', background: 'transparent' }} />
          </button>

          <button onClick={() => handleQuickAdd('cone', { bottom_diameter: 50, top_diameter: 0, height: 50 })} 
            title="Create Cone"
            style={{ width: 40, height: 40, background: '#fff', border: '3px solid #000', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '18px solid #000' }} />
          </button>

          <div style={{ width: '100%', height: '2px', background: '#000', margin: '4px 0' }} />

          <button 
            onClick={() => {
              const triggerLibBtn = document.querySelectorAll('button[style*="font-weight: 600"]') as NodeListOf<HTMLButtonElement>;
              for (const btn of triggerLibBtn) {
                if (btn.textContent?.toLowerCase().includes('library')) {
                  btn.click();
                  break;
                }
              }
            }}
            title="Open Reference Library"
            style={{ width: 40, height: 40, background: Y, border: '3px solid #000', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <FolderOpen size={18} color="#000" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InteractiveModel({ comp, wireframe, showBoxMode, isSelected, isIsolated, visible, onClick, onDoubleClick, onUpdate, onClose, onDelete, onDuplicate, onDecompose, onDragStart, onDragEnd, revision }: { 
  comp: AssemblyComponent; wireframe: boolean; showBoxMode: boolean; isSelected: boolean; isIsolated: boolean; visible: boolean;
  onClick: (shiftKey?: boolean) => void; onDoubleClick: () => void; onUpdate: (c: AssemblyComponent) => void; onClose: () => void; 
  onDelete: (id: string) => void; onDuplicate: (c: AssemblyComponent) => void; onDecompose: (c: AssemblyComponent) => void;
  onDragStart: () => void; onDragEnd: (newPos: [number, number, number]) => void; revision: number 
}) {
  const url = comp.stl_file ? `http://localhost:8000/generated/${comp.stl_file.split('/').pop()?.split('\\').pop()}?r=${revision}` : null;
  const [editParams, setEditParams] = useState<Record<string, any>>({...comp.parameters});
  const [editPos, setEditPos] = useState<number[]>([...(comp.position || [0,0,0])]);
  const [dirty, setDirty] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<[number, number, number]>([...(comp.position || [0,0,0])] as [number, number, number]);

  // Ctrl drag rotation states
  const [isRotating, setIsRotating] = useState(false);
  const [startRot, setStartRot] = useState<number[]>([0, 0, 0]);
  const [startPointer, setStartPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragRot, setDragRot] = useState<[number, number, number]>([...(comp.rotation || [0,0,0])] as [number, number, number]);
  const [activeRotAxis, setActiveRotAxis] = useState<'X' | 'Y' | null>(null);

  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    setEditParams({...comp.parameters});
    setEditPos([...(comp.position || [0,0,0])]);
    setDragPos([...(comp.position || [0,0,0])] as [number, number, number]);
    setDragRot([...(comp.rotation || [0,0,0])] as [number, number, number]);
    setDirty(false);
  }, [comp.parameters, comp.position, comp.rotation]);

  // Long press for 3 seconds to toggle parametric mode
  const longPressTimer = useRef<any>(null);
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Drag handlers
  const handlePointerDown = useCallback((e: any) => {
    if (e.button !== 0) return; // only left click
    // Prevent intercepting if they are holding both left+right to pan the camera
    if (e.buttons === 3) return;
    
    e.stopPropagation();

    // Start 3-second long press timer
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      onClick(); // triggers selection / parametric popup card
    }, 3000);
    
    if (e.ctrlKey) {
      setIsRotating(true);
      setActiveRotAxis(null);
      setStartRot([...(comp.rotation || [0, 0, 0])]);
      setStartPointer({ x: e.clientX, y: e.clientY });
      onDragStart(); // disable OrbitControls
      (gl.domElement as HTMLElement).style.cursor = 'ew-resize';
    } else {
      setIsDragging(true);
      onDragStart();
      (gl.domElement as HTMLElement).style.cursor = 'grabbing';
    }
  }, [gl, onDragStart, comp.rotation, onClick, clearLongPress]);

  useEffect(() => {
    if (!isDragging && !isRotating) return;
    const onMove = (e: PointerEvent) => {
      clearLongPress();
      if (isRotating) {
        const deltaX = e.clientX - startPointer.x;
        const deltaY = e.clientY - startPointer.y;
        
        let snapX = startRot[0];
        let snapY = startRot[1];
        
        let newActiveAxis = activeRotAxis;
        if (!newActiveAxis) {
          if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            newActiveAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'Y' : 'X';
            setActiveRotAxis(newActiveAxis);
          }
        }
        
        // Single-axis alignment locking: rotate Y (yaw) for horizontal drag, X (pitch) for vertical drag
        if (newActiveAxis === 'Y') {
          const newRotY = startRot[1] + deltaX * 0.5;
          snapY = Math.round(newRotY / 5) * 5;
        } else if (newActiveAxis === 'X') {
          const newRotX = startRot[0] + deltaY * 0.5;
          snapX = Math.round(newRotX / 5) * 5;
        }
        
        const nextRot: [number, number, number] = [snapX, snapY, startRot[2]];
        setDragRot(nextRot);
        if (groupRef.current) {
          groupRef.current.rotation.set(
            THREE.MathUtils.degToRad(snapX),
            THREE.MathUtils.degToRad(snapY),
            THREE.MathUtils.degToRad(startRot[2])
          );
        }
      } else {
        const rect = gl.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        raycaster.setFromCamera(mouse, camera);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, intersection)) {
          setDragPos([intersection.x, 0, intersection.z]);
          if (groupRef.current) {
            groupRef.current.position.set(intersection.x, 0, intersection.z);
          }
        }
      }
    };
    const onUp = () => {
      if (isRotating) {
        setIsRotating(false);
        if (
          Math.abs(dragRot[0] - (comp.rotation?.[0] || 0)) > 0.1 ||
          Math.abs(dragRot[1] - (comp.rotation?.[1] || 0)) > 0.1 ||
          Math.abs(dragRot[2] - (comp.rotation?.[2] || 0)) > 0.1
        ) {
          onUpdate({
            ...comp,
            rotation: dragRot
          });
        }
      } else {
        setIsDragging(false);
        if (
          Math.abs(dragPos[0] - (comp.position?.[0] || 0)) > 0.1 ||
          Math.abs(dragPos[1] - (comp.position?.[1] || 0)) > 0.1 ||
          Math.abs(dragPos[2] - (comp.position?.[2] || 0)) > 0.1
        ) {
          onDragEnd(dragPos);
        }
      }
      (gl.domElement as HTMLElement).style.cursor = 'auto';
    };
    gl.domElement.addEventListener('pointermove', onMove);
    gl.domElement.addEventListener('pointerup', onUp);
    return () => {
      gl.domElement.removeEventListener('pointermove', onMove);
      gl.domElement.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, isRotating, camera, gl, groundPlane, raycaster, onDragEnd, dragPos, dragRot, startPointer, startRot, comp, onUpdate]);
  
  if (!url) return null;
  const geo = useLoader(STLLoader, url);
  const ref = useRef<THREE.Mesh>(null);
  
  const g = useMemo(() => { geo.center(); geo.computeVertexNormals(); return geo; }, [geo]);
  
  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { 
      ...comp, 
      parameters: Object.fromEntries(Object.entries(editParams).map(([k, v]) => [k, typeof v === 'string' && !isNaN(Number(v)) ? parseFloat(v) : v])),
      position: editPos.map(v => typeof v === 'string' ? parseFloat(v) || 0 : v) as [number, number, number]
    };
    onUpdate(updated);
    setDirty(false);
  };

  const lastClickRef = useRef<{ time: number; count: number }>({ time: 0, count: 0 });
  const clickTimerRef = useRef<any>(null);
  const handleMeshClick = (e: any) => {
    e.stopPropagation();
    clearLongPress();
    
    if (isDragging || isRotating) return;

    const now = Date.now();
    const diff = now - lastClickRef.current.time;
    if (diff < 400) {
      lastClickRef.current.count += 1;
    } else {
      lastClickRef.current.count = 1;
    }
    lastClickRef.current.time = now;

    // Clear any pending single-click timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    if (lastClickRef.current.count === 3) {
      // Triple click triggers isolation focus!
      onDoubleClick();
      lastClickRef.current.count = 0;
    } else if (lastClickRef.current.count === 1) {
      // Delay single click to allow triple-click detection
      const shiftKey = !!(e.shiftKey || e.nativeEvent?.shiftKey);
      clickTimerRef.current = setTimeout(() => {
        onClick(shiftKey);
        clickTimerRef.current = null;
      }, 420);
    }
  };

  // Glow color: purple when isolated, yellow when selected, default otherwise
  const glowColor = isIsolated ? '#6366f1' : Y;
  const meshColor = isSelected ? '#ffffff' : isIsolated ? '#e8e0ff' : '#cbd5e1';

  return (
    <group 
      ref={groupRef} 
      position={dragPos}
      rotation={[
        THREE.MathUtils.degToRad(dragRot[0]),
        THREE.MathUtils.degToRad(dragRot[1]),
        THREE.MathUtils.degToRad(dragRot[2])
      ]}
      visible={visible}
    >
      <mesh 
        ref={ref} 
        geometry={g} 
        castShadow 
        onPointerDown={handlePointerDown}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onClick={handleMeshClick}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = isRotating ? 'ew-resize' : isDragging ? 'grabbing' : 'grab'; }}
        onPointerOut={() => { clearLongPress(); if (!isDragging && !isRotating) document.body.style.cursor = 'auto'; }}
      >
        {wireframe 
          ? <meshBasicMaterial color={Y} wireframe transparent opacity={0.5} /> 
          : <meshStandardMaterial color={meshColor} metalness={isSelected ? 0.8 : 0.7} roughness={0.15} side={THREE.DoubleSide} />
        }
        {(isSelected || isIsolated) && <Edges scale={1.02} threshold={15} color={glowColor} linewidth={isIsolated ? 2 : 1} />}
      </mesh>
      {showBoxMode && g && (() => {
        g.computeBoundingBox();
        const bb = g.boundingBox;
        if (!bb) return null;
        const size: [number, number, number] = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
        const center: [number, number, number] = [(bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2];
        return (
          <mesh position={center}>
            <boxGeometry args={size} />
            <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.6} />
          </mesh>
        );
      })()}
      
      {isSelected && (
        <Html position={[0, 0, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'all' }}>
          <div 
            onPointerDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onPointerUp={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onPointerMove={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onMouseDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onMouseUp={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onWheel={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onKeyDown={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onKeyUp={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onDoubleClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            onContextMenu={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(10px)',
              border: `2px solid ${isIsolated ? '#6366f1' : Y}`,
              borderRadius: 10,
              padding: 12,
              minWidth: 240,
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              transform: 'translate(20px, -20px)',
              pointerEvents: 'all',
              userSelect: 'text',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: '#000', textTransform: 'uppercase' }}>{comp.type.replace(/_/g, ' ')}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={(e) => { e.stopPropagation(); onDoubleClick(); }} title={isIsolated ? "Show all" : "Isolate this model"} style={{ background: isIsolated ? '#6366f1' : 'none', border: '1px solid #e2e8f0', color: isIsolated ? '#fff' : '#999', cursor: 'pointer', padding: '1px 4px', borderRadius: 3, fontSize: 8 }}><Eye size={10} /></button>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#999', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Parameters</div>
              {Object.entries(editParams).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#333', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{key.replace(/_/g, ' ')}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      setEditParams(prev => ({ ...prev, [key]: e.target.value }));
                      setDirty(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 64, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#000', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', outline: 'none' }}
                  />
                </div>
              ))}
              
              <div style={{ fontSize: 8, fontWeight: 700, color: '#999', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Position (mm)</div>
              {['X','Y','Z'].map((axis, idx) => (
                <div key={`pos_${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#333', fontSize: 10, fontFamily: 'var(--font-mono)' }}>Pos {axis}</label>
                  <input
                    type="number"
                    value={editPos[idx]}
                    onChange={(e) => {
                      const newPos = [...editPos];
                      newPos[idx] = parseFloat(e.target.value) || 0;
                      setEditPos(newPos);
                      setDirty(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 64, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#000', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'var(--font-mono)', textAlign: 'right', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#999', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8, marginBottom: 4 }}>Align / Rotate 90°</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [comp.rotation?.[0] || 0, ((comp.rotation?.[1] || 0) - 90) % 360, comp.rotation?.[2] || 0];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Rotate Left 90° (Y Axis)"
                  style={{ flex: 1, padding: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#000', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  ⬅️ Left 90°
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [comp.rotation?.[0] || 0, ((comp.rotation?.[1] || 0) + 90) % 360, comp.rotation?.[2] || 0];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Rotate Right 90° (Y Axis)"
                  style={{ flex: 1, padding: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#000', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  ➡️ Right 90°
                </button>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [((comp.rotation?.[0] || 0) + 90) % 360, comp.rotation?.[1] || 0, comp.rotation?.[2] || 0];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Rotate Up 90° (X Axis)"
                  style={{ flex: 1, padding: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#000', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  ⬆️ Up 90°
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [((comp.rotation?.[0] || 0) - 90) % 360, comp.rotation?.[1] || 0, comp.rotation?.[2] || 0];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Rotate Down 90° (X Axis)"
                  style={{ flex: 1, padding: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, color: '#000', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  ⬇️ Down 90°
                </button>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [((comp.rotation?.[0] || 0) + 180) % 360, comp.rotation?.[1] || 0, comp.rotation?.[2] || 0];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Flip 180° X"
                  style={{ flex: 1, padding: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, color: '#475569', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  ↕ Flip X
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [comp.rotation?.[0] || 0, ((comp.rotation?.[1] || 0) + 180) % 360, comp.rotation?.[2] || 0];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Flip 180° Y"
                  style={{ flex: 1, padding: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, color: '#475569', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  ↔ Flip Y
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextRot: [number, number, number] = [comp.rotation?.[0] || 0, comp.rotation?.[1] || 0, ((comp.rotation?.[2] || 0) + 180) % 360];
                    onUpdate({ ...comp, rotation: nextRot });
                  }}
                  title="Flip 180° Z"
                  style={{ flex: 1, padding: '4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, color: '#475569', fontSize: 9, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
                >
                  🔄 Flip Z
                </button>
              </div>
            </div>

            {/* Action buttons row 1: Apply + Copy + Delete */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                onClick={handleApply}
                disabled={!dirty}
                style={{ flex: 2, padding: '5px', background: dirty ? '#000' : '#e2e8f0', border: 'none', borderRadius: 4, color: dirty ? '#fff' : '#999', fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: dirty ? 'pointer' : 'default', letterSpacing: '0.05em' }}
              >
                ▶ Apply
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDuplicate(comp); }}
                style={{ flex: 1, padding: '5px', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 4, color: '#666', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Copy
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(comp.id); }}
                style={{ flex: 1, padding: '5px', background: 'transparent', border: '1px solid #fca5a5', borderRadius: 4, color: '#ef4444', fontSize: 9, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Del
              </button>
            </div>

            {/* Action buttons row 2: Decompose + Isolate */}
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onDecompose(comp); }}
                style={{ flex: 1, padding: '5px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 4, color: '#6366f1', fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Scissors size={10} /> Decompose
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
                style={{ flex: 1, padding: '5px', background: isIsolated ? '#6366f1' : '#f0fdf4', border: `1px solid ${isIsolated ? '#6366f1' : '#bbf7d0'}`, borderRadius: 4, color: isIsolated ? '#fff' : '#16a34a', fontSize: 9, fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Eye size={10} /> {isIsolated ? 'Show All' : 'Isolate'}
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );

}

function Ghost() {
  return (
    <group>
      <mesh position={[0, 25, 0]} rotation={[0, 0, -0.1]}><boxGeometry args={[150, 55, 4]} /><meshStandardMaterial color="#cbd5e1" wireframe transparent opacity={0.5} /></mesh>
      <mesh><boxGeometry args={[150, 4, 45]} /><meshStandardMaterial color="#cbd5e1" wireframe transparent opacity={0.5} /></mesh>
    </group>
  );
}

function TBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', border: active ? '1px solid rgba(245,197,24,0.3)' : '1px solid transparent', background: active ? 'rgba(245,197,24,0.06)' : 'transparent', color: active ? Y : '#777' }}>
      {icon} {label}
    </button>
  );
}
