import styles from "../styles";

export default function MiniChart({ data, color, label }) {
  if (!data || data.length < 2) {
    return (
      <div style={styles.chartEmpty}>
        No history data yet — start the simulator!
      </div>
    );
  }

  const W = 500, H = 1000;
  const vals = data.map(d => d.tank3?.pct ?? 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;

  const pts = vals
    .map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * (H - 16) - 8}`)
    .join(" ");

  return (
    <div>
      <div style={styles.chartLabel}>{label}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        <polyline fill="none" stroke={color} strokeWidth={2} points={pts} />
      </svg>
    </div>
  );
}
