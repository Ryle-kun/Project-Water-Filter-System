import React, { useState } from 'react';
import { View } from 'react-native';
// SIGURADUHIN NA TAMA ANG PATHS DITO:
import LoginScreen from './src/screens/LoginScreen'; 
import DashboardScreen from './src/screens/DashboardScreen';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {isLoggedIn ? (
        // Ipinapasa ang logout function para bumalik sa login
        <DashboardScreen onLogout={() => setIsLoggedIn(false)} />
      ) : (
        // Ipinapasa ang login success para pumasok sa dashboard
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </View>
  );
}