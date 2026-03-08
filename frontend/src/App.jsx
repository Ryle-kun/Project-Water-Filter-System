import { useState, useEffect, useRef, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API = "http://localhost:8000";
const WS  = "ws://localhost:8000";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n, d = 1) => (n ?? 0).toFixed(d);

function useApi() {
  return useCallback(async (path, opts = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>💧</div>
        <h1 style={styles.loginTitle}>Barangay Water System</h1>
        <p style={styles.loginSub}>Monitoring & Control Dashboard</p>
        <form onSubmit={handleSubmit} style={styles.loginForm}>
          <input style={styles.input} placeholder="Username" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoFocus />
          <input style={styles.input} type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          {error && <div style={styles.errorMsg}>{error}</div>}
          <button style={styles.loginBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={styles.loginHint}>Default: admin / admin123</p>
      </div>
    </div>
  );
}

// ─── Tank Card ────────────────────────────────────────────────────────────────
function TankCard({ name, label, level, capacity, color, subLabel }) {
  const p = Math.min(100, Math.max(0, Math.round((level / capacity) * 100)));
  const statusColor = p < 10 ? "#ef4444" : p < 25 ? "#f97316" : p < 50 ? "#facc15" : "#22c55e";
  return (
    <div style={styles.tankCard}>
      <div style={styles.tankName}>{name}</div>
      <div style={styles.tankLabel}>{label}</div>
      <div style={styles.tankBarWrap}>
        <div style={{ ...styles.tankBarFill, height: `${p}%`, background: color }} />
        <div style={styles.tankBarPct}>{p}%</div>
        <div style={styles.tankBarVol}>{Math.round(level)} L</div>
      </div>
      <div style={{ ...styles.tankCapLabel, color: statusColor }}>{Math.round(level)} / {capacity} L</div>
      <div style={styles.tankSubLabel}>{subLabel}</div>
    </div>
  );
}

// ─── Valve Button ─────────────────────────────────────────────────────────────
function ValveButton({ id, label, isOpen, onToggle, disabled }) {
  return (
    <button style={{ ...styles.valveBtn, borderColor: isOpen ? "#22c55e" : "#ef4444",
        background: isOpen ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" }}
      onClick={() => onToggle(id, !isOpen)} disabled={disabled}>
      <span style={{ fontSize: "1.1rem" }}>{isOpen ? "🟢" : "🔴"}</span>
      <span style={styles.valveBtnLabel}>{label}</span>
      <span style={{ ...styles.valveBtnState, color: isOpen ? "#22c55e" : "#ef4444" }}>
        {isOpen ? "OPEN" : "CLOSED"}
      </span>
    </button>
  );
}

// ─── Alert Badge ──────────────────────────────────────────────────────────────
function AlertBadge({ alert, onAck }) {
  const colors = { CRITICAL: "#ef4444", WARNING: "#f97316", INFO: "#60a5fa" };
  return (
    <div style={{ ...styles.alertItem, borderLeftColor: colors[alert.severity] }}>
      <div style={styles.alertMsg}>{alert.message}</div>
      <div style={styles.alertMeta}>{new Date(alert.timestamp).toLocaleString()} · {alert.severity}</div>
      {!alert.acknowledged && (
        <button style={styles.ackBtn} onClick={() => onAck(alert.id)}>Acknowledge</button>
      )}
    </div>
  );
}

// ─── Schedule Row ─────────────────────────────────────────────────────────────
function ScheduleRow({ sched, onSave }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ start_time: sched.start_time, end_time: sched.end_time, enabled: sched.enabled });
  return (
    <div style={styles.schedRow}>
      <span style={styles.schedLabel}>{sched.label || `Tap Stand ${sched.tap_stand}`}</span>
      {edit ? (
        <>
          <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} style={styles.timeInput} />
          <span style={{ color: "#64748b" }}>–</span>
          <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} style={styles.timeInput} />
          <label style={styles.schedCheck}>
            <input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} />
            &nbsp;On
          </label>
          <button style={styles.saveBtn} onClick={() => { onSave(sched.tap_stand, form); setEdit(false); }}>Save</button>
          <button style={styles.cancelBtn} onClick={() => setEdit(false)}>Cancel</button>
        </>
      ) : (
        <>
          <span style={styles.schedTime}>{sched.start_time} – {sched.end_time}</span>
          <span style={{ ...styles.schedStatus, color: sched.enabled ? "#22c55e" : "#ef4444" }}>
            {sched.enabled ? "Enabled" : "Disabled"}
          </span>
          <button style={styles.editBtn} onClick={() => setEdit(true)}>Edit</button>
        </>
      )}
    </div>
  );
}

// ─── Mini Chart ───────────────────────────────────────────────────────────────
function MiniChart({ data, color, label }) {
  if (!data || data.length < 2) return <div style={styles.chartEmpty}>No history data yet — start the simulator!</div>;
  const W = 500, H = 100;
  const vals = data.map(d => d.tank3?.pct ?? 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * (H - 16) - 8}`).join(" ");
  return (
    <div>
      <div style={styles.chartLabel}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <polyline fill="none" stroke={color} strokeWidth={2} points={pts} />
      </svg>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  const api = useApi();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    api("/api/dashboard")
      .then(data => {
        setStatus(data.status);
        setAlerts(data.active_alerts || []);
        setSchedules(data.schedules || []);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });

    api("/api/sensors/history?hours=6")
      .then(h => setHistory(h))
      .catch(console.error);
  }, []);

  // ── WebSocket with auto-reconnect ──────────────────────────────────────────
  useEffect(() => {
    let ws = null;

    function connect() {
      const clientId = `dashboard-${Date.now()}`;
      const token = localStorage.getItem("token");
      ws = new WebSocket(`${WS}/ws/${clientId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("WebSocket connected");
      };

      ws.onclose = () => {
        setConnected(false);
        console.log("WebSocket disconnected — reconnecting in 3s...");
        // Auto-reconnect after 3 seconds
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
      };

      ws.onmessage = (e) => {
        if (e.data === "pong") return;
        try {
          const msg = JSON.parse(e.data);

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
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };
    }

    connect();

    // Keepalive ping every 25 seconds
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 25000);

    return () => {
      clearInterval(ping);
      clearTimeout(reconnectRef.current);
      ws?.close();
    };
  }, []);

  // ── Valve toggle ───────────────────────────────────────────────────────────
  async function toggleValve(id, open) {
    try {
      await api("/api/valves/command", {
        method: "POST",
        body: JSON.stringify({ valve_id: id, action: open ? "OPEN" : "CLOSE", duration_minutes: 30 }),
      });
    } catch (e) { console.error(e); }
  }

  // ── Acknowledge alert ──────────────────────────────────────────────────────
  async function ackAlert(id) {
    try {
      await api(`/api/alerts/${id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ note: "" }),
      });
      setAlerts(a => a.filter(x => x.id !== id));
    } catch (e) { console.error(e); }
  }

  // ── Save schedule ──────────────────────────────────────────────────────────
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
  const tierColor = { NORMAL: "#22c55e", MODERATE: "#facc15", LOW: "#f97316", CRITICAL: "#ef4444" };
  const tc = tierColor[status?.tier] || "#64748b";

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
          <div style={{ ...styles.connBadge,
              background: connected ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: connected ? "#22c55e" : "#ef4444",
              borderColor: connected ? "#22c55e" : "#ef4444" }}>
            {connected ? "● Live" : "○ Reconnecting…"}
          </div>
          {lastUpdate && <span style={styles.lastUpdate}>Updated {lastUpdate.toLocaleTimeString()}</span>}
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

      {/* ── Nav ── */}
      <nav style={styles.nav}>
        {["overview","valves","schedules","alerts","history"].map(t => (
          <button key={t}
            style={{ ...styles.navBtn, ...(tab === t ? styles.navBtnActive : {}) }}
            onClick={() => setTab(t)}>
            {{ overview:"📊 Overview", valves:"🔧 Valves", schedules:"🕒 Schedules",
               alerts:`⚠ Alerts ${alerts.length > 0 ? `(${alerts.length})` : ""}`,
               history:"📈 History" }[t]}
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
                    { label:"Battery", value: status?.battery_voltage ? `${fmt(status.battery_voltage)}V` : "—", icon:"🔋", ok:(status?.battery_voltage??13)>11.5 },
                    { label:"Solar", value: status?.solar_charging ? "Charging" : "No charge", icon:"☀️", ok:status?.solar_charging },
                    { label:"Active Alerts", value: alerts.length, icon:"⚠", ok:alerts.length===0 },
                    { label:"Open Taps", value:`${[1,2,3,4,5].filter(i=>status?.valves?.[`sv${i}`]).length} / 5`, icon:"🚰", ok:true },
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
                  {[1,2,3,4,5].map(i => {
                    const sched = schedules.find(s => s.tap_stand === i);
                    const open = status?.valves?.[`sv${i}`];
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
                    { id:0, label:"SV0 — Tank 1 → Tank 2 (Overflow Prevention)", isOpen: status?.valves?.sv0 },
                    ...[1,2,3,4,5].map(i => ({
                      id:i,
                      label:`SV${i} — Tap Stand ${i} (${schedules.find(s=>s.tap_stand===i)?.label || "—"})`,
                      isOpen: status?.valves?.[`sv${i}`]
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
                    {alerts.map(a => <AlertBadge key={a.id} alert={a} onAck={isOperator ? ackAlert : ()=>{}} />)}
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
                    {["Time","T1 %","T2 %","T3 %","Inflow","Filter","Open Taps"].map(h => (
                      <div key={h} style={styles.histCell}>{h}</div>
                    ))}
                  </div>
                  {[...history].reverse().slice(0, 30).map((r, i) => (
                    <div key={i} style={{ ...styles.histRow, background: i%2===0?"#0d1f3c":"transparent" }}>
                      <div style={styles.histCell}>{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : "—"}</div>
                      <div style={styles.histCell}>{r.tank1?.pct ?? "—"}%</div>
                      <div style={styles.histCell}>{r.tank2?.pct ?? "—"}%</div>
                      <div style={styles.histCell}>{r.tank3?.pct ?? "—"}%</div>
                      <div style={styles.histCell}>{fmt(r.inflow_rate)} L/m</div>
                      <div style={styles.histCell}>{fmt(r.filter_rate)} L/m</div>
                      <div style={styles.histCell}>{r.valves ? [1,2,3,4,5].filter(n=>r.valves[`sv${n}`]).length : "—"}</div>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  loginWrap:      { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#060e1a" },
  loginCard:      { background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:16, padding:"40px 36px", width:360, textAlign:"center" },
  loginLogo:      { fontSize:"3rem", marginBottom:12 },
  loginTitle:     { fontSize:"1.3rem", fontWeight:700, color:"#e0f0ff", marginBottom:6 },
  loginSub:       { fontSize:"0.8rem", color:"#64748b", marginBottom:28 },
  loginForm:      { display:"flex", flexDirection:"column", gap:12 },
  input:          { background:"#060e1a", border:"1px solid #1e3a5f", borderRadius:8, padding:"10px 14px", color:"#e0f0ff", fontSize:"0.9rem", outline:"none" },
  errorMsg:       { color:"#ef4444", fontSize:"0.8rem" },
  loginBtn:       { background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, padding:"11px", fontSize:"0.95rem", fontWeight:600, cursor:"pointer" },
  loginHint:      { color:"#475569", fontSize:"0.72rem", marginTop:16 },
  dashWrap:       { minHeight:"100vh", background:"#060e1a", color:"#e0f0ff", fontFamily:"'Segoe UI',sans-serif" },
  header:         { background:"#0a1628", borderBottom:"1px solid #1e3a5f", padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 },
  headerLeft:     { display:"flex", alignItems:"center", gap:12 },
  headerIcon:     { fontSize:"1.8rem" },
  headerTitle:    { fontWeight:700, fontSize:"1.05rem", color:"#7dd3fc" },
  headerSub:      { fontSize:"0.7rem", color:"#64748b" },
  headerRight:    { display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  connBadge:      { border:"1px solid", borderRadius:20, padding:"3px 10px", fontSize:"0.68rem", fontWeight:600 },
  lastUpdate:     { fontSize:"0.68rem", color:"#64748b" },
  userBadge:      { fontSize:"0.75rem", color:"#94a3b8", background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:20, padding:"3px 10px" },
  logoutBtn:      { background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:6, padding:"4px 12px", cursor:"pointer", fontSize:"0.75rem" },
  criticalBanner: { background:"rgba(239,68,68,0.15)", borderBottom:"2px solid #ef4444", color:"#f87171", padding:"10px 24px", fontWeight:600, fontSize:"0.85rem" },
  nav:            { display:"flex", gap:4, padding:"10px 24px", background:"#0a1628", borderBottom:"1px solid #0d2040", flexWrap:"wrap" },
  navBtn:         { background:"none", border:"1px solid transparent", borderRadius:6, padding:"6px 14px", color:"#64748b", cursor:"pointer", fontSize:"0.78rem" },
  navBtnActive:   { background:"#0d1f3c", border:"1px solid #1e3a5f", color:"#7dd3fc" },
  main:           { padding:"20px 24px", maxWidth:1100, margin:"0 auto" },
  loading:        { color:"#64748b", textAlign:"center", padding:60, fontSize:"0.9rem" },
  tierBadge:      { display:"inline-block", border:"1px solid", borderRadius:8, padding:"6px 16px", fontSize:"0.8rem", marginBottom:16 },
  tankRow:        { display:"flex", alignItems:"flex-end", gap:0, marginBottom:20, justifyContent:"center", flexWrap:"wrap", gap:4 },
  tankCard:       { background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:10, padding:"14px 16px", textAlign:"center", width:140 },
  tankName:       { fontWeight:700, fontSize:"0.9rem", color:"#7dd3fc", marginBottom:2 },
  tankLabel:      { fontSize:"0.65rem", color:"#64748b", marginBottom:10 },
  tankBarWrap:    { position:"relative", height:140, background:"#060e1a", borderRadius:6, overflow:"hidden", marginBottom:8, border:"1px solid #1e3a5f" },
  tankBarFill:    { position:"absolute", bottom:0, left:0, right:0, transition:"height 0.8s ease" },
  tankBarPct:     { position:"absolute", top:8, width:"100%", textAlign:"center", fontWeight:700, fontSize:"1rem", color:"#e0f0ff", textShadow:"0 0 6px #000", zIndex:2 },
  tankBarVol:     { position:"absolute", bottom:4, width:"100%", textAlign:"center", fontSize:"0.65rem", color:"#cbd5e1", textShadow:"0 0 6px #000", zIndex:2 },
  tankCapLabel:   { fontSize:"0.7rem", fontWeight:600 },
  tankSubLabel:   { fontSize:"0.62rem", color:"#475569", marginTop:3 },
  arrowWrap:      { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:60, paddingBottom:40, gap:3 },
  arrowLine:      { width:2, height:20, background:"#1e3a5f" },
  arrowLabel:     { fontSize:"0.6rem", color:"#64748b", textAlign:"center" },
  statsRow:       { display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" },
  statCard:       { flex:1, minWidth:110, background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:10, padding:"14px", textAlign:"center" },
  statIcon:       { fontSize:"1.4rem" },
  statValue:      { fontWeight:700, fontSize:"1.1rem", margin:"4px 0" },
  statLabel:      { fontSize:"0.65rem", color:"#64748b" },
  sectionHead:    { fontWeight:700, fontSize:"0.85rem", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12, marginTop:8 },
  tapRow:         { display:"flex", gap:8, flexWrap:"wrap" },
  tapCard:        { background:"#0d1f3c", border:"1px solid", borderRadius:10, padding:"12px", textAlign:"center", width:110, transition:"border-color 0.3s" },
  tapIcon:        { fontSize:"1.5rem" },
  tapName:        { fontSize:"0.68rem", color:"#94a3b8", marginTop:4 },
  tapStatus:      { fontWeight:700, fontSize:"0.72rem", margin:"3px 0" },
  tapSched:       { fontSize:"0.6rem", color:"#475569" },
  valveGrid:      { display:"flex", flexDirection:"column", gap:8, maxWidth:600 },
  valveBtn:       { display:"flex", alignItems:"center", gap:10, background:"none", border:"1px solid", borderRadius:8, padding:"12px 16px", cursor:"pointer", color:"#e0f0ff", textAlign:"left" },
  valveBtnLabel:  { flex:1, fontSize:"0.82rem" },
  valveBtnState:  { fontSize:"0.72rem", fontWeight:700 },
  valveNote:      { color:"#475569", fontSize:"0.72rem", marginTop:12 },
  readOnly:       { color:"#f97316", fontWeight:"normal", fontSize:"0.72rem" },
  schedNote:      { color:"#64748b", fontSize:"0.78rem", marginBottom:14 },
  schedList:      { display:"flex", flexDirection:"column", gap:8 },
  schedRow:       { display:"flex", alignItems:"center", gap:12, background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:8, padding:"10px 14px", flexWrap:"wrap" },
  schedLabel:     { fontWeight:600, fontSize:"0.82rem", minWidth:100 },
  schedTime:      { color:"#7dd3fc", fontSize:"0.82rem", flex:1 },
  schedStatus:    { fontSize:"0.72rem", fontWeight:600 },
  editBtn:        { background:"#0a1628", border:"1px solid #1e3a5f", color:"#94a3b8", borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:"0.72rem" },
  saveBtn:        { background:"#1d4ed8", border:"none", color:"#fff", borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:"0.72rem" },
  cancelBtn:      { background:"none", border:"1px solid #334155", color:"#64748b", borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:"0.72rem" },
  timeInput:      { background:"#060e1a", border:"1px solid #1e3a5f", borderRadius:5, padding:"3px 8px", color:"#e0f0ff", fontSize:"0.78rem" },
  schedCheck:     { fontSize:"0.78rem", color:"#94a3b8", cursor:"pointer" },
  noAlerts:       { color:"#22c55e", padding:"24px", textAlign:"center", fontSize:"0.9rem" },
  alertList:      { display:"flex", flexDirection:"column", gap:8 },
  alertItem:      { background:"#0d1f3c", borderLeft:"3px solid", borderRadius:"0 8px 8px 0", padding:"12px 14px" },
  alertMsg:       { fontSize:"0.85rem", marginBottom:4 },
  alertMeta:      { fontSize:"0.68rem", color:"#64748b" },
  ackBtn:         { marginTop:6, background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:"0.7rem" },
  chartEmpty:     { color:"#475569", padding:20, textAlign:"center", fontSize:"0.8rem" },
  chartLabel:     { color:"#64748b", fontSize:"0.75rem", marginBottom:8 },
  historyTable:   { marginTop:20, border:"1px solid #1e3a5f", borderRadius:8, overflow:"hidden" },
  histHeader:     { display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:"#0d1f3c", borderBottom:"1px solid #1e3a5f" },
  histRow:        { display:"grid", gridTemplateColumns:"repeat(7,1fr)" },
  histCell:       { padding:"8px 10px", fontSize:"0.72rem", color:"#94a3b8", borderRight:"1px solid #0f2040" },
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return { username: localStorage.getItem("username"), role: localStorage.getItem("role") };
  });

  function handleLogout() {
    localStorage.clear();
    setUser(null);
  }

  if (!user) return <LoginPage onLogin={u => setUser(u)} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
