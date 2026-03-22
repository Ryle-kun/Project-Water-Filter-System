import React from 'react';
import { View, Text } from 'react-native';
import { mobileStyles } from '../styles/mobileStyles';

export default function MobileTankCard({ name, level, capacity, color }) {
  // Percentage calculation: $ \frac{\text{level}}{\text{capacity}} \times 100 $
  const pct = Math.min(100, Math.max(0, ((level || 0) / (capacity || 1)) * 100));

  return (
    <View style={mobileStyles.tankCard}>
      <Text style={{ color: '#7dd3fc', fontWeight: 'bold' }}>{name}</Text>
      <View style={mobileStyles.tankBody}>
        <Text style={mobileStyles.pctText}>{pct.toFixed(0)}%</Text>
        <View style={[mobileStyles.water, { height: `${pct}%`, backgroundColor: color || '#3b82f6' }]} />
      </View>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{level} L</Text>
    </View>
  );
}