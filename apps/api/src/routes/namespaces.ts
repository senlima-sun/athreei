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
  createHookSchema,
  updateHookSchema,
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
  createHook,
  listHooks,
  getHook,
  updateHook,
  deleteHook,
  toggleHook,
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

namespaces.post("/:id/hooks", zValidator("json", createHookSchema), createHook)

namespaces.get("/:id/hooks", listHooks)

namespaces.get("/:id/hooks/:hookId", getHook)

namespaces.patch(
  "/:id/hooks/:hookId",
  zValidator("json", updateHookSchema),
  updateHook
)

namespaces.delete("/:id/hooks/:hookId", deleteHook)

namespaces.post("/:id/hooks/:hookId/toggle", toggleHook)

export default namespaces
