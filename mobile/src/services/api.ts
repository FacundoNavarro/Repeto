import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; usuario: { id: string; nombre: string; email: string } }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      ),
    registro: (email: string, nombre: string, password: string) =>
      request<{ token: string; usuario: { id: string; nombre: string; email: string } }>(
        '/api/auth/registro',
        { method: 'POST', body: JSON.stringify({ email, nombre, password }) }
      ),
  },
  srs: {
    hoy: () => request<import('../types').PalabraHoy[]>('/api/srs/hoy'),
    responder: (palabra_id: number, calificacion: number) =>
      request('/api/srs/responder', {
        method: 'POST',
        body: JSON.stringify({ palabra_id, calificacion }),
      }),
  },
  categorias: {
    listar: () => request<import('../types').Categoria[]>('/api/categorias'),
  },
  palabras: {
    listar: (categoria_id?: number) =>
      request<import('../types').Palabra[]>(
        `/api/palabras${categoria_id ? `?categoria_id=${categoria_id}` : ''}`
      ),
  },
};
