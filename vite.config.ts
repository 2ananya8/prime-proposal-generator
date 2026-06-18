import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const fromFile = env[key];
      if (typeof fromFile === "string" && fromFile.length > 0) return fromFile;
      const fromProcess = process.env[key];
      if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;
    }
    return "";
  };
  const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");
  const supabaseUrl = pick("VITE_SUPABASE_URL", "SUPABASE_URL");
  const supabaseAnonKey = pick("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
  const githubPages = pick("GITHUB_PAGES");

  return {
    base: githubPages === "true" ? "/prime-proposal-generator/" : "/",
    plugins: [
      tsconfigPaths(),
      tailwindcss(),
      await tanstackStart({
        spa: {
          enabled: true,
          prerender: {
            outputPath: "/index.html",
          },
        },
      }),
      react(),
    ],
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseAnonKey),
    },
    server: {
      port: 3000,
      host: true,
    },
  };
});
