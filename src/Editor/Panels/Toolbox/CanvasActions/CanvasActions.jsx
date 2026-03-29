import React, { Component } from 'react';

import ActionButton from 'Editor/Util/ActionButton/ActionButton';
import ToolboxBreak from '../ToolboxBreak/ToolboxBreak';
import PopupMenu from 'Editor/Util/PopupMenu/PopupMenu';
import './_canvasactions.scss';

var classNames = require("classnames");

class CanvasActions extends Component {
  renderActions = () => {
    const orderActions = [
      this.props.editorActions.sendToBack,
      this.props.editorActions.sendBackward,
      this.props.editorActions.sendForward,
      this.props.editorActions.sendToFront
    ];
    
    const flipActions = [
      this.props.editorActions.flipHorizontal,
      this.props.editorActions.flipVertical
    ];

    const boolActions = [
      this.props.editorActions.booleanUnite,
      this.props.editorActions.booleanSubtract,
      this.props.editorActions.booleanIntersect
    ];

    return (
      <div className={classNames('actions-grid', this.props.renderSize === "small" && "vertical")}>
        {/* Prima Riga: Ordinamento */}
        <div className="actions-row">
          {orderActions.map((action, i) => this.renderActionButton(action, i))}
        </div>
        
        {/* Seconda Riga: Flip e Booleane */}
        <div className="actions-row">
          <div className="actions-section no-border">
            {flipActions.map((action, i) => this.renderActionButton(action, i + 10))}
          </div>
          <div className="actions-section">
            {boolActions.map((action, i) => this.renderActionButton(action, i + 20))}
          </div>
        </div>
      </div>
    );
  }

  renderActionButton(action, i) {
    if (!action) return null;
    return (
      <ActionButton
        key={i}
        className="prop-tile horizontal-tile"
        id={"canvas-action-button-" + action.icon}
        tooltip={action.tooltip}
        action={action.action}
        tooltipPlace={"bottom"}
        icon={action.icon}
        text={action.tooltip} 
      />
    );
  }

  render () {
    return (
      <PopupMenu
        mobile={this.props.renderSize === "small"}
        isOpen={this.props.showCanvasActions}
        toggle={this.props.toggleCanvasActions}
        target="more-canvas-actions-popover-button"
        className={"more-canvas-actions-popover"}
      >
        <div className={classNames("canvas-actions-widget", this.props.renderSize === "small" && "vertical")}>
          {!this.props.previewPlaying && this.renderActions()}
        </div>
      </PopupMenu>
    )
  }
}

export default CanvasActions
