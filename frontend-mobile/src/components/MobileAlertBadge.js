import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MobileAlertBadge({ message, type }) {
  // Kung walang message, huwag magpakita ng kahit ano
  if (!message) return null;

  const isWarning = type === 'warning';

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isWarning ? '#450a0a' : '#064e3b',
        borderColor: isWarning ? '#ef4444' : '#22c55e'
      }
    ]}>
      <Text style={{ fontSize: 16, marginRight: 10 }}>{isWarning ? '⚠️' : '✅'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: isWarning ? '#f87171' : '#4ade80' }]}>
          {isWarning ? 'SYSTEM ALERT' : 'SYSTEM STATUS'}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2
  },
  message: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  }
});