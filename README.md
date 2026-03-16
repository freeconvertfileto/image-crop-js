# Image Crop

Crop images with a drag-handle interface, aspect ratio lock, and rule-of-thirds grid, entirely in the browser.

**Live Demo:** https://file-converter-free.com/en/image-tools/image-crop

## How It Works

An interactive crop overlay is drawn on top of the image preview. Eight drag handles (tl, t, tr, l, r, bl, b, br) allow resizing the crop region from any corner or edge, and a central handle enables moving the entire selection. When aspect ratio lock is enabled, any resize operation recalculates both dimensions to maintain the chosen ratio. A rule-of-thirds grid overlay can be toggled to aid composition. Numeric inputs for x, y, width, and height stay synchronized with the drag handles in both directions. The actual crop is performed via `ctx.drawImage` with source-rect parameters targeting only the selected region onto a new canvas sized to the crop dimensions.

## Features

- 8-handle drag interface for precise crop selection (corners + edges + move)
- Rule-of-thirds grid overlay
- Aspect ratio locking with common ratio presets
- Synchronized numeric coordinate inputs
- Output at full native image resolution

## Browser APIs Used

- Canvas API (2D context, `drawImage` with source-rect crop)
- FileReader API
- Mouse events (mousedown, mousemove, mouseup)

## Code Structure

| File | Description |
|------|-------------|
| `image-crop.js` | `ImageCrop` class — 8 drag handles, aspect-ratio lock, grid overlay, and canvas crop export |

## Usage

| Element ID | Purpose |
|------------|---------|
| `dropZone` | Drag-and-drop target for image file |
| `fileInput` | File picker input |
| `cropX` | X coordinate of crop region |
| `cropY` | Y coordinate of crop region |
| `cropWidth` | Width of crop region |
| `cropHeight` | Height of crop region |
| `lockAspect` | Enable aspect ratio locking |
| `aspectSelect` | Aspect ratio preset selector |
| `gridOverlay` | Toggle rule-of-thirds grid |
| `downloadBtn` | Download cropped image |

## License

MIT
