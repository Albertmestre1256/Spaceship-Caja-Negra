import { readdirSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, loadEnv } from "vite"

/** NVIDIA NIM does not answer browsers directly, so the dev server forwards `/nim/*` and adds the key from `.env`, which never reaches the page. */
const NIM_TARGET = "https://integrate.api.nvidia.com"

export default defineConfig(({ mode }) => {
  const { NVIDIA_API_KEY } = loadEnv(mode, import.meta.dirname, "NVIDIA_")
  return {
    base: "/spaceship/",
    server: {
      proxy: {
        "/nim": {
          target: NIM_TARGET,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/nim/, "/v1"),
          headers: NVIDIA_API_KEY ? { Authorization: `Bearer ${NVIDIA_API_KEY}` } : {},
        },
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(import.meta.dirname, "index.html"),
          ...Object.fromEntries(
            readdirSync(resolve(import.meta.dirname, "extra"))
              .filter((file) => file.endsWith(".html"))
              .map((file) => [`extra/${file.slice(0, -".html".length)}`, resolve(import.meta.dirname, "extra", file)]),
          ),
        },
      },
    },
  }
})
