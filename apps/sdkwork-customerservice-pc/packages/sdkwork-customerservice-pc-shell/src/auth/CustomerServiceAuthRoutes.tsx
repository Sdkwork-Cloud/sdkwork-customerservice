import { SdkworkIamAuthRoutes } from "@sdkwork/auth-pc-react";
import {
  getCustomerServiceIamRuntime,
  resolveCustomerServicePcAuthAppearance,
  resolveCustomerServiceAuthRuntimeConfig,
} from "@sdkwork/customerservice-pc-core";

export function CustomerServiceAuthRoutes() {
  return (
    <SdkworkIamAuthRoutes
      appearance={resolveCustomerServicePcAuthAppearance()}
      basePath="/auth"
      getRuntime={getCustomerServiceIamRuntime}
      homePath="/"
      runtimeConfig={resolveCustomerServiceAuthRuntimeConfig()}
      viewportMode="flow"
    />
  );
}
