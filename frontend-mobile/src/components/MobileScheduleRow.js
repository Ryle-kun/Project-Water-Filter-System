import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function MobileScheduleRow({ sched, onEdit, onDelete }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{sched.label}</Text>
        <Text style={styles.time}> {sched.start_time} - {sched.end_time}</Text>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* EDIT BUTTON */}
        <TouchableOpacity onPress={() => onEdit(sched)} style={styles.editBtn}>
          <Text style={styles.editText}>EDIT</Text>
        </TouchableOpacity>

        {/* DELETE BUTTON */}
       <TouchableOpacity style={{ backgroundColor: '#e95f5f', padding: 5, borderRadius: 5 }} onPress={onDelete}>
   <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>DEL</Text>
</TouchableOpacity>
        
        {/* STATUS DOT (Green if enabled) */}
        <View style={[styles.dot, { backgroundColor: sched.enabled ? '#22c55e' : '#334155' }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1f3c', padding: 15, borderRadius: 10, marginBottom: 8, marginHorizontal: 20, borderWidth: 1, borderColor: '#1e3a5f' },
  label: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  time: { color: '#7dd3fc', fontSize: 12, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 15 },
  editBtn: { backgroundColor: '#1e3a5f', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#3b82f6', marginRight: 8 },
  editText: { color: '#3b82f6', fontSize: 10, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#450a0a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  deleteText: { fontSize: 12 }
});