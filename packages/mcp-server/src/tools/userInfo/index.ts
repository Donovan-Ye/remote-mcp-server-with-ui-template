import { getUserInfo } from "../../apis/sso/api";
import { ToolType } from "../types";

const userInfoTool: ToolType = {
  name: "userInfo",
  description: "Get user info from SSO",
  paramsSchemaOrAnnotations: {},
  callback: async (props) => {
    // const userInfo = await getUserInfo(props.accessToken);
    return {
      content: [{ text: "userInfo", type: "text" }],
    };
  },
};

export default userInfoTool;
