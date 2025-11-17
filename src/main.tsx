import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// 注册 PWA service worker：优先使用插件生成的 /sw.js，失败则退回到 public/service-worker.js
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .catch(() => navigator.serviceWorker.register("/service-worker.js"))
    .catch(() => {
      console.warn("Service Worker 注册失败，已跳过 PWA 功能");
    });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
