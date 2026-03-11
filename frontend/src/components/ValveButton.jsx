import styles from "../styles";

export default function ValveButton({ id, label, isOpen, onToggle, disabled }) {
  return (
    <button
      style={{
        ...styles.valveBtn,
        borderColor: isOpen ? "#22c55e" : "#ef4444",
        background: isOpen ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      }}
      onClick={() => onToggle(id, !isOpen)}
      disabled={disabled}
    >
      <span style={{ fontSize: "1.1rem" }}>{isOpen ? "🟢" : "🔴"}</span>
      <span style={styles.valveBtnLabel}>{label}</span>
      <span style={{ ...styles.valveBtnState, color: isOpen ? "#22c55e" : "#ef4444" }}>
        {isOpen ? "OPEN" : "CLOSED"}
      </span>
    </button>
  );
}
