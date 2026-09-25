import React from "react";
import ReactDOM from "react-dom/client";
import { CaptureApp } from "./capture/CaptureApp";
import "./capture/capture.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><CaptureApp /></React.StrictMode>,
);
