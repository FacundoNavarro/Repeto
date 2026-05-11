import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { PalabraHoy, RootStackParamList } from '../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

export default function HomeScreen({ navigation }: Props) {
  const [palabras, setPalabras] = useState<PalabraHoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function cargar() {
    try {
      const data = await api.srs.hoy();
      setPalabras(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, []));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90D9" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
    >
      <Text style={styles.greeting}>¡Hola! 👋</Text>

      {palabras.length === 0 ? (
        <View style={styles.doneCard}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>¡Al día!</Text>
          <Text style={styles.doneText}>No tenés palabras pendientes por ahora.</Text>
        </View>
      ) : (
        <View style={styles.pendingCard}>
          <Text style={styles.count}>{palabras.length}</Text>
          <Text style={styles.countLabel}>
            {palabras.length === 1 ? 'palabra para repasar' : 'palabras para repasar'}
          </Text>
          <TouchableOpacity
            style={styles.btnStudy}
            onPress={() => (navigation as any).navigate('Study')}
          >
            <Text style={styles.btnStudyText}>Estudiar ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{palabras.reduce((s, p) => s + p.aciertos, 0)}</Text>
          <Text style={styles.statLabel}>Aciertos totales</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{palabras.reduce((s, p) => s + p.errores, 0)}</Text>
          <Text style={styles.statLabel}>Errores totales</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting:      { fontSize: 26, fontWeight: '700', color: '#1a1a2e', marginBottom: 20, marginTop: 10 },
  pendingCard:   { backgroundColor: '#4A90D9', borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 20 },
  count:         { fontSize: 72, fontWeight: '900', color: '#fff' },
  countLabel:    { fontSize: 18, color: 'rgba(255,255,255,0.85)', marginBottom: 24 },
  btnStudy:      { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  btnStudyText:  { color: '#4A90D9', fontSize: 17, fontWeight: '700' },
  doneCard:      { backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', marginBottom: 20 },
  doneEmoji:     { fontSize: 48, marginBottom: 12 },
  doneTitle:     { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  doneText:      { color: '#666', fontSize: 15, textAlign: 'center' },
  statsRow:      { flexDirection: 'row', gap: 12 },
  statBox:       { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center' },
  statNum:       { fontSize: 28, fontWeight: '800', color: '#1a1a2e' },
  statLabel:     { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
});
