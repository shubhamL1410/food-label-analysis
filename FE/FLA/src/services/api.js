import { API_URL } from "../config";

const normalizePath = (path) => (path.startsWith("/") ? path : `/${path}`);

const getBaseUrl = () => {
  if (import.meta.env.DEV) {
    return "";
  }

  return (API_URL || "").replace(/\/$/, "");
};

export const buildApiUrl = (path) => `${getBaseUrl()}${normalizePath(path)}`;

export const apiFetch = (path, options) => fetch(buildApiUrl(path), options);
