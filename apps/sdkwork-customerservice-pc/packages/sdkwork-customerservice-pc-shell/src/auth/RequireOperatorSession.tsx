import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  loadCustomerServiceIamSession,
  loadOperatorSession,
  toOperatorSession,
} from "@sdkwork/customerservice-pc-core";

export function RequireOperatorSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const iamSession = toOperatorSession(loadCustomerServiceIamSession());
  const legacySession = loadOperatorSession();
  const session = iamSession ?? legacySession;

  if (!session?.accessToken && !session?.authToken) {
    return <Navigate replace state={{ from: location }} to="/auth/login" />;
  }

  return children;
}
