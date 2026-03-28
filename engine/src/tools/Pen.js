/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Wick Editor.
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

Wick.Tools.Pen = class extends Wick.Tool {
    /**
     * Creates a pen tool for drawing connected segments.
     */
    constructor () {
        super();

        this.name = 'pen'

        this.path = null;
        this.previewPath = null;
    }

    get doubleClickEnabled () {
        return true;
    }

    /**
     * The pen cursor.
     * @type {string}
     */
    get cursor () {
        return 'url(cursors/segment.png) 32 32, crosshair';
    }

    get isDrawingTool () {
        return true;
    }

    onActivate (e) {
        this.reset();
    }

    onDeactivate (e) {
        this.finishPath();
    }

    reset () {
        if (this.path) this.path.remove();
        if (this.previewPath) this.previewPath.remove();
        this.path = null;
        this.previewPath = null;
    }

    finishPath () {
        if (this.path && this.path.segments.length > 1) {
            this.path.remove();
            if (this.previewPath) this.previewPath.remove();
            
            // Clean up segments if path is closed
            if (this.path.closed) {
                // Ensure the last point isn't exactly the same as the first (handled by closePath)
            }

            this.addPathToProject(this.path);
            this.fireEvent({eventName: 'canvasModified', actionName: 'pen'});
        } else if (this.path) {
            this.path.remove();
        }

        this.path = null;
        if (this.previewPath) this.previewPath.remove();
        this.previewPath = null;
    }

    onMouseDown (e) {
        if (!this.path) {
            this.path = new this.paper.Path({
                strokeColor: this.getSetting('strokeColor').rgba,
                strokeWidth: this.getSetting('strokeWidth'),
                strokeCap: 'round',
                strokeJoin: 'round'
            });
            this.path.add(e.point);
        } else {
            // Check if clicking near the starting point to close the path
            var distanceToStart = e.point.getDistance(this.path.firstSegment.point);
            if (distanceToStart < 10 / this.paper.view.zoom && this.path.segments.length > 2) {
                this.path.closed = true;
                this.finishPath();
                return;
            }
            this.path.add(e.point);
        }

        this.updatePreview(e.point);
    }

    onMouseMove (e) {
        super.onMouseMove(e);
        if (this.path) {
            this.updatePreview(e.point);
        }
    }

    updatePreview (mousePoint) {
        if (!this.path) return;

        if (this.previewPath) this.previewPath.remove();
        
        var lastPoint = this.path.lastSegment.point;
        this.previewPath = new this.paper.Path.Line(lastPoint, mousePoint);
        this.previewPath.strokeColor = this.getSetting('strokeColor').rgba;
        this.previewPath.strokeWidth = this.getSetting('strokeWidth');
        this.previewPath.opacity = 0.5;
        this.previewPath.dashArray = [4, 4];
        this.previewPath.data.wickType = 'gui'; // Don't add to project
    }

    onDoubleClick (e) {
        this.finishPath();
    }

    onKeyDown (e) {
        var key = e.key ? e.key.toLowerCase() : '';
        if (key === 'enter' || key === 'escape') {
            this.finishPath();
        }
    }
}
