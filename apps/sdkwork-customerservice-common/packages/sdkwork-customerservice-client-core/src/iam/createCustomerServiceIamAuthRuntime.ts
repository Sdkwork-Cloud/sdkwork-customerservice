import type {
  SdkworkAuthAppearanceConfig,
  SdkworkAuthRuntimeConfig,
  SdkworkIamRuntimeAuthRuntimeLike,
} from "@sdkwork/auth-pc-react";
import {
  createSdkworkAppbasePcAuthRuntime,
  type SdkworkAppbasePcAuthRuntimeComposition,
  type SdkworkAppbasePcAuthRuntimeSdkClient,
} from "@sdkwork/auth-runtime-pc-react";
import { wrapCredentialEntryClient } from "@sdkwork/iam-credential-entry";
import type { AuthTokenManager } from "@sdkwork/sdk-common";
import type { SdkworkAppClient } from "@sdkwork/iam-app-sdk";

import { readSdkBaseUrlEnvValue, resolveIamAppApiBaseUrl } from "../config/sdkBaseUrls";
import {
  clearCustomerServiceIamSession,
  commitCustomerServiceIamSession,
  loadCustomerServiceIamSession,
  type CustomerServiceIamSession,
} from "./customerServiceIamSession";

export interface CreateCustomerServiceIamAuthRuntimeOptions {
  appId?: string;
  platform: "pc" | "h5";
  sessionStorageKey: string;
  tokenManager: AuthTokenManager;
  getAppbaseAppSdkClient: () => SdkworkAppClient;
  resetAppbaseAppSdkClient: () => void;
  getAuthenticatedSdkClients: () => readonly SdkworkAppbasePcAuthRuntimeSdkClient[];
  resetAuthenticatedSdkClients: () => void;
}

const DEFAULT_APP_ID = "sdkwork-customerservice";

let runtimeComposition: SdkworkAppbasePcAuthRuntimeComposition | null = null;
let activeStorageKey: string | null = null;

function readEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readSdkBaseUrlEnvValue(key);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (["1", "on", "true", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function resolveIamEnvironment(): "dev" | "prod" | "test" {
  const value = readEnvValue(
    "VITE_SDKWORK_CUSTOMER_SERVICE_IAM_ENVIRONMENT",
    "VITE_SDKWORK_IAM_ENVIRONMENT",
  );
  return value === "prod" || value === "production"
    ? "prod"
    : value === "test"
      ? "test"
      : "dev";
}

function resolveIamDeploymentMode(): "local" | "private" | "saas" {
  const value = readEnvValue(
    "VITE_SDKWORK_CUSTOMER_SERVICE_IAM_DEPLOYMENT_MODE",
    "VITE_SDKWORK_IAM_DEPLOYMENT_MODE",
  );
  return value === "saas" || value === "private" || value === "local" ? value : "saas";
}

function resolveDevelopmentPrefill(): SdkworkAuthRuntimeConfig["developmentPrefill"] {
  const account = readEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_AUTH_DEV_DEFAULT_ACCOUNT");
  const email = readEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_AUTH_DEV_DEFAULT_EMAIL");
  const phone = readEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_AUTH_DEV_DEFAULT_PHONE");
  const password = readEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_AUTH_DEV_DEFAULT_PASSWORD");
  const enabled = parseBoolean(readEnvValue("VITE_SDKWORK_CUSTOMER_SERVICE_AUTH_DEV_PREFILL_ENABLED"));
  const shouldEnable = enabled ?? Boolean(account || email || phone || password);
  if (!shouldEnable) {
    return undefined;
  }
  return {
    account: account || email || phone,
    email,
    enabled: true,
    loginMethod: "password",
    password,
    phone,
  };
}

export function resolveCustomerServiceAuthRuntimeConfig(): SdkworkAuthRuntimeConfig {
  const developmentPrefill = resolveDevelopmentPrefill();
  return {
    leftRailMode: "qr-only",
    loginMethods: ["password"],
    oauthLoginEnabled: false,
    oauthProviders: [],
    qrLoginEnabled: true,
    recoveryMethods: [],
    registerMethods: ["email", "phone"],
    verificationPolicy: {
      emailCodeLoginEnabled: false,
      emailRegistrationVerificationRequired: false,
      phoneCodeLoginEnabled: false,
      phoneRegistrationVerificationRequired: false,
    },
    ...(developmentPrefill ? { developmentPrefill } : {}),
  };
}

export function resolveCustomerServiceAuthAppearance(
  platform: "pc" | "h5",
): SdkworkAuthAppearanceConfig {
  const prefix = `sdkwork-customerservice-${platform}-auth`;
  return {
    pageClassName: `${prefix}-page`,
    shellClassName: `${prefix}-shell`,
    bodyClassName: `${prefix}-body`,
    theme: {
      pageBackgroundColor: platform === "h5" ? "#f4f6f8" : "#f6f8fa",
    },
  };
}

export function createCustomerServiceIamAuthRuntime(
  options: CreateCustomerServiceIamAuthRuntimeOptions,
): SdkworkAppbasePcAuthRuntimeComposition {
  activeStorageKey = options.sessionStorageKey;
  const composition = createSdkworkAppbasePcAuthRuntime({
    app: {
      appId: options.appId ?? DEFAULT_APP_ID,
      deploymentMode: resolveIamDeploymentMode(),
      environment: resolveIamEnvironment(),
      platform: options.platform,
    },
    baseUrls: {
      appbaseAppApiBaseUrl: resolveIamAppApiBaseUrl(),
    },
    createAppbaseAppClient: () =>
      wrapCredentialEntryClient(options.getAppbaseAppSdkClient(), {
        tokenManager: options.tokenManager,
      }),
    credentialEntry: {
      skipWrap: true,
    },
    hooks: {
      onSessionChanged: () => {
        options.resetAuthenticatedSdkClients();
      },
    },
    sdkClients: options.getAuthenticatedSdkClients() as SdkworkAppbasePcAuthRuntimeSdkClient[],
    sessionBridge: {
      clearSession: () => {
        clearCustomerServiceIamSession(options.sessionStorageKey);
        options.resetAuthenticatedSdkClients();
      },
      commitSession: (session) => {
        commitCustomerServiceIamSession(
          options.sessionStorageKey,
          session as CustomerServiceIamSession,
        );
        options.resetAuthenticatedSdkClients();
      },
      readSession: () => loadCustomerServiceIamSession(options.sessionStorageKey),
    },
    tokenManager: options.tokenManager,
  });
  runtimeComposition = composition;
  return composition;
}

export function getCustomerServiceIamAuthRuntime(
  options: CreateCustomerServiceIamAuthRuntimeOptions,
): SdkworkIamRuntimeAuthRuntimeLike {
  if (!runtimeComposition || activeStorageKey !== options.sessionStorageKey) {
    createCustomerServiceIamAuthRuntime(options);
  }
  return runtimeComposition!.runtime as unknown as SdkworkIamRuntimeAuthRuntimeLike;
}

export function resetCustomerServiceIamAuthRuntime(): void {
  runtimeComposition = null;
  activeStorageKey = null;
}
