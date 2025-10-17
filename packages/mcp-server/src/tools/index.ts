import { aliTools } from "./ali";
import userInfoTool from "./userInfo";

const toolsList = [...aliTools, userInfoTool].map(tool => ({
  ...tool,
  callback: async (params: any, extra: any) => {
    // Call the original callback with both parameters
    const result = await tool.callback(params, extra);
    const tokenLimit = process.env.MAX_TOKEN_SINGLE_CALL ? parseInt(process.env.MAX_TOKEN_SINGLE_CALL, 10) : null;

    if (result.content.length && tokenLimit && tokenLimit > 0) {
      result.content.map(item => {
        if (item.type === "text") {
          if (item.text.length > tokenLimit) {
            item.text = "[To save tokens, only the first " + tokenLimit + " characters are shown] \n\n" + item.text.slice(0, tokenLimit);
          }
        }
        return item;
      });
    }

    return result;
  }
}));

export default toolsList;
