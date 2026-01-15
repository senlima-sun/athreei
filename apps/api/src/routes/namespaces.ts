import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware, withOrgFromQuery } from "../middleware"
import {
  createNamespaceSchema,
  updateNamespaceSchema,
  addServerSchema,
  updateServerMappingSchema,
  addSkillSchema,
  updateSkillMappingSchema,
  addRuleSchema,
  updateRuleMappingSchema,
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
  addSkill,
  removeSkill,
  listSkills,
  updateSkillMapping,
  addRule,
  removeRule,
  listRules,
  updateRuleMapping,
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

namespaces.post("/:id/skills", zValidator("json", addSkillSchema), addSkill)

namespaces.delete("/:id/skills/:skillId", removeSkill)

namespaces.get("/:id/skills", listSkills)

namespaces.patch(
  "/:id/skills/:skillId",
  zValidator("json", updateSkillMappingSchema),
  updateSkillMapping
)

namespaces.post("/:id/rules", zValidator("json", addRuleSchema), addRule)

namespaces.delete("/:id/rules/:ruleId", removeRule)

namespaces.get("/:id/rules", listRules)

namespaces.patch(
  "/:id/rules/:ruleId",
  zValidator("json", updateRuleMappingSchema),
  updateRuleMapping
)

export default namespaces
