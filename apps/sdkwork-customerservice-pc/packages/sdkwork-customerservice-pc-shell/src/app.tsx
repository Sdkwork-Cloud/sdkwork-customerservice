import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SdkworkSessionAuthBrowserRoot } from "@sdkwork/auth-pc-react";
import { CustomerServiceAppShell } from "./shell";
import { CustomerServiceAuthRoutes } from "./auth/CustomerServiceAuthRoutes";
import { RequireOperatorSession } from "./auth/RequireOperatorSession";

export function CustomerServicePcApp() {
  return (
    <BrowserRouter>
      <SdkworkSessionAuthBrowserRoot authLoginPath="/auth/login">
        <Routes>
          <Route element={<CustomerServiceAuthRoutes />} path="/auth/*" />
          <Route
            element={
              <RequireOperatorSession>
                <CustomerServiceAppShell />
              </RequireOperatorSession>
            }
            path="/*"
          />
        </Routes>
      </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  );
}
