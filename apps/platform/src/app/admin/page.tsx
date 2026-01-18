export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <p className="text-muted-foreground">
        Welcome to the admin panel. Select a section from the sidebar to manage.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stats cards will be added by features that need them */}
      </div>
    </div>
  )
}
