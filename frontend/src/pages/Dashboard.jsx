import React, { useState, useEffect } from "react";
import styles from "../styles";
import { API, WS_URL } from "../constants";
import WebTankCard from "../components/WebTankCard";
import WebValveButton from "../components/WebValveButton";
import WebAlertBadge from "../components/WebAlertBadge";
import WebMiniChart from "../components/WebMiniChart";
import WebScheduleRow from "../components/WebScheduleRow";

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  
  // ── 📈 ADD THIS: State for Graph Data ──
  const [chartData, setChartData] = useState(null);

  // ── 📅 SCHEDULE STATES ──
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({ label: "", start_time: "08:00", end_time: "12:00" });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // ── 💡 UPDATED FETCH: Sabay nating kunin ang Dashboard at History ──
      const [dashRes, historyRes] = await Promise.all([
        fetch(`${API}/api/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/api/stats/history`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const data = await dashRes.json();
      const historyData = await historyRes.json();

      setStatus(data.status);
      setSchedules(data.schedules || []);
      
      // 📈 I-save ang data para sa Graph
      setChartData(historyData);

      setHistory((data.active_alerts || []).map(a => ({
        id: a.id, event: a.message, time: new Date(a.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), type: a.severity === 'CRITICAL' ? 'warning' : 'info'
      })));
    } catch (e) { console.error("Fetch Error:", e); }
  };

useEffect(() => {
  fetchData();
  const ws = new WebSocket(`${WS_URL}/web_pro_${Math.random()}`);

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    // 💡 SENSOR UPDATE: I-update lang ang data, huwag mag-fetch ng buong DB.
    if (msg.type === 'sensor_update') {
      setStatus(prev => ({
        ...prev,
        ...msg.data,
        valves: { ...prev?.valves, ...msg.data.valves }
      }));
    }

    // 🚨 IMPORTANT: Tawagin lang ang fetchData() sa mabibigat na updates.
    if (msg.type === 'alert_new' || msg.type === 'schedule_update') {
      fetchData();
    }
  };

  return () => ws.close();
}, []);

  // ... (handleValveToggle, handleClearHistory, openModal, handleSaveSchedule, handleDeleteSchedule stay the same) ...

  const handleValveToggle = async (id) => {
  const valveKey = `sv${id}`;
  const isCurrentlyOpen = status.valves[valveKey];
  const action = isCurrentlyOpen ? "CLOSE" : "OPEN";

  // 🚨 1. OPTIMISTIC UPDATE (Ito ang pamatay-delay!)
  // Babaguhin natin ang status sa SCREEN agad-agad (< 50ms).
  setStatus(prev => ({
    ...prev,
    valves: {
      ...prev.valves,
      [valveKey]: !isCurrentlyOpen // Baligtarin agad ang switch sa UI
    }
  }));

  try {
    // 📡 2. API CALL (Background Task)
    // Habang "On" na ang button sa screen, tsaka pa lang kakausapin ang Python.
    const res = await fetch(`${API}/api/valves/command`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ valve_id: id, action })
    });

    if (!res.ok) throw new Error("Server rejected command");

    // ✅ HUWAG nang tawagin ang fetchData() dito. 
    // Kasi updated na ang UI natin sa Step 1.
    console.log(`✅ Valve ${id} set to ${action}`);

  } catch (e) {
    // ❌ 3. ROLLBACK (Kapag nag-error ang server)
    // Kapag pumalya ang request, tsaka lang natin ibabalik sa dati ang button.
    alert("Connection Error: Reverting valve state.");
    fetchData(); 
  }
};

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all logs?")) return;
    try {
      await fetch(`${API}/api/alerts/clear`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setHistory([]);
    } catch (e) { alert("Error clearing logs."); }
  };

  const openModal = (sched = null) => {
    if (sched) {
      setEditingId(sched.id);
      setFormData({ 
        label: sched.label, 
        start_time: sched.start_time.substring(0, 5), 
        end_time: sched.end_time.substring(0, 5) 
      });
    } else {
      setEditingId(null);
      setFormData({ label: "", start_time: "08:00", end_time: "12:00" });
    }
    setShowModal(true);
  };

const handleClearValveHistory = async () => {
  // 🚨 Confirmation muna para hindi aksidenteng mabura ang demo data
  if (!window.confirm("Database Maintenance: Wipe all Valve Command logs?")) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API}/api/valves/clear-history`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      alert("✅ Valve history successfully wiped from MySQL.");
      fetchData(); // I-refresh ang data sa screen
    } else {
      const err = await res.json();
      alert("❌ Error: " + err.detail);
    }
  } catch (e) {
    console.error("Delete Error:", e);
    alert("❌ Connection Error: Hindi ma-reach ang server.");
  }
};
  const handleSaveSchedule = async () => {
    if (!formData.label) return alert("Add TapStand Name.");
    const token = localStorage.getItem('token');
    const method = editingId ? 'PUT' : 'POST';
    const endpoint = editingId ? `${API}/api/schedules/${editingId}` : `${API}/api/schedules`;
    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          tap_stand: editingId ? (schedules.find(s => s.id === editingId)?.tap_stand || 1) : 1,
          label: formData.label,
          start_time: formData.start_time,
          end_time: formData.end_time,
          enabled: true
        })
      });
      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err.detail));
      }
    } catch (e) { alert("Error saving schedule."); }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to remove this schedule?")) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/schedules/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (e) { alert("Error deleting schedule."); }
  };

  if (!status) return <div style={styles.loginWrap}><h2 style={{color:'#3b82f6'}}>Syncing Barangay Water IoT...</h2></div>;

  return (
    <div style={styles.mainContainer}>
      {/* 🎡 MODAL (UNTOUCHED) */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}><h3 style={{ margin: 0, fontSize: '18px' }}>{editingId ? 'Update Distribution' : 'New Distribution'}</h3></div>
            <div style={styles.modalBody}>
                <span style={styles.timeLabel}>TAP STAND DESIGNATION</span>
                <input style={styles.modalInput} placeholder="TapStand Name" value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} />
                <span style={styles.timeLabel}>SUPPLY SCHEDULE</span>
                <div style={styles.timePickerRow}>
                  <div style={styles.timeBox}>
                    <span style={{ fontSize: '9px', color: '#475569', marginBottom: '5px', display: 'block' }}>START</span>
                    <input type="time" style={styles.timeInput} value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  </div>
                  <div style={styles.timeBox}>
                    <span style={{ fontSize: '9px', color: '#475569', marginBottom: '5px', display: 'block' }}>END</span>
                    <input type="time" style={styles.timeInput} value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnCancel} onClick={() => setShowModal(false)}>CANCEL</button>
              <button style={styles.btnSave} onClick={handleSaveSchedule}>{editingId ? 'SAVE CHANGES' : 'CREATE'}</button>
            </div>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <div><p style={styles.adminTag}>ADMIN PANEL • LIVE</p><h1 style={styles.title}>Water Monitoring</h1></div>
        <button onClick={onLogout} style={styles.logoutBtn}>LOGOUT</button>
      </header>

      <nav style={styles.tabBar}>
        {['overview', 'valves', 'schedules', 'history'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}>{t.toUpperCase()}</button>
        ))}
      </nav>

      <main style={styles.content}>
        {activeTab === 'overview' && (
          <div style={styles.dashboardGrid}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 🚨 ALERT LOGIC (Mirror of Mobile) */}
              {(() => {
                const t1 = status?.tank1?.pct || 0;
                const t2 = status?.tank2?.pct || 0;
                const t3 = status?.tank3?.pct || 0;
                const lowTank = t1 < 20 ? { name: "Tank 1", pct: t1 } : t2 < 20 ? { name: "Tank 2", pct: t2 } : t3 < 20 ? { name: "Tank 3", pct: t3 } : null;
                if (lowTank) return <WebAlertBadge message={`CRITICAL: ${lowTank.name} is very low (${lowTank.pct}%)`} type="warning" />;
                return <WebAlertBadge message="System Nominal: All water tanks are stable" type="info" />;
              })()}
              
              <div>
                <p style={styles.sectionHead}>Tank Analysis</p>
                <div style={styles.tankRow}>
                  <WebTankCard name="Tank 1" level={status.tank1?.level} capacity={2000} color="#3b82f6" />
                  <WebTankCard name="Tank 2" level={status.tank2?.level} capacity={2000} color="#8b5cf6" />
                  <WebTankCard name="Tank 3" level={status.tank3?.level} capacity={4000} color="#0ea5e9" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={styles.card}>
                <p style={styles.sectionHead}>Quick Status</p>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 5px' }}>INFLOW</p>
                    <h2 style={{ margin: 0, fontSize: '24px' }}>{status.inflow_rate} <small style={{fontSize:'12px'}}>L/m</small></h2>
                  </div>
                  <div style={{ width: '1px', height: '40px', background: '#1e3a5f' }} />
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 5px' }}>FILTER</p>
                    <h2 style={{ margin: 0, fontSize: '24px', color: '#7dd3fc' }}>{status.filter_rate} <small style={{fontSize:'12px'}}>L/m</small></h2>
                  </div>
                </div>
              </div>

              {/* ── 📈 FIX DITO: Pass the chartData state ── */}
              <div style={styles.card}>
                <p style={styles.sectionHead}>Trend Analytics</p>
                <div style={{ height: '300px' }}>
                   <WebMiniChart history={chartData} /> 
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... (valves, schedules, history tabs untouched) ... */}
        {activeTab === 'valves' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
  {[1, 2, 3, 4, 5].map(id => (
    <WebValveButton 
      key={id} 
      // 💡 DITO ANG PAGBABAGO: Tinanggal ang extra '1'
      label={`Tap Stand 0${id}`} // Lalabas na: Tap Stand 01, Tap Stand 02...
      isOpen={status.valves?.[`sv${id}`]} 
      onToggle={() => handleValveToggle(id)} 
    />
  ))}
</div>
        )}

        {activeTab === 'schedules' && (
          <div>
            <div style={styles.schedHeaderRow}>
              <p style={styles.sectionHead}>Distribution Logs</p>
              <button style={styles.plusBtn} onClick={() => openModal()}>+ SET</button>
            </div>
            {schedules.map(s => (
              <WebScheduleRow key={s.id} sched={s} onEdit={() => openModal(s)} onDelete={() => handleDeleteSchedule(s.id)} />
            ))}
          </div>
        )}

      {activeTab === 'history' && (
  <div>
    <div style={styles.schedHeaderRow}>
      <p style={styles.sectionHead}>System Activity Log</p>
      
      {/* ── 🚨 BUTTON CONTAINER ── */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Button para sa Alerts (Red) */}
        <button 
          style={styles.clearBtn} 
          onClick={handleClearHistory}
        >
          CLEAR ALERT LOGS
        </button>

        {/* 💡 BAGONG BUTTON: Orange Background + White Font */}
        <button 
          style={{ 
            ...styles.clearBtn, 
            backgroundColor: '#f59e0b', 
            color: '#ffffff',       // 👈 ITO ANG NAGPAPAPUTI NG FONT
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'      // Para mas malinaw tignan
          }} 
          onClick={handleClearValveHistory}
        >
          WIPE VALVE LOGS
        </button>
      </div>
    </div>

    {/* LISTAHAN NG LOGS */}
    {history.length > 0 ? history.map(log => (
      <div key={log.id} style={{ ...styles.card, display: 'flex', alignItems: 'center', marginBottom: '12px', padding: '20px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: log.type === 'warning' ? '#ef4444' : '#3b82f6', marginRight: '20px' }} />
        <div style={{ flex: 1, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{log.event}</p>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{log.time}</p>
        </div>
      </div>
    )) : (
      <p style={{textAlign:'center', color:'#64748b', marginTop:'100px'}}>No logs found.</p>
    )}
  </div>
)}
      </main>
    </div>
  );
}