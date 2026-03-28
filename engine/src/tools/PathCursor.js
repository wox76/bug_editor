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

Wick.Tools.PathCursor = class extends Wick.Tool {
    constructor () {
        super();

        this.name = 'pathcursor';

        this.SELECTION_TOLERANCE = 3;
        this.CURSOR_DEFAULT = 'cursors/default.png';
        this.CURSOR_SEGMENT = 'cursors/segment.png';
        this.CURSOR_CURVE = 'cursors/curve.png';
        this.HOVER_PREVIEW_SEGMENT_STROKE_COLOR = 'rgba(100,150,255,1.0)';
        this.HOVER_PREVIEW_SEGMENT_STROKE_WIDTH = 1.5;
        this.HOVER_PREVIEW_SEGMENT_FILL_COLOR = '#ffffff';
        this.HOVER_PREVIEW_SEGMENT_RADIUS = 5;
        this.HOVER_PREVIEW_CURVE_STROKE_WIDTH = 2;
        this.HOVER_PREVIEW_CURVE_STROKE_COLOR = this.HOVER_PREVIEW_SEGMENT_STROKE_COLOR;

        this.hitResult = new this.paper.HitResult();

        this.draggingCurve = new this.paper.Curve();
        this.draggingSegment = new this.paper.Segment();
        this.hoverPreview = new this.paper.Item({insert:false});
        this.detailedEditing = null;

        this.currentCursorIcon = '';

        this._onMouseDownJSON = null;
        this._onMouseDownUUID = null;

        this.selectionBox = new this.paper.SelectionBox(this.paper);
        this.selectionOverlay = new this.paper.Group({insert:false});
    }

    get doubleClickEnabled () {
        return true;
    }

    get cursor () {
        return 'url("'+this.currentCursorIcon+'") 32 32, auto';
    }

    onActivate (e) {
    }

    onDeactivate (e) {
        this._leaveDetailedEditing();
    }

    onMouseMove (e) {
        super.onMouseMove(e);

        // Remove the hover preview, a new one will be generated if needed
        this.hoverPreview.remove();

        // Find the thing that is currently under the cursor.
        this.hitResult = this._updateHitResult(e);

        // Update the image being used for the cursor
        this._setCursor(this._getCursor());

        // Regen hover preview
        if(this.hitResult.type === 'segment' && !this.hitResult.item.data.isSelectionBoxGUI) {
            // Hovering over a segment, draw a circle where the segment is
            this.hoverPreview = new this.paper.Path.Circle(this.hitResult.segment.point, this.HOVER_PREVIEW_SEGMENT_RADIUS/this.paper.view.zoom);
            this.hoverPreview.strokeColor = this.HOVER_PREVIEW_SEGMENT_STROKE_COLOR;
            this.hoverPreview.strokeWidth = this.HOVER_PREVIEW_SEGMENT_STROKE_WIDTH;
            this.hoverPreview.fillColor = this.HOVER_PREVIEW_SEGMENT_FILL_COLOR;
        } else if (this.hitResult.type === 'curve' && !this.hitResult.item.data.isSelectionBoxGUI) {
            // Hovering over a curve, render a copy of the curve that can be bent
            this.hoverPreview = new this.paper.Path();
            this.hoverPreview.strokeWidth = this.HOVER_PREVIEW_CURVE_STROKE_WIDTH;
            this.hoverPreview.strokeColor = this.HOVER_PREVIEW_CURVE_STROKE_COLOR;
            this.hoverPreview.add(new this.paper.Point(this.hitResult.location.curve.point1));
            this.hoverPreview.add(new this.paper.Point(this.hitResult.location.curve.point2));
            this.hoverPreview.segments[0].handleOut = this.hitResult.location.curve.handle1;
            this.hoverPreview.segments[1].handleIn = this.hitResult.location.curve.handle2;
        }
        this.hoverPreview.data.wickType = 'gui';
    }

    onMouseDown (e) {
        super.onMouseDown(e);

        if(!e.modifiers) e.modifiers = {};

        this.hitResult = this._updateHitResult(e);

        // We no longer call _leaveDetailedEditing() here on mouse down!
        // If the user clicks empty space, they might be starting a box selection.
        // We will decide whether to leave detailed editing in onMouseUp if it was just a click.

        if (this.hitResult.item && (this.hitResult.type === 'curve' || this.hitResult.type === 'segment' || (this.hitResult.type && this.hitResult.type.startsWith('handle')))) {
            // Save the original path JSON for auto-keyframing
            var wickUUID = this._getWickUUID(this.hitResult.item);
            var wickPath = Wick.ObjectCache.getObjectByUUID(wickUUID);
            if (wickPath && wickPath.classname === 'Path') {
                this._onMouseDownJSON = JSON.parse(JSON.stringify(wickPath.json));
                this._onMouseDownUUID = wickUUID;
            }

            // Always update detailedEditing to the fresh hitResult.item 
            // to prevent stale reference bugs if the editor re-rendered the shape!
            var wasNull = (this.detailedEditing === null);
            
            // If the object was re-rendered between clicks, we must preserve the 'selected'
            // state of the old segments onto the new segments.
            if (this.detailedEditing && this.detailedEditing.segments && this.hitResult.item && this.hitResult.item.segments && this.detailedEditing !== this.hitResult.item) {
                for (var i = 0; i < this.detailedEditing.segments.length; i++) {
                    if (this.hitResult.item.segments[i]) {
                        this.hitResult.item.segments[i].selected = this.detailedEditing.segments[i].selected;
                    }
                }
            }

            this.detailedEditing = this.hitResult.item;
 
             if (wasNull && this.hitResult.type === 'curve') {
                if (this.detailedEditing && this.detailedEditing.setFullySelected) {
                    this.detailedEditing.setFullySelected(true);
                }
             }

            // Original logic:
            if (this.hitResult.type === 'curve') {
                this.draggingCurve = this.hitResult.location.curve;
            } else if (this.hitResult.type === 'segment') {
                if(e.modifiers.alt || 
                    e.modifiers.command ||
                    e.modifiers.control ||
                    e.modifiers.option) {
                    // Removed shift from this list to allow multi-select
                    this.hitResult.segment.remove();
                } else {
                    // Multi-select logic for segments:
                    if (e.modifiers.shift) {
                        this.hitResult.segment.selected = !this.hitResult.segment.selected;
                    } else {
                        if (this.hitResult.item.segments && !this.hitResult.segment.selected) {
                            this.hitResult.item.segments.forEach(seg => seg.selected = false);
                            this.hitResult.segment.selected = true;
                        }
                    }
                }
            }
        } else {
            // Nothing was clicked, clear selection or start box select
             if (!e.modifiers.shift && this.detailedEditing && this.detailedEditing.segments) {
                 this.detailedEditing.segments.forEach(seg => seg.selected = false);
             }
            // Always start selection box if we're clicking empty space in path mode
            this.selectionBox.start(e.point);
        }

        this._updateSelectionOverlay();
    }

    onDoubleClick (e) {
        this.hitResult = this._updateHitResult(e);

        if (!this.detailedEditing) {
            // If detailed editing is off, turn it on for this path.
            this.detailedEditing = this.hitResult.item;
            if (this.detailedEditing && this.detailedEditing.setFullySelected) {
                this.detailedEditing.setFullySelected(true);
            }

        } else if (!this.hitResult.item) {
            // If detailed editing is on for some path, but the user
            // double clicked somewhere else, turn it off.
            this._leaveDetailedEditing();

        } else if (this.hitResult.item && this.hitResult.type === 'curve') {
            
            var location = this.hitResult.location;
            var path = this.hitResult.item;

            var addedPoint = path.insert(location.index + 1, e.point);

            if (!e.modifiers.shift) {
                addedPoint.smooth()

                var handleInMag = Math.sqrt(
                    addedPoint.handleIn.x*addedPoint.handleIn.x+
                    addedPoint.handleIn.y+addedPoint.handleIn.y)
                var handleOutMag = Math.sqrt(
                    addedPoint.handleOut.x*addedPoint.handleOut.x+
                    addedPoint.handleOut.y+addedPoint.handleOut.y)

                if(handleInMag > handleOutMag) {
                    var avgMag = handleOutMag;
                    addedPoint.handleIn.x = -addedPoint.handleOut.x*1.5;
                    addedPoint.handleIn.y = -addedPoint.handleOut.y*1.5;
                    addedPoint.handleOut.x *= 1.5;
                    addedPoint.handleOut.y *= 1.5;
                } else {
                    var avgMag = handleInMag;
                    addedPoint.handleOut.x = -addedPoint.handleIn.x*1.5;
                    addedPoint.handleOut.y = -addedPoint.handleIn.y*1.5;
                    addedPoint.handleIn.x *= 1.5;
                    addedPoint.handleIn.y *= 1.5;
                }
            }

            if (this.detailedEditing && path && path.setFullySelected) {
                path.setFullySelected(true);
            }

        } else if (this.hitResult.item && this.hitResult.type === 'segment') {
            var hix = this.hitResult.segment.handleIn.x;
            var hiy = this.hitResult.segment.handleIn.y;
            var hox = this.hitResult.segment.handleOut.x;
            var hoy = this.hitResult.segment.handleOut.y;
            if(hix === 0 && hiy === 0 && hix === 0 && hiy === 0) {
                this.hitResult.segment.smooth();
            } else {
                this.hitResult.segment.handleIn.x = 0;
                this.hitResult.segment.handleIn.y = 0;
                this.hitResult.segment.handleOut.x = 0;
                this.hitResult.segment.handleOut.y = 0;
            }
        }

    }

    onMouseDrag (e) {
        if(!e.modifiers) e.modifiers = {};

        if (this.selectionBox.active) {
            this.selectionBox.drag(e.point);
        } else if(this.hitResult.item && this.hitResult.type === 'segment' && this.hitResult.item.segments) {
            // We're dragging vertex selection, so move all selected points.
            var path = this.hitResult.item;
            if (path && path.segments) {
                path.segments.forEach(seg => {
                    if (seg.selected) {
                        seg.point = seg.point.add(e.delta);
                    }
                });
            }
            if (this.hitResult.segment && this.hitResult.segment.point) {
                this.hoverPreview.position = this.hitResult.segment.point;
            }
        } else if(this.hitResult.item && this.hitResult.type === 'curve') {
            // We're dragging a curve, so bend the curve.
            var segment1 = this.draggingCurve.segment1;
            var segment2 = this.draggingCurve.segment2;
            var handleIn = segment1.handleOut;
            var handleOut = segment2.handleIn;

            if(handleIn.x === 0 && handleIn.y === 0) {
                handleIn.x = (segment2.point.x - segment1.point.x) / 4;
                handleIn.y = (segment2.point.y - segment1.point.y) / 4;
            }
            if(handleOut.x === 0 && handleOut.y === 0) {
                handleOut.x = (segment1.point.x - segment2.point.x) / 4;
                handleOut.y = (segment1.point.y - segment2.point.y) / 4;
            }

            handleIn.x += e.delta.x;
            handleIn.y += e.delta.y;
            handleOut.x += e.delta.x;
            handleOut.y += e.delta.y;

            // Update the hover preview to match the curve we just changed
            this.hoverPreview.segments[0].handleOut = this.draggingCurve.handle1;
            this.hoverPreview.segments[1].handleIn = this.draggingCurve.handle2;
        }

        this._updateSelectionOverlay();

        if (this.hitResult.type && this.hitResult.type.startsWith('handle')) {
            var otherHandle;
            var handle;
            if(this.hitResult.type === 'handle-in') {
                handle = this.hitResult.segment.handleIn;
                otherHandle = this.hitResult.segment.handleOut;
            } else if (this.hitResult.type === 'handle-out') {
                handle = this.hitResult.segment.handleOut;
                otherHandle = this.hitResult.segment.handleIn;
            }

            handle.x += e.delta.x;
            handle.y += e.delta.y;
            if (!e.modifiers.shift) {
                otherHandle.x -= e.delta.x;
                otherHandle.y -= e.delta.y;
            }
        }
    }

    onMouseUp (e) {
        if (this.selectionBox.active) {
            // Capture the area of the box before ending the selection tool
            var selectionRect = new this.paper.Rectangle(this.selectionBox._start, e.point);
            
            this.selectionBox.end(e.point);
            
            var hasArea = selectionRect.area >= 10;
            
            // If the user just clicked empty space (tiny rectangle without dragging)
            if (!hasArea && !e.modifiers.shift) {
                this._leaveDetailedEditing();
            } else if (hasArea) {
                if (!this.detailedEditing && this.selectionBox.items && this.selectionBox.items.length > 0) {
                    var foundPath = this.selectionBox.items.find(item => item instanceof this.paper.Path && !item.data.isBorder && item.data.wickType !== 'gui');
                    if (foundPath) {
                        this.detailedEditing = foundPath;
                    }
                }
                if (this.detailedEditing && this.detailedEditing.segments) {
                    this.detailedEditing.segments.forEach(function (seg) {
                        if (selectionRect.contains(seg.point)) {
                            seg.selected = true;
                        }
                    });
                }
            }
            // Removed: this.fireEvent({eventName: 'canvasModified', actionName: 'pathcursorSelectMultiple'});
            // We do not modify the canvas when simply selecting vertices.
        } else if (this.hitResult.type === 'segment' || this.hitResult.type === 'curve' || (this.hitResult.type && this.hitResult.type.startsWith('handle'))) {
            
            // Auto-Shape-Key framing logic
            if (this._onMouseDownJSON && this._onMouseDownUUID) {
                var wickPath = Wick.ObjectCache.getObjectByUUID(this._onMouseDownUUID);
                if (wickPath && wickPath.parentFrame) {
                    var frame = wickPath.parentFrame;
                    var relPos = frame.getRelativePlayheadPosition();

                    // If we are at relPos > 1 in an extended frame with no tweens, create the auto-keys
                    if (relPos > 1 && frame.length > 1 && frame.tweens.length === 0) {
                        // Create start key with original data
                        frame.addTween(new Wick.Tween({
                            playheadPosition: 1,
                            shapeData: this._onMouseDownJSON,
                            transformation: new Wick.Transformation({ opacity: wickPath.opacity })
                        }));

                        // Create current key with new data
                        frame.addTween(new Wick.Tween({
                            playheadPosition: relPos,
                            shapeData: JSON.parse(JSON.stringify(wickPath.json)),
                            transformation: new Wick.Transformation({ opacity: wickPath.opacity })
                        }));
                    }
                }
            }

            this.fireEvent({eventName: 'canvasModified', actionName:'pathcursor'});
        }
        this._updateSelectionOverlay();

        this._onMouseDownJSON = null;
        this._onMouseDownUUID = null;
    }

    onKeyDown(e) {
        if (this.detailedEditing && e.key == "<") {
            var wick = Wick.ObjectCache.getObjectByUUID(
                this._getWickUUID(this.detailedEditing));
            if (wick && wick._view && wick._view._item) {
                var path = wick._view._item;
                path.closed = !path.closed;
                this.fireEvent('canvasModified');
            }
        }
    }

    _updateHitResult (e) {
        var newHitResult = this.paper.project.hitTest(e.point, {
            fill: true,
            stroke: true,
            curves: true,
            segments: true,
            handles: this.detailedEditing !== null,
            tolerance: this.SELECTION_TOLERANCE,
            match: (result => {
                return result.item !== this.hoverPreview
                    && !result.item.data.isBorder
                    && result.item.data.wickType !== 'gui';
            }),
        });
        if(!newHitResult) newHitResult = new this.paper.HitResult();

        if (this.detailedEditing) {
            if (this._getWickUUID(newHitResult.item) !== this._getWickUUID(this.detailedEditing)) {
                // Hits an item, but not the one currently in detail edit - handle as a click with no hit.
                return new this.paper.HitResult();
            }

            if (newHitResult.item && newHitResult.type.startsWith('handle')) {
                // If this a click on a handle, do not apply hit type prediction below.
                return newHitResult;
            }
        }

        if(newHitResult.item && !newHitResult.item.data.isSelectionBoxGUI) {
            // You can't select children of compound paths, you can only select the whole thing.
            if (newHitResult.item.parent.className === 'CompoundPath') {
                newHitResult.item = newHitResult.item.parent;
            }

            // You can't select individual children in a group, you can only select the whole thing.
            if (newHitResult.item.parent.parent) {
                newHitResult.type = 'fill';

                while (newHitResult.item.parent.parent) {
                    newHitResult.item = newHitResult.item.parent;
                }
            }

            // this.paper.js has two names for strokes+curves, we don't need that extra info
            if(newHitResult.type === 'stroke') {
                newHitResult.type = 'curve';
            }

            // Mousing over rasters acts the same as mousing over fills.
            if(newHitResult.type === 'pixel') {
                newHitResult.type = 'fill';
            }
        }

        return newHitResult;
    }

    _getCursor () {
        if(!this.hitResult.item) {
            return this.CURSOR_DEFAULT;
        } else if (this.hitResult.type === 'curve') {
            return this.CURSOR_CURVE;
        } else if (this.hitResult.type === 'segment') {
            return this.CURSOR_SEGMENT;
        }
    }

    _setCursor (cursor) {
        this.currentCursorIcon = cursor;
    }

    _leaveDetailedEditing () {
        if (this.detailedEditing) {
            this.paper.project.deselectAll();

            this.paper.project.activeLayer.children.forEach(function (child) {
                if (child.wick && !child.wick.isSymbol) {
                    child.fullySelected = false;
                }
            });

            this.detailedEditing = null;

            this.fireEvent('canvasModified');
        }
    }

    _getWickUUID (item) {
        if (item) {
            return item.data.wickUUID;
        } else {
            return undefined;
        }
    }

    _updateSelectionOverlay () {
        if (this.selectionOverlay) this.selectionOverlay.remove();
        
        // Ensure we draw on the project's current active layer (usually the top-most frame layer)
        this.selectionOverlay = new this.paper.Group();
        this.selectionOverlay.data.wickType = 'gui';
        this.selectionOverlay.bringToFront();

        if (this.detailedEditing && this.detailedEditing.segments) {
            var self = this;
            this.detailedEditing.segments.forEach(function (seg) {
                if (seg.selected) {
                    // Convert local segment point to global project coordinates
                    var globalPoint = self.detailedEditing.localToGlobal(seg.point);
                    
                    var circle = new self.paper.Path.Circle({
                        center: globalPoint,
                        radius: 12 / self.paper.view.zoom,
                        fillColor: '#00FF00', // Diagnostic LIME GREEN
                        strokeColor: 'black',
                        strokeWidth: 2 / self.paper.view.zoom,
                        insert: true
                    });
                    circle.data.wickType = 'gui';
                    self.selectionOverlay.addChild(circle);
                }
            });
        }
        
        if (this.paper.view) {
            this.paper.view.draw();
        }
    }
}
