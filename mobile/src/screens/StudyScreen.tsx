import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { PalabraHoy, RootStackParamList } from '../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Study'> };

const RATINGS = [
  { label: 'Mal',     value: 0, color: '#e74c3c' },
  { label: 'Difícil', value: 2, color: '#e67e22' },
  { label: 'Bien',    value: 3, color: '#27ae60' },
  { label: 'Fácil',   value: 5, color: '#2980b9' },
];

export default function StudyScreen({ navigation }: Props) {
  const [queue, setQueue] = useState<PalabraHoy[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.srs.hoy().then(data => { setQueue(data); setLoading(false); });
  }, []);

  async function responder(calificacion: number) {
    const palabra = queue[index];
    await api.srs.responder(palabra.id, calificacion);

    if (index + 1 >= queue.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setRevealed(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90D9" /></View>;
  }

  if (done || queue.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>¡Sesión completada!</Text>
        <Text style={styles.doneSub}>Estudiaste {queue.length} palabras</Text>
        <TouchableOpacity style={styles.btnBack} onPress={() => navigation.goBack()}>
          <Text style={styles.btnBackText}>Volver al inicio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const palabra = queue[index];
  const progress = (index + 1) / queue.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra de progreso */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{index + 1} / {queue.length}</Text>

      {/* Tarjeta */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => setRevealed(true)}
        activeOpacity={revealed ? 1 : 0.8}
      >
        <Text style={styles.categoria}>{palabra.categoria_nombre}</Text>
        <Text style={styles.palabraText}>{palabra.palabra}</Text>

        {!revealed ? (
          <Text style={styles.tapHint}>Tocá para ver la traducción</Text>
        ) : (
          <View style={styles.back}>
            <Text style={styles.traduccion}>{palabra.traduccion}</Text>
            {palabra.ejemplo_uso && (
              <Text style={styles.ejemplo}>"{palabra.ejemplo_uso}"</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Botones de calificación */}
      {revealed && (
        <View style={styles.ratings}>
          {RATINGS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.ratingBtn, { backgroundColor: r.color }]}
              onPress={() => responder(r.value)}
            >
              <Text style={styles.ratingText}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', gap: 16 },
  progressBar:  { height: 6, backgroundColor: '#ddd', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#4A90D9', borderRadius: 3 },
  progressText: { textAlign: 'right', color: '#888', fontSize: 13, marginBottom: 20 },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: 24, padding: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12,
    elevation: 4, marginBottom: 20,
  },
  categoria:    { fontSize: 13, color: '#4A90D9', fontWeight: '600', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  palabraText:  { fontSize: 42, fontWeight: '800', color: '#1a1a2e', textAlign: 'center', marginBottom: 24 },
  tapHint:      { color: '#bbb', fontSize: 15 },
  back:         { alignItems: 'center', gap: 16 },
  traduccion:   { fontSize: 26, fontWeight: '700', color: '#27ae60', textAlign: 'center' },
  ejemplo:      { fontSize: 16, color: '#666', textAlign: 'center', fontStyle: 'italic' },
  ratings:      { flexDirection: 'row', gap: 10, marginBottom: 10 },
  ratingBtn:    { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  ratingText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneEmoji:    { fontSize: 64 },
  doneTitle:    { fontSize: 28, fontWeight: '800', color: '#1a1a2e' },
  doneSub:      { fontSize: 16, color: '#666' },
  btnBack:      { backgroundColor: '#4A90D9', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  btnBackText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
