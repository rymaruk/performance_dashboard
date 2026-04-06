import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "size-[38px] shrink-0 rounded-full border-2 border-border bg-muted/40",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "relative size-[38px] shrink-0 rounded-full border-2 border-border",
        className,
      )}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className="size-[1.125rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
        aria-hidden
      />
      <Moon
        className="absolute size-[1.125rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        aria-hidden
      />
    </Button>
  );
}
