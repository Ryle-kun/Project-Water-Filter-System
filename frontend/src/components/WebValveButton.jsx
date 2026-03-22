import styles from "../styles";

export default function WebValveButton({ label, isOpen, onToggle }) {
  return (
    <div 
      onClick={onToggle} 
      style={{ 
        ...styles.card, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        cursor: 'pointer', 
        padding: '18px 25px',
        borderColor: isOpen ? '#22c55e' : '#1e3a5f',
        transition: '0.3s'
      }}
    >
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontWeight: 'bold', margin: 0, fontSize: '15px', color: '#fff' }}>{label}</p>
        <p style={{ 
          fontSize: '11px', 
          fontWeight: 'bold', 
          marginTop: '6px', 
          letterSpacing: '1px',
          color: isOpen ? '#22c55e' : '#ef4444' 
        }}>
          {isOpen ? '● OPEN' : '○ CLOSED'}
        </p>
      </div>

      {/* ── INTERACTIVE SWITCH TRACK ── */}
      <div style={{ 
        width: '46px', height: '24px', borderRadius: '12px', 
        backgroundColor: isOpen ? '#064e3b' : '#331111', 
        position: 'relative', transition: '0.3s',
        display: 'flex', alignItems: 'center'
      }}>
        <div style={{ 
          width: '18px', height: '18px', borderRadius: '50%', 
          backgroundColor: isOpen ? '#22c55e' : '#ef4444',
          position: 'absolute', 
          left: isOpen ? '24px' : '4px', 
          transition: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );
}