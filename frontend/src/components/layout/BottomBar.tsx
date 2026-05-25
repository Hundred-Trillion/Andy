export function BottomBar() {
  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 28, padding: '0 16px', background: '#000', borderTop: '1px solid #333', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: '#666' }}>
        <span>UNITS: <span style={{ color: '#fff', fontWeight: 600 }}>MM</span></span>
        <span style={{ color: '#333' }}>|</span>
        <span>ANGLES: <span style={{ color: '#fff', fontWeight: 600 }}>DEG</span></span>
        <span style={{ color: '#333' }}>|</span>
        <span>TOLERANCE: <span style={{ color: '#fff', fontWeight: 600 }}>±0.10</span></span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#555' }}>
        ANDY v1.0 · Developed by Adithya
      </div>
    </footer>
  );
}
