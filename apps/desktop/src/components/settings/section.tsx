interface SectionProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}

export function Section({
  icon: Icon,
  title,
  badge,
  children,
}: SectionProps): React.ReactElement {
  return (
    <section className="rounded-md bg-card">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <h3 className="text-xs font-medium">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="space-y-0.5 px-3 pb-2">{children}</div>
    </section>
  )
}
