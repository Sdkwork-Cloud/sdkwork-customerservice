import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { buildCustomerServiceViteDevProxy } from "../sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/dev/viteDevProxy";

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
        "@sdkwork/customerservice-client-core": path.resolve(
          __dirname,
          "../sdkwork-customerservice-common/packages/sdkwork-customerservice-client-core/src/index.ts",
        ),
      },
    },
    server: {
      port: 5191,
      host: "127.0.0.1",
      proxy: buildCustomerServiceViteDevProxy(env),
    },
  };
});
