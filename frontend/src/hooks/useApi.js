import { useCallback } from "react";
import { API } from "../constants";

export function useApi() {
  return useCallback(async (path, opts = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);
}
