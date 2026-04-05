import { useState, useCallback } from "react";

interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [pending, setPending] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string, action: () => void) => {
    setPending({ message, onConfirm: action });
  }, []);

  const handleConfirm = useCallback(() => {
    pending?.onConfirm();
    setPending(null);
  }, [pending]);

  const handleCancel = useCallback(() => {
    setPending(null);
  }, []);

  return { pending, confirm, handleConfirm, handleCancel };
}
