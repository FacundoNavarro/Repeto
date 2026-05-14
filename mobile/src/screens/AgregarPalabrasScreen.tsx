import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { Categoria, RootStackParamList } from '../types';
import { C } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'AgregarPalabras'> };

export default function AgregarPalabrasScreen({ navigation }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading]       = useState(true);
  const [agregando, setAgregando]   = useState<number | null>(null);

  useEffect(() => {
    api.categorias.listar().then(data => { setCategorias(data); setLoading(false); });
  }, []);

  async function agregarCategoria(cat: Categoria) {
    setAgregando(cat.id);
    try {
      const palabras = await api.palabras.listar(cat.id);
      if (palabras.length === 0) {
        Alert.alert('Sin palabras', 'Esta categoría no tiene palabras todavía.');
        setAgregando(null);
        return;
      }

      let agregadas = 0;
      for (const p of palabras) {
        try { await api.srs.inicializar(p.id); agregadas++; } catch {}
      }

      Alert.alert(
        '¡Listo! 🎉',
        `Se agregaron ${agregadas} palabras de "${cat.nombre}" a tu deck.`,
        [{ text: 'Jugar ahora', onPress: () => navigation.replace('Study') },
         { text: 'Seguir agregando' }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setAgregando(null);
  }

  if (loading) return (
    <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
  );

  return (
    <FlatList
      style={s.container}
      data={categorias}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListHeaderComponent={
        <Text style={s.hint}>Elegí una categoría para agregar sus palabras a tu deck</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={s.card}
          onPress={() => agregarCategoria(item)}
          disabled={agregando === item.id}
        >
          <View style={[s.dot, { backgroundColor: item.color ?? C.accent }]} />
          <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
          {agregando === item.id
            ? <ActivityIndicator size="small" color={C.accent} />
            : <Text style={s.addBtn}>+ Agregar</Text>
          }
        </TouchableOpacity>
      )}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, padding: 16 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  hint:      { fontSize: 13, color: C.textMid, marginBottom: 16, lineHeight: 18 },
  card: {
    backgroundColor: C.white, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  dot:    { width: 12, height: 12, borderRadius: 6, marginRight: 12, flexShrink: 0 },
  nombre: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
  addBtn: { fontSize: 13, fontWeight: '700', color: C.accent },
});
