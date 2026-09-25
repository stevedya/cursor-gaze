export type PortraitSpriteManifest = {
  version: 1;
  rows: number;
  columns: number;
  frameWidth: number;
  frameHeight: number;
  spriteWidth: number;
  spriteHeight: number;
  image: string;
};

export function parseManifest(value: unknown): PortraitSpriteManifest {
  if (!value || typeof value !== "object") throw new Error("Invalid portrait manifest.");
  const manifest = value as Record<string, unknown>;
  const dimensions = ["rows", "columns", "frameWidth", "frameHeight", "spriteWidth", "spriteHeight"] as const;
  if (manifest.version !== 1 || typeof manifest.image !== "string" || !manifest.image) {
    throw new Error("Unsupported portrait manifest.");
  }
  for (const key of dimensions) {
    if (!Number.isSafeInteger(manifest[key]) || (manifest[key] as number) < 1) {
      throw new Error(`Invalid portrait manifest ${key}.`);
    }
  }
  const result = manifest as PortraitSpriteManifest;
  if (result.spriteWidth !== result.frameWidth * result.columns ||
      result.spriteHeight !== result.frameHeight * result.rows) {
    throw new Error("Portrait sprite dimensions do not match the grid.");
  }
  return result;
}
