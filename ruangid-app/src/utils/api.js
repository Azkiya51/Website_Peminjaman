// src/utils/api.js
export const API_BASE = "http://localhost:5000/api";
export const ADMIN_PASSWORD = "Zeckganteng";
export const ROOMS = ["4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9", "4.10"];
export const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 
        "Content-Type": "application/json", 
        ...options.headers 
      },
      ...options,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("API error:", err);
    return null;
  }
}