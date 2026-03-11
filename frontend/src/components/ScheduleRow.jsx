import { useState } from "react";
import styles from "../styles";

export default function ScheduleRow({ sched, onSave }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    start_time: sched.start_time,
    end_time:   sched.end_time,
    enabled:    sched.enabled,
  });

  return (
    <div style={styles.schedRow}>
      <span style={styles.schedLabel}>
        {sched.label || `Tap Stand ${sched.tap_stand}`}
      </span>

      {edit ? (
        <>
          <input
            type="time"
            value={form.start_time}
            onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
            style={styles.timeInput}
          />
          <span style={{ color: "#64748b" }}>–</span>
          <input
            type="time"
            value={form.end_time}
            onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
            style={styles.timeInput}
          />
          <label style={styles.schedCheck}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
            />
            &nbsp;On
          </label>
          <button style={styles.saveBtn} onClick={() => { onSave(sched.tap_stand, form); setEdit(false); }}>
            Save
          </button>
          <button style={styles.cancelBtn} onClick={() => setEdit(false)}>
            Cancel
          </button>
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
