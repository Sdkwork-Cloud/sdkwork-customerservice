import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  SdkworkIamAuthRoutes,
  type SdkworkIamAuthRoutesProps,
} from "@sdkwork/auth-pc-react";
import {
  CUSTOMER_SERVICE_H5_IAM_SESSION_CHANGED_EVENT,
  getCustomerServiceH5IamRuntime,
  isH5IamSessionAuthenticated,
  loadCustomerServiceH5IamSession,
  resolveCustomerServiceAuthRuntimeConfig,
  resolveCustomerServiceH5AuthAppearance,
  type CustomerServiceIamSession,
} from "@sdkwork/customerservice-h5-core";

const AUTH_BASE_PATH = "/auth";
const H5_HOME_PATH = "/";

interface H5AppAuthGateProps {
  children: ReactNode;
  homePath?: string;
}

function isAuthRoute(pathname: string): boolean {
  return pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`);
}

function resolveRedirectTarget(pathname: string, search: string, hash: string, homePath: string): string {
  const target = `${pathname}${search}${hash}`;
  if (isAuthRoute(pathname)) {
    return homePath;
  }
  return target || homePath;
}

function buildAuthLoginPath(redirectTarget: string): string {
  const params = new URLSearchParams();
  params.set("redirect", redirectTarget || H5_HOME_PATH);
  return `${AUTH_BASE_PATH}/login?${params.toString()}`;
}

export function H5AppAuthGate({ children, homePath = H5_HOME_PATH }: H5AppAuthGateProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<CustomerServiceIamSession | null>(() =>
    loadCustomerServiceH5IamSession(),
  );

  const redirectTarget = useMemo(
    () => resolveRedirectTarget(location.pathname, location.search, location.hash, homePath),
    [homePath, location.hash, location.pathname, location.search],
  );
  const isAuthenticated = isH5IamSessionAuthenticated(session);
  const isAuthPath = isAuthRoute(location.pathname);

  useEffect(() => {
    setSession(loadCustomerServiceH5IamSession());
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleSessionChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ session?: CustomerServiceIamSession | null }>).detail;
      setSession(detail?.session ?? loadCustomerServiceH5IamSession());
    };

    window.addEventListener(CUSTOMER_SERVICE_H5_IAM_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => window.removeEventListener(CUSTOMER_SERVICE_H5_IAM_SESSION_CHANGED_EVENT, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (isAuthenticated || isAuthPath) {
      return;
    }
    navigate(buildAuthLoginPath(redirectTarget), { replace: true });
  }, [isAuthPath, isAuthenticated, navigate, redirectTarget]);

  if (isAuthenticated && isAuthPath) {
    return <Navigate replace to={redirectTarget} />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SdkworkIamAuthRoutes
      appearance={resolveCustomerServiceH5AuthAppearance()}
      basePath={AUTH_BASE_PATH}
      getRuntime={
        getCustomerServiceH5IamRuntime as unknown as SdkworkIamAuthRoutesProps["getRuntime"]
      }
      homePath={homePath}
      locale={typeof navigator !== "undefined" ? navigator.language || null : null}
      routerContextMode="external"
      runtimeConfig={resolveCustomerServiceAuthRuntimeConfig()}
      viewportMode="flow"
    />
  );
}
