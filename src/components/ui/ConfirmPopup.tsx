import { useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogBackdrop,
} from "@headlessui/react";

interface ConfirmPopupProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmPopup({ message, onConfirm, onCancel }: ConfirmPopupProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onConfirm]);

  return (
    <Dialog open onClose={onCancel} className="relative z-[20000]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/35 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl text-center transition-all data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150"
        >
          <DialogTitle className="sr-only">Підтвердження</DialogTitle>
          <p className="text-sm text-gray-800 leading-relaxed mb-5">
            {message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="px-5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              onClick={onConfirm}
              autoFocus
              className="px-5 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
            >
              Видалити
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
