import axios from "axios";

export const TOKEN_KEY = "waqas_token";
const base = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: base + "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // token expire ho gaya to login par bhej do
    if (
      err.response?.status === 401 &&
      !err.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const errMsg = (err) =>
  err.response?.data?.message || err.message || "Something went wrong";

export default api;
