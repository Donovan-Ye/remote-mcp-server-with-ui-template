// import userInfoTool from "./userInfo";
import { clickhouseTools } from "./clickhouse";
import { aliTools } from "./ali";


const toolsList = [...clickhouseTools, ...aliTools].map(tool => ({
  ...tool,
  callback: async (params: any, extra: any) => {
    // Call the original callback with both parameters
    const result = await tool.callback(params, extra);
    const tokenLimit = process.env.MAX_TOKEN_SINGLE_CALL ? parseInt(process.env.MAX_TOKEN_SINGLE_CALL, 10) : null;

    if (result.content.length && tokenLimit && tokenLimit > 0) {
      result.content.map(item => {
        if (item.type === "text") {
          if (item.text.length > tokenLimit) {
            item.text = "[为了节约token， 仅截取了前" + tokenLimit + "个字符] \n\n" + item.text.slice(0, tokenLimit);
          }
        }
        return item;
      });
    }

    return result;
  }
}));

export default toolsList;
