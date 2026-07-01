import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CustomerServicePcApp } from "@sdkwork/customerservice-pc-shell";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomerServicePcApp />
  </StrictMode>,
);
