/**
 * Permissions repository
 *
 * Default instance using the main database.
 */

import { db } from "../db-instance"
import { createPermissionsRepository } from "./permissions-factory"

// Create default repository instance
const permissionsRepository = createPermissionsRepository(db)

// Export individual functions for backwards compatibility
export const findPermissionByOriginAndTool = permissionsRepository.findByOriginAndTool.bind(permissionsRepository)
export const findPermissionsByOrigin = permissionsRepository.findByOrigin.bind(permissionsRepository)
export const upsertPermission = permissionsRepository.upsert.bind(permissionsRepository)
export const deletePermission = permissionsRepository.delete.bind(permissionsRepository)
export const listPermissions = permissionsRepository.list.bind(permissionsRepository)
export const countPermissions = permissionsRepository.count.bind(permissionsRepository)
export const deletePermissionsByOrigin = permissionsRepository.deleteByOrigin.bind(permissionsRepository)

// Also export the factory for testing
export { createPermissionsRepository } from "./permissions-factory"
