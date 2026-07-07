import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export const aiApi = axios.create({
  baseURL: import.meta.env.VITE_FASTAPI_URL || "http://localhost:8000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wealthnest_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setSession(token, user) {
  localStorage.setItem("wealthnest_token", token);
  localStorage.setItem("wealthnest_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("wealthnest_token");
  localStorage.removeItem("wealthnest_user");
  localStorage.removeItem("wealthnest_family");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("wealthnest_user"));
  } catch {
    return null;
  }
}

export const rupee = (value = 0) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const pct = (value = 0) => `${Number(value || 0).toFixed(2)}%`;
