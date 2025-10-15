import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ZodRawShape } from "zod";

export type ToolType<Args extends ZodRawShape = {}> = {
  name: string;
  description: string;
  paramsSchemaOrAnnotations: Args | ToolAnnotations;
  callback: ToolCallback<Args>;
};
