import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { clearStoredFrames, loadStoredFrames, saveStoredFrame } from "./session";

describe("saved capture session", () => {
  beforeAll(() => {
    vi.stubGlobal("window", { indexedDB });
    vi.stubGlobal("Image", class {
      naturalWidth = 500;
      naturalHeight = 500;
      src = "";
      decode() { return Promise.resolve(); }
    });
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: () => undefined }) }),
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:test-frame",
      revokeObjectURL: () => undefined,
    });
  });

  afterAll(() => vi.unstubAllGlobals());

  it("restores a frame from IndexedDB and deletes it on reset", async () => {
    await clearStoredFrames();
    const frame = {
      toBlob: (callback: BlobCallback) => callback(new Blob(["frame bytes"], { type: "image/png" })),
    } as unknown as HTMLCanvasElement;

    await saveStoredFrame("3,3", frame);
    const restored = await loadStoredFrames();
    expect([...restored.keys()]).toEqual(["3,3"]);
    expect(restored.get("3,3")?.width).toBe(500);

    await clearStoredFrames();
    expect((await loadStoredFrames()).size).toBe(0);
  });
});
