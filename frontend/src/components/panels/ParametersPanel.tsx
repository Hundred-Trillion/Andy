import { useState, useEffect } from 'react';
import { useViewportStore } from '@/stores/viewportStore';
import { generateCad, getModelDownloadUrl, decomposeModel } from '@/lib/api';
import type { AssemblyComponent, CadModel } from '@/lib/types';
import { Box, Settings, Move, RefreshCw, Plus, FolderOpen, ChevronDown, ChevronRight, Trash2, Copy, Rocket, Scissors } from 'lucide-react';

const PRIMITIVES = [
  { type: 'box', label: 'Box', defaults: { length: 100, width: 50, height: 20 } },
  { type: 'cylinder', label: 'Cylinder', defaults: { diameter: 50, height: 100 } },
  { type: 'cone', label: 'Cone', defaults: { bottom_diameter: 50, top_diameter: 0, height: 50 } },
  { type: 'sphere', label: 'Sphere', defaults: { radius: 25 } },
  { type: 'tube', label: 'Tube', defaults: { outer_diameter: 50, inner_diameter: 44, length: 200 } },
  { type: 'nose_cone', label: 'Nose Cone', defaults: { diameter: 60, length: 150, shape: 'ogive' } },
  { type: 'swept_fin', label: 'Swept Fin', defaults: { root_chord: 180, tip_chord: 80, span: 250, thickness: 4, sweep_angle: 30 } },
  { type: 'bulkhead', label: 'Bulkhead', defaults: { diameter: 100, thickness: 5, hole_count: 8, hole_diameter: 8, hole_circle_diameter: 70 } },
  { type: 'mounting_bracket', label: 'Bracket', defaults: { width: 60, height: 80, thickness: 5, hole_count: 4, hole_diameter: 6 } },
  { type: 'rectangular_plate', label: 'Plate', defaults: { length: 200, width: 100, thickness: 5, corner_radius: 3 } },
  { type: 'torus', label: 'Torus', defaults: { major_radius: 50, minor_radius: 10 } },
  { type: 'wedge', label: 'Wedge', defaults: { dx: 50, dy: 50, dz: 50 } },
];

interface RefFile { name: string; path: string; format: string; size_mb: number; }

export function ParametersPanel() {
  const storeComponents = useViewportStore((s) => s.components);
  const setModel = useViewportStore((s) => s.setModel);
  const currentModel = useViewportStore((s) => s.currentModel);
  const setComponents = useViewportStore((s) => s.setComponents);
  const selectedId = useViewportStore((s) => s.selectedId);
  const isolatedId = useViewportStore((s) => s.isolatedId);

  const [localComponents, setLocalComponents] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [refFiles, setRefFiles] = useState<RefFile[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [activeTab, setActiveTab] = useState<'assembly' | 'library'>('assembly');

  useEffect(() => {
    setLocalComponents(JSON.parse(JSON.stringify(storeComponents)));
  }, [storeComponents]);

  const rebuild = async (compsList: AssemblyComponent[]) => {
    setIsGenerating(true);
    try {
      const payload: AssemblyComponent[] = compsList.map(c => ({
        ...c,
        parameters: Object.fromEntries(Object.entries(c.parameters).map(([k, v]) => [k, typeof v === 'string' && !isNaN(Number(v)) ? parseFloat(v as string) || 0 : v])),
        position: c.position.map((v: any) => parseFloat(v) || 0) as [number, number, number],
        rotation: c.rotation.map((v: any) => parseFloat(v) || 0) as [number, number, number]
      }));
      const resp = await generateCad(payload);
      if (resp.model_id) {
        const model: CadModel = {
          model_id: resp.model_id,
          components: resp.components || [],
          stl_url: getModelDownloadUrl(resp.model_id, 'stl'),
          step_url: getModelDownloadUrl(resp.model_id, 'step'),
          metadata: {},
        };
        setModel(model);
        setComponents(resp.components || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async () => {
    await rebuild(localComponents);
  };

  const addPrimitive = async (prim: typeof PRIMITIVES[0]) => {
    const spacing = 150;
    const occupied = new Set(localComponents.map((c: any) => `${Math.round(c.position[0] / spacing)},${Math.round(c.position[2] / spacing)}`));
    let pos = [0, 0, 0];
    for (let ring = 0; ring < 20; ring++) {
      let found = false;
      for (let dx = -ring; dx <= ring && !found; dx++) {
        for (let dz = -ring; dz <= ring && !found; dz++) {
          if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
          if (!occupied.has(`${dx},${dz}`)) { pos = [dx * spacing, 0, dz * spacing]; found = true; }
        }
      }
      if (found) break;
    }
    const newComp = {
      id: `${prim.type}_${Math.floor(Math.random() * 10000)}`,
      type: prim.type,
      parameters: { ...prim.defaults },
      position: pos,
      rotation: [0, 0, 0],
    };
    const nextList = [...localComponents, newComp];
    setLocalComponents(nextList);
    setShowAddMenu(false);
    await rebuild(nextList);
  };

  const loadRefFiles = async () => {
    setLoadingRefs(true);
    try {
      const res = await fetch('/api/references/files');
      if (res.ok) {
        const data = await res.json();
        setRefFiles(data);
      }
    } catch (e) {
      console.error('Failed to load references:', e);
    } finally {
      setLoadingRefs(false);
    }
  };

  const importReference = async (ref: RefFile) => {
    const spacing = 300;
    const occupied = new Set(localComponents.map((c: any) => `${Math.round(c.position[0] / spacing)},${Math.round(c.position[2] / spacing)}`));
    let pos = [0, 0, 0];
    for (let ring = 0; ring < 20; ring++) {
      let found = false;
      for (let dx = -ring; dx <= ring && !found; dx++) {
        for (let dz = -ring; dz <= ring && !found; dz++) {
          if (Math.abs(dx) !== ring && Math.abs(dz) !== ring) continue;
          if (!occupied.has(`${dx},${dz}`)) { pos = [dx * spacing, 0, dz * spacing]; found = true; }
        }
      }
      if (found) break;
    }
    const newComp = {
      id: `ref_${Math.floor(Math.random() * 10000)}`,
      type: 'import_reference',
      parameters: { file_path: ref.path },
      position: pos,
      rotation: [0, 0, 0],
    };
    const nextList = [...localComponents, newComp];
    setLocalComponents(nextList);
    setActiveTab('assembly');
    await rebuild(nextList);
  };

  const updateParam = (idx: number, key: string, value: string) => {
    const newC = [...localComponents];
    newC[idx] = { ...newC[idx], parameters: { ...newC[idx].parameters, [key]: value } };
    setLocalComponents(newC);
  };

  const updatePos = (idx: number, axis: number, value: string) => {
    const newC = [...localComponents];
    const newPos = [...newC[idx].position];
    newPos[axis] = value;
    newC[idx] = { ...newC[idx], position: newPos };
    setLocalComponents(newC);
  };

  const updateRot = (idx: number, axis: number, value: string) => {
    const newC = [...localComponents];
    const newRot = [...newC[idx].rotation];
    newRot[axis] = value;
    newC[idx] = { ...newC[idx], rotation: newRot };
    setLocalComponents(newC);
  };

  const duplicateComponent = async (idx: number) => {
    const newC = [...localComponents];
    const clone = JSON.parse(JSON.stringify(newC[idx]));
    clone.id = `${clone.type.split('_')[0]}_${Math.floor(Math.random()*1000)}`;
    newC.splice(idx + 1, 0, clone);
    setLocalComponents(newC);
    await rebuild(newC);
  };

  const clearModel = useViewportStore((s) => s.clearModel);

  const deleteComponent = async (idx: number) => {
    const newC = [...localComponents];
    newC.splice(idx, 1);
    setLocalComponents(newC);
    if (newC.length === 0) {
      clearModel();
    } else {
      await rebuild(newC);
    }
  };

  const [decomposing, setDecomposing] = useState<string | null>(null);

  const handleDecompose = async (idx: number) => {
    const comp = localComponents[idx];
    const filePath = comp.parameters?.file_path || comp.stl_file;
    if (!filePath) {
      alert('No file path found for this component. Decompose works on imported STEP files.');
      return;
    }
    setDecomposing(comp.id);
    try {
      const result = await decomposeModel(filePath);
      if (result.components && result.components.length > 0) {
        const newC = [...localComponents];
        newC.splice(idx, 1, ...result.components);
        setLocalComponents(newC);
        await rebuild(newC);
      } else {
        alert('No sub-parts found. The model may be a single solid.');
      }
    } catch (e: any) {
      console.error('Decompose failed:', e);
      alert(`Decompose failed: ${e.message}`);
    } finally {
      setDecomposing(null);
    }
  };

  const S = {
    panel: { background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' as const, fontFamily: 'var(--font-mono)' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 as const },
    headerTitle: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#000' },
    tabs: { display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0 as const },
    tab: (active: boolean) => ({ flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 600, textAlign: 'center' as const, cursor: 'pointer', border: 'none', borderBottom: active ? '2px solid #000' : '2px solid transparent', background: 'transparent', color: active ? '#000' : '#999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }),
    body: { flex: 1, overflow: 'auto', padding: 8 },
    addBtn: { width: '100%', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' },
    applyBtn: (disabled: boolean) => ({ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: disabled ? '#e2e8f0' : '#000', color: disabled ? '#999' : '#fff', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }),
    compCard: { border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 8, overflow: 'hidden' },
    compHeader: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
    compTitle: { fontSize: 10, fontWeight: 700, color: '#000', textTransform: 'uppercase' as const, flex: 1 },
    compId: { fontSize: 8, color: '#94a3b8', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#94a3b8', display: 'flex' },
    paramRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 8px' },
    paramLabel: { fontSize: 9, color: '#64748b', textTransform: 'capitalize' as const, width: '50%' },
    paramInput: { width: '50%', border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px', fontSize: 9, textAlign: 'right' as const, background: '#f8fafc', outline: 'none', fontFamily: 'var(--font-mono)', color: '#000' },
    sectionLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', padding: '4px 8px 2px' },
    transGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 3, alignItems: 'center', padding: '0 8px 6px' },
    transLabel: { fontSize: 8, color: '#94a3b8', width: 24 },
    transInput: { width: '100%', border: '1px solid #e2e8f0', borderRadius: 3, padding: '2px 4px', fontSize: 9, textAlign: 'right' as const, background: '#f8fafc', outline: 'none', fontFamily: 'var(--font-mono)', color: '#000' },
    dropdown: { position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 240, overflow: 'auto', marginTop: 4 },
    dropItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 10, cursor: 'pointer', border: 'none', background: 'transparent', width: '100%', textAlign: 'left' as const, color: '#334155', fontFamily: 'var(--font-mono)' },
    refCard: { border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', marginBottom: 6, cursor: 'pointer', background: '#f8fafc', transition: 'all 0.15s' },
    refName: { fontSize: 10, fontWeight: 600, color: '#000', marginBottom: 2 },
    refMeta: { fontSize: 8, color: '#94a3b8' },
    empty: { textAlign: 'center' as const, padding: '24px 12px', fontSize: 10, color: '#94a3b8' },
  };

  return (
    <div style={S.panel}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTitle}>
          <Settings size={12} />
          Assembly
        </div>
        {localComponents.length > 0 && (
          <button onClick={handleApply} disabled={isGenerating} style={S.applyBtn(isGenerating)}>
            <RefreshCw size={9} className={isGenerating ? 'animate-spin' : ''} />
            Apply
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(activeTab === 'assembly')} onClick={() => setActiveTab('assembly')}>
          <Box size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Components
        </button>
        <button style={S.tab(activeTab === 'library')} onClick={() => { setActiveTab('library'); if (refFiles.length === 0) loadRefFiles(); }}>
          <FolderOpen size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Library
        </button>
      </div>

      {/* Body */}
      <div style={S.body}>
        {activeTab === 'assembly' && (
          <>
            {/* Add Component Button */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <button style={S.addBtn} onClick={() => setShowAddMenu(!showAddMenu)}>
                <Plus size={12} />
                Add Component
                <ChevronDown size={10} />
              </button>
              {showAddMenu && (
                <div style={S.dropdown}>
                  {PRIMITIVES.map(p => (
                    <button key={p.type} style={S.dropItem}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => addPrimitive(p)}>
                      <Box size={10} color="#64748b" />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Component Cards */}
            {localComponents.length === 0 ? (
              <div style={S.empty}>
                No components yet.<br />
                <span style={{ fontSize: 9 }}>Add a primitive or ask the AI.</span>
              </div>
            ) : (
              localComponents.map((comp, idx) => {
                const isSelected = selectedId === comp.id;
                const isIsolated = isolatedId === comp.id;
                return (
                  <div key={idx} style={{ 
                    ...S.compCard, 
                    border: isIsolated ? '2.5px solid #6366f1' : isSelected ? '2.5px solid #000' : '1px solid #e2e8f0',
                    boxShadow: isIsolated ? '0 0 12px rgba(99, 102, 241, 0.15)' : isSelected ? '0 0 8px rgba(0,0,0,0.05)' : 'none',
                    background: isIsolated ? '#f5f3ff' : isSelected ? '#fafafa' : '#fff'
                  }}>
                    <div style={S.compHeader}>
                    <Box size={10} color="#000" />
                    <span style={S.compTitle}>{comp.type.replace(/_/g, ' ')}</span>
                    <span style={S.compId}>{comp.id}</span>
                    <button style={S.iconBtn} onClick={() => duplicateComponent(idx)} title="Duplicate">
                      <Copy size={10} />
                    </button>
                    <button style={{ ...S.iconBtn, color: '#6366f1' }} onClick={() => handleDecompose(idx)} title="Decompose into parts" disabled={decomposing === comp.id}>
                      <Scissors size={10} />
                    </button>
                    <button style={{ ...S.iconBtn, color: '#ef4444' }} onClick={() => deleteComponent(idx)} title="Delete">
                      <Trash2 size={10} />
                    </button>
                  </div>

                  {/* Parameters */}
                  <div style={S.sectionLabel}>Parameters</div>
                  {Object.entries(comp.parameters).map(([key, val]) => (
                    <div key={key} style={S.paramRow}>
                      <label style={S.paramLabel}>{key.replace(/_/g, ' ')}</label>
                      <input
                        type="text"
                        value={val as any}
                        onChange={(e) => updateParam(idx, key, e.target.value)}
                        onBlur={() => rebuild(localComponents)}
                        onKeyDown={(e) => { if (e.key === 'Enter') rebuild(localComponents); }}
                        style={S.paramInput}
                      />
                    </div>
                  ))}

                  {/* Transform */}
                  <div style={S.sectionLabel}>Position (mm)</div>
                  <div style={S.transGrid}>
                    <span style={S.transLabel}>Pos</span>
                    {['X', 'Y', 'Z'].map((axis, aIdx) => (
                      <input key={`pos-${axis}`} type="text" value={comp.position[aIdx]}
                        onChange={(e) => updatePos(idx, aIdx, e.target.value)}
                        onBlur={() => rebuild(localComponents)}
                        onKeyDown={(e) => { if (e.key === 'Enter') rebuild(localComponents); }}
                        style={S.transInput} placeholder={axis} />
                    ))}
                  </div>
                  <div style={S.transGrid}>
                    <span style={S.transLabel}>Rot°</span>
                    {['X', 'Y', 'Z'].map((axis, aIdx) => (
                      <input key={`rot-${axis}`} type="number" value={comp.rotation[aIdx]}
                        onChange={(e) => updateRot(idx, aIdx, e.target.value)}
                        onBlur={() => rebuild(localComponents)}
                        onKeyDown={(e) => { if (e.key === 'Enter') rebuild(localComponents); }}
                        style={S.transInput} placeholder={axis} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
          </>
        )}

        {activeTab === 'library' && (
          <>
            {loadingRefs ? (
              <div style={S.empty}><RefreshCw size={14} className="animate-spin" style={{ margin: '0 auto 8px' }} />Loading references...</div>
            ) : refFiles.length === 0 ? (
              <div style={S.empty}>
                No reference models found.<br />
                <span style={{ fontSize: 9 }}>Add .step or .stl files to the References folder.</span>
              </div>
            ) : (
              refFiles.map((ref, idx) => (
                <div key={idx} style={S.refCard}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                  onClick={() => importReference(ref)}>
                  <div style={S.refName}>
                    <Rocket size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {ref.name}
                  </div>
                  <div style={S.refMeta}>
                    {ref.format.toUpperCase()} · {ref.size_mb} MB
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
