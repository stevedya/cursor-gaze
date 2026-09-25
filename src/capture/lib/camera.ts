import type { CapturePreset } from "../config";

export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access requires a modern browser on localhost or HTTPS.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
    });
  } catch (error) {
    if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
      throw new Error("Camera permission was denied. Allow camera access in your browser and try again.");
    }
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    } catch {
      throw new Error("Could not start a camera. Check that one is connected and not in use.");
    }
  }
}

export function getPortraitCrop(videoWidth: number, videoHeight: number) {
  // Replace this calculation later if automatic face alignment is added.
  const side = Math.min(videoWidth, videoHeight);
  return { x: (videoWidth - side) / 2, y: (videoHeight - side) / 2, width: side, height: side };
}

export function captureFrame(video: HTMLVideoElement, preset: CapturePreset): HTMLCanvasElement {
  if (!video.videoWidth || !video.videoHeight) throw new Error("Camera video is not ready yet.");
  const canvas = document.createElement("canvas");
  canvas.width = preset.frameWidth;
  canvas.height = preset.frameHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  const crop = getPortraitCrop(video.videoWidth, video.videoHeight);
  // The preview is mirrored. Exporting the same view preserves screen-left → portrait-left.
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Cancelled", "AbortError"));
    const timeout = window.setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    const abort = () => { window.clearTimeout(timeout); reject(new DOMException("Cancelled", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
  });
}
