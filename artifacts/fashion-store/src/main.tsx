import "./lib/csrf-interceptor"; // Must be first — patches fetch() with CSRF token
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = document.getElementById("root")!;

createRoot(root).render(<App />);
