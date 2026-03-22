import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const mobileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#060e1a' },
  // Login Styles
  loginCard: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#060e1a' },
  input: { backgroundColor: '#0d1f3c', borderWeight: 1, borderColor: '#1e3a5f', borderRadius: 8, padding: 15, color: '#fff', marginBottom: 15 },
  loginBtn: { backgroundColor: '#1d4ed8', padding: 15, borderRadius: 8, alignItems: 'center' },
  
  // Dashboard Styles
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#0a1628' },
  title: { color: '#7dd3fc', fontSize: 20, fontWeight: 'bold' },
  
  // Horizontal Tank Section
  tankScroll: { paddingVertical: 20, paddingLeft: 10 },
  tankCard: { backgroundColor: '#0d1f3c', borderRadius: 15, padding: 15, width: 170, marginRight: 15, alignItems: 'center', borderWidth: 1, borderColor: '#1e3a5f' },
  tankBody: { width: 90, height: 160, backgroundColor: '#060e1a', borderRadius: 10, borderWidth: 2, borderColor: '#334155', overflow: 'hidden', marginVertical: 10 },
  water: { position: 'absolute', bottom: 0, width: '100%' },
  pctText: { color: '#fff', fontWeight: 'bold', fontSize: 22, textAlign: 'center', marginTop: 60, zIndex: 5 },
  
  // Valve Controls (Vertical)
  sectionHead: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', padding: 20, textTransform: 'uppercase' },
  valveRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d1f3c', marginHorizontal: 20, marginBottom: 10, padding: 16, borderRadius: 12 }
});