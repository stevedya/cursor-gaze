import { useEffect, useRef, type RefObject } from "react";
import { clamp01, getSpriteSource, normalizedToCell } from "../shared/grid";
import { parseManifest, type PortraitSpriteManifest } from "../shared/manifest";

export type CursorPortraitProps = {
  spriteSrc: string;
  manifestSrc: string;
  className?: string;
  trackingMode?: "viewport" | "element";
  trackingElementRef?: RefObject<HTMLElement | null>;
  smoothing?: number;
  objectFit?: "contain" | "cover";
  ariaLabel?: string;
  ariaHidden?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
};

export function CursorPortrait({
  spriteSrc,
  manifestSrc,
  className,
  trackingMode = "viewport",
  trackingElementRef,
  smoothing = 0.18,
  objectFit = "contain",
  ariaLabel,
  ariaHidden,
  onReady,
  onError,
}: CursorPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  readyRef.current = onReady;
  errorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) {
      errorRef.current?.(new Error("Canvas is unavailable in this browser."));
      return;
    }
    const controller = new AbortController();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: fine)");
    let disposed = false;
    let manifest: PortraitSpriteManifest | null = null;
    let sprite: HTMLImageElement | null = null;
    let currentX = 0.5;
    let currentY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let lastRow = -1;
    let lastColumn = -1;
    let raf = 0;
    let backingWidth = 0;
    let backingHeight = 0;
    const easing = Math.min(1, Math.max(0.01, Number.isFinite(smoothing) ? smoothing : 0.18));

    const draw = (force = false) => {
      if (!manifest || !sprite || !backingWidth || !backingHeight) return;
      const { row, column } = normalizedToCell(currentX, currentY, manifest.rows, manifest.columns);
      if (!force && row === lastRow && column === lastColumn) return;
      lastRow = row;
      lastColumn = column;
      const { sourceX, sourceY } = getSpriteSource({ row, column, frameWidth: manifest.frameWidth, frameHeight: manifest.frameHeight });
      const ratio = window.devicePixelRatio || 1;
      const width = backingWidth / ratio;
      const height = backingHeight / ratio;
      const frameRatio = manifest.frameWidth / manifest.frameHeight;
      const canvasRatio = width / height;
      context.clearRect(0, 0, width, height);
      if (objectFit === "contain") {
        const drawWidth = canvasRatio > frameRatio ? height * frameRatio : width;
        const drawHeight = canvasRatio > frameRatio ? height : width / frameRatio;
        context.drawImage(sprite, sourceX, sourceY, manifest.frameWidth, manifest.frameHeight,
          (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      } else {
        // Crop within the chosen frame; never sample neighboring sprite cells.
        const sourceWidth = canvasRatio > frameRatio ? manifest.frameWidth : manifest.frameHeight * canvasRatio;
        const sourceHeight = canvasRatio > frameRatio ? manifest.frameWidth / canvasRatio : manifest.frameHeight;
        context.drawImage(sprite,
          sourceX + (manifest.frameWidth - sourceWidth) / 2,
          sourceY + (manifest.frameHeight - sourceHeight) / 2,
          sourceWidth, sourceHeight, 0, 0, width, height);
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(rect.width * ratio));
      const height = Math.max(1, Math.round(rect.height * ratio));
      if (width === backingWidth && height === backingHeight) return;
      backingWidth = width;
      backingHeight = height;
      canvas.width = width;
      canvas.height = height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(true);
    };

    const animate = () => {
      raf = 0;
      if (motionQuery.matches || !pointerQuery.matches) {
        currentX = targetX = 0.5;
        currentY = targetY = 0.5;
        draw();
        return;
      }
      currentX += (targetX - currentX) * easing;
      currentY += (targetY - currentY) * easing;
      if (Math.abs(targetX - currentX) < 0.001) currentX = targetX;
      if (Math.abs(targetY - currentY) < 0.001) currentY = targetY;
      draw();
      if (currentX !== targetX || currentY !== targetY) raf = requestAnimationFrame(animate);
    };

    const schedule = () => { if (!raf) raf = requestAnimationFrame(animate); };
    const returnToCenter = () => { targetX = targetY = 0.5; schedule(); };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      if (motionQuery.matches || !pointerQuery.matches) return;
      const element = trackingMode === "element" ? trackingElementRef?.current ?? canvas.parentElement : null;
      const rect = element?.getBoundingClientRect();
      const x = rect ? (event.clientX - rect.left) / rect.width : event.clientX / window.innerWidth;
      const y = rect ? (event.clientY - rect.top) / rect.height : event.clientY / window.innerHeight;
      targetX = clamp01(x);
      targetY = clamp01(y);
      schedule();
    };
    const onDocumentOut = (event: MouseEvent) => { if (!event.relatedTarget) returnToCenter(); };
    const onPolicyChange = () => { if (motionQuery.matches || !pointerQuery.matches) returnToCenter(); };
    const area = trackingMode === "element" ? trackingElementRef?.current ?? canvas.parentElement : window;
    area?.addEventListener("pointermove", onPointerMove as EventListener, { passive: true });
    if (trackingMode === "element") area?.addEventListener("pointerleave", returnToCenter);
    else document.addEventListener("mouseout", onDocumentOut);
    window.addEventListener("blur", returnToCenter);
    window.addEventListener("resize", resize);
    motionQuery.addEventListener("change", onPolicyChange);
    pointerQuery.addEventListener("change", onPolicyChange);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const load = async () => {
      try {
        const response = await fetch(manifestSrc, { signal: controller.signal });
        if (!response.ok) throw new Error(`Could not load portrait manifest (${response.status}).`);
        manifest = parseManifest(await response.json());
        const image = new Image();
        image.src = spriteSrc;
        await image.decode();
        if (disposed) return;
        if (image.naturalWidth !== manifest.spriteWidth || image.naturalHeight !== manifest.spriteHeight) {
          throw new Error("Portrait sprite image dimensions do not match its manifest.");
        }
        sprite = image;
        resize();
        draw(true);
        readyRef.current?.();
      } catch (cause) {
        if (disposed || controller.signal.aborted) return;
        errorRef.current?.(cause instanceof Error ? cause : new Error("Could not load the portrait."));
      }
    };
    void load();

    return () => {
      disposed = true;
      controller.abort();
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      area?.removeEventListener("pointermove", onPointerMove as EventListener);
      if (trackingMode === "element") area?.removeEventListener("pointerleave", returnToCenter);
      else document.removeEventListener("mouseout", onDocumentOut);
      window.removeEventListener("blur", returnToCenter);
      window.removeEventListener("resize", resize);
      motionQuery.removeEventListener("change", onPolicyChange);
      pointerQuery.removeEventListener("change", onPolicyChange);
    };
  }, [spriteSrc, manifestSrc, trackingMode, trackingElementRef, smoothing, objectFit]);

  return <canvas ref={canvasRef} className={className}
    style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}
    role={ariaLabel && !ariaHidden ? "img" : undefined}
    aria-label={ariaLabel && !ariaHidden ? ariaLabel : undefined}
    aria-hidden={ariaHidden ?? !ariaLabel} />;
}
