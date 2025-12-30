"use client";

import { PageHeader } from "@/components/dashboard/page-header";
import { useSession } from "@/lib/auth-client";
import { Server, Activity, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-gray-200">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  const userName = session?.user?.name || "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Here's an overview of your athreei workspace"
      />

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            title="View MCPs"
            description="Manage your Model Context Protocol servers"
            href="/dashboard/mcps"
            icon={Server}
          />
          <QuickAction
            title="View Traces"
            description="Monitor activity and debug requests"
            href="/dashboard/traces"
            icon={Activity}
          />
          <QuickAction
            title="Manage Team"
            description="Invite members and manage permissions"
            href="/dashboard/organizations"
            icon={Users}
          />
        </div>
      </section>

      {/* Stats - shows empty state until data is available */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active MCPs" value={null} />
          <StatCard label="Total Requests" value={null} />
          <StatCard label="Team Members" value={null} />
          <StatCard label="Organizations" value={null} />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Statistics will appear here once you start using athreei.
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      {value === null ? (
        <p className="mt-1 text-lg text-gray-400">—</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      )}
    </div>
  );
}
