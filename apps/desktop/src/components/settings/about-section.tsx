import { Section } from "./section"

export function AboutSection(): React.ReactElement {
  return (
    <Section title="About">
      <div className="flex items-center justify-between px-2 py-1 text-xs">
        <span className="text-muted-foreground">Version</span>
        <span>0.1.0</span>
      </div>
      <div className="flex items-center justify-between px-2 py-1 text-xs">
        <span className="text-muted-foreground">Build</span>
        <span>Development</span>
      </div>
    </Section>
  )
}
