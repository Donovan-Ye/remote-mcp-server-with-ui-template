import axios, { AxiosRequestConfig } from "axios";

const instance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

function request<T = any>(
  params: AxiosRequestConfig,
): Promise<T> {
  instance.defaults.baseURL = process.env.UPSTREAM_OAUTH_BASE_URL;

  return instance.request<{ data: T }>(params).then(res => res.data.data);
}

export default request;
