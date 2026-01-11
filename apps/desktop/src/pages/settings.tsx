import {
  VaultSection,
  McpSection,
  SyncSection,
  BackupSection,
  AboutSection,
} from "@/components/settings"

export function SettingsPage(): React.ReactElement {
  return (
    <div className="space-y-4">
      <VaultSection />
      <McpSection />
      <SyncSection />
      <BackupSection />
      <AboutSection />
    </div>
  )
}
