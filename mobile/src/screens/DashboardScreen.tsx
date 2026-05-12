import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { Stats } from '../types';

const NIVEL_LABELS = ['Nuevo', 'Aprendiendo', 'Familiar', 'Bueno', 'Muy bueno', 'Dominado'];
const NIVEL_COLORS = ['#bdc3c7', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60', '#1a8a4c'];

function NivelBadge({ nivel }: { nivel: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: NIVEL_COLORS[nivel] }]}>
      <Text style={styles.badgeText}>{NIVEL_LABELS[nivel]}</Text>
    </View>
  );
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function cargar() {
    try {
      const data = await api.stats.mis();
      setStats(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, []));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90D9" /></View>;
  }

  if (!stats) {
    return <View style={styles.center}><Text style={styles.empty}>No se pudo cargar el dashboard</Text></View>;
  }

  const precision = stats.aciertos_total + stats.errores_total > 0
    ? Math.round(stats.aciertos_total / (stats.aciertos_total + stats.errores_total) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} />}
    >
      {/* Nivel global */}
      <View style={styles.nivelCard}>
        <Text style={styles.nivelLabel}>Nivel global</Text>
        <Text style={styles.nivelNum}>{stats.nivel_global}</Text>
        <NivelBadge nivel={Math.min(stats.nivel_global, 5)} />
        {stats.racha_dias > 0 && (
          <Text style={styles.racha}>🔥 {stats.racha_dias} día{stats.racha_dias !== 1 ? 's' : ''} seguidos</Text>
        )}
      </View>

      {/* Stats rápidas */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.total_palabras}</Text>
          <Text style={styles.statLabel}>Palabras</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.palabras_dominadas}</Text>
          <Text style={styles.statLabel}>Dominadas</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{precision}%</Text>
          <Text style={styles.statLabel}>Precisión</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.pendientes_hoy}</Text>
          <Text style={styles.statLabel}>Para hoy</Text>
        </View>
      </View>

      {/* Distribución por nivel */}
      {stats.distribucion_niveles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribución por nivel</Text>
          {stats.distribucion_niveles.map(({ nivel, cantidad }) => (
            <View key={nivel} style={styles.distRow}>
              <Text style={styles.distLabel}>{NIVEL_LABELS[nivel]}</Text>
              <View style={styles.distBarBg}>
                <View style={[
                  styles.distBarFill,
                  { width: `${(cantidad / stats.total_palabras) * 100}%`, backgroundColor: NIVEL_COLORS[nivel] }
                ]} />
              </View>
              <Text style={styles.distCount}>{cantidad}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Por categoría */}
      {stats.por_categoria.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Por categoría</Text>
          {stats.por_categoria.map(cat => (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: cat.color ?? '#ccc' }]} />
              <Text style={styles.catNombre} numberOfLines={1}>{cat.nombre}</Text>
              <Text style={styles.catStats}>{cat.dominadas}/{cat.total}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sesiones recientes */}
      {stats.sesiones_recientes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sesiones recientes</Text>
          {stats.sesiones_recientes.map(s => (
            <View key={s.id} style={styles.sesionRow}>
              <Text style={styles.sesionFecha}>{formatFecha(s.fecha)}</Text>
              <Text style={styles.sesionInfo}>
                {s.palabras_vistas} palabras · {s.aciertos} bien · {s.errores} mal
              </Text>
              <Text style={[styles.sesionModo, s.modo === 'srs' ? styles.modoSrs : styles.modoLibre]}>
                {s.modo.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {stats.total_palabras === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyText}>Todavía no estudiaste ninguna palabra.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nivelCard:    { backgroundColor: '#4A90D9', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16 },
  nivelLabel:   { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  nivelNum:     { color: '#fff', fontSize: 64, fontWeight: '900', lineHeight: 72 },
  badge:        { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  badgeText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  racha:        { color: 'rgba(255,255,255,0.9)', marginTop: 12, fontSize: 15 },
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox:      { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center' },
  statNum:      { fontSize: 28, fontWeight: '800', color: '#1a1a2e' },
  statLabel:    { fontSize: 13, color: '#888', marginTop: 4 },
  section:      { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 14 },
  distRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  distLabel:    { width: 90, fontSize: 13, color: '#555' },
  distBarBg:    { flex: 1, height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  distBarFill:  { height: 8, borderRadius: 4 },
  distCount:    { width: 28, textAlign: 'right', fontSize: 13, color: '#888' },
  catRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  catDot:       { width: 12, height: 12, borderRadius: 6 },
  catNombre:    { flex: 1, fontSize: 15, color: '#1a1a2e' },
  catStats:     { fontSize: 14, color: '#888', fontWeight: '600' },
  sesionRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8 },
  sesionFecha:  { width: 48, fontSize: 13, color: '#888' },
  sesionInfo:   { flex: 1, fontSize: 13, color: '#444' },
  sesionModo:   { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modoSrs:      { backgroundColor: '#EBF5FB', color: '#2980b9' },
  modoLibre:    { backgroundColor: '#EAFAF1', color: '#27ae60' },
  empty:        { color: '#888', fontSize: 16 },
  emptyBox:     { alignItems: 'center', padding: 32, gap: 12 },
  emptyEmoji:   { fontSize: 48 },
  emptyText:    { color: '#888', fontSize: 15, textAlign: 'center' },
});
