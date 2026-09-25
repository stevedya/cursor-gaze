# Cursor Gaze

A local capture studio and a small React canvas component for a cursor-following portrait. The capture tool makes one 7 × 7 sprite sheet and a JSON manifest. The production component loads those two assets and draws a single frame at a time.

## Run the capture studio

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access works on `localhost` or HTTPS. Click **Enable camera** in the preview or control panel and accept the browser prompt. If permission was previously blocked, open the site controls beside the address bar, set Camera to Allow, and refresh. Sit centered with some space around your head, then press **Start capture** (or Space). After a three-second countdown, follow the moving dot with your head and eyes. The path begins in the center and spirals outward, pausing at every target before taking a frame.

Each frame is saved automatically to IndexedDB in the current browser. Escape or **Pause and keep frames** stops the run without deleting photos. Refreshing restores a complete capture, or lets you resume at the remaining positions. **Delete saved session** asks for confirmation before clearing the frames. Browser storage is local to that browser and site; clearing site data or using another browser removes access to it. Downloaded files are the durable backup.

Once all 49 positions are captured, review the sprite sheet. Click a thumbnail to retake that position. Download both files and put them together in your portfolio:

```text
public/
  portrait/
    portrait-sprite.webp
    portrait-manifest.json
```

Some browsers cannot encode WebP from canvas. The tool then exports `portrait-sprite.png` and writes that filename into the manifest. PNG is larger but lossless. Use the filename actually downloaded.

Capture timing, grid size, output frame dimensions, and WebP quality live in [`src/capture/config.ts`](src/capture/config.ts). The default is a 500 × 500 frame, producing a 3500 × 3500 sprite. This is a practical browser size for a hero portrait; raise it if your final display needs more detail and the device can handle the memory. The camera requests roughly 1920 × 1080 and falls back to its default mode when needed.

The preview and exported frames are both mirrored. With a front-facing webcam, following a target on the left then produces a portrait that appears to look left to the viewer. If your camera driver applies its own mirroring, check the completed grid before using it. The capture tool uses a centered square crop; sit consistently in frame throughout the session.

## Test the portrait in the app

Open **Test portrait** in the header, or visit `http://localhost:5173/#/tester` while the development server is running. The page has text on the left and a square canvas portrait on the right. Move your cursor anywhere in the page to test viewport tracking.

Choose **Sample** for the included illustrated 7 × 7 sprite, **Saved capture** for a complete session stored in this browser, or **My files** to select your own sprite sheet and manifest. The uploader checks that the sprite dimensions match the manifest, then renders it with the same `CursorPortrait` component used on the production site. Uploaded files stay local to the browser tab and need to be selected again after a refresh.

Captures made before automatic saving was added were held only in memory. If that earlier page was refreshed or reset before download, those frames cannot be restored by the new version.

## Use in a React or Next.js portfolio

Copy `src/react/CursorPortrait.tsx` and `src/shared/{grid,manifest}.ts` into your project, keeping their relative imports intact, or adapt the imports to your aliases. The capture-specific code and camera API are not imported by the production component.

```tsx
import { CursorPortrait } from "@/components/CursorPortrait";

export default function Hero() {
  return (
    <section className="hero">
      <CursorPortrait
        spriteSrc="/portrait/portrait-sprite.webp"
        manifestSrc="/portrait/portrait-manifest.json"
        className="heroPortrait"
      />
    </section>
  );
}
```

The canvas fills its container width and has a square aspect ratio by default. Set its height or aspect ratio in CSS if your layout needs a different shape. `objectFit` is `"contain"` by default; use `"cover"` to fill a differently shaped canvas. The component reads rows, columns, and frame dimensions from the manifest, so a future 5 × 5 or 9 × 9 capture will work without changing runtime mapping.

### Props

| Prop | Purpose |
| --- | --- |
| `spriteSrc`, `manifestSrc` | URLs for the downloaded assets. |
| `trackingMode` | `"viewport"` (default) or `"element"`. |
| `trackingElementRef` | Optional ref for element tracking; defaults to the canvas parent. |
| `smoothing` | Easing fraction per animation frame, default `0.18`. |
| `objectFit` | `"contain"` (default) or `"cover"`. |
| `ariaLabel`, `ariaHidden` | Decorative by default. Supply a label to expose it as an image, or explicitly set `ariaHidden`. |
| `onReady`, `onError` | Asset load callbacks. |

For element tracking:

```tsx
const heroRef = useRef<HTMLElement>(null);

<section ref={heroRef}>
  <CursorPortrait
    spriteSrc="/portrait/portrait-sprite.webp"
    manifestSrc="/portrait/portrait-manifest.json"
    trackingMode="element"
    trackingElementRef={heroRef}
  />
</section>
```

The portrait starts at the center, returns to center when the cursor leaves or the window loses focus, and stays centered for reduced-motion and touch-only users. Rendering uses `requestAnimationFrame`, refs instead of per-frame React state, `ResizeObserver`, and device pixel ratio scaling. The sprite image is decoded once per source URL.

## Verify

```bash
npm test
npm run build
```

Tests cover mapping, clamping, source coordinates, the full capture path, and saving/restoring/deleting a frame in IndexedDB. A live camera session still needs a person to verify framing and gaze direction on their own webcam.

## Future improvements

Grid size is centralized but the capture UI currently fixes it at 7 × 7. Useful next steps are a grid size selector, automatic face detection and alignment, transparent background removal, multiple expressions, mobile device orientation support, and WebGL interpolation for genuinely continuous movement.
