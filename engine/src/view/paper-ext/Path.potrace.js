/*
 * Copyright 2020 WICKLETS LLC
 *
 * This file is part of Paper.js-drawing-tools.
 *
 * Paper.js-drawing-tools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Paper.js-drawing-tools is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Paper.js-drawing-tools.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
    paper-potrace.js
    Adds a potrace() method to paper Items that runs potrace on a rasterized
    version of that Item.

    by zrispo (github.com/zrispo) (zach@wickeditor.com)
 */

paper.Item.inject({
    potrace: function(args) {
        var self = this;
        if(!args) throw new Error('Path.potrace: args is required.');
        if(!args.resolution) throw new Error('Path.potrace: args.resolution is required.');

        var res = paper.view.resolution || 72; // Default to 72 if resolution is missing
        var finalRasterResolution = res*args.resolution/(window.devicePixelRatio || 1);
        
        var raster = this.rasterize(finalRasterResolution);
        raster.remove();

        // Use the raster's canvas directly for synchronous tracing
        var canvas = raster.canvas;
        if (!canvas) {
            return null;
        }
        
        // Use alpha-based bitmap creation for better results with text/icons
        try {
            var bitmap = potrace.Bitmap.createFromImageAlpha(canvas);
            var pathList = potrace.PathList.fromBitmap(bitmap, 4, 2, 1, true, 0.2);
            var svg = pathList.toSVG(1/args.resolution);
            
            var potracePath = paper.project.importSVG(svg);
            potracePath.scale(1/args.resolution); // Adjust scale based on resolution
            potracePath.position.x = self.position.x;
            potracePath.position.y = self.position.y;
            potracePath.remove();
            
            var result = null;
            if (potracePath.className === 'Group' && potracePath.children.length > 0) {
                // Convert Group to CompoundPath for Wick compatibility
                result = new paper.CompoundPath();
                result.addChildren(potracePath.removeChildren());
                result.insert = false;
            } else if (potracePath.className === 'Path' || potracePath.className === 'CompoundPath') {
                result = potracePath;
            }
            
            if (result) {
                result.closed = true;
                result.position = new paper.Point(0, 0); // Center at origin to let Wick handle positioning
                if (args.done) args.done(result);
            }
            
            return result;
        } catch (err) {
            return null;
        }
    }
});
