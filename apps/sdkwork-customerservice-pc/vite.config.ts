import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    define: {
      "process.env.SDKWORK_ACCESS_TOKEN": JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ""),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@sdkwork/utils": path.resolve(
          __dirname,
          "../../../sdkwork-utils/packages/sdkwork-utils-typescript/src/index.ts",
        ),
      },
    },
    server: {
      port: 5191,
      host: "127.0.0.1",
    },
  };
});
