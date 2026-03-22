import styles from "../styles";

export default function WebAlertBadge({ message, type }) {
  if (!message) return null;
  const isWarning = type === 'warning';
  
  return (
    <div style={{
      ...styles.card,
      display: 'flex',
      alignItems: 'center',
      background: isWarning ? '#450a0a' : '#064e3b',
      borderColor: isWarning ? '#ef4444' : '#22c55e',
      margin: '10px 25px',
      padding: '15px'
    }}>
      <span style={{ fontSize: '20px', marginRight: '15px' }}>{isWarning ? '⚠️' : '✅'}</span>
      <div style={{ textAlign: 'left' }}>
        <p style={{ fontSize: '10px', fontWeight: 'bold', margin: 0, color: isWarning ? '#f87171' : '#4ade80', letterSpacing: '1px' }}>
          {isWarning ? 'SYSTEM ALERT' : 'SYSTEM STATUS'}
        </p>
        <p style={{ fontSize: '13px', margin: 0, color: '#fff' }}>{message}</p>
      </div>
    </div>
  );
}