import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { PalabraHoy, RootStackParamList } from '../types';
import { C } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Study'> };

const RATINGS = [
  { label: 'Mal',     value: 0, bg: C.errL,  color: C.err  },
  { label: 'Difícil', value: 2, bg: C.warnL, color: C.warn },
  { label: 'Bien',    value: 3, bg: C.okL,   color: C.ok   },
  { label: 'Fácil',   value: 5, bg: C.accentL, color: C.accent },
];

function LevelDots({ nivel }: { nivel: number }) {
  return (
    <View style={s.dotsRow}>
      {[0,1,2,3,4].map(i => (
        <View key={i} style={[s.dot, i < nivel && s.dotFilled]} />
      ))}
    </View>
  );
}

export default function StudyScreen({ navigation }: Props) {
  const [queue, setQueue]       = useState<PalabraHoy[]>([]);
  const [index, setIndex]       = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [done, setDone]         = useState(false);

  useEffect(() => {
    api.srs.hoy().then(data => { setQueue(data); setLoading(false); });
  }, []);

  async function responder(calificacion: number) {
    await api.srs.responder(queue[index].id, calificacion);
    if (index + 1 >= queue.length) { setDone(true); }
    else { setIndex(i => i + 1); setRevealed(false); }
  }

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
  );

  if (done || queue.length === 0) return (
    <SafeAreaView style={s.center}>
      <Text style={s.doneEmoji}>🎉</Text>
      <Text style={s.doneTitle}>¡Sesión completada!</Text>
      <Text style={s.doneSub}>Estudiaste {queue.length} {queue.length === 1 ? 'palabra' : 'palabras'}</Text>
      <TouchableOpacity style={s.btnBack} onPress={() => navigation.goBack()}>
        <Text style={s.btnBackText}>Volver al inicio</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const palabra  = queue[index];
  const progress = (index + 1) / queue.length;

  return (
    <SafeAreaView style={s.container}>
      {/* Progress */}
      <View style={s.progTrack}>
        <View style={[s.progFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={s.progCount}>{index + 1} / {queue.length}</Text>

      {/* Card */}
      <TouchableOpacity
        style={s.card}
        onPress={() => !revealed && setRevealed(true)}
        activeOpacity={revealed ? 1 : 0.92}
      >
        {/* Pill */}
        <View style={s.pill}>
          <Text style={s.pillText}>{palabra.categoria_nombre.toUpperCase()}</Text>
        </View>

        {/* Front: word */}
        <Text style={[s.wordEn, revealed && s.wordEnSmall]}>{palabra.palabra}</Text>

        <View style={s.rule} />

        {!revealed ? (
          <>
            <Text style={s.hint}>Toca para revelar la traducción</Text>
            <View style={s.tapCircle}>
              <Text style={s.tapIcon}>👆</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={s.wordTr}>{palabra.traduccion}</Text>
            {palabra.ejemplo_uso && (
              <Text style={s.example}>"{palabra.ejemplo_uso}"</Text>
            )}
          </>
        )}

        {/* Level dots */}
        <View style={s.cardFooter}>
          <Text style={s.levelTxt}>Nivel {palabra.nivel}</Text>
          <LevelDots nivel={palabra.nivel} />
        </View>
      </TouchableOpacity>

      {/* Rating buttons */}
      {revealed && (
        <>
          <Text style={s.ratingLabel}>¿Cómo te resultó?</Text>
          <View style={s.ratingRow}>
            {RATINGS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[s.rBtn, { backgroundColor: r.bg }]}
                onPress={() => responder(r.value)}
              >
                <Text style={[s.rBtnText, { color: r.color }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, padding: 16 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 16 },
  progTrack:   { height: 4, backgroundColor: C.track, borderRadius: 2, marginBottom: 4 },
  progFill:    { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  progCount:   { textAlign: 'right', color: C.textMid, fontSize: 10, fontWeight: '500', marginBottom: 10 },
  card: {
    flex: 1, backgroundColor: C.white, borderRadius: 22, padding: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20,
    elevation: 5,
  },
  pill:        { backgroundColor: C.accentL, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 16 },
  pillText:    { color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  wordEn:      { fontSize: 36, fontWeight: '800', color: C.text, textAlign: 'center', lineHeight: 42, marginBottom: 6 },
  wordEnSmall: { fontSize: 26, marginBottom: 10 },
  rule:        { width: '50%', height: 1, backgroundColor: C.track, marginBottom: 14 },
  hint:        { fontSize: 11, color: C.textLt, marginBottom: 14 },
  tapCircle:   { width: 48, height: 48, backgroundColor: C.accentL, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
  tapIcon:     { fontSize: 22 },
  wordTr:      { fontSize: 32, fontWeight: '800', color: C.ok, textAlign: 'center', marginBottom: 10 },
  example:     { fontSize: 11, color: C.textMid, textAlign: 'center', fontStyle: 'italic', lineHeight: 17 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.track },
  levelTxt:    { fontSize: 10, color: C.textMid },
  dotsRow:     { flexDirection: 'row', gap: 5 },
  dot:         { width: 9, height: 9, borderRadius: 5, backgroundColor: C.track },
  dotFilled:   { backgroundColor: C.accent },
  ratingLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
  ratingRow:   { flexDirection: 'row', gap: 6, marginBottom: 6 },
  rBtn:        { flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  rBtnText:    { fontSize: 11, fontWeight: '600' },
  doneEmoji:   { fontSize: 64 },
  doneTitle:   { fontSize: 28, fontWeight: '800', color: C.text },
  doneSub:     { fontSize: 16, color: C.textMid },
  btnBack:     { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  btnBackText: { color: C.white, fontSize: 16, fontWeight: '700' },
});
