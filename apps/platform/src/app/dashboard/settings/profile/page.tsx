import { redirect } from "next/navigation"

// Redirect to main settings page (which defaults to profile tab)
export default function ProfilePage() {
  redirect("/dashboard/settings")
}
