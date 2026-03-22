import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { mobileStyles } from '../styles/mobileStyles';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Siguraduhing may import ito
import { API_URL } from '../api/config'; // Siguraduhing tama ang path

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  if (!username || !password) {
    Alert.alert("Required", "Please enter your credentials.");
    return;
  }

  setLoading(true);

  try {
    // TANGGALIN ang extra "/api" dito dahil nasa config.js na iyon
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: username,
      password: password
    });

    if (response.data.access_token) {
      // ✅ ETO ANG PINAKAMAHALAGA: I-save ang token para sa Dashboard
      await AsyncStorage.setItem('userToken', response.data.access_token);
      await AsyncStorage.setItem('username', response.data.username);
      
      console.log("Login Success! Token saved.");
      onLoginSuccess(); 
    }
  } catch (error) {
    console.log("Login Error Details:", error.response?.data || error.message);
    Alert.alert(
      "Login Failed", 
      "Hindi makakonekta sa XAMPP. Siguraduhing naka-run ang Uvicorn at tama ang IP."
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={[mobileStyles.loginCard, { flex: 1, justifyContent: 'center', backgroundColor: '#060e1a' }]}>
      {/* ── BRANDING ── */}
      <View style={{ alignItems: 'center', marginBottom: 50 }}>
        <Text style={{ fontSize: 70, marginBottom: 10 }}>💧</Text>
        <Text style={{ color: '#7dd3fc', fontSize: 24, fontWeight: 'bold', letterSpacing: 1.5 }}>
          WATER MONITORING
        </Text>
        <View style={{ height: 2, width: 40, backgroundColor: '#3b82f6', marginTop: 8 }} />
        <Text style={{ color: '#475569', fontSize: 10, marginTop: 10, fontWeight: '600' }}>
          IoT-Based Monitoring & Control System
        </Text>
      </View>

      <View style={{ paddingHorizontal: 35 }}>
        {/* Username Input */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 8, marginLeft: 4 }}>USERNAME</Text>
          <TextInput 
            style={mobileStyles.input} 
            placeholder="Enter username" 
            placeholderTextColor="#1e293b"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={{ marginBottom: 40 }}>
          <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 8, marginLeft: 4 }}>PASSWORD</Text>
          <TextInput 
            style={mobileStyles.input} 
            placeholder="••••••••" 
            placeholderTextColor="#1e293b"
            secureTextEntry 
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Sign In Button */}
        <TouchableOpacity 
          style={[
            mobileStyles.loginBtn, 
            { backgroundColor: loading ? '#0f172a' : '#1d4ed8', height: 55, justifyContent: 'center', borderRadius: 12 }
          ]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#7dd3fc" />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={{ color: '#1e293b', textAlign: 'center', marginTop: 30, fontSize: 10 }}>
          Lab 6 Mobile Interface | Secure Access
        </Text>
      </View>
    </View>
  );
}