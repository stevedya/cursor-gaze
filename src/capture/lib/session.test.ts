import "fake-indexeddb/auto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CAPTURE_PRESETS } from "../config";
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

  it("restores each grid separately and only deletes the selected session", async () => {
    await clearStoredFrames(CAPTURE_PRESETS.standard);
    await clearStoredFrames(CAPTURE_PRESETS.dense);
    const frame = {
      toBlob: (callback: BlobCallback) => callback(new Blob(["frame bytes"], { type: "image/png" })),
    } as unknown as HTMLCanvasElement;

    await saveStoredFrame("3,3", frame, CAPTURE_PRESETS.standard);
    await saveStoredFrame("6,6", frame, CAPTURE_PRESETS.dense);
    const standard = await loadStoredFrames(CAPTURE_PRESETS.standard);
    expect([...standard.keys()]).toEqual(["3,3"]);
    expect(standard.get("3,3")?.width).toBe(500);
    expect([...(await loadStoredFrames(CAPTURE_PRESETS.dense)).keys()]).toEqual(["6,6"]);

    await clearStoredFrames(CAPTURE_PRESETS.standard);
    expect((await loadStoredFrames(CAPTURE_PRESETS.standard)).size).toBe(0);
    expect((await loadStoredFrames(CAPTURE_PRESETS.dense)).size).toBe(1);
    await clearStoredFrames(CAPTURE_PRESETS.dense);
  });
});
