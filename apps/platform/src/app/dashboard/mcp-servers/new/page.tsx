"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpServerForm, McpServerFormData } from "@/components/mcp";

export default function NewMcpServerPage() {
  const router = useRouter();

  const handleSubmit = async (data: McpServerFormData) => {
    // In a real implementation, this would call an API to create the server
    console.log("Creating MCP server:", data);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Redirect to the servers list
    router.push("/dashboard/mcp-servers");
  };

  return (
    <div>
      <PageHeader
        title="Create MCP Server"
        description="Add a new MCP server configuration"
      />

      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <McpServerForm
            onSubmit={handleSubmit}
            cancelHref="/dashboard/mcp-servers"
            submitLabel="Create MCP Server"
          />
        </div>
      </div>
    </div>
  );
}
