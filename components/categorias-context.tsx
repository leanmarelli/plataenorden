"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CATS_AHORRO, CATS_GASTO, CATS_INGRESO } from "@/lib/constants";
import type { Categoria, MovTipo } from "@/types/database";

interface Ctx {
  /** Todas las categorías del usuario cargadas de la DB. */
  custom: Categoria[];
  /** Devuelve el listado unificado (hardcoded + custom del usuario) para un tipo. */
  getCategorias: (tipo: MovTipo) => string[];
  /** Alta de una categoría nueva. Devuelve la fila creada o null si falló. */
  addCategoria: (nombre: string, tipo: MovTipo) => Promise<Categoria | null>;
  /** Baja de una categoría propia por id. */
  removeCategoria: (id: string) => Promise<void>;
}

const CategoriasCtx = createContext<Ctx | null>(null);

const CATS_HARDCODED: Record<MovTipo, readonly string[]> = {
  Gasto: CATS_GASTO,
  Ingreso: CATS_INGRESO,
  Ahorro: CATS_AHORRO,
};

export function CategoriasProvider({
  initial,
  children,
}: {
  initial: Categoria[];
  children: React.ReactNode;
}) {
  const [custom, setCustom] = useState<Categoria[]>(initial);
  const supabase = createSupabaseBrowserClient();

  // Refrescar al montar por si hubo cambios de otro dispositivo (best-effort)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categorias").select("*");
      if (data) setCustom(data as Categoria[]);
    })();
  }, [supabase]);

  const getCategorias = useCallback(
    (tipo: MovTipo) => {
      const propias = custom
        .filter((c) => c.tipo === tipo)
        .map((c) => c.nombre);
      // Mantener orden: hardcoded primero, custom al final, sin duplicados
      const set = new Set(CATS_HARDCODED[tipo]);
      const out = [...CATS_HARDCODED[tipo]];
      for (const p of propias) if (!set.has(p)) out.push(p);
      return out;
    },
    [custom],
  );

  const addCategoria = useCallback(
    async (nombre: string, tipo: MovTipo) => {
      const clean = nombre.trim();
      if (!clean) return null;
      // Si ya existe (hardcoded o custom) no la duplicamos
      const yaEsta = getCategorias(tipo).some(
        (c) => c.toLowerCase() === clean.toLowerCase(),
      );
      if (yaEsta) return null;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("categorias")
        .insert({ user_id: user.id, nombre: clean, tipo })
        .select()
        .single();
      if (error || !data) return null;
      setCustom((cs) => [...cs, data as Categoria]);
      return data as Categoria;
    },
    [supabase, getCategorias],
  );

  const removeCategoria = useCallback(
    async (id: string) => {
      const prev = custom;
      setCustom((cs) => cs.filter((c) => c.id !== id));
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) setCustom(prev);
    },
    [custom, supabase],
  );

  const value = useMemo(
    () => ({ custom, getCategorias, addCategoria, removeCategoria }),
    [custom, getCategorias, addCategoria, removeCategoria],
  );

  return (
    <CategoriasCtx.Provider value={value}>{children}</CategoriasCtx.Provider>
  );
}

export function useCategorias() {
  const ctx = useContext(CategoriasCtx);
  if (!ctx) throw new Error("useCategorias fuera de CategoriasProvider");
  return ctx;
}
