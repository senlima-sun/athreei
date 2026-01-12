import { Palette } from "lucide-react"
import { useTheme } from "@/contexts/theme-context"
import { Section } from "./section"
import { cn } from "@/lib/utils"

type Theme = "light" | "dark" | "system"

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
]

export function AppearanceSection(): React.ReactElement {
  const { theme, setTheme } = useTheme()

  return (
    <Section icon={Palette} title="Appearance">
      <div className="px-2 py-1.5">
        <p className="mb-2 text-[10px] text-muted-foreground">Theme</p>
        <div className="flex gap-1.5">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex-1 rounded px-2 py-1.5 text-xs transition-colors",
                theme === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}
