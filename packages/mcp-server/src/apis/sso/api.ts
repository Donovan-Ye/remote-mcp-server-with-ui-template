import request from "../request";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

const getUserInfo = async (accessToken: string) => {
  return await request<UserInfo>({
    method: "GET",
    url: "/login/get_user_inf",
    headers: {
      "Authorization": `Bearer ${accessToken}`
    }
  })
}

export { getUserInfo };
