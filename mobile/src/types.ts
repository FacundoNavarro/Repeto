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

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Study: undefined;
};

export type TabParamList = {
  Home: undefined;
  Categorias: undefined;
};
