import { ToolType } from "../types";

const userInfoTool: ToolType = {
  name: "userInfo",
  description: "A tool to say hello to the user",
  paramsSchemaOrAnnotations: {},
  callback: async (props) => {
    return {
      content: [{ text: "Hello!", type: "text" }],
    };
  },
};

export default userInfoTool;
