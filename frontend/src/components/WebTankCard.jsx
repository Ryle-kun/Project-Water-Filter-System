import styles from "../styles";

export default function WebTankCard({ name, level, capacity, color }) {
  const pct = Math.min(100, Math.max(0, ((level || 0) / (capacity || 1)) * 100));
  
  return (
    <div style={{ ...styles.card, width: '200px', textAlign: 'center', border: 'none', background: '#0d1f3c' }}>
      <p style={{ color: '#7dd3fc', fontWeight: 'bold', fontSize: '14px', marginBottom: '15px' }}>{name}</p>
      
      <div style={{ 
        height: '220px', width: '110px', background: '#060e1a', margin: '0 auto 15px', 
        borderRadius: '20px', position: 'relative', overflow: 'hidden', border: '1px solid #1e3a5f'
      }}>
        <div style={{ 
          position: 'absolute', bottom: 0, width: '100%', 
          height: `${pct}%`, background: color, 
          transition: 'height 1s ease-in-out',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#fff' }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      
      <p style={{ fontWeight: 'bold', fontSize: '20px', margin: 0, color: '#fff' }}>{level} L</p>
    </div>
  );
}