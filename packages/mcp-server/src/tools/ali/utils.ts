import { createRequire } from 'module';
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const requireCJS = createRequire(import.meta.url);

// Dynamically import Ali Cloud SDK
const getSls = async () => {
  const Sls = requireCJS('@alicloud/sls20201230');
  const $OpenApi = requireCJS('@alicloud/openapi-client');
  return { Sls, $OpenApi };
};

export const createAliClient = async (): Promise<any> => {
  try {
    const { Sls, $OpenApi } = await getSls();
    const config = new $OpenApi.Config({});

    config.accessKeyId = process.env.ALI_AK;
    config.accessKeySecret = process.env.ALI_SK;
    config.regionId = 'cn-hangzhou';

    return new Sls.default(config);
  } catch (error) {
    throw new Error(`Failed to create ali client: ${error}`)
  }
};

export const aliGlobalTryCatch = async (fn: (client: any) => CallToolResult | Promise<CallToolResult>): Promise<CallToolResult> => {
  try {
    const client = await createAliClient();
    return await fn(client);
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error with Ali Cloud SLS: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}
