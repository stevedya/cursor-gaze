import { useEffect, useState, type ChangeEvent } from "react";
import { CursorPortrait } from "../react/CursorPortrait";
import { parseManifest, type PortraitSpriteManifest } from "../shared/manifest";
import { createExport, type ExportAssets } from "../capture/lib/export";
import { loadStoredFrames } from "../capture/lib/session";
import { CAPTURE_PRESETS, type CapturePresetId } from "../capture/config";

type Source = "sample" | CapturePresetId | "upload";
type UploadedAssets = {
  imageUrl: string;
  manifestUrl: string;
  manifest: PortraitSpriteManifest;
};

const sample = {
  imageUrl: "/demo/portrait-sprite.webp?v=3",
  manifestUrl: "/demo/portrait-manifest.json",
};

function release(assets: ExportAssets | UploadedAssets | null) {
  if (!assets) return;
  URL.revokeObjectURL(assets.imageUrl);
  URL.revokeObjectURL(assets.manifestUrl);
}

export function PortraitTester() {
  const [source, setSource] = useState<Source>("sample");
  const [saved, setSaved] = useState<Partial<Record<CapturePresetId, ExportAssets>>>({});
  const [spriteFile, setSpriteFile] = useState<File | null>(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState<UploadedAssets | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [trackingMode, setTrackingMode] = useState<"portrait" | "viewport">("portrait");

  useEffect(() => {
    let cancelled = false;
    const assets: Partial<Record<CapturePresetId, ExportAssets>> = {};
    const load = async () => {
      for (const preset of Object.values(CAPTURE_PRESETS)) {
        if (cancelled) break;
        try {
          const frames = await loadStoredFrames(preset);
          if (cancelled) break;
          if (frames.size !== preset.gridSize * preset.gridSize) continue;
          assets[preset.id] = await createExport(frames, preset);
          if (!cancelled) setSaved({ ...assets });
        } catch {
          // The sample and file upload remain usable when browser storage is unavailable.
        }
      }
      if (cancelled) Object.values(assets).forEach(release);
    };
    void load();
    return () => { cancelled = true; Object.values(assets).forEach(release); };
  }, []);

  useEffect(() => {
    if (!spriteFile || !manifestFile) {
      setUploaded(null);
      return;
    }
    let cancelled = false;
    let next: UploadedAssets | null = null;
    const load = async () => {
      setUploadError(null);
      try {
        const manifest = parseManifest(JSON.parse(await manifestFile.text()));
        const imageUrl = URL.createObjectURL(spriteFile);
        const manifestUrl = URL.createObjectURL(manifestFile);
        next = { imageUrl, manifestUrl, manifest };
        const image = new Image();
        image.src = imageUrl;
        await image.decode();
        if (image.naturalWidth !== manifest.spriteWidth || image.naturalHeight !== manifest.spriteHeight) {
          throw new Error("The sprite dimensions do not match the manifest.");
        }
        if (!cancelled) {
          setUploaded(next);
          setSource("upload");
        } else release(next);
      } catch (cause) {
        release(next);
        next = null;
        if (!cancelled) {
          setUploaded(null);
          setUploadError(cause instanceof Error ? cause.message : "Could not open these files.");
        }
      }
    };
    void load();
    return () => { cancelled = true; release(next); };
  }, [spriteFile, manifestFile]);

  const selected = source === "standard" || source === "dense" ? saved[source] : source === "upload" ? uploaded : sample;
  const spriteSrc = selected?.imageUrl;
  const manifestSrc = selected?.manifestUrl;
  const selectSource = (value: Source) => {
    setSource(value);
    setReady(false);
    setPreviewError(null);
  };
  const onSpriteChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSpriteFile(event.target.files?.[0] ?? null);
    setUploaded(null);
    setReady(false);
  };
  const onManifestChange = (event: ChangeEvent<HTMLInputElement>) => {
    setManifestFile(event.target.files?.[0] ?? null);
    setUploaded(null);
    setReady(false);
  };

  return <main className="studio tester-page">
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">◉</span> CURSOR GAZE <span className="brand-sub">/ PORTRAIT TESTER</span></div>
      <nav className="topbar-nav" aria-label="Studio pages"><a href="#/capture">Capture</a><a href="#/tester" aria-current="page">Test portrait</a></nav>
    </header>
    <div className="tester-layout">
      <section className="tester-copy" aria-labelledby="tester-heading">
        <p className="eyebrow">02 / LIVE COMPONENT TEST</p>
        <h1 id="tester-heading">See the gaze<br /><em>in motion.</em></h1>
        <p className="tester-intro">Move your cursor anywhere on this page. The square on the right uses the same canvas component you’ll place in your portfolio.</p>
        <div className="source-switch" role="group" aria-label="Choose portrait source">
          <button className={source === "sample" ? "selected" : ""} onClick={() => selectSource("sample")}>Sample</button>
          {(Object.values(CAPTURE_PRESETS)).map((preset) => <button key={preset.id} className={source === preset.id ? "selected" : ""} disabled={!saved[preset.id]} onClick={() => selectSource(preset.id)}>Saved {preset.label}</button>)}
          <button className={source === "upload" ? "selected" : ""} onClick={() => selectSource("upload")}>My files</button>
        </div>
        {source === "sample" && <p className="source-note">Illustrated sample sprite, included so you can try the tracking immediately.</p>}
        {(source === "standard" || source === "dense") && <p className="source-note">Your complete {CAPTURE_PRESETS[source].label} capture, restored from this browser.</p>}
        {source === "upload" && <div className="upload-fields">
          <label>Sprite sheet <span>WebP, PNG or JPEG</span><input type="file" accept="image/webp,image/png,image/jpeg" onChange={onSpriteChange} /></label>
          <label>Manifest <span>JSON</span><input type="file" accept=".json,application/json" onChange={onManifestChange} /></label>
          <p className="source-note">Files stay in this browser. Select both files to show your portrait.</p>
        </div>}
        <div className="mapping-control" role="group" aria-label="Gaze mapping">
          <span>GAZE MAPPING</span>
          <div><button aria-pressed={trackingMode === "portrait"} className={trackingMode === "portrait" ? "selected" : ""} onClick={() => setTrackingMode("portrait")}>Auto position</button><button aria-pressed={trackingMode === "viewport"} className={trackingMode === "viewport" ? "selected" : ""} onClick={() => setTrackingMode("viewport")}>Full page</button></div>
          <p>{trackingMode === "portrait" ? "The portrait's center is the neutral gaze point. Cursor movement scales to the space on each side." : "Cursor movement maps directly to the full page width and height."}</p>
        </div>
        {uploadError && <p className="error" role="alert">{uploadError}</p>}
        {previewError && <p className="error" role="alert">{previewError}</p>}
        <div className="tester-status"><span className={ready ? "status-ready" : ""} />{ready ? "PORTRAIT READY · MOVE YOUR CURSOR" : "WAITING FOR PORTRAIT"}</div>
      </section>
      <section className="tester-portrait" aria-label="Interactive portrait preview">
        <div className="tester-square">
          {spriteSrc && manifestSrc ? <CursorPortrait
            key={`${source}:${spriteSrc}`}
            spriteSrc={spriteSrc}
            manifestSrc={manifestSrc}
            trackingMode={trackingMode}
            ariaLabel="Portrait that follows the cursor"
            onReady={() => { setPreviewError(null); setReady(true); }}
            onError={(error) => { setReady(false); setPreviewError(error.message); }}
          /> : <div className="tester-empty">Select a sprite and manifest to preview</div>}
        </div>
        <p className="tester-caption">01 — THE SAME <code>CursorPortrait</code> COMPONENT USED IN PRODUCTION</p>
      </section>
    </div>
  </main>;
}
