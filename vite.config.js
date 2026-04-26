import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/DAVITECH/",
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4173",
    },
  },
  preview: {
    allowedHosts: [".onrender.com"],
  },
});
