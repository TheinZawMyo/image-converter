# Frontend-Only Image Converter Application Plan

This document details the complete technical and implementation plan for building a 100% Client-side (Frontend-only) Image Converter web application.

---

## 1. Supported Input & Output Formats Strategy

### Input Formats (Supported via Browser APIs & Client Libraries)
* **Standard Web Formats (Native Canvas Support):**
  * `PNG`, `JPEG / JPG`, `WebP`, `SVG`, `GIF` (first frame), `BMP`, `AVIF`
* **Extended Formats (via Lightweight Client Libraries):**
  * `HEIC / HEIF` (Apple image format) — Supported by integrating `heic2any` library.
  * `TIFF` — Supported by integrating `UTIF.js`.

### Output Formats & Encoding Options
* **Standard Outputs (Canvas API):**
  * **JPEG (`image/jpeg`)**: Supports quality compression parameter (`0.0` to `1.0`).
  * **PNG (`image/png`)**: Lossless transparency preservation.
  * **WebP (`image/webp`)**: Superior compression ratio with quality settings and transparency.
  * **AVIF (`image/avif`)**: High efficiency (supported in modern browsers).

---

## 2. Feature Specification & UI Architecture

### 2.1 File Upload & Preview
* **Drag-and-Drop Zone**: Intuitive interface supporting single and batch image files.
* **Instant Client-Side Preview**: Memory-efficient rendering using `URL.createObjectURL()`.
* **File Metadata Display**: Original file name, dimensions (width $\times$ height), and original file size (KB/MB).

### 2.2 Conversion & Manipulation Settings
* **Target Format Selection**: Dropdown menu to choose destination format (PNG, JPEG, WebP, AVIF).
* **Quality / Compression Slider**:
  * Range: `10%` to `100%` (maps to `0.1` to `1.0` blob encoding quality).
  * Live estimation or instant re-encoding option.
* **Resizing Controls**:
  * **Aspect Ratio Locking**: Toggle to keep original proportional dimensions.
  * **Custom Dimensions**: Manual pixel input (`Width` $\times$ `Height`) or scale percentage (`25%`, `50%`, `75%`).
* **Basic Editing Operations**:
  * **Rotation**: $90^\circ$, $180^\circ$, $270^\circ$ clockwise transformation using Canvas context rotation.
  * **Flipping**: Horizontal and Vertical mirroring.
  * **Watermarking**: Optional text watermark overlay onto the canvas before export.

### 2.3 Download & Export Handling
* **Single File Download**: Immediate trigger via dynamic `<a>` download attributes.
* **Batch / Bulk Conversion**:
  * Convert multiple files asynchronously using Web Workers (to avoid freezing the main UI thread).
  * **ZIP Archive Generation**: Download all converted images bundled together using `JSZip`.

---

## 3. Technical Stack & Implementation Architecture

### Tech Stack Recommendation
* **Framework**: React / Vite (Fast SPA setup, clean component architecture)
* **Styling**: Tailwind CSS (Responsive and modern UI design)
* **Icons & UI components**: Lucide-React
* **Helper Libraries**:
  * `heic2any`: Converts HEIC files into standard blobs client-side.
  * `jszip`: Packages multiple converted images into a `.zip` bundle.
  * `file-saver`: Utility for triggering cross-browser file downloads.

---

## 4. Implementation Steps & Development Phases

### Phase 1: Core Conversion Engine (Canvas Utility)
1. Write a standalone JavaScript helper module using `FileReader` and HTML5 `Canvas`.
2. Implement image loading to HTMLImageElement.
3. Draw images onto an off-screen `HTMLCanvasElement`.
4. Render adjustments (Resize $\rightarrow$ Rotate $\rightarrow$ Apply Quality).
5. Convert Canvas to Blob using `canvas.toBlob(blob => ..., mimeType, quality)`.

### Phase 2: User Interface & File Processing
1. Build file drop-zone component.
2. Implement local state management for image upload queues.
3. Add conversion controls (Format selector, Quality slider, Dimension inputs).
4. Implement conversion queue execution loop.

### Phase 3: Advanced Client-side Features & Optimization
1. Integrate `heic2any` for iOS image compatibility.
2. Add `JSZip` integration for batch download functionality.
3. Memory cleanup: Ensure `URL.revokeObjectURL()` is called when previews/files are removed to avoid memory leaks.

---

## 5. Summary Matrix of Browser Capabilities

| Feature | Browser API / Library | Processing Location |
| :--- | :--- | :--- |
| File Reading | `FileReader API` / `URL.createObjectURL` | Client-side (RAM) |
| Format Conversion | HTML5 `<canvas>` + `toBlob()` | Client-side (GPU/CPU) |
| HEIC Support | `heic2any` Library | Client-side (JavaScript) |
| ZIP Packaging | `JSZip` Library | Client-side (Web Worker/RAM) |
| Privacy | N/A (Zero network transfer) | 100% Local |