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

(function () {
    /**
     * When text is edited in a fixed-width box (boxWidth is set), the textarea
     * uses CSS word-wrap to visually break lines. paper.js PointText has no native
     * word-wrap, so we must insert explicit \n characters at the same break points.
     */
    function wrapTextToBoxWidth(content, fontSize, fontFamily, boxWidth) {
        if (!boxWidth || boxWidth <= 0) return content;
        var measureCanvas = document.createElement('canvas');
        var ctx = measureCanvas.getContext('2d');
        ctx.font = fontSize + 'px ' + (fontFamily || 'sans-serif');

        var resultLines = [];
        var paragraphs = content.split('\n');

        for (var p = 0; p < paragraphs.length; p++) {
            var para = paragraphs[p];
            if (!para) { resultLines.push(''); continue; }

            var currentLine = '';
            var tokens = para.split(/(\s+)/);

            for (var t = 0; t < tokens.length; t++) {
                var token = tokens[t];
                var test = currentLine + token;
                if (ctx.measureText(test).width <= boxWidth) {
                    currentLine = test;
                } else {
                    if (currentLine.trim()) {
                        resultLines.push(currentLine.replace(/\s+$/, ''));
                        currentLine = /^\s+$/.test(token) ? '' : token;
                    } else {
                        // Single token longer than boxWidth: break char by char
                        for (var c = 0; c < token.length; c++) {
                            var charTest = currentLine + token[c];
                            if (ctx.measureText(charTest).width <= boxWidth) {
                                currentLine = charTest;
                            } else {
                                if (currentLine) resultLines.push(currentLine);
                                currentLine = token[c];
                            }
                        }
                    }
                }
            }
            resultLines.push(currentLine.replace(/\s+$/, ''));
        }

        return resultLines.join('\n');
    }

    var editElem = $('<textarea class="wick-canvas-text-edit" style="resize: none;">');
    var selectionOverlay = $('<div class="wick-canvas-text-selection-overlay" style="display: none;"></div>');
    editElem.css('position', 'absolute');
    editElem.css('overflow', 'hidden');
    editElem.css('width', '100px');
    editElem.css('height', '100px');
    editElem.css('left', '0px');
    editElem.css('top', '0px');
    editElem.css('resize', 'none');
    editElem.css('line-height', '1.2');
    editElem.css('background', 'transparent');
    editElem.css('background-color', 'transparent');
    editElem.css('box-sizing', 'content-box');
    editElem.css('-moz-box-sizing', 'content-box');
    editElem.css('-webkit-box-sizing', 'content-box');
    editElem.css('border', 'none');
    editElem.css('outline', 'none');
    editElem.css('box-shadow', 'none');
    editElem.css('padding', '0');
    editElem.css('margin', '0');
    editElem.css('cursor', 'text');
    editElem.css('user-select', 'text');
    editElem.css('-webkit-user-select', 'text');
    editElem.css('pointer-events', 'auto');
    editElem.css('z-index', '10');

    // Prevent paper tool from intercepting mouse clicks and drags inside the textarea so selection works
    editElem.on('mousedown mouseup mousemove click dblclick contextmenu', function (e) {
        e.stopPropagation();
    });

    // Synchronize scrolling between textarea and selectionOverlay
    editElem.on('scroll', function () {
        if (selectionOverlay && selectionOverlay.length) {
            selectionOverlay[0].scrollTop = editElem[0].scrollTop;
            selectionOverlay[0].scrollLeft = editElem[0].scrollLeft;
        }
    });

    // Floating text selection format toolbar
    var formatToolbar = $('<div class="wick-text-format-toolbar"></div>');
    formatToolbar.css({
        position: 'absolute',
        display: 'none',
        zIndex: 999,
        background: '#222228',
        border: '1px solid #444',
        borderRadius: '6px',
        padding: '5px 8px',
        boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
        gap: '6px',
        alignItems: 'center',
        flexWrap: 'nowrap',
        userSelect: 'none',
        pointerEvents: 'auto'
    });

    var fontOptions = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Trebuchet MS', 'Impact', 'Comic Sans MS', 'Inter', 'Roboto'];
    var fontSelectHtml = '<select class="wick-fmt-font" style="background:#141416;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;outline:none;">' +
        fontOptions.map(function(f){ return '<option value="'+f+'">'+f+'</option>'; }).join('') +
        '</select>';

    formatToolbar.html(
        fontSelectHtml +
        '<input type="number" class="wick-fmt-size" title="Dimensione Font" value="24" min="6" max="200" style="width:45px;background:#141416;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;outline:none;"/>' +
        '<button type="button" class="wick-fmt-btn wick-fmt-bold" title="Grassetto (Bold)" style="background:#333;color:#eee;border:none;border-radius:4px;padding:2px 7px;font-weight:bold;cursor:pointer;font-size:11px;">B</button>' +
        '<button type="button" class="wick-fmt-btn wick-fmt-italic" title="Corsivo (Italic)" style="background:#333;color:#eee;border:none;border-radius:4px;padding:2px 7px;font-style:italic;cursor:pointer;font-size:11px;">I</button>' +
        '<input type="number" class="wick-fmt-lineheight" title="Interlinea (Line Height)" value="1.2" step="0.1" min="0.5" max="3" style="width:42px;background:#141416;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;outline:none;"/>' +
        '<input type="number" class="wick-fmt-spacing" title="Spaziatura Lettere (Letter Spacing px)" value="0" step="1" min="-5" max="30" style="width:40px;background:#141416;color:#eee;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;outline:none;"/>' +
        '<button type="button" class="wick-fmt-btn wick-fmt-align" data-align="left" title="Allinea a Sinistra" style="background:#333;color:#eee;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">Left</button>' +
        '<button type="button" class="wick-fmt-btn wick-fmt-align" data-align="center" title="Allinea al Centro" style="background:#333;color:#eee;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">Center</button>' +
        '<button type="button" class="wick-fmt-btn wick-fmt-align" data-align="right" title="Allinea a Destra" style="background:#333;color:#eee;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">Right</button>' +
        '<button type="button" class="wick-fmt-btn wick-fmt-align" data-align="justify" title="Giustifica" style="background:#333;color:#eee;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;">Justify</button>' +
        '<input type="color" class="wick-fmt-color" title="Colore Testo" value="#000000" style="width:24px;height:22px;padding:0;border:none;background:none;cursor:pointer;"/>'
    );

    formatToolbar.on('mousedown mouseup mousemove click dblclick', function (e) {
        e.stopPropagation();
    });

    var activeTextItem = null;

    function getBaseStyle(item) {
        if (!item) return {
            fillColor: '#000000',
            fontFamily: 'Arial',
            fontSize: 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            lineHeight: 1.2,
            letterSpacing: 0,
            justification: 'left',
            textAlign: 'left'
        };
        var col = item.fillColor ? (item.fillColor.toCSS ? item.fillColor.toCSS(true) : String(item.fillColor)) : '#000000';
        var fw = item.fontWeight;
        if (typeof fw === 'number') {
            fw = (fw >= 700) ? 'bold' : 'normal';
        } else if (!fw) {
            fw = 'normal';
        }
        var fs = item.fontStyle || 'normal';
        return {
            fillColor: col,
            fontFamily: item.fontFamily || 'Arial',
            fontSize: item.fontSize || 24,
            fontWeight: fw,
            fontStyle: fs,
            lineHeight: item.lineHeight || 1.2,
            letterSpacing: item.letterSpacing || 0,
            justification: item.justification || 'left',
            textAlign: item.textAlign || item.justification || 'left'
        };
    }

    function syncFormatToolbarUI(style) {
        if (!style) return;
        formatToolbar.find('.wick-fmt-font').val(style.fontFamily || 'Arial');
        formatToolbar.find('.wick-fmt-size').val(style.fontSize || 24);
        var col = style.fillColor || '#000000';
        formatToolbar.find('.wick-fmt-color').val(col.startsWith('#') ? col : '#000000');
        var isBold = style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 700;
        formatToolbar.find('.wick-fmt-bold').css('background', isBold ? '#00a1e0' : '#333');
        var isItalic = style.fontStyle === 'italic';
        formatToolbar.find('.wick-fmt-italic').css('background', isItalic ? '#00a1e0' : '#333');
        formatToolbar.find('.wick-fmt-lineheight').val(style.lineHeight || 1.2);
        formatToolbar.find('.wick-fmt-spacing').val(style.letterSpacing || 0);
        formatToolbar.find('.wick-fmt-align').css('background', '#333');
        formatToolbar.find('.wick-fmt-align[data-align="' + (style.textAlign || 'left') + '"]').css('background', '#00a1e0');
    }

    function renderFormattedBackdrop() {
        if (!activeTextItem || !editElem || !editElem.is(':visible') || !selectionOverlay) {
            if (selectionOverlay) selectionOverlay.empty().hide();
            return;
        }

        var fullText = editElem.val() || '';
        if (fullText.length === 0) {
            selectionOverlay.empty().show();
            return;
        }

        var lastSub = activeTextItem._lastSubSelection;
        var sStart = (lastSub && typeof lastSub.start === 'number') ? lastSub.start : -1;
        var sEnd = (lastSub && typeof lastSub.end === 'number') ? lastSub.end : -1;
        var hasSub = (sStart >= 0 && sEnd > sStart);

        var baseStyle = getBaseStyle(activeTextItem);
        var spans = activeTextItem._spans || [];

        if (!spans || spans.length === 0) {
            var normalCol = baseStyle.fillColor || '#000000';
            editElem.css('color', normalCol);
            editElem.css('-webkit-text-fill-color', normalCol);
            editElem.css('caret-color', normalCol);
            selectionOverlay.empty().hide();
            return;
        }

        editElem.css('color', 'transparent');
        editElem.css('-webkit-text-fill-color', 'transparent');
        editElem.css('caret-color', baseStyle.fillColor || '#000000');

        // Build per-character style array
        var charStyles = [];
        for (var c = 0; c < fullText.length; c++) {
            charStyles.push(Object.assign({}, baseStyle));
        }

        for (var s = 0; s < spans.length; s++) {
            var sp = spans[s];
            var stIdx = Math.max(0, Math.min(sp.start, fullText.length));
            var enIdx = Math.max(0, Math.min(sp.end, fullText.length));
            for (var i = stIdx; i < enIdx; i++) {
                Object.assign(charStyles[i], sp.style);
            }
        }

        function escapeHtml(str) {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        // Group into segments with matching styling and selection status
        var html = '';
        var curText = '';
        var curStyle = null;
        var curSelected = false;

        for (var idx = 0; idx < fullText.length; idx++) {
            var char = fullText[idx];
            var st = charStyles[idx];
            var isSel = hasSub && (idx >= sStart && idx < sEnd);

            if (!curStyle) {
                curStyle = st;
                curSelected = isSel;
                curText = char;
            } else {
                var same = (
                    curSelected === isSel &&
                    st.fontFamily === curStyle.fontFamily &&
                    st.fontSize === curStyle.fontSize &&
                    st.fillColor === curStyle.fillColor &&
                    st.fontWeight === curStyle.fontWeight &&
                    st.fontStyle === curStyle.fontStyle
                );
                if (same) {
                    curText += char;
                } else {
                    html += buildSegmentHtml(curText, curStyle, curSelected);
                    curStyle = st;
                    curSelected = isSel;
                    curText = char;
                }
            }
        }
        if (curText.length > 0) {
            html += buildSegmentHtml(curText, curStyle, curSelected);
        }

        function buildSegmentHtml(txt, styleObj, isSelected) {
            var safe = escapeHtml(txt);
            var col = styleObj.fillColor || '#000000';
            var ff = styleObj.fontFamily || 'Arial';
            var fz = (styleObj.fontSize || 24) * (activeTextItem.paper ? activeTextItem.paper.view.zoom : 1);
            var fw = styleObj.fontWeight || 'normal';
            var fs = styleObj.fontStyle || 'normal';

            var spanCss = 'font-family:' + ff + ';' +
                          'font-size:' + fz + 'px;' +
                          'font-weight:' + fw + ';' +
                          'font-style:' + fs + ';' +
                          'color:' + col + ';';

            if (isSelected) {
                var markCss = 'background:rgba(0, 161, 224, 0.35);' +
                              'border-bottom:2px solid #00a1e0;' +
                              'border-radius:2px;' +
                              'padding:0;' +
                              'margin:0;';
                return '<mark style="' + markCss + '"><span style="' + spanCss + '">' + safe + '</span></mark>';
            } else {
                return '<span style="' + spanCss + '">' + safe + '</span>';
            }
        }

        selectionOverlay.html(html);
        selectionOverlay.show();
    }

    function updateSelectionOverlay() {
        renderFormattedBackdrop();
    }

    function updateSelectionState() {
        if (!editElem || !editElem.is(':visible') || !activeTextItem) {
            window.WickTextSelectionState = null;
            if (selectionOverlay) selectionOverlay.empty().hide();
            formatToolbar.hide();
            return;
        }
        var textarea = editElem[0];
        var sStart = textarea.selectionStart;
        var sEnd = textarea.selectionEnd;
        var isSub = (typeof sStart === 'number' && typeof sEnd === 'number' && sStart !== sEnd);

        if (isSub) {
            var currentStyle = Object.assign({}, getBaseStyle(activeTextItem));
            if (activeTextItem._spans && activeTextItem._spans.length > 0) {
                for (var i = 0; i < activeTextItem._spans.length; i++) {
                    var sp = activeTextItem._spans[i];
                    if (sp.start <= sStart && sp.end >= sEnd) {
                        currentStyle = Object.assign({}, currentStyle, sp.style);
                        break;
                    }
                }
            }
            activeTextItem._lastSubSelection = {
                start: sStart,
                end: sEnd,
                style: currentStyle
            };
        }

        // Keep the sub-selection active until the user clicks outside the block (finishEditing)
        var effectiveSub = !!(activeTextItem._lastSubSelection && activeTextItem._lastSubSelection.start !== activeTextItem._lastSubSelection.end);
        var effectiveStyle = effectiveSub ? activeTextItem._lastSubSelection.style : getBaseStyle(activeTextItem);
        var effectiveStart = effectiveSub ? activeTextItem._lastSubSelection.start : sStart;
        var effectiveEnd = effectiveSub ? activeTextItem._lastSubSelection.end : sEnd;

        window.WickTextSelectionState = {
            activeTextItem: activeTextItem,
            editElem: textarea,
            selectionStart: effectiveStart,
            selectionEnd: effectiveEnd,
            isSubSelection: effectiveSub,
            style: Object.assign({}, effectiveStyle)
        };

        syncFormatToolbarUI(window.WickTextSelectionState.style);
        updateSelectionOverlay();

        if (effectiveSub) {
            var offset = editElem.position();
            if (offset) {
                formatToolbar.css({
                    left: Math.max(10, offset.left) + 'px',
                    top: Math.max(10, offset.top - 42) + 'px',
                    display: 'flex'
                });
            }
        } else {
            formatToolbar.hide();
        }

        // Notify editor/React so the lateral Inspector refreshes
        if (window.WickEditorInstance && window.WickEditorInstance.projectDidChange) {
            window.WickEditorInstance.projectDidChange({ skipHistory: true });
        }
    }

    editElem.on('mousedown', function (e) {
        e.stopPropagation();
    });

    editElem.on('mouseup', function (e) {
        e.stopPropagation();
        updateSelectionState();
    });

    editElem.on('select', function (e) {
        updateSelectionState();
    });

    editElem.on('keyup', function (e) {
        updateSelectionState();
    });

    editElem.on('blur', function (e) {
        // When losing focus (e.g. clicking into lateral Inspector panel or dropdowns), PRESERVE the sub-selection!
        updateSelectionState();
    });

    editElem.on('focus', function (e) {
        updateSelectionState();
    });

    // Function to apply formatting (from floating toolbar or lateral Inspector)
    window.applyWickTextSelectionStyle = function (attribute, value) {
        if (!activeTextItem || !editElem || !editElem.is(':visible')) return;
        var textarea = editElem[0];
        var sStart = textarea.selectionStart;
        var sEnd = textarea.selectionEnd;
        var isSub = (typeof sStart === 'number' && typeof sEnd === 'number' && sStart !== sEnd);

        if (!isSub && activeTextItem._lastSubSelection && activeTextItem._lastSubSelection.start !== activeTextItem._lastSubSelection.end) {
            sStart = activeTextItem._lastSubSelection.start;
            sEnd = activeTextItem._lastSubSelection.end;
            isSub = true;
        }

        if (!activeTextItem._spans) {
            activeTextItem._spans = [];
        }

        // Normalize attribute names and values
        var key = attribute;
        var val = value;
        if (attribute === 'fillColor' || attribute === 'color') {
            key = 'fillColor';
            if (val && val.toCSS) {
                val = val.toCSS(true);
            } else if (val && typeof val === 'object' && val.hex) {
                val = val.hex;
            } else if (val && typeof val === 'object' && val.rgba) {
                val = val.rgba;
            }
        } else if (attribute === 'fontSize') {
            val = parseFloat(val) || 24;
        } else if (attribute === 'fontWeight') {
            val = (val === 'bold' || parseInt(val, 10) >= 700) ? 'bold' : 'normal';
        } else if (attribute === 'fontStyle') {
            val = val || 'normal';
        } else if (attribute === 'lineHeight') {
            val = parseFloat(val) || 1.2;
        } else if (attribute === 'letterSpacing') {
            val = parseFloat(val) || 0;
        }

        if (isSub) {
            // Apply to selection span
            var updatedStyle = {};
            updatedStyle[key] = val;

            // Find existing span overlapping exactly or create/update
            var replaced = false;
            for (var i = 0; i < activeTextItem._spans.length; i++) {
                var s = activeTextItem._spans[i];
                if (s.start === sStart && s.end === sEnd) {
                    s.style[key] = val;
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                activeTextItem._spans.push({
                    start: sStart,
                    end: sEnd,
                    style: updatedStyle
                });
            }

            if (!activeTextItem._lastSubSelection) {
                activeTextItem._lastSubSelection = {
                    start: sStart,
                    end: sEnd,
                    style: Object.assign({}, getBaseStyle(activeTextItem))
                };
            }
            activeTextItem._lastSubSelection.style[key] = val;

            // If span covers entire text, update base appearance on textarea
            var fullLen = (editElem.val() || '').length;
            if (sStart === 0 && sEnd >= fullLen) {
                if (key === 'fillColor') {
                    editElem.css('color', val);
                    editElem.css('caret-color', val);
                } else if (key === 'fontFamily') {
                    editElem.css('font-family', val);
                } else if (key === 'fontWeight') {
                    editElem.css('font-weight', val);
                } else if (key === 'fontStyle') {
                    editElem.css('font-style', val);
                }
            }
        } else {
            // Apply to the whole item
            if (key === 'fillColor') {
                activeTextItem.fillColor = val;
                editElem.css('color', val);
                editElem.css('caret-color', val);
            } else if (key === 'fontSize') {
                activeTextItem.fontSize = val;
                if (activeTextItem.paper) {
                    activeTextItem.attachTextArea(activeTextItem.paper);
                }
            } else if (key === 'fontFamily') {
                activeTextItem.fontFamily = val;
                editElem.css('font-family', val);
                if (selectionOverlay) selectionOverlay.css('font-family', val);
            } else if (key === 'fontWeight') {
                activeTextItem.fontWeight = (val === 'bold' || parseInt(val, 10) >= 700) ? 700 : 400;
                editElem.css('font-weight', val);
                if (selectionOverlay) selectionOverlay.css('font-weight', val);
            } else if (key === 'fontStyle') {
                activeTextItem.fontStyle = val;
                editElem.css('font-style', val);
                if (selectionOverlay) selectionOverlay.css('font-style', val);
            } else if (key === 'lineHeight') {
                activeTextItem.lineHeight = val;
                editElem.css('line-height', val);
                if (selectionOverlay) selectionOverlay.css('line-height', val);
            } else if (key === 'letterSpacing') {
                activeTextItem.letterSpacing = val;
                editElem.css('letter-spacing', val + 'px');
                if (selectionOverlay) selectionOverlay.css('letter-spacing', val + 'px');
            } else if (key === 'justification' || key === 'textAlign') {
                activeTextItem.justification = val === 'justify' ? 'left' : val;
                activeTextItem.textAlign = val;
                editElem.css('text-align', val);
                if (selectionOverlay) selectionOverlay.css('text-align', val);
            }
        }

        // Update WickTextSelectionState cache
        if (!window.WickTextSelectionState) {
            window.WickTextSelectionState = {
                activeTextItem: activeTextItem,
                editElem: textarea,
                selectionStart: sStart,
                selectionEnd: sEnd,
                isSubSelection: isSub,
                style: Object.assign({}, getBaseStyle(activeTextItem))
            };
        }
        window.WickTextSelectionState.style[key] = val;
        window.WickTextSelectionState.isSubSelection = isSub;
        window.WickTextSelectionState.selectionStart = sStart;
        window.WickTextSelectionState.selectionEnd = sEnd;

        syncFormatToolbarUI(window.WickTextSelectionState.style);
        updateSelectionOverlay();

        if (window.WickEditorInstance && window.WickEditorInstance.projectDidChange) {
            window.WickEditorInstance.projectDidChange({ skipHistory: true });
        }
    };

    // Formatting Toolbar Event Listeners delegating to window.applyWickTextSelectionStyle
    formatToolbar.find('.wick-fmt-font').on('change', function () {
        window.applyWickTextSelectionStyle('fontFamily', $(this).val());
    });

    formatToolbar.find('.wick-fmt-size').on('change input', function () {
        window.applyWickTextSelectionStyle('fontSize', $(this).val());
    });

    formatToolbar.find('.wick-fmt-bold').on('click', function () {
        var currentWeight = window.WickTextSelectionState && window.WickTextSelectionState.style ? window.WickTextSelectionState.style.fontWeight : editElem.css('font-weight');
        var isBold = currentWeight === 'bold' || parseInt(currentWeight, 10) >= 700;
        var nextWeight = isBold ? 'normal' : 'bold';
        window.applyWickTextSelectionStyle('fontWeight', nextWeight);
    });

    formatToolbar.find('.wick-fmt-italic').on('click', function () {
        var currentStyle = window.WickTextSelectionState && window.WickTextSelectionState.style ? window.WickTextSelectionState.style.fontStyle : editElem.css('font-style');
        var isItalic = currentStyle === 'italic';
        var nextStyle = isItalic ? 'normal' : 'italic';
        window.applyWickTextSelectionStyle('fontStyle', nextStyle);
    });

    formatToolbar.find('.wick-fmt-lineheight').on('change input', function () {
        window.applyWickTextSelectionStyle('lineHeight', $(this).val());
    });

    formatToolbar.find('.wick-fmt-spacing').on('change input', function () {
        window.applyWickTextSelectionStyle('letterSpacing', $(this).val());
    });

    formatToolbar.find('.wick-fmt-align').on('click', function () {
        var align = $(this).data('align');
        window.applyWickTextSelectionStyle('textAlign', align);
    });

    formatToolbar.find('.wick-fmt-color').on('change input', function () {
        window.applyWickTextSelectionStyle('fillColor', $(this).val());
    });

    paper.TextItem.inject({
        attachTextArea: function (paper) {
            this.paper = paper;
            activeTextItem = this;
            this._lastSubSelection = null;

            // Just in case the textbox is still on screen somehow...
            if(editElem) {
                editElem.remove();
            }
            if(selectionOverlay) {
                selectionOverlay.remove();
            }
            if(formatToolbar) {
                formatToolbar.remove();
            }

            selectionOverlay = $('<div class="wick-canvas-text-selection-overlay" style="display: none;"></div>');
            $(paper.view.element.offsetParent).append(selectionOverlay);
            $(paper.view.element.offsetParent).append(editElem);
            $(paper.view.element.offsetParent).append(formatToolbar);
            editElem.focus();

            var clone = this.clone();
            clone.visible = true;
            clone.rotation = 0;
            clone.scaling = new paper.Point(1,1);
            var bounds = clone.bounds;
            clone.remove();

            var extraPadding = 4; // Extra padding so edit item doesn't get cut off.

            var width = this.boxWidth ? (this.boxWidth * paper.view.zoom) : ((bounds.width * paper.view.zoom) + extraPadding);
            var height = this.boxHeight ? (this.boxHeight * paper.view.zoom) : ((bounds.height * paper.view.zoom) + extraPadding);
            editElem.css('left', '0px');
            editElem.css('top', '0px');
            editElem.css('width', width+'px');
            editElem.css('height', height+'px');
            if (this.boxWidth) {
                editElem.css('white-space', 'pre-wrap');
                editElem.css('word-break', 'break-word');
            } else {
                editElem.css('white-space', 'pre');
                editElem.css('word-break', 'normal');
            }

            editElem.css('outline', 'none');
            editElem.css('border', 'none');
            editElem.css('background', 'transparent');
            editElem.css('box-shadow', 'none');
            editElem.css('user-select', 'text');
            editElem.css('-webkit-user-select', 'text');
            editElem.css('pointer-events', 'auto');
            editElem.css('z-index', '10');

            var position = paper.view.projectToView(bounds.topLeft.x, bounds.topLeft.y);
            position.x -= extraPadding/2;
            position.y -= extraPadding/2;
            var scale = this.scaling;
            var rotation = this.rotation;

            var fontSize = this.fontSize * paper.view.zoom;
            var fontFamily = this.fontFamily;
            var content = this.content;
            var color = this.fillColor ? (this.fillColor.toCSS ? this.fillColor.toCSS(true) : String(this.fillColor)) : '#000000';
            var textAlign = this.textAlign || this.justification || 'left';
            if (textAlign === 'justify') textAlign = 'left';

            editElem.css('font-family', fontFamily);
            editElem.css('font-size', fontSize + 'px');
            editElem.css('text-align', textAlign);
            editElem.css('color', color);
            editElem.css('-webkit-text-fill-color', color);
            editElem.css('caret-color', color);
            if (this.lineHeight) editElem.css('line-height', this.lineHeight);
            if (this.letterSpacing) editElem.css('letter-spacing', this.letterSpacing + 'px');
            if (this.fontWeight) editElem.css('font-weight', this.fontWeight);
            if (this.fontStyle) editElem.css('font-style', this.fontStyle);

            var transformString = '';
            transformString += 'translate('+position.x+'px,'+position.y+'px) ';
            transformString += 'rotate('+rotation+'deg) ';
            transformString += 'scale('+scale.x+','+scale.y+') ';
            editElem.css('transform', transformString);

            // Sync selectionOverlay position, dimensions, transform and typography
            selectionOverlay.css({
                position: 'absolute',
                left: '0px',
                top: '0px',
                pointerEvents: 'none',
                overflow: 'hidden',
                boxSizing: 'content-box',
                border: 'none',
                outline: 'none',
                padding: '0',
                margin: '0',
                zIndex: '9',
                width: width + 'px',
                height: height + 'px',
                whiteSpace: this.boxWidth ? 'pre-wrap' : 'pre',
                wordBreak: this.boxWidth ? 'break-word' : 'normal',
                fontFamily: fontFamily,
                fontSize: fontSize + 'px',
                lineHeight: this.lineHeight ? this.lineHeight : 1.2,
                letterSpacing: (this.letterSpacing || 0) + 'px',
                textAlign: textAlign,
                fontWeight: this.fontWeight || 'normal',
                fontStyle: this.fontStyle || 'normal',
                transform: transformString,
                display: 'none'
            });

            formatToolbar.find('.wick-fmt-font').val(fontFamily);
            formatToolbar.find('.wick-fmt-size').val(this.fontSize);
            formatToolbar.find('.wick-fmt-color').val(color.startsWith('#') ? color : '#000000');

            editElem.val(content);

            updateSelectionState(false);
        },
        edit: function(paper) {
            this.attachTextArea(paper);
            this.visible = false;
            var self = this;
            editElem[0].oninput = function () {
                self.content = editElem[0].value;
                // Auto-resize textarea height so the user can see all typed lines
                editElem[0].style.height = 'auto';
                var newScrollH = editElem[0].scrollHeight;
                editElem[0].style.height = newScrollH + 'px';
                if (selectionOverlay) {
                    selectionOverlay.css('height', newScrollH + 'px');
                }
                if (self.boxWidth) {
                    var newBoxH = newScrollH / paper.view.zoom;
                    self.boxHeight = newBoxH;
                    self.data.boxWidth  = self.boxWidth;
                    self.data.boxHeight = newBoxH;
                }
                self._lastSubSelection = null;
                updateSelectionOverlay();
                updateSelectionState(true);
            }
        },
        finishEditing: function() {
            if (this._isFinishingEditing) return;
            this._isFinishingEditing = true;
            try {
                if (editElem && editElem.length && editElem[0]) {
                    this.content = editElem[0].value;
                }
                if (this.paper) {
                // When text was edited in a fixed-width box (boxWidth is set), the textarea
                // CSS-wraps text visually (white-space: pre-wrap). paper.js PointText has
                // no native word-wrap, so we insert explicit \n at the CSS break points.
                if (this.boxWidth) {
                    var wrapped = wrapTextToBoxWidth(
                        this.content,
                        this.fontSize || 24,
                        this.fontFamily || 'sans-serif',
                        this.boxWidth
                    );
                    if (wrapped !== this.content) {
                        this.content = wrapped;
                    }
                    // Persist boxHeight so the re-import restores box dimensions
                    if (editElem && editElem.length) {
                        try {
                            var finalH = editElem[0].offsetHeight || editElem[0].scrollHeight;
                            if (finalH > 0) {
                                this.boxHeight = finalH / this.paper.view.zoom;
                                this.data.boxWidth  = this.boxWidth;
                                this.data.boxHeight = this.boxHeight;
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
                // Explicitly set leading so multiline text renders with correct line spacing.
                // this.lineHeight is the unitless multiplier stored by the format toolbar (e.g. 1.2).
                var lhMultiplier = (typeof this.lineHeight === 'number') ? this.lineHeight : 1.2;
                var computedLeading = (this.fontSize || 24) * lhMultiplier;
                this.leading = computedLeading;
                this.data.leading = computedLeading;

                // MULTI-SPAN SEGMENTATION ("Split in segmenti")
                var spans = this._spans;
                if (spans && spans.length > 0 && this.content && this.content.length > 0) {
                    try {
                        var fullText = this.content;
                        var baseStyle = getBaseStyle(this);

                        // Build per-character style array
                        var charStyles = [];
                        for (var c = 0; c < fullText.length; c++) {
                            charStyles.push(Object.assign({}, baseStyle));
                        }

                        // Apply spans in order
                        for (var s = 0; s < spans.length; s++) {
                            var sp = spans[s];
                            var startIdx = Math.max(0, Math.min(sp.start, fullText.length));
                            var endIdx = Math.max(0, Math.min(sp.end, fullText.length));
                            for (var idx = startIdx; idx < endIdx; idx++) {
                                Object.assign(charStyles[idx], sp.style);
                            }
                        }

                        // Measure canvas helper
                        var mCanvas = document.createElement('canvas');
                        var mCtx = mCanvas.getContext('2d');

                        function measureSegment(txt, st) {
                            var fontStr = (st.fontStyle || 'normal') + ' ' +
                                          (st.fontWeight || 'normal') + ' ' +
                                          (st.fontSize || 24) + 'px ' +
                                          (st.fontFamily || 'Arial');
                            mCtx.font = fontStr;
                            return mCtx.measureText(txt).width;
                        }

                        // Split into lines by \n
                        var charOffset = 0;
                        var rawLines = fullText.split('\n');
                        var lineSegments = []; // array of segments with { text, style, lineIdx }

                        for (var l = 0; l < rawLines.length; l++) {
                            var lineStr = rawLines[l];
                            if (lineStr.length === 0) {
                                charOffset += 1; // +1 for the '\n'
                                continue;
                            }

                            var currentSegText = '';
                            var currentSegStyle = null;

                            for (var i = 0; i < lineStr.length; i++) {
                                var ch = lineStr[i];
                                var chStyle = charStyles[charOffset + i];

                                if (!currentSegStyle) {
                                    currentSegStyle = chStyle;
                                    currentSegText = ch;
                                } else {
                                    var same = (
                                        chStyle.fillColor === currentSegStyle.fillColor &&
                                        chStyle.fontFamily === currentSegStyle.fontFamily &&
                                        chStyle.fontSize === currentSegStyle.fontSize &&
                                        chStyle.fontWeight === currentSegStyle.fontWeight &&
                                        chStyle.fontStyle === currentSegStyle.fontStyle
                                    );
                                    if (same) {
                                        currentSegText += ch;
                                    } else {
                                        lineSegments.push({
                                            text: currentSegText,
                                            style: currentSegStyle,
                                            lineIdx: l
                                        });
                                        currentSegStyle = chStyle;
                                        currentSegText = ch;
                                    }
                                }
                            }

                            if (currentSegText.length > 0) {
                                lineSegments.push({
                                    text: currentSegText,
                                    style: currentSegStyle,
                                    lineIdx: l
                                });
                            }

                            charOffset += lineStr.length + 1; // +1 for the '\n'
                        }

                        // Only perform split if there are multiple segments or style differed
                        if (lineSegments.length > 1) {
                            var originPt = this.point.clone();
                            var paperInst = this.paper;
                            var project = window.WickEditorInstance ? window.WickEditorInstance.project : null;
                            var activeFrame = project ? project.activeFrame : null;

                            var currentLineIdx = -1;
                            var currentX = originPt.x;
                            var currentY = originPt.y;
                            var createdWickPaths = [];

                            for (var segIdx = 0; segIdx < lineSegments.length; segIdx++) {
                                var seg = lineSegments[segIdx];
                                if (seg.lineIdx !== currentLineIdx) {
                                    currentLineIdx = seg.lineIdx;
                                    currentX = originPt.x;
                                    currentY = originPt.y + (currentLineIdx * computedLeading);
                                }

                                var segPt = new paperInst.Point(currentX, currentY);
                                var newPText = new paperInst.PointText(segPt);
                                newPText.content = seg.text;
                                newPText.fillColor = seg.style.fillColor || '#000000';
                                newPText.fontFamily = seg.style.fontFamily || 'Arial';
                                newPText.fontSize = seg.style.fontSize || 24;
                                newPText.fontWeight = seg.style.fontWeight || 'normal';
                                newPText.fontStyle = seg.style.fontStyle || 'normal';
                                newPText.justification = 'left';

                                var segWidth = measureSegment(seg.text, seg.style);
                                currentX += segWidth;

                                if (activeFrame && window.Wick && window.Wick.Path) {
                                    var wPath = new window.Wick.Path({
                                        json: newPText.exportJSON({ asString: false })
                                    });
                                    activeFrame.addPath(wPath);
                                    createdWickPaths.push(wPath);
                                }
                                newPText.remove();
                            }

                            // Remove original item
                            this.remove();
                            this.content = ''; // Prevent Text.js from keeping empty item

                            if (project && project.selection && createdWickPaths.length > 0) {
                                project.selection.clear();
                                project.selection.selectMultipleObjects(createdWickPaths);
                            }
                        }
                    } catch (segErr) {
                        console.error('Error during text segmentation:', segErr);
                    }
                }
            }

            if (activeTextItem) {
                activeTextItem._lastSubSelection = null;
            }
            if (selectionOverlay) {
                selectionOverlay.empty();
                selectionOverlay.remove();
                selectionOverlay = null;
            }
            this._spans = [];
            this.visible = true;
            editElem.remove();
            formatToolbar.hide();
            formatToolbar.remove();
            activeTextItem = null;
            window.WickTextSelectionState = null;

            var project = window.WickEditorInstance ? window.WickEditorInstance.project : null;
            if (!project && window.Wick && window.Wick.currentProject) {
                project = window.Wick.currentProject;
            }
            if (this.data && this.data.wickUUID && project) {
                var wickObj = project.getObjectByUUID(this.data.wickUUID);
                if (wickObj && wickObj.updateJSON) {
                    wickObj.updateJSON();
                }
            }
        } finally {
            this._isFinishingEditing = false;
        }
    },

    });

})()
