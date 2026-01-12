import {
  VaultSection,
  McpSection,
  SyncSection,
  BackupSection,
  AboutSection,
  AppearanceSection,
} from "@/components/settings"

export function SettingsPage(): React.ReactElement {
  return (
    <div className="space-y-4">
      <AppearanceSection />
      <VaultSection />
      <McpSection />
      <SyncSection />
      <BackupSection />
      <AboutSection />
    </div>
  )
}
