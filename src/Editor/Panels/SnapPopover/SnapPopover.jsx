import React, { Component } from 'react';
import PopupMenu from 'Editor/Util/PopupMenu/PopupMenu';
import './_snappopover.scss';

var classNames = require('classnames');

class SnapPopover extends Component {
  getSetting = (name, fallback) => {
    if (this.props.getToolSetting) {
      const val = this.props.getToolSetting(name);
      if (val !== undefined && val !== null) return val;
    }
    if (this.props.project && this.props.project.toolSettings) {
      try {
        const val = this.props.project.toolSettings.getSetting(name);
        if (val !== undefined && val !== null) return val;
      } catch (e) {}
    }
    return fallback;
  };

  updateSetting = (name, value) => {
    if (this.props.setToolSetting) {
      this.props.setToolSetting(name, value);
    } else if (this.props.project && this.props.project.toolSettings) {
      this.props.project.toolSettings.setSetting(name, value);
    }

    if (this.props.project && this.props.project.view) {
      this.props.project.view.render();
    }

    if (this.props.projectDidChange) {
      this.props.projectDidChange({ actionName: `Update ${name}` });
    }

    this.forceUpdate();
  };

  toggleSetting = (name, defaultVal = false) => {
    const current = this.getSetting(name, defaultVal);
    this.updateSetting(name, !current);
  };

  changeGridSize = (delta) => {
    const current = this.getSetting('gridSize', 20);
    const next = Math.max(5, Math.min(200, current + delta));
    this.updateSetting('gridSize', next);
  };

  render() {
    const { isOpen, toggle, renderSize } = this.props;

    const gridEnabled = this.getSetting('gridEnabled', false);
    const gridSize = this.getSetting('gridSize', 20);
    const gridOpacity = this.getSetting('gridOpacity', 0.25);
    const snapGrid = this.getSetting('snapGrid', false);
    const snapObject = this.getSetting('snapObject', true);
    const snapCanvas = this.getSetting('snapCanvas', true);
    const snapTolerance = this.getSetting('snapTolerance', 8);

    const sizePresets = [10, 20, 40, 50, 100];
    const opacityPresets = [
      { label: '15%', val: 0.15 },
      { label: '25%', val: 0.25 },
      { label: '40%', val: 0.40 },
      { label: '60%', val: 0.60 }
    ];
    const tolerancePresets = [4, 8, 12, 16];

    return (
      <PopupMenu
        mobile={renderSize === 'small'}
        isOpen={isOpen}
        toggle={toggle}
        target="snap-popover-button"
        className="snap-actions-popover"
      >
        <div
          className={classNames('snap-popover-widget', renderSize === 'small' && 'vertical')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="snap-widget-header">
            <div className="snap-widget-title-group">
              <svg className="snap-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 11a8 8 0 0 0 16 0V4h-4v7a4 4 0 0 1-8 0V4H4v7z" />
                <line x1="4" y1="8" x2="8" y2="8" />
                <line x1="16" y1="8" x2="20" y2="8" />
              </svg>
              <span className="snap-widget-title">SNAP & GRIGLIA</span>
            </div>
            <div className="snap-status-pill">
              {(snapObject || snapCanvas || snapGrid || gridEnabled) ? (
                <span className="status-badge active">ATTIVO</span>
              ) : (
                <span className="status-badge">DISATTIVO</span>
              )}
            </div>
          </div>

          <div className="snap-sections-container">
            {/* Sezione SNAP [ Oggetto | Canva ] */}
            <div className="snap-section">
              <div className="snap-section-header">
                <span className="snap-section-title">SNAP MAGNETICO</span>
                <span className="snap-section-hint">Guida automatica allineamento</span>
              </div>

              {/* Main Dual Buttons: Oggetto | Canva */}
              <div className="snap-dual-buttons-row">
                <button
                  type="button"
                  className={classNames('snap-toggle-card', { active: snapObject })}
                  onClick={() => this.toggleSetting('snapObject', true)}
                  title="Snap agli altri oggetti della scena"
                >
                  <div className="card-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="12" height="12" rx="2" />
                      <path d="M10 3h10a2 2 0 0 1 2 2v10" />
                    </svg>
                  </div>
                  <div className="card-info">
                    <div className="card-title-row">
                      <span className="card-title">Oggetto</span>
                      <span className={classNames('card-check', { on: snapObject })}>
                        {snapObject ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <span className="card-desc">Bordi e Centri Oggetti</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={classNames('snap-toggle-card', { active: snapCanvas })}
                  onClick={() => this.toggleSetting('snapCanvas', true)}
                  title="Snap ai bordi e al centro del foglio di lavoro"
                >
                  <div className="card-icon-wrap">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                  <div className="card-info">
                    <div className="card-title-row">
                      <span className="card-title">Canva</span>
                      <span className={classNames('card-check', { on: snapCanvas })}>
                        {snapCanvas ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <span className="card-desc">Bordi e Centro Foglio</span>
                  </div>
                </button>
              </div>

              {/* Snap to Grid Checkbox / Row */}
              <div className="snap-sub-option-row">
                <button
                  type="button"
                  className={classNames('snap-sub-pill-btn', { active: snapGrid })}
                  onClick={() => this.toggleSetting('snapGrid', false)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                  </svg>
                  <span>Aggancia ai nodi Griglia</span>
                  <span className={classNames('pill-state-tag', { on: snapGrid })}>
                    {snapGrid ? 'ATTIVO' : 'OFF'}
                  </span>
                </button>

                {/* Snap Tolerance Presets */}
                <div className="snap-tolerance-group">
                  <span className="group-label">Raggio:</span>
                  <div className="pills-row">
                    {tolerancePresets.map((tol) => (
                      <button
                        key={tol}
                        type="button"
                        className={classNames('param-pill', { active: snapTolerance === tol })}
                        onClick={() => this.updateSetting('snapTolerance', tol)}
                      >
                        {tol}px
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="snap-section-divider" />

            {/* Sezione GRIGLIA (con parametri) */}
            <div className="snap-section">
              <div className="snap-section-header with-toggle">
                <div className="title-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                  <span className="snap-section-title">GRIGLIA CANVAS</span>
                </div>

                <button
                  type="button"
                  className={classNames('switch-toggle-btn', { on: gridEnabled })}
                  onClick={() => this.toggleSetting('gridEnabled', false)}
                  aria-pressed={gridEnabled}
                >
                  <span className="switch-knob" />
                  <span className="switch-text">{gridEnabled ? 'VISIBILE' : 'NASCOSTA'}</span>
                </button>
              </div>

              {/* Parametri Griglia */}
              <div className={classNames('grid-params-block', { disabled: !gridEnabled })}>
                {/* Parametro 1: Dimensione Cella / Passo */}
                <div className="param-row">
                  <div className="param-label-group">
                    <span className="param-label">Dimensione Cella</span>
                    <span className="param-value-tag">{gridSize} px</span>
                  </div>

                  <div className="stepper-and-presets">
                    <div className="param-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => this.changeGridSize(-5)}
                        title="Riduci cella (-5px)"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="stepper-input"
                        min="5"
                        max="200"
                        step="5"
                        value={gridSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 5 && val <= 200) {
                            this.updateSetting('gridSize', val);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => this.changeGridSize(5)}
                        title="Aumenta cella (+5px)"
                      >
                        +
                      </button>
                    </div>

                    <div className="pills-row">
                      {sizePresets.map((size) => (
                        <button
                          key={size}
                          type="button"
                          className={classNames('param-pill', { active: gridSize === size })}
                          onClick={() => this.updateSetting('gridSize', size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Parametro 2: Opacità Griglia */}
                <div className="param-row">
                  <div className="param-label-group">
                    <span className="param-label">Opacità Linee</span>
                    <span className="param-value-tag">{Math.round(gridOpacity * 100)}%</span>
                  </div>

                  <div className="pills-row">
                    {opacityPresets.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className={classNames('param-pill', { active: Math.abs(gridOpacity - item.val) < 0.05 })}
                        onClick={() => this.updateSetting('gridOpacity', item.val)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PopupMenu>
    );
  }
}

export default SnapPopover;
