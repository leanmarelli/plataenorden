"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Modal from "./modal";

type Opts = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

interface Ctx {
  confirm: (opts: Opts) => Promise<boolean>;
}

const ConfirmCtx = createContext<Ctx | null>(null);

type Resolver = (v: boolean) => void;

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ opts: Opts; resolve: Resolver } | null>(
    null,
  );

  const confirm = useCallback((opts: Opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.opts.title ?? "¿Confirmás?"}
      >
        <div className="flex flex-col gap-4">
          {state?.opts.description && (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
              {state.opts.description}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              className="btn"
              onClick={() => close(false)}
              type="button"
            >
              {state?.opts.cancelText ?? "Cancelar"}
            </button>
            <button
              className={"btn " + (state?.opts.danger ? "" : "btn-primary")}
              style={
                state?.opts.danger
                  ? {
                      background: "var(--neg)",
                      color: "white",
                      borderColor: "var(--neg)",
                    }
                  : undefined
              }
              onClick={() => close(true)}
              type="button"
              autoFocus
            >
              {state?.opts.confirmText ?? "Confirmar"}
            </button>
          </div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm fuera de ConfirmProvider");
  return ctx.confirm;
}
