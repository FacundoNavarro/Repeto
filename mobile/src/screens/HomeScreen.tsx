import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { PalabraHoy, RootStackParamList } from '../types';
import { C } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

export default function HomeScreen({ navigation }: Props) {
  const [palabras, setPalabras]   = useState<PalabraHoy[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function cargar() {
    try { const data = await api.srs.hoy(); setPalabras(data); } catch {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, []));

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
  );

  const totalAciertos = palabras.reduce((sum, p) => sum + p.aciertos, 0);
  const totalErrores  = palabras.reduce((sum, p) => sum + p.errores, 0);
  const precision     = totalAciertos + totalErrores > 0
    ? Math.round(totalAciertos / (totalAciertos + totalErrores) * 100)
    : null;

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
    >
      <Text style={s.greeting}>Buenos días 👋</Text>

      {palabras.length === 0 ? (
        <View style={s.doneCard}>
          <Text style={s.doneEmoji}>🎉</Text>
          <Text style={s.doneTitle}>¡Al día!</Text>
          <Text style={s.doneSub}>No tenés palabras pendientes por ahora.</Text>
        </View>
      ) : (
        <View style={s.pendingCard}>
          <View>
            <Text style={s.count}>{palabras.length}</Text>
            <Text style={s.countLabel}>
              {palabras.length === 1 ? 'palabra para repasar' : 'palabras para repasar'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.btnStudy}
            onPress={() => (navigation as any).navigate('Study')}
          >
            <Text style={s.btnStudyText}>Estudiar →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statNum}>{totalAciertos}</Text>
          <Text style={s.statLabel}>Aciertos</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statNum}>{totalErrores}</Text>
          <Text style={s.statLabel}>Errores</Text>
        </View>
        {precision !== null && (
          <View style={s.statBox}>
            <Text style={[s.statNum, { color: C.ok }]}>{precision}%</Text>
            <Text style={s.statLabel}>Precisión</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, padding: 20 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  greeting:    { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 20, marginTop: 8 },
  pendingCard: { backgroundColor: C.accent, borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  count:       { fontSize: 52, fontWeight: '900', color: C.white, lineHeight: 56 },
  countLabel:  { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  btnStudy:    { backgroundColor: C.white, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22 },
  btnStudyText: { color: C.accent, fontSize: 15, fontWeight: '700' },
  doneCard:    { backgroundColor: C.white, borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  doneEmoji:   { fontSize: 44, marginBottom: 12 },
  doneTitle:   { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
  doneSub:     { color: C.textMid, fontSize: 14, textAlign: 'center' },
  statsRow:    { flexDirection: 'row', gap: 10 },
  statBox:     { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statNum:     { fontSize: 26, fontWeight: '800', color: C.text },
  statLabel:   { fontSize: 12, color: C.textMid, marginTop: 4 },
});
