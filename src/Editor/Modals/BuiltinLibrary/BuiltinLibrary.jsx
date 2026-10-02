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
import 'bootstrap/dist/css/bootstrap.min.css';
import WickModal from 'Editor/Modals/WickModal/WickModal';
import TabbedInterface from 'Editor/Util/TabbedInterface/TabbedInterface';
import ActionButton from 'Editor/Util/ActionButton/ActionButton';
import AudioPlayer from 'Editor/Util/AudioPlayer/AudioPlayer';

import wickobjects from './wickobjects.js'
import sounds from './sounds.js'
import canvatemplates from './canvatemplates.js'
import flyertemplates from './flyertemplates.js'

import './_builtinlibrary.scss';

class BuiltinLibrary extends Component {
  constructor (props) {
    super(props);

    this.toPlay = null;
  }

  static get ROOT_ASSET_PATH () {
    return process.env.PUBLIC_URL + '/builtinlibrary/';
  }

  render() {
    return (
      <WickModal
      open={this.props.open}
      toggle={this.props.toggle}
      className="modal-body welcome-modal-body"
      overlayClassName="modal-overlay welcome-modal-overlay">
        <div className='builtin-library'>
          <div className="builtin-library-modal-title">
            Builtin Library
          </div>
          <TabbedInterface tabNames={["Flyer", "Canva Template", "Clips", "Sounds"]} >
            <div className="builtin-library-asset-grid">{flyertemplates.assets.map(this.renderFlyerAsset)}</div>
            <div className="builtin-library-asset-grid">{canvatemplates.assets.map(this.renderTemplateAsset)}</div>
            <div className="builtin-library-asset-grid">{wickobjects.assets.map(this.renderBuiltinAsset)}</div>
            <div className="builtin-library-asset-grid">{sounds.assets.map(this.renderSoundAsset)}</div>
          </TabbedInterface>
        </div>
      </WickModal>
    );
  }

  applyCanvaTemplate = (template) => {
    // Chiudiamo il modale prima, tramite toggle (closeActiveModal),
    // così l'overlay viene rimosso senza race condition con i successivi setState.
    if (this.props.toggle) {
      this.props.toggle();
    } else if (this.props.openModal) {
      this.props.openModal(null);
    }

    if (this.props.updateProjectSettings) {
      this.props.updateProjectSettings({
        width: template.width,
        height: template.height,
        // Il motore (Project.backgroundColor) si aspetta un oggetto Wick.Color,
        // non una stringa grezza — altrimenti la comparazione oldVal !== newVal
        // fallisce e view.render() può crashare silenziosamente.
        backgroundColor: new window.Wick.Color(template.backgroundColor || '#ffffff'),
      });
      if (this.props.toast) {
        this.props.toast(`Template "${template.name}" applicato con successo (${template.width}x${template.height})!`, 'success');
      }
    }
    if (this.props.recenterCanvas) {
      this.props.recenterCanvas();
    }
  }

  renderTemplateAsset = (template) => {
    const isAspectVertical = template.height > template.width;
    const isAspectSquare = template.height === template.width;
    const previewRatioClass = isAspectVertical ? 'preview-vertical' : isAspectSquare ? 'preview-square' : 'preview-horizontal';

    return (
      <div key={template.id} className='builtin-library-asset builtin-template-card'>
        <div className='builtin-library-asset-name' title={template.name}> 
          {template.name} 
        </div>
        
        <div className='builtin-library-asset-icon-container template-icon-box'>
          <div className={`template-preview-mockup ${previewRatioClass}`} style={{ backgroundColor: template.backgroundColor || '#222' }}>
            <div className="template-mockup-badge">{template.width} × {template.height}</div>
            <div className="template-mockup-cat">{template.category}</div>
          </div>
        </div>

        <ActionButton
          className="add-as-asset-button apply-template-btn"
          action={() => this.applyCanvaTemplate(template)}
          text="Applica al Canvas"
        />
      </div>
    );
  }

  applyFlyerTemplate = (flyer) => {
    if (this.props.toggle) {
      this.props.toggle();
    } else if (this.props.openModal) {
      this.props.openModal(null);
    }

    const project = this.props.project || (window.Wick && window.Wick.currentProject);
    const width = flyer.width || 726;
    const height = flyer.height || 1024;

    if (this.props.updateProjectSettings) {
      this.props.updateProjectSettings({
        width: width,
        height: height,
        backgroundColor: new window.Wick.Color(flyer.backgroundColor || '#6a142c'),
      });
    }

    if (!project || !project.activeTimeline) {
      if (this.props.recenterCanvas) this.props.recenterCanvas();
      return;
    }

    const timeline = project.activeTimeline;
    let bgLayer = timeline.layers[0];
    if (bgLayer) {
      bgLayer.name = 'Sfondo Foto';
    } else {
      bgLayer = new window.Wick.Layer({ name: 'Sfondo Foto' });
      timeline.addLayer(bgLayer);
    }

    let bgFrame = bgLayer.getFrameAtPlayheadPosition(timeline.playheadPosition) || bgLayer.frames[0];
    if (!bgFrame) {
      bgLayer.insertBlankFrame(timeline.playheadPosition);
      bgFrame = bgLayer.getFrameAtPlayheadPosition(timeline.playheadPosition);
    }

    let textLayer = timeline.layers[1];
    if (!textLayer) {
      textLayer = new window.Wick.Layer({ name: 'Testi e Grafica' });
      timeline.addLayer(textLayer);
    }
    let textFrame = textLayer.getFrameAtPlayheadPosition(timeline.playheadPosition) || textLayer.frames[0];
    if (!textFrame) {
      textLayer.insertBlankFrame(timeline.playheadPosition);
      textFrame = textLayer.getFrameAtPlayheadPosition(timeline.playheadPosition);
    }
    if (textLayer.activate) {
      textLayer.activate();
    } else if (textLayer.index !== undefined) {
      timeline.activeLayerIndex = textLayer.index;
    }

    if (flyer.backgroundColor) {
      this.props.updateProjectSettings({
        backgroundColor: new window.Wick.Color(flyer.backgroundColor),
      });
    }

    if (flyer.backgroundImage) {
      const bgPath = BuiltinLibrary.ROOT_ASSET_PATH + flyer.backgroundImage;
      fetch(bgPath)
        .then((res) => res.blob())
        .then((blob) => {
          blob.name = flyer.backgroundImage.split('/').pop() || 'flyer_bg.png';
          project.importFile(blob, (asset) => {
            if (asset) {
              asset.createInstance((path) => {
                bgFrame.addPath(path);
                path.x = width / 2;
                path.y = height / 2;
                this.addFlyerElements(project, textFrame, flyer, width, height);
              });
            } else {
              this.addFlyerElements(project, textFrame, flyer, width, height);
            }
          });
        })
        .catch((err) => {
          console.error('Error loading flyer background photo:', err);
          this.addFlyerElements(project, textFrame, flyer, width, height);
        });
    } else {
      this.addFlyerElements(project, textFrame, flyer, width, height);
    }

    if (this.props.recenterCanvas) {
      setTimeout(() => {
        this.props.recenterCanvas();
      }, 50);
    }

    if (this.props.toast) {
      this.props.toast(`Template Flyer "${flyer.name}" caricato con successo!`, 'success');
    }
  };

  addFlyerElements = (project, textFrame, flyer, width, height) => {
    const paperScope = window.Wick.View.paperScope;

    if (flyer.stickers && flyer.stickers.length > 0) {
      flyer.stickers.forEach((sticker) => {
        const sPath = BuiltinLibrary.ROOT_ASSET_PATH + sticker.file;
        fetch(sPath)
          .then((res) => res.blob())
          .then((blob) => {
            blob.name = sticker.file.split('/').pop() || 'sticker.png';
            project.importFile(blob, (asset) => {
              if (asset) {
                asset.createInstance((path) => {
                  textFrame.addPath(path);
                  path.x = sticker.x !== undefined ? sticker.x : width / 2;
                  path.y = sticker.y !== undefined ? sticker.y : height / 2;
                  if (sticker.scale && path.view && path.view.item && path.view.item.scale) {
                    path.view.item.scale(sticker.scale);
                    if (path.updateJSON) path.updateJSON();
                  }
                  if (sticker.rotation && path.view && path.view.item && path.view.item.rotate) {
                    path.view.item.rotate(sticker.rotation);
                    if (path.updateJSON) path.updateJSON();
                  }
                  if (sticker.name) path.identifier = sticker.name;
                  if (project.view) project.view.render();
                });
              } else if (project.view) {
                project.view.render();
              }
            });
          })
          .catch((err) => {
            console.error('Error loading sticker asset:', err);
            if (project.view) project.view.render();
          });
      });
    }

    if (flyer.elements && flyer.elements.length > 0) {
      flyer.elements.forEach((elem) => {
        if (elem.type === 'text') {
          var p = new paperScope.Point(elem.x, elem.y);
          var pt = new paperScope.PointText(p);
          pt.content = elem.content;
          pt.fontFamily = elem.fontFamily || 'Italiana';
          pt.fontSize = elem.fontSize || 32;
          pt.fillColor = elem.fillColor || '#ffffff';
          pt.justification = elem.justification || 'left';
          if (elem.leading) {
            pt.leading = elem.leading;
            pt.data.leading = elem.leading;
          }
          var wickText = new window.Wick.Path({ json: pt.exportJSON({ asString: false }) });
          if (elem.name) wickText.identifier = elem.name;
          textFrame.addPath(wickText);
          pt.remove();
        }
      });
    }

    if (flyer.artworkImage) {
      const artPath = BuiltinLibrary.ROOT_ASSET_PATH + flyer.artworkImage.file;
      fetch(artPath)
        .then((res) => res.blob())
        .then((blob) => {
          blob.name = flyer.artworkImage.file.split('/').pop() || 'artwork.png';
          project.importFile(blob, (asset) => {
            if (asset) {
              asset.createInstance((path) => {
                textFrame.addPath(path);
                path.x = flyer.artworkImage.x !== undefined ? flyer.artworkImage.x : width / 2;
                path.y = flyer.artworkImage.y !== undefined ? flyer.artworkImage.y : height / 2;
                if (flyer.artworkImage.name) path.identifier = flyer.artworkImage.name;
                if (project.view) project.view.render();
              });
            } else if (project.view) {
              project.view.render();
            }
          });
        })
        .catch((err) => {
          console.error('Error loading artwork image:', err);
          if (project.view) project.view.render();
        });
    }

    if (flyer.scriptGraphic) {
      const scriptPath = BuiltinLibrary.ROOT_ASSET_PATH + flyer.scriptGraphic;
      fetch(scriptPath)
        .then((res) => res.blob())
        .then((blob) => {
          blob.name = flyer.scriptGraphic.split('/').pop() || 'script.png';
          project.importFile(blob, (asset) => {
            if (asset) {
              asset.createInstance((path) => {
                textFrame.addPath(path);
                path.x = 375;
                path.y = 775;
                if (project.view) project.view.render();
              });
            } else if (project.view) {
              project.view.render();
            }
          });
        })
        .catch((err) => {
          console.error('Error loading script graphic:', err);
          if (project.view) project.view.render();
        });
    }

    if (project.view) {
      project.view.render();
    }
  };

  renderFlyerAsset = (flyer) => {
    return (
      <div key={flyer.id} className="builtin-library-asset builtin-flyer-card">
        <div className="builtin-library-asset-name" title={flyer.name}>
          {flyer.name}
        </div>

        <div className="builtin-library-asset-icon-container flyer-icon-box">
          <img
            src={BuiltinLibrary.ROOT_ASSET_PATH + flyer.preview}
            alt={flyer.name}
            className="flyer-preview-img"
          />
          <div className="flyer-badge-overlay">
            <span className="flyer-dim-tag">{flyer.width} × {flyer.height}</span>
            <span className="flyer-cat-tag">{flyer.category}</span>
          </div>
        </div>

        <ActionButton
          className="add-as-asset-button apply-template-btn apply-flyer-btn"
          action={() => this.applyFlyerTemplate(flyer)}
          text="Carica nel Canvas"
        />
      </div>
    );
  };

  //Fetch file, add to builtinPreviews
  importForPreview = (asset, callback) => {
    var path = BuiltinLibrary.ROOT_ASSET_PATH + asset.file;

    fetch (path)
    .then((response) => response.blob())
    .then((blob) => {
        blob.lastModifiedDate = new Date();
        blob.name = asset.file.split('/').pop();

        this.props.addFileToBuiltinPreviews(asset.file, blob);

        callback && callback(blob);
    })
    .catch((error) => {
        console.error("Error while importing builtin asset (" + asset.name + "," + asset.file + "): ")
        console.log(error);
    });
  }

  //Fetch file to builtinPreviews if necessary, then load into Asset Library
  createWickAsset = (asset) => {
    if (!this.props.builtinPreviews[asset.file]) {
      this.importForPreview(asset, (blob) => {
        this.props.importFileAsAsset(blob);
      });
    }
    else {
      this.props.importFileAsAsset(this.props.builtinPreviews[asset.file].blob);
    }
  }

  renderBuiltinAsset = (asset) => {
    return (
      <div key={asset.file} className='builtin-library-asset'>
        <div className='builtin-library-asset-name'> 
          {asset.name} 
        </div>
        
        <div
          className='builtin-library-asset-icon-container'>
            <img
            alt='Builtin Asset Icon'
            src={BuiltinLibrary.ROOT_ASSET_PATH + asset.icon}
            className='builtin-library-asset-icon'
            />
        </div>

        {this.props.isAssetInLibrary(asset.file.split("/").pop()) ?
          <ActionButton
            className="add-as-asset-button"
            action={() => {}}
            text="Already Added"
            color="gray"
          />
        :
          <ActionButton
            className="add-as-asset-button"
            action={() => {
              this.createWickAsset(asset);
            }}
            text="Add as Asset"
          />
        }
      </div>
    );
  }

  renderSoundAsset = (asset) => {
    let src = undefined;

    if (this.props.builtinPreviews[asset.file]) {
      src = this.props.builtinPreviews[asset.file].src;
    }

    return (
      <div key={asset.file} className='builtin-library-asset'>
        <div className='builtin-library-asset-name'>
          {asset.name}
        </div>

        <div className="audio-preview">
        <AudioPlayer 
          key={asset.file}
          src={src}
          loadSrc={() => this.importForPreview(asset, () => {})}
        />
        </div>

        {this.props.isAssetInLibrary(asset.file.split("/").pop()) ?
          <ActionButton
            className="add-as-asset-button"
            action={() => {}}
            text="Already Added"
            color="gray"
          />
        :
          <ActionButton
            className="add-as-asset-button"
            action={() => {
              this.createWickAsset(asset);
            }}
            text="Add as Asset"
          />
        }
      </div>
    );
  }
}

export default BuiltinLibrary
