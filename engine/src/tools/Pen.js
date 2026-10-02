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
     * Creates a pen tool for drawing connected segments and bezier curves.
     */
    constructor () {
        super();

        this.name = 'pen';

        this.path = null;
        this.previewPath = null;
        this.overlayGroup = null;

        this.CLOSE_DISTANCE = 14; // pixels tolerance to close path
        this.START_POINT_RADIUS = 7; // normal radius for start vertex
        this.START_POINT_HOVER_RADIUS = 10; // hover radius for start vertex
        this.VERTEX_RADIUS = 4.5; // standard vertex radius

        this.isDragging = false;
        this.activeSegment = null;
        this.selectedSegment = null;
        this.isNearStart = false;
        this.justClosed = false;
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
        if (this.overlayGroup) this.overlayGroup.remove();

        this.path = null;
        this.previewPath = null;
        this.overlayGroup = null;
        this.isDragging = false;
        this.activeSegment = null;
        this.selectedSegment = null;
        this.isNearStart = false;
        this.justClosed = false;
    }

    finishPath () {
        if (this.path && this.path.segments.length > 1) {
            this.path.remove();
            if (this.previewPath) this.previewPath.remove();
            if (this.overlayGroup) this.overlayGroup.remove();

            if (this.path.closed) {
                // Apply fill color and stroke color to closed path
                var fillColor = this.getSetting('fillColor');
                this.path.fillColor = fillColor ? fillColor.rgba : this.getSetting('strokeColor').rgba;
            } else {
                this.path.fillColor = null;
            }

            this.addPathToProject(this.path);
            this.fireEvent({eventName: 'canvasModified', actionName: 'pen'});
        } else if (this.path) {
            this.path.remove();
        }

        this.path = null;
        if (this.previewPath) this.previewPath.remove();
        this.previewPath = null;
        if (this.overlayGroup) this.overlayGroup.remove();
        this.overlayGroup = null;
        this.isDragging = false;
        this.activeSegment = null;
        this.selectedSegment = null;
        this.isNearStart = false;
        this.justClosed = false;
    }

    onMouseDown (e) {
        this.justClosed = false;
        var zoom = (this.paper && this.paper.view && this.paper.view.zoom) ? this.paper.view.zoom : 1;

        if (!this.path) {
            // First vertex
            this.path = new this.paper.Path({
                strokeColor: this.getSetting('strokeColor').rgba,
                strokeWidth: this.getSetting('strokeWidth'),
                strokeCap: 'round',
                strokeJoin: 'round',
                fillColor: null
            });
            this.activeSegment = this.path.add(e.point);
            this.selectedSegment = this.activeSegment;
            this.isDragging = true;
        } else {
            // Check if clicking near starting vertex to close path
            var distanceToStart = e.point.getDistance(this.path.firstSegment.point);
            if (distanceToStart < this.CLOSE_DISTANCE / zoom && this.path.segments.length >= 2) {
                this.path.closed = true;
                this.justClosed = true;
                this.finishPath();
                return;
            }

            // Check if clicking on an existing vertex to select it
            var hitSegment = null;
            for (var i = 0; i < this.path.segments.length; i++) {
                var seg = this.path.segments[i];
                if (e.point.getDistance(seg.point) < (this.CLOSE_DISTANCE + 2) / zoom) {
                    hitSegment = seg;
                    break;
                }
            }

            if (hitSegment) {
                this.selectedSegment = hitSegment;
                this.updatePreview(e.point, e);
                this.updateOverlay(e.point);
                return;
            }

            // New vertex
            var point = e.point;
            if (e.modifiers && e.modifiers.control) {
                var lastPoint = this.path.lastSegment.point;
                var vector = point.subtract(lastPoint);
                vector.angle = Math.round(vector.angle / 45) * 45;
                point = lastPoint.add(vector);
            }

            this.activeSegment = this.path.add(point);
            this.selectedSegment = this.activeSegment;
            this.isDragging = true;
        }

        this.updatePreview(e.point, e);
        this.updateOverlay(e.point);
    }

    deleteSelectedSegment () {
        if (!this.path || !this.selectedSegment) return;

        var segIndex = this.selectedSegment.index;
        if (segIndex !== undefined && segIndex >= 0 && segIndex < this.path.segments.length) {
            this.path.removeSegment(segIndex);
            this.selectedSegment = null;
            this.activeSegment = null;

            if (this.path.segments.length === 0) {
                this.reset();
                return;
            }

            var lastPoint = this.path.lastSegment.point;
            this.updatePreview(lastPoint);
            this.updateOverlay(lastPoint);
            if (this.paper && this.paper.view) {
                this.paper.view.draw();
            }
        }
    }

    onMouseDrag (e) {
        if (!this.path || !this.activeSegment) return;

        // When dragging, set bezier handles on activeSegment
        var delta = e.point.subtract(this.activeSegment.point);
        this.activeSegment.handleOut = delta;
        this.activeSegment.handleIn = delta.multiply(-1);

        this.updatePreview(e.point, e);
        this.updateOverlay(e.point);
    }

    onMouseUp (e) {
        if (this.justClosed) {
            this.justClosed = false;
            return;
        }

        this.isDragging = false;
        this.activeSegment = null;

        this.updatePreview(e.point, e);
        this.updateOverlay(e.point);
    }

    onMouseMove (e) {
        super.onMouseMove(e);
        if (this.path) {
            this.updatePreview(e.point, e);
            this.updateOverlay(e.point);
        }
    }

    updatePreview (mousePoint, e) {
        if (!this.path || this.path.segments.length === 0) return;

        if (this.previewPath) this.previewPath.remove();

        var zoom = (this.paper && this.paper.view && this.paper.view.zoom) ? this.paper.view.zoom : 1;
        var lastSegment = this.path.lastSegment;
        var lastPoint = lastSegment.point;
        var endPoint = mousePoint;

        // Check if mouse is near start point
        var distanceToStart = mousePoint.getDistance(this.path.firstSegment.point);
        if (distanceToStart < this.CLOSE_DISTANCE / zoom && this.path.segments.length >= 2) {
            endPoint = this.path.firstSegment.point;
            this.isNearStart = true;
        } else {
            this.isNearStart = false;
            if (e && e.modifiers && e.modifiers.control) {
                var vector = endPoint.subtract(lastPoint);
                vector.angle = Math.round(vector.angle / 45) * 45;
                endPoint = lastPoint.add(vector);
            }
        }

        this.previewPath = new this.paper.Path();
        this.previewPath.strokeColor = this.getSetting('strokeColor').rgba;
        this.previewPath.strokeWidth = this.getSetting('strokeWidth');
        this.previewPath.opacity = 0.6;
        this.previewPath.dashArray = [4, 4];
        this.previewPath.data.wickType = 'gui'; // Don't add to project

        var seg1 = this.previewPath.add(lastPoint);
        seg1.handleOut = lastSegment.handleOut;

        var seg2 = this.previewPath.add(endPoint);
        if (this.isNearStart && this.path.firstSegment.handleIn) {
            seg2.handleIn = this.path.firstSegment.handleIn;
        }
    }

    updateOverlay (mousePoint) {
        if (this.overlayGroup) this.overlayGroup.remove();
        if (!this.path || this.path.segments.length === 0) return;

        var zoom = (this.paper && this.paper.view && this.paper.view.zoom) ? this.paper.view.zoom : 1;
        this.overlayGroup = new this.paper.Group();
        this.overlayGroup.data.wickType = 'gui';

        var segments = this.path.segments;
        var firstSeg = segments[0];

        // Draw handles for all segments
        for (var i = 0; i < segments.length; i++) {
            var seg = segments[i];

            // Render handle lines and handle points if they exist
            if (seg.handleIn && !seg.handleIn.isZero()) {
                var inPos = seg.point.add(seg.handleIn);
                var inLine = new this.paper.Path.Line(seg.point, inPos);
                inLine.strokeColor = '#09c399';
                inLine.strokeWidth = 1 / zoom;
                inLine.data.wickType = 'gui';
                this.overlayGroup.addChild(inLine);

                var inCircle = new this.paper.Path.Circle(inPos, 3 / zoom);
                inCircle.fillColor = '#09c399';
                inCircle.data.wickType = 'gui';
                this.overlayGroup.addChild(inCircle);
            }

            if (seg.handleOut && !seg.handleOut.isZero()) {
                var outPos = seg.point.add(seg.handleOut);
                var outLine = new this.paper.Path.Line(seg.point, outPos);
                outLine.strokeColor = '#09c399';
                outLine.strokeWidth = 1 / zoom;
                outLine.data.wickType = 'gui';
                this.overlayGroup.addChild(outLine);

                var outCircle = new this.paper.Path.Circle(outPos, 3 / zoom);
                outCircle.fillColor = '#09c399';
                outCircle.data.wickType = 'gui';
                this.overlayGroup.addChild(outCircle);
            }

            // Draw normal intermediate vertices
            if (i > 0) {
                var isSelected = (this.selectedSegment === seg);
                var radius = (isSelected ? 7 : this.VERTEX_RADIUS) / zoom;
                var vertexCircle = new this.paper.Path.Circle(seg.point, radius);
                vertexCircle.fillColor = isSelected ? '#ff4757' : '#ffffff';
                vertexCircle.strokeColor = isSelected ? '#000000' : '#09c399';
                vertexCircle.strokeWidth = (isSelected ? 2 : 1.5) / zoom;
                vertexCircle.data.wickType = 'gui';
                this.overlayGroup.addChild(vertexCircle);

                if (isSelected) {
                    var selectedInnerDot = new this.paper.Path.Circle(seg.point, 2.5 / zoom);
                    selectedInnerDot.fillColor = '#ffffff';
                    selectedInnerDot.data.wickType = 'gui';
                    this.overlayGroup.addChild(selectedInnerDot);
                }
            }
        }

        // Draw the first vertex noticeably bigger so the user recognizes it
        var distToFirst = mousePoint ? mousePoint.getDistance(firstSeg.point) : 999;
        var isHoveringFirst = (distToFirst < this.CLOSE_DISTANCE / zoom && segments.length >= 2);
        var isFirstSelected = (this.selectedSegment === firstSeg);

        var firstRadius = (isHoveringFirst ? this.START_POINT_HOVER_RADIUS : (isFirstSelected ? 9 : this.START_POINT_RADIUS)) / zoom;
        var firstCircle = new this.paper.Path.Circle(firstSeg.point, firstRadius);
        firstCircle.fillColor = isFirstSelected ? '#ff4757' : (isHoveringFirst ? '#ffde59' : '#09c399');
        firstCircle.strokeColor = '#000000';
        firstCircle.strokeWidth = 2 / zoom;
        firstCircle.data.wickType = 'gui';
        this.overlayGroup.addChild(firstCircle);

        // Center dot on first vertex
        var innerDot = new this.paper.Path.Circle(firstSeg.point, (isHoveringFirst ? 4 : 2.5) / zoom);
        innerDot.fillColor = '#ffffff';
        innerDot.data.wickType = 'gui';
        this.overlayGroup.addChild(innerDot);

        this.overlayGroup.bringToFront();
    }

    onDoubleClick (e) {
        this.finishPath();
    }

    onKeyDown (e) {
        var key = e.key ? e.key.toLowerCase() : '';
        if (key === 'backspace' || key === 'delete' || key === 'del' || e.keyCode === 8 || e.keyCode === 46) {
            this.deleteSelectedSegment();
            return;
        }

        if (key === 'enter' || key === 'escape') {
            this.finishPath();
        }
    }
}

