import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware, withOrgFromQuery } from "../middleware"
import {
  createNamespaceSchema,
  updateNamespaceSchema,
  addServerSchema,
  updateServerMappingSchema,
} from "../schemas/namespaces"
import {
  listNamespaces,
  getNamespace,
  createNamespace,
  updateNamespace,
  deleteNamespace,
  addServer,
  removeServer,
  listServers,
  updateServerMapping,
} from "../controllers/namespaces"

const namespaces = new Hono()

namespaces.use("*", authMiddleware)

namespaces.get("/", withOrgFromQuery, listNamespaces)

namespaces.post(
  "/",
  withOrgFromQuery,
  zValidator("json", createNamespaceSchema),
  createNamespace
)

namespaces.get("/:id", getNamespace)

namespaces.patch(
  "/:id",
  zValidator("json", updateNamespaceSchema),
  updateNamespace
)

namespaces.delete("/:id", deleteNamespace)

namespaces.post("/:id/servers", zValidator("json", addServerSchema), addServer)

namespaces.delete("/:id/servers/:serverId", removeServer)

namespaces.get("/:id/servers", listServers)

namespaces.patch(
  "/:id/servers/:serverId",
  zValidator("json", updateServerMappingSchema),
  updateServerMapping
)

export default namespaces
