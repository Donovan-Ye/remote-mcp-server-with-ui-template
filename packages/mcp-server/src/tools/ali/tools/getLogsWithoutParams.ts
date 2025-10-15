import { ToolType } from "../../types";
import { aliGlobalTryCatch } from "../utils";
import { createUIResource } from '@mcp-ui/server';
import { uiServerUrl } from '../../..';

const getLogsTool: ToolType = {
  name: "ali: get logs (no params)",
  description: "Get logs from Ali Cloud SLS without parameters. Returns a form to select project, logstore, and other parameters.",
  paramsSchemaOrAnnotations: {},
  callback: async () => {
    return aliGlobalTryCatch(async (client) => {
      const ui = createUIResource({
        uri: "ui://ali/getLogsWithoutParams",
        content: {
          type: "externalUrl",
          iframeUrl: `${uiServerUrl.toString()}/get-ali-logs`,
        },
        encoding: "text",
      });

      return {
        content: [ui],
      };
    });
  },
};

export default getLogsTool;
