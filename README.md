# Pixelshift Image Converter

A client-side image converter built with React, Vite, and Tailwind CSS. Convert and edit images in your browser; image files are not uploaded to a server.

## Getting started

Requirements: Node.js 18 or later and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL after the server starts. To create and serve a production build:

```bash
npm run build
npm run preview
```

## Features

- Drag and drop or browse for one or more images.
- Convert to PNG, JPG, WebP, or AVIF (AVIF export depends on browser support).
- Adjust output quality for lossy formats.
- Resize by percentage or enter pixel dimensions, with an aspect-ratio lock.
- Rotate by 90 degrees and flip horizontally or vertically.
- Add an optional text watermark.
- Download a converted image or convert a batch and download it as a ZIP file.
- Read HEIC/HEIF images with `heic2any` and TIFF images with UTIF.js.
- Preview image dimensions and file size before conversion.

The browser must support the source format to display it after normalization. Animated GIFs are converted from the browser-decoded frame used by the canvas.

## How conversion works

The app loads images in the browser and uses Canvas to resize, transform, watermark, and encode them. JSZip packages batch results. No image upload endpoint or backend is used. Large HEIC files can take longer to load because the HEIC decoder is downloaded by the browser when needed.

## Project scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Vite development server. |
| `npm run build` | Create the optimized production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
