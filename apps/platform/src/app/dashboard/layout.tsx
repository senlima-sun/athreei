import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

// TODO: Implement server-side session check when auth server is available
// For now, this is a client-side protected layout
// import { auth } from "@athreei/auth/server";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check would go here:
  // const session = await auth.api.getSession({
  //   headers: await headers(),
  // });
  // if (!session) {
  //   redirect("/login");
  // }

  return <DashboardLayout>{children}</DashboardLayout>;
}
