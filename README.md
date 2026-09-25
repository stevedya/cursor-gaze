# Cursor Gaze

A local capture studio and a small React canvas component for a cursor-following portrait. The capture tool makes a 7 × 7 or 13 × 13 sprite sheet and a JSON manifest. The production component loads those two assets and draws a single frame at a time.

## Run the capture studio

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access works on `localhost` or HTTPS. Choose **7 × 7** for a quicker capture or **13 × 13** for twice as many steps along each axis, then click **Enable camera** in the preview or control panel and accept the browser prompt. If permission was previously blocked, open the site controls beside the address bar, set Camera to Allow, and refresh. Sit centered with some space around your head, then press **Start capture** (or Space). After a three-second countdown, follow the moving dot with your head and eyes. The path begins at the center of the camera preview and spirals outward, pausing at every target before taking a frame.

Each frame is saved automatically to IndexedDB in the current browser. The two grid sizes have separate saved sessions, and switching between them keeps each set of frames. The selected grid size is remembered after refresh. Escape or **Pause and keep frames** stops the run without deleting photos. Refreshing restores a complete capture, or lets you resume at the remaining positions. **Delete saved session** asks for confirmation before clearing the selected grid's frames. Browser storage is local to that browser and site; clearing site data or using another browser removes access to it. Downloaded files are the durable backup.

Once all 49 or 169 positions are captured, review the sprite sheet. Click a thumbnail to retake that position. Download both files and put them together in your portfolio:

```text
public/
  portrait/
    portrait-sprite.webp
    portrait-manifest.json
```

Some browsers cannot encode WebP from canvas. The tool then exports `portrait-sprite.png` and writes that filename into the manifest. PNG is larger but lossless. Use the filename actually downloaded.

Capture timing, grid sizes, output frame dimensions, and WebP quality live in [`src/capture/config.ts`](src/capture/config.ts). The 7 × 7 setting uses 500 × 500 frames and produces a 3500 × 3500 sprite. The 13 × 13 setting uses 300 × 300 frames and produces a 3900 × 3900 sprite to keep the sheet at a practical browser size. The denser capture takes roughly three minutes and reduces visible jumps between directions, though it still switches between discrete frames. The camera requests roughly 1920 × 1080 and falls back to its default mode when needed.

The preview and exported frames are both mirrored. With a front-facing webcam, following a target on the left then produces a portrait that appears to look left to the viewer. If your camera driver applies its own mirroring, check the completed grid before using it. The capture tool uses a centered square crop; sit consistently in frame throughout the session.

## Test the portrait in the app

Open **Test portrait** in the header, or visit `http://localhost:5173/#/tester` while the development server is running. The page has text on the left and a square canvas portrait on the right. Move your cursor anywhere in the page. **Auto position** adjusts the gaze to the portrait's location; **Full page** lets you compare the original mapping.

Choose **Sample** for the included illustrated 7 × 7 sprite, **Saved 7 × 7** or **Saved 13 × 13** for a complete session stored in this browser, or **My files** to select your own sprite sheet and manifest. The uploader checks that the sprite dimensions match the manifest, then renders it with the same `CursorPortrait` component used on the production site. Uploaded files stay local to the browser tab and need to be selected again after a refresh.

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

The canvas fills its container width and has a square aspect ratio by default. Set its height or aspect ratio in CSS if your layout needs a different shape. `objectFit` is `"contain"` by default; use `"cover"` to fill a differently shaped canvas. The component reads rows, columns, and frame dimensions from the manifest, so either capture size works without changing runtime mapping.

The default `trackingMode="portrait"` measures the canvas position on the page. Its center is the neutral gaze point, and the space between that center and each viewport edge maps to the available gaze frames. The measurement updates as the page scrolls or resizes, so a portrait on the right responds naturally without a desktop-specific offset. Use `trackingMode="viewport"` for the previous page-wide mapping, or `trackingMode="element"` to track within a specific container.

### Props

| Prop | Purpose |
| --- | --- |
| `spriteSrc`, `manifestSrc` | URLs for the downloaded assets. |
| `trackingMode` | `"portrait"` (default), `"viewport"`, or `"element"`. |
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

Useful next steps are automatic face detection and alignment, transparent background removal, multiple expressions, mobile device orientation support, and WebGL interpolation for genuinely continuous movement.
