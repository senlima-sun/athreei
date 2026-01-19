"use client"

import { useAdminPermissions } from "./use-admin-permissions"

/**
 * Hook for marketplace-specific admin permissions.
 * Extends base admin permissions with marketplace management capabilities.
 */
export function useMarketplaceAdminPermissions() {
  const basePermissions = useAdminPermissions()
  const { isAdmin, isModerator } = basePermissions

  /**
   * Permission to create, update, and delete marketplaces.
   * Admin only - marketplaces are core infrastructure.
   */
  const canManageMarketplaces = isAdmin

  /**
   * Permission to verify, feature, and manage plugins.
   * Available to admins and moderators for content moderation.
   */
  const canManagePlugins = isAdmin || isModerator

  /**
   * Permission to approve or reject plugin submissions.
   * Available to admins and moderators for content review.
   */
  const canApprovePlugins = isAdmin || isModerator

  /**
   * Permission to trigger marketplace sync operations.
   * Admin only - sync affects external systems.
   */
  const canSyncMarketplaces = isAdmin

  return {
    ...basePermissions,
    canManageMarketplaces,
    canManagePlugins,
    canApprovePlugins,
    canSyncMarketplaces,
  }
}
