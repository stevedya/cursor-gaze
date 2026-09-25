import { CAPTURE_CONFIG } from "../config";

const DATABASE_NAME = "cursor-gaze-capture";
const STORE_NAME = "frames";

type StoredFrame = {
  key: string;
  blob: Blob;
  gridSize: number;
  frameWidth: number;
  frameHeight: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("This browser does not support local capture storage."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open capture storage."));
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not save a capture frame.")), "image/png");
  });
}

export async function saveStoredFrame(key: string, frame: HTMLCanvasElement): Promise<void> {
  const blob = await toBlob(frame);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const record: StoredFrame = {
        key,
        blob,
        gridSize: CAPTURE_CONFIG.gridSize,
        frameWidth: CAPTURE_CONFIG.frameWidth,
        frameHeight: CAPTURE_CONFIG.frameHeight,
      };
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not save a capture frame."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Capture storage was interrupted."));
    });
  } finally {
    database.close();
  }
}

async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser.");
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadStoredFrames(): Promise<Map<string, HTMLCanvasElement>> {
  const database = await openDatabase();
  let records: StoredFrame[];
  try {
    records = await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as StoredFrame[]);
      request.onerror = () => reject(request.error ?? new Error("Could not read saved frames."));
    });
  } finally {
    database.close();
  }
  const frames = new Map<string, HTMLCanvasElement>();
  for (const record of records) {
    if (record.gridSize === CAPTURE_CONFIG.gridSize &&
        record.frameWidth === CAPTURE_CONFIG.frameWidth &&
        record.frameHeight === CAPTURE_CONFIG.frameHeight && record.blob instanceof Blob) {
      frames.set(record.key, await blobToCanvas(record.blob));
    }
  }
  return frames;
}

export async function clearStoredFrames(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete the saved session."));
    });
  } finally {
    database.close();
  }
}
