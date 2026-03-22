import styles from "../styles";

export default function WebScheduleRow({ sched, onEdit, onDelete }) {
  return (
    <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '15px 20px' }}>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>{sched.label}</p>
        <p style={{ color: '#7dd3fc', fontSize: '12px', marginTop: '2px', margin: 0 }}>
          {sched.start_time.substring(0, 5)} - {sched.end_time.substring(0, 5)}
        </p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button 
          onClick={onEdit} 
          style={{ background: '#1e3a5f', color: '#3b82f6', border: '1px solid #3b82f6', padding: '5px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', marginRight: '8px', cursor: 'pointer' }}
        >
          EDIT
        </button>

        <button 
          onClick={onDelete} 
          style={{ background: '#e95f5f', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          DEL
        </button>
        
        <div style={{ width: '10px', height: '10px', borderRadius: '5px', marginLeft: '15px', backgroundColor: sched.enabled ? '#22c55e' : '#334155' }} />
      </div>
    </div>
  );
}