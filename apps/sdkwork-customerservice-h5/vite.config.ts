import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

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
        "@sdkwork/customerservice-h5-core": path.resolve(
          __dirname,
          "packages/sdkwork-customerservice-h5-core/src/index.ts",
        ),
        "@sdkwork/customerservice-h5-shell": path.resolve(
          __dirname,
          "packages/sdkwork-customerservice-h5-shell/src/index.tsx",
        ),
        "@sdkwork/customerservice-contracts": path.resolve(
          __dirname,
          "../../packages/common/customerservice/sdkwork-customerservice-contracts/src/index.ts",
        ),
        "@sdkwork/customerservice-service": path.resolve(
          __dirname,
          "../../packages/common/customerservice/sdkwork-customerservice-service/src/index.ts",
        ),
        "@sdkwork/customerservice-client-core": path.resolve(
          __dirname,
          "../../packages/common/customerservice/sdkwork-customerservice-client-core/src/index.ts",
        ),
        "@sdkwork/sdk-common": path.resolve(
          __dirname,
          "../../../sdkwork-sdk-commons/sdkwork-sdk-common-typescript/src/index.ts",
        ),
        "sdkwork-customerservice-app-sdk-generated-typescript": path.resolve(
          __dirname,
          "../../sdks/sdkwork-customerservice-app-sdk/sdkwork-customerservice-app-sdk-typescript/generated/server-openapi/src/index.ts",
        ),
      },
    },
  };
});
