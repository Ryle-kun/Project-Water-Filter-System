import { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { useWebSocket } from "../hooks/useWebSocket";
import TankCard      from "../components/TankCard";
import ValveButton   from "../components/ValveButton";
import AlertBadge    from "../components/AlertBadge";
import ScheduleRow   from "../components/ScheduleRow";
import MiniChart     from "../components/MiniChart";
import styles from "../styles";

const fmt = (n, d = 1) => (n ?? 0).toFixed(d);

const TIER_COLORS = {
  NORMAL:   "#22c55e",
  MODERATE: "#facc15",
  LOW:      "#f97316",
  CRITICAL: "#ef4444",
};

export default function Dashboard({ user, onLogout }) {
  const api = useApi();

  const [connected,  setConnected]  = useState(false);
  const [status,     setStatus]     = useState(null);
  const [alerts,     setAlerts]     = useState([]);
  const [schedules,  setSchedules]  = useState([]);
  const [history,    setHistory]    = useState([]);
  const [tab,        setTab]        = useState("overview");
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Load initial data on mount ───────────────────────────────────────────────
  useEffect(() => {
    api("/api/dashboard")
      .then(data => {
        setStatus(data.status);
        setAlerts(data.active_alerts || []);
        setSchedules(data.schedules  || []);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });

    api("/api/sensors/history?hours=6")
      .then(h => setHistory(h))
      .catch(console.error);
  }, []);

  // ── WebSocket live updates ───────────────────────────────────────────────────
  useWebSocket({
    onConnect:    () => setConnected(true),
    onDisconnect: () => setConnected(false),
    onMessage: (msg) => {
      if (msg.type === "sensor_update" || msg.type === "init") {
        setStatus(msg.data);
        setLastUpdate(new Date());
        setHistory(h => [...h.slice(-200), msg.data]);
      }
      if (msg.type === "alert_new") {
        setAlerts(a => [msg.data, ...a.slice(0, 19)]);
      }
      if (msg.type === "alert_acknowledged") {
        setAlerts(a => a.filter(x => x.id !== msg.alert_id));
      }
      if (msg.type === "valve_update") {
        setStatus(s => s ? {
          ...s,
          valves: { ...s.valves, [`sv${msg.data.valve_id}`]: msg.data.action === "OPEN" }
        } : s);
      }
      if (msg.type === "schedule_update") {
        setSchedules(sch => sch.map(s => s.tap_stand === msg.data.tap_stand ? msg.data : s));
      }
    },
  });

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function toggleValve(id, open) {
    try {
      await api("/api/valves/command", {
        method: "POST",
        body: JSON.stringify({ valve_id: id, action: open ? "OPEN" : "CLOSE", duration_minutes: 30 }),
      });
    } catch (e) { console.error(e); }
  }

  async function ackAlert(id) {
    try {
      await api(`/api/alerts/${id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ note: "" }),
      });
      setAlerts(a => a.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  }

  async function saveSchedule(tapStand, form) {
    try {
      const updated = await api("/api/schedules", {
        method: "POST",
        body: JSON.stringify({ tap_stand: tapStand, ...form }),
      });
      setSchedules(sch => sch.map(s => s.tap_stand === tapStand ? updated : s));
    } catch (e) { console.error(e); }
  }

  const isOperator = ["operator", "admin"].includes(user?.role);
  const tc = TIER_COLORS[status?.tier] || "#64748b";

  return (
    <div style={styles.dashWrap}>

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>💧</span>
          <div>
            <div style={styles.headerTitle}>Barangay Water System</div>
            <div style={styles.headerSub}>3-Tank Gravity-Fed Filtration · IoT Monitor</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{
            ...styles.connBadge,
            background:  connected ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color:       connected ? "#22c55e" : "#ef4444",
            borderColor: connected ? "#22c55e" : "#ef4444",
          }}>
            {connected ? "● Live" : "○ Reconnecting…"}
          </div>
          {lastUpdate && (
            <span style={styles.lastUpdate}>Updated {lastUpdate.toLocaleTimeString()}</span>
          )}
          <span style={styles.userBadge}>{user?.username} ({user?.role})</span>
          <button style={styles.logoutBtn} onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* ── Critical Alert Banner ── */}
      {alerts.some(a => a.severity === "CRITICAL") && (
        <div style={styles.criticalBanner}>
          🚨 CRITICAL: {alerts.find(a => a.severity === "CRITICAL")?.message}
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <nav style={styles.nav}>
        {["overview", "valves", "schedules", "alerts", "history"].map(t => (
          <button
            key={t}
            style={{ ...styles.navBtn, ...(tab === t ? styles.navBtnActive : {}) }}
            onClick={() => setTab(t)}
          >
            {{
              overview:  "📊 Overview",
              valves:    "🔧 Valves",
              schedules: "🕒 Schedules",
              alerts:    `⚠ Alerts${alerts.length > 0 ? ` (${alerts.length})` : ""}`,
              history:   "📈 History",
            }[t]}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>Loading system data…</div>
        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {tab === "overview" && (
              <div>
                {status?.tier && (
                  <div style={{ ...styles.tierBadge, borderColor: tc, color: tc, background: `${tc}18` }}>
                    Distribution Tier: <strong>{status.tier}</strong> — Max {status.tier_max_taps} tap{status.tier_max_taps !== 1 ? "s" : ""} active
                  </div>
                )}

                <div style={styles.tankRow}>
                  <TankCard name="Tank 1" label="Raw Water"
                    level={status?.tank1?.level ?? 0} capacity={2000}
                    color="linear-gradient(180deg,#3b82f6,#1d4ed8)"
                    subLabel={`Inflow: ${fmt(status?.inflow_rate)} L/min`} />
                  <div style={styles.arrowWrap}>
                    <div style={styles.arrowLine} />
                    <div style={styles.arrowLabel}>SV0 {status?.valves?.sv0 ? "🟢" : "🔴"}</div>
                    <div style={styles.arrowLine} />
                  </div>
                  <TankCard name="Tank 2" label="Filtration"
                    level={status?.tank2?.level ?? 0} capacity={2000}
                    color="linear-gradient(180deg,#8b5cf6,#6d28d9)"
                    subLabel={`Filter: ${fmt(status?.filter_rate)} L/min`} />
                  <div style={styles.arrowWrap}>
                    <div style={styles.arrowLine} />
                    <div style={styles.arrowLabel}>0.7 L/min</div>
                    <div style={styles.arrowLine} />
                  </div>
                  <TankCard name="Tank 3" label="Clean Water"
                    level={status?.tank3?.level ?? 0} capacity={4000}
                    color="linear-gradient(180deg,#0ea5e9,#0284c7)"
                    subLabel="Distribution reservoir" />
                </div>

                <div style={styles.statsRow}>
                  {[
                    { label: "Battery",       value: status?.battery_voltage ? `${fmt(status.battery_voltage)}V` : "—", icon: "🔋", ok: (status?.battery_voltage ?? 13) > 11.5 },
                    { label: "Solar",         value: status?.solar_charging ? "Charging" : "No charge",                icon: "☀️", ok: status?.solar_charging },
                    { label: "Active Alerts", value: alerts.length,                                                     icon: "⚠",  ok: alerts.length === 0 },
                    { label: "Open Taps",     value: `${[1,2,3,4,5].filter(i => status?.valves?.[`sv${i}`]).length} / 5`, icon: "🚰", ok: true },
                  ].map(s => (
                    <div key={s.label} style={styles.statCard}>
                      <span style={styles.statIcon}>{s.icon}</span>
                      <div style={{ ...styles.statValue, color: s.ok ? "#22c55e" : "#ef4444" }}>{s.value}</div>
                      <div style={styles.statLabel}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={styles.sectionHead}>Tap Stand Status</div>
                <div style={styles.tapRow}>
                  {[1, 2, 3, 4, 5].map(i => {
                    const sched = schedules.find(s => s.tap_stand === i);
                    const open  = status?.valves?.[`sv${i}`];
                    return (
                      <div key={i} style={{ ...styles.tapCard, borderColor: open ? "#22c55e" : "#334155" }}>
                        <div style={styles.tapIcon}>🚰</div>
                        <div style={styles.tapName}>{sched?.label || `TS-${i}`}</div>
                        <div style={{ ...styles.tapStatus, color: open ? "#22c55e" : "#ef4444" }}>
                          {open ? "OPEN" : "CLOSED"}
                        </div>
                        <div style={styles.tapSched}>{sched?.start_time}–{sched?.end_time}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── VALVES ── */}
            {tab === "valves" && (
              <div>
                <div style={styles.sectionHead}>
                  Manual Valve Control
                  {!isOperator && <span style={styles.readOnly}> (View only — operator role required)</span>}
                </div>
                <div style={styles.valveGrid}>
                  {[
                    { id: 0, label: "SV0 — Tank 1 → Tank 2 (Overflow Prevention)", isOpen: status?.valves?.sv0 },
                    ...[1, 2, 3, 4, 5].map(i => ({
                      id: i,
                      label: `SV${i} — Tap Stand ${i} (${schedules.find(s => s.tap_stand === i)?.label || "—"})`,
                      isOpen: status?.valves?.[`sv${i}`],
                    }))
                  ].map(v => (
                    <ValveButton key={v.id} {...v} onToggle={toggleValve} disabled={!isOperator} />
                  ))}
                </div>
                <div style={styles.valveNote}>Manual overrides expire after 30 minutes.</div>
              </div>
            )}

            {/* ── SCHEDULES ── */}
            {tab === "schedules" && (
              <div>
                <div style={styles.sectionHead}>Daily Distribution Schedules</div>
                <p style={styles.schedNote}>Each tap stand opens within its window, subject to Tank 3 tier limits.</p>
                <div style={styles.schedList}>
                  {schedules.map(s => (
                    <ScheduleRow key={s.id} sched={s} onSave={isOperator ? saveSchedule : () => {}} />
                  ))}
                </div>
              </div>
            )}

            {/* ── ALERTS ── */}
            {tab === "alerts" && (
              <div>
                <div style={styles.sectionHead}>Active Alerts ({alerts.length})</div>
                {alerts.length === 0 ? (
                  <div style={styles.noAlerts}>✅ No active alerts — system operating normally.</div>
                ) : (
                  <div style={styles.alertList}>
                    {alerts.map(a => (
                      <AlertBadge key={a.id} alert={a} onAck={isOperator ? ackAlert : () => {}} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {tab === "history" && (
              <div>
                <div style={styles.sectionHead}>Tank 3 Level — Last 6 Hours</div>
                <MiniChart data={history} color="#0ea5e9" label="Tank 3 Clean Water Level (%)" />
                <div style={styles.historyTable}>
                  <div style={styles.histHeader}>
                    {["Time", "T1 %", "T2 %", "T3 %", "Inflow", "Filter", "Open Taps"].map(h => (
                      <div key={h} style={styles.histCell}>{h}</div>
                    ))}
                  </div>
                  {[...history].reverse().slice(0, 30).map((r, i) => (
                    <div key={i} style={{ ...styles.histRow, background: i % 2 === 0 ? "#0d1f3c" : "transparent" }}>
                      <div style={styles.histCell}>{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "—"}</div>
                      <div style={styles.histCell}>{r.tank1?.pct ?? "—"}%</div>
                      <div style={styles.histCell}>{r.tank2?.pct ?? "—"}%</div>
                      <div style={styles.histCell}>{r.tank3?.pct ?? "—"}%</div>
                      <div style={styles.histCell}>{fmt(r.inflow_rate)} L/m</div>
                      <div style={styles.histCell}>{fmt(r.filter_rate)} L/m</div>
                      <div style={styles.histCell}>{r.valves ? [1,2,3,4,5].filter(n => r.valves[`sv${n}`]).length : "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
