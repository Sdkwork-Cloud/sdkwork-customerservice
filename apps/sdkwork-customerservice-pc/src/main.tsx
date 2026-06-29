import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CustomerServiceAppShell } from "@sdkwork/customerservice-pc-shell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomerServiceAppShell />
  </StrictMode>,
);
