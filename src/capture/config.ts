export const CAPTURE_PRESETS = {
  standard: { id: "standard", grid: "standard", detail: "standard", label: "7 × 7", gridSize: 7, frameWidth: 500, frameHeight: 500 },
  dense: { id: "dense", grid: "dense", detail: "standard", label: "13 × 13", gridSize: 13, frameWidth: 300, frameHeight: 300 },
  standardHigh: { id: "standardHigh", grid: "standard", detail: "high", label: "7 × 7", gridSize: 7, frameWidth: 640, frameHeight: 640 },
  denseHigh: { id: "denseHigh", grid: "dense", detail: "high", label: "13 × 13", gridSize: 13, frameWidth: 360, frameHeight: 360 },
} as const;

export type CapturePresetId = keyof typeof CAPTURE_PRESETS;
export type CapturePreset = (typeof CAPTURE_PRESETS)[CapturePresetId];
export type CaptureGrid = CapturePreset["grid"];
export type CaptureDetail = CapturePreset["detail"];

export const PRESET_BY_GRID_AND_DETAIL = {
  standard: { standard: "standard", high: "standardHigh" },
  dense: { standard: "dense", high: "denseHigh" },
} as const;

export const CAPTURE_CONFIG = {
  initialCountdownMs: 3000,
  moveDurationMs: 400,
  settleDurationMs: 600,
  webpQuality: 0.96,
} as const;
