export type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
  color: string | null;
};

export type Palabra = {
  id: number;
  palabra: string;
  traduccion: string;
  ejemplo_uso: string | null;
  categoria_id: number;
  categoria_nombre: string;
  categoria_color: string | null;
  dificultad_base: number;
};

export type PalabraHoy = Palabra & {
  nivel: number;
  facilidad: number;
  intervalo: number;
  aciertos: number;
  errores: number;
};

export type EstadoDeck = {
  total_en_deck: number;
  dominadas: number;
  nivel_global: number;
  max_dificultad: number;
  pendientes_hoy: number;
  disponibles_para_agregar: number;
};

export type Stats = {
  nivel_global: number;
  total_palabras: number;
  palabras_dominadas: number;
  aciertos_total: number;
  errores_total: number;
  pendientes_hoy: number;
  racha_dias: number;
  semana: { dia: string; palabras: number }[];
  distribucion_niveles: { nivel: number; cantidad: number }[];
  por_categoria: {
    id: number;
    nombre: string;
    color: string | null;
    total: number;
    dominadas: number;
    promedio_nivel: number;
  }[];
  sesiones_recientes: {
    id: number;
    fecha: string;
    palabras_vistas: number;
    aciertos: number;
    errores: number;
    duracion_segundos: number | null;
    modo: 'srs' | 'libre';
    categoria_nombre: string | null;
  }[];
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Study: undefined;
  AgregarPalabras: undefined;
  ModoLibre: undefined;
};

export type TabParamList = {
  Home: undefined;
  Categorias: undefined;
  Dashboard: undefined;
};
