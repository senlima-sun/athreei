/**
 * Initialize the default public marketplace and log admin candidates.
 * Run once on first deployment, then manage via admin UI.
 *
 * Usage: bun run apps/api/src/scripts/init-marketplace.ts
 */

import { eq } from "drizzle-orm"
import { db } from "../lib/db-operations"
import { marketplace } from "@athreei/db"
import { generateMarketplaceId } from "../services"

async function initPublicMarketplace(): Promise<void> {
  const existing = await db().query.marketplace.findFirst({
    where: eq(marketplace.isDefault, true),
  })

  if (existing) {
    console.log("Default marketplace already exists:", existing.slug)
    return
  }

  const now = new Date()
  const id = generateMarketplaceId()

  await db().insert(marketplace).values({
    id,
    slug: "athreei-marketplace",
    name: "athreei Marketplace",
    description: "Official athreei plugin marketplace",
    ownerType: "system",
    ownerId: null,
    sourceType: "internal",
    isPublic: true,
    isDefault: true,
    autoUpdate: false,
    createdAt: now,
    updatedAt: now,
  })

  console.log("Created default marketplace: athreei-marketplace")
}

async function logAdminCandidates(): Promise<void> {
  const adminUserIds =
    process.env.ADMIN_USER_IDS?.split(",").filter(Boolean) ?? []

  if (adminUserIds.length === 0) {
    console.log("No ADMIN_USER_IDS configured.")
    console.log(
      "Set ADMIN_USER_IDS env var or use the admin CLI to promote users."
    )
    return
  }

  console.log(`Found ${adminUserIds.length} admin user(s) to process.`)
}

async function main(): Promise<void> {
  console.log("Initializing marketplace...")
  await initPublicMarketplace()
  console.log("\nChecking admin configuration...")
  await logAdminCandidates()
  console.log("\nDone!")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err)
    process.exit(1)
  })
