const styles = {
  // ── Login ────────────────────────────────────────────────────────────────────
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

  // ── Dashboard layout ─────────────────────────────────────────────────────────
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
  sectionHead:    { fontWeight:700, fontSize:"0.85rem", color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:12, marginTop:8 },

  // ── Tank ─────────────────────────────────────────────────────────────────────
  tierBadge:      { display:"inline-block", border:"1px solid", borderRadius:8, padding:"6px 16px", fontSize:"0.8rem", marginBottom:16 },
  tankRow:        { display:"flex", alignItems:"flex-end", gap:4, marginBottom:20, justifyContent:"center", flexWrap:"wrap" },
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

  // ── Stats ────────────────────────────────────────────────────────────────────
  statsRow:       { display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" },
  statCard:       { flex:1, minWidth:110, background:"#0d1f3c", border:"1px solid #1e3a5f", borderRadius:10, padding:"14px", textAlign:"center" },
  statIcon:       { fontSize:"1.4rem" },
  statValue:      { fontWeight:700, fontSize:"1.1rem", margin:"4px 0" },
  statLabel:      { fontSize:"0.65rem", color:"#64748b" },

  // ── Tap stands ───────────────────────────────────────────────────────────────
  tapRow:         { display:"flex", gap:8, flexWrap:"wrap" },
  tapCard:        { background:"#0d1f3c", border:"1px solid", borderRadius:10, padding:"12px", textAlign:"center", width:110, transition:"border-color 0.3s" },
  tapIcon:        { fontSize:"1.5rem" },
  tapName:        { fontSize:"0.68rem", color:"#94a3b8", marginTop:4 },
  tapStatus:      { fontWeight:700, fontSize:"0.72rem", margin:"3px 0" },
  tapSched:       { fontSize:"0.6rem", color:"#475569" },

  // ── Valves ───────────────────────────────────────────────────────────────────
  valveGrid:      { display:"flex", flexDirection:"column", gap:8, maxWidth:600 },
  valveBtn:       { display:"flex", alignItems:"center", gap:10, background:"none", border:"1px solid", borderRadius:8, padding:"12px 16px", cursor:"pointer", color:"#e0f0ff", textAlign:"left" },
  valveBtnLabel:  { flex:1, fontSize:"0.82rem" },
  valveBtnState:  { fontSize:"0.72rem", fontWeight:700 },
  valveNote:      { color:"#475569", fontSize:"0.72rem", marginTop:12 },
  readOnly:       { color:"#f97316", fontWeight:"normal", fontSize:"0.72rem" },

  // ── Schedules ────────────────────────────────────────────────────────────────
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

  // ── Alerts ───────────────────────────────────────────────────────────────────
  noAlerts:       { color:"#22c55e", padding:"24px", textAlign:"center", fontSize:"0.9rem" },
  alertList:      { display:"flex", flexDirection:"column", gap:8 },
  alertItem:      { background:"#0d1f3c", borderLeft:"3px solid", borderRadius:"0 8px 8px 0", padding:"12px 14px" },
  alertMsg:       { fontSize:"0.85rem", marginBottom:4 },
  alertMeta:      { fontSize:"0.68rem", color:"#64748b" },
  ackBtn:         { marginTop:6, background:"none", border:"1px solid #334155", color:"#94a3b8", borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:"0.7rem" },

  // ── History ──────────────────────────────────────────────────────────────────
  chartEmpty:     { color:"#475569", padding:20, textAlign:"center", fontSize:"0.8rem" },
  chartLabel:     { color:"#64748b", fontSize:"0.75rem", marginBottom:8 },
  historyTable:   { marginTop:20, border:"1px solid #1e3a5f", borderRadius:8, overflow:"hidden" },
  histHeader:     { display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:"#0d1f3c", borderBottom:"1px solid #1e3a5f" },
  histRow:        { display:"grid", gridTemplateColumns:"repeat(7,1fr)" },
  histCell:       { padding:"8px 10px", fontSize:"0.72rem", color:"#94a3b8", borderRight:"1px solid #0f2040" },
};

export default styles;
