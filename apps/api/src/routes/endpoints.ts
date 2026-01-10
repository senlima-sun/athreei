import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware } from "../middleware"
import {
  createEndpointSchema,
  updateEndpointSchema,
} from "../schemas/endpoints"
import {
  listEndpoints,
  getEndpoint,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
} from "../controllers/endpoints"

const endpoints = new Hono()

endpoints.use("*", authMiddleware)

endpoints.get("/", listEndpoints)

endpoints.post("/", zValidator("json", createEndpointSchema), createEndpoint)

endpoints.get("/:id", getEndpoint)

endpoints.patch(
  "/:id",
  zValidator("json", updateEndpointSchema),
  updateEndpoint
)

endpoints.delete("/:id", deleteEndpoint)

export default endpoints
