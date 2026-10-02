/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Editor.
 *
 * Wick Editor is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Editor is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Editor.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { Component } from 'react';
import WickModal from 'Editor/Modals/WickModal/WickModal';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';
import './_imagetracingmodal.scss';

class ImageTracingModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mode: 'color', // 'color' or 'bw'
      // Color mode settings:
      colorPasses: 6, // 2 to 16
      colorPaletteType: 'scan', // 'scan' (auto-clustering) or 'posterize'
      stackMode: 'stacked', // 'stacked' or 'cutout'
      // Black & White mode settings:
      threshold: 128,
      invert: false,
      fillColor: '#000000',
      // Shared Potrace parameters:
      turdSize: 3,
      optTolerance: 0.2,
      alphaMax: 1.0,
      turnPolicy: 4, // 4 = Minority, 1 = Black, 2 = White, 3 = Majority
      // UI State:
      activeTab: 'preview', // 'preview', 'original', 'split'
      isProcessing: false,
      pathCount: 0,
      extractedColors: [],
    };
    this.canvasRef = React.createRef();
    this.debounceTimeout = null;
    this.cachedImage = null;
    this.lastLayers = [];
    this.lastSvgStr = '';
    this.imageWidth = 0;
    this.imageHeight = 0;
  }

  componentDidMount() {
    this.extractImageSource();
  }

  componentDidUpdate(prevProps) {
    if (this.props.open && !prevProps.open) {
      this.extractImageSource();
    }
  }

  componentWillUnmount() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
  }

  extractImageSource = () => {
    const selectedObj = this.props.selectedObject;
    if (!selectedObj) return;

    let imgElement = null;
    if (selectedObj.view && selectedObj.view.item && selectedObj.view.item.image) {
      imgElement = selectedObj.view.item.image;
    } else if (selectedObj.view && selectedObj.view.item && selectedObj.view.item.canvas) {
      imgElement = selectedObj.view.item.canvas;
    }

    if (imgElement) {
      this.cachedImage = imgElement;
      this.triggerTrace();
    }
  };

  triggerTrace = () => {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.debounceTimeout = setTimeout(() => {
      this.runTracePreview();
    }, 120);
  };

  rgbToHex = (r, g, b) => {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  };

  /**
   * Quantize image colors using median-cut / color clustering to get top N representative palette colors.
   */
  extractPalette = (data, numColors) => {
    const pixels = [];
    const step = Math.max(1, Math.floor(data.length / (4 * 5000))); // sample up to 5000 pixels for fast palette extraction
    for (let i = 0; i < data.length; i += 4 * step) {
      const a = data[i + 3];
      if (a >= 64) {
        pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
      }
    }

    if (pixels.length === 0) {
      return [{ r: 0, g: 0, b: 0, hex: '#000000' }];
    }

    // Median-cut algorithm to partition pixels into numColors boxes
    const boxes = [pixels];
    while (boxes.length < numColors) {
      let bestIdx = -1;
      let maxRange = -1;
      let splitChannel = 'r';

      for (let b = 0; b < boxes.length; b++) {
        const box = boxes[b];
        if (box.length < 2) continue;
        let minR = 255, maxR = 0;
        let minG = 255, maxG = 0;
        let minB = 255, maxB = 0;
        for (let p = 0; p < box.length; p++) {
          const px = box[p];
          if (px.r < minR) minR = px.r;
          if (px.r > maxR) maxR = px.r;
          if (px.g < minG) minG = px.g;
          if (px.g > maxG) maxG = px.g;
          if (px.b < minB) minB = px.b;
          if (px.b > maxB) maxB = px.b;
        }
        const rangeR = maxR - minR;
        const rangeG = maxG - minG;
        const rangeB = maxB - minB;
        const currentMax = Math.max(rangeR, rangeG, rangeB);
        if (currentMax > maxRange) {
          maxRange = currentMax;
          bestIdx = b;
          splitChannel = rangeR >= rangeG && rangeR >= rangeB ? 'r' : (rangeG >= rangeB ? 'g' : 'b');
        }
      }

      if (bestIdx === -1 || maxRange < 2) break;

      const targetBox = boxes.splice(bestIdx, 1)[0];
      targetBox.sort((a, b) => a[splitChannel] - b[splitChannel]);
      const mid = Math.floor(targetBox.length / 2);
      boxes.push(targetBox.slice(0, mid));
      boxes.push(targetBox.slice(mid));
    }

    // Calculate average color for each box
    const palette = boxes.map((box) => {
      let sumR = 0, sumG = 0, sumB = 0;
      for (let p = 0; p < box.length; p++) {
        sumR += box[p].r;
        sumG += box[p].g;
        sumB += box[p].b;
      }
      const r = Math.round(sumR / box.length);
      const g = Math.round(sumG / box.length);
      const b = Math.round(sumB / box.length);
      const lum = 0.2126 * r + 0.7153 * g + 0.0721 * b;
      return { r, g, b, lum, hex: this.rgbToHex(r, g, b) };
    });

    // Sort by luminance (darkest to lightest for natural background->foreground stacking)
    palette.sort((a, b) => a.lum - b.lum);
    return palette;
  };

  runTracePreview = () => {
    if (!this.cachedImage || !window.potrace) return;

    this.setState({ isProcessing: true });

    try {
      const img = this.cachedImage;
      const width = img.naturalWidth || img.videoWidth || img.width;
      const height = img.naturalHeight || img.videoHeight || img.height;

      if (!width || !height) {
        this.setState({ isProcessing: false });
        return;
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const potrace = window.potrace;

      const policy = Number(this.state.turnPolicy);
      const turdSize = Number(this.state.turdSize);
      const alphaMax = Number(this.state.alphaMax);
      const optTolerance = Number(this.state.optTolerance);
      const optCurve = true;

      this.imageWidth = width;
      this.imageHeight = height;

      const layers = [];
      let totalPaths = 0;

      if (this.state.mode === 'color') {
        // --- MULTI-COLOR TRACING ---
        const numPasses = Math.max(2, Math.min(16, Number(this.state.colorPasses)));
        const palette = this.extractPalette(data, numPasses);
        this.setState({ extractedColors: palette.map((p) => p.hex) });

        // Map every pixel to closest palette index
        const pixelLabels = new Uint8Array(width * height);
        for (let i = 0, p = 0; i < data.length; i += 4, ++p) {
          const a = data[i + 3];
          if (a < 64) {
            pixelLabels[p] = 255; // transparent
            continue;
          }
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          let minD = Infinity;
          let bestCol = 0;
          for (let c = 0; c < palette.length; c++) {
            const pal = palette[c];
            // Weighted Euclidean distance (color perception)
            const dr = r - pal.r;
            const dg = g - pal.g;
            const db = b - pal.b;
            const dist = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
            if (dist < minD) {
              minD = dist;
              bestCol = c;
            }
          }
          pixelLabels[p] = bestCol;
        }

        // Trace each color layer
        // If stackMode === 'stacked': each layer covers itself + lighter layers (or dark-to-light accumulative)
        for (let c = 0; c < palette.length; c++) {
          const colorInfo = palette[c];
          const bm = new potrace.Bitmap(width, height);
          let activePixelCount = 0;

          for (let p = 0; p < pixelLabels.length; p++) {
            const label = pixelLabels[p];
            let active = false;
            if (label !== 255) {
              if (this.state.stackMode === 'stacked') {
                // Stacked: includes current and subsequent layers to avoid white seams
                active = label >= c;
              } else {
                // Cutout: strictly only pixels belonging to this color
                active = label === c;
              }
            }
            if (active) {
              bm.data[p] = 1;
              activePixelCount++;
            } else {
              bm.data[p] = 0;
            }
          }

          if (activePixelCount > turdSize) {
            const pathList = potrace.PathList.fromBitmap(bm, policy, turdSize, alphaMax, optCurve, optTolerance);
            if (pathList.length > 0) {
              layers.push({
                color: colorInfo.hex,
                pathList: pathList,
              });
              totalPaths += pathList.length;
            }
          }
        }
      } else {
        // --- MONOCHROME / BLACK & WHITE TRACING ---
        const bm = new potrace.Bitmap(width, height);
        const threshold = this.state.threshold;
        const invert = this.state.invert;

        for (let i = 0, j = 0, l = data.length; i < l; i += 4, ++j) {
          const alpha = data[i + 3];
          const lum = 0.2126 * data[i] + 0.7153 * data[i + 1] + 0.0721 * data[i + 2];
          let isDark = lum < threshold;
          if (alpha < 128) {
            isDark = false;
          }
          if (invert) {
            isDark = !isDark;
          }
          bm.data[j] = isDark ? 1 : 0;
        }

        const pathList = potrace.PathList.fromBitmap(bm, policy, turdSize, alphaMax, optCurve, optTolerance);
        layers.push({
          color: this.state.fillColor,
          pathList: pathList,
        });
        totalPaths = pathList.length;
      }

      this.lastLayers = layers;

      // Construct multi-path SVG
      const svgParts = [
        `<svg version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
      ];
      layers.forEach((layer) => {
        const pathData = [];
        for (let i = 0, len = layer.pathList.length; i < len; ++i) {
          const curve = layer.pathList[i].curve;
          const c = curve.c;
          const n = curve.n * 3;
          pathData.push(`M${c[n - 1].x.toFixed(2)} ${c[n - 1].y.toFixed(2)} `);
          for (let j = 0; j < n; j += 3) {
            if (curve.tag[j / 3] === 0) {
              pathData.push(`C ${c[j].x.toFixed(2)} ${c[j].y.toFixed(2)}, ${c[j + 1].x.toFixed(2)} ${c[j + 1].y.toFixed(2)}, ${c[j + 2].x.toFixed(2)} ${c[j + 2].y.toFixed(2)} `);
            } else {
              pathData.push(`L ${c[j + 1].x.toFixed(2)} ${c[j + 1].y.toFixed(2)} `);
              pathData.push(`L ${c[j + 2].x.toFixed(2)} ${c[j + 2].y.toFixed(2)} `);
            }
          }
        }
        svgParts.push(
          `<path d="${pathData.join('')}" fill="${layer.color}" stroke="none" fill-rule="evenodd" />`
        );
      });
      svgParts.push('</svg>');
      this.lastSvgStr = svgParts.join('');

      this.renderCanvasPreview(tempCanvas, layers, width, height);

      this.setState({
        isProcessing: false,
        pathCount: totalPaths,
      });
    } catch (err) {
      console.error('Image tracing preview error:', err);
      this.setState({ isProcessing: false });
    }
  };

  renderCanvasPreview = (origCanvas, layers, width, height) => {
    const canvas = this.canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    const activeTab = this.state.activeTab;

    if (activeTab === 'original') {
      ctx.drawImage(origCanvas, 0, 0);
    } else if (activeTab === 'preview') {
      this.drawCheckerboard(ctx, width, height);
      this.drawVectorLayers(ctx, layers);
    } else if (activeTab === 'split') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width / 2, height);
      ctx.clip();
      ctx.drawImage(origCanvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(width / 2, 0, width / 2, height);
      ctx.clip();
      this.drawCheckerboard(ctx, width, height);
      this.drawVectorLayers(ctx, layers);
      ctx.restore();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
    }
  };

  drawVectorLayers = (ctx, layers) => {
    layers.forEach((layer) => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      for (let i = 0, len = layer.pathList.length; i < len; ++i) {
        const curve = layer.pathList[i].curve;
        const c = curve.c;
        const n = curve.n * 3;
        ctx.moveTo(c[n - 1].x, c[n - 1].y);
        for (let j = 0; j < n; j += 3) {
          if (curve.tag[j / 3] === 0) {
            ctx.bezierCurveTo(c[j].x, c[j].y, c[j + 1].x, c[j + 1].y, c[j + 2].x, c[j + 2].y);
          } else {
            ctx.lineTo(c[j + 1].x, c[j + 1].y);
            ctx.lineTo(c[j + 2].x, c[j + 2].y);
          }
        }
      }
      ctx.fill('evenodd');
    });
  };

  drawCheckerboard = (ctx, width, height) => {
    const size = 16;
    for (let x = 0; x < width; x += size) {
      for (let y = 0; y < height; y += size) {
        ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#1f1f23' : '#28282e';
        ctx.fillRect(x, y, size, size);
      }
    }
  };

  handleParamChange = (key, value) => {
    this.setState({ [key]: value }, () => {
      this.triggerTrace();
    });
  };

  handleTabChange = (tab) => {
    this.setState({ activeTab: tab }, () => {
      this.runTracePreview();
    });
  };

  handleConfirm = () => {
    if (!this.lastSvgStr) {
      this.runTracePreview();
    }
    if (this.props.traceSelectedImage) {
      this.props.traceSelectedImage({
        svg: this.lastSvgStr,
        mode: this.state.mode,
        fillColor: this.state.fillColor,
        layers: this.lastLayers,
      });
    }
    this.props.toggle();
  };

  render() {
    const {
      mode,
      colorPasses,
      stackMode,
      threshold,
      turdSize,
      optTolerance,
      alphaMax,
      turnPolicy,
      invert,
      fillColor,
      activeTab,
      isProcessing,
      pathCount,
      extractedColors,
    } = this.state;

    return (
      <WickModal
        open={this.props.open}
        toggle={this.props.toggle}
        className="image-tracing-modal-body"
        overlayClassName="image-tracing-modal-overlay"
      >
        <div className="image-tracing-modal-header">
          <div className="image-tracing-modal-title">
            <span>Image Tracing</span>
            <span className="image-tracing-sub"> (Vettorializzazione a Colori &amp; Monocromatica)</span>
          </div>

          {/* Mode Switcher (Color vs B&W) */}
          <div className="tracing-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${mode === 'color' ? 'active' : ''}`}
              onClick={() => this.handleParamChange('mode', 'color')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 0 20v-20z" fill="currentColor" />
              </svg>
              A Colori (Color Passes)
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'bw' ? 'active' : ''}`}
              onClick={() => this.handleParamChange('mode', 'bw')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
              </svg>
              Bianco e Nero (1 Colore)
            </button>
          </div>
        </div>

        <div className="image-tracing-modal-content">
          <div className="image-tracing-controls">
            <div className="image-tracing-section-title">
              {mode === 'color' ? 'Parametri Colore' : 'Parametri Monocromatici'}
            </div>

            {/* COLOR MODE CONTROLS */}
            {mode === 'color' && (
              <>
                <div className="image-tracing-control-row">
                  <div className="control-label-wrapper">
                    <label htmlFor="trace-colorpasses">Numero di Passaggi Colore (Passes):</label>
                    <span className="control-val">{colorPasses} colori</span>
                  </div>
                  <input
                    id="trace-colorpasses"
                    type="range"
                    min="2"
                    max="16"
                    step="1"
                    value={colorPasses}
                    onChange={(e) => this.handleParamChange('colorPasses', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="image-tracing-control-row">
                  <label htmlFor="trace-stackmode">Metodo di Sovrapposizione (Stacking):</label>
                  <select
                    id="trace-stackmode"
                    className="image-tracing-select"
                    value={stackMode}
                    onChange={(e) => this.handleParamChange('stackMode', e.target.value)}
                  >
                    <option value="stacked">Sovrapposti (Stacked - Senza Fessure)</option>
                    <option value="cutout">Ritagliati (Cutout - Forme Singole)</option>
                  </select>
                </div>

                {/* Palette preview swatches */}
                {extractedColors.length > 0 && (
                  <div className="image-tracing-palette-box">
                    <div className="palette-label">Tavolozza Rilevata ({extractedColors.length}):</div>
                    <div className="palette-swatches">
                      {extractedColors.map((hex, idx) => (
                        <div
                          key={idx}
                          className="palette-swatch"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* B&W MODE CONTROLS */}
            {mode === 'bw' && (
              <>
                <div className="image-tracing-control-row">
                  <div className="control-label-wrapper">
                    <label htmlFor="trace-threshold">Soglia Luminosità (Threshold):</label>
                    <span className="control-val">{threshold}</span>
                  </div>
                  <input
                    id="trace-threshold"
                    type="range"
                    min="1"
                    max="254"
                    step="1"
                    value={threshold}
                    onChange={(e) => this.handleParamChange('threshold', parseInt(e.target.value, 10))}
                  />
                </div>

                <div className="image-tracing-control-row-inline">
                  <div className="color-field">
                    <label htmlFor="trace-fillcolor">Colore Vettoriale:</label>
                    <input
                      id="trace-fillcolor"
                      type="color"
                      value={fillColor}
                      onChange={(e) => this.handleParamChange('fillColor', e.target.value)}
                    />
                  </div>
                  <div className="checkbox-field">
                    <label>
                      <input
                        type="checkbox"
                        checked={invert}
                        onChange={(e) => this.handleParamChange('invert', e.target.checked)}
                      />
                      <span>Inverti</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="image-tracing-section-title" style={{ marginTop: '10px' }}>
              Ottimizzazione Curve &amp; Dettaglio
            </div>

            {/* SHARED CONTROLS */}
            <div className="image-tracing-control-row">
              <div className="control-label-wrapper">
                <label htmlFor="trace-turdsize">Filtro Rumore / Dettaglio (Specks):</label>
                <span className="control-val">{turdSize}px</span>
              </div>
              <input
                id="trace-turdsize"
                type="range"
                min="0"
                max="40"
                step="1"
                value={turdSize}
                onChange={(e) => this.handleParamChange('turdSize', parseInt(e.target.value, 10))}
              />
            </div>

            <div className="image-tracing-control-row">
              <div className="control-label-wrapper">
                <label htmlFor="trace-tolerance">Tolleranza Curve (Smoothness):</label>
                <span className="control-val">{optTolerance}</span>
              </div>
              <input
                id="trace-tolerance"
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={optTolerance}
                onChange={(e) => this.handleParamChange('optTolerance', parseFloat(e.target.value))}
              />
            </div>

            <div className="image-tracing-control-row">
              <div className="control-label-wrapper">
                <label htmlFor="trace-alphamax">Angoli Vivaci (Corner Angle):</label>
                <span className="control-val">{alphaMax}</span>
              </div>
              <input
                id="trace-alphamax"
                type="range"
                min="0"
                max="1.5"
                step="0.1"
                value={alphaMax}
                onChange={(e) => this.handleParamChange('alphaMax', parseFloat(e.target.value))}
              />
            </div>

            <div className="image-tracing-control-row">
              <label htmlFor="trace-turnpolicy">Politica di svolta (Turn Policy):</label>
              <select
                id="trace-turnpolicy"
                className="image-tracing-select"
                value={turnPolicy}
                onChange={(e) => this.handleParamChange('turnPolicy', parseInt(e.target.value, 10))}
              >
                <option value={4}>Minoranza (Consigliato)</option>
                <option value={3}>Maggioranza</option>
                <option value={1}>Nero</option>
                <option value={2}>Bianco</option>
              </select>
            </div>

            <div className="image-tracing-info-badge">
              <span>{isProcessing ? 'Elaborazione in corso...' : `Percorsi vettoriali generati: ${pathCount}`}</span>
            </div>
          </div>

          <div className="image-tracing-preview-container">
            <div className="image-tracing-preview-tabs">
              <button
                type="button"
                className={`preview-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => this.handleTabChange('preview')}
              >
                Vettoriale Tracciato
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${activeTab === 'split' ? 'active' : ''}`}
                onClick={() => this.handleTabChange('split')}
              >
                Confronto Dividi (Split)
              </button>
              <button
                type="button"
                className={`preview-tab-btn ${activeTab === 'original' ? 'active' : ''}`}
                onClick={() => this.handleTabChange('original')}
              >
                Originale
              </button>
            </div>

            <div className="image-tracing-canvas-wrapper">
              <canvas ref={this.canvasRef} className="image-tracing-preview-canvas" />
            </div>
          </div>
        </div>

        <div className="image-tracing-modal-footer">
          <div className="image-tracing-footer-left">
            <span className="hint-text">
              {mode === 'color'
                ? `Verrà creata una seconda istanza raggruppata a ${colorPasses} colori nel frame attivo.`
                : 'Verrà creata una seconda istanza vettoriale nel frame attivo.'}
            </span>
          </div>
          <div className="image-tracing-footer-right">
            <ActionButton
              className="image-tracing-btn-cancel"
              color="gray"
              action={this.props.toggle}
              text="Annulla"
            />
            <ActionButton
              className="image-tracing-btn-confirm"
              color="gray-green"
              action={this.handleConfirm}
              text="OK - Crea Istanza"
            />
          </div>
        </div>
      </WickModal>
    );
  }
}

export default ImageTracingModal;
