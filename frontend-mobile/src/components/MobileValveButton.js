import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';

export default function MobileValveButton({ label, isOpen, onToggle }) {
  // 1. Setup Animation Value
  const animatedValue = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    // 2. Smooth transition tuwing nagbabago ang isOpen
    Animated.timing(animatedValue, {
      toValue: isOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: false, // false dahil babaguhin natin ang layout property (translateX)
    }).start();
  }, [isOpen]);

  // 3. I-calculate ang paggalaw ng thumb
  const moveThumb = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // 22px ang layo ng pag-slide
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[styles.card, { borderColor: isOpen ? '#22c55e' : '#1e3a5f' }]} 
      onPress={onToggle}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.status, { color: isOpen ? '#22c55e' : '#ef4444' }]}>
          {isOpen ? '● OPEN' : '○ CLOSED'}
        </Text>
      </View>

      {/* Interactive Switch Track */}
      <View style={[styles.switchTrack, { backgroundColor: isOpen ? '#064e3b' : '#331111' }]}>
        <Animated.View style={[
          styles.switchThumb, 
          { 
            transform: [{ translateX: moveThumb }],
            backgroundColor: isOpen ? '#22c55e' : '#ef4444' 
          }
        ]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1f3c', padding: 18, borderRadius: 16, marginBottom: 12, marginHorizontal: 20, borderWidth: 1.5 },
  label: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  status: { fontSize: 11, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  switchTrack: { width: 46, height: 24, borderRadius: 12, justifyContent: 'center', padding: 2 },
  switchThumb: { width: 18, height: 18, borderRadius: 9 }
});