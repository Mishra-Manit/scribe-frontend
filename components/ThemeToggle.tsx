"use client";

import { useTheme, useSetTheme, useThemeHasHydrated, type Theme } from "@/stores/theme-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const theme = useTheme();
  const setTheme = useSetTheme();
  const hasHydrated = useThemeHasHydrated();

  // Show a placeholder during SSR to prevent hydration mismatch
  if (!hasHydrated) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 border-border/50 bg-background/50 backdrop-blur-sm"
        disabled
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  const currentIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="h-4 w-4" />;
      case "light":
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {currentIcon()}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`flex items-center gap-2 cursor-pointer ${
              theme === option.value ? "bg-accent" : ""
            }`}
          >
            {option.icon}
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
