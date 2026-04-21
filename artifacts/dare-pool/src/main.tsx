import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Bootstrap diagnostics — visible in Safari Web Inspector / Xcode console
console.info(`[DarePool] Bootstrap  mode=${import.meta.env.MODE}  base=${import.meta.env.BASE_URL}`);

const isCapacitor = typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== "undefined";
if (isCapacitor) {
  console.info("[DarePool] Running inside Capacitor native shell");
} else {
  console.info("[DarePool] Running in browser");
}

const root = document.getElementById("root");
if (!root) {
  console.error("[DarePool] #root element not found — check index.html");
} else {
  createRoot(root).render(<App />);
}
