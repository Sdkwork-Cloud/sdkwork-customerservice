import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { buildCustomerServiceViteDevProxy } from "../sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/dev/viteDevProxy";

const commonRoot = path.resolve(__dirname, "../sdkwork-customerservice-common/packages");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    define: {
      "process.env.SDKWORK_ACCESS_TOKEN": JSON.stringify(env.SDKWORK_ACCESS_TOKEN ?? ""),
    },
    plugins: [react()],
    resolve: {
      alias: {
      },
    },
    server: {
      port: 5192,
      host: "127.0.0.1",
      proxy: buildCustomerServiceViteDevProxy(env),
    },
  };
});
