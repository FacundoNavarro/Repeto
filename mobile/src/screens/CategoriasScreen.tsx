import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { Categoria } from '../types';

export default function CategoriasScreen() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.categorias.listar().then(data => { setCategorias(data); setLoading(false); });
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#4A90D9" /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      data={categorias}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card}>
          <View style={[styles.dot, { backgroundColor: item.color ?? '#ccc' }]} />
          <View style={styles.info}>
            <Text style={styles.nombre}>{item.nombre}</Text>
            {item.descripcion && <Text style={styles.desc}>{item.descripcion}</Text>}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  dot:    { width: 14, height: 14, borderRadius: 7, marginRight: 14 },
  info:   { flex: 1 },
  nombre: { fontSize: 17, fontWeight: '700', color: '#1a1a2e' },
  desc:   { fontSize: 14, color: '#888', marginTop: 3 },
});
