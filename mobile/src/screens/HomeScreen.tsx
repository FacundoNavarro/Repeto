import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { EstadoDeck, PalabraHoy, RootStackParamList } from '../types';
import { C } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Main'> };

export default function HomeScreen({ navigation }: Props) {
  const [palabras, setPalabras]     = useState<PalabraHoy[]>([]);
  const [deck, setDeck]             = useState<EstadoDeck | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [iniciando, setIniciando]   = useState(false);

  async function cargar() {
    try {
      const [data, deckData] = await Promise.all([
        api.srs.hoy(),
        api.srs.estadoDeck(),
      ]);
      setPalabras(data);
      setDeck(deckData);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { setLoading(true); cargar(); }, []));

  async function empezar() {
    setIniciando(true);
    try {
      const res = await api.srs.inicializarNivel();
      if (res.agregadas === 0) {
        Alert.alert('Sin palabras', res.mensaje ?? 'No hay palabras nuevas para tu nivel.');
      } else {
        await cargar();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo inicializar.');
    }
    setIniciando(false);
  }

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
  );

  const esNuevo       = deck ? deck.total_en_deck === 0 : palabras.length === 0;
  const pendientes    = deck?.pendientes_hoy ?? palabras.length;

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

      {/* Nivel badge */}
      {deck && (
        <View style={s.nivelRow}>
          <View style={s.nivelBadge}>
            <Text style={s.nivelText}>Nivel {deck.nivel_global}</Text>
          </View>
          <Text style={s.nivelSub}>
            {deck.dominadas} dominadas · {deck.total_en_deck} en deck
          </Text>
        </View>
      )}

      {/* Card principal */}
      {esNuevo ? (
        <View style={s.welcomeCard}>
          <Text style={s.welcomeEmoji}>🚀</Text>
          <Text style={s.welcomeTitle}>¡Empecemos!</Text>
          <Text style={s.welcomeSub}>
            Te vamos a agregar tus primeras palabras según tu nivel.
          </Text>
          <TouchableOpacity style={s.btnEmpezar} onPress={empezar} disabled={iniciando}>
            {iniciando
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.btnEmpezarText}>Empezar →</Text>}
          </TouchableOpacity>
        </View>
      ) : pendientes === 0 ? (
        <View style={s.doneCard}>
          <Text style={s.doneEmoji}>🎉</Text>
          <Text style={s.doneTitle}>¡Al día!</Text>
          <Text style={s.doneSub}>No tenés palabras pendientes por ahora.</Text>
        </View>
      ) : (
        <View style={s.pendingCard}>
          <View>
            <Text style={s.count}>{pendientes}</Text>
            <Text style={s.countLabel}>
              {pendientes === 1 ? 'palabra para repasar' : 'palabras para repasar'}
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

      {/* Botón Jugar SRS */}
      {!esNuevo && (
        <TouchableOpacity
          style={[s.btnJugar, pendientes === 0 && s.btnJugarDisabled]}
          onPress={() => (navigation as any).navigate('Study')}
          disabled={pendientes === 0}
        >
          <Text style={s.btnJugarText}>▶  Jugar</Text>
        </TouchableOpacity>
      )}

      {/* Modo Libre */}
      <TouchableOpacity
        style={s.btnLibre}
        onPress={() => (navigation as any).navigate('ModoLibre')}
      >
        <Text style={s.btnLibreText}>🎲  Modo Libre</Text>
      </TouchableOpacity>

      {/* Agregar palabras */}
      {!esNuevo && (
        <TouchableOpacity
          style={s.btnAgregar}
          onPress={() => (navigation as any).navigate('AgregarPalabras')}
        >
          <Text style={s.btnAgregarText}>+ Agregar palabras al deck</Text>
        </TouchableOpacity>
      )}

      {/* Stats */}
      {(totalAciertos > 0 || totalErrores > 0) && (
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
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, padding: 20 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  greeting:     { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 14, marginTop: 8 },

  nivelRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  nivelBadge:   { backgroundColor: C.accentL, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  nivelText:    { color: C.accent, fontWeight: '700', fontSize: 13 },
  nivelSub:     { color: C.textMid, fontSize: 13 },

  welcomeCard:  { backgroundColor: C.white, borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  welcomeEmoji: { fontSize: 44, marginBottom: 10 },
  welcomeTitle: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 8 },
  welcomeSub:   { color: C.textMid, fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btnEmpezar:   { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 32 },
  btnEmpezarText: { color: C.white, fontSize: 16, fontWeight: '700' },

  pendingCard:  { backgroundColor: C.accent, borderRadius: 20, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  count:        { fontSize: 52, fontWeight: '900', color: C.white, lineHeight: 56 },
  countLabel:   { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  btnStudy:     { backgroundColor: C.white, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22 },
  btnStudyText: { color: C.accent, fontSize: 15, fontWeight: '700' },

  doneCard:     { backgroundColor: C.white, borderRadius: 20, padding: 36, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  doneEmoji:    { fontSize: 44, marginBottom: 12 },
  doneTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 6 },
  doneSub:      { color: C.textMid, fontSize: 14, textAlign: 'center' },

  btnJugar:          { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginBottom: 12, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  btnJugarDisabled:  { backgroundColor: C.track },
  btnJugarText:      { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  btnLibre:     { borderWidth: 1.5, borderColor: C.orange, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnLibreText: { color: C.orange, fontSize: 15, fontWeight: '700' },

  btnAgregar:     { borderWidth: 1.5, borderColor: C.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  btnAgregarText: { color: C.accent, fontSize: 15, fontWeight: '700' },

  statsRow:  { flexDirection: 'row', gap: 10 },
  statBox:   { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  statNum:   { fontSize: 26, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 12, color: C.textMid, marginTop: 4 },
});
