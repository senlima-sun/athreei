import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware } from "../middleware"
import {
  listMarketplacesQuerySchema,
  createMarketplaceSchema,
  updateMarketplaceSchema,
} from "../schemas/marketplaces"
import {
  listMarketplaces,
  getMarketplace,
  createMarketplace,
  updateMarketplace,
  deleteMarketplace,
  syncMarketplaceController,
} from "../controllers/marketplaces"

const marketplaces = new Hono()

marketplaces.get(
  "/",
  zValidator("query", listMarketplacesQuerySchema),
  listMarketplaces
)

marketplaces.get("/:slug", getMarketplace)

marketplaces.use("*", authMiddleware)

marketplaces.post(
  "/",
  zValidator("json", createMarketplaceSchema),
  createMarketplace
)

marketplaces.patch(
  "/:slug",
  zValidator("json", updateMarketplaceSchema),
  updateMarketplace
)

marketplaces.delete("/:slug", deleteMarketplace)

marketplaces.post("/:slug/sync", syncMarketplaceController)

export default marketplaces
