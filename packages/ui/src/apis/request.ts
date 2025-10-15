import axios, { AxiosRequestConfig } from "axios";

// Extract token from URL query parameter
const getTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
};

const instance = axios.create({
  baseURL: '/api',
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include token in Authorization header if available
instance.interceptors.request.use((config) => {
  const token = getTokenFromUrl();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function request<T = any>(
  params: AxiosRequestConfig,
): Promise<T> {
  return instance.request<T>(params).then(res => res.data);
}

export default request;
