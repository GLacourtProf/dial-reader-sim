import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

/**
 * En-tête minimaliste partagé par toutes les pages.
 * Le bouton de thème bascule l'app en mode sombre / clair.
 */
export function SiteHeader() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <DialMark />
          <span className="text-sm font-semibold tracking-tight">
            Comparateur · Exerciceur
          </span>
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={
            theme === "dark"
              ? "Passer en mode clair"
              : "Passer en mode sombre"
          }
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}

function DialMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" className="fill-none stroke-foreground" strokeWidth="1.6" />
      <line x1="12" y1="12" x2="16.5" y2="7.5" className="stroke-foreground" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" className="fill-foreground" />
    </svg>
  );
}
