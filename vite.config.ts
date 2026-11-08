import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "fs";
import { redactProjectsForBundle } from "./lib/project-redaction.js";
import { getAdminPassword, issueAdminToken } from "./lib/admin-auth.js";

const projectsSeedPath = path.resolve(import.meta.dirname, "src", "data", "projects.json");

function samePath(a: string, b: string): boolean {
  return path.normalize(a).toLowerCase() === path.normalize(b).toLowerCase();
}

/**
 * Keeps case study bodies out of the public JS bundle so password protection
 * can't be bypassed by reading the bundle. Production builds keep only card
 * fields and fetch bodies from /api/content; dev keeps public bodies so
 * `vite` works without the API.
 */
function caseStudySeedRedaction(): Plugin {
  let deferAll = false;
  return {
    name: "case-study-seed-redaction",
    enforce: "pre",
    configResolved(config) {
      deferAll = config.command === "build";
      if (config.command === "serve") {
        const env = loadEnv(config.mode, config.root, "");
        for (const [k, v] of Object.entries(env)) {
          if (process.env[k] === undefined) process.env[k] = v;
        }
      }
    },
    configureServer(server) {
      server.middlewares.use("/api/admin/login", (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => {
          body += String(chunk);
        });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body || "{}") as { password?: string };
            if (parsed.password && parsed.password === getAdminPassword()) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ token: issueAdminToken() }));
              return;
            }
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Incorrect password" }));
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Bad request" }));
          }
        });
      });
    },
    load(id) {
      if (!samePath(id.split("?")[0]!, projectsSeedPath)) return null;
      const projects = JSON.parse(readFileSync(projectsSeedPath, "utf8")) as unknown;
      return JSON.stringify(redactProjectsForBundle(projects, deferAll));
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [caseStudySeedRedaction(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "src", "assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    reportCompressedSize: false,
    rollupOptions: {
      external: ["pg", "cloudinary", "resend", "formidable"],
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-icons": ["lucide-react"],
          "vendor-wouter": ["wouter"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "localhost",
    watch: {
      // Prevent data-file writes from triggering a full server restart
      ignored: [
        "**/.tmp-live-content.json",
        "**/exports/**",
        "**/case-study-drafts/**",
        "**/tmp-mockup-preview/**",
        "**/docs/**",
        "**/dist/**",
      ],
    },
  },
  preview: {
    port: 4173,
    host: "localhost",
  },
});
