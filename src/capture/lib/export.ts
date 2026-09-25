import type { PortraitSpriteManifest } from "../../shared/manifest";
import { CAPTURE_CONFIG } from "../config";

export type ExportAssets = {
  imageUrl: string;
  manifestUrl: string;
  manifest: PortraitSpriteManifest;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode the sprite sheet.")), type, quality);
  });
}

export async function createExport(frames: Map<string, HTMLCanvasElement>): Promise<ExportAssets> {
  const { gridSize, frameWidth, frameHeight } = CAPTURE_CONFIG;
  if (frames.size !== gridSize * gridSize) throw new Error("Capture every grid position before exporting.");
  const sprite = document.createElement("canvas");
  sprite.width = frameWidth * gridSize;
  sprite.height = frameHeight * gridSize;
  const context = sprite.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  for (let row = 0; row < gridSize; row++) {
    for (let column = 0; column < gridSize; column++) {
      const frame = frames.get(`${row},${column}`);
      if (!frame) throw new Error(`Missing frame at row ${row}, column ${column}.`);
      context.drawImage(frame, column * frameWidth, row * frameHeight);
    }
  }
  let imageBlob = await canvasToBlob(sprite, "image/webp", CAPTURE_CONFIG.webpQuality);
  const isWebp = imageBlob.type === "image/webp";
  if (!isWebp) imageBlob = await canvasToBlob(sprite, "image/png");
  const manifest: PortraitSpriteManifest = {
    version: 1,
    rows: gridSize,
    columns: gridSize,
    frameWidth,
    frameHeight,
    spriteWidth: sprite.width,
    spriteHeight: sprite.height,
    image: isWebp ? "portrait-sprite.webp" : "portrait-sprite.png",
  };
  return {
    imageUrl: URL.createObjectURL(imageBlob),
    manifestUrl: URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })),
    manifest,
  };
}

export function download(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
