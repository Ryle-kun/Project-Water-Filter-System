const styles = {
  // ── 🌍 GLOBAL & MAIN CONTAINER ──
  mainContainer: { 
    backgroundColor: '#040b15', 
    minHeight: '100vh', 
    width: '100vw', 
    color: '#fff', 
    fontFamily: "'Inter', sans-serif", 
    margin: 0, 
    padding: 0, 
    overflowX: 'hidden' 
  },

  // ── 🔝 HEADER & NAVIGATION ──
  header: { 
    padding: '25px 50px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    background: 'rgba(13, 31, 60, 0.5)', 
    backdropFilter: 'blur(10px)', 
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)' 
  },
  title: { fontSize: '24px', fontWeight: 'bold', margin: 0 },
  adminTag: { color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px' },
  logoutBtn: { 
    border: '1px solid #ef4444', 
    color: '#ef4444', 
    padding: '8px 16px', 
    borderRadius: '8px', 
    background: 'transparent', 
    cursor: 'pointer', 
    fontSize: '12px', 
    fontWeight: 'bold' 
  },

  tabBar: { display: 'flex', gap: '10px', padding: '10px 50px', background: '#060e1a' },
  tab: { 
    padding: '10px 20px', 
    borderRadius: '8px', 
    background: '#1e293b', 
    border: 'none', 
    color: '#94a3b8', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '12px' 
  },
  tabActive: { background: '#1d4ed8', color: '#fff' },

  // ── 📊 DASHBOARD CONTENT LAYOUT ──
  content: { maxWidth: '1250px', margin: '0 auto', padding: '30px 50px', boxSizing: 'border-box' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' },
  card: { background: '#0d1f3c', borderRadius: '20px', border: '1px solid #1e3a5f', padding: '25px', boxSizing: 'border-box' },
  sectionHead: { color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '15px', letterSpacing: '1px', textTransform: 'uppercase' },
  statsBox: { textAlign: 'center' },
  separator: { height: '1px', background: '#1e3a5f', margin: '15px 0' },

  // ── 🛢️ TANK STYLES ──
  tankRow: { display: 'flex', gap: '30px', justifyContent: 'center', marginTop: '10px' },

  // ── 📅 SCHEDULE UPDATES ──
  schedHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  plusBtn: { background: '#1d4ed8', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  clearBtn: { background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },

  // ── 🎡 GIZMO MODAL STYLE (SCHEDULE POPUP) ──
  modalOverlay: { 
    position: 'fixed', 
    top: 0, left: 0, right: 0, bottom: 0, 
    background: 'rgba(0,0,0,0.85)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1000, 
    backdropFilter: 'blur(10px)' 
  },
  modalContent: { 
    background: '#0d1f3c', 
    width: '100%', 
    maxWidth: '400px', 
    borderRadius: '28px', 
    border: '1px solid #1e3a5f', 
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)', 
    overflow: 'hidden' 
  },
  modalHeader: { background: '#1d4ed8', padding: '20px 30px' },
  modalBody: { padding: '30px' },
  modalInput: { 
    width: '100%', 
    padding: '16px', 
    borderRadius: '12px', 
    background: '#060e1a', 
    border: '1px solid #1e3a5f', 
    color: '#fff', 
    marginBottom: '25px', 
    fontSize: '14px', 
    boxSizing: 'border-box', 
    outline: 'none' 
  },
  timePickerRow: { display: 'flex', gap: '15px', marginBottom: '30px' },
  timeBox: { 
    flex: 1, 
    background: '#060e1a', 
    padding: '12px', 
    borderRadius: '12px', 
    border: '1px solid #1e3a5f' 
  },
  timeLabel: { fontSize: '10px', color: '#64748b', marginBottom: '8px', display: 'block', letterSpacing: '1px' },
  timeInput: { background: 'none', border: 'none', color: '#fff', fontSize: '16px', fontWeight: 'bold', width: '100%', outline: 'none', colorScheme: 'dark' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '30px', padding: '0 30px 30px' },
  btnCancel: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  btnSave: { background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },

  // ── 🔑 LOGIN PAGE STYLES ──
  loginWrap: { 
    height: '100vh', 
    width: '100vw',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    background: '#040b15', 
    position: 'fixed',
    top: 0, left: 0,
    margin: 0, padding: 0,
    fontFamily: "'Inter', sans-serif",
  },
  loginCard: { 
    width: '100%', 
    maxWidth: '400px', 
    padding: '50px 40px', 
    textAlign: 'center',
    background: '#0d1f3c', 
    borderRadius: '28px',
    border: '1px solid #1e3a5f',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column'
  },
  loginLogo: { fontSize: '60px', marginBottom: '20px' },
  loginTitle: { 
    fontSize: '28px', 
    fontWeight: '800', 
    color: '#fff', 
    margin: '0 0 10px 0',
    letterSpacing: '-0.5px'
  },
  loginSub: { 
    fontSize: '11px', 
    color: '#64748b', 
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    fontWeight: 'bold',
    marginBottom: '40px'
  },
  formGroup: { textAlign: 'left', marginBottom: '20px' },
  label: {
    display: 'block',
    fontSize: '10px',
    color: '#3b82f6',
    fontWeight: 'bold',
    marginBottom: '8px',
    letterSpacing: '1px'
  },
  input: { 
    width: '100%', 
    padding: '16px', 
    borderRadius: '12px', 
    border: '1px solid #1e3a5f', 
    background: '#060e1a', 
    color: '#fff', 
    boxSizing: 'border-box',
    fontSize: '14px',
    outline: 'none',
    transition: '0.3s'
  },
  loginBtn: { 
    width: '100%', 
    padding: '16px', 
    borderRadius: '14px', 
    border: 'none', 
    background: '#2563eb', 
    color: '#fff', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    fontSize: '15px',
    marginTop: '10px',
    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)',
    transition: '0.3s'
  }
}; // <── Dito ka nag-error kanina, ito ang missing closing brace.

export default styles;