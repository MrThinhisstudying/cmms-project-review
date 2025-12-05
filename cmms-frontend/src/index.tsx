import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext/AuthContext";
import { InventoryProvider } from "./context/InventoryContext/InventoryContext";

const resizeObserverLoopErr =
  "ResizeObserver loop completed with undelivered notifications.";

window.addEventListener("error", (e) => {
  if (e.message === resizeObserverLoopErr) {
    const resizeObserverErrDiv = document.getElementById(
      "webpack-dev-server-client-overlay-div"
    );
    const resizeObserverErr = document.getElementById(
      "webpack-dev-server-client-overlay"
    );
    if (resizeObserverErr) {
      resizeObserverErr.setAttribute("style", "display: none");
    }
    if (resizeObserverErrDiv) {
      resizeObserverErrDiv.setAttribute("style", "display: none");
    }
    e.stopImmediatePropagation();
  }
});
ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <InventoryProvider>
          <App />
        </InventoryProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
