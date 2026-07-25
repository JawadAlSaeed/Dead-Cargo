import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only: lets the running game save a snapshot of its WebGL canvas to disk.
 *
 * The game renders fine even when the browser window isn't compositing frames,
 * so the canvas holds a real image that an external screenshot tool can't see.
 * `window.__shot()` (see main.tsx) POSTs that image here and it lands in
 * .screenshots/, which is gitignored. Never registered in a production build.
 */
function screenshotEndpoint(): Plugin {
  return {
    name: "dead-cargo-screenshot",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__shot", (req, res) => {
        if (req.method !== "POST") return res.end("POST only");
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const [, name = "shot", data = ""] = body.match(/^([\w.-]+)\n([\s\S]*)$/) ?? [];
          const dir = resolve(process.cwd(), ".screenshots");
          mkdirSync(dir, { recursive: true });
          const file = resolve(dir, name.endsWith(".jpg") ? name : `${name}.jpg`);
          writeFileSync(file, Buffer.from(data, "base64"));
          res.end(file);
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), screenshotEndpoint()],
  server: {
    port: 5173
  },
  assetsInclude: ["**/*.gltf", "**/*.mp3"]
});
