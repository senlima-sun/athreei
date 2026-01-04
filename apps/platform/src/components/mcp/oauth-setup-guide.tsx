"use client"

import { Key, ExternalLink } from "lucide-react"
import type { OAuthProvider } from "@/lib/mcp-oauth-detection"

interface OAuthSetupGuideProps {
  provider: OAuthProvider
  envVarName: string
  currentValue: string
  onTokenChange: (value: string) => void
}

export function OAuthSetupGuide({
  provider,
  envVarName,
  currentValue,
  onTokenChange,
}: OAuthSetupGuideProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
          <Key className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">
            {provider.displayName} Authentication Required
          </h4>
          <p className="mt-1 text-sm text-blue-700">
            This MCP server requires a {provider.displayName} access token to
            connect to your account.
          </p>

          {/* Setup instructions */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-blue-900">
              How to get your token:
            </h5>
            <ol className="mt-2 space-y-2">
              {provider.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-2 text-sm text-blue-800">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-800">
                    {index + 1}
                  </span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Token input */}
          <div className="mt-4">
            <label
              htmlFor={`oauth-token-${envVarName}`}
              className="block text-sm font-medium text-blue-900"
            >
              {envVarName}
            </label>
            <input
              type="password"
              id={`oauth-token-${envVarName}`}
              value={currentValue}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="Paste your token here"
              className="mt-1 block w-full rounded-md border border-blue-300 bg-white px-3 py-2 font-mono text-sm placeholder-blue-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Links */}
          <div className="mt-4 flex flex-wrap gap-4">
            <a
              href={provider.authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
            >
              Get token
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
            >
              View docs
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
