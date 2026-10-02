/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Engine.
 *
 * Wick Engine is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Wick Engine is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Wick Engine.  If not, see <https://www.gnu.org/licenses/>.
 */

Wick.Tools.Text = class extends Wick.Tool {
    /**
     *
     */
    constructor () {
        super();

        this.name = 'text';

        this.hoveredOverText = null;
        this.editingText = null;
        this.dragStartPoint = null;
        this.previewRect = null;
        this.isDragging = false;
    }

    get doubleClickEnabled () {
        return false;
    }

    /**
     *
     * @type {string}
     */
    get cursor () {
        return 'text';
    }

    get isDrawingTool () {
        return true;
    }

    onActivate (e) {

    }

    onDeactivate (e) {
        if(this.editingText) {
            this.finishEditingText();
        }
        if(this.previewRect) {
            this.previewRect.remove();
            this.previewRect = null;
        }
        this.hoveredOverText = null;
        this.dragStartPoint = null;
        this.isDragging = false;
    }

    onMouseMove (e) {
        super.onMouseMove(e);

        if(e.item && e.item.className === 'PointText' && !e.item.parent.parent) {
            this.hoveredOverText = e.item;
            this.setCursor('text');
        } else {
            this.hoveredOverText = null;
            this.setCursor('url(cursors/text.png) 32 32, auto');
        }
    }

    onMouseDown (e) {
        if (this.editingText) {
            this.finishEditingText();
            this.dragStartPoint = null;
            this.isDragging = false;
            return;
        }
        
        if (this.hoveredOverText) {
            this.editingText = this.hoveredOverText;
            e.item.edit(this.project.view.paper);
            this.dragStartPoint = null;
            this.isDragging = false;
            return;
        }

        this.dragStartPoint = e.point;
        this.isDragging = false;
    }

    onMouseDrag (e) {
        if (!this.dragStartPoint || this.editingText) return;

        var currentPoint = e.point;
        var diff = currentPoint.subtract(this.dragStartPoint);

        if (Math.abs(diff.x) > 3 || Math.abs(diff.y) > 3) {
            this.isDragging = true;
        }

        if (this.isDragging) {
            if (this.previewRect) {
                this.previewRect.remove();
            }

            var minX = Math.min(this.dragStartPoint.x, currentPoint.x);
            var minY = Math.min(this.dragStartPoint.y, currentPoint.y);
            var width = Math.max(Math.abs(diff.x), 10);
            var height = Math.max(Math.abs(diff.y), 10);

            var rectBounds = new this.paper.Rectangle(minX, minY, width, height);
            this.previewRect = new this.paper.Path.Rectangle(rectBounds);
            this.previewRect.strokeColor = '#00a1e0';
            this.previewRect.dashArray = [4, 4];
            this.previewRect.strokeWidth = 1 / this.project.view.paper.view.zoom;
            this.previewRect.fillColor = 'rgba(0, 161, 224, 0.05)';
        }
    }

    onMouseUp (e) {
        if (this.previewRect) {
            this.previewRect.remove();
            this.previewRect = null;
        }

        if (!this.dragStartPoint) return;

        var startP = this.dragStartPoint;
        var endP = e.point;
        var isDrag = this.isDragging;

        this.dragStartPoint = null;
        this.isDragging = false;

        var textPoint = startP;
        var targetWidth = 0;
        var targetHeight = 0;

        if (isDrag) {
            var minX = Math.min(startP.x, endP.x);
            var minY = Math.min(startP.y, endP.y);
            targetWidth = Math.abs(endP.x - startP.x);
            targetHeight = Math.abs(endP.y - startP.y);
            textPoint = new this.paper.Point(minX, minY + 24); // baseline offset
        }

        var text = new this.paper.PointText(textPoint);
        text.justification = 'left';
        text.fillColor = this.getSetting('fillColor').rgba;
        text.content = 'Text';
        text.fontSize = 24;

        if (targetWidth > 0 && targetHeight > 0) {
            text.boxWidth = targetWidth;
            text.boxHeight = targetHeight;
        }

        var wickText = new Wick.Path({json: text.exportJSON({asString:false})});
        this.project.activeFrame.addPath(wickText);

        this.project.view.render();

        this.editingText = wickText.view.item;
        if (targetWidth > 0 && targetHeight > 0) {
            this.editingText.boxWidth = targetWidth;
            this.editingText.boxHeight = targetHeight;
        }
        this.editingText.edit(this.project.view.paper);
    }

    reset () {
        if (this.previewRect) {
            this.previewRect.remove();
            this.previewRect = null;
        }
        this.dragStartPoint = null;
        this.isDragging = false;
        this.finishEditingText();
    }

    /**
     * Stop editing the current text and apply changes.
     */
    finishEditingText () {
        if(!this.editingText) return;
        var itemToFinish = this.editingText;
        this.editingText = null;
        itemToFinish.finishEditing();
        if(itemToFinish.content === '') {
            itemToFinish.remove();
        }
        this.fireEvent({eventName: 'canvasModified', actionName: 'text'});
    }
}
