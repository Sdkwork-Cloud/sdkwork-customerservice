import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CustomerServiceH5App } from "@sdkwork/customerservice-h5-shell";

import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomerServiceH5App />
  </StrictMode>,
);
