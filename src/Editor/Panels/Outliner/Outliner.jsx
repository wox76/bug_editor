import React, { Component } from 'react';
import WickColorPicker from 'Editor/Util/ColorPicker/WickColorPicker';
import { Popover } from 'reactstrap';
import './_outliner.scss';

var classNames = require('classnames');

class Outliner extends Component {
  constructor(props) {
    super(props);
    this.state = {
      menuLayer: null,
      renamingLayerUuid: null,
      renamingName: '',
      bgColorPickerOpen: false,
    };
  }

  handleAddLayer = (e) => {
    if (e) e.stopPropagation();
    const activeTimeline = this.props.project && this.props.project.activeTimeline;
    if (!activeTimeline) return;

    const newLayer = new window.Wick.Layer();
    activeTimeline.addLayer(newLayer);
    const newIndex = activeTimeline.layers.length - 1;
    if (this.props.setActiveLayerIndex) {
      this.props.setActiveLayerIndex(newIndex);
    }
    if (this.props.projectDidChange) {
      this.props.projectDidChange({ actionName: 'Add Layer' });
    }
  };

  handleSelectLayer = (layer, e) => {
    if (e) e.stopPropagation();
    if (this.props.setActiveLayerIndex) {
      this.props.setActiveLayerIndex(layer.index);
    }
  };

  handleToggleVisibility = (layer, e) => {
    if (e) e.stopPropagation();
    if (this.props.toggleHidden) {
      this.props.toggleHidden(layer);
    } else {
      layer.hidden = !layer.hidden;
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Toggle Layer Hidden' });
      }
    }
  };

  handleOpenMenu = (layer, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (this.props.setActiveLayerIndex) {
      this.props.setActiveLayerIndex(layer.index);
    }
    if (this.state.menuLayer && this.state.menuLayer.uuid === layer.uuid) {
      this.setState({ menuLayer: null });
    } else {
      this.setState({ menuLayer: layer, renamingLayerUuid: null });
    }
  };

  handleCloseMenu = () => {
    this.setState({ menuLayer: null });
  };

  handleRename = () => {
    const layer = this.state.menuLayer;
    if (!layer) return;
    this.setState({
      renamingLayerUuid: layer.uuid,
      renamingName: layer.name || '',
      menuLayer: null,
    });
  };

  commitRename = (layer) => {
    if (this.state.renamingName.trim()) {
      layer.name = this.state.renamingName.trim();
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Rename Layer' });
      }
    }
    this.setState({ renamingLayerUuid: null, renamingName: '' });
  };

  handleSelectObjects = () => {
    const layer = this.state.menuLayer;
    if (!layer) return;
    const playhead = this.props.project.activeTimeline.playheadPosition;
    const frame = layer.getFrameAtPlayheadPosition(playhead);
    if (frame && this.props.selectObjects && this.props.clearSelection) {
      this.props.clearSelection();
      const children = frame.getChildren ? frame.getChildren() : [];
      if (children.length > 0) {
        this.props.selectObjects(children);
      }
    }
    this.handleCloseMenu();
  };

  handleCopyLayer = () => {
    this.handleSelectObjects();
    if (this.props.editorActions && this.props.editorActions.copy) {
      this.props.editorActions.copy.action();
    }
    this.handleCloseMenu();
  };

  handleFillLayer = () => {
    const layer = this.state.menuLayer;
    if (!layer) return;
    const fillCol = (this.props.getToolSetting && this.props.getToolSetting('fillColor')) ||
      (this.props.project && this.props.project.backgroundColor) ||
      new window.Wick.Color('#ffffff');
    const playhead = this.props.project.activeTimeline.playheadPosition;
    let frame = layer.getFrameAtPlayheadPosition(playhead);
    if (!frame && layer.frames && layer.frames.length > 0) {
      frame = layer.frames[0];
    }
    if (frame) {
      const rect = new window.paper.Path.Rectangle({
        point: [0, 0],
        size: [this.props.project.width || 800, this.props.project.height || 600],
        fillColor: fillCol.paperColor ? fillCol.paperColor : (fillCol.rgba || '#ffffff'),
        strokeColor: null,
      });
      rect.insert = false;
      const wickPath = new window.Wick.Path({ path: rect, project: this.props.project });
      frame.addPath(wickPath);
      if (this.props.project.view) this.props.project.view.render();
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Fill Layer' });
      }
    }
    this.handleCloseMenu();
  };

  handleClearLayer = () => {
    const layer = this.state.menuLayer;
    if (!layer) return;
    const playhead = this.props.project.activeTimeline.playheadPosition;
    const frame = layer.getFrameAtPlayheadPosition(playhead);
    if (frame) {
      const children = frame.getChildren ? [...frame.getChildren()] : [];
      children.forEach((c) => frame.removeChild(c));
      if (this.props.project.view) this.props.project.view.render();
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Clear Layer' });
      }
    }
    this.handleCloseMenu();
  };

  handleInvertLayer = () => {
    const layer = this.state.menuLayer;
    if (!layer) return;
    const playhead = this.props.project.activeTimeline.playheadPosition;
    const frame = layer.getFrameAtPlayheadPosition(playhead);
    if (frame) {
      const paths = frame.getPaths ? frame.getPaths() : [];
      paths.forEach((p) => {
        if (p.fillColor && p.fillColor.hex) {
          const inv = '#' + (0xffffff ^ parseInt(p.fillColor.hex.replace('#', ''), 16)).toString(16).padStart(6, '0');
          p.fillColor = new window.Wick.Color(inv);
        }
      });
      if (this.props.project.view) this.props.project.view.render();
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Invert Layer Colors' });
      }
    }
    this.handleCloseMenu();
  };

  handleMergeDown = () => {
    const layer = this.state.menuLayer;
    const activeTimeline = this.props.project && this.props.project.activeTimeline;
    if (!layer || !activeTimeline) return;
    const currentIdx = activeTimeline.layers.indexOf(layer);
    if (currentIdx > 0) {
      const targetLayer = activeTimeline.layers[currentIdx - 1];
      layer.frames.forEach((srcFrame) => {
        let destFrame = targetLayer.getFrameAtPlayheadPosition(srcFrame.startPos);
        if (!destFrame) {
          destFrame = new window.Wick.Frame({ startPos: srcFrame.startPos, duration: srcFrame.duration });
          targetLayer.addFrame(destFrame);
        }
        const children = srcFrame.getChildren ? [...srcFrame.getChildren()] : [];
        children.forEach((c) => {
          srcFrame.removeChild(c);
          destFrame.addChild(c);
        });
      });
      activeTimeline.removeLayer(layer);
      activeTimeline.activeLayerIndex = currentIdx - 1;
      if (this.props.project.view) this.props.project.view.render();
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Merge Layer Down' });
      }
    }
    this.handleCloseMenu();
  };

  handleDeleteLayer = () => {
    const layer = this.state.menuLayer;
    const activeTimeline = this.props.project && this.props.project.activeTimeline;
    if (!layer || !activeTimeline) return;
    if (activeTimeline.layers.length > 1) {
      activeTimeline.removeLayer(layer);
      if (this.props.project.view) this.props.project.view.render();
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Delete Layer' });
      }
    }
    this.handleCloseMenu();
  };

  handleChangeBackgroundColor = (col) => {
    if (this.props.updateProjectSettings) {
      this.props.updateProjectSettings({
        backgroundColor: new window.Wick.Color(col),
      });
    } else if (this.props.project) {
      this.props.project.backgroundColor = new window.Wick.Color(col);
      if (this.props.projectDidChange) {
        this.props.projectDidChange({ actionName: 'Update Background Color' });
      }
    }
  };

  render() {
    const project = this.props.project;
    if (!project || !project.activeTimeline) return null;

    const activeTimeline = project.activeTimeline;
    const layers = activeTimeline.layers || [];
    // Display in reverse order (top layer at top of stack, matching Procreate)
    const reversedLayers = [...layers].reverse();
    const activeIndex = activeTimeline.activeLayerIndex;

    const bgColorHex = (project.backgroundColor && (project.backgroundColor.hex || project.backgroundColor.rgba)) || '#ffffff';

    return (
      <div className={classNames("docked-pane outliner procreate-layers-panel", this.props.className)} aria-label="Layers">
        {/* Header matching Procreate: 'Layers' title and '+' button */}
        <div className="procreate-layers-header">
          <span className="procreate-layers-title">Layers</span>
          <button
            className="procreate-layers-add-btn"
            onClick={this.handleAddLayer}
            title="Add Layer"
            aria-label="Add Layer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        {/* Main layout */}
        <div className="procreate-layers-main-layout" onClick={this.handleCloseMenu}>
          {/* Layer Action Menu Flyout */}
          {this.state.menuLayer && (
            <div className="procreate-layer-action-menu" onClick={(e) => e.stopPropagation()}>
              <div className="action-menu-item" onClick={this.handleRename}>Rename</div>
              <div className="action-menu-item" onClick={this.handleSelectObjects}>Select</div>
              <div className="action-menu-item" onClick={this.handleCopyLayer}>Copy</div>
              <div className="action-menu-item" onClick={this.handleFillLayer}>Fill Layer</div>
              <div className="action-menu-item" onClick={this.handleClearLayer}>Clear</div>
              <div className="action-menu-item disabled">Alpha Lock</div>
              <div className="action-menu-item disabled">Mask</div>
              <div className="action-menu-item" onClick={this.handleInvertLayer}>Invert</div>
              <div className="action-menu-item disabled">Reference</div>
              <div
                className={classNames('action-menu-item', activeTimeline.layers.indexOf(this.state.menuLayer) <= 0 && 'disabled')}
                onClick={this.handleMergeDown}
              >
                Merge Down
              </div>
              <div className="action-menu-item disabled">Combine Down</div>
              {activeTimeline.layers.length > 1 && (
                <div className="action-menu-item delete-action" onClick={this.handleDeleteLayer}>Delete</div>
              )}
            </div>
          )}

          {/* Layer Items List */}
          <div className="procreate-layers-list">
            {reversedLayers.map((layer) => {
              const isSelected = layer.index === activeIndex;
              const isRenaming = this.state.renamingLayerUuid === layer.uuid;
              const isVisible = !layer.hidden;

              return (
                <div
                  key={layer.uuid}
                  className={classNames('procreate-layer-row', { selected: isSelected })}
                  onClick={(e) => this.handleSelectLayer(layer, e)}
                >
                  {/* Layer Thumbnail */}
                  <div
                    className="layer-thumbnail"
                    onClick={(e) => this.handleOpenMenu(layer, e)}
                    title="Layer Options"
                  >
                    <div className="thumbnail-inner">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* Layer Name / Renaming Input */}
                  <div className="layer-name-container">
                    {isRenaming ? (
                      <input
                        type="text"
                        className="layer-name-input"
                        autoFocus
                        value={this.state.renamingName}
                        onChange={(e) => this.setState({ renamingName: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') this.commitRename(layer);
                          if (e.key === 'Escape') this.setState({ renamingLayerUuid: null });
                        }}
                        onBlur={() => this.commitRename(layer)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="layer-name-text">
                        {layer.name || `Layer ${layer.index + 1}`}
                      </span>
                    )}
                  </div>

                  {/* Blend Mode Badge ('N' for Normal) */}
                  <div className="layer-mode-badge" title="Blend Mode: Normal">
                    N
                  </div>

                  {/* Visibility Checkbox */}
                  <div
                    className="layer-visibility-container"
                    onClick={(e) => this.handleToggleVisibility(layer, e)}
                    title={isVisible ? 'Hide Layer' : 'Show Layer'}
                  >
                    <div className={classNames('layer-checkbox', { checked: isVisible })}>
                      {isVisible && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Background Color Row */}
            <div className="procreate-layer-row background-color-row">
              {/* Swatch thumbnail */}
              <div
                id="outliner-bg-color-swatch"
                className="layer-thumbnail bg-swatch-thumbnail"
                style={{ backgroundColor: bgColorHex }}
                onClick={() => this.setState({ bgColorPickerOpen: !this.state.bgColorPickerOpen })}
                title="Change Background Color"
              />

              <div
                className="layer-name-container"
                onClick={() => this.setState({ bgColorPickerOpen: !this.state.bgColorPickerOpen })}
              >
                <span className="layer-name-text">Background color</span>
              </div>

              {/* Popover for background color picker */}
              <Popover
                placement="left"
                isOpen={this.state.bgColorPickerOpen}
                toggle={() => this.setState({ bgColorPickerOpen: !this.state.bgColorPickerOpen })}
                target="outliner-bg-color-swatch"
                className="procreate-bg-color-popover"
              >
                <div className="p-2" onClick={(e) => e.stopPropagation()}>
                  <WickColorPicker
                    color={bgColorHex}
                    colorPickerType="swatches"
                    changeColorPickerType={() => {}}
                    onChangeComplete={(c) => this.handleChangeBackgroundColor(c)}
                    toggle={() => this.setState({ bgColorPickerOpen: false })}
                  />
                </div>
              </Popover>

              {/* Background visibility checkbox */}
              <div className="layer-visibility-container">
                <div className="layer-checkbox checked">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Outliner;