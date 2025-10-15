import z from "zod";
import { ToolType } from "../../types";
import { clickhouseGlobalTryCatch } from "../utils";

const paramsSchema = ({
  query: z.string().describe("The query to run"),
});

const runQueryTool: ToolType<typeof paramsSchema> = {
  name: "clickhouse: run query",
  description: "Run a query on the ClickHouse database and specific table",
  paramsSchemaOrAnnotations: paramsSchema,
  callback: async ({ query }) => {
    return clickhouseGlobalTryCatch(async (client) => {
      const result = await client.query({ query });

      return {
        content: [{
          text: await result.text(),
          type: "text",
        }]
      };
    })
  }
};

export default runQueryTool;
