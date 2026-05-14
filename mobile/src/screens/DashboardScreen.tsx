import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { Stats } from '../types';
import { C } from '../theme';

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function WeekBar({ semana }: { semana: Stats['semana'] }) {
  const hoy = new Date().getDay(); // 0=domingo
  const max = Math.max(...semana.map(d => d.palabras), 1);

  // Construir los 7 días (hoy hacia atrás)
  const bars = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const isoDate = date.toISOString().slice(0, 10);
    const entry = semana.find(d => String(d.dia).slice(0, 10) === isoDate);
    const palabras = entry?.palabras ?? 0;
    const isToday  = i === 6;
    const diaNombre = DIAS[date.getDay()];
    return { palabras, isToday, diaNombre, height: Math.max((palabras / max) * 44, palabras > 0 ? 4 : 0) };
  });

  return (
    <View style={s.barChart}>
      {bars.map((b, i) => (
        <View key={i} style={s.barCol}>
          <View style={s.barTrack}>
            <View style={[s.barFill, { height: b.height, backgroundColor: b.isToday ? C.accent : C.bar }]} />
          </View>
          <Text style={[s.barLbl, b.isToday && s.barLblToday]}>{b.diaNombre}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function cargar() {
    try { const data = await api.stats.mis(); setStats(data); } catch {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, []));

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
  );

  if (!stats) return (
    <View style={s.center}><Text style={s.empty}>No se pudo cargar el progreso</Text></View>
  );

  const precision = stats.aciertos_total + stats.errores_total > 0
    ? Math.round(stats.aciertos_total / (stats.aciertos_total + stats.errores_total) * 100)
    : 0;

  const mesActual = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
    >
      <Text style={s.pageTitle}>Progreso</Text>
      <Text style={s.pageSub}>{mesActual}</Text>

      {/* Streak */}
      <View style={s.streakCard}>
        <View>
          <Text style={s.streakNum}>{stats.racha_dias}</Text>
          <Text style={s.streakDays}>día{stats.racha_dias !== 1 ? 's' : ''} de racha</Text>
        </View>
        <View style={{ flex: 1 }} />
        <View style={s.streakIcon}>
          <Text style={{ fontSize: 22 }}>🔥</Text>
        </View>
      </View>

      {/* Stat cards */}
      <View style={s.statRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.pendientes_hoy}</Text>
          <Text style={s.statLabel}>palabras hoy</Text>
        </View>
        <View style={s.statCard}>
          <Text style={[s.statNum, { color: C.ok }]}>{precision}%</Text>
          <Text style={s.statLabel}>precisión</Text>
        </View>
      </View>

      {/* Weekly chart */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Esta semana</Text>
        <WeekBar semana={stats.semana} />
      </View>

      {/* Por categoría */}
      {stats.por_categoria.filter(c => c.total > 0).length > 0 && (
        <View>
          <Text style={s.sectionTitle}>Por categoría</Text>
          {stats.por_categoria.filter(c => c.total > 0).slice(0, 5).map(cat => (
            <View key={cat.id} style={s.catCard}>
              <View style={s.catRow}>
                <Text style={s.catName}>{cat.nombre}</Text>
                <Text style={s.catCount}>{cat.dominadas} / {cat.total}</Text>
              </View>
              <View style={s.miniTrack}>
                <View style={[s.miniFill, {
                  width: `${cat.total > 0 ? (cat.dominadas / cat.total) * 100 : 0}%` as any,
                  backgroundColor: cat.color ?? C.accent,
                }]} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Total badge */}
      <View style={s.totalBadge}>
        <Text style={s.totalNum}>{stats.palabras_dominadas}</Text>
        <Text style={s.totalInfo}>palabras{'\n'}aprendidas</Text>
      </View>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: 16 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  empty:        { color: C.textMid, fontSize: 16 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 2 },
  pageSub:      { fontSize: 11, color: C.textMid, marginBottom: 14 },

  streakCard:   { backgroundColor: C.accent, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  streakNum:    { fontSize: 30, fontWeight: '800', color: C.white, lineHeight: 34 },
  streakDays:   { fontSize: 12, fontWeight: '500', color: C.navy },
  streakIcon:   { width: 44, height: 44, backgroundColor: C.orange, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  statRow:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard:     { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNum:      { fontSize: 22, fontWeight: '800', color: C.text, lineHeight: 26 },
  statLabel:    { fontSize: 10, color: C.textMid, marginTop: 4 },

  section:      { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 12 },
  barChart:     { flexDirection: 'row', gap: 5, alignItems: 'flex-end', height: 60 },
  barCol:       { flex: 1, alignItems: 'center', gap: 4 },
  barTrack:     { width: '100%', height: 44, backgroundColor: C.track, borderRadius: 5, justifyContent: 'flex-end' },
  barFill:      { borderRadius: 5, width: '100%' },
  barLbl:       { fontSize: 9, color: C.textMid },
  barLblToday:  { color: C.text, fontWeight: '600' },

  catCard:      { backgroundColor: C.white, borderRadius: 12, padding: 10, marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  catRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catName:      { fontSize: 11, fontWeight: '600', color: C.text },
  catCount:     { fontSize: 10, color: C.textMid },
  miniTrack:    { height: 3, backgroundColor: C.track, borderRadius: 2 },
  miniFill:     { height: 3, borderRadius: 2 },

  totalBadge:   { backgroundColor: C.accentL, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 20 },
  totalNum:     { fontSize: 24, fontWeight: '800', color: C.accent },
  totalInfo:    { fontSize: 12, fontWeight: '600', color: C.accent, lineHeight: 18 },
});
