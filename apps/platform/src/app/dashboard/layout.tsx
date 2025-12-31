import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { getServerSession } from "@/lib/auth-server";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, session } = await getServerSession();

  if (!user || !session) {
    redirect("/login");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
