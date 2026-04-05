import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import clsx from "clsx";

interface CustomSelectProps {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function CustomSelect({
  value,
  options,
  onSelect,
  onClose,
}: CustomSelectProps) {
  return (
    <Listbox
      value={value}
      onChange={(v) => {
        onSelect(v);
        onClose();
      }}
    >
      <ListboxButton className="sr-only" />
      <ListboxOptions
        static
        anchor="bottom start"
        className="z-[10000] mt-1 min-w-[100px] rounded-lg bg-white shadow-lg border border-gray-200 py-1 overflow-y-auto max-h-56 focus:outline-none"
      >
        {options.map((opt) => (
          <ListboxOption
            key={opt}
            value={opt}
            className={({ focus, selected }) =>
              clsx(
                "px-3 py-1.5 text-xs cursor-pointer flex items-center gap-2 transition-colors",
                focus && "bg-primary-50",
                selected ? "font-bold text-primary-700" : "text-gray-700",
              )
            }
          >
            {({ selected }) => (
              <>
                <span
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    selected ? "bg-primary-500" : "bg-transparent",
                  )}
                />
                {opt}
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
