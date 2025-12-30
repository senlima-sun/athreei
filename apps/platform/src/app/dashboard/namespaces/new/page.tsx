"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { NamespaceForm } from "@/components/namespaces";

export default function NewNamespacePage() {
  const router = useRouter();

  const handleSubmit = async (data: { name: string; description?: string }) => {
    // TODO: Replace with actual API call
    console.log("Creating namespace:", data);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to namespaces list on success
    router.push("/dashboard/namespaces");
  };

  return (
    <div>
      <PageHeader
        title="Create namespace"
        description="Set up a new namespace to organize your MCP servers"
      />

      <NamespaceForm onSubmit={handleSubmit} submitLabel="Create namespace" />
    </div>
  );
}
