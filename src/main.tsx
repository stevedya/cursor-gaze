import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import type { Root } from "react-dom/client";
import { CaptureApp } from "./capture/CaptureApp";
import { PortraitTester } from "./tester/PortraitTester";
import "./capture/capture.css";

function App() {
  const [page, setPage] = useState(window.location.hash);
  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    document.title = page === "#/tester" ? "Cursor Gaze — portrait tester" : "Cursor Gaze — capture studio";
  }, [page]);
  return page === "#/tester" ? <PortraitTester /> : <CaptureApp />;
}

const root: Root = import.meta.hot?.data.root ?? ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode><App /></React.StrictMode>,
);
if (import.meta.hot) import.meta.hot.dispose((data) => { data.root = root; });
