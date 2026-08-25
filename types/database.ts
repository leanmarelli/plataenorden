/**
 * Tipos manuales del schema Supabase (ver supabase/migrations/0001_init.sql).
 * Estructura equivalente a la que emite `supabase gen types typescript`.
 * Si más adelante configurás la CLI de Supabase, regeneralos con:
 *   npx supabase gen types typescript --project-id <id> > types/database.ts
 */

export type MovTipo = "Ingreso" | "Gasto" | "Ahorro";
export type Moneda = "ARS" | "USD";
export type FijoVar = "Fijo" | "Variable";
export type MovEstado = "Confirmado" | "Pendiente";
export type ThemePref = "light" | "dark" | "system";

export type Database = {
  public: {
    Tables: {
      settings: {
        Row: {
          user_id: string;
          tc_ref: number;
          cur_pref: Moneda;
          mes: string;
          theme: ThemePref;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tc_ref?: number;
          cur_pref?: Moneda;
          mes?: string;
          theme?: ThemePref;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          tc_ref?: number;
          cur_pref?: Moneda;
          mes?: string;
          theme?: ThemePref;
          updated_at?: string;
        };
        Relationships: [];
      };
      movimientos: {
        Row: {
          id: string;
          user_id: string;
          fecha: string;
          tipo: MovTipo;
          cat: string;
          descripcion: string | null;
          mon: Moneda;
          monto: number;
          tc: number | null;
          medio: string | null;
          fv: FijoVar;
          estado: MovEstado;
          from_fijo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fecha: string;
          tipo: MovTipo;
          cat: string;
          descripcion?: string | null;
          mon: Moneda;
          monto: number;
          tc?: number | null;
          medio?: string | null;
          fv?: FijoVar;
          estado?: MovEstado;
          from_fijo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fecha?: string;
          tipo?: MovTipo;
          cat?: string;
          descripcion?: string | null;
          mon?: Moneda;
          monto?: number;
          tc?: number | null;
          medio?: string | null;
          fv?: FijoVar;
          estado?: MovEstado;
          from_fijo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fijos: {
        Row: {
          id: string;
          user_id: string;
          concepto: string;
          cat: string;
          mon: Moneda;
          monto: number;
          dia: number;
          tipo: MovTipo;
          cuotas_totales: number | null;
          cuotas_pagas: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          concepto: string;
          cat: string;
          mon: Moneda;
          monto: number;
          dia: number;
          tipo?: MovTipo;
          cuotas_totales?: number | null;
          cuotas_pagas?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          concepto?: string;
          cat?: string;
          mon?: Moneda;
          monto?: number;
          dia?: number;
          tipo?: MovTipo;
          cuotas_totales?: number | null;
          cuotas_pagas?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metas: {
        Row: {
          id: string;
          user_id: string;
          nombre: string;
          mon: Moneda;
          objetivo: number;
          ahorrado: number;
          fecha: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nombre: string;
          mon: Moneda;
          objetivo: number;
          ahorrado?: number;
          fecha?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nombre?: string;
          mon?: Moneda;
          objetivo?: number;
          ahorrado?: number;
          fecha?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      viajes: {
        Row: {
          id: string;
          user_id: string;
          viaje: string;
          concepto: string;
          mon: Moneda;
          gastado: number;
          pais_emoji: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          viaje: string;
          concepto: string;
          mon: Moneda;
          gastado?: number;
          pais_emoji?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          viaje?: string;
          concepto?: string;
          mon?: Moneda;
          gastado?: number;
          pais_emoji?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversiones: {
        Row: {
          id: string;
          user_id: string;
          fecha: string;
          de: Moneda;
          monto_de: number;
          a: Moneda;
          monto_a: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          fecha: string;
          de: Moneda;
          monto_de: number;
          a: Moneda;
          monto_a: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          fecha?: string;
          de?: Moneda;
          monto_de?: number;
          a?: Moneda;
          monto_a?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      mov_tipo: MovTipo;
      moneda: Moneda;
      fijo_var: FijoVar;
      mov_estado: MovEstado;
      theme_pref: ThemePref;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Aliases cómodos para el resto del código
export type Settings = Database["public"]["Tables"]["settings"]["Row"];
export type Movimiento = Database["public"]["Tables"]["movimientos"]["Row"];
export type Fijo = Database["public"]["Tables"]["fijos"]["Row"];
export type Meta = Database["public"]["Tables"]["metas"]["Row"];
export type Viaje = Database["public"]["Tables"]["viajes"]["Row"];
export type Conversion = Database["public"]["Tables"]["conversiones"]["Row"];
