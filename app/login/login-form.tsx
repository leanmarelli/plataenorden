"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/resumen";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const supabase = createSupabaseBrowserClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    startTransition(async () => {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
                : undefined,
          },
        });
        if (error) {
          setError(traducirError(error.message));
          return;
        }
        setNotice(
          "Cuenta creada. Si tu proyecto pide verificación de email, revisá tu casilla.",
        );
        // Si el proyecto tiene "confirm email" apagado, ya hay sesión → adentro.
        const { data } = await supabase.auth.getSession();
        if (data.session) router.replace(next);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(traducirError(error.message));
          return;
        }
        router.replace(next);
        router.refresh();
      }
    });
  }

  async function loginConGoogle() {
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
            : undefined,
      },
    });
    if (error) setError(traducirError(error.message));
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="inline-flex rounded-[10px] p-[3px] mx-auto"
        style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
      >
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className="px-4 py-1.5 text-sm font-semibold rounded-[7px] transition"
            style={{
              background: mode === m ? "var(--surface)" : "transparent",
              color: mode === m ? "var(--ink)" : "var(--ink-soft)",
              boxShadow: mode === m ? "var(--shadow)" : "none",
            }}
          >
            {m === "signin" ? "Ingresar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--neg-soft)", color: "var(--neg)" }}
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--pos-soft)", color: "var(--pos)" }}
          >
            {notice}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary justify-center"
          disabled={pending}
        >
          {pending
            ? "Un segundo…"
            : mode === "signin"
              ? "Ingresar"
              : "Crear cuenta"}
        </button>
      </form>

      <div className="relative my-1 text-center">
        <div
          className="absolute inset-0 flex items-center"
          aria-hidden="true"
        >
          <span
            className="w-full border-t"
            style={{ borderColor: "var(--line)" }}
          />
        </div>
        <span
          className="relative px-3 text-xs uppercase tracking-widest"
          style={{ background: "var(--surface)", color: "var(--ink-faint)" }}
        >
          o
        </span>
      </div>

      <button
        type="button"
        className="btn justify-center"
        onClick={loginConGoogle}
        disabled={pending}
      >
        <GoogleIcon />
        <span>Ingresar con Google</span>
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function traducirError(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "Todavía no confirmaste tu email.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese email ya está registrado. Ingresá en lugar de crear cuenta.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("rate limit"))
    return "Demasiados intentos, esperá un minuto e intentá de nuevo.";
  return msg;
}
