class ImageCrop {
    constructor() {
        this.canvas = document.getElementById('cropCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.outputCanvas = document.getElementById('outputCanvas');
        this.outputCtx = this.outputCanvas.getContext('2d');
        this.image = null;
        this.scale = 1; // display scale factor (canvas px / image px)
        this.crop = { x: 0, y: 0, w: 0, h: 0 }; // in image coordinates
        this.aspectRatio = null; // null = free
        this.isDragging = false;
        this.dragMode = null; // 'move', 'tl', 'tr', 'bl', 'br', 'l', 'r', 't', 'b'
        this.dragStart = { x: 0, y: 0 };
        this.cropStart = { x: 0, y: 0, w: 0, h: 0 };
        this.sourceFileName = 'image';

        // Handle size in canvas pixels
        this.handleSize = 8;

        this.init();
    }

    init() {
        this.setupUploadListeners();
        this.setupEditorListeners();
    }

    // -------------------------
    // Upload
    // -------------------------

    setupUploadListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-upload') && e.target !== uploadArea && !e.target.closest('.upload-icon') && e.target.tagName !== 'H3' && e.target.tagName !== 'P') {
                fileInput.click();
            }
        });

        const uploadBtn = uploadArea.querySelector('.btn-upload');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.loadImageFile(e.target.files[0]);
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            });
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files[0] && this.isValidImageFile(files[0])) {
                this.loadImageFile(files[0]);
            }
        });
    }

    isValidImageFile(file) {
        const accepted = ['jpeg', 'jpg', 'png', 'webp', 'bmp', 'tiff', 'gif', 'avif'];
        const ext = file.name.split('.').pop().toLowerCase();
        return accepted.indexOf(ext) !== -1;
    }

    loadImageFile(file) {
        this.sourceFileName = file.name.replace(/\.[^/.]+$/, '');

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.showEditor();
                this.fitCanvasToImage();
                this.resetCrop();
                this.draw();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showEditor() {
        document.getElementById('uploadContainer').style.display = 'none';
        document.getElementById('cropEditor').style.display = 'block';
        document.getElementById('cropOutput').style.display = 'none';
    }

    // -------------------------
    // Canvas sizing
    // -------------------------

    fitCanvasToImage() {
        const maxW = Math.min(800, window.innerWidth - 48);
        const maxH = Math.round(window.innerHeight * 0.6);

        const imgW = this.image.naturalWidth;
        const imgH = this.image.naturalHeight;

        const scaleW = maxW / imgW;
        const scaleH = maxH / imgH;
        this.scale = Math.min(scaleW, scaleH, 1);

        this.canvas.width = Math.round(imgW * this.scale);
        this.canvas.height = Math.round(imgH * this.scale);
    }

    // -------------------------
    // Crop state
    // -------------------------

    resetCrop() {
        this.crop = {
            x: 0,
            y: 0,
            w: this.image.naturalWidth,
            h: this.image.naturalHeight
        };
        this.syncInputs();
    }

    clampCrop() {
        const imgW = this.image.naturalWidth;
        const imgH = this.image.naturalHeight;
        const minSize = 4;

        this.crop.w = Math.max(minSize, Math.min(this.crop.w, imgW - this.crop.x));
        this.crop.h = Math.max(minSize, Math.min(this.crop.h, imgH - this.crop.y));
        this.crop.x = Math.max(0, Math.min(this.crop.x, imgW - this.crop.w));
        this.crop.y = Math.max(0, Math.min(this.crop.y, imgH - this.crop.h));
    }

    syncInputs() {
        document.getElementById('cropX').value = Math.round(this.crop.x);
        document.getElementById('cropY').value = Math.round(this.crop.y);
        document.getElementById('cropW').value = Math.round(this.crop.w);
        document.getElementById('cropH').value = Math.round(this.crop.h);
    }

    // -------------------------
    // Drawing
    // -------------------------

    draw() {
        if (!this.image) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const sc = this.scale;

        // Draw full image
        this.ctx.drawImage(this.image, 0, 0, cw, ch);

        // Darkened overlay outside crop
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, 0, cw, ch);

        // Clip to crop region and redraw image (clear overlay)
        const cx = Math.round(this.crop.x * sc);
        const cy = Math.round(this.crop.y * sc);
        const cwidth = Math.round(this.crop.w * sc);
        const cheight = Math.round(this.crop.h * sc);

        this.ctx.beginPath();
        this.ctx.rect(cx, cy, cwidth, cheight);
        this.ctx.clip();
        this.ctx.drawImage(this.image, 0, 0, cw, ch);
        this.ctx.restore();

        // Crop border
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([6, 3]);
        this.ctx.strokeRect(cx + 0.5, cy + 0.5, cwidth - 1, cheight - 1);
        this.ctx.restore();

        // Rule-of-thirds grid lines
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        for (let i = 1; i < 3; i++) {
            const gx = cx + Math.round(cwidth * i / 3);
            const gy = cy + Math.round(cheight * i / 3);
            this.ctx.beginPath();
            this.ctx.moveTo(gx, cy);
            this.ctx.lineTo(gx, cy + cheight);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(cx, gy);
            this.ctx.lineTo(cx + cwidth, gy);
            this.ctx.stroke();
        }
        this.ctx.restore();

        // Draw handles
        this.drawHandles(cx, cy, cwidth, cheight);
    }

    drawHandles(cx, cy, cw, ch) {
        const hs = this.handleSize;
        const half = hs / 2;

        const handles = this.getHandlePositions(cx, cy, cw, ch);

        this.ctx.save();
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        this.ctx.lineWidth = 1;

        for (const key in handles) {
            const h = handles[key];
            this.ctx.fillRect(h.x - half, h.y - half, hs, hs);
            this.ctx.strokeRect(h.x - half, h.y - half, hs, hs);
        }
        this.ctx.restore();
    }

    getHandlePositions(cx, cy, cw, ch) {
        return {
            tl: { x: cx, y: cy },
            t:  { x: cx + cw / 2, y: cy },
            tr: { x: cx + cw, y: cy },
            l:  { x: cx, y: cy + ch / 2 },
            r:  { x: cx + cw, y: cy + ch / 2 },
            bl: { x: cx, y: cy + ch },
            b:  { x: cx + cw / 2, y: cy + ch },
            br: { x: cx + cw, y: cy + ch }
        };
    }

    // -------------------------
    // Hit testing
    // -------------------------

    getCanvasCropRect() {
        const sc = this.scale;
        return {
            x: Math.round(this.crop.x * sc),
            y: Math.round(this.crop.y * sc),
            w: Math.round(this.crop.w * sc),
            h: Math.round(this.crop.h * sc)
        };
    }

    hitTestHandle(mx, my) {
        const r = this.getCanvasCropRect();
        const handles = this.getHandlePositions(r.x, r.y, r.w, r.h);
        const threshold = this.handleSize + 2;

        for (const key in handles) {
            const h = handles[key];
            if (Math.abs(mx - h.x) <= threshold && Math.abs(my - h.y) <= threshold) {
                return key;
            }
        }
        return null;
    }

    hitTestInside(mx, my) {
        const r = this.getCanvasCropRect();
        return mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h;
    }

    getCursorForHandle(handle) {
        const map = {
            tl: 'nw-resize', tr: 'ne-resize',
            bl: 'sw-resize', br: 'se-resize',
            t: 'n-resize', b: 's-resize',
            l: 'w-resize', r: 'e-resize'
        };
        return map[handle] || 'default';
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (this.canvas.width / rect.width),
            y: (clientY - rect.top) * (this.canvas.height / rect.height)
        };
    }

    // -------------------------
    // Mouse / touch events
    // -------------------------

    setupEditorListeners() {
        // Aspect ratio preset buttons
        const presetBtns = document.querySelectorAll('.crop-presets .quality-btn');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const ratio = btn.dataset.ratio;
                this.setAspectRatio(ratio);
            });
        });

        // Dimension inputs
        document.getElementById('cropX').addEventListener('change', () => this.onInputChange());
        document.getElementById('cropY').addEventListener('change', () => this.onInputChange());
        document.getElementById('cropW').addEventListener('change', () => this.onInputChange());
        document.getElementById('cropH').addEventListener('change', () => this.onInputChange());

        // Action buttons
        document.getElementById('resetCropBtn').addEventListener('click', () => {
            if (!this.image) return;
            this.resetCrop();
            document.getElementById('cropOutput').style.display = 'none';
            this.draw();
        });

        document.getElementById('applyCropBtn').addEventListener('click', () => {
            this.applyCrop();
        });

        document.getElementById('uploadNewBtn').addEventListener('click', () => {
            this.resetToUpload();
        });

        document.getElementById('downloadCropBtn').addEventListener('click', () => {
            this.downloadCrop();
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.onMouseDown(e); }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.onMouseMove(e); }, { passive: false });
        this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.onMouseUp(e); }, { passive: false });
    }

    onMouseDown(e) {
        if (!this.image) return;
        const pos = this.getMousePos(e);
        const handle = this.hitTestHandle(pos.x, pos.y);

        if (handle) {
            this.isDragging = true;
            this.dragMode = handle;
        } else if (this.hitTestInside(pos.x, pos.y)) {
            this.isDragging = true;
            this.dragMode = 'move';
        } else {
            return;
        }

        this.dragStart = { x: pos.x, y: pos.y };
        this.cropStart = { ...this.crop };
    }

    onMouseMove(e) {
        if (!this.image) return;
        const pos = this.getMousePos(e);

        if (!this.isDragging) {
            // Update cursor
            const handle = this.hitTestHandle(pos.x, pos.y);
            if (handle) {
                this.canvas.style.cursor = this.getCursorForHandle(handle);
            } else if (this.hitTestInside(pos.x, pos.y)) {
                this.canvas.style.cursor = 'move';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
            return;
        }

        const dx = (pos.x - this.dragStart.x) / this.scale;
        const dy = (pos.y - this.dragStart.y) / this.scale;

        this.applyDrag(dx, dy);
        this.clampCrop();
        this.syncInputs();
        this.draw();
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.dragMode = null;
        this.canvas.style.cursor = 'crosshair';
    }

    applyDrag(dx, dy) {
        const cs = this.cropStart;
        const ar = this.aspectRatio;
        const minSize = 4;

        switch (this.dragMode) {
            case 'move':
                this.crop.x = cs.x + dx;
                this.crop.y = cs.y + dy;
                break;

            case 'tl': {
                let newX = cs.x + dx;
                let newY = cs.y + dy;
                let newW = cs.w - dx;
                let newH = cs.h - dy;
                if (ar) {
                    newH = newW / ar;
                    newY = cs.y + cs.h - newH;
                }
                if (newW >= minSize && newH >= minSize) {
                    this.crop.x = newX; this.crop.y = newY;
                    this.crop.w = newW; this.crop.h = newH;
                }
                break;
            }
            case 'tr': {
                let newW = cs.w + dx;
                let newY = cs.y + dy;
                let newH = cs.h - dy;
                if (ar) {
                    newH = newW / ar;
                    newY = cs.y + cs.h - newH;
                }
                if (newW >= minSize && newH >= minSize) {
                    this.crop.y = newY;
                    this.crop.w = newW; this.crop.h = newH;
                }
                break;
            }
            case 'bl': {
                let newX = cs.x + dx;
                let newW = cs.w - dx;
                let newH = cs.h + dy;
                if (ar) {
                    newH = newW / ar;
                }
                if (newW >= minSize && newH >= minSize) {
                    this.crop.x = newX;
                    this.crop.w = newW; this.crop.h = newH;
                }
                break;
            }
            case 'br': {
                let newW = cs.w + dx;
                let newH = cs.h + dy;
                if (ar) {
                    newH = newW / ar;
                }
                if (newW >= minSize && newH >= minSize) {
                    this.crop.w = newW; this.crop.h = newH;
                }
                break;
            }
            case 't': {
                let newY = cs.y + dy;
                let newH = cs.h - dy;
                if (ar) {
                    // keep center x, adjust width
                    const newW = newH * ar;
                    this.crop.x = cs.x + (cs.w - newW) / 2;
                    this.crop.w = newW;
                }
                if (newH >= minSize) {
                    this.crop.y = newY; this.crop.h = newH;
                }
                break;
            }
            case 'b': {
                let newH = cs.h + dy;
                if (ar) {
                    const newW = newH * ar;
                    this.crop.x = cs.x + (cs.w - newW) / 2;
                    this.crop.w = newW;
                }
                if (newH >= minSize) {
                    this.crop.h = newH;
                }
                break;
            }
            case 'l': {
                let newX = cs.x + dx;
                let newW = cs.w - dx;
                if (ar) {
                    const newH = newW / ar;
                    this.crop.y = cs.y + (cs.h - newH) / 2;
                    this.crop.h = newH;
                }
                if (newW >= minSize) {
                    this.crop.x = newX; this.crop.w = newW;
                }
                break;
            }
            case 'r': {
                let newW = cs.w + dx;
                if (ar) {
                    const newH = newW / ar;
                    this.crop.y = cs.y + (cs.h - newH) / 2;
                    this.crop.h = newH;
                }
                if (newW >= minSize) {
                    this.crop.w = newW;
                }
                break;
            }
        }
    }

    // -------------------------
    // Aspect ratio
    // -------------------------

    setAspectRatio(ratioStr) {
        if (ratioStr === 'free') {
            this.aspectRatio = null;
            return;
        }

        const parts = ratioStr.split(':');
        if (parts.length === 2) {
            const w = parseFloat(parts[0]);
            const h = parseFloat(parts[1]);
            if (w > 0 && h > 0) {
                this.aspectRatio = w / h;
                this.enforceAspectRatio();
                this.clampCrop();
                this.syncInputs();
                this.draw();
            }
        }
    }

    enforceAspectRatio() {
        if (!this.aspectRatio || !this.image) return;
        // Adjust height to match width with current ratio, centered
        const newH = this.crop.w / this.aspectRatio;
        const centerY = this.crop.y + this.crop.h / 2;
        this.crop.h = newH;
        this.crop.y = centerY - newH / 2;
    }

    // -------------------------
    // Input sync
    // -------------------------

    onInputChange() {
        if (!this.image) return;
        const x = parseFloat(document.getElementById('cropX').value) || 0;
        const y = parseFloat(document.getElementById('cropY').value) || 0;
        const w = parseFloat(document.getElementById('cropW').value) || 1;
        const h = parseFloat(document.getElementById('cropH').value) || 1;

        this.crop = { x, y, w, h };
        this.clampCrop();
        this.syncInputs();
        this.draw();
    }

    // -------------------------
    // Apply / download
    // -------------------------

    applyCrop() {
        if (!this.image) return;

        const sx = Math.round(this.crop.x);
        const sy = Math.round(this.crop.y);
        const sw = Math.round(this.crop.w);
        const sh = Math.round(this.crop.h);

        if (sw <= 0 || sh <= 0) return;

        this.outputCanvas.width = sw;
        this.outputCanvas.height = sh;
        this.outputCtx.drawImage(this.image, sx, sy, sw, sh, 0, 0, sw, sh);

        const outputEl = document.getElementById('cropOutput');
        outputEl.style.display = 'block';
        outputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    downloadCrop() {
        if (!this.outputCanvas.width || !this.outputCanvas.height) {
            this.applyCrop();
        }

        const formatSelect = document.getElementById('outputFormat');
        const format = formatSelect ? formatSelect.value : 'jpeg';
        const mimeType = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
        const ext = format === 'jpeg' ? 'jpg' : format;

        const quality = (mimeType === 'image/jpeg' || mimeType === 'image/webp') ? 0.92 : undefined;
        const dataUrl = this.outputCanvas.toDataURL(mimeType, quality);

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = this.sourceFileName + '_cropped.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // -------------------------
    // Reset
    // -------------------------

    resetToUpload() {
        this.image = null;
        this.crop = { x: 0, y: 0, w: 0, h: 0 };
        this.aspectRatio = null;
        this.isDragging = false;
        this.dragMode = null;
        this.sourceFileName = 'image';

        // Reset file input so same file can be re-selected
        const fileInput = document.getElementById('fileInput');
        fileInput.value = '';

        // Reset aspect ratio buttons
        const presetBtns = document.querySelectorAll('.crop-presets .quality-btn');
        presetBtns.forEach(b => b.classList.remove('active'));
        const freeBtn = document.querySelector('.crop-presets .quality-btn[data-ratio="free"]');
        if (freeBtn) freeBtn.classList.add('active');

        document.getElementById('cropEditor').style.display = 'none';
        document.getElementById('cropOutput').style.display = 'none';
        document.getElementById('uploadContainer').style.display = 'block';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ImageCrop();
});
