import styles from "../styles";

const SEVERITY_COLORS = {
  CRITICAL: "#ef4444",
  WARNING:  "#f97316",
  INFO:     "#60a5fa",
};

export default function AlertBadge({ alert, onAck }) {
  return (
    <div style={{ ...styles.alertItem, borderLeftColor: SEVERITY_COLORS[alert.severity] }}>
      <div style={styles.alertMsg}>{alert.message}</div>
      <div style={styles.alertMeta}>
        {new Date(alert.timestamp).toLocaleString()} · {alert.severity}
      </div>
      {!alert.acknowledged && (
        <button style={styles.ackBtn} onClick={() => onAck(alert.id)}>
          Acknowledge
        </button>
      )}
    </div>
  );
}
