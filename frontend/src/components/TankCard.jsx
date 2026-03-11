import styles from "../styles";

export default function TankCard({ name, label, level, capacity, color, subLabel }) {
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
      <div style={{ ...styles.tankCapLabel, color: statusColor }}>
        {Math.round(level)} / {capacity} L
      </div>
      <div style={styles.tankSubLabel}>{subLabel}</div>
    </div>
  );
}
