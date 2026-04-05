import { createContext, useContext, type ReactNode } from "react";
import { useConfirm } from "./useConfirm";
import { ConfirmPopup } from "../components/ui";

type ConfirmFn = (message: string, action: () => void) => void;

const Ctx = createContext<ConfirmFn>(() => {});

export const useConfirmAction = () => useContext(Ctx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { pending, confirm, handleConfirm, handleCancel } = useConfirm();

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {pending && (
        <ConfirmPopup
          message={pending.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </Ctx.Provider>
  );
}
