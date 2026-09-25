export const CAPTURE_PRESETS = {
  standard: { id: "standard", label: "7 × 7", gridSize: 7, frameWidth: 500, frameHeight: 500 },
  dense: { id: "dense", label: "13 × 13", gridSize: 13, frameWidth: 300, frameHeight: 300 },
} as const;

export type CapturePresetId = keyof typeof CAPTURE_PRESETS;
export type CapturePreset = (typeof CAPTURE_PRESETS)[CapturePresetId];

export const CAPTURE_CONFIG = {
  initialCountdownMs: 3000,
  moveDurationMs: 400,
  settleDurationMs: 600,
  webpQuality: 0.9,
} as const;
