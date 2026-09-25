import { useCallback, useEffect, useRef, useState } from "react";
import { createCapturePath, type GridPosition } from "../shared/grid";
import { CAPTURE_CONFIG } from "./config";
import { captureFrame, openCamera, wait } from "./lib/camera";
import { createExport, download, type ExportAssets } from "./lib/export";

type Stage = "idle" | "countdown" | "capturing" | "preparing" | "done" | "retaking";
const path = createCapturePath(CAPTURE_CONFIG.gridSize, CAPTURE_CONFIG.gridSize);
const total = path.length;
const keyOf = ({ row, column }: GridPosition) => `${row},${column}`;
const center = path[0];

export function CaptureApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const framesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const assetsRef = useRef<ExportAssets | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [captured, setCaptured] = useState(0);
  const [target, setTarget] = useState<GridPosition>(center);
  const [assets, setAssets] = useState<ExportAssets | null>(null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

  const clearAssets = useCallback(() => {
    if (assetsRef.current) {
      URL.revokeObjectURL(assetsRef.current.imageUrl);
      URL.revokeObjectURL(assetsRef.current.manifestUrl);
    }
    assetsRef.current = null;
    setAssets(null);
  }, []);

  useEffect(() => () => {
    runRef.current?.abort();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (assetsRef.current) {
      URL.revokeObjectURL(assetsRef.current.imageUrl);
      URL.revokeObjectURL(assetsRef.current.manifestUrl);
    }
  }, []);

  const enableCamera = useCallback(async () => {
    setCameraBusy(true);
    setError(null);
    try {
      const stream = await openCamera();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Camera access failed.");
    } finally {
      setCameraBusy(false);
    }
  }, []);

  const countIn = async (signal: AbortSignal) => {
    const seconds = Math.ceil(CAPTURE_CONFIG.initialCountdownMs / 1000);
    for (let remaining = seconds; remaining > 0; remaining--) {
      setCountdown(remaining);
      await wait(CAPTURE_CONFIG.initialCountdownMs / seconds, signal);
    }
  };

  const saveFrame = (position: GridPosition) => {
    if (!videoRef.current) throw new Error("Camera preview is unavailable.");
    const frame = captureFrame(videoRef.current);
    framesRef.current.set(keyOf(position), frame);
    setThumbnails((previous) => new Map(previous).set(keyOf(position), frame.toDataURL("image/jpeg", 0.65)));
    setCaptured(framesRef.current.size);
  };

  const finish = async (signal: AbortSignal) => {
    setStage("preparing");
    const next = await createExport(framesRef.current);
    if (signal.aborted) {
      URL.revokeObjectURL(next.imageUrl);
      URL.revokeObjectURL(next.manifestUrl);
      return;
    }
    clearAssets();
    assetsRef.current = next;
    setAssets(next);
    setStage("done");
  };

  const handleRunError = (cause: unknown) => {
    if (cause instanceof DOMException && cause.name === "AbortError") return;
    setError(cause instanceof Error ? cause.message : "Capture failed.");
    setStage("idle");
  };

  const start = useCallback(async () => {
    if (!cameraReady || runRef.current) return;
    const controller = new AbortController();
    runRef.current = controller;
    framesRef.current = new Map();
    setThumbnails(new Map());
    setCaptured(0);
    clearAssets();
    setError(null);
    setTarget(center);
    setStage("countdown");
    try {
      await countIn(controller.signal);
      setStage("capturing");
      for (const position of path) {
        setTarget(position);
        await wait(CAPTURE_CONFIG.moveDurationMs, controller.signal);
        await wait(CAPTURE_CONFIG.settleDurationMs, controller.signal);
        saveFrame(position);
      }
      await finish(controller.signal);
    } catch (cause) {
      handleRunError(cause);
    } finally {
      if (runRef.current === controller) runRef.current = null;
    }
  }, [cameraReady, clearAssets]);

  const cancel = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    framesRef.current = new Map();
    setThumbnails(new Map());
    setCaptured(0);
    setTarget(center);
    clearAssets();
    setError(null);
    setStage("idle");
  }, [clearAssets]);

  const retake = async (position: GridPosition) => {
    if (stage !== "done" || !cameraReady || runRef.current) return;
    const controller = new AbortController();
    runRef.current = controller;
    setError(null);
    setTarget(position);
    setStage("retaking");
    try {
      await countIn(controller.signal);
      await wait(CAPTURE_CONFIG.moveDurationMs, controller.signal);
      await wait(CAPTURE_CONFIG.settleDurationMs, controller.signal);
      saveFrame(position);
      await finish(controller.signal);
    } catch (cause) {
      handleRunError(cause);
    } finally {
      if (runRef.current === controller) runRef.current = null;
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && stage !== "idle") cancel();
      if (event.code === "Space" && stage === "idle" && cameraReady &&
          !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        void start();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage, cameraReady, start, cancel]);

  const active = stage === "countdown" || stage === "capturing" || stage === "retaking";
  const running = active || stage === "preparing";
  const targetLabel = `Row ${target.row + 1}, column ${target.column + 1}`;

  return (
    <main className="studio">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">◉</span> CURSOR GAZE <span className="brand-sub">/ CAPTURE STUDIO</span></div>
        <div className="topbar-note">LOCAL CAMERA SESSION <span className="status-light" /></div>
      </header>

      <div className="workspace">
        <section className="intro" aria-labelledby="heading">
          <p className="eyebrow">01 / PORTRAIT CAPTURE</p>
          <h1 id="heading">Make your portrait<br /><em>look alive.</em></h1>
          <p className="intro-copy">Follow the moving dot with your head. The studio captures 49 directions and builds a ready to use sprite sheet.</p>
          <div className="instructions"><span>01 &nbsp; Enable camera</span><span>02 &nbsp; Follow the dot</span><span>03 &nbsp; Export assets</span></div>
        </section>

        <section className="preview-area" aria-label="Camera preview">
          <div className="camera-frame">
            <video ref={videoRef} className="camera-video" autoPlay playsInline muted aria-label="Mirrored live camera preview" />
            {!cameraReady && <div className="camera-empty"><span className="camera-icon">◎</span><strong>Camera preview</strong><small>Enable your camera to begin.</small></div>}
            <div className="frame-corner corner-tl" /><div className="frame-corner corner-tr" />
            <div className="frame-corner corner-bl" /><div className="frame-corner corner-br" />
            {cameraReady && <div className="camera-badge"><span className="red-dot" /> LIVE PREVIEW · MIRRORED</div>}
          </div>
          <p className="preview-caption">Sit centered in frame and leave room around your head. Your camera stays in this browser.</p>
        </section>

        <aside className="control-panel" aria-label="Capture controls">
          <div className="panel-header"><span>SESSION</span><span className="session-state">{stage === "done" ? "COMPLETE" : running ? "IN PROGRESS" : cameraReady ? "READY" : "STANDBY"}</span></div>
          <div className="progress-block"><strong>{String(captured).padStart(2, "0")} <span>/ {total}</span></strong><p>POSITIONS CAPTURED</p><div className="progress-track"><div style={{ width: `${captured / total * 100}%` }} /></div></div>
          <div className="target-info"><span>CURRENT TARGET</span><strong>{active ? targetLabel : "Center position"}</strong></div>
          {stage === "countdown" && <div className="countdown-note" role="status">Starting in <strong>{countdown}</strong></div>}
          {stage === "retaking" && <div className="countdown-note" role="status">Retaking in <strong>{countdown}</strong></div>}
          {stage === "preparing" && <div className="countdown-note" role="status">Building sprite sheet…</div>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="button-stack">
            {!cameraReady && <button className="primary-button" onClick={() => void enableCamera()} disabled={cameraBusy}>{cameraBusy ? "Opening camera…" : "Enable camera"}<span>↗</span></button>}
            {cameraReady && stage === "idle" && <button className="primary-button" onClick={() => void start()}>Start capture <span>→</span></button>}
            {running && <button className="secondary-button" onClick={cancel}>Cancel / reset <span>✕</span></button>}
            {stage === "done" && <button className="secondary-button" onClick={cancel}>Start over <span>↺</span></button>}
          </div>
          <div className="panel-foot">{cameraReady ? "SPACE TO START  ·  ESC TO RESET" : "CAMERA PERMISSION REQUIRED"}</div>
        </aside>
      </div>

      {assets && stage === "done" && <section className="results" aria-labelledby="results-heading">
        <div className="results-heading"><div><p className="eyebrow">02 / ASSETS READY</p><h2 id="results-heading">Your 7 × 7 portrait grid.</h2><p>Review the sprite and retake any frame below. Download both files into your portfolio’s public/portrait folder.</p></div>
          <div className="download-actions"><button onClick={() => download(assets.imageUrl, assets.manifest.image)}>Download sprite ↗</button><button onClick={() => download(assets.manifestUrl, "portrait-manifest.json")}>Download manifest ↗</button></div></div>
        <div className="results-layout"><div className="sprite-preview"><img src={assets.imageUrl} alt="Generated portrait sprite sheet arranged in seven rows and columns" /></div>
          <div className="retake-area"><h3>Individual frames <span>CLICK TO RETAKE</span></h3><div className="thumbnail-grid">{Array.from({ length: total }, (_, index) => {
            const row = Math.floor(index / CAPTURE_CONFIG.gridSize);
            const column = index % CAPTURE_CONFIG.gridSize;
            const position = path.find((item) => item.row === row && item.column === column)!;
            return <button key={`${row},${column}`} title={`Retake row ${row + 1}, column ${column + 1}`} aria-label={`Retake row ${row + 1}, column ${column + 1}`} onClick={() => void retake(position)}><img src={thumbnails.get(`${row},${column}`)} alt="" /></button>;
          })}</div></div></div>
      </section>}

      {active && <div className="target-layer" aria-hidden="true"><div className="target-dot" style={{ left: `${5 + target.normalizedX * 90}%`, top: `${8 + target.normalizedY * 84}%`, transitionDuration: `${CAPTURE_CONFIG.moveDurationMs}ms` }}><span /></div>{(stage === "countdown" || stage === "retaking") && <div className="countdown-overlay">{countdown}</div>}</div>}
    </main>
  );
}
