interface SettingRowProps {
  label: string
  description: string
  action: React.ReactNode
}

export function SettingRow({
  label,
  description,
  action,
}: SettingRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between rounded bg-muted/50 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="ml-2 shrink-0">{action}</div>
    </div>
  )
}
