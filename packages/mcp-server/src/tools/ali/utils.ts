import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MockAliClient } from "./mockData";

/**
 * Create a mock Ali Cloud client
 * This replaces the real Ali Cloud SDK with mock implementation
 */
export const createAliClient = async (): Promise<MockAliClient> => {
  try {
    // Return mock client instead of real Ali Cloud client
    return new MockAliClient();
  } catch (error) {
    throw new Error(`Failed to create mock ali client: ${error}`)
  }
};

/**
 * Global try-catch wrapper for Ali Cloud operations
 * Now uses mock client instead of real API calls
 */
export const aliGlobalTryCatch = async (fn: (client: MockAliClient) => CallToolResult | Promise<CallToolResult>): Promise<CallToolResult> => {
  try {
    const client = await createAliClient();
    return await fn(client);
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error with Mock Ali Cloud SLS: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}
