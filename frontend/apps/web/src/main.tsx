import { createRoot } from "react-dom/client";
import { connectWithToken } from "@lightwick/core";
import { App } from "./App";
import "./app.css";

const conn = await connectWithToken(import.meta.env.VITE_HA_URL, import.meta.env.VITE_HA_TOKEN);
createRoot(document.getElementById("root")!).render(<App conn={conn} />);
