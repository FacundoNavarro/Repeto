import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { Categoria, Palabra, RootStackParamList } from '../types';
import { C } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ModoLibre'> };

type Fase = 'picker' | 'playing' | 'done';

function LevelDots({ nivel }: { nivel: number }) {
  return (
    <View style={s.dotsRow}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={[s.dot, i < nivel && s.dotFilled]} />
      ))}
    </View>
  );
}

export default function ModoLibreScreen({ navigation }: Props) {
  const [fase, setFase]               = useState<Fase>('picker');
  const [categorias, setCategorias]   = useState<Categoria[]>([]);
  const [catSelec, setCatSelec]       = useState<Categoria | null>(null);
  const [palabras, setPalabras]       = useState<Palabra[]>([]);
  const [index, setIndex]             = useState(0);
  const [revealed, setRevealed]       = useState(false);
  const [aciertos, setAciertos]       = useState(0);
  const [errores, setErrores]         = useState(0);
  const [loadingCat, setLoadingCat]   = useState(true);
  const [loadingWords, setLoadingWords] = useState(false);
  const [guardando, setGuardando]     = useState(false);
  const startRef                      = useRef(Date.now());

  useEffect(() => {
    api.categorias.listar().then(data => {
      setCategorias(data);
      setLoadingCat(false);
    });
  }, []);

  async function elegirCategoria(cat: Categoria) {
    setLoadingWords(true);
    setCatSelec(cat);
    try {
      const data = await api.palabras.listar(cat.id);
      if (data.length === 0) {
        Alert.alert('Sin palabras', 'Esta categoría no tiene palabras todavía.');
        setLoadingWords(false);
        return;
      }
      // Shuffle
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setPalabras(shuffled);
      setIndex(0);
      setRevealed(false);
      setAciertos(0);
      setErrores(0);
      startRef.current = Date.now();
      setFase('playing');
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las palabras.');
    }
    setLoadingWords(false);
  }

  function marcar(correcto: boolean) {
    if (correcto) setAciertos(a => a + 1);
    else setErrores(e => e + 1);

    if (index + 1 >= palabras.length) {
      terminar(correcto ? aciertos + 1 : aciertos, correcto ? errores : errores + 1);
    } else {
      setIndex(i => i + 1);
      setRevealed(false);
    }
  }

  async function terminar(ac: number, er: number) {
    setFase('done');
    setGuardando(true);
    try {
      const duracion = Math.round((Date.now() - startRef.current) / 1000);
      await api.srs.guardarSesionLibre({
        categoria_id: catSelec?.id ?? null,
        palabras_vistas: palabras.length,
        aciertos: ac,
        errores: er,
        duracion_segundos: duracion,
      });
    } catch {}
    setGuardando(false);
  }

  /* ─── Picker ─── */
  if (fase === 'picker') {
    if (loadingCat) return (
      <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
    );
    return (
      <SafeAreaView style={s.container}>
        <Text style={s.pickerTitle}>Elegí una categoría</Text>
        <Text style={s.pickerSub}>El progreso en modo libre no afecta tu SRS.</Text>
        <ScrollView contentContainerStyle={s.listContainer}>
          {categorias.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={s.catCard}
              onPress={() => elegirCategoria(cat)}
              disabled={loadingWords}
            >
              <View style={[s.catDot, { backgroundColor: cat.color ?? C.accent }]} />
              <View style={s.catInfo}>
                <Text style={s.catNombre}>{cat.nombre}</Text>
                {cat.descripcion && (
                  <Text style={s.catDesc} numberOfLines={1}>{cat.descripcion}</Text>
                )}
              </View>
              <Text style={s.catArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {loadingWords && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  /* ─── Done ─── */
  if (fase === 'done') {
    const precision = aciertos + errores > 0
      ? Math.round(aciertos / (aciertos + errores) * 100)
      : 0;
    return (
      <SafeAreaView style={s.center}>
        <Text style={s.doneEmoji}>
          {precision >= 80 ? '🏆' : precision >= 50 ? '👍' : '💪'}
        </Text>
        <Text style={s.doneTitle}>¡Sesión completada!</Text>
        <Text style={s.doneSub}>{catSelec?.nombre}</Text>

        <View style={s.resultRow}>
          <View style={s.resultBox}>
            <Text style={[s.resultNum, { color: C.ok }]}>{aciertos}</Text>
            <Text style={s.resultLabel}>Correctas</Text>
          </View>
          <View style={s.resultBox}>
            <Text style={[s.resultNum, { color: C.err }]}>{errores}</Text>
            <Text style={s.resultLabel}>Incorrectas</Text>
          </View>
          <View style={s.resultBox}>
            <Text style={[s.resultNum, { color: C.accent }]}>{precision}%</Text>
            <Text style={s.resultLabel}>Precisión</Text>
          </View>
        </View>

        {guardando && <ActivityIndicator color={C.textMid} style={{ marginTop: 12 }} />}

        <TouchableOpacity style={s.btnBack} onPress={() => setFase('picker')}>
          <Text style={s.btnBackText}>Otra categoría</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnHome} onPress={() => navigation.goBack()}>
          <Text style={s.btnHomeText}>Volver al inicio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /* ─── Playing ─── */
  const palabra  = palabras[index];
  const progress = (index + 1) / palabras.length;

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.playHeader}>
        <View style={[s.catPill, { backgroundColor: catSelec?.color ?? C.accent }]}>
          <Text style={s.catPillText}>{catSelec?.nombre.toUpperCase()}</Text>
        </View>
        <Text style={s.modeTag}>LIBRE</Text>
      </View>

      {/* Progress */}
      <View style={s.progTrack}>
        <View style={[s.progFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={s.progCount}>{index + 1} / {palabras.length}</Text>

      {/* Card */}
      <TouchableOpacity
        style={s.card}
        onPress={() => !revealed && setRevealed(true)}
        activeOpacity={revealed ? 1 : 0.92}
      >
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

        {/* Footer */}
        <View style={s.cardFooter}>
          <Text style={s.levelTxt}>Dificultad {palabra.dificultad_base}</Text>
          <LevelDots nivel={palabra.dificultad_base} />
        </View>
      </TouchableOpacity>

      {/* Answer buttons */}
      {revealed && (
        <>
          <Text style={s.ratingLabel}>¿La sabías?</Text>
          <View style={s.ratingRow}>
            <TouchableOpacity
              style={[s.rBtn, { backgroundColor: C.errL }]}
              onPress={() => marcar(false)}
            >
              <Text style={[s.rBtnText, { color: C.err }]}>✗  No</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rBtn, { backgroundColor: C.okL }]}
              onPress={() => marcar(true)}
            >
              <Text style={[s.rBtnText, { color: C.ok }]}>✓  Sí</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg, padding: 16 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 16, padding: 24 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(247,246,243,0.7)', justifyContent: 'center', alignItems: 'center' },

  pickerTitle:    { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 4, marginTop: 8 },
  pickerSub:      { fontSize: 13, color: C.textMid, marginBottom: 20 },
  listContainer:  { gap: 10, paddingBottom: 24 },

  catCard:  { backgroundColor: C.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  catDot:   { width: 12, height: 12, borderRadius: 6, marginRight: 14 },
  catInfo:  { flex: 1 },
  catNombre: { fontSize: 15, fontWeight: '700', color: C.text },
  catDesc:   { fontSize: 12, color: C.textMid, marginTop: 2 },
  catArrow:  { fontSize: 22, color: C.textLt, marginLeft: 8 },

  playHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  catPill:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  catPillText: { color: C.white, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  modeTag:    { fontSize: 9, fontWeight: '700', letterSpacing: 1.4, color: C.orange },

  progTrack:  { height: 4, backgroundColor: C.track, borderRadius: 2, marginBottom: 4 },
  progFill:   { height: 4, backgroundColor: C.orange, borderRadius: 2 },
  progCount:  { textAlign: 'right', color: C.textMid, fontSize: 10, fontWeight: '500', marginBottom: 10 },

  card: {
    flex: 1, backgroundColor: C.white, borderRadius: 22, padding: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20,
    elevation: 5,
  },
  wordEn:      { fontSize: 36, fontWeight: '800', color: C.text, textAlign: 'center', lineHeight: 42, marginBottom: 6 },
  wordEnSmall: { fontSize: 26, marginBottom: 10 },
  rule:        { width: '50%', height: 1, backgroundColor: C.track, marginBottom: 14 },
  hint:        { fontSize: 11, color: C.textLt, marginBottom: 14 },
  tapCircle:   { width: 48, height: 48, backgroundColor: C.accentL, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tapIcon:     { fontSize: 22 },
  wordTr:      { fontSize: 32, fontWeight: '800', color: C.ok, textAlign: 'center', marginBottom: 10 },
  example:     { fontSize: 11, color: C.textMid, textAlign: 'center', fontStyle: 'italic', lineHeight: 17 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.track },
  levelTxt:    { fontSize: 10, color: C.textMid },
  dotsRow:     { flexDirection: 'row', gap: 5 },
  dot:         { width: 9, height: 9, borderRadius: 5, backgroundColor: C.track },
  dotFilled:   { backgroundColor: C.orange },

  ratingLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
  ratingRow:   { flexDirection: 'row', gap: 10, marginBottom: 6 },
  rBtn:        { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  rBtnText:    { fontSize: 15, fontWeight: '700' },

  doneEmoji:    { fontSize: 64 },
  doneTitle:    { fontSize: 26, fontWeight: '800', color: C.text },
  doneSub:      { fontSize: 15, color: C.textMid },
  resultRow:    { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 8 },
  resultBox:    { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  resultNum:    { fontSize: 28, fontWeight: '800' },
  resultLabel:  { fontSize: 11, color: C.textMid, marginTop: 4 },
  btnBack:      { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 20, width: '100%', alignItems: 'center' },
  btnBackText:  { color: C.white, fontSize: 16, fontWeight: '700' },
  btnHome:      { borderWidth: 1.5, borderColor: C.track, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 32, marginTop: 10, width: '100%', alignItems: 'center' },
  btnHomeText:  { color: C.textMid, fontSize: 15, fontWeight: '600' },
});
