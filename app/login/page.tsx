import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-svh grid place-items-center p-6">
      <div
        className="card p-6 sm:p-8 w-full max-w-md"
        style={{ borderRadius: 16 }}
      >
        <div className="mb-6 text-center">
          <div
            className="font-serif text-3xl font-bold tracking-tight"
            style={{ color: "var(--ink)" }}
          >
            Plata en Orden
            <span style={{ color: "var(--accent)" }}>.</span>
          </div>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--ink-faint)" }}
          >
            finanzas personales — ARS · USD
          </p>
        </div>
        <Suspense fallback={<div className="text-center">Cargando…</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
