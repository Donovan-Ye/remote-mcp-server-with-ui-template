import z from "zod";
import { ToolType } from "../../types";
import { createClickhouseClient, clickhouseGlobalTryCatch } from "../utils";

const paramsSchema = {
  table: z.string().describe("The name of the ClickHouse table to get the schema of"),
}

const getSchemeTool: ToolType<typeof paramsSchema> = {
  name: "clickhouse: get scheme",
  description: "Get the schema of a ClickHouse table",
  paramsSchemaOrAnnotations: paramsSchema,
  callback: async ({ table }) => {
    return clickhouseGlobalTryCatch(async (client) => {
      // Query to get the schema of the specified ClickHouse table
      const query = `
        SELECT 
          name AS column_name,
          type AS data_type,
          default_kind,
          default_expression,
          comment
        FROM system.columns
        WHERE database = currentDatabase() AND table = '${table}'
        ORDER BY position
      `;

      const result = await client.query({ query });
      const schema = await result.text();

      return {
        content: [{
          text: schema,
          type: "text",
        }]
      };
    })
  },
};

export default getSchemeTool;
