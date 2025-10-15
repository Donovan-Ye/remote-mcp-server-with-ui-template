import { createClient } from "@clickhouse/client-web";
import { WebClickHouseClient } from "@clickhouse/client-web/dist/client";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const createClickhouseClient = (): WebClickHouseClient => {
  try {
    const client = createClient({
      url: `${process.env.CLICKHOUSE_HOST}:${process.env.CLICKHOUSE_PORT}`,
      username: process.env.CLICKHOUSE_USER,
      password: process.env.CLICKHOUSE_PASSWORD,
      database: process.env.CLICKHOUSE_DATABASE,
      clickhouse_settings: {
        readonly: '1'
      }
    })

    return client
  } catch (error) {
    throw new Error(`Failed to create Clickhouse client: ${error}`)
  }
};

export const clickhouseGlobalTryCatch = async (fn: (client: WebClickHouseClient) => CallToolResult | Promise<CallToolResult>): Promise<CallToolResult> => {
  const client = createClickhouseClient()

  try {
    return fn(client)
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error listing ClickHouse tables: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  } finally {
    await client.close();
  }
}
