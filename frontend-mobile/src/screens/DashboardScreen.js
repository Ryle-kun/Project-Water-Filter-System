import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker'; // Siguraduhing naka-install ito
import { API_URL, WS_URL } from '../api/config';
import { mobileStyles } from '../styles/mobileStyles';

// COMPONENTS
import MobileTankCard from '../components/MobileTankCard';
import MobileValveButton from '../components/MobileValveButton';
import MobileScheduleRow from '../components/MobileScheduleRow';
import MobileAlertBadge from '../components/MobileAlertBadge';
import MobileMiniChart from '../components/MobileMiniChart';

export default function DashboardScreen({ onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); 
  
  const [status, setStatus] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]); 
  const [chartData, setChartData] = useState(null);

  const [newTapStand, setNewTapStand] = useState('');
  
  // ── 💡 GIZMO PICKER STATES ──
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const [response, historyRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/stats/history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStatus(response.data.status);
      setSchedules(response.data.schedules);
      setChartData(historyRes.data);
      
      const alertsFromServer = response.data.active_alerts || [];
      const alertHistory = alertsFromServer.map(a => ({
        id: a.id,
        event: a.message,
        time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just Now",
        type: a.severity === 'CRITICAL' ? 'warning' : 'info'
      }));
      setHistory(alertHistory);
    } catch (error) {
      console.error("Fetch Error:", error.response?.data || error.message);
      if (error.response?.status === 401) onLogout();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchData();
    const ws = new WebSocket(`${WS_URL}/mobile_${Math.random()}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'update' || msg.type === 'sensor_update') {
        setStatus(prev => {
            if (!prev) return msg.data;
            return { ...prev, ...msg.data, valves: { ...prev.valves, ...msg.data.valves } };
        });
      }
      if (msg.type === 'schedule_update' || msg.type === 'alert_new') fetchData();
    };
    return () => ws.close();
  }, []);

  // ── 3. CRUD LOGIC (VALVES & SCHEDULES) ──
  const handleToggleValve = async (id) => {
    const valveKey = `sv${id}`;
    if (!status?.valves) return;
    const currentState = status.valves[valveKey];
    try {
      const token = await AsyncStorage.getItem('userToken');
      setStatus(prev => ({ ...prev, valves: { ...prev.valves, [valveKey]: !currentState } }));
      await axios.post(`${API_URL}/valves/command`, { valve_id: id, action: currentState ? "CLOSE" : "OPEN" }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      Alert.alert("Error", "Valve control failed.");
      fetchData(); 
    }
  };

  const handleEditPress = (item) => {
    if (!item) return;
    setEditingId(item.id);
    setNewTapStand(item.label || "");

    // Convert HH:MM string to Date object for picker
    const [sh, sm] = (item.start_time || "08:00").split(':');
    const [eh, em] = (item.end_time || "10:00").split(':');
    
    const sDate = new Date();
    sDate.setHours(parseInt(sh), parseInt(sm), 0);
    setStartTime(sDate);

    const eDate = new Date();
    eDate.setHours(parseInt(eh), parseInt(em), 0);
    setEndTime(eDate);

    setModalVisible(true);
  };

 const handleSaveSchedule = async () => {
    if (!newTapStand) return Alert.alert("Error", "Please enter a Tap Stand name.");

    const formatHHMM = (date) => {
      const h = date.getHours().toString().padStart(2, '0');
      const m = date.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        tap_stand: editingId ? (schedules.find(s => s.id === editingId)?.tap_stand || 1) : 1,
        label: newTapStand,
        start_time: formatHHMM(startTime),
        end_time: formatHHMM(endTime),
        enabled: true
      };

      console.log("📡 Sending Schedule Payload:", payload);

      if (editingId) {
        await axios.put(`${API_URL}/schedules/${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_URL}/schedules`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      // Clean up UI
      setModalVisible(false);
      setEditingId(null);
      
      // 💡 SIGURADUHIN NA TAMA ANG SETTER NA ITO:
      if (typeof setNewTapStand === 'function') {
        setNewTapStand('');
      } else if (typeof setTapStand === 'function') {
        setTapStand('');
      }

      // I-wrap ang fetchData sa try-catch para hindi ma-interrupt ang Success alert
      try {
        await fetchData();
      } catch (e) {
        console.warn("⚠️ Data refreshed failed but schedule was saved.");
      }

      Alert.alert("Success", "Schedule synced with MySQL.");
    } catch (error) {
        console.error("❌ THE REAL ERROR:", error); // Tignan mo ito sa VS Code Terminal (LOG)
        Alert.alert("Error", `Save failed: ${error.message}`);
    }
};

  const handleDeleteSchedule = async (id) => {
    Alert.alert("Delete", "Are you sure you want to remove this schedule?", [
      { text: "Cancel" },
      { text: "Delete", onPress: async () => {
          const token = await AsyncStorage.getItem('userToken');
          await axios.delete(`${API_URL}/schedules/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          fetchData();
      }}
    ]);
  };


  const handleClearValveHistory = async () => {
  Alert.alert("Database Maintenance", "Wipe all Valve Command logs? (Simulation data will be deleted)", [
    { text: "Cancel" },
    { text: "Clear Valve Logs", style: 'destructive', onPress: async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          // 📡 Tatawagin ang bagong endpoint sa main.py
          await axios.delete(`${API_URL}/valves/clear-history`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          Alert.alert("Success", "Valve command history has been cleared.");
          fetchData(); // I-refresh ang UI
        } catch (error) { 
          Alert.alert("Error", "Failed to clear valve logs."); 
        }
    }}
  ]);
};
  const handleClearHistory = async () => {
    Alert.alert("Clear History", "Wipe all logs?", [
      { text: "Cancel" },
      { text: "Clear All", style: 'destructive', onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await axios.delete(`${API_URL}/alerts/clear`, { headers: { Authorization: `Bearer ${token}` } });
            setHistory([]);
            Alert.alert("Success", "Logs cleared.");
          } catch (error) { Alert.alert("Error", "Failed."); }
      }}
    ]);
  };

  if (loading || !status) return (
    <View style={[styles.mainContainer, {justifyContent:'center'}]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{color:'#fff', textAlign:'center', marginTop:15}}>CONNECTING TO WATER SYSTEM...</Text>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.adminTag}>ADMIN PANEL</Text>
          <Text style={styles.title}>Water Monitoring</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['overview', 'valves', 'schedules', 'history'].map(t => (
            <TouchableOpacity key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.tabActive]}>
              <Text style={[styles.tabLabel, activeTab === t && styles.tabLabelActive]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} tintColor="#fff" />}
      >
        {activeTab === 'overview' && (
          <View>
            {(() => {
                const t1 = status?.tank1?.pct || 0;
                const t2 = status?.tank2?.pct || 0;
                const t3 = status?.tank3?.pct || 0;
                const lowTank = t1 < 20 ? { name: "Tank 1", pct: t1 } : t2 < 20 ? { name: "Tank 2", pct: t2 } : t3 < 20 ? { name: "Tank 3", pct: t3 } : null;
                if (lowTank) return <MobileAlertBadge message={`CRITICAL: ${lowTank.name} is very low (${lowTank.pct}%)`} type="warning" />;
                return <MobileAlertBadge message="System Nominal: All water tanks are stable" type="info" />;
            })()}
            
            <Text style={mobileStyles.sectionHead}>Tank Analysis</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
              <MobileTankCard name="Tank 1" level={status?.tank1?.level || 0} capacity={status?.tank1?.capacity || 2000} color="#3b82f6" />
              <MobileTankCard name="Tank 2" level={status?.tank2?.level || 0} capacity={status?.tank2?.capacity || 2000} color="#8b5cf6" />
              <MobileTankCard name="Tank 3" level={status?.tank3?.level || 0} capacity={status?.tank3?.capacity || 4000} color="#0ea5e9" />
            </ScrollView>

            <Text style={mobileStyles.sectionHead}>Quick Status</Text>
            <View style={styles.statsRow}>
                <View style={styles.statItem}><Text style={styles.sLabel}>Inflow</Text><Text style={styles.sVal}>{status?.inflow_rate || 0} L/m</Text></View>
                <View style={styles.divider} />
                <View style={styles.statItem}><Text style={styles.sLabel}>Filter</Text><Text style={[styles.sVal, {color:'#7dd3fc'}]}>{status?.filter_rate || 0} L/m</Text></View>
            </View>

            <Text style={mobileStyles.sectionHead}>Trend Analytics</Text>
            <MobileMiniChart history={chartData} />
          </View>
        )}

      {activeTab === 'valves' && (
  <View style={{ paddingTop: 10 }}>
    <Text style={mobileStyles.sectionHead}>Manual Overrides</Text>
    {/* 💡 Binago ang array para magsimula sa 1 */}
    {[1, 2, 3, 4, 5].map(id => (
      <MobileValveButton 
        key={id} 
        // 💡 Tinanggal na ang "Main Supply" logic dahil 1-5 na lang ito
        label={`Tap Stand 0${id}`} 
        isOpen={status?.valves && status?.valves[`sv${id}`]} 
        onToggle={() => handleToggleValve(id)} 
      />
    ))}
  </View>
)}
        {activeTab === 'schedules' && (
          <View style={{ paddingTop: 10 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={mobileStyles.sectionHead}>Distribution Logs</Text>
              <TouchableOpacity onPress={() => { setEditingId(null); setNewTapStand(''); setStartTime(new Date()); setEndTime(new Date()); setModalVisible(true); }} style={styles.plusBtn}>
                <Text style={styles.plusText}>+ SET</Text>
              </TouchableOpacity>
            </View>
            {schedules.map(s => (
              <MobileScheduleRow 
                key={s.id} 
                sched={{ id: s.id, label: s.label, start_time: s.start_time, end_time: s.end_time, is_active: s.enabled }} 
                onEdit={() => handleEditPress(s)} 
                onDelete={() => handleDeleteSchedule(s.id)}
              />
            ))}
          </View>
        )}

       {activeTab === 'history' && (
  <View style={{ paddingTop: 10, paddingBottom: 30 }}>
    <View style={styles.sectionHeaderRow}>
      <Text style={mobileStyles.sectionHead}>System Activity Log</Text>
      
      {/* ── 🚨 BUTTON CONTAINER ── */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Button para sa Alerts (Lilitaw lang 'to 'pag may alerts) */}
        {history.length > 0 && (
          <TouchableOpacity 
            onPress={handleClearHistory} 
            style={[styles.plusBtn, { backgroundColor: '#ef4444' }]}
          >
            <Text style={styles.plusText}>CLEAR ALERTS</Text>
          </TouchableOpacity>
        )}

        {/* 💡 BAGONG BUTTON: Para sa Valve Command DB (Kahit walang alerts, pwede i-clear ang DB) */}
        <TouchableOpacity 
          onPress={handleClearValveHistory} 
          style={[styles.plusBtn, { backgroundColor: '#f59e0b' }]}
        >
          <Text style={styles.plusText}>WIPE VALVE LOGS</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* ── LOG LIST ── */}
    {history.length > 0 ? history.map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={[styles.logDot, { backgroundColor: log.type === 'warning' ? '#ef4444' : '#3b82f6' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.logEvent} numberOfLines={2}>{log.event}</Text>
            <Text style={styles.logTime}>{log.time}</Text>
          </View>
        </View>
      )) : (
      <View style={{ marginTop: 80, alignItems: 'center' }}>
        <Text style={{ color: '#475569', fontSize: 14 }}>No recent activity logs.</Text>
        <Text style={{ color: '#1e293b', fontSize: 12 }}>Pull down to refresh</Text>
      </View>
    )}
  </View>
)}
      </ScrollView>

      {/* ── 🎡 MODAL WITH TIME PICKER ── */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Update Distribution' : 'New Distribution'}</Text>
            
            <TextInput style={styles.input} placeholder="TapStand Name" placeholderTextColor="#475569" value={newTapStand} onChangeText={setNewTapStand} />
            
            <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10, marginLeft: 5 }}>SELECT DISTRIBUTION TIME</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.input, { flex: 0.48 }]} onPress={() => setShowStart(true)}>
                <Text style={{ color: '#64748b', fontSize: 10 }}>START</Text>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.input, { flex: 0.48 }]} onPress={() => setShowEnd(true)}>
                <Text style={{ color: '#64748b', fontSize: 10 }}>END</Text>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
              </TouchableOpacity>
            </View>

            {showStart && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={false}
                onChange={(event, date) => { setShowStart(false); if (date) setStartTime(date); }}
              />
            )}

            {showEnd && (
              <DateTimePicker
                value={endTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={false}
                onChange={(event, date) => { setShowEnd(false); if (date) setEndTime(date); }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingId(null); }}><Text style={{color:'#94a3b8', marginRight:20}}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSchedule}><Text style={{color:'#3b82f6', fontWeight:'bold'}}>{editingId ? 'SAVE CHANGES' : 'CREATE'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#060e1a', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20 },
  adminTag: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  logoutBtn: { borderWidth: 1, borderColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  tabBar: { backgroundColor: '#0a1628', paddingVertical: 10, marginBottom: 15 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginHorizontal: 8, backgroundColor: '#0d1f3c' },
  tabActive: { backgroundColor: '#1d4ed8' },
  tabLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
  tabLabelActive: { color: '#fff' },
  statsRow: { backgroundColor: '#0d1f3c', marginHorizontal: 20, padding: 20, borderRadius: 15, flexDirection: 'row', borderWidth: 1, borderColor: '#1e3a5f' },
  statItem: { flex: 1, alignItems: 'center' },
  sLabel: { color: '#64748b', fontSize: 10, marginBottom: 5 },
  sVal: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  divider: { width: 1, height: '100%', backgroundColor: '#1e3a5f' },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1f3c', padding: 15, marginHorizontal: 20, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1e3a5f' },
  logDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  logEvent: { color: '#fff', fontSize: 13, fontWeight: '500', paddingRight: 20 },
  logTime: { color: '#475569', fontSize: 10, marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  plusBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  plusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#0d1f3c', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#1e3a5f' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#060e1a', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }
});