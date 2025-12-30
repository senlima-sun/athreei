"use client";

import { useState } from "react";
import { organization } from "@/lib/auth-client";
import { Building2, Loader2 } from "lucide-react";

interface CreateOrgStepProps {
  onComplete: (orgId: string, orgName: string) => void;
}

/**
 * CreateOrgStep - First step of onboarding: create an organization.
 */
export function CreateOrgStep({ onComplete }: CreateOrgStepProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug if user hasn't manually edited it
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const slugValue =
        slug.trim() ||
        name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

      const result = await organization.create({
        name: name.trim(),
        slug: slugValue,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create organization");
        return;
      }

      // Set as active organization
      if (result.data?.id) {
        await organization.setActive({ organizationId: result.data.id });
        onComplete(result.data.id, name.trim());
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Create your organization
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Set up a workspace for your team
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
            <Building2 className="h-10 w-10 text-gray-400" />
          </div>
        </div>

        {/* Name field */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Organization name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Inc"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {/* Slug field */}
        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-medium text-gray-700"
          >
            URL slug
          </label>
          <div className="mt-1 flex rounded-md">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              athreei.com/
            </span>
            <input
              type="text"
              id="slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="acme"
              className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            This will be used in URLs and cannot be changed later.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue
        </button>
      </form>
    </div>
  );
}
