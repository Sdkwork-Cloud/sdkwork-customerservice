import { BrowserRouter } from "react-router-dom";
import { SdkworkSessionAuthBrowserRoot } from "@sdkwork/auth-pc-react";
import { H5AppAuthGate } from "./auth/H5AppAuthGate";
import { CustomerServiceH5Shell } from "./h5-shell";

export function CustomerServiceH5App() {
  return (
    <BrowserRouter>
      <SdkworkSessionAuthBrowserRoot authLoginPath="/auth/login">
        <H5AppAuthGate>
          <CustomerServiceH5Shell />
        </H5AppAuthGate>
      </SdkworkSessionAuthBrowserRoot>
    </BrowserRouter>
  );
}
