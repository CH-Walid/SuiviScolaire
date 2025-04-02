import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      className="h-9 w-9 rounded-full"
      title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
    >
      <Sun className={`h-4 w-4 rotate-0 scale-100 transition-all ${theme === 'dark' ? 'opacity-0' : 'opacity-100'}`} />
      <Moon className={`absolute h-4 w-4 rotate-90 scale-0 transition-all ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'opacity-0'}`} />
      <span className="sr-only">
        {theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
      </span>
    </Button>
  );
}