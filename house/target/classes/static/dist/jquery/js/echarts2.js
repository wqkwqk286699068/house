(function(_global){
var require, define;
(function () {
    var mods = {};

    define = function (id, deps, factory) {
        mods[id] = {
            id: id,
            deps: deps,
            factory: factory,
            defined: 0,
            exports: {},
            require: createRequire(id)
        };
    };

    require = createRequire('');

    function normalize(id, baseId) {
        if (!baseId) {
            return id;
        }

        if (id.indexOf('.') === 0) {
            var basePath = baseId.split('/');
            var namePath = id.split('/');
            var baseLen = basePath.length - 1;
            var nameLen = namePath.length;
            var cutBaseTerms = 0;
            var cutNameTerms = 0;

            pathLoop: for (var i = 0; i < nameLen; i++) {
                switch (namePath[i]) {
                    case '..':
                        if (cutBaseTerms < baseLen) {
                            cutBaseTerms++;
                            cutNameTerms++;
                        }
                        else {
                            break pathLoop;
                        }
                        break;
                    case '.':
                        cutNameTerms++;
                        break;
                    default:
                        break pathLoop;
                }
            }

            basePath.length = baseLen - cutBaseTerms;
            namePath = namePath.slice(cutNameTerms);

            return basePath.concat(namePath).join('/');
        }

        return id;
    }

    function createRequire(baseId) {
        var cacheMods = {};

        function localRequire(id, callback) {
            if (typeof id === 'string') {
                var exports = cacheMods[id];
                if (!exports) {
                    exports = getModExports(normalize(id, baseId));
                    cacheMods[id] = exports;
                }

                return exports;
            }
            else if (id instanceof Array) {
                callback = callback || function () {};
                callback.apply(this, getModsExports(id, callback, baseId));
            }
        };

        return localRequire;
    }

    function getModsExports(ids, factory, baseId) {
        var es = [];
        var mod = mods[baseId];

        for (var i = 0, l = Math.min(ids.length, factory.length); i < l; i++) {
            var id = normalize(ids[i], baseId);
            var arg;
            switch (id) {
                case 'require':
                    arg = (mod && mod.require) || require;
                    break;
                case 'exports':
                    arg = mod.exports;
                    break;
                case 'module':
                    arg = mod;
                    break;
                default:
                    arg = getModExports(id);
            }
            es.push(arg);
        }

        return es;
    }

    function getModExports(id) {
        var mod = mods[id];
        if (!mod) {
            throw new Error('No ' + id);
        }

        if (!mod.defined) {
            var factory = mod.factory;
            var factoryReturn = factory.apply(
                this,
                getModsExports(mod.deps || [], factory, id)
            );
            if (typeof factoryReturn !== 'undefined') {
                mod.exports = factoryReturn;
            }
            mod.defined = 1;
        }

        return mod.exports;
    }
}());
define('echarts/chart/tree', ['require', './base', '../util/shape/Icon', 'zrender/shape/Image', 'zrender/shape/Line', 'zrender/shape/BezierCurve', '../layout/Tree', '../data/Tree', '../config', '../util/ecData', 'zrender/config', 'zrender/tool/event', 'zrender/tool/util', '../chart'], function (require) {
    var ChartBase = require('./base');
    var GOLDEN_SECTION = 0.618;
    // Í¼ÐÎÒÀÀµ
    var IconShape = require('../util/shape/Icon');
    var ImageShape = require('zrender/shape/Image');
    var LineShape = require('zrender/shape/Line');
    var BezierCurveShape = require('zrender/shape/BezierCurve');
    // ²¼¾ÖÒÀÀµ
    var TreeLayout = require('../layout/Tree');
    // Êý¾ÝÒÀÀµ
    var TreeData = require('../data/Tree');

    var ecConfig = require('../config');
    // Ä¬ÈÏ²ÎÊý
    ecConfig.tree = {
        zlevel: 1,                  // Ò»¼¶²ãµþ
        z: 2,                       // ¶þ¼¶²ãµþ
        calculable: false,
        clickable: true,
        rootLocation: {},
        orient: 'vertical',
        symbol: 'circle',
        symbolSize: 20,
        nodePadding: 30,
        layerPadding: 100,
        /*rootLocation: {
            x: 'center' | 'left' | 'right' | 'x%' | {number},
            y: 'center' | 'top' | 'bottom' | 'y%' | {number}
        },*/
        itemStyle: {
            normal: {
                // color: ¸÷Òì,
                label: {
                    show: true
                },
                lineStyle: {
                    width: 1,
                    color: '#777',
                    type: 'curve' // curve
                }
            },
            emphasis: {

            }
        }
    };

    var ecData = require('../util/ecData');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    var zrUtil = require('zrender/tool/util');

    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} series Êý¾Ý
     * @param {Object} component ×é¼þ
     * @constructor
     * @exports Tree
     */
    function Tree(ecTheme, messageCenter, zr, option, myChart) {
        // Í¼±í»ùÀà
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);
        this.refresh(option);
    }
    Tree.prototype = {
        type : ecConfig.CHART_TYPE_TREE,
        /**
         * ¹¹½¨µ¥¸ö
         *
         * @param {Object} data Êý¾Ý
         */
        _buildShape : function (series, seriesIndex) {
            var data = series.data[0];
            this.tree = TreeData.fromOptionData(data.name, data.children);
            // Ìí¼ÓrootµÄdata
            this.tree.root.data = data;
            // ¸ù¾Ýroot×ø±ê ·½Ïò ¶ÔÃ¿¸ö½ÚµãµÄ×ø±ê½øÐÐÓ³Éä
            this._setTreeShape(series);
            // µÝ¹é»­³öÊ÷½ÚµãÓëÁ¬½ÓÏß
            this.tree.traverse(
                function (treeNode) {
                    this._buildItem(
                        treeNode,
                        series,
                        seriesIndex
                    );
                    // »­Á¬½ÓÏß
                    if (treeNode.children.length > 0) {
                        this._buildLink(
                            treeNode,
                            series
                        );
                    }
                },
                this
            );
            var panable = series.roam === true || series.roam === 'move';
            var zoomable = series.roam === true || series.roam === 'scale';
            // Enable pan and zooom
            this.zr.modLayer(this.getZlevelBase(), {
                panable: panable,
                zoomable: zoomable
            });
            if (
                this.query('markPoint.effect.show')
                || this.query('markLine.effect.show')
            ) {
                this.zr.modLayer(ecConfig.EFFECT_ZLEVEL, {
                    panable: panable,
                    zoomable: zoomable
                });
            }
            this.addShapeList();
        },

        /**
         * ¹¹½¨µ¥¸öitem
         */
        _buildItem : function (
            treeNode,
            serie,
            seriesIndex
        ) {
            var queryTarget = [treeNode.data, serie];
            var symbol = this.deepQuery(queryTarget, 'symbol');
            // ¶à¼¶¿ØÖÆ
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            ) || {};
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            ) || {};
            var normalColor = normal.color || this.zr.getColor();
            var emphasisColor = emphasis.color || this.zr.getColor();
            var angle = -treeNode.layout.angle || 0;
            // ¸ù½Úµã²»Ðý×ª
            if (treeNode.id === this.tree.root.id) {
                angle = 0;
            }
            var textPosition = 'right';
            if (Math.abs(angle) >= Math.PI / 2 && Math.abs(angle) < Math.PI * 3 / 2) {
                angle += Math.PI;
                textPosition = 'left';
            }
            var rotation = [
                angle,
                treeNode.layout.position[0],
                treeNode.layout.position[1]
            ];
            var shape = new IconShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                rotation: rotation,
                clickable: this.deepQuery(queryTarget, 'clickable'),
                style: {
                    x: treeNode.layout.position[0] - treeNode.layout.width * 0.5,
                    y: treeNode.layout.position[1] - treeNode.layout.height * 0.5,
                    width: treeNode.layout.width,
                    height: treeNode.layout.height,
                    iconType: symbol,
                    color: normalColor,
                    brushType: 'both',
                    lineWidth: normal.borderWidth,
                    strokeColor: normal.borderColor
                },
                highlightStyle: {
                    color: emphasisColor,
                    lineWidth: emphasis.borderWidth,
                    strokeColor: emphasis.borderColor
                }
            });
            if (shape.style.iconType.match('image')) {
                shape.style.image = shape.style.iconType.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
                shape = new ImageShape({
                    rotation: rotation,
                    style: shape.style,
                    highlightStyle: shape.highlightStyle,
                    clickable: shape.clickable,
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase()
                });
            }
            // ½Úµã±êÇ©ÑùÊ½
            if (this.deepQuery(queryTarget, 'itemStyle.normal.label.show')) {
                shape.style.text = treeNode.data.label == null ? treeNode.id : treeNode.data.label;
                shape.style.textPosition = this.deepQuery(
                    queryTarget, 'itemStyle.normal.label.position'
                );
                // ¼«×ø±êÁíÍâ¼ÆËã Ê±ÖÓÄÄ¸ö²àÃæ
                if (serie.orient === 'radial' && shape.style.textPosition !== 'inside') {
                    shape.style.textPosition = textPosition;
                }
                shape.style.textColor = this.deepQuery(
                    queryTarget, 'itemStyle.normal.label.textStyle.color'
                );
                shape.style.textFont = this.getFont(this.deepQuery(
                    queryTarget, 'itemStyle.normal.label.textStyle'
                ) || {});
            }

            if (this.deepQuery(queryTarget, 'itemStyle.emphasis.label.show')) {
                shape.highlightStyle.textPosition = this.deepQuery(
                    queryTarget, 'itemStyle.emphasis.label.position'
                );
                shape.highlightStyle.textColor = this.deepQuery(
                    queryTarget, 'itemStyle.emphasis.label.textStyle.color'
                );
                shape.highlightStyle.textFont = this.getFont(this.deepQuery(
                    queryTarget, 'itemStyle.emphasis.label.textStyle'
                ) || {});
            }
            // todo
            ecData.pack(
                shape,
                serie, seriesIndex,
                treeNode.data, 0,
                treeNode.id
            );
            this.shapeList.push(shape);
        },

        _buildLink : function (
            parentNode,
            serie
        ) {
            var lineStyle = serie.itemStyle.normal.lineStyle;
            // ÕÛÏßÁíÍâ¼ÆËã
            if (lineStyle.type === 'broken') {
                this._buildBrokenLine(
                    parentNode,
                    lineStyle,
                    serie
                );
                return;
            }
            for (var i = 0; i < parentNode.children.length; i++) {
                var xStart = parentNode.layout.position[0];
                var yStart = parentNode.layout.position[1];
                var xEnd = parentNode.children[i].layout.position[0];
                var yEnd = parentNode.children[i].layout.position[1];
                switch (lineStyle.type) {
                    case 'curve':
                        this._buildBezierCurve(
                            parentNode,
                            parentNode.children[i],
                            lineStyle,
                            serie
                        );
                        break;
                    // ÕÛÏß
                    case 'broken':
                        break;
                    // default»­Ö±Ïß
                    default:
                        var shape = this._getLine(
                            xStart,
                            yStart,
                            xEnd,
                            yEnd,
                            lineStyle
                        );
                        this.shapeList.push(shape);
                }
            }
        },
        _buildBrokenLine: function (
            parentNode,
            lineStyle,
            serie
        ) {
            // ÒýÓÃ_getLineÐèÒª°Ñtype¸ÄÎªsolid
            var solidLineStyle = zrUtil.clone(lineStyle);
            solidLineStyle.type = 'solid';
            var shapes = [];
            var xStart = parentNode.layout.position[0];
            var yStart = parentNode.layout.position[1];
            var orient = serie.orient;

            // ×Ó½ÚµãµÄy
            var yEnd = parentNode.children[0].layout.position[1];
            // ÖÐµãx y
            var xMiddle = xStart;
            var yMiddle = yStart + (yEnd - yStart) * (1 - GOLDEN_SECTION);
            // ÖÐÏßµÄÆðÊ¼
            var xMiddleStart = parentNode.children[0].layout.position[0];
            var yMiddleStart = yMiddle;
            var xMiddleEnd = parentNode.children[parentNode.children.length - 1].layout.position[0];
            var yMiddleEnd = yMiddle;
            // Ë®Æ½×´Ì¬
            if (orient === 'horizontal') {
                var xEnd = parentNode.children[0].layout.position[0];
                xMiddle = xStart + (xEnd - xStart) * (1 - GOLDEN_SECTION);
                yMiddle = yStart;
                xMiddleStart = xMiddle;
                yMiddleStart = parentNode.children[0].layout.position[1];
                xMiddleEnd = xMiddle;
                yMiddleEnd = parentNode.children[parentNode.children.length - 1].layout.position[1];
            }
            // µÚÒ»Ìõ ´Ó¸ù½Úµã´¹Ö±ÏòÏÂ
            shapes.push(
                this._getLine(
                    xStart,
                    yStart,
                    xMiddle,
                    yMiddle,
                    solidLineStyle
                )
            );
            // µÚ¶þÌõ ºáÏò
            shapes.push(
                this._getLine(
                    xMiddleStart,
                    yMiddleStart,
                    xMiddleEnd,
                    yMiddleEnd,
                    solidLineStyle
                )
            );
            // µÚÈýÌõ ´¹Ö±ÏòÏÂµ½×Ó½Úµã
            for (var i = 0; i < parentNode.children.length; i++) {
                xEnd = parentNode.children[i].layout.position[0];
                yEnd = parentNode.children[i].layout.position[1];
                // Ë®Æ½×´Ì¬
                if (orient === 'horizontal') {
                    yMiddleStart = yEnd;
                }
                else {
                    xMiddleStart = xEnd;
                }
                shapes.push(
                    this._getLine(
                        xMiddleStart,
                        yMiddleStart,
                        xEnd,
                        yEnd,
                        solidLineStyle
                    )
                );
            }
            this.shapeList = this.shapeList.concat(shapes);
        },
        _getLine: function (
            xStart,
            yStart,
            xEnd,
            yEnd,
            lineStyle
        ) {
            if (xStart === xEnd) {
                xStart = xEnd = this.subPixelOptimize(xStart, lineStyle.width);
            }
            if (yStart === yEnd) {
                yStart = yEnd = this.subPixelOptimize(yStart, lineStyle.width);
            }
            return new LineShape({
                zlevel: this.getZlevelBase(),
                hoverable: false,
                style: zrUtil.merge(
                    {
                        xStart: xStart,
                        yStart: yStart,
                        xEnd: xEnd,
                        yEnd: yEnd,
                        lineType: lineStyle.type,
                        strokeColor: lineStyle.color,
                        lineWidth: lineStyle.width
                    },
                    lineStyle,
                    true
                )
            });
        },
        _buildBezierCurve: function (
            parentNode,
            treeNode,
            lineStyle,
            serie
        ) {
            var offsetRatio = GOLDEN_SECTION;
            var orient = serie.orient;
            var xStart = parentNode.layout.position[0];
            var yStart = parentNode.layout.position[1];
            var xEnd = treeNode.layout.position[0];
            var yEnd = treeNode.layout.position[1];
            var cpX1 = xStart;
            var cpY1 = (yEnd - yStart) * offsetRatio + yStart;
            var cpX2 = xEnd;
            var cpY2 = (yEnd - yStart) * (1 - offsetRatio) + yStart;
            if (orient === 'horizontal') {
                cpX1 = (xEnd - xStart) * offsetRatio + xStart;
                cpY1 = yStart;
                cpX2 = (xEnd - xStart) * (1 - offsetRatio) + xStart;
                cpY2 = yEnd;
            }
            else if (orient === 'radial') {
                // ¸ù½Úµã »­Ö±Ïß
                if (parentNode.id === this.tree.root.id) {
                    cpX1 = (xEnd - xStart) * offsetRatio + xStart;
                    cpY1 = (yEnd - yStart) * offsetRatio + yStart;
                    cpX2 = (xEnd - xStart) * (1 - offsetRatio) + xStart;
                    cpY2 = (yEnd - yStart) * (1 - offsetRatio) + yStart;
                }
                else {
                    var xStartOrigin = parentNode.layout.originPosition[0];
                    var yStartOrigin = parentNode.layout.originPosition[1];
                    var xEndOrigin = treeNode.layout.originPosition[0];
                    var yEndOrigin = treeNode.layout.originPosition[1];
                    var rootX = this.tree.root.layout.position[0];
                    var rootY = this.tree.root.layout.position[1];

                    cpX1 = xStartOrigin;
                    cpY1 = (yEndOrigin - yStartOrigin) * offsetRatio + yStartOrigin;
                    cpX2 = xEndOrigin;
                    cpY2 = (yEndOrigin - yStartOrigin) * (1 - offsetRatio) + yStartOrigin;
                    var rad = (cpX1 - this.minX) / this.width * Math.PI * 2;
                    cpX1 = cpY1 * Math.cos(rad) + rootX;
                    cpY1 = cpY1 * Math.sin(rad) + rootY;

                    rad = (cpX2 - this.minX) / this.width * Math.PI * 2;
                    cpX2 = cpY2 * Math.cos(rad) + rootX;
                    cpY2 = cpY2 * Math.sin(rad) + rootY;
                }
            }
            var shape = new BezierCurveShape({
                zlevel: this.getZlevelBase(),
                hoverable: false,
                style: zrUtil.merge(
                    {
                        xStart: xStart,
                        yStart: yStart,
                        cpX1: cpX1,
                        cpY1: cpY1,
                        cpX2: cpX2,
                        cpY2: cpY2,
                        xEnd: xEnd,
                        yEnd: yEnd,
                        strokeColor: lineStyle.color,
                        lineWidth: lineStyle.width
                    },
                    lineStyle,
                    true
                )
            });
            this.shapeList.push(shape);
        },
        _setTreeShape : function (serie) {
            // ÅÜ³öÀ´Ê÷µÄlayout
            var treeLayout = new TreeLayout(
                {
                    nodePadding: serie.nodePadding,
                    layerPadding: serie.layerPadding
                }
            );
            this.tree.traverse(
                function (treeNode) {
                    var queryTarget = [treeNode.data, serie];
                    var symbolSize = this.deepQuery(queryTarget, 'symbolSize');
                    if (typeof symbolSize === 'number') {
                        symbolSize = [symbolSize, symbolSize];
                    }
                    treeNode.layout = {
                        width: symbolSize[0], // ½Úµã´óÐ¡
                        height: symbolSize[1]
                    };
                },
                this
            );
            treeLayout.run(this.tree);
            // Ê÷µÄ·½Ïò
            var orient = serie.orient;
            var rootX = serie.rootLocation.x;
            var rootY = serie.rootLocation.y;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            if (rootX === 'center') {
                rootX = zrWidth * 0.5;
            }
            else {
                rootX = this.parsePercent(rootX, zrWidth);
            }
            if (rootY === 'center') {
                rootY = zrHeight * 0.5;
            }
            else {
                rootY = this.parsePercent(rootY, zrHeight);
            }
            rootY = this.parsePercent(rootY, zrHeight);
            // Ë®Æ½Ê÷
            if (orient === 'horizontal') {
                rootX = isNaN(rootX) ? 10 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            }
            // ¼«×ø±ê
            if (orient === 'radial') {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? zrHeight * 0.5 : rootY;
            }
            // ×ÝÏòÊ÷
            else {
                rootX = isNaN(rootX) ? zrWidth * 0.5 : rootX;
                rootY = isNaN(rootY) ? 10 : rootY;
            }
            // tree layout×Ô¶¯Ëã³öÀ´µÄrootµÄ×ø±ê
            var originRootX = this.tree.root.layout.position[0];
            // ÈôÊÇ¼«×ø±ê,ÔòÇó×î´ó×îÐ¡Öµ
            if (orient === 'radial') {
                var minX = Infinity;
                var maxX = 0;
                var maxWidth = 0;
                this.tree.traverse(
                    function (treeNode) {
                        maxX = Math.max(maxX, treeNode.layout.position[0]);
                        minX = Math.min(minX, treeNode.layout.position[0]);
                        maxWidth = Math.max(maxWidth, treeNode.layout.width);
                    }
                );
                //  2 * maxWidth »¹²»´óºÃµ«ÖÁÉÙ±£Ö¤¾ø²»»áÖØµþ todo
                this.width = maxX - minX + 2 * maxWidth;
                this.minX = minX;
            }
            this.tree.traverse(
                function (treeNode) {
                    var x;
                    var y;
                    if (orient === 'vertical' && serie.direction === 'inverse') {
                        x = treeNode.layout.position[0] - originRootX + rootX;
                        y = rootY - treeNode.layout.position[1];
                    }
                    else if (orient === 'vertical') {
                        x = treeNode.layout.position[0] - originRootX + rootX;
                        y = treeNode.layout.position[1] + rootY;
                    }
                    else if (orient === 'horizontal' && serie.direction === 'inverse') {
                        y = treeNode.layout.position[0] - originRootX + rootY;
                        x = rootX - treeNode.layout.position[1];
                    }
                    else if (orient === 'horizontal') {
                        y = treeNode.layout.position[0] - originRootX + rootY;
                        x = treeNode.layout.position[1] + rootX;
                    }
                    // ¼«×ø±ê
                    else {
                        x = treeNode.layout.position[0];
                        y = treeNode.layout.position[1];
                        // ¼ÇÂ¼Ô­Ê¼×ø±ê£¬ÒÔºó¼ÆËã±´Èû¶ûÇúÏßµÄ¿ØÖÆµã
                        treeNode.layout.originPosition = [x, y];
                        var r = y;
                        var angle = (x - minX) / this.width * Math.PI * 2;
                        x = r * Math.cos(angle) + rootX;
                        y = r * Math.sin(angle) + rootY;
                        treeNode.layout.angle = angle;
                    }
                    treeNode.layout.position[0] = x;
                    treeNode.layout.position[1] = y;
                },
                this
            );
        },
        /*
         * Ë¢ÐÂ
         */
/*        refresh: function (newOption) {
            this.clear();
            if (newOption) {
                this.option = newOption;
                this.series = newOption.series;
            }

            this._buildShape();
        }*/
        refresh: function (newOption) {
            this.clear();

            if (newOption) {
                this.option = newOption;
                this.series = this.option.series;
            }

            // Map storing all trees of series

            var series = this.series;
            var legend = this.component.legend;

            for (var i = 0; i < series.length; i++) {
                if (series[i].type === ecConfig.CHART_TYPE_TREE) {
                    series[i] = this.reformOption(series[i]);

                    var seriesName = series[i].name || '';
                    this.selectedMap[seriesName] = 
                        legend ? legend.isSelected(seriesName) : true;
                    if (!this.selectedMap[seriesName]) {
                        continue;
                    }

                    this._buildSeries(series[i], i);
                }
            }
        },

        _buildSeries: function (series, seriesIndex) {
            /*var tree = Tree.fromOptionData('root', series.data);

            this._treesMap[seriesIndex] = tree;*/

            // this._buildTreemap(tree.root, seriesIndex);


            //series.direction = series.direction == "inverse" ? "" : "inverse";
            this._buildShape(series, seriesIndex);

            //series.dataReverse && (series.data = series.dataReverse, series.direction = series.direction == "inverse" ? "" : "inverse", this._buildShape(series, seriesIndex))
        }
    };

    zrUtil.inherits(Tree, ChartBase);

    // Í¼±í×¢²á
    require('../chart').define('tree', Tree);

    return Tree;
});
define('echarts/chart/base', ['require', 'zrender/shape/Image', '../util/shape/Icon', '../util/shape/MarkLine', '../util/shape/Symbol', 'zrender/shape/Polyline', 'zrender/shape/ShapeBundle', '../config', '../util/ecData', '../util/ecAnimation', '../util/ecEffect', '../util/accMath', '../component/base', '../layout/EdgeBundling', 'zrender/tool/util', 'zrender/tool/area'], function (require) {
    // Í¼ÐÎÒÀÀµ
    var ImageShape = require('zrender/shape/Image');
    var IconShape = require('../util/shape/Icon');
    var MarkLineShape = require('../util/shape/MarkLine');
    var SymbolShape = require('../util/shape/Symbol');
    var PolylineShape = require('zrender/shape/Polyline');
    var ShapeBundle = require('zrender/shape/ShapeBundle');
    
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var ecAnimation = require('../util/ecAnimation');
    var ecEffect = require('../util/ecEffect');
    var accMath = require('../util/accMath');
    var ComponentBase = require('../component/base');
    var EdgeBundling = require('../layout/EdgeBundling');

    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');

    // Some utility functions
    function isCoordAvailable(coord) {
        return coord.x != null && coord.y != null;
    }
    
    function Base(ecTheme, messageCenter, zr, option, myChart) {

        ComponentBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        var self = this;
        this.selectedMap = {};
        this.lastShapeList = [];
        this.shapeHandler = {
            onclick: function () {
                self.isClick = true;
            },
            
            ondragover: function (param) {
                // ·µ»Ø´¥·¢¿É¼ÆËãÌØÐÔµÄÍ¼ÐÎÌáÊ¾
                var calculableShape = param.target;
                calculableShape.highlightStyle = calculableShape.highlightStyle || {};
                
                // ±¸·ÝÌØ³öÌØÐÔ
                var highlightStyle = calculableShape.highlightStyle;
                var brushType = highlightStyle.brushTyep;
                var strokeColor = highlightStyle.strokeColor;
                var lineWidth = highlightStyle.lineWidth;
                
                highlightStyle.brushType = 'stroke';
                highlightStyle.strokeColor = self.ecTheme.calculableColor
                                             || ecConfig.calculableColor;
                highlightStyle.lineWidth = calculableShape.type === 'icon' ? 30 : 10;

                self.zr.addHoverShape(calculableShape);
                
                setTimeout(function (){
                    // ¸´Î»
                    if (highlightStyle) {
                        highlightStyle.brushType = brushType;
                        highlightStyle.strokeColor = strokeColor;
                        highlightStyle.lineWidth = lineWidth;
                    }
                },20);
            },
            
            ondrop: function (param) {
                // ÅÅ³ýÒ»Ð©·ÇÊý¾ÝµÄÍÏ×§½øÈë
                if (ecData.get(param.dragged, 'data') != null) {
                    self.isDrop = true;
                }
            },
            
            ondragend: function () {
                self.isDragend = true;
            }
        };
    }
    
    /**
     * »ùÀà·½·¨
     */
    Base.prototype = {
        /**
         * Í¼ÐÎÍÏ×§ÌØÐÔ 
         */
        setCalculable: function (shape) {
            shape.dragEnableTime = this.ecTheme.DRAG_ENABLE_TIME || ecConfig.DRAG_ENABLE_TIME;
            shape.ondragover = this.shapeHandler.ondragover;
            shape.ondragend = this.shapeHandler.ondragend;
            shape.ondrop = this.shapeHandler.ondrop;
            return shape;
        },

        /**
         * Êý¾ÝÏî±»ÍÏ×§½øÀ´
         */
        ondrop: function (param, status) {
            if (!this.isDrop || !param.target || status.dragIn) {
                // Ã»ÓÐÔÚµ±Ç°ÊµÀýÉÏ·¢ÉúÍÏ×§ÐÐÎª»òÕßÒÑ¾­±»ÈÏÁìÁËÔòÖ±½Ó·µ»Ø
                return;
            }
            var target = param.target;      // ÍÏ×§°²·ÅÄ¿±ê
            var dragged = param.dragged;    // µ±Ç°±»ÍÏ×§µÄÍ¼ÐÎ¶ÔÏó

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var series = this.series;
            var data;
            var legend = this.component.legend;
            if (dataIndex === -1) {
                // Âäµ½calculableCaseÉÏ£¬Êý¾Ý±»ÍÏ×§½øÄ³¸ö±ýÍ¼|À×´ï|Â©¶·£¬Ôö¼ÓÊý¾Ý
                if (ecData.get(dragged, 'seriesIndex') == seriesIndex) {
                    // ×Ô¼ºÍÏ×§µ½×Ô¼º
                    status.dragOut = status.dragIn = status.needRefresh = true;
                    this.isDrop = false;
                    return;
                }
                
                data = {
                    value: ecData.get(dragged, 'value'),
                    name: ecData.get(dragged, 'name')
                };

                // ÐÞ±ýÍ¼ÊýÖµ²»Îª¸ºÖµ
                if (this.type === ecConfig.CHART_TYPE_PIE && data.value < 0) {
                    data.value = 0;
                }

                var hasFind = false;
                var sData = series[seriesIndex].data;
                for (var i = 0, l = sData.length; i < l; i++) {
                    if (sData[i].name === data.name && sData[i].value === '-') {
                        series[seriesIndex].data[i].value = data.value;
                        hasFind = true;
                    }
                }
                !hasFind && series[seriesIndex].data.push(data);

                legend && legend.add(
                    data.name,
                    dragged.style.color || dragged.style.strokeColor
                );
            }
            else {
                // Âäµ½Êý¾ÝitemÉÏ£¬Êý¾Ý±»ÍÏ×§µ½Ä³¸öÊý¾ÝÏîÉÏ£¬Êý¾ÝÐÞ¸Ä
                data = series[seriesIndex].data[dataIndex] || '-';
                if (data.value != null) {
                    if (data.value != '-') {
                        series[seriesIndex].data[dataIndex].value = 
                            accMath.accAdd(
                                series[seriesIndex].data[dataIndex].value,
                                ecData.get(dragged, 'value')
                            );
                    }
                    else {
                        series[seriesIndex].data[dataIndex].value =
                            ecData.get(dragged, 'value');
                    }
                    
                    if (this.type === ecConfig.CHART_TYPE_FUNNEL
                        || this.type === ecConfig.CHART_TYPE_PIE
                    ) {
                        legend && legend.getRelatedAmount(data.name) === 1 
                               && this.component.legend.del(data.name);
                        data.name += this.option.nameConnector + ecData.get(dragged, 'name');
                        legend && legend.add(
                            data.name,
                            dragged.style.color || dragged.style.strokeColor
                        );
                    }
                }
                else {
                    if (data != '-') {
                        series[seriesIndex].data[dataIndex] = 
                            accMath.accAdd(
                                series[seriesIndex].data[dataIndex],
                                ecData.get(dragged, 'value')
                            );
                    }
                    else {
                        series[seriesIndex].data[dataIndex] =
                            ecData.get(dragged, 'value');
                    }
                }
            }

            // ±ðstatus = {}¸³Öµ°¡£¡£¡
            status.dragIn = status.dragIn || true;

            // ´¦ÀíÍêÍÏ×§ÊÂ¼þºó¸´Î»
            this.isDrop = false;

            var self = this;
            setTimeout(function(){
                self.zr.trigger('mousemove', param.event);
            }, 300);
            
            return;
        },

        /**
         * Êý¾ÝÏî±»ÍÏ×§³öÈ¥
         */
        ondragend: function (param, status) {
            if (!this.isDragend || !param.target || status.dragOut) {
                // Ã»ÓÐÔÚµ±Ç°ÊµÀýÉÏ·¢ÉúÍÏ×§ÐÐÎª»òÕßÒÑ¾­±»ÈÏÁìÁËÔòÖ±½Ó·µ»Ø
                return;
            }
            var target = param.target;      // ±»ÍÏ×§Í¼ÐÎÔªËØ

            var seriesIndex = ecData.get(target, 'seriesIndex');
            var dataIndex = ecData.get(target, 'dataIndex');

            var series = this.series;

            // É¾³ý±»ÍÏ×§×ßµÄÊý¾Ý
            if (series[seriesIndex].data[dataIndex].value != null) {
                series[seriesIndex].data[dataIndex].value = '-';
                // ÇåÀí¿ÉÄÜÓÐÇÒÎ¨Ò»µÄlegend data
                var name = series[seriesIndex].data[dataIndex].name;
                var legend = this.component.legend;
                if (legend && legend.getRelatedAmount(name) === 0) {
                    legend.del(name);
                }
            }
            else {
                series[seriesIndex].data[dataIndex] = '-';
            }
            
            // ±ðstatus = {}¸³Öµ°¡£¡£¡
            status.dragOut = true;
            status.needRefresh = true;

            // ´¦ÀíÍêÍÏ×§ÊÂ¼þºó¸´Î»
            this.isDragend = false;

            return;
        },

        /**
         * Í¼ÀýÑ¡Ôñ
         */
        onlegendSelected: function (param, status) {
            var legendSelected = param.selected;
            for (var itemName in this.selectedMap) {
                if (this.selectedMap[itemName] != legendSelected[itemName]) {
                    // ÓÐÒ»Ïî²»Ò»ÖÂ¶¼ÐèÒªÖØ»æ
                    status.needRefresh = true;
                }
                this.selectedMap[itemName] = legendSelected[itemName];
            }
            return;
        },
        
        /**
         * ÕÛÏßÍ¼¡¢ÖùÐÎÍ¼¹«ÓÃ·½·¨
         */
        _buildPosition: function() {
            this._symbol = this.option.symbolList;
            this._sIndex2ShapeMap = {};  // series¹ÕµãÍ¼ÐÎÀàÐÍ£¬seriesIndexË÷Òýµ½shape type
            this._sIndex2ColorMap = {};  // seriesÄ¬ÈÏÑÕÉ«Ë÷Òý£¬seriesIndexË÷Òýµ½color

            this.selectedMap = {};
            this.xMarkMap = {};
            
            var series = this.series;
            // Ë®Æ½´¹Ö±Ë«ÏòseriesË÷Òý £¬positionË÷Òýµ½seriesIndex
            var _position2sIndexMap = {
                top: [],
                bottom: [],
                left: [],
                right: [],
                other: []
            };
            var xAxisIndex;
            var yAxisIndex;
            var xAxis;
            var yAxis;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type === this.type) {
                    series[i] = this.reformOption(series[i]);
                    this.legendHoverLink = series[i].legendHoverLink || this.legendHoverLink;
                    xAxisIndex = series[i].xAxisIndex;
                    yAxisIndex = series[i].yAxisIndex;
                    xAxis = this.component.xAxis.getAxis(xAxisIndex);
                    yAxis = this.component.yAxis.getAxis(yAxisIndex);
                    if (xAxis.type === ecConfig.COMPONENT_TYPE_AXIS_CATEGORY) {
                        _position2sIndexMap[xAxis.getPosition()].push(i);
                    }
                    else if (yAxis.type === ecConfig.COMPONENT_TYPE_AXIS_CATEGORY) {
                        _position2sIndexMap[yAxis.getPosition()].push(i);
                    }
                    else {
                        _position2sIndexMap.other.push(i);
                    }
                }
            }
            // console.log(_position2sIndexMap);
            for (var position in _position2sIndexMap) {
                if (_position2sIndexMap[position].length > 0) {
                    this._buildSinglePosition(
                        position, _position2sIndexMap[position]
                    );
                }
            }

            this.addShapeList();
        },
        
        /**
         * ¹¹½¨µ¥¸ö·½ÏòÉÏµÄÕÛÏßÍ¼¡¢ÖùÐÎÍ¼¹«ÓÃ·½·¨
         *
         * @param {number} seriesIndex ÏµÁÐË÷Òý
         */
        _buildSinglePosition: function (position, seriesArray) {
            var mapData = this._mapData(seriesArray);
            var locationMap = mapData.locationMap;
            var maxDataLength = mapData.maxDataLength;

            if (maxDataLength === 0 || locationMap.length === 0) {
                return;
            }
            switch (position) {
                case 'bottom' :
                case 'top' :
                    this._buildHorizontal(seriesArray, maxDataLength, locationMap, this.xMarkMap);
                    break;
                case 'left' :
                case 'right' :
                    this._buildVertical(seriesArray, maxDataLength, locationMap, this.xMarkMap);
                    break;
                case 'other' :
                    this._buildOther(seriesArray, maxDataLength, locationMap, this.xMarkMap);
                    break;
            }
            
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                this.buildMark(seriesArray[i]);
            }
        },
        
        /**
         * Êý¾ÝÕûÐÎ£¬ÕÛÏßÍ¼¡¢ÖùÐÎÍ¼¹«ÓÃ·½·¨
         * Êý×éÎ»ÖÃÓ³Éäµ½ÏµÁÐË÷Òý
         */
        _mapData: function (seriesArray) {
            var series = this.series;
            var serie;                              // ÁÙÊ±Ó³Éä±äÁ¿
            var dataIndex = 0;                      // ¶Ñ»ýÊý¾ÝËùÔÚÎ»ÖÃÓ³Éä
            var stackMap = {};                      // ¶Ñ»ýÊý¾ÝÎ»ÖÃÓ³Éä£¬¶Ñ»ý×éÔÚ¶þÎ¬ÖÐµÄµÚ¼¸Ïî
            var magicStackKey = '__kener__stack__'; // ¶Ñ»ýÃüÃû£¬·Ç¶Ñ»ýÊý¾Ý°²µ¥Ò»¶Ñ»ý´¦Àí
            var stackKey;                           // ÁÙÊ±Ó³Éä±äÁ¿
            var serieName;                          // ÁÙÊ±Ó³Éä±äÁ¿
            var legend = this.component.legend;
            var locationMap = [];                   // ÐèÒª·µ»ØµÄ¶«Î÷£ºÊý×éÎ»ÖÃÓ³Éäµ½ÏµÁÐË÷Òý
            var maxDataLength = 0;                  // ÐèÒª·µ»ØµÄ¶«Î÷£º×î´óÊý¾Ý³¤¶È
            var iconShape;
            // ¼ÆËãÐèÒªÏÔÊ¾µÄ¸öÊýºÍ·ÖÅäÎ»ÖÃ²¢¼ÇÔÚÏÂÃæÕâ¸ö½á¹¹Àï
            for (var i = 0, l = seriesArray.length; i < l; i++) {
                serie = series[seriesArray[i]];
                serieName = serie.name;
                
                this._sIndex2ShapeMap[seriesArray[i]] = this._sIndex2ShapeMap[seriesArray[i]]
                                                        || this.query(serie,'symbol')
                                                        || this._symbol[i % this._symbol.length];
                      
                if (legend){
                    this.selectedMap[serieName] = legend.isSelected(serieName);
                    
                    this._sIndex2ColorMap[seriesArray[i]] = legend.getColor(serieName);
                        
                    iconShape = legend.getItemShape(serieName);
                    if (iconShape) {
                        // »Øµ÷legend£¬»»Ò»¸ö¸üÐÎÏóµÄicon
                        var style = iconShape.style;
                        if (this.type == ecConfig.CHART_TYPE_LINE) {
                            style.iconType = 'legendLineIcon';
                            style.symbol =  this._sIndex2ShapeMap[seriesArray[i]];
                        }
                        else if (serie.itemStyle.normal.barBorderWidth > 0) {
                            var highlightStyle = iconShape.highlightStyle;
                            style.brushType = 'both';
                            style.x += 1;
                            style.y += 1;
                            style.width -= 2;
                            style.height -= 2;
                            style.strokeColor 
                                = highlightStyle.strokeColor 
                                = serie.itemStyle.normal.barBorderColor;
                            highlightStyle.lineWidth = 3;
                        }
                        
                        legend.setItemShape(serieName, iconShape);
                    }
                }
                else {
                    this.selectedMap[serieName] = true;
                    this._sIndex2ColorMap[seriesArray[i]] = this.zr.getColor(seriesArray[i]);
                }

                if (this.selectedMap[serieName]) {
                    stackKey = serie.stack || (magicStackKey + seriesArray[i]);
                    if (stackMap[stackKey] == null) {
                        stackMap[stackKey] = dataIndex;
                        locationMap[dataIndex] = [seriesArray[i]];
                        dataIndex++;
                    }
                    else {
                        // ÒÑ¾­·ÖÅäÁËÎ»ÖÃ¾ÍÍÆ½øÈ¥¾ÍÐÐ
                        locationMap[stackMap[stackKey]].push(seriesArray[i]);
                    }
                }
                // ¼æÖ°°ïËãÒ»ÏÂ×î´ó³¤¶È
                maxDataLength = Math.max(maxDataLength, serie.data.length);
            }
            /* µ÷ÊÔÊä³ö
            var s = '';
            for (var i = 0, l = maxDataLength; i < l; i++) {
                s = '[';
                for (var j = 0, k = locationMap.length; j < k; j++) {
                    s +='['
                    for (var m = 0, n = locationMap[j].length - 1; m < n; m++) {
                        s += series[locationMap[j][m]].data[i] + ','
                    }
                    s += series[locationMap[j][locationMap[j].length - 1]]
                         .data[i];
                    s += ']'
                }
                s += ']';
                console.log(s);
            }
            console.log(locationMap)
            */

            return {
                locationMap: locationMap,
                maxDataLength: maxDataLength
            };
        },
        
        _calculMarkMapXY : function(xMarkMap, locationMap, xy) {
            var series = this.series;
            for (var j = 0, k = locationMap.length; j < k; j++) {
                for (var m = 0, n = locationMap[j].length; m < n; m++) {
                    var seriesIndex = locationMap[j][m];
                    var valueIndex = xy == 'xy' ? 0 : '';
                    var grid = this.component.grid;
                    var tarMark = xMarkMap[seriesIndex];

                    if (xy.indexOf('x') != '-1') {
                        if (tarMark['counter' + valueIndex] > 0) {
                            tarMark['average' + valueIndex] =
                                tarMark['sum' + valueIndex] / tarMark['counter' + valueIndex];
                        }
                        
                        var x = this.component.xAxis.getAxis(series[seriesIndex].xAxisIndex || 0)
                                .getCoord(tarMark['average' + valueIndex]);
                        tarMark['averageLine' + valueIndex] = [
                            [x, grid.getYend()],
                            [x, grid.getY()]
                        ];
                        tarMark['minLine' + valueIndex] = [
                            [tarMark['minX' + valueIndex], grid.getYend()],
                            [tarMark['minX' + valueIndex], grid.getY()]
                        ];
                        tarMark['maxLine' + valueIndex] = [
                            [tarMark['maxX' + valueIndex], grid.getYend()],
                            [tarMark['maxX' + valueIndex], grid.getY()]
                        ];
                        
                        tarMark.isHorizontal = false;
                    }
                    
                    valueIndex = xy == 'xy' ? 1 : '';
                    if (xy.indexOf('y') != '-1') {
                        if (tarMark['counter' + valueIndex] > 0) {
                            tarMark['average' + valueIndex] = 
                                tarMark['sum' + valueIndex] / tarMark['counter' + valueIndex];
                        }
                        var y = this.component.yAxis.getAxis(series[seriesIndex].yAxisIndex || 0)
                                .getCoord(tarMark['average' + valueIndex]);
                        tarMark['averageLine' + valueIndex] = [
                            [grid.getX(), y],
                            [grid.getXend(), y]
                        ];
                        tarMark['minLine' + valueIndex] = [
                            [grid.getX(), tarMark['minY' + valueIndex]],
                            [grid.getXend(), tarMark['minY' + valueIndex]]
                        ];
                        tarMark['maxLine' + valueIndex] = [
                            [grid.getX(), tarMark['maxY' + valueIndex]],
                            [grid.getXend(), tarMark['maxY' + valueIndex]]
                        ];
                        
                        tarMark.isHorizontal = true;
                    }
                }
            }
        },
        
        /**
         * Ìí¼ÓÎÄ±¾ 
         */
        addLabel: function (tarShape, serie, data, name, orient) {
            // ¶à¼¶¿ØÖÆ
            var queryTarget = [data, serie];
            var nLabel = this.deepMerge(queryTarget, 'itemStyle.normal.label');
            var eLabel = this.deepMerge(queryTarget, 'itemStyle.emphasis.label');

            var nTextStyle = nLabel.textStyle || {};
            var eTextStyle = eLabel.textStyle || {};
            
            if (nLabel.show) {
                var style = tarShape.style;
                style.text = this._getLabelText(
                    serie, data, name, 'normal'
                );
                style.textPosition = nLabel.position == null
                                     ? (orient === 'horizontal' ? 'right' : 'top')
                                     : nLabel.position;
                style.textColor = nTextStyle.color;
                style.textFont = this.getFont(nTextStyle);
                style.textAlign = nTextStyle.align;
                style.textBaseline = nTextStyle.baseline;
            }
            if (eLabel.show) {
                var highlightStyle = tarShape.highlightStyle;
                highlightStyle.text = this._getLabelText(
                    serie, data, name, 'emphasis'
                );
                highlightStyle.textPosition = nLabel.show
                                              ? tarShape.style.textPosition
                                              : (eLabel.position == null
                                                 ? (orient === 'horizontal' ? 'right' : 'top')
                                                 : eLabel.position);
                highlightStyle.textColor = eTextStyle.color;
                highlightStyle.textFont = this.getFont(eTextStyle);
                highlightStyle.textAlign = eTextStyle.align;
                highlightStyle.textBaseline = eTextStyle.baseline;
            }
            
            return tarShape;
        },
        
        /**
         * ¸ù¾Ýlable.format¼ÆËãlabel text
         */
        _getLabelText: function (serie, data, name, status) {
            var formatter = this.deepQuery(
                [data, serie],
                'itemStyle.' + status + '.label.formatter'
            );
            if (!formatter && status === 'emphasis') {
                // emphasisÊ±ÐèÒª¿´¿´normalÏÂÊÇ·ñÓÐformatter
                formatter = this.deepQuery(
                    [data, serie],
                    'itemStyle.normal.label.formatter'
                );
            }
            
            var value = this.getDataFromOption(data, '-');
            
            if (formatter) {
                if (typeof formatter === 'function') {
                    return formatter.call(
                        this.myChart,
                        {
                            seriesName: serie.name,
                            series: serie,
                            name: name,
                            value: value,
                            data: data,
                            status: status
                        }
                    );
                }
                else if (typeof formatter === 'string') {
                    formatter = formatter.replace('{a}','{a0}')
                                         .replace('{b}','{b0}')
                                         .replace('{c}','{c0}')
                                         .replace('{a0}', serie.name)
                                         .replace('{b0}', name)
                                         .replace('{c0}', this.numAddCommas(value));
    
                    return formatter;
                }
            }
            else {
                if (value instanceof Array) {
                    return value[2] != null
                           ? this.numAddCommas(value[2])
                           : (value[0] + ' , ' + value[1]);
                }
                else {
                    return this.numAddCommas(value);
                }
            }
        },
        
        /**
         * ±êÏß±ê×¢ 
         */
        buildMark: function (seriesIndex) {
            var serie = this.series[seriesIndex];
            if (this.selectedMap[serie.name]) {
                serie.markLine && this._buildMarkLine(seriesIndex);
                serie.markPoint && this._buildMarkPoint(seriesIndex);
            }
        },
        
        /**
         * ±ê×¢Âß¼­
         */
        _buildMarkPoint: function (seriesIndex) {
            var attachStyle =  (this.markAttachStyle || {})[seriesIndex];
            var serie = this.series[seriesIndex];
            var mpData;
            var pos;
            var markPoint = zrUtil.clone(serie.markPoint);
            for (var i = 0, l = markPoint.data.length; i < l; i++) {
                mpData = markPoint.data[i];
                pos = this.getMarkCoord(seriesIndex, mpData);
                mpData.x = mpData.x != null ? mpData.x : pos[0];
                mpData.y = mpData.y != null ? mpData.y : pos[1];
                if (mpData.type
                    && (mpData.type === 'max' || mpData.type === 'min')
                ) {
                    // ÌØÊâÖµÄÚÖÃÖ§³Ö
                    mpData.value = pos[3];
                    mpData.name = mpData.name || mpData.type;
                    mpData.symbolSize = mpData.symbolSize
                        || (zrArea.getTextWidth(pos[3], this.getFont()) / 2 + 5);
                }
            }
            
            var shapeList = this._markPoint(seriesIndex, markPoint);
            
            for (var i = 0, l = shapeList.length; i < l; i++) {
                var tarShape = shapeList[i];
                tarShape.zlevel = serie.zlevel;
                tarShape.z = serie.z + 1;
                for (var key in attachStyle) {
                    tarShape[key] = zrUtil.clone(attachStyle[key]);
                }
                this.shapeList.push(tarShape);
            }
            // ¸ö±ðÌØÊâÍ¼±íÐèÒª×Ô¼ºaddShape
            if (this.type === ecConfig.CHART_TYPE_FORCE
                || this.type === ecConfig.CHART_TYPE_CHORD
            ) {
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    this.zr.addShape(shapeList[i]);
                }
            }
        },
        
        /**
         * ±êÏßÂß¼­
         */
        _buildMarkLine: function (seriesIndex) {
            var attachStyle =  (this.markAttachStyle || {})[seriesIndex];
            var serie = this.series[seriesIndex];
            var pos;
            var markLine = zrUtil.clone(serie.markLine);
            for (var i = 0, l = markLine.data.length; i < l; i++) {
                var mlData = markLine.data[i];
                if (mlData.type
                    && (mlData.type === 'max' || mlData.type === 'min' || mlData.type === 'average')
                ) {
                    // ÌØÊâÖµÄÚÖÃÖ§³Ö
                    pos = this.getMarkCoord(seriesIndex, mlData);
                    markLine.data[i] = [zrUtil.clone(mlData), {}];
                    markLine.data[i][0].name = mlData.name || mlData.type;
                    markLine.data[i][0].value = mlData.type !== 'average'
                                                ? pos[3]
                                                : +pos[3].toFixed(
                                                      markLine.precision != null 
                                                      ? markLine.precision 
                                                      : this.deepQuery(
                                                            [this.ecTheme, ecConfig],
                                                            'markLine.precision'
                                                        )
                                                  );
                    pos = pos[2];
                    mlData = [{},{}];
                }
                else {
                    pos = [
                        this.getMarkCoord(seriesIndex, mlData[0]),
                        this.getMarkCoord(seriesIndex, mlData[1])
                    ];
                }
                if (pos == null || pos[0] == null || pos[1] == null) {
                    // ²»ÔÚÏÔÊ¾ÇøÓòÄÚ
                    continue;
                }
                markLine.data[i][0].x = mlData[0].x != null ? mlData[0].x : pos[0][0];
                markLine.data[i][0].y = mlData[0].y != null ? mlData[0].y : pos[0][1];
                markLine.data[i][1].x = mlData[1].x != null ? mlData[1].x : pos[1][0];
                markLine.data[i][1].y = mlData[1].y != null ? mlData[1].y : pos[1][1];
            }
            
            var shapeList = this._markLine(seriesIndex, markLine);

            var isLarge = markLine.large;

            if (isLarge) {
                var shapeBundle = new ShapeBundle({
                    style: {
                        shapeList: shapeList
                    }
                });
                var firstShape = shapeList[0];
                if (firstShape) {
                    zrUtil.merge(shapeBundle.style, firstShape.style);
                    zrUtil.merge(shapeBundle.highlightStyle = {}, firstShape.highlightStyle);
                    shapeBundle.style.brushType = 'stroke';
                    shapeBundle.zlevel = serie.zlevel;
                    shapeBundle.z = serie.z + 1;
                    shapeBundle.hoverable = false;
                    for (var key in attachStyle) {
                        shapeBundle[key] = zrUtil.clone(attachStyle[key]);
                    }
                }
                this.shapeList.push(shapeBundle);
                this.zr.addShape(shapeBundle);

                shapeBundle._mark = 'largeLine';
                var effect = markLine.effect;
                if (effect.show) {
                    shapeBundle.effect = effect;
                }
            }
            else {
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    var tarShape = shapeList[i];
                    tarShape.zlevel = serie.zlevel;
                    tarShape.z = serie.z + 1;
                    for (var key in attachStyle) {
                        tarShape[key] = zrUtil.clone(attachStyle[key]);
                    }
                    this.shapeList.push(tarShape);
                }
                // ¸ö±ðÌØÊâÍ¼±íÐèÒª×Ô¼ºaddShape
                if (this.type === ecConfig.CHART_TYPE_FORCE
                    || this.type === ecConfig.CHART_TYPE_CHORD
                ) {
                    for (var i = 0, l = shapeList.length; i < l; i++) {
                        this.zr.addShape(shapeList[i]);
                    }
                }
            }
        },
        
        /**
         * ±ê×¢¶à¼¶¿ØÖÆ¹¹Ôì
         */
        _markPoint: function (seriesIndex, mpOption) {
            var serie = this.series[seriesIndex];
            var component = this.component;
            zrUtil.merge(
                zrUtil.merge(
                    mpOption,
                    zrUtil.clone(this.ecTheme.markPoint || {})
                ),
                zrUtil.clone(ecConfig.markPoint)
            );

            mpOption.name = serie.name;
                   
            var pList = [];
            var data = mpOption.data;
            var itemShape;
            
            var dataRange = component.dataRange;
            var legend = component.legend;
            var color;
            var value;
            var queryTarget;
            var nColor;
            var eColor;
            var effect;
            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();

            if (!mpOption.large) {
                for (var i = 0, l = data.length; i < l; i++) {
                    if (data[i].x == null || data[i].y == null) {
                        continue;
                    }
                    value = data[i].value != null ? data[i].value : '';
                    // Í¼Àý
                    if (legend) {
                        color = legend.getColor(serie.name);
                    }
                    // ÖµÓò
                    if (dataRange) {
                        color = isNaN(value) ? color : dataRange.getColor(value);
                        
                        queryTarget = [data[i], mpOption];
                        nColor = this.deepQuery(queryTarget, 'itemStyle.normal.color')
                                 || color;
                        eColor = this.deepQuery(queryTarget, 'itemStyle.emphasis.color')
                                 || nColor;
                        // ÓÐÖµÓò£¬²¢ÇÒÖµÓò·µ»ØnullÇÒÓÃ»§Ã»ÓÐ×Ô¼º¶¨ÒåÑÕÉ«£¬ÔòÒþ²ØÕâ¸ömark
                        if (nColor == null && eColor == null) {
                            continue;
                        }
                    }
                    
                    color = color == null ? this.zr.getColor(seriesIndex) : color;
                    
                    // ±ê×¼»¯Ò»Ð©²ÎÊý
                    data[i].tooltip = data[i].tooltip
                                      || mpOption.tooltip
                                      || {trigger:'item'}; // tooltip.triggerÖ¸¶¨Îªitem
                    data[i].name = data[i].name != null ? data[i].name : '';
                    data[i].value = value;

                    // ¸´ÓÃgetSymbolShape
                    itemShape = this.getSymbolShape(
                        mpOption, seriesIndex,      // ÏµÁÐ 
                        data[i], i, data[i].name,   // Êý¾Ý
                        this.parsePercent(data[i].x, zrWidth),   // ×ø±ê
                        this.parsePercent(data[i].y, zrHeight),  // ×ø±ê
                        'pin', color,               // Ä¬ÈÏsymbolºÍcolor
                        'rgba(0,0,0,0)',
                        'horizontal'                // ×ßÏò£¬ÓÃÓÚÄ¬ÈÏÎÄ×Ö¶¨Î»
                    );
                    itemShape._mark = 'point';
                    
                    effect = this.deepMerge(
                        [data[i], mpOption],
                        'effect'
                    );
                    if (effect.show) {
                        itemShape.effect = effect;
                    }
                    
                    if (serie.type === ecConfig.CHART_TYPE_MAP) {
                        itemShape._geo = this.getMarkGeo(data[i]);
                    }
                    
                    // ÖØÐÂpackÒ»ÏÂÊý¾Ý
                    ecData.pack(
                        itemShape,
                        serie, seriesIndex,
                        data[i], i,
                        data[i].name,
                        value
                    );
                    pList.push(itemShape);
                }
            }
            else {
                // ´ó¹æÄ£MarkPoint
                itemShape = this.getLargeMarkPointShape(seriesIndex, mpOption);
                itemShape._mark = 'largePoint';
                itemShape && pList.push(itemShape);
            }
            return pList;
        },
        
        /**
         * ±êÏß¶à¼¶¿ØÖÆ¹¹Ôì
         */
        _markLine: (function () {
            function normalizeOptionValue(mlOption, key) {
                mlOption[key] = mlOption[key] instanceof Array
                          ? mlOption[key].length > 1 
                            ? mlOption[key] 
                            : [mlOption[key][0], mlOption[key][0]]
                          : [mlOption[key], mlOption[key]];
            }

            return function (seriesIndex, mlOption) {
                var serie = this.series[seriesIndex];
                var component = this.component;
                var dataRange = component.dataRange;
                var legend = component.legend;

                zrUtil.merge(
                    zrUtil.merge(
                        mlOption,
                        zrUtil.clone(this.ecTheme.markLine || {})
                    ),
                    zrUtil.clone(ecConfig.markLine)
                );

                var defaultColor = legend ? legend.getColor(serie.name)
                    : this.zr.getColor(seriesIndex);

                // ±ê×¼»¯Ò»Ð©Í¬Ê±Ö§³ÖArrayºÍStringµÄ²ÎÊý
                normalizeOptionValue(mlOption, 'symbol');
                normalizeOptionValue(mlOption, 'symbolSize');
                normalizeOptionValue(mlOption, 'symbolRotate');

                // Normalize and filter data
                var data = mlOption.data;
                var edges = [];
                var zrWidth = this.zr.getWidth();
                var zrHeight = this.zr.getHeight();
                for (var i = 0; i < data.length; i++) {
                    var mlData = data[i];
                    if (isCoordAvailable(mlData[0])
                        && isCoordAvailable(mlData[1])
                    ) {
                        // ×é×°Ò»¸ömergeData
                        var mergeData = this.deepMerge(mlData);
                        var queryTarget = [mergeData, mlOption];
                        var color = defaultColor;
                        var value = mergeData.value != null ? mergeData.value : '';
                        // ÖµÓò
                        if (dataRange) {
                            color = isNaN(value) ? color : dataRange.getColor(value);

                            var nColor = this.deepQuery(queryTarget, 'itemStyle.normal.color')
                                     || color;
                            var eColor = this.deepQuery(queryTarget, 'itemStyle.emphasis.color')
                                     || nColor;
                            // ÓÐÖµÓò£¬²¢ÇÒÖµÓò·µ»ØnullÇÒÓÃ»§Ã»ÓÐ×Ô¼º¶¨ÒåÑÕÉ«£¬ÔòÒþ²ØÕâ¸ömark
                            if (nColor == null && eColor == null) {
                                continue;
                            }
                        }
                        // ±ê×¼»¯Ò»Ð©²ÎÊý
                        mlData[0].tooltip = mergeData.tooltip
                                            || mlOption.tooltip
                                            || {trigger:'item'}; // tooltip.triggerÖ¸¶¨Îªitem
                        mlData[0].name = mlData[0].name || '';
                        mlData[1].name = mlData[1].name || '';
                        mlData[0].value = value;

                        edges.push({
                            points: [
                                [this.parsePercent(mlData[0].x, zrWidth),
                                this.parsePercent(mlData[0].y, zrHeight)],
                                [this.parsePercent(mlData[1].x, zrWidth),
                                this.parsePercent(mlData[1].y, zrHeight)]
                            ],
                            rawData: mlData,
                            color: color
                        });
                    }
                }

                var enableBundling = this.query(mlOption, 'bundling.enable');
                if (enableBundling) {
                    var edgeBundling = new EdgeBundling();
                    edgeBundling.maxTurningAngle = this.query(
                        mlOption, 'bundling.maxTurningAngle'
                    ) / 180 * Math.PI;
                    edges = edgeBundling.run(edges);
                }

                mlOption.name = serie.name;
  
                var shapeList = [];

                for (var i = 0, l = edges.length; i < l; i++) {
                    var edge = edges[i];
                    var rawEdge = edge.rawEdge || edge; 
                    var mlData = rawEdge.rawData;
                    var value = mlData.value != null ? mlData.value : '';

                    var itemShape = this.getMarkLineShape(
                        mlOption,
                        seriesIndex,
                        mlData,
                        i,
                        edge.points,
                        enableBundling,
                        rawEdge.color
                    );
                    itemShape._mark = 'line';
                    
                    var effect = this.deepMerge(
                        [mlData[0], mlData[1], mlOption],
                        'effect'
                    );
                    if (effect.show) {
                        itemShape.effect = effect;
                        itemShape.effect.large = mlOption.large;
                    }
                    
                    if (serie.type === ecConfig.CHART_TYPE_MAP) {
                        itemShape._geo = [
                            this.getMarkGeo(mlData[0]),
                            this.getMarkGeo(mlData[1])
                        ];
                    }
                    
                    // ÖØÐÂpackÒ»ÏÂÊý¾Ý
                    ecData.pack(
                        itemShape,
                        serie, seriesIndex,
                        mlData[0], i,
                        mlData[0].name 
                            // ²»Òª°ïÎÒ´úÂë¹æ·¶
                            + (mlData[1].name !== '' ? (' > ' + mlData[1].name) : ''),
                        value
                    );
                    shapeList.push(itemShape);
                }

                return shapeList;
            };
        })(),
        
        getMarkCoord: function () {
            // ÎÞ×ª»»Î»ÖÃ
            return [0, 0];
        },
        
        /**
         * symbol¹¹ÔìÆ÷ 
         */
        getSymbolShape: function (
            serie, seriesIndex,     // ÏµÁÐ 
            data, dataIndex, name,  // Êý¾Ý
            x, y,                   // ×ø±ê
            symbol, color,          // Ä¬ÈÏsymbolºÍcolor£¬À´×Ôlegend»òdataRangeÈ«¾Ö·ÖÅä
            emptyColor,             // ÕÛÏßµÄemptySymbolÓÃ°×É«Ìî³ä
            orient                  // ×ßÏò£¬ÓÃÓÚÄ¬ÈÏÎÄ×Ö¶¨Î»
        ) {
            var queryTarget = [data, serie];
            var value = this.getDataFromOption(data, '-');
            
            symbol = this.deepQuery(queryTarget, 'symbol') || symbol;
            var symbolSize = this.deepQuery(queryTarget, 'symbolSize');
            symbolSize = typeof symbolSize === 'function'
                         ? symbolSize(value)
                         : symbolSize;
            if (typeof symbolSize === 'number') {
                symbolSize = [symbolSize, symbolSize];
            }
            var symbolRotate = this.deepQuery(queryTarget, 'symbolRotate');
            
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            var nBorderWidth = normal.borderWidth != null
                               ? normal.borderWidth
                               : (normal.lineStyle && normal.lineStyle.width);
            if (nBorderWidth == null) {
                nBorderWidth = symbol.match('empty') ? 2 : 0;
            }
            var eBorderWidth = emphasis.borderWidth != null
                               ? emphasis.borderWidth
                               : (emphasis.lineStyle && emphasis.lineStyle.width);
            if (eBorderWidth == null) {
                eBorderWidth = nBorderWidth + 2;
            }

            var nColor = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data);
            var eColor = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data);
            
            var width = symbolSize[0];
            var height = symbolSize[1];
            var itemShape = new IconShape({
                style: {
                    iconType: symbol.replace('empty', '').toLowerCase(),
                    x: x - width,
                    y: y - height,
                    width: width * 2,
                    height: height * 2,
                    brushType: 'both',
                    color: symbol.match('empty') 
                           ? emptyColor 
                           : (nColor || color),
                    strokeColor: normal.borderColor || nColor || color,
                    lineWidth: nBorderWidth
                },
                highlightStyle: {
                    color: symbol.match('empty') 
                           ? emptyColor 
                           : (eColor || nColor || color),
                    strokeColor: emphasis.borderColor 
                                 || normal.borderColor
                                 || eColor
                                 || nColor
                                 || color,
                    lineWidth: eBorderWidth
                },
                clickable: this.deepQuery(queryTarget, 'clickable')
            });

            if (symbol.match('image')) {
                itemShape.style.image = symbol.replace(new RegExp('^image:\\/\\/'), '');
                itemShape = new ImageShape({
                    style: itemShape.style,
                    highlightStyle: itemShape.highlightStyle,
                    clickable: this.deepQuery(queryTarget, 'clickable')
                });
            }
            
            if (symbolRotate != null) {
                itemShape.rotation = [
                    symbolRotate * Math.PI / 180, x, y
                ];
            }
            
            if (symbol.match('star')) {
                itemShape.style.iconType = 'star';
                itemShape.style.n = 
                    (symbol.replace('empty', '').replace('star','') - 0) || 5;
            }
            
            if (symbol === 'none') {
                itemShape.invisible = true;
                itemShape.hoverable = false;
            }
            
            /*
            if (this.deepQuery([data, serie, option], 'calculable')) {
                this.setCalculable(itemShape);
                itemShape.draggable = true;
            }
            */

            itemShape = this.addLabel(
                itemShape, 
                serie, data, name, 
                orient
            );
            
            if (symbol.match('empty')) {
                if (itemShape.style.textColor == null) {
                    itemShape.style.textColor = itemShape.style.strokeColor;
                }
                if (itemShape.highlightStyle.textColor == null) {
                    itemShape.highlightStyle.textColor = 
                        itemShape.highlightStyle.strokeColor;
                }
            }
            
            ecData.pack(
                itemShape,
                serie, seriesIndex,
                data, dataIndex,
                name
            );

            itemShape._x = x;
            itemShape._y = y;
            
            itemShape._dataIndex = dataIndex;
            itemShape._seriesIndex = seriesIndex;

            return itemShape;
        },
        
        /**
         * ±êÏß¹¹ÔìÆ÷ 
         */
        getMarkLineShape: function (
            mlOption,               // ÏµÁÐ 
            seriesIndex,            // ÏµÁÐË÷Òý
            data,                   // Êý¾Ý
            dataIndex,              // Êý¾ÝË÷Òý
            points,                 // ×ø±êµã
            bundling,               // ÊÇ·ñ±ßÀ¦°ó¹ý
            color                   // Ä¬ÈÏcolor£¬À´×Ôlegend»òdataRangeÈ«¾Ö·ÖÅä
        ) {
            var value0 = data[0].value != null ? data[0].value : '-';
            var value1 = data[1].value != null ? data[1].value : '-';
            var symbol = [
                data[0].symbol || mlOption.symbol[0],
                data[1].symbol || mlOption.symbol[1]
            ];
            var symbolSize = [
                data[0].symbolSize || mlOption.symbolSize[0],
                data[1].symbolSize || mlOption.symbolSize[1]
            ];
            symbolSize[0] = typeof symbolSize[0] === 'function'
                            ? symbolSize[0](value0)
                            : symbolSize[0];
            symbolSize[1] = typeof symbolSize[1] === 'function'
                            ? symbolSize[1](value1)
                            : symbolSize[1];
            var symbolRotate = [
                this.query(data[0], 'symbolRotate') || mlOption.symbolRotate[0],
                this.query(data[1], 'symbolRotate') || mlOption.symbolRotate[1]
            ];
            //console.log(symbol, symbolSize, symbolRotate);

            var queryTarget = [data[0], data[1], mlOption];
            var normal = this.deepMerge(
                queryTarget,
                'itemStyle.normal'
            );
            normal.color = this.getItemStyleColor(normal.color, seriesIndex, dataIndex, data);
            var emphasis = this.deepMerge(
                queryTarget,
                'itemStyle.emphasis'
            );
            emphasis.color = this.getItemStyleColor(emphasis.color, seriesIndex, dataIndex, data);
            
            var nlineStyle = normal.lineStyle;
            var elineStyle = emphasis.lineStyle;
            
            var nBorderWidth = nlineStyle.width;
            if (nBorderWidth == null) {
                nBorderWidth = normal.borderWidth;
            }
            var eBorderWidth = elineStyle.width;
            if (eBorderWidth == null) {
                eBorderWidth = emphasis.borderWidth != null 
                               ? emphasis.borderWidth
                               : (nBorderWidth + 2);
            }
            var smoothness = this.deepQuery(queryTarget, 'smoothness');
            if (! this.deepQuery(queryTarget, 'smooth')) {
                smoothness = 0;
            }

            var ShapeCtor = bundling ? PolylineShape : MarkLineShape;
            var itemShape = new ShapeCtor({
                style: {
                    symbol: symbol,
                    symbolSize: symbolSize,
                    symbolRotate: symbolRotate,
                    // data: [data[0].name,data[1].name],
                    brushType: 'both',
                    lineType: nlineStyle.type,
                    shadowColor: nlineStyle.shadowColor
                                 || nlineStyle.color
                                 || normal.borderColor
                                 || normal.color
                                 || color,
                    shadowBlur: nlineStyle.shadowBlur,
                    shadowOffsetX: nlineStyle.shadowOffsetX,
                    shadowOffsetY: nlineStyle.shadowOffsetY,
                    color: normal.color || color,
                    strokeColor: nlineStyle.color
                                 || normal.borderColor
                                 || normal.color
                                 || color,
                    lineWidth: nBorderWidth,
                    symbolBorderColor: normal.borderColor
                                       || normal.color
                                       || color,
                    symbolBorder: normal.borderWidth
                },
                highlightStyle: {
                    shadowColor: elineStyle.shadowColor,
                    shadowBlur: elineStyle.shadowBlur,
                    shadowOffsetX: elineStyle.shadowOffsetX,
                    shadowOffsetY: elineStyle.shadowOffsetY,
                    color: emphasis.color|| normal.color || color,
                    strokeColor: elineStyle.color
                                 || nlineStyle.color
                                 || emphasis.borderColor 
                                 || normal.borderColor
                                 || emphasis.color 
                                 || normal.color
                                 || color,
                    lineWidth: eBorderWidth,
                    symbolBorderColor: emphasis.borderColor
                                       || normal.borderColor
                                       || emphasis.color
                                       || normal.color
                                       || color,
                    symbolBorder: emphasis.borderWidth == null
                                  ? (normal.borderWidth + 2)
                                  : (emphasis.borderWidth)
                },
                clickable: this.deepQuery(queryTarget, 'clickable')
            });
            var shapeStyle = itemShape.style;
            if (bundling) {
                shapeStyle.pointList = points;
                shapeStyle.smooth = smoothness;
            }
            else {
                shapeStyle.xStart = points[0][0];
                shapeStyle.yStart = points[0][1];
                shapeStyle.xEnd = points[1][0];
                shapeStyle.yEnd = points[1][1];
                shapeStyle.curveness = smoothness;
                itemShape.updatePoints(itemShape.style);
            }
            
            itemShape = this.addLabel(
                itemShape, 
                mlOption, 
                data[0], 
                data[0].name + ' : ' + data[1].name
            );

            return itemShape;
        },
        
        /**
         * ´ó¹æÄ£±ê×¢¹¹ÔìÆ÷ 
         */
        getLargeMarkPointShape: function(seriesIndex, mpOption) {
            var serie = this.series[seriesIndex];
            var component = this.component;
            var data = mpOption.data;
            var itemShape;
            
            var dataRange = component.dataRange;
            var legend = component.legend;
            var color;
            var value;
            var queryTarget = [data[0], mpOption];
            var nColor;
            var eColor;
            var effect;
            
            // Í¼Àý
            if (legend) {
                color = legend.getColor(serie.name);
            }
            // ÖµÓò
            if (dataRange) {
                value = data[0].value != null ? data[0].value : '';
                color = isNaN(value) ? color : dataRange.getColor(value);
                
                nColor = this.deepQuery(queryTarget, 'itemStyle.normal.color')
                         || color;
                eColor = this.deepQuery(queryTarget, 'itemStyle.emphasis.color')
                         || nColor;
                // ÓÐÖµÓò£¬²¢ÇÒÖµÓò·µ»ØnullÇÒÓÃ»§Ã»ÓÐ×Ô¼º¶¨ÒåÑÕÉ«£¬ÔòÒþ²ØÕâ¸ömark
                if (nColor == null && eColor == null) {
                    return;
                }
            }
            color = this.deepMerge(queryTarget, 'itemStyle.normal').color 
                    || color;
            
            var symbol = this.deepQuery(queryTarget, 'symbol') || 'circle';
            symbol = symbol.replace('empty', '').replace(/\d/g, '');
            
            effect = this.deepMerge(
                [data[0], mpOption],
                'effect'
            );
            
            var devicePixelRatio = window.devicePixelRatio || 1;
            
            //console.log(data)
            itemShape = new SymbolShape({
                style: {
                    pointList: data,
                    color: color,
                    strokeColor: color,
                    shadowColor: effect.shadowColor || color,
                    shadowBlur: (effect.shadowBlur != null ? effect.shadowBlur : 8)
                                 * devicePixelRatio,
                    size: this.deepQuery(queryTarget, 'symbolSize'),
                    iconType: symbol,
                    brushType: 'fill',
                    lineWidth:1
                },
                draggable: false,
                hoverable: false
            });
            
            if (effect.show) {
                itemShape.effect = effect;
            }
            
            return itemShape;
        },
        
        backupShapeList: function () {
            if (this.shapeList && this.shapeList.length > 0) {
                this.lastShapeList = this.shapeList;
                this.shapeList = [];
            }
            else {
                this.lastShapeList = [];
            }
        },
        
        addShapeList: function () {
            var maxLenth = this.option.animationThreshold / (this.canvasSupported ? 2 : 4);
            var lastShapeList = this.lastShapeList;
            var shapeList = this.shapeList;
            var isUpdate = lastShapeList.length > 0;
            var duration = isUpdate
                           ? this.query(this.option, 'animationDurationUpdate')
                           : this.query(this.option, 'animationDuration');
            var easing = this.query(this.option, 'animationEasing');
            var delay;
            var key;
            var oldMap = {};
            var newMap = {};
            if (this.option.animation 
                && !this.option.renderAsImage 
                && shapeList.length < maxLenth
                && !this.motionlessOnce
            ) {
                // Í¨¹ýÒÑÓÐµÄshape×ö¶¯»­¹ý¶É
                for (var i = 0, l = lastShapeList.length; i < l; i++) {
                    key = this._getAnimationKey(lastShapeList[i]);
                    if (key.match('undefined')) {
                        this.zr.delShape(lastShapeList[i].id);  // ·Ç¹Ø¼üÔªËØÖ±½ÓÉ¾³ý
                    }
                    else {
                        key += lastShapeList[i].type;
                        // https://github.com/ecomfe/echarts/issues/1219#issuecomment-71987602
                        // ÏìÓ¦ÖÐ¶Ï¿ÉÄÜ²úÉúµÄÖØ¸´ÔªËØ
                        if (oldMap[key]) {
                            this.zr.delShape(lastShapeList[i].id);
                        }
                        else {
                            oldMap[key] = lastShapeList[i];
                        }
                    }
                }
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    key = this._getAnimationKey(shapeList[i]);
                    if (key.match('undefined')) {
                        this.zr.addShape(shapeList[i]);         // ·Ç¹Ø¼üÔªËØÖ±½ÓÌí¼Ó
                    }
                    else {
                        key += shapeList[i].type;
                        newMap[key] = shapeList[i];
                    }
                }
                
                for (key in oldMap) {
                    if (!newMap[key]) {
                        // ÐÂµÄÃ»ÓÐ É¾³ý
                        this.zr.delShape(oldMap[key].id);
                    }
                }
                for (key in newMap) {
                    if (oldMap[key]) {
                        // ÐÂ¾É¶¼ÓÐ ¶¯»­¹ý¶É
                        this.zr.delShape(oldMap[key].id);
                        this._animateMod(
                            oldMap[key], newMap[key], duration, easing, 0, isUpdate
                        );
                    }
                    else {
                        // ÐÂÓÐ¾ÉÃ»ÓÐ  Ìí¼Ó²¢¶¯»­¹ý¶É
                        //this._animateAdd(newMap[key], duration, easing);
                        delay = (this.type == ecConfig.CHART_TYPE_LINE
                                || this.type == ecConfig.CHART_TYPE_RADAR)
                                && key.indexOf('icon') !== 0
                                ? duration / 2
                                : 0;
                        this._animateMod(
                            false, newMap[key], duration, easing, delay, isUpdate
                        );
                    }
                }
                this.zr.refresh();
                this.animationEffect();
            }
            else {
                this.motionlessOnce = false;
                // clear old
                this.zr.delShape(lastShapeList);
                // Ö±½ÓÌí¼Ó
                for (var i = 0, l = shapeList.length; i < l; i++) {
                    this.zr.addShape(shapeList[i]);
                }
            }
        },
        
        _getAnimationKey: function(shape) {
            if (this.type != ecConfig.CHART_TYPE_MAP
                && this.type != ecConfig.CHART_TYPE_TREEMAP
                && this.type != ecConfig.CHART_TYPE_VENN
                && this.type != ecConfig.CHART_TYPE_TREE
                ) {
                return ecData.get(shape, 'seriesIndex') + '_'
                       + ecData.get(shape, 'dataIndex')
                       + (shape._mark ? shape._mark : '')
                       + (this.type === ecConfig.CHART_TYPE_RADAR 
                          ? ecData.get(shape, 'special') : '');
            }
            else {
                return ecData.get(shape, 'seriesIndex') + '_'
                       + ecData.get(shape, 'dataIndex')
                       + (shape._mark ? shape._mark : 'undefined');
            }
        },
        
        /**
         * ¶¯»­¹ý¶É 
         */
        _animateMod: function (oldShape, newShape, duration, easing, delay, isUpdate) {
            switch (newShape.type) {
                case 'polyline' :
                case 'half-smooth-polygon' :
                    ecAnimation.pointList(this.zr, oldShape, newShape, duration, easing);
                    break;
                case 'rectangle' :
                    ecAnimation.rectangle(this.zr, oldShape, newShape, duration, easing);
                    break;
                case 'image' :
                case 'icon' :
                    ecAnimation.icon(this.zr, oldShape, newShape, duration, easing, delay);
                    break;
                case 'candle' :
                    if (!isUpdate) {
                        ecAnimation.candle(this.zr, oldShape, newShape, duration, easing);
                    }
                    else {
                        this.zr.addShape(newShape);
                    }
                    break;
                case 'ring' :
                case 'sector' :
                case 'circle' :
                    if (!isUpdate) {
                        // ½øÈë¶¯»­£¬¼ÓÐý×ª
                        ecAnimation.ring(
                            this.zr,
                            oldShape,
                            newShape, 
                            duration + ((ecData.get(newShape, 'dataIndex') || 0) % 20 * 100), 
                            easing
                        );
                    }
                    else if (newShape.type === 'sector') {
                        ecAnimation.sector(this.zr, oldShape, newShape, duration, easing);
                    }
                    else {
                        this.zr.addShape(newShape);
                    }
                    break;
                case 'text' :
                    ecAnimation.text(this.zr, oldShape, newShape, duration, easing);
                    break;
                case 'polygon' :
                    if (!isUpdate) {
                        ecAnimation.polygon(this.zr, oldShape, newShape, duration, easing);
                    }
                    else {
                        ecAnimation.pointList(this.zr, oldShape, newShape, duration, easing);
                    }
                    break;
                case 'ribbon' :
                    ecAnimation.ribbon(this.zr, oldShape, newShape, duration, easing);
                    break;
                case 'gauge-pointer' :
                    ecAnimation.gaugePointer(this.zr, oldShape, newShape, duration, easing);
                    break;
                case 'mark-line' :
                    ecAnimation.markline(this.zr, oldShape, newShape, duration, easing);
                    break;
                case 'bezier-curve' :
                case 'line' :
                    ecAnimation.line(this.zr, oldShape, newShape, duration, easing);
                    break;
                default :
                    this.zr.addShape(newShape);
                    break;
            }
        },
        
        /**
         * ±ê×¢¶¯»­
         * @param {number} duration Ê±³¤
         * @param {string=} easing »º¶¯Ð§¹û
         * @param {Array=} shapeList Ö¸¶¨ÌØÐ§¶ÔÏó£¬²»Ö¸¶¨Ä¬ÈÏÊ¹ÓÃthis.shapeList
         */
        animationMark: function (duration , easing, shapeList) {
            var shapeList = shapeList || this.shapeList;
            for (var i = 0, l = shapeList.length; i < l; i++) {
                if (!shapeList[i]._mark) {
                    continue;
                }
                this._animateMod(false, shapeList[i], duration, easing, 0, true);
            }
            this.animationEffect(shapeList);
        },

        /**
         * ÌØÐ§¶¯»­
         * @param {Array=} shapeList Ö¸¶¨ÌØÐ§¶ÔÏó£¬²»ÖªµÀÄ¬ÈÏÊ¹ÓÃthis.shapeList
         */
        animationEffect: function (shapeList) {
            !shapeList && this.clearEffectShape();
            shapeList = shapeList || this.shapeList;
            if (shapeList == null) {
                return;
            }
            var zlevel = ecConfig.EFFECT_ZLEVEL;
            if (this.canvasSupported) {
                this.zr.modLayer(
                    zlevel,
                    {
                        motionBlur: true,
                        lastFrameAlpha: this.option.effectBlendAlpha
                            || ecConfig.effectBlendAlpha
                    }
                );
            }
            var shape;
            for (var i = 0, l = shapeList.length; i < l; i++) {
                shape = shapeList[i];
                if (!(shape._mark && shape.effect && shape.effect.show && ecEffect[shape._mark])) {
                    continue;
                }
                ecEffect[shape._mark](this.zr, this.effectList, shape, zlevel);
                this.effectList[this.effectList.length - 1]._mark = shape._mark;
            }
        },
        
        clearEffectShape: function (clearMotionBlur) {
            var effectList = this.effectList;
            if (this.zr && effectList && effectList.length > 0) {
                clearMotionBlur && this.zr.modLayer(
                    ecConfig.EFFECT_ZLEVEL, 
                    { motionBlur: false }
                );
                this.zr.delShape(effectList);

                // ÊÖ¶¯Çå³ý²»»á±» zr ×Ô¶¯Çå³ýµÄ¶¯»­¿ØÖÆÆ÷
                for (var i = 0; i < effectList.length; i++) {
                    if (effectList[i].effectAnimator) {
                        effectList[i].effectAnimator.stop();
                    }
                }
            }
            this.effectList = [];
        },
        
        /**
         * ¶¯Ì¬±êÏß±ê×¢Ìí¼Ó
         * @param {number} seriesIndex ÏµÁÐË÷Òý
         * @param {Object} markData ±êÏß±ê×¢¶ÔÏó£¬Ö§³Ö¶à¸ö
         * @param {string} markType ±êÏß±ê×¢ÀàÐÍ
         */
        addMark: function (seriesIndex, markData, markType) {
            var serie = this.series[seriesIndex];
            if (this.selectedMap[serie.name]) {
                var duration = this.query(this.option, 'animationDurationUpdate');
                var easing = this.query(this.option, 'animationEasing');
                // ±¸·Ý£¬¸´ÓÃ_buildMarkX
                var oriMarkData = serie[markType].data;
                var lastLength = this.shapeList.length;
                
                serie[markType].data = markData.data;
                this['_build' + markType.replace('m', 'M')](seriesIndex);
                if (this.option.animation && !this.option.renderAsImage) {
                    // animationMark¾Í»áaddShape
                    this.animationMark(duration, easing, this.shapeList.slice(lastLength));
                }
                else {
                    for (var i = lastLength, l = this.shapeList.length; i < l; i++) {
                        this.zr.addShape(this.shapeList[i]);
                    }
                    this.zr.refreshNextFrame();
                }
                // »¹Ô­£¬¸´ÓÃ_buildMarkX
                serie[markType].data = oriMarkData;
            }
        },
        
        /**
         * ¶¯Ì¬±êÏß±ê×¢É¾³ý
         * @param {number} seriesIndex ÏµÁÐË÷Òý
         * @param {string} markName ±êÏß±ê×¢Ãû³Æ
         * @param {string} markType ±êÏß±ê×¢ÀàÐÍ
         */
        delMark: function (seriesIndex, markName, markType) {
            markType = markType.replace('mark', '').replace('large', '').toLowerCase();
            var serie = this.series[seriesIndex];
            if (this.selectedMap[serie.name]) {
                var needRefresh = false;
                var shapeList = [this.shapeList, this.effectList];
                var len = 2;
                while(len--) {
                    for (var i = 0, l = shapeList[len].length; i < l; i++) {
                        if (shapeList[len][i]._mark == markType
                            && ecData.get(shapeList[len][i], 'seriesIndex') == seriesIndex
                            && ecData.get(shapeList[len][i], 'name') == markName
                        ) {
                            this.zr.delShape(shapeList[len][i].id);
                            shapeList[len].splice(i, 1);
                            needRefresh = true;
                            break;
                        }
                    }
                }
                
                needRefresh && this.zr.refreshNextFrame();
            }
        }
    };

    zrUtil.inherits(Base, ComponentBase);

    return Base;
});
define('echarts/util/shape/Icon', ['require', 'zrender/tool/util', 'zrender/shape/Star', 'zrender/shape/Heart', 'zrender/shape/Droplet', 'zrender/shape/Image', 'zrender/shape/Base'], function (require) {
    var zrUtil = require('zrender/tool/util');
    
    function _iconMark(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;
        ctx.moveTo(x,                 y + style.height);
        ctx.lineTo(x + 5 * dx,        y + 14 * dy);
        ctx.lineTo(x + style.width,   y + 3 * dy);
        ctx.lineTo(x + 13 * dx,       y);
        ctx.lineTo(x + 2 * dx,        y + 11 * dy);
        ctx.lineTo(x,                 y + style.height);

        ctx.moveTo(x + 6 * dx,        y + 10 * dy);
        ctx.lineTo(x + 14 * dx,       y + 2 * dy);

        ctx.moveTo(x + 10 * dx,       y + 13 * dy);
        ctx.lineTo(x + style.width,   y + 13 * dy);

        ctx.moveTo(x + 13 * dx,       y + 10 * dy);
        ctx.lineTo(x + 13 * dx,       y + style.height);
    }

    function _iconMarkUndo(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;
        ctx.moveTo(x,                 y + style.height);
        ctx.lineTo(x + 5 * dx,        y + 14 * dy);
        ctx.lineTo(x + style.width,   y + 3 * dy);
        ctx.lineTo(x + 13 * dx,       y);
        ctx.lineTo(x + 2 * dx,        y + 11 * dy);
        ctx.lineTo(x,                 y + style.height);

        ctx.moveTo(x + 6 * dx,        y + 10 * dy);
        ctx.lineTo(x + 14 * dx,       y + 2 * dy);

        ctx.moveTo(x + 10 * dx,       y + 13 * dy);
        ctx.lineTo(x + style.width,   y + 13 * dy);
    }

    function _iconMarkClear(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;

        ctx.moveTo(x + 4 * dx,        y + 15 * dy);
        ctx.lineTo(x + 9 * dx,        y + 13 * dy);
        ctx.lineTo(x + 14 * dx,       y + 8 * dy);
        ctx.lineTo(x + 11 * dx,       y + 5 * dy);
        ctx.lineTo(x + 6 * dx,        y + 10 * dy);
        ctx.lineTo(x + 4 * dx,        y + 15 * dy);

        ctx.moveTo(x + 5 * dx,        y);
        ctx.lineTo(x + 11 * dx,       y);
        ctx.moveTo(x + 5 * dx,        y + dy);
        ctx.lineTo(x + 11 * dx,       y + dy);
        ctx.moveTo(x,                 y + 2 * dy);
        ctx.lineTo(x + style.width,   y + 2 * dy);

        ctx.moveTo(x,                 y + 5 * dy);
        ctx.lineTo(x + 3 * dx,        y + style.height);
        ctx.lineTo(x + 13 * dx,       y + style.height);
        ctx.lineTo(x + style.width,   y + 5 * dy);
    }

    function _iconDataZoom(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;

        ctx.moveTo(x,               y + 3 * dy);
        ctx.lineTo(x + 6 * dx,      y + 3 * dy);
        
        ctx.moveTo(x + 3 * dx,      y);
        ctx.lineTo(x + 3 * dx,      y + 6 * dy);

        ctx.moveTo(x + 3 * dx,      y + 8 * dy);
        ctx.lineTo(x + 3 * dx,      y + style.height);
        ctx.lineTo(x + style.width, y + style.height);
        ctx.lineTo(x + style.width, y + 3 * dy);
        ctx.lineTo(x + 8 * dx,      y + 3 * dy);
    }
    
    function _iconDataZoomReset(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;

        ctx.moveTo(x + 6 * dx,      y);
        ctx.lineTo(x + 2 * dx,      y + 3 * dy);
        ctx.lineTo(x + 6 * dx,      y + 6 * dy);
        
        ctx.moveTo(x + 2 * dx,      y + 3 * dy);
        ctx.lineTo(x + 14 * dx,     y + 3 * dy);
        ctx.lineTo(x + 14 * dx,     y + 11 * dy);
        
        ctx.moveTo(x + 2 * dx,      y + 5 * dy);
        ctx.lineTo(x + 2 * dx,      y + 13 * dy);
        ctx.lineTo(x + 14 * dx,     y + 13 * dy);
        
        ctx.moveTo(x + 10 * dx,     y + 10 * dy);
        ctx.lineTo(x + 14 * dx,     y + 13 * dy);
        ctx.lineTo(x + 10 * dx,     y + style.height);
    }
    
    function _iconRestore(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;
        var r = style.width / 2;
        
        ctx.lineWidth = 1.5;

        ctx.arc(x + r, y + r, r - dx, 0, Math.PI * 2 / 3);
        ctx.moveTo(x + 3 * dx,        y + style.height);
        ctx.lineTo(x + 0 * dx,        y + 12 * dy);
        ctx.lineTo(x + 5 * dx,        y + 11 * dy);

        ctx.moveTo(x, y + 8 * dy);
        ctx.arc(x + r, y + r, r - dx, Math.PI, Math.PI * 5 / 3);
        ctx.moveTo(x + 13 * dx,       y);
        ctx.lineTo(x + style.width,   y + 4 * dy);
        ctx.lineTo(x + 11 * dx,       y + 5 * dy);
    }

    function _iconLineChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;

        ctx.moveTo(x, y);
        ctx.lineTo(x, y + style.height);
        ctx.lineTo(x + style.width, y + style.height);

        ctx.moveTo(x + 2 * dx,    y + 14 * dy);
        ctx.lineTo(x + 7 * dx,    y + 6 * dy);
        ctx.lineTo(x + 11 * dx,   y + 11 * dy);
        ctx.lineTo(x + 15 * dx,   y + 2 * dy);
    }

    function _iconBarChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;

        ctx.moveTo(x, y);
        ctx.lineTo(x, y + style.height);
        ctx.lineTo(x + style.width, y + style.height);

        ctx.moveTo(x + 3 * dx,        y + 14 * dy);
        ctx.lineTo(x + 3 * dx,        y + 6 * dy);
        ctx.lineTo(x + 4 * dx,        y + 6 * dy);
        ctx.lineTo(x + 4 * dx,        y + 14 * dy);
        ctx.moveTo(x + 7 * dx,        y + 14 * dy);
        ctx.lineTo(x + 7 * dx,        y + 2 * dy);
        ctx.lineTo(x + 8 * dx,        y + 2 * dy);
        ctx.lineTo(x + 8 * dx,        y + 14 * dy);
        ctx.moveTo(x + 11 * dx,       y + 14 * dy);
        ctx.lineTo(x + 11 * dx,       y + 9 * dy);
        ctx.lineTo(x + 12 * dx,       y + 9 * dy);
        ctx.lineTo(x + 12 * dx,       y + 14 * dy);
    }
    
    function _iconPieChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width - 2;
        var height = style.height - 2;
        var r = Math.min(width, height) / 2;
        y += 2;
        ctx.moveTo(x + r + 3, y + r - 3);
        ctx.arc(x + r + 3, y + r - 3, r - 1, 0, -Math.PI / 2, true);
        ctx.lineTo(x + r + 3, y + r - 3);
      
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + r, y + r);
        ctx.arc(x + r, y + r, r, -Math.PI / 2, Math.PI * 2, true);
        ctx.lineTo(x + r, y + r);
        ctx.lineWidth = 1.5;
    }
    
    function _iconFunnelChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;
        y -= dy;
        ctx.moveTo(x + 1 * dx,      y + 2 * dy);
        ctx.lineTo(x + 15 * dx,     y + 2 * dy);
        ctx.lineTo(x + 14 * dx,     y + 3 * dy);
        ctx.lineTo(x + 2 * dx,      y + 3 * dy);
        
        ctx.moveTo(x + 3 * dx,      y + 6 * dy);
        ctx.lineTo(x + 13 * dx,     y + 6 * dy);
        ctx.lineTo(x + 12 * dx,     y + 7 * dy);
        ctx.lineTo(x + 4 * dx,      y + 7 * dy);
        
        ctx.moveTo(x + 5 * dx,      y + 10 * dy);
        ctx.lineTo(x + 11 * dx,      y + 10 * dy);
        ctx.lineTo(x + 10 * dx,      y + 11 * dy);
        ctx.lineTo(x + 6 * dx,      y + 11 * dy);
        
        ctx.moveTo(x + 7 * dx,      y + 14 * dy);
        ctx.lineTo(x + 9 * dx,      y + 14 * dy);
        ctx.lineTo(x + 8 * dx,      y + 15 * dy);
        ctx.lineTo(x + 7 * dx,      y + 15 * dy);
    }
    
    function _iconForceChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        var dx = width / 16;
        var dy = height / 16;
        var r = Math.min(dx, dy) * 2;

        ctx.moveTo(x + dx + r, y + dy + r);
        ctx.arc(x + dx, y + dy, r, Math.PI / 4, Math.PI * 3);
        
        ctx.lineTo(x + 7 * dx - r, y + 6 * dy - r);
        ctx.arc(x + 7 * dx, y + 6 * dy, r, Math.PI / 4 * 5, Math.PI * 4);
        ctx.arc(x + 7 * dx, y + 6 * dy, r / 2, Math.PI / 4 * 5, Math.PI * 4);
        
        ctx.moveTo(x + 7 * dx - r / 2, y + 6 * dy + r);
        ctx.lineTo(x + dx + r, y + 14 * dy - r);
        ctx.arc(x + dx, y + 14 * dy, r, -Math.PI / 4, Math.PI * 2);
        
        ctx.moveTo(x + 7 * dx + r / 2, y + 6 * dy);
        ctx.lineTo(x + 14 * dx - r, y + 10 * dy - r / 2);
        ctx.moveTo(x + 16 * dx, y + 10 * dy);
        ctx.arc(x + 14 * dx, y + 10 * dy, r, 0, Math.PI * 3);
        ctx.lineWidth = 1.5;
    }
    
    function _iconChordChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        var r = Math.min(width, height) / 2;

        ctx.moveTo(x + width, y + height / 2);
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        
        ctx.arc(x + r, y, r, Math.PI / 4, Math.PI / 5 * 4);
        ctx.arc(x, y + r, r, -Math.PI / 3, Math.PI / 3);
        ctx.arc(x + width, y + height, r, Math.PI, Math.PI / 2 * 3);
        ctx.lineWidth = 1.5;
    }

    function _iconStackChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        var dy = Math.round(height / 3);
        var delta = Math.round((dy - 2) / 2);
        var len = 3;
        while (len--) {
            ctx.rect(x, y + dy * len + delta, width, 2);
        }
    }
    
    function _iconTiledChart(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        var dx = Math.round(width / 3);
        var delta = Math.round((dx - 2) / 2);
        var len = 3;
        while (len--) {
            ctx.rect(x + dx * len + delta, y, 2, height);
        }
    }
    
    function _iconDataView(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;

        ctx.moveTo(x + dx, y);
        ctx.lineTo(x + dx, y + style.height);
        ctx.lineTo(x + 15 * dx, y + style.height);
        ctx.lineTo(x + 15 * dx, y);
        ctx.lineTo(x + dx, y);

        ctx.moveTo(x + 3 * dx, y + 3 * dx);
        ctx.lineTo(x + 13 * dx, y + 3 * dx);

        ctx.moveTo(x + 3 * dx, y + 6 * dx);
        ctx.lineTo(x + 13 * dx, y + 6 * dx);

        ctx.moveTo(x + 3 * dx, y + 9 * dx);
        ctx.lineTo(x + 13 * dx, y + 9 * dx);

        ctx.moveTo(x + 3 * dx, y + 12 * dx);
        ctx.lineTo(x + 9 * dx, y + 12 * dx);
    }
    
    function _iconSave(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        var dy = style.height / 16;

        ctx.moveTo(x, y);
        ctx.lineTo(x, y + style.height);
        ctx.lineTo(x + style.width, y + style.height);
        ctx.lineTo(x + style.width, y);
        ctx.lineTo(x, y);

        ctx.moveTo(x + 4 * dx,    y);
        ctx.lineTo(x + 4 * dx,    y + 8 * dy);
        ctx.lineTo(x + 12 * dx,   y + 8 * dy);
        ctx.lineTo(x + 12 * dx,   y);
        
        ctx.moveTo(x + 6 * dx,    y + 11 * dy);
        ctx.lineTo(x + 6 * dx,    y + 13 * dy);
        ctx.lineTo(x + 10 * dx,   y + 13 * dy);
        ctx.lineTo(x + 10 * dx,   y + 11 * dy);
        ctx.lineTo(x + 6 * dx,    y + 11 * dy);
    }
    
    function _iconCross(ctx, style) {
        var x = style.x;
        var y = style.y;
        var width = style.width;
        var height = style.height;
        ctx.moveTo(x, y + height / 2);
        ctx.lineTo(x + width, y + height / 2);
        
        ctx.moveTo(x + width / 2, y);
        ctx.lineTo(x + width / 2, y + height);
    }
    
    function _iconCircle(ctx, style) {
        var width = style.width / 2;
        var height = style.height / 2;
        var r = Math.min(width, height);
        ctx.moveTo(
            style.x + width + r, 
            style.y + height
        );
        ctx.arc(
            style.x + width, 
            style.y + height, 
            r,
            0, 
            Math.PI * 2
        );
        ctx.closePath();
    }
    
    function _iconCircleCross(ctx, style){   
        var width = style.width / 2; 
        var height = style.height / 2;
        var min = Math.min(width, height);
        ctx.moveTo(style.x + width + min, style.y + height);
        ctx.arc(style.x + width, style.y + height, min, 0, Math.PI * 2); 
        ctx.closePath();
        
        var x = style.x;
        var y = style.y;
        var w = style.width;
        var h = style.height;

        ctx.moveTo(x + w / 4, y + h / 2);
        ctx.lineTo(x + w / 4 * 3, y + h / 2);
        ctx.moveTo(x + w / 2, y + h / 4);
        ctx.lineTo(x + w / 2, y + h / 4 * 3);
        ctx.lineWidth /= 2;
    }


    function _iconCircleMinus(ctx, style){
        var width = style.width / 2; 
        var height = style.height / 2;
        var min = Math.min(width, height);
        ctx.moveTo(style.x + width + min, style.y + height);
        ctx.arc(style.x + width, style.y + height, min, 0, Math.PI * 2); 
        ctx.closePath();
        
        var x = style.x;
        var y = style.y;
        var w = style.width;
        var h = style.height;

        ctx.moveTo(x + w / 4, y + h / 2);
        ctx.lineTo(x + w / 4 * 3, y + h / 2);
/*        ctx.moveTo(x + w / 2, y + h / 4);
        ctx.lineTo(x + w / 2, y + h / 4 * 3);*/
        ctx.lineWidth /= 2;
    }

    function _iconRectangle(ctx, style) {
        ctx.rect(style.x, style.y, style.width, style.height);
        ctx.closePath();
    }
    
    function _iconTriangle(ctx, style) {
        var width = style.width / 2;
        var height = style.height / 2;
        var x = style.x + width;
        var y = style.y + height;
        var symbolSize = Math.min(width, height);
        ctx.moveTo(x, y - symbolSize);
        ctx.lineTo(x + symbolSize, y + symbolSize);
        ctx.lineTo(x - symbolSize, y + symbolSize);
        ctx.lineTo(x, y - symbolSize);
        ctx.closePath();
    }
    
    function _iconDiamond(ctx, style) {
        var width = style.width / 2;
        var height = style.height / 2;
        var x = style.x + width;
        var y = style.y + height;
        var symbolSize = Math.min(width, height);
        ctx.moveTo(x, y - symbolSize);
        ctx.lineTo(x + symbolSize, y);
        ctx.lineTo(x, y + symbolSize);
        ctx.lineTo(x - symbolSize, y);
        ctx.lineTo(x, y - symbolSize);
        ctx.closePath();
    }
    
    function _iconArrow(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        ctx.moveTo(x + 8 * dx,  y);      //箭头角          
        ctx.lineTo(x + dx,      y + style.height); //箭头尾部
        ctx.lineTo(x + 8 * dx,  y + style.height / 4 * 3); //箭头凹角
        ctx.lineTo(x + 15 * dx, y + style.height);
        ctx.lineTo(x + 8 * dx,  y);
        ctx.closePath();
    }

    // //向右箭头
    function _iconArrowR(ctx, style) {
        var x = style.x;
        var y = style.y;
        var dx = style.width / 16;
        ctx.moveTo(x + 10 * dx, y+6); 
        ctx.lineTo(x - dx - 4, y);
        ctx.lineTo(x - 2 - dx, y+6);
        ctx.lineTo(x - dx - 4, y+10);
        ctx.lineTo(x + 10 * dx, y+6); 
        ctx.closePath();
    }
    
    function _iconArrayDown(ctx, style) {
    var x = style.x;
    var y = style.y;
    var dx = style.width / 16;
        ctx.moveTo(x + 8 * dx, y + style.height); 
        ctx.lineTo(x + dx, y);
        ctx.lineTo(x + 8 * dx, y - style.height / 4 * 3 + style.height); 
        ctx.lineTo(x + 15 * dx, y); 
        ctx.lineTo(x + 8 * dx, y + style.height); 
        ctx.closePath();
    }



    function _iconStar(ctx, style) {
        var StarShape = require('zrender/shape/Star');
        var width = style.width / 2;
        var height = style.height / 2;
        StarShape.prototype.buildPath(ctx, {
            x : style.x + width,
            y : style.y + height,
            r : Math.min(width, height),
            n : style.n || 5
        });
    }
    
    function _iconHeart(ctx, style) {
        var HeartShape = require('zrender/shape/Heart');
        HeartShape.prototype.buildPath(ctx, {
            x : style.x + style.width / 2,
            y : style.y + style.height * 0.2,
            a : style.width / 2,
            b : style.height * 0.8
        });
    }
    
    function _iconDroplet(ctx, style) {
        var DropletShape = require('zrender/shape/Droplet');
        DropletShape.prototype.buildPath(ctx, {
            x : style.x + style.width * 0.5,
            y : style.y + style.height * 0.5,
            a : style.width * 0.5,
            b : style.height * 0.8
        });
    }
    
    function _iconPin(ctx, style) {
        var x = style.x;
        var y = style.y - style.height / 2 * 1.5;
        var width = style.width / 2;
        var height = style.height / 2;
        var r = Math.min(width, height);
        ctx.arc(
            x + width, 
            y + height, 
            r,
            Math.PI / 5 * 4, 
            Math.PI / 5
        );
        ctx.lineTo(x + width, y + height + r * 1.5);
        ctx.closePath();
    }
    
    function _iconImage(ctx, style, refreshNextFrame) {
        var ImageShape = require('zrender/shape/Image');
        this._imageShape = this._imageShape || new ImageShape({
            style: {}
        });
        for (var name in style) {
            this._imageShape.style[name] = style[name];
        }
        this._imageShape.brush(ctx, false, refreshNextFrame);
    }
    
    var Base = require('zrender/shape/Base');
    
    function Icon(options) {
        Base.call(this, options);
    }

    Icon.prototype =  {
        type : 'icon',
        iconLibrary : {
            mark : _iconMark,
            markUndo : _iconMarkUndo,
            markClear : _iconMarkClear,
            dataZoom : _iconDataZoom,
            dataZoomReset : _iconDataZoomReset,
            restore : _iconRestore,
            lineChart : _iconLineChart,
            barChart : _iconBarChart,
            pieChart : _iconPieChart,
            funnelChart : _iconFunnelChart,
            forceChart : _iconForceChart,
            chordChart : _iconChordChart,
            stackChart : _iconStackChart,
            tiledChart : _iconTiledChart,
            dataView : _iconDataView,
            saveAsImage : _iconSave,
            circleCross: _iconCircleCross,
            circleMinus: _iconCircleMinus,
            cross : _iconCross,
            circle : _iconCircle,
            rectangle : _iconRectangle,
            triangle : _iconTriangle,
            diamond : _iconDiamond,
            arrow : _iconArrow,
            arrowdown: _iconArrayDown,
            arrowright:_iconArrowR,
            star : _iconStar,
            heart : _iconHeart,
            droplet : _iconDroplet,
            pin : _iconPin,
            image : _iconImage
        },
        brush: function (ctx, isHighlight, refreshNextFrame) {
            var style = isHighlight ? this.highlightStyle : this.style;
            style = style || {};
            var iconType = style.iconType || this.style.iconType;
            if (iconType === 'image') {
                var ImageShape = require('zrender/shape/Image');
                ImageShape.prototype.brush.call(this, ctx, isHighlight, refreshNextFrame);

            } else {

                var style = this.beforeBrush(ctx, isHighlight);

                ctx.beginPath();
                this.buildPath(ctx, style, refreshNextFrame);

                switch (style.brushType) {
                    /* jshint ignore:start */
                    case 'both':
                        ctx.fill();
                    case 'stroke':
                        style.lineWidth > 0 && ctx.stroke();
                        break;
                    /* jshint ignore:end */
                    default:
                        ctx.fill();
                }
                
                this.drawText(ctx, style, this.style);

                this.afterBrush(ctx);
            }
        },
        /**
         * ´´½¨¾ØÐÎÂ·¾¶
         * @param {Context2D} ctx Canvas 2DÉÏÏÂÎÄ
         * @param {Object} style ÑùÊ½
         */
        buildPath : function (ctx, style, refreshNextFrame) {
            if (this.iconLibrary[style.iconType]) {
                this.iconLibrary[style.iconType].call(this, ctx, style, refreshNextFrame);
            }
            else {
                ctx.moveTo(style.x, style.y);
                ctx.lineTo(style.x + style.width, style.y);
                ctx.lineTo(style.x + style.width, style.y + style.height);
                ctx.lineTo(style.x, style.y + style.height);
                ctx.lineTo(style.x, style.y);
                ctx.closePath();
            }

            return;
        },

        /**
         * ·µ»Ø¾ØÐÎÇøÓò£¬ÓÃÓÚ¾Ö²¿Ë¢ÐÂºÍÎÄ×Ö¶¨Î»
         * @param {Object} style
         */
        getRect : function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            
            // pin±È½ÏÌØÊâ£¬ÈÃ¼â¶ËÔÚÄ¿±êx,yÉÏ
            style.__rect = {
                x : Math.round(style.x),
                y : Math.round(style.y - (style.iconType == 'pin' 
                                         ? (style.height / 2 * 1.5) : 0)
                               ),
                width : style.width,
                height : style.height * (
                    style.iconType === 'pin' ? 1.25 : 1
                )
            };
            
            return style.__rect;
        },

        isCover : function (x, y) {
            var originPos = this.transformCoordToLocal(x, y);
            x = originPos[0];
            y = originPos[1];

            // ¿ìËÙÔ¤ÅÐ²¢±£ÁôÅÐ¶Ï¾ØÐÎ
            var rect = this.style.__rect;
            if (!rect) {
                rect = this.style.__rect = this.getRect(this.style);
            }
            // Ìá¸ß½»»¥ÌåÑé£¬Ì«Ð¡µÄÍ¼ÐÎ°üÎ§ºÐËÄÏòÀ©´ó4px
            var delta = (rect.height < 8 || rect.width < 8 ) ? 4 : 0;
            return x >= rect.x - delta
                && x <= (rect.x + rect.width + delta)
                && y >= rect.y - delta
                && y <= (rect.y + rect.height + delta);
        }
    };

    zrUtil.inherits(Icon, Base);
    
    return Icon;
});
define('zrender/shape/Image', ['require', './Base', '../tool/util'], function (require) {

        var Base = require('./Base');

        /**
         * @alias zrender/shape/Image
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var ZImage = function(options) {
            Base.call(this, options);
            /**
             * Í¼Æ¬»æÖÆÑùÊ½
             * @name module:zrender/shape/Image#style
             * @type {module:zrender/shape/Image~IImageStyle}
             */
            /**
             * Í¼Æ¬¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Image#highlightStyle
             * @type {module:zrender/shape/Image~IImageStyle}
             */
        };

        ZImage.prototype = {
            
            type: 'image',

            brush : function(ctx, isHighlight, refreshNextFrame) {
                var style = this.style || {};

                if (isHighlight) {
                    // ¸ù¾ÝstyleÀ©Õ¹Ä¬ÈÏ¸ßÁÁÑùÊ½
                    style = this.getHighlightStyle(
                        style, this.highlightStyle || {}
                    );
                }

                var image = style.image;
                var self = this;

                if (!this._imageCache) {
                    this._imageCache = {};
                }
                if (typeof(image) === 'string') {
                    var src = image;
                    if (this._imageCache[src]) {
                        image = this._imageCache[src];
                    } else {
                        image = new Image();
                        image.onload = function () {
                            image.onload = null;
                            self.modSelf();
                            refreshNextFrame();
                        };

                        image.src = src;
                        this._imageCache[src] = image;
                    }
                }
                if (image) {
                    // Í¼Æ¬ÒÑ¾­¼ÓÔØÍê³É
                    if (image.nodeName.toUpperCase() == 'IMG') {
                        if (window.ActiveXObject) {
                            if (image.readyState != 'complete') {
                                return;
                            }
                        }
                        else {
                            if (!image.complete) {
                                return;
                            }
                        }
                    }
                    // Else is canvas
                    var width = style.width || image.width;
                    var height = style.height || image.height;
                    var x = style.x;
                    var y = style.y;
                    // Í¼Æ¬¼ÓÔØÊ§°Ü
                    if (!image.width || !image.height) {
                        return;
                    }

                    ctx.save();

                    this.doClip(ctx);

                    this.setContext(ctx, style);

                    // ÉèÖÃtransform
                    this.setTransform(ctx);

                    if (style.sWidth && style.sHeight) {
                        var sx = style.sx || 0;
                        var sy = style.sy || 0;
                        ctx.drawImage(
                            image,
                            sx, sy, style.sWidth, style.sHeight,
                            x, y, width, height
                        );
                    }
                    else if (style.sx && style.sy) {
                        var sx = style.sx;
                        var sy = style.sy;
                        var sWidth = width - sx;
                        var sHeight = height - sy;
                        ctx.drawImage(
                            image,
                            sx, sy, sWidth, sHeight,
                            x, y, width, height
                        );
                    }
                    else {
                        ctx.drawImage(image, x, y, width, height);
                    }
                    // Èç¹ûÃ»ÉèÖÃ¿íºÍ¸ßµÄ»°×Ô¶¯¸ù¾ÝÍ¼Æ¬¿í¸ßÉèÖÃ
                    if (!style.width) {
                        style.width = width;
                    }
                    if (!style.height) {
                        style.height = height;
                    }
                    if (!this.style.width) {
                        this.style.width = width;
                    }
                    if (!this.style.height) {
                        this.style.height = height;
                    }

                    this.drawText(ctx, style, this.style);

                    ctx.restore();
                }
            },

            /**
             * ¼ÆËã·µ»ØÍ¼Æ¬µÄ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Image~IImageStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect: function(style) {
                return {
                    x : style.x,
                    y : style.y,
                    width : style.width,
                    height : style.height
                };
            },

            clearCache: function() {
                this._imageCache = {};
            }
        };

        require('../tool/util').inherits(ZImage, Base);
        return ZImage;
    });
define('zrender/shape/BezierCurve', ['require', './Base', '../tool/util'], function (require) {
        'use strict';

        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/BezierCurve
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var BezierCurve = function(options) {
            this.brushTypeOnly = 'stroke';  // ÏßÌõÖ»ÄÜÃè±ß£¬Ìî³äºó¹û×Ô¸º
            this.textPosition = 'end';
            Base.call(this, options);
            /**
             * ±´Èü¶ûÇúÏß»æÖÆÑùÊ½
             * @name module:zrender/shape/BezierCurve#style
             * @type {module:zrender/shape/BezierCurve~IBezierCurveStyle}
             */
            /**
             * ±´Èü¶ûÇúÏß¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/BezierCurve#highlightStyle
             * @type {module:zrender/shape/BezierCurve~IBezierCurveStyle}
             */
        };

        BezierCurve.prototype = {
            type: 'bezier-curve',

            /**
             * ´´½¨±´Èû¶ûÇúÏßÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/BezierCurve~IBezierCurveStyle} style
             */
            buildPath : function(ctx, style) {
                ctx.moveTo(style.xStart, style.yStart);
                if (typeof style.cpX2 != 'undefined'
                    && typeof style.cpY2 != 'undefined'
                ) {
                    ctx.bezierCurveTo(
                        style.cpX1, style.cpY1,
                        style.cpX2, style.cpY2,
                        style.xEnd, style.yEnd
                    );
                }
                else {
                    ctx.quadraticCurveTo(
                        style.cpX1, style.cpY1,
                        style.xEnd, style.yEnd
                    );
                }
            },

            /**
             * ¼ÆËã·µ»Ø±´Èü¶ûÇúÏß°üÎ§ºÐ¾ØÐÎ¡£
             * ¸Ã°üÎ§ºÐÊÇÖ±½Ó´ÓËÄ¸ö¿ØÖÆµã¼ÆËã£¬²¢·Ç×îÐ¡°üÎ§ºÐ¡£
             * @param {module:zrender/shape/BezierCurve~IBezierCurveStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var _minX = Math.min(style.xStart, style.xEnd, style.cpX1);
                var _minY = Math.min(style.yStart, style.yEnd, style.cpY1);
                var _maxX = Math.max(style.xStart, style.xEnd, style.cpX1);
                var _maxY = Math.max(style.yStart, style.yEnd, style.cpY1);
                var _x2 = style.cpX2;
                var _y2 = style.cpY2;

                if (typeof _x2 != 'undefined'
                    && typeof _y2 != 'undefined'
                ) {
                    _minX = Math.min(_minX, _x2);
                    _minY = Math.min(_minY, _y2);
                    _maxX = Math.max(_maxX, _x2);
                    _maxY = Math.max(_maxY, _y2);
                }

                var lineWidth = style.lineWidth || 1;
                style.__rect = {
                    x : _minX - lineWidth,
                    y : _minY - lineWidth,
                    width : _maxX - _minX + lineWidth,
                    height : _maxY - _minY + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(BezierCurve, Base);
        return BezierCurve;
    });
define('zrender/shape/Line', ['require', './Base', './util/dashedLineTo', '../tool/util'], function (require) {
        var Base = require('./Base');
        var dashedLineTo = require('./util/dashedLineTo');
        
        /**
         * @alias module:zrender/shape/Line
         * @param {Object} options
         * @constructor
         * @extends module:zrender/shape/Base
         */
        var Line = function (options) {
            this.brushTypeOnly = 'stroke';  // ÏßÌõÖ»ÄÜÃè±ß£¬Ìî³äºó¹û×Ô¸º
            this.textPosition = 'end';
            Base.call(this, options);

            /**
             * Ö±Ïß»æÖÆÑùÊ½
             * @name module:zrender/shape/Line#style
             * @type {module:zrender/shape/Line~ILineStyle}
             */
            /**
             * Ö±Ïß¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Line#highlightStyle
             * @type {module:zrender/shape/Line~ILineStyle}
             */
        };

        Line.prototype =  {
            type: 'line',

            /**
             * ´´½¨ÏßÌõÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Line~ILineStyle} style
             */
            buildPath : function (ctx, style) {
                if (!style.lineType || style.lineType == 'solid') {
                    // Ä¬ÈÏÎªÊµÏß
                    ctx.moveTo(style.xStart, style.yStart);
                    ctx.lineTo(style.xEnd, style.yEnd);
                }
                else if (style.lineType == 'dashed'
                        || style.lineType == 'dotted'
                ) {
                    var dashLength = (style.lineWidth || 1)  
                                     * (style.lineType == 'dashed' ? 5 : 1);
                    dashedLineTo(
                        ctx,
                        style.xStart, style.yStart,
                        style.xEnd, style.yEnd,
                        dashLength
                    );
                }
            },

            /**
             * ¼ÆËã·µ»ØÏßÌõµÄ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Line~ILineStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth = style.lineWidth || 1;
                style.__rect = {
                    x : Math.min(style.xStart, style.xEnd) - lineWidth,
                    y : Math.min(style.yStart, style.yEnd) - lineWidth,
                    width : Math.abs(style.xStart - style.xEnd)
                            + lineWidth,
                    height : Math.abs(style.yStart - style.yEnd)
                             + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Line, Base);
        return Line;
    });
define('echarts/layout/Tree', ['require', 'zrender/tool/vector'], function (require) {

    var vec2 = require('zrender/tool/vector');

    function TreeLayout(opts) {

        opts = opts || {};

        this.nodePadding = opts.nodePadding || 30;

        this.layerPadding = opts.layerPadding || 100;

        this._layerOffsets = [];

        this._layers = [];
    }

    TreeLayout.prototype.run = function (tree) {
        this._layerOffsets.length = 0;
        for (var i = 0; i < tree.root.height + 1; i++) {
            this._layerOffsets[i] = 0;
            this._layers[i] = [];
        }
        this._updateNodeXPosition(tree.root);
        var root = tree.root;
        this._updateNodeYPosition(root, 0, root.layout.height);
    };

    TreeLayout.prototype._updateNodeXPosition = function (node) {
        var minX = Infinity;
        var maxX = -Infinity;
        node.layout.position = node.layout.position || vec2.create();
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            this._updateNodeXPosition(child);
            var x = child.layout.position[0];
            if (x < minX) {
                minX = x;
            }
            if (x > maxX) {
                maxX = x;
            }
        }
        if (node.children.length > 0) {
            node.layout.position[0] = (minX + maxX) / 2;
        } else {
            node.layout.position[0] = 0;
        }
        var off = this._layerOffsets[node.depth] || 0;
        if (off > node.layout.position[0]) {
            var shift = off - node.layout.position[0];
            this._shiftSubtree(node, shift);
            for (var i = node.depth + 1; i < node.height + node.depth; i++) {
                this._layerOffsets[i] += shift;
            }
        }
        this._layerOffsets[node.depth] = node.layout.position[0] + node.layout.width + this.nodePadding;

        this._layers[node.depth].push(node);
    };

    TreeLayout.prototype._shiftSubtree = function (root, offset) {
        root.layout.position[0] += offset;
        for (var i = 0; i < root.children.length; i++) {
            this._shiftSubtree(root.children[i], offset);
        }
    };

    TreeLayout.prototype._updateNodeYPosition = function (node, y, prevLayerHeight) {
        node.layout.position[1] = y;
        var layerHeight = 0;
        for (var i = 0; i < node.children.length; i++) {
            layerHeight = Math.max(node.children[i].layout.height, layerHeight);
        }
        var layerPadding = this.layerPadding;
        if (typeof(layerPadding) === 'function') {
            layerPadding = layerPadding(node.depth);
        }
        for (var i = 0; i < node.children.length; i++) {
            this._updateNodeYPosition(node.children[i], y + layerPadding + prevLayerHeight, layerHeight);
        }
    };

    return TreeLayout;
});
define('echarts/data/Tree', ['require', 'zrender/tool/util'], function (require) {

    var zrUtil = require('zrender/tool/util');

    /**
     * @constructor module:echarts/data/Tree~TreeNode
     * @param {string} id Node ID
     * @param {Object} [data]
     */
    function TreeNode(id, data) {
        /**
         * @type {string}
         */
        this.id = id;
        /**
         * ½ÚµãµÄÉî¶È
         * @type {number}
         */
        this.depth = 0;
        /**
         * ÒÔµ±Ç°½ÚµãÎª¸ù½ÚµãµÄ×ÓÊ÷µÄ¸ß¶È
         * @type {number}
         */
        this.height = 0;
        /**
         * ×Ó½ÚµãÁÐ±í
         * @type {Array.<module:echarts/data/Tree~TreeNode>}
         */
        this.children = [];

        /**
         * @type {module:echarts/data/Tree~TreeNode}
         */
        this.parent = null;

        /**
         * ´æ´¢µÄÓÃ»§Êý¾Ý
         * @type {Object}
         */
        this.data = data || null;
    }

    /**
     * Ìí¼Ó×Ó½Úµã
     * @param {module:echarts/data/Tree~TreeNode} child
     */
    TreeNode.prototype.add = function (child) {
        var children = this.children;
        if (child.parent === this) {
            return;
        }

        children.push(child);
        child.parent = this;
    };

    /**
     * ÒÆ³ý×Ó½Úµã
     * @param {module:echarts/data/Tree~TreeNode} child
     */
    TreeNode.prototype.remove = function (child) {
        var children = this.children;
        var idx = zrUtil.indexOf(children, child);
        if (idx >= 0) {
            children.splice(idx, 1);
            child.parent = null;
        }
    };

    /**
     * ±éÀúµ±Ç°½Úµã¼°ÆäËùÓÐ×Ó½Úµã
     * @param  {Function} cb
     * @param  {Object}   [context]
     */
    TreeNode.prototype.traverse = function (cb, context) {
        cb.call(context, this);

        for (var i = 0; i < this.children.length; i++) {
            this.children[i].traverse(cb, context);
        }
    };

    /**
     * ¸üÐÂµ±Ç°Ê÷¼°ËùÓÐ×ÓÊ÷µÄ¸ß¶ÈºÍÉî¶È
     * @param  {number} depth
     */
    TreeNode.prototype.updateDepthAndHeight = function (depth) {
        var height = 0;
        this.depth = depth;
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            child.updateDepthAndHeight(depth + 1);
            if (child.height > height) {
                height = child.height;
            }
        }
        this.height = height + 1;
    };

    /**
     * @param  {string} id
     * @return module:echarts/data/Tree~TreeNode
     */
    TreeNode.prototype.getNodeById = function (id) {
        if (this.id === id) {
            return this;
        }
        for (var i = 0; i < this.children.length; i++) {
            var res = this.children[i].getNodeById(id);
            if (res) {
                return res;
            }
        }
    };

    /**
     * @constructor
     * @alias module:echarts/data/Tree
     * @param {string} id
     */
    function Tree(id) {
        /**
         * @type {module:echarts/data/Tree~TreeNode}
         */
        this.root = new TreeNode(id);
    }

    /**
     * ±éÀúÊ÷µÄËùÓÐ×Ó½Úµã
     * @param  {Function} cb
     * @param  {Object}   [context]
     */
    Tree.prototype.traverse = function(cb, context) {
        this.root.traverse(cb, context);
    };

    /**
     * Éú³É×ÓÊ÷
     * @param  {string} id ×ÓÊ÷¸ù½Úµã id
     * @return {module:echarts/data/Tree}
     */
    Tree.prototype.getSubTree = function(id) {
        var root = this.getNodeById(id);
        if (root) {
            var tree = new Tree(root.id);
            tree.root = root;
            return tree;
        }
    };

    /**
     * @param  {string} id
     * @return module:echarts/data/Tree~TreeNode
     */
    Tree.prototype.getNodeById = function (id) {
        return this.root.getNodeById(id);
    };


    /**
     * ´Ó option ÀïµÄ data Êý¾Ý¹¹½¨Ê÷
     * @param {string} id
     * @param {Array.<Object>} data
     * @return module:echarts/data/Tree
     */
    Tree.fromOptionData = function (id, data) {
        var tree = new Tree(id);
        var rootNode = tree.root;
        // Root node
        rootNode.data = {
            name: id,
            children: data
        };

        function buildHierarchy(dataNode, parentNode) {
            var node = new TreeNode(dataNode.name, dataNode);
            parentNode.add(node);
            // ±éÀúÌí¼Ó×Ó½Úµã
            var children = dataNode.children;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    buildHierarchy(children[i], node);
                }
            }
        }

        for (var i = 0; i < data.length; i++) {
            buildHierarchy(data[i], rootNode);
        }

        tree.root.updateDepthAndHeight(0);

        return tree;
    };

    // TODO
    Tree.fromGraph = function (graph) {

        function buildHierarchy(root) {
            var graphNode = graph.getNodeById(root.id);
            for (var i = 0; i < graphNode.outEdges.length; i++) {
                var edge = graphNode.outEdges[i];
                var childTreeNode = treeNodesMap[edge.node2.id];
                root.children.push(childTreeNode);
                buildHierarchy(childTreeNode);
            }
        }

        var treeMap = {};
        var treeNodesMap = {};
        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];
            var treeNode;
            if (node.inDegree() === 0) {
                treeMap[node.id] = new Tree(node.id);
                treeNode = treeMap[node.id].root;
            } else {
                treeNode = new TreeNode(node.id);
            }

            treeNode.data = node.data;

            treeNodesMap[node.id] = treeNode;
        }
        var treeList = [];
        for (var id in treeMap) {
            buildHierarchy(treeMap[id].root);
            treeMap[id].root.updateDepthAndHeight(0);
            treeList.push(treeMap[id]);
        }
        return treeList;
    };

    return Tree;
});
define('echarts/util/ecData', [], function () {
    /**
     * ´ò°üË½ÓÐÊý¾Ý
     *
     * @param {shape} shape ÐÞ¸ÄÄ¿±ê
     * @param {Object} series
     * @param {number} seriesIndex
     * @param {number | Object} data
     * @param {number} dataIndex
     * @param {*=} special
     * @param {*=} special2
     */
    function pack(
        shape, series, seriesIndex, data, dataIndex, name, special, special2
    ) {
        var value;
        if (typeof data != 'undefined') {
            value = data.value == null
                ? data
                : data.value;
        }

        shape._echartsData = {
            '_series' : series,
            '_seriesIndex' : seriesIndex,
            '_data' : data,
            '_dataIndex' : dataIndex,
            '_name' : name,
            '_value' : value,
            '_special' : special,
            '_special2' : special2
        };
        return shape._echartsData;
    }

    /**
     * ´ÓË½ÓÐÊý¾ÝÖÐ»ñÈ¡ÌØ¶¨Ïî
     * @param {shape} shape
     * @param {string} key
     */
    function get(shape, key) {
        var data = shape._echartsData;
        if (!key) {
            return data;
        }

        switch (key) {
            case 'series' :
            case 'seriesIndex' :
            case 'data' :
            case 'dataIndex' :
            case 'name' :
            case 'value' :
            case 'special' :
            case 'special2' :
                return data && data['_' + key];
        }

        return null;
    }

    /**
     * ÐÞ¸ÄË½ÓÐÊý¾ÝÖÐ»ñÈ¡ÌØ¶¨Ïî
     * @param {shape} shape
     * @param {string} key
     * @param {*} value
     */
    function set(shape, key, value) {
        shape._echartsData = shape._echartsData || {};
        switch (key) {
            case 'series' :             // µ±Ç°ÏµÁÐÖµ
            case 'seriesIndex' :        // ÏµÁÐÊý×éÎ»ÖÃË÷Òý
            case 'data' :               // µ±Ç°Êý¾ÝÖµ
            case 'dataIndex' :          // Êý¾ÝÊý×éÎ»ÖÃË÷Òý
            case 'name' :
            case 'value' :
            case 'special' :
            case 'special2' :
                shape._echartsData['_' + key] = value;
                break;
        }
    }
    
    /**
     * Ë½ÓÐÊý¾Ý¿ËÂ¡£¬°Ñsource¿½±´µ½targetÉÏ
     * @param {shape} source Ô´
     * @param {shape} target Ä¿±ê
     */
    function clone(source, target) {
        target._echartsData =  {
            '_series' : source._echartsData._series,
            '_seriesIndex' : source._echartsData._seriesIndex,
            '_data' : source._echartsData._data,
            '_dataIndex' : source._echartsData._dataIndex,
            '_name' : source._echartsData._name,
            '_value' : source._echartsData._value,
            '_special' : source._echartsData._special,
            '_special2' : source._echartsData._special2
        };
    }

    return {
        pack : pack,
        set : set,
        get : get,
        clone : clone
    };
});
define('zrender/config', [], function () {
    /**
     * configÄ¬ÈÏÅäÖÃÏî
     * @exports zrender/config
     * @author Kener (@Kener-ÁÖ·å, kener.linfeng@gmail.com)
     */
    var config = {
        /**
         * @namespace module:zrender/config.EVENT
         */
        EVENT : {
            /**
             * ´°¿Ú´óÐ¡±ä»¯
             * @type {string}
             */
            RESIZE : 'resize',
            /**
             * Êó±ê°´Å¥±»£¨ÊÖÖ¸£©°´ÏÂ£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ»ò¿Õ
             * @type {string}
             */
            CLICK : 'click',
            /**
             * Ë«»÷ÊÂ¼þ
             * @type {string}
             */
            DBLCLICK : 'dblclick',
            /**
             * Êó±ê¹öÂÖ±ä»¯£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ»ò¿Õ
             * @type {string}
             */
            MOUSEWHEEL : 'mousewheel',
            /**
             * Êó±ê£¨ÊÖÖ¸£©±»ÒÆ¶¯£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ»ò¿Õ
             * @type {string}
             */
            MOUSEMOVE : 'mousemove',
            /**
             * Êó±êÒÆµ½Ä³Í¼ÐÎÔªËØÖ®ÉÏ£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ
             * @type {string}
             */
            MOUSEOVER : 'mouseover',
            /**
             * Êó±ê´ÓÄ³Í¼ÐÎÔªËØÒÆ¿ª£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ
             * @type {string}
             */
            MOUSEOUT : 'mouseout',
            /**
             * Êó±ê°´Å¥£¨ÊÖÖ¸£©±»°´ÏÂ£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ»ò¿Õ
             * @type {string}
             */
            MOUSEDOWN : 'mousedown',
            /**
             * Êó±ê°´¼ü£¨ÊÖÖ¸£©±»ËÉ¿ª£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ»ò¿Õ
             * @type {string}
             */
            MOUSEUP : 'mouseup',
            /**
             * È«¾ÖÀë¿ª£¬MOUSEOUT´¥·¢±È½ÏÆµ·±£¬Ò»´ÎÀë¿ªÓÅ»¯°ó¶¨
             * @type {string}
             */
            GLOBALOUT : 'globalout',    // 

            // Ò»´Î³É¹¦ÔªËØÍÏ×§µÄÐÐÎªÊÂ¼þ¹ý³ÌÊÇ£º
            // dragstart > dragenter > dragover [> dragleave] > drop > dragend
            /**
             * ¿ªÊ¼ÍÏ×§Ê±´¥·¢£¬ÊÂ¼þ¶ÔÏóÊÇ£º±»ÍÏ×§Í¼ÐÎÔªËØ
             * @type {string}
             */
            DRAGSTART : 'dragstart',
            /**
             * ÍÏ×§Íê±ÏÊ±´¥·¢£¨ÔÚdropÖ®ºó´¥·¢£©£¬ÊÂ¼þ¶ÔÏóÊÇ£º±»ÍÏ×§Í¼ÐÎÔªËØ
             * @type {string}
             */
            DRAGEND : 'dragend',
            /**
             * ÍÏ×§Í¼ÐÎÔªËØ½øÈëÄ¿±êÍ¼ÐÎÔªËØÊ±´¥·¢£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ
             * @type {string}
             */
            DRAGENTER : 'dragenter',
            /**
             * ÍÏ×§Í¼ÐÎÔªËØÔÚÄ¿±êÍ¼ÐÎÔªËØÉÏÒÆ¶¯Ê±´¥·¢£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ
             * @type {string}
             */
            DRAGOVER : 'dragover',
            /**
             * ÍÏ×§Í¼ÐÎÔªËØÀë¿ªÄ¿±êÍ¼ÐÎÔªËØÊ±´¥·¢£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ
             * @type {string}
             */
            DRAGLEAVE : 'dragleave',
            /**
             * ÍÏ×§Í¼ÐÎÔªËØ·ÅÔÚÄ¿±êÍ¼ÐÎÔªËØÄÚÊ±´¥·¢£¬ÊÂ¼þ¶ÔÏóÊÇ£ºÄ¿±êÍ¼ÐÎÔªËØ
             * @type {string}
             */
            DROP : 'drop',
            /**
             * touch end - start < delay is click
             * @type {number}
             */
            touchClickDelay : 300
        },

        elementClassName: 'zr-element',

        // ÊÇ·ñÒì³£²¶»ñ
        catchBrushException: false,

        /**
         * debugÈÕÖ¾Ñ¡Ïî£ºcatchBrushExceptionÎªtrueÏÂÓÐÐ§
         * 0 : ²»Éú³ÉdebugÊý¾Ý£¬·¢²¼ÓÃ
         * 1 : Òì³£Å×³ö£¬µ÷ÊÔÓÃ
         * 2 : ¿ØÖÆÌ¨Êä³ö£¬µ÷ÊÔÓÃ
         */
        debugMode: 0,

        // retina ÆÁÄ»ÓÅ»¯
        devicePixelRatio: Math.max(window.devicePixelRatio || 1, 1)
    };
    return config;
});
define('zrender/tool/util', ['require', '../dep/excanvas'], function (require) {

        var ArrayProto = Array.prototype;
        var nativeForEach = ArrayProto.forEach;
        var nativeMap = ArrayProto.map;
        var nativeFilter = ArrayProto.filter;

        // ÓÃÓÚ´¦ÀímergeÊ±ÎÞ·¨±éÀúDateµÈ¶ÔÏóµÄÎÊÌâ
        var BUILTIN_OBJECT = {
            '[object Function]': 1,
            '[object RegExp]': 1,
            '[object Date]': 1,
            '[object Error]': 1,
            '[object CanvasGradient]': 1
        };

        var objToString = Object.prototype.toString;

        function isDom(obj) {
            return obj && obj.nodeType === 1
                   && typeof(obj.nodeName) == 'string';
        }

        /**
         * ¶ÔÒ»¸öobject½øÐÐÉî¶È¿½±´
         * @memberOf module:zrender/tool/util
         * @param {*} source ÐèÒª½øÐÐ¿½±´µÄ¶ÔÏó
         * @return {*} ¿½±´ºóµÄÐÂ¶ÔÏó
         */
        function clone(source) {
            if (typeof source == 'object' && source !== null) {
                var result = source;
                if (source instanceof Array) {
                    result = [];
                    for (var i = 0, len = source.length; i < len; i++) {
                        result[i] = clone(source[i]);
                    }
                }
                else if (
                    !BUILTIN_OBJECT[objToString.call(source)]
                    // ÊÇ·ñÎª dom ¶ÔÏó
                    && !isDom(source)
                ) {
                    result = {};
                    for (var key in source) {
                        if (source.hasOwnProperty(key)) {
                            result[key] = clone(source[key]);
                        }
                    }
                }

                return result;
            }

            return source;
        }

        function mergeItem(target, source, key, overwrite) {
            if (source.hasOwnProperty(key)) {
                var targetProp = target[key];
                if (typeof targetProp == 'object'
                    && !BUILTIN_OBJECT[objToString.call(targetProp)]
                    // ÊÇ·ñÎª dom ¶ÔÏó
                    && !isDom(targetProp)
                ) {
                    // Èç¹ûÐèÒªµÝ¹é¸²¸Ç£¬¾ÍµÝ¹éµ÷ÓÃmerge
                    merge(
                        target[key],
                        source[key],
                        overwrite
                    );
                }
                else if (overwrite || !(key in target)) {
                    // ·ñÔòÖ»´¦ÀíoverwriteÎªtrue£¬»òÕßÔÚÄ¿±ê¶ÔÏóÖÐÃ»ÓÐ´ËÊôÐÔµÄÇé¿ö
                    target[key] = source[key];
                }
            }
        }

        /**
         * ºÏ²¢Ô´¶ÔÏóµÄÊôÐÔµ½Ä¿±ê¶ÔÏó
         * @memberOf module:zrender/tool/util
         * @param {*} target Ä¿±ê¶ÔÏó
         * @param {*} source Ô´¶ÔÏó
         * @param {boolean} overwrite ÊÇ·ñ¸²¸Ç
         */
        function merge(target, source, overwrite) {
            for (var i in source) {
                mergeItem(target, source, i, overwrite);
            }
            
            return target;
        }

        var _ctx;

        function getContext() {
            if (!_ctx) {
                require('../dep/excanvas');
                /* jshint ignore:start */
                if (window['G_vmlCanvasManager']) {
                    var _div = document.createElement('div');
                    _div.style.position = 'absolute';
                    _div.style.top = '-1000px';
                    document.body.appendChild(_div);

                    _ctx = G_vmlCanvasManager.initElement(_div)
                               .getContext('2d');
                }
                else {
                    _ctx = document.createElement('canvas').getContext('2d');
                }
                /* jshint ignore:end */
            }
            return _ctx;
        }

        /**
         * @memberOf module:zrender/tool/util
         * @param {Array} array
         * @param {*} value
         */
        function indexOf(array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        }

        /**
         * ¹¹ÔìÀà¼Ì³Ð¹ØÏµ
         * @memberOf module:zrender/tool/util
         * @param {Function} clazz Ô´Àà
         * @param {Function} baseClazz »ùÀà
         */
        function inherits(clazz, baseClazz) {
            var clazzPrototype = clazz.prototype;
            function F() {}
            F.prototype = baseClazz.prototype;
            clazz.prototype = new F();

            for (var prop in clazzPrototype) {
                clazz.prototype[prop] = clazzPrototype[prop];
            }
            clazz.constructor = clazz;
        }

        /**
         * Êý×é»ò¶ÔÏó±éÀú
         * @memberOf module:zrender/tool/util
         * @param {Object|Array} obj
         * @param {Function} cb
         * @param {*} [context]
         */
        function each(obj, cb, context) {
            if (!(obj && cb)) {
                return;
            }
            if (obj.forEach && obj.forEach === nativeForEach) {
                obj.forEach(cb, context);
            }
            else if (obj.length === +obj.length) {
                for (var i = 0, len = obj.length; i < len; i++) {
                    cb.call(context, obj[i], i, obj);
                }
            }
            else {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cb.call(context, obj[key], key, obj);
                    }
                }
            }
        }

        /**
         * Êý×éÓ³Éä
         * @memberOf module:zrender/tool/util
         * @param {Array} obj
         * @param {Function} cb
         * @param {*} [context]
         * @return {Array}
         */
        function map(obj, cb, context) {
            if (!(obj && cb)) {
                return;
            }
            if (obj.map && obj.map === nativeMap) {
                return obj.map(cb, context);
            }
            else {
                var result = [];
                for (var i = 0, len = obj.length; i < len; i++) {
                    result.push(cb.call(context, obj[i], i, obj));
                }
                return result;
            }
        }

        /**
         * Êý×é¹ýÂË
         * @memberOf module:zrender/tool/util
         * @param {Array} obj
         * @param {Function} cb
         * @param {*} [context]
         * @return {Array}
         */
        function filter(obj, cb, context) {
            if (!(obj && cb)) {
                return;
            }
            if (obj.filter && obj.filter === nativeFilter) {
                return obj.filter(cb, context);
            }
            else {
                var result = [];
                for (var i = 0, len = obj.length; i < len; i++) {
                    if (cb.call(context, obj[i], i, obj)) {
                        result.push(obj[i]);
                    }
                }
                return result;
            }
        }

        function bind(func, context) {
            
            return function () {
                func.apply(context, arguments);
            }
        }

        return {
            inherits: inherits,
            clone: clone,
            merge: merge,
            getContext: getContext,
            indexOf: indexOf,
            each: each,
            map: map,
            filter: filter,
            bind: bind
        };
    });
define('echarts/chart', [], function (/*require*/) {     //chart
    var self = {};

    var _chartLibrary = {};         //echartÍ¼±í¿â

    /**
     * ¶¨ÒåÍ¼ÐÎÊµÏÖ
     * @param {Object} name
     * @param {Object} clazz Í¼ÐÎÊµÏÖ
     */
    self.define = function (name, clazz) {
        _chartLibrary[name] = clazz;
        return self;
    };

    /**
     * »ñÈ¡Í¼ÐÎÊµÏÖ
     * @param {Object} name
     */
    self.get = function (name) {
        return _chartLibrary[name];
    };

    return self;
});
define('echarts/config', [], function () {
    // ÇëÔ­ÁÂÎÒÕâÑùÐ´£¬ÕâÏÔÈ»¿ÉÒÔÖ±½Ó·µ»Ø¸ö¶ÔÏó£¬µ«ÄÇÑùµÄ»°outline¾ÍÏÔÊ¾²»³öÀ´ÁË~~
    var config = {
        // Í¼±íÀàÐÍ
        CHART_TYPE_LINE: 'line',
        CHART_TYPE_BAR: 'bar',
        CHART_TYPE_SCATTER: 'scatter',
        CHART_TYPE_PIE: 'pie',
        CHART_TYPE_RADAR: 'radar',
        CHART_TYPE_VENN: 'venn',
        CHART_TYPE_TREEMAP: 'treemap',
        CHART_TYPE_TREE: 'tree',
        CHART_TYPE_MAP: 'map',
        CHART_TYPE_K: 'k',
        CHART_TYPE_ISLAND: 'island',
        CHART_TYPE_FORCE: 'force',
        CHART_TYPE_CHORD: 'chord',
        CHART_TYPE_GAUGE: 'gauge',
        CHART_TYPE_FUNNEL: 'funnel',
        CHART_TYPE_EVENTRIVER: 'eventRiver',
        CHART_TYPE_WORDCLOUD: 'wordCloud',
        CHART_TYPE_HEATMAP: 'heatmap',

        // ×é¼þÀàÐÍ
        COMPONENT_TYPE_TITLE: 'title',
        COMPONENT_TYPE_LEGEND: 'legend',
        COMPONENT_TYPE_DATARANGE: 'dataRange',
        COMPONENT_TYPE_DATAVIEW: 'dataView',
        COMPONENT_TYPE_DATAZOOM: 'dataZoom',
        COMPONENT_TYPE_TOOLBOX: 'toolbox',
        COMPONENT_TYPE_TOOLTIP: 'tooltip',
        COMPONENT_TYPE_GRID: 'grid',
        COMPONENT_TYPE_AXIS: 'axis',
        COMPONENT_TYPE_POLAR: 'polar',
        COMPONENT_TYPE_X_AXIS: 'xAxis',
        COMPONENT_TYPE_Y_AXIS: 'yAxis',
        COMPONENT_TYPE_AXIS_CATEGORY: 'categoryAxis',
        COMPONENT_TYPE_AXIS_VALUE: 'valueAxis',
        COMPONENT_TYPE_TIMELINE: 'timeline',
        COMPONENT_TYPE_ROAMCONTROLLER: 'roamController',

        // È«Í¼Ä¬ÈÏ±³¾°
        backgroundColor: 'rgba(0,0,0,0)',
        
        // Ä¬ÈÏÉ«°å
        color: ['#ff7f50','#87cefa','#da70d6','#32cd32','#6495ed',
                '#ff69b4','#ba55d3','#cd5c5c','#ffa500','#40e0d0',
                '#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700',
                '#6699FF','#ff6666','#3cb371','#b8860b','#30e0e0'],

        markPoint: {
            clickable: true,
            symbol: 'pin',         // ±ê×¢ÀàÐÍ
            symbolSize: 10,        // ±ê×¢´óÐ¡£¬°ë¿í£¨°ë¾¶£©²ÎÊý£¬µ±Í¼ÐÎÎª·½Ïò»òÁâÐÎÔò×Ü¿í¶ÈÎªsymbolSize * 2
            // symbolRotate: null, // ±ê×¢Ðý×ª¿ØÖÆ
            large: false,
            effect: {
                show: false,
                loop: true,
                period: 15,             // ÔË¶¯ÖÜÆÚ£¬ÎÞµ¥Î»£¬ÖµÔ½´óÔ½Âý
                type: 'scale',          // ¿ÉÓÃÎª scale | bounce
                scaleSize: 2,           // ·Å´ó±¶Êý£¬ÒÔmarkPointµãsizeÎª»ù×¼
                bounceDistance: 10     // Ìø¶¯¾àÀë£¬µ¥Î»px
                // color: 'gold',
                // shadowColor: 'rgba(255,215,0,0.8)',
                // shadowBlur: 0          // ìÅ¹âÄ£ºý
            },
            itemStyle: {
                normal: {
                    // color: ¸÷Òì£¬
                    // borderColor: ¸÷Òì,        // ±ê×¢±ßÏßÑÕÉ«£¬ÓÅÏÈÓÚcolor 
                    borderWidth: 2,             // ±ê×¢±ßÏßÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª1
                    label: {
                        show: true,
                        // ±êÇ©ÎÄ±¾¸ñÊ½Æ÷£¬Í¬Tooltip.formatter£¬²»Ö§³Ö»Øµ÷
                        // formatter: null,
                        position: 'inside'      // ¿ÉÑ¡Îª'left'|'right'|'top'|'bottom'
                        // textStyle: null      // Ä¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                    }
                },
                emphasis: {
                    // color: ¸÷Òì
                    label: {
                        show: true
                        // ±êÇ©ÎÄ±¾¸ñÊ½Æ÷£¬Í¬Tooltip.formatter£¬²»Ö§³Ö»Øµ÷
                        // formatter: null,
                        // position: 'inside'  // 'left'|'right'|'top'|'bottom'
                        // textStyle: null     // Ä¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                    }
                }
            }
        },
        
        markLine: {
            clickable: true,
            // ±êÏßÆðÊ¼ºÍ½áÊøµÄsymbol½éÉÜÀàÐÍ£¬Èç¹û¶¼Ò»Ñù£¬¿ÉÒÔÖ±½Ó´«string
            symbol: ['circle', 'arrow'],
            // ±êÏßÆðÊ¼ºÍ½áÊøµÄsymbol´óÐ¡£¬°ë¿í£¨°ë¾¶£©²ÎÊý£¬µ±Í¼ÐÎÎª·½Ïò»òÁâÐÎÔò×Ü¿í¶ÈÎªsymbolSize * 2
            symbolSize: [2, 4],
            // ±êÏßÆðÊ¼ºÍ½áÊøµÄsymbolÐý×ª¿ØÖÆ
            //symbolRotate: null,
            //smooth: false,
            smoothness: 0.2,    // Æ½»¬¶È
            precision: 2,
            effect: {
                show: false,
                loop: true,
                period: 15,                     // ÔË¶¯ÖÜÆÚ£¬ÎÞµ¥Î»£¬ÖµÔ½´óÔ½Âý
                scaleSize: 2                    // ·Å´ó±¶Êý£¬ÒÔmarkLineÏßlineWidthÎª»ù×¼
                // color: 'gold',
                // shadowColor: 'rgba(255,215,0,0.8)',
                // shadowBlur: lineWidth * 2    // ìÅ¹âÄ£ºý£¬Ä¬ÈÏµÈÓÚscaleSize¼ÆËãËùµÃ
            },
            // ±ßÀ¦°ó
            bundling: {
                enable: false,
                // [0, 90]
                maxTurningAngle: 45
            },
            itemStyle: {
                normal: {
                    // color: ¸÷Òì,               // ±êÏßÖ÷É«£¬ÏßÉ«£¬symbolÖ÷É«
                    // borderColor: Ëæcolor,     // ±êÏßsymbol±ß¿òÑÕÉ«£¬ÓÅÏÈÓÚcolor 
                    borderWidth: 1.5,           // ±êÏßsymbol±ß¿òÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª2
                    label: {
                        show: true,
                        // ±êÇ©ÎÄ±¾¸ñÊ½Æ÷£¬Í¬Tooltip.formatter£¬²»Ö§³Ö»Øµ÷
                        // formatter: null,
                        // ¿ÉÑ¡Îª 'start'|'end'|'left'|'right'|'top'|'bottom'
                        position: 'end'
                        // textStyle: null      // Ä¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                    },
                    lineStyle: {
                        // color: ËæborderColor, // Ö÷É«£¬ÏßÉ«£¬ÓÅÏÈ¼¶¸ßÓÚborderColorºÍcolor
                        // width: ËæborderWidth, // ÓÅÏÈÓÚborderWidth
                        type: 'dashed'
                        // shadowColor: 'rgba(0,0,0,0)', //Ä¬ÈÏÍ¸Ã÷
                        // shadowBlur: 0,
                        // shadowOffsetX: 0,
                        // shadowOffsetY: 0
                    }
                },
                emphasis: {
                    // color: ¸÷Òì
                    label: {
                        show: false
                        // ±êÇ©ÎÄ±¾¸ñÊ½Æ÷£¬Í¬Tooltip.formatter£¬²»Ö§³Ö»Øµ÷
                        // formatter: null,
                        // position: 'inside' // 'left'|'right'|'top'|'bottom'
                        // textStyle: null    // Ä¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                    },
                    lineStyle: {}
                }
            }
        },

        // Ö÷Ìâ£¬Ö÷Ìâ
        textStyle: {
            decoration: 'none',
            fontFamily: 'Arial, Verdana, sans-serif',
            fontFamily2: 'Î¢ÈíÑÅºÚ',    // IE8- ×ÖÌåÄ£ºý²¢ÇÒ£¬²»Ö§³Ö²»Í¬×ÖÌå»ìÅÅ£¬¶îÍâÖ¸¶¨Ò»·Ý
            fontSize: 12,
            fontStyle: 'normal',
            fontWeight: 'normal'
        },

        EVENT: {
            // -------È«¾ÖÍ¨ÓÃ
            REFRESH: 'refresh',
            RESTORE: 'restore',
            RESIZE: 'resize',
            CLICK: 'click',
            DBLCLICK: 'dblclick',
            HOVER: 'hover',
            MOUSEOUT: 'mouseout',
            //MOUSEWHEEL: 'mousewheel',
            // -------ÒµÎñ½»»¥Âß¼­
            DATA_CHANGED: 'dataChanged',
            DATA_ZOOM: 'dataZoom',
            DATA_RANGE: 'dataRange',
            DATA_RANGE_SELECTED: 'dataRangeSelected',
            DATA_RANGE_HOVERLINK: 'dataRangeHoverLink',
            LEGEND_SELECTED: 'legendSelected',
            LEGEND_HOVERLINK: 'legendHoverLink',
            MAP_SELECTED: 'mapSelected',
            PIE_SELECTED: 'pieSelected',
            MAGIC_TYPE_CHANGED: 'magicTypeChanged',
            DATA_VIEW_CHANGED: 'dataViewChanged',
            TIMELINE_CHANGED: 'timelineChanged',
            MAP_ROAM: 'mapRoam',
            FORCE_LAYOUT_END: 'forceLayoutEnd',
            // -------ÄÚ²¿Í¨ÐÅ
            TOOLTIP_HOVER: 'tooltipHover',
            TOOLTIP_IN_GRID: 'tooltipInGrid',
            TOOLTIP_OUT_GRID: 'tooltipOutGrid',
            ROAMCONTROLLER: 'roamController'
        },
        DRAG_ENABLE_TIME: 120,   // ½µµÍÍ¼±íÄÚÔªËØÍÏ×§Ãô¸Ð¶È£¬µ¥Î»ms£¬²»½¨ÒéÍâ²¿¸ÉÔ¤
        EFFECT_ZLEVEL : 10,       // ÌØÐ§¶¯»­zlevel
        effectBlendAlpha: 0.95,
        // Ö÷Ìâ£¬Ä¬ÈÏ±êÖ¾Í¼ÐÎÀàÐÍÁÐ±í
        symbolList: [
          'circle', 'rectangle', 'triangle', 'diamond',
          'emptyCircle', 'emptyRectangle', 'emptyTriangle', 'emptyDiamond'
        ],
        loadingEffect: 'spin',
        loadingText: 'Êý¾Ý¶ÁÈ¡ÖÐ...',
        noDataEffect: 'bubble',
        noDataText: 'ÔÝÎÞÊý¾Ý',
        // noDataLoadingOption: null,
        // ¿É¼ÆËãÌØÐÔÅäÖÃ£¬¹Âµº£¬ÌáÊ¾ÑÕÉ«
        calculable: false,                      // Ä¬ÈÏ¹Ø±Õ¿É¼ÆËãÌØÐÔ
        calculableColor: 'rgba(255,165,0,0.6)', // ÍÏ×§ÌáÊ¾±ß¿òÑÕÉ«
        calculableHolderColor: '#ccc',          // ¿É¼ÆËãÕ¼Î»ÌáÊ¾ÑÕÉ«
        nameConnector: ' & ',
        valueConnector: ': ',
        animation: true,                // ¹ý¶É¶¯»­ÊÇ·ñ¿ªÆô
        addDataAnimation: true,         // ¶¯Ì¬Êý¾Ý½Ó¿ÚÊÇ·ñ¿ªÆô¶¯»­Ð§¹û
        animationThreshold: 2000,       // ¶¯»­ÔªËØ·§Öµ£¬²úÉúµÄÍ¼ÐÎÔ­ËØ³¬¹ý2000²»³ö¶¯»­
        animationDuration: 2000,        // ¹ý¶É¶¯»­²ÎÊý£º½øÈë
        animationDurationUpdate: 500,   // ¹ý¶É¶¯»­²ÎÊý£º¸üÐÂ
        animationEasing: 'ExponentialOut'    //BounceOut
    };

    return config;
});
define('zrender/tool/event', ['require', '../mixin/Eventful'], function (require) {

        'use strict';

        var Eventful = require('../mixin/Eventful');

        /**
        * ÌáÈ¡Êó±ê£¨ÊÖÖ¸£©x×ø±ê
        * @memberOf module:zrender/tool/event
        * @param  {Event} e ÊÂ¼þ.
        * @return {number} Êó±ê£¨ÊÖÖ¸£©x×ø±ê.
        */
        function getX(e) {
            return typeof e.zrenderX != 'undefined' && e.zrenderX
                   || typeof e.offsetX != 'undefined' && e.offsetX
                   || typeof e.layerX != 'undefined' && e.layerX
                   || typeof e.clientX != 'undefined' && e.clientX;
        }

        /**
        * ÌáÈ¡Êó±êy×ø±ê
        * @memberOf module:zrender/tool/event
        * @param  {Event} e ÊÂ¼þ.
        * @return {number} Êó±ê£¨ÊÖÖ¸£©y×ø±ê.
        */
        function getY(e) {
            return typeof e.zrenderY != 'undefined' && e.zrenderY
                   || typeof e.offsetY != 'undefined' && e.offsetY
                   || typeof e.layerY != 'undefined' && e.layerY
                   || typeof e.clientY != 'undefined' && e.clientY;
        }

        /**
        * ÌáÈ¡Êó±ê¹öÂÖ±ä»¯
        * @memberOf module:zrender/tool/event
        * @param  {Event} e ÊÂ¼þ.
        * @return {number} ¹öÂÖ±ä»¯£¬ÕýÖµËµÃ÷¹öÂÖÊÇÏòÉÏ¹ö¶¯£¬Èç¹ûÊÇ¸ºÖµËµÃ÷¹öÂÖÊÇÏòÏÂ¹ö¶¯
        */
        function getDelta(e) {
            return typeof e.zrenderDelta != 'undefined' && e.zrenderDelta
                   || typeof e.wheelDelta != 'undefined' && e.wheelDelta
                   || typeof e.detail != 'undefined' && -e.detail;
        }

        /**
         * Í£Ö¹Ã°ÅÝºÍ×èÖ¹Ä¬ÈÏÐÐÎª
         * @memberOf module:zrender/tool/event
         * @method
         * @param {Event} e : event¶ÔÏó
         */
        var stop = typeof window.addEventListener === 'function'
            ? function (e) {
                e.preventDefault();
                e.stopPropagation();
                e.cancelBubble = true;
            }
            : function (e) {
                e.returnValue = false;
                e.cancelBubble = true;
            };
        
        return {
            getX : getX,
            getY : getY,
            getDelta : getDelta,
            stop : stop,
            // ×öÏòÉÏ¼æÈÝ
            Dispatcher : Eventful
        };
    });
define('echarts/util/shape/MarkLine', ['require', 'zrender/shape/Base', './Icon', 'zrender/shape/Line', 'zrender/shape/BezierCurve', 'zrender/tool/area', 'zrender/shape/util/dashedLineTo', 'zrender/tool/util', 'zrender/tool/curve'], function (require) {
    var Base = require('zrender/shape/Base');
    var IconShape = require('./Icon');
    var LineShape = require('zrender/shape/Line');
    var lineInstance = new LineShape({});
    var CurveShape = require('zrender/shape/BezierCurve');
    var curveInstance = new CurveShape({});

    var area = require('zrender/tool/area');
    var dashedLineTo = require('zrender/shape/util/dashedLineTo');
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');

    function MarkLine(options) {
        Base.call(this, options);

        if (this.style.curveness > 0) {
            this.updatePoints(this.style);
        }
        if (this.highlightStyle.curveness > 0) {
            this.updatePoints(this.highlightStyle);
        }
    }

    MarkLine.prototype =  {
        type : 'mark-line',
        /**
         * »­Ë¢
         * @param ctx »­²¼¾ä±ú
         * @param isHighlight   ÊÇ·ñÎª¸ßÁÁ×´Ì¬
         * @param updateCallback ÈÃpainter¸üÐÂÊÓÍ¼£¬base.brushÃ»ÓÃ£¬ÐèÒªµÄ»°ÖØÔØbrush
         */
        brush : function (ctx, isHighlight) {
            var style = this.style;

            if (isHighlight) {
                // ¸ù¾ÝstyleÀ©Õ¹Ä¬ÈÏ¸ßÁÁÑùÊ½
                style = this.getHighlightStyle(
                    style,
                    this.highlightStyle || {}
                );
            }

            ctx.save();
            this.setContext(ctx, style);

            // ÉèÖÃtransform
            this.setTransform(ctx);

            ctx.save();
            ctx.beginPath();
            this.buildPath(ctx, style);
            ctx.stroke();
            ctx.restore();

            this.brushSymbol(ctx, style, 0);
            this.brushSymbol(ctx, style, 1);

            this.drawText(ctx, style, this.style);

            ctx.restore();
        },

        /**
         * ´´½¨ÏßÌõÂ·¾¶
         * @param {Context2D} ctx Canvas 2DÉÏÏÂÎÄ
         * @param {Object} style ÑùÊ½
         */
        buildPath : function (ctx, style) {
            var lineType = style.lineType || 'solid';

            ctx.moveTo(style.xStart, style.yStart);
            if (style.curveness > 0) {
                // FIXME Bezier ÔÚÉÙ²¿·Öä¯ÀÀÆ÷ÉÏÔÝÊ±²»Ö§³ÖÐéÏß
                var lineDash = null;
                switch (lineType) {
                    case 'dashed':
                        lineDash = [5, 5];
                        break;
                    case'dotted':
                        lineDash = [1, 1];
                        break;
                }
                if (lineDash && ctx.setLineDash) {
                    ctx.setLineDash(lineDash);
                }
                
                ctx.quadraticCurveTo(
                    style.cpX1, style.cpY1, style.xEnd, style.yEnd
                );
            }
            else {
                if (lineType == 'solid') {
                    ctx.lineTo(style.xEnd, style.yEnd);
                }
                else {
                    var dashLength = (style.lineWidth || 1) 
                        * (style.lineType == 'dashed' ? 5 : 1);
                    dashedLineTo(
                        ctx, style.xStart, style.yStart,
                        style.xEnd, style.yEnd, dashLength
                    );
                }
            }
        },

        /**
         * Update cpX1 and cpY1 according to curveniss
         * @param  {Object} style
         */
        updatePoints: function (style) {
            var curveness = style.curveness || 0;
            var inv = 1;

            var x0 = style.xStart;
            var y0 = style.yStart;
            var x2 = style.xEnd;
            var y2 = style.yEnd;
            var x1 = (x0 + x2) / 2 - inv * (y0 - y2) * curveness;
            var y1 =(y0 + y2) / 2 - inv * (x2 - x0) * curveness;

            style.cpX1 = x1;
            style.cpY1 = y1;
        },

        /**
         * ±êÏßÊ¼Ä©±ê×¢
         */
        brushSymbol : function (ctx, style, idx) {
            if (style.symbol[idx] == 'none') {
                return;
            }
            ctx.save();
            ctx.beginPath();

            ctx.lineWidth = style.symbolBorder;
            ctx.strokeStyle = style.symbolBorderColor;
            // symbol
            var symbol = style.symbol[idx].replace('empty', '')
                                              .toLowerCase();
            if (style.symbol[idx].match('empty')) {
                ctx.fillStyle = '#fff'; //'rgba(0, 0, 0, 0)';
            }

            // symbolRotate
            var x0 = style.xStart;
            var y0 = style.yStart;
            var x2 = style.xEnd;
            var y2 = style.yEnd;
            var x = idx === 0 ? x0 : x2;
            var y = idx === 0 ? y0 : y2;
            var curveness = style.curveness || 0;
            var rotate = style.symbolRotate[idx] != null ? (style.symbolRotate[idx] - 0) : 0;
            rotate = rotate / 180 * Math.PI;

            if (symbol == 'arrow' && rotate === 0) {
                if (curveness === 0) {
                    var sign = idx === 0 ? -1 : 1; 
                    rotate = Math.PI / 2 + Math.atan2(
                        sign * (y2 - y0), sign * (x2 - x0)
                    );
                }
                else {
                    var x1 = style.cpX1;
                    var y1 = style.cpY1;

                    var quadraticDerivativeAt = curveTool.quadraticDerivativeAt;
                    var dx = quadraticDerivativeAt(x0, x1, x2, idx);
                    var dy = quadraticDerivativeAt(y0, y1, y2, idx);

                    rotate = Math.PI / 2 + Math.atan2(dy, dx);
                }
            }
            
            ctx.translate(x, y);

            if (rotate !== 0) {
                ctx.rotate(rotate);
            }

            // symbolSize
            var symbolSize = style.symbolSize[idx];
            IconShape.prototype.buildPath(ctx, {
                x: -symbolSize,
                y: -symbolSize,
                width: symbolSize * 2,
                height: symbolSize * 2,
                iconType: symbol
            });

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        },

        /**
         * ·µ»Ø¾ØÐÎÇøÓò£¬ÓÃÓÚ¾Ö²¿Ë¢ÐÂºÍÎÄ×Ö¶¨Î»
         * @param {Object} style
         */
        getRect : function (style) {
            style.curveness > 0 ? curveInstance.getRect(style)
                : lineInstance.getRect(style);
            return style.__rect;
        },

        isCover : function (x, y) {
            var originPos = this.transformCoordToLocal(x, y);
            x = originPos[0];
            y = originPos[1];

            // ¿ìËÙÔ¤ÅÐ²¢±£ÁôÅÐ¶Ï¾ØÐÎ
            if (this.isCoverRect(x, y)) {
                // ¾ØÐÎÄÚ
                return this.style.curveness > 0
                       ? area.isInside(curveInstance, this.style, x, y)
                       : area.isInside(lineInstance, this.style, x, y);
            }

            return false;
        }
    };

    zrUtil.inherits(MarkLine, Base);

    return MarkLine;
});
define('zrender/shape/Polyline', ['require', './Base', './util/smoothSpline', './util/smoothBezier', './util/dashedLineTo', './Polygon', '../tool/util'], function (require) {
        var Base = require('./Base');
        var smoothSpline = require('./util/smoothSpline');
        var smoothBezier = require('./util/smoothBezier');
        var dashedLineTo = require('./util/dashedLineTo');

        /**
         * @alias module:zrender/shape/Polyline
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Polyline = function(options) {
            this.brushTypeOnly = 'stroke';  // ÏßÌõÖ»ÄÜÃè±ß£¬Ìî³äºó¹û×Ô¸º
            this.textPosition = 'end';
            Base.call(this, options);
            /**
             * ±´Èü¶ûÇúÏß»æÖÆÑùÊ½
             * @name module:zrender/shape/Polyline#style
             * @type {module:zrender/shape/Polyline~IPolylineStyle}
             */
            /**
             * ±´Èü¶ûÇúÏß¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Polyline#highlightStyle
             * @type {module:zrender/shape/Polyline~IPolylineStyle}
             */
        };

        Polyline.prototype =  {
            type: 'polyline',

            /**
             * ´´½¨¶à±ßÐÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Polyline~IPolylineStyle} style
             */
            buildPath : function(ctx, style) {
                var pointList = style.pointList;
                if (pointList.length < 2) {
                    // ÉÙÓÚ2¸öµã¾Í²»»­ÁË~
                    return;
                }
                
                var len = Math.min(
                    style.pointList.length, 
                    Math.round(style.pointListLength || style.pointList.length)
                );
                
                if (style.smooth && style.smooth !== 'spline') {
                    if (! style.controlPointList) {
                        this.updateControlPoints(style);
                    }
                    var controlPointList = style.controlPointList;

                    ctx.moveTo(pointList[0][0], pointList[0][1]);
                    var cp1;
                    var cp2;
                    var p;
                    for (var i = 0; i < len - 1; i++) {
                        cp1 = controlPointList[i * 2];
                        cp2 = controlPointList[i * 2 + 1];
                        p = pointList[i + 1];
                        ctx.bezierCurveTo(
                            cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]
                        );
                    }
                }
                else {
                    if (style.smooth === 'spline') {
                        pointList = smoothSpline(pointList);
                        len = pointList.length;
                    }
                    if (!style.lineType || style.lineType == 'solid') {
                        // Ä¬ÈÏÎªÊµÏß
                        ctx.moveTo(pointList[0][0], pointList[0][1]);
                        for (var i = 1; i < len; i++) {
                            ctx.lineTo(pointList[i][0], pointList[i][1]);
                        }
                    }
                    else if (style.lineType == 'dashed'
                            || style.lineType == 'dotted'
                    ) {
                        var dashLength = (style.lineWidth || 1) 
                                         * (style.lineType == 'dashed' ? 5 : 1);
                        ctx.moveTo(pointList[0][0], pointList[0][1]);
                        for (var i = 1; i < len; i++) {
                            dashedLineTo(
                                ctx,
                                pointList[i - 1][0], pointList[i - 1][1],
                                pointList[i][0], pointList[i][1],
                                dashLength
                            );
                        }
                    }
                }
                return;
            },

            updateControlPoints: function (style) {
                style.controlPointList = smoothBezier(
                    style.pointList, style.smooth, false, style.smoothConstraint
                );
            },

            /**
             * ¼ÆËã·µ»ØÕÛÏß°üÎ§ºÐ¾ØÐÎ¡£
             * @param {IZRenderBezierCurveStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                return require('./Polygon').prototype.getRect(style);
            }
        };

        require('../tool/util').inherits(Polyline, Base);
        return Polyline;
    });
define('echarts/util/shape/Symbol', ['require', 'zrender/shape/Base', 'zrender/shape/Polygon', 'zrender/tool/util', './normalIsCover'], function (require) {
    var Base = require('zrender/shape/Base');
    var PolygonShape = require('zrender/shape/Polygon');
    var polygonInstance = new PolygonShape({});
    var zrUtil = require('zrender/tool/util');

    function Symbol(options) {
        Base.call(this, options);
    }

    Symbol.prototype =  {
        type : 'symbol',
        /**
         * ´´½¨¾ØÐÎÂ·¾¶
         * @param {Context2D} ctx Canvas 2DÉÏÏÂÎÄ
         * @param {Object} style ÑùÊ½
         */
        buildPath : function (ctx, style) {
            var pointList = style.pointList;
            var len = pointList.length;
            if (len === 0) {
                return;
            }

            var subSize = 10000;
            var subSetLength = Math.ceil(len / subSize);
            var sub;
            var subLen;
            var isArray = pointList[0] instanceof Array;
            var size = style.size ? style.size : 2;
            var curSize = size;
            var halfSize = size / 2;
            var PI2 = Math.PI * 2;
            var percent;
            var x;
            var y;
            for (var j = 0; j < subSetLength; j++) {
                ctx.beginPath();
                sub = j * subSize;
                subLen = sub + subSize;
                subLen = subLen > len ? len : subLen;
                for (var i = sub; i < subLen; i++) {
                    if (style.random) {
                        percent = style['randomMap' + (i % 20)] / 100;
                        curSize = size * percent * percent;
                        halfSize = curSize / 2;
                    }
                    if (isArray) {
                        x = pointList[i][0];
                        y = pointList[i][1];
                    }
                    else {
                        x = pointList[i].x;
                        y = pointList[i].y;
                    }
                    if (curSize < 3) {
                        // Ð¡ÓÚ3ÏñËØÊÓ¾õÎó²î
                        ctx.rect(x - halfSize, y - halfSize, curSize, curSize);
                    }
                    else {
                        // ´óÓÚ3ÏñËØ²Å¿¼ÂÇÍ¼ÐÎ
                        switch (style.iconType) {
                            case 'circle' :
                                ctx.moveTo(x, y);
                                ctx.arc(x, y, halfSize, 0, PI2, true);
                                break;
                            case 'diamond' :
                                ctx.moveTo(x, y - halfSize);
                                ctx.lineTo(x + halfSize / 3, y - halfSize / 3);
                                ctx.lineTo(x + halfSize, y);
                                ctx.lineTo(x + halfSize / 3, y + halfSize / 3);
                                ctx.lineTo(x, y + halfSize);
                                ctx.lineTo(x - halfSize / 3, y + halfSize / 3);
                                ctx.lineTo(x - halfSize, y);
                                ctx.lineTo(x - halfSize / 3, y - halfSize / 3);
                                ctx.lineTo(x, y - halfSize);
                                break;
                            default :
                                ctx.rect(x - halfSize, y - halfSize, curSize, curSize);
                        }
                    }
                }
                ctx.closePath();
                if (j < (subSetLength - 1)) {
                    switch (style.brushType) {
                        case 'both':
                            ctx.fill();
                            style.lineWidth > 0 && ctx.stroke();  // js hint -_-"
                            break;
                        case 'stroke':
                            style.lineWidth > 0 && ctx.stroke();
                            break;
                        default:
                            ctx.fill();
                    }
                }
            }
        },

        /* ÏñËØÄ£Ê½
        buildPath : function (ctx, style) {
            var pointList = style.pointList;
            var rect = this.getRect(style);
            var ratio = window.devicePixelRatio || 1;
            // console.log(rect)
            // var ti = new Date();
            // bboxÈ¡Õû
            rect = {
                x : Math.floor(rect.x),
                y : Math.floor(rect.y),
                width : Math.floor(rect.width),
                height : Math.floor(rect.height)
            };
            var pixels = ctx.getImageData(
                rect.x * ratio, rect.y * ratio,
                rect.width * ratio, rect.height * ratio
            );
            var data = pixels.data;
            var idx;
            var zrColor = require('zrender/tool/color');
            var color = zrColor.toArray(style.color);
            var r = color[0];
            var g = color[1];
            var b = color[2];
            var width = rect.width;

            for (var i = 1, l = pointList.length; i < l; i++) {
                idx = ((Math.floor(pointList[i][0]) - rect.x) * ratio
                       + (Math.floor(pointList[i][1])- rect.y) * width * ratio * ratio
                      ) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = 255;
            }
            ctx.putImageData(pixels, rect.x * ratio, rect.y * ratio);
            // console.log(new Date() - ti);
            return;
        },
        */

        /**
         * ·µ»Ø¾ØÐÎÇøÓò£¬ÓÃÓÚ¾Ö²¿Ë¢ÐÂºÍÎÄ×Ö¶¨Î»
         * @param {Object} style
         */
        getRect : function (style) {
            return style.__rect || polygonInstance.getRect(style);
        },

        isCover : require('./normalIsCover')
    };

    zrUtil.inherits(Symbol, Base);

    return Symbol;
});
define('zrender/shape/ShapeBundle', ['require', './Base', '../tool/util'], function (require) {

    var Base = require('./Base');

    var ShapeBundle = function (options) {
        Base.call(this, options);
        /**
         * ShapeBundle»æÖÆÑùÊ½
         * @name module:zrender/shape/ShapeBundle#style
         * @type {module:zrender/shape/ShapeBundle~IShapeBundleStyle}
         */
        /**
         * ShapeBundle¸ßÁÁ»æÖÆÑùÊ½
         * @name module:zrender/shape/ShapeBundle#highlightStyle
         * @type {module:zrender/shape/ShapeBundle~IShapeBundleStyle}
         */
    };

    ShapeBundle.prototype = {

        constructor: ShapeBundle,

        type: 'shape-bundle',

        brush: function (ctx, isHighlight) {
            var style = this.beforeBrush(ctx, isHighlight);

            ctx.beginPath();
            for (var i = 0; i < style.shapeList.length; i++) {
                var subShape = style.shapeList[i];
                var subShapeStyle = subShape.style;
                if (isHighlight) {
                    subShapeStyle = subShape.getHighlightStyle(
                        subShapeStyle,
                        subShape.highlightStyle || {},
                        subShape.brushTypeOnly
                    );
                }
                subShape.buildPath(ctx, subShapeStyle);
            }
            switch (style.brushType) {
                /* jshint ignore:start */
                case 'both':
                    ctx.fill();
                case 'stroke':
                    style.lineWidth > 0 && ctx.stroke();
                    break;
                /* jshint ignore:end */
                default:
                    ctx.fill();
            }

            this.drawText(ctx, style, this.style);

            this.afterBrush(ctx);
        },

        /**
         * ¼ÆËã·µ»Ø¶à±ßÐÎ°üÎ§ºÐ¾ØÕó
         * @param {module:zrender/shape/Polygon~IShapeBundleStyle} style
         * @return {module:zrender/shape/Base~IBoundingRect}
         */
        getRect: function (style) {
            if (style.__rect) {
                return style.__rect;
            }
            var minX = Infinity;
            var maxX = -Infinity;
            var minY = Infinity;
            var maxY = -Infinity;
            for (var i = 0; i < style.shapeList.length; i++) {
                var subShape = style.shapeList[i];
                // TODO Highlight style ?
                var subRect = subShape.getRect(subShape.style);

                var minX = Math.min(subRect.x, minX);
                var minY = Math.min(subRect.y, minY);
                var maxX = Math.max(subRect.x + subRect.width, maxX);
                var maxY = Math.max(subRect.y + subRect.height, maxY);
            }

            style.__rect = {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };

            return style.__rect;
        },

        isCover: function (x, y) {
            var originPos = this.transformCoordToLocal(x, y);
            x = originPos[0];
            y = originPos[1];
            
            if (this.isCoverRect(x, y)) {
                for (var i = 0; i < this.style.shapeList.length; i++) {
                    var subShape = this.style.shapeList[i];
                    if (subShape.isCover(x, y)) {
                        return true;
                    }
                }
            }

            return false;
        }
    };

    require('../tool/util').inherits(ShapeBundle, Base);
    return ShapeBundle;
});
define('echarts/util/ecAnimation', ['require', 'zrender/tool/util', 'zrender/tool/curve', 'zrender/shape/Polygon'], function (require) {
    var zrUtil = require('zrender/tool/util');
    var curveTool = require('zrender/tool/curve');
    
    /**
     * ÕÛÏßÐÍ¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function pointList(zr, oldShape, newShape, duration, easing) {
        var newPointList = newShape.style.pointList;
        var newPointListLen = newPointList.length;
        var oldPointList;

        if (!oldShape) {        // add
            oldPointList = [];
            if (newShape._orient != 'vertical') {
                var y = newPointList[0][1];
                for (var i = 0; i < newPointListLen; i++) {
                    oldPointList[i] = [newPointList[i][0], y];
                }
            }
            else {
                var x = newPointList[0][0];
                for (var i = 0; i < newPointListLen; i++) {
                    oldPointList[i] = [x, newPointList[i][1]];
                }
            }

            if (newShape.type == 'half-smooth-polygon') {
                oldPointList[newPointListLen - 1] = zrUtil.clone(newPointList[newPointListLen - 1]);
                oldPointList[newPointListLen - 2] = zrUtil.clone(newPointList[newPointListLen - 2]);
            }
            oldShape = {style : {pointList : oldPointList}};
        }
        
        oldPointList = oldShape.style.pointList;
        var oldPointListLen = oldPointList.length;
        if (oldPointListLen == newPointListLen) {
            newShape.style.pointList = oldPointList;
        }
        else if (oldPointListLen < newPointListLen) {
            // Ô­À´¶Ì£¬ÐÂµÄ³¤£¬²¹È«
            newShape.style.pointList = oldPointList.concat(newPointList.slice(oldPointListLen));
        }
        else {
            // Ô­À´³¤£¬ÐÂµÄ¶Ì£¬½Ø¶Ï
            newShape.style.pointList = oldPointList.slice(0, newPointListLen);
        }

        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                { pointList: newPointList }
            )
            .during(function () {
                // Updating bezier points
                if (newShape.updateControlPoints) {
                    newShape.updateControlPoints(newShape.style);
                }
            })
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * ¸´ÖÆÑùÊ½
     * 
     * @inner
     * @param {Object} target Ä¿±ê¶ÔÏó
     * @param {Object} source Ô´¶ÔÏó
     * @param {...string} props ¸´ÖÆµÄÊôÐÔÁÐ±í
     */
    function cloneStyle(target, source) {
        var len = arguments.length;
        for (var i = 2; i < len; i++) {
            var prop = arguments[i];
            target.style[prop] = source.style[prop];
        }
    }

    /**
     * ·½ÐÍ¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function rectangle(zr, oldShape, newShape, duration, easing) {
        var newShapeStyle = newShape.style;
        if (!oldShape) {        // add
            oldShape = {
                position : newShape.position,
                style : {
                    x : newShapeStyle.x,
                    y : newShape._orient == 'vertical'
                        ? newShapeStyle.y + newShapeStyle.height
                        : newShapeStyle.y,
                    width: newShape._orient == 'vertical' 
                           ? newShapeStyle.width : 0,
                    height: newShape._orient != 'vertical' 
                           ? newShapeStyle.height : 0
                }
            };
        }
        
        var newX = newShapeStyle.x;
        var newY = newShapeStyle.y;
        var newWidth = newShapeStyle.width;
        var newHeight = newShapeStyle.height;
        var newPosition = [newShape.position[0], newShape.position[1]];
        cloneStyle(
            newShape, oldShape,
            'x', 'y', 'width', 'height'
        );
        newShape.position = oldShape.position;

        zr.addShape(newShape);
        if (newPosition[0] != oldShape.position[0] || newPosition[1] != oldShape.position[1]) {
            zr.animate(newShape.id, '')
                .when(
                    duration,
                    {
                        position: newPosition
                    }
                )
                .start(easing);
        }
        
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * À¯Öò¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function candle(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {        // add
            var y = newShape.style.y;
            oldShape = {style : {y : [y[0], y[0], y[0], y[0]]}};
        }
        
        var newY = newShape.style.y;
        newShape.style.y = oldShape.style.y;
        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                { y: newY }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }

    /**
     * »·ÐÍ¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function ring(zr, oldShape, newShape, duration, easing) {
        var x = newShape.style.x;
        var y = newShape.style.y;
        var r0 = newShape.style.r0;
        var r = newShape.style.r;
        
        newShape.__animating = true;

        if (newShape._animationAdd != 'r') {
            newShape.style.r0 = 0;
            newShape.style.r = 0;
            newShape.rotation = [Math.PI*2, x, y];
            
            zr.addShape(newShape);
            zr.animate(newShape.id, 'style')
                .when(
                    duration,
                    {
                        r0 : r0,
                        r : r
                    }
                )
                .done(function() {
                    newShape.__animating = false;
                })
                .start(easing);
            zr.animate(newShape.id, '')
                .when(
                    duration,
                    { rotation : [0, x, y] }
                )
                .start(easing);
        }
        else {
            newShape.style.r0 = newShape.style.r;
            
            zr.addShape(newShape);
            zr.animate(newShape.id, 'style')
                .when(
                    duration,
                    {
                        r0 : r0
                    }
                )
                .done(function() {
                    newShape.__animating = false;
                })
                .start(easing);
        }
    }
    
    /**
     * ÉÈÐÎ¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function sector(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {        // add
            if (newShape._animationAdd != 'r') {
                oldShape = {
                    style : {
                        startAngle : newShape.style.startAngle,
                        endAngle : newShape.style.startAngle
                    }
                };
            }
            else {
                oldShape = {style : {r0 : newShape.style.r}};
            }
        }
        
        var startAngle = newShape.style.startAngle;
        var endAngle = newShape.style.endAngle;
        
        cloneStyle(
            newShape, oldShape,
            'startAngle', 'endAngle'
        );
        
        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    startAngle : startAngle,
                    endAngle : endAngle
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * ÎÄ±¾¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function text(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    x : newShape.style.textAlign == 'left' 
                        ? newShape.style.x + 100
                        : newShape.style.x - 100,
                    y : newShape.style.y
                }
            };
        }
        
        var x = newShape.style.x;
        var y = newShape.style.y;
        
        cloneStyle(
            newShape, oldShape,
            'x', 'y'
        );
        
        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    x : x,
                    y : y
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * ¶à±ßÐÎ¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function polygon(zr, oldShape, newShape, duration, easing) {
        var rect = require('zrender/shape/Polygon').prototype.getRect(newShape.style);
        var x = rect.x + rect.width / 2;
        var y = rect.y + rect.height / 2;
        
        newShape.scale = [0.1, 0.1, x, y];
        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, '')
            .when(
                duration,
                {
                    scale : [1, 1, x, y]
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * ºÍÏÒ¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function ribbon(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    source0 : 0,
                    source1 : newShape.style.source1 > 0 ? 360 : -360,
                    target0 : 0,
                    target1 : newShape.style.target1 > 0 ? 360 : -360
                }
            };
        }
        
        var source0 = newShape.style.source0;
        var source1 = newShape.style.source1;
        var target0 = newShape.style.target0;
        var target1 = newShape.style.target1;
        
        if (oldShape.style) {
            cloneStyle(
                newShape, oldShape,
                'source0', 'source1', 'target0', 'target1'
            );
        }
        
        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    source0 : source0,
                    source1 : source1,
                    target0 : target0,
                    target1 : target1
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * gaugePointer¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function gaugePointer(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {        // add
            oldShape = {
                style : {
                    angle : newShape.style.startAngle
                }
            };
        }
        
        var angle = newShape.style.angle;
        newShape.style.angle = oldShape.style.angle;
        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    angle : angle
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * icon¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function icon(zr, oldShape, newShape, duration, easing, delay) {
        // ±ÜÃâmarkPointÌØÐ§È¡ÖµÔÚ¶¯»­Ö¡ÉÏ
        newShape.style._x = newShape.style.x;
        newShape.style._y = newShape.style.y;
        newShape.style._width = newShape.style.width;
        newShape.style._height = newShape.style.height;

        if (!oldShape) {    // add
            var x = newShape._x || 0;
            var y = newShape._y || 0;
            newShape.scale = [0.01, 0.01, x, y];
            zr.addShape(newShape);
            newShape.__animating = true;
            zr.animate(newShape.id, '')
                .delay(delay)
                .when(
                    duration,
                    {scale : [1, 1, x, y]}
                )
                .done(function() {
                    newShape.__animating = false;
                })
                .start(easing || 'QuinticOut');
        }
        else {              // mod
            rectangle(zr, oldShape, newShape, duration, easing);
        }
    }
    
    /**
     * line¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function line(zr, oldShape, newShape, duration, easing) {
        if (!oldShape) {
            oldShape = {
                style : {
                    xStart : newShape.style.xStart,
                    yStart : newShape.style.yStart,
                    xEnd : newShape.style.xStart,
                    yEnd : newShape.style.yStart
                }
            };
        }
        
        var xStart = newShape.style.xStart;
        var xEnd = newShape.style.xEnd;
        var yStart = newShape.style.yStart;
        var yEnd = newShape.style.yEnd;

        cloneStyle(
            newShape, oldShape,
            'xStart', 'xEnd', 'yStart', 'yEnd'
        );

        zr.addShape(newShape);
        newShape.__animating = true;
        zr.animate(newShape.id, 'style')
            .when(
                duration,
                {
                    xStart: xStart,
                    xEnd: xEnd,
                    yStart: yStart,
                    yEnd: yEnd
                }
            )
            .done(function() {
                newShape.__animating = false;
            })
            .start(easing);
    }
    
    /**
     * markline¶¯»­
     * 
     * @param {ZRender} zr
     * @param {shape} oldShape
     * @param {shape} newShape
     * @param {number} duration
     * @param {tring} easing
     */
    function markline(zr, oldShape, newShape, duration, easing) {
        easing = easing || 'QuinticOut';
        newShape.__animating = true;
        zr.addShape(newShape);
        var newShapeStyle = newShape.style;

        var animationDone = function () {
            newShape.__animating = false;
        };
        var x0 = newShapeStyle.xStart;
        var y0 = newShapeStyle.yStart;
        var x2 = newShapeStyle.xEnd;
        var y2 = newShapeStyle.yEnd;
        if (newShapeStyle.curveness > 0) {
            newShape.updatePoints(newShapeStyle);
            var obj = { p: 0 };
            var x1 = newShapeStyle.cpX1;
            var y1 = newShapeStyle.cpY1;
            var newXArr = [];
            var newYArr = [];
            var subdivide = curveTool.quadraticSubdivide;
            zr.animation.animate(obj)
                .when(duration, { p: 1 })
                .during(function () {
                    // Calculate subdivided curve
                    subdivide(x0, x1, x2, obj.p, newXArr);
                    subdivide(y0, y1, y2, obj.p, newYArr);
                    newShapeStyle.cpX1 = newXArr[1];
                    newShapeStyle.cpY1 = newYArr[1];
                    newShapeStyle.xEnd = newXArr[2];
                    newShapeStyle.yEnd = newYArr[2];
                    zr.modShape(newShape);
                })
                .done(animationDone)
                .start(easing);
        }
        else {
            zr.animate(newShape.id, 'style')
                .when(0, {
                    xEnd: x0,
                    yEnd: y0
                })
                .when(duration, {
                    xEnd: x2,
                    yEnd: y2
                })
                .done(animationDone)
                .start(easing);
        }
    }

    return {
        pointList : pointList,
        rectangle : rectangle,
        candle : candle,
        ring : ring,
        sector : sector,
        text : text,
        polygon : polygon,
        ribbon : ribbon,
        gaugePointer : gaugePointer,
        icon : icon,
        line : line,
        markline : markline
    };
});
define('echarts/util/ecEffect', ['require', '../util/ecData', 'zrender/shape/Circle', 'zrender/shape/Image', 'zrender/tool/curve', '../util/shape/Icon', '../util/shape/Symbol', 'zrender/shape/ShapeBundle', 'zrender/shape/Polyline', 'zrender/tool/vector', 'zrender/tool/env'], function (require) {
    var ecData = require('../util/ecData');
    
    var CircleShape = require('zrender/shape/Circle');
    var ImageShape = require('zrender/shape/Image');
    var curveTool = require('zrender/tool/curve');
    var IconShape = require('../util/shape/Icon');
    var SymbolShape = require('../util/shape/Symbol');
    var ShapeBundle = require('zrender/shape/ShapeBundle');
    var Polyline = require('zrender/shape/Polyline');
    var vec2 = require('zrender/tool/vector');

    var canvasSupported = require('zrender/tool/env').canvasSupported;
    
    function point(zr, effectList, shape, zlevel) {
        var effect = shape.effect;
        var color = effect.color || shape.style.strokeColor || shape.style.color;
        var shadowColor = effect.shadowColor || color;
        var size = effect.scaleSize;
        var distance = effect.bounceDistance;
        var shadowBlur = typeof effect.shadowBlur != 'undefined'
                         ? effect.shadowBlur : size;

        var effectShape;
        if (shape.type !== 'image') {
            effectShape = new IconShape({
                zlevel : zlevel,
                style : {
                    brushType : 'stroke',
                    iconType : shape.style.iconType != 'droplet'
                               ? shape.style.iconType
                               : 'circle',
                    x : shadowBlur + 1, // Ïß¿í
                    y : shadowBlur + 1,
                    n : shape.style.n,
                    width : shape.style._width * size,
                    height : shape.style._height * size,
                    lineWidth : 1,
                    strokeColor : color,
                    shadowColor : shadowColor,
                    shadowBlur : shadowBlur
                },
                draggable : false,
                hoverable : false
            });
            if (shape.style.iconType == 'pin') {
                effectShape.style.y += effectShape.style.height / 2 * 1.5;
            }

            if (canvasSupported) {  // Ìá¸ßÐÔÄÜ£¬»»³Éimage
                effectShape.style.image = zr.shapeToImage(
                    effectShape, 
                    effectShape.style.width + shadowBlur * 2 + 2, 
                    effectShape.style.height + shadowBlur * 2 + 2
                ).style.image;
                
                effectShape = new ImageShape({
                    zlevel : effectShape.zlevel,
                    style : effectShape.style,
                    draggable : false,
                    hoverable : false
                });
            }
        }
        else {
            effectShape = new ImageShape({
                zlevel : zlevel,
                style : shape.style,
                draggable : false,
                hoverable : false
            });
        }
        
        ecData.clone(shape, effectShape);
        
        // ¸Ä±ä×ø±ê£¬²»ÄÜÒÆµ½Ç°Ãæ
        effectShape.position = shape.position;
        effectList.push(effectShape);
        zr.addShape(effectShape);
        
        var devicePixelRatio = shape.type !== 'image' ? (window.devicePixelRatio || 1) : 1;
        var offset = (effectShape.style.width / devicePixelRatio - shape.style._width) / 2;
        effectShape.style.x = shape.style._x - offset;
        effectShape.style.y = shape.style._y - offset;

        if (shape.style.iconType == 'pin') {
            effectShape.style.y -= shape.style.height / 2 * 1.5;
        }

        var duration = (effect.period + Math.random() * 10) * 100;
        
        zr.modShape(
            shape.id, 
            { invisible : true}
        );
        
        var centerX = effectShape.style.x + (effectShape.style.width) / 2 / devicePixelRatio;
        var centerY = effectShape.style.y + (effectShape.style.height) / 2 / devicePixelRatio;

        if (effect.type === 'scale') {
            // ·Å´óÐ§¹û
            zr.modShape(
                effectShape.id, 
                {
                    scale : [0.1, 0.1, centerX, centerY]
                }
            );
            
            zr.animate(effectShape.id, '', effect.loop)
                .when(
                    duration,
                    {
                        scale : [1, 1, centerX, centerY]
                    }
                )
                .done(function() {
                    shape.effect.show = false;
                    zr.delShape(effectShape.id);
                })
                .start();
        }
        else {
            zr.animate(effectShape.id, 'style', effect.loop)
                .when(
                    duration,
                    {
                        y : effectShape.style.y - distance
                    }
                )
                .when(
                    duration * 2,
                    {
                        y : effectShape.style.y
                    }
                )
                .done(function() {
                    shape.effect.show = false;
                    zr.delShape(effectShape.id);
                })
                .start();
        }
        
    }
    
    function largePoint(zr, effectList, shape, zlevel) {
        var effect = shape.effect;
        var color = effect.color || shape.style.strokeColor || shape.style.color;
        var size = effect.scaleSize;
        var shadowColor = effect.shadowColor || color;
        var shadowBlur = typeof effect.shadowBlur != 'undefined'
                         ? effect.shadowBlur : (size * 2);
        var devicePixelRatio = window.devicePixelRatio || 1;
        var effectShape = new SymbolShape({
            zlevel : zlevel,
            position : shape.position,
            scale : shape.scale,
            style : {
                pointList : shape.style.pointList,
                iconType : shape.style.iconType,
                color : color,
                strokeColor : color,
                shadowColor : shadowColor,
                shadowBlur : shadowBlur * devicePixelRatio,
                random : true,
                brushType: 'fill',
                lineWidth:1,
                size : shape.style.size
            },
            draggable : false,
            hoverable : false
        });
        
        effectList.push(effectShape);
        zr.addShape(effectShape);
        zr.modShape(
            shape.id, 
            { invisible : true}
        );
        
        var duration = Math.round(effect.period * 100);
        var clip1 = {};
        var clip2 = {};
        for (var i = 0; i < 20; i++) {
            effectShape.style['randomMap' + i] = 0;
            clip1 = {};
            clip1['randomMap' + i] = 100;
            clip2 = {};
            clip2['randomMap' + i] = 0;
            effectShape.style['randomMap' + i] = Math.random() * 100;
            zr.animate(effectShape.id, 'style', true)
                .when(duration, clip1)
                .when(duration * 2, clip2)
                .when(duration * 3, clip1)
                .when(duration * 4, clip1)
                .delay(Math.random() * duration * i)
                //.delay(duration / 15 * (15 - i + 1))
                .start();
            
        }
    }
    
    function line(zr, effectList, shape, zlevel, isLarge) {
        var effect = shape.effect;
        var shapeStyle = shape.style;
        var color = effect.color || shapeStyle.strokeColor || shapeStyle.color;
        var shadowColor = effect.shadowColor || shapeStyle.strokeColor || color;
        var size = shapeStyle.lineWidth * effect.scaleSize;
        var shadowBlur = typeof effect.shadowBlur != 'undefined'
                         ? effect.shadowBlur : size;

        var effectShape = new CircleShape({
            zlevel : zlevel,
            style : {
                x : shadowBlur,
                y : shadowBlur,
                r : size,
                color : color,
                shadowColor : shadowColor,
                shadowBlur : shadowBlur
            },
            hoverable : false
        });

        var offset = 0;
        if (canvasSupported && ! isLarge) {  // Ìá¸ßÐÔÄÜ£¬»»³Éimage
            var zlevel = effectShape.zlevel;
            effectShape = zr.shapeToImage(
                effectShape,
                (size + shadowBlur) * 2,
                (size + shadowBlur) * 2
            );
            effectShape.zlevel = zlevel;
            effectShape.hoverable = false;

            offset = shadowBlur;
        }

        if (! isLarge) {
            ecData.clone(shape, effectShape);
            // ¸Ä±ä×ø±ê£¬ ²»ÄÜÒÆµ½Ç°Ãæ
            effectShape.position = shape.position;
            effectList.push(effectShape);
            zr.addShape(effectShape);
        }

        var effectDone = function () {
            if (! isLarge) {
                shape.effect.show = false;
                zr.delShape(effectShape.id);   
            }
            effectShape.effectAnimator = null;
        };

        if (shape instanceof Polyline) {
            var distanceList = [0];
            var totalDist = 0;
            var pointList = shapeStyle.pointList;
            var controlPointList = shapeStyle.controlPointList;
            for (var i = 1; i < pointList.length; i++) {
                if (controlPointList) {
                    var cp1 = controlPointList[(i - 1) * 2];
                    var cp2 = controlPointList[(i - 1) * 2 + 1];
                    totalDist += vec2.dist(pointList[i - 1], cp1)
                         + vec2.dist(cp1, cp2)
                         + vec2.dist(cp2, pointList[i]);
                }
                else {
                    totalDist += vec2.dist(pointList[i - 1], pointList[i]);
                }
                distanceList.push(totalDist);
            }
            var obj = { p: 0 };
            var animator = zr.animation.animate(obj, { loop: effect.loop });

            for (var i = 0; i < distanceList.length; i++) {
                animator.when(distanceList[i] * effect.period, { p: i });
            }
            animator.during(function () {
                var i = Math.floor(obj.p);
                var x, y;
                if (i == pointList.length - 1) {
                    x = pointList[i][0];
                    y = pointList[i][1];
                }
                else {
                    var t = obj.p - i;
                    var p0 = pointList[i];
                    var p1 = pointList[i + 1];
                    if (controlPointList) {
                        var cp1 = controlPointList[i * 2];
                        var cp2 = controlPointList[i * 2 + 1];
                        x = curveTool.cubicAt(
                            p0[0], cp1[0], cp2[0], p1[0], t
                        );
                        y = curveTool.cubicAt(
                            p0[1], cp1[1], cp2[1], p1[1], t
                        );
                    }
                    else {
                        x = (p1[0] - p0[0]) * t + p0[0];
                        y = (p1[1] - p0[1]) * t + p0[1];   
                    }
                }
                effectShape.style.x = x;
                effectShape.style.y = y;
                if (! isLarge) {
                    zr.modShape(effectShape);
                }
            })
            .done(effectDone)
            .start();

            animator.duration = totalDist * effect.period;

            effectShape.effectAnimator = animator;
        }
        else {
            var x0 = shapeStyle.xStart - offset;
            var y0 = shapeStyle.yStart - offset;
            var x2 = shapeStyle.xEnd - offset;
            var y2 = shapeStyle.yEnd - offset;
            effectShape.style.x = x0;
            effectShape.style.y = y0;

            var distance = (x2 - x0) * (x2 - x0) + (y2 - y0) * (y2 - y0);
            var duration = Math.round(Math.sqrt(Math.round(
                distance * effect.period * effect.period
            )));

            if (shape.style.curveness > 0) {
                var x1 = shapeStyle.cpX1 - offset;
                var y1 = shapeStyle.cpY1 - offset;
                effectShape.effectAnimator = zr.animation.animate(effectShape, { loop: effect.loop })
                    .when(duration, { p: 1 })
                    .during(function (target, t) {
                        effectShape.style.x = curveTool.quadraticAt(
                            x0, x1, x2, t
                        );
                        effectShape.style.y = curveTool.quadraticAt(
                            y0, y1, y2, t
                        );
                        if (! isLarge) {
                            zr.modShape(effectShape);
                        }
                    })
                    .done(effectDone)
                    .start();
            }
            else {
                // ²»ÓÃ zr.animate£¬ÒòÎªÔÚÓÃ ShapeBundle µÄÊ±ºòµ¥¸ö effectShape ²»»á
                // ±»¼Óµ½ zrender ÖÐ
                effectShape.effectAnimator = zr.animation.animate(effectShape.style, { loop: effect.loop })
                    .when(duration, {
                        x: x2,
                        y: y2
                    })
                    .during(function () {
                        if (! isLarge) {
                            zr.modShape(effectShape);
                        }
                    })
                    .done(effectDone)
                    .start();
            }
            effectShape.effectAnimator.duration = duration;
        }
        return effectShape;
    }

    function largeLine(zr, effectList, shape, zlevel) {
        var effectShape = new ShapeBundle({
            style: {
                shapeList: []
            },
            zlevel: zlevel,
            hoverable: false
        });
        var shapeList = shape.style.shapeList;
        var effect = shape.effect;
        effectShape.position = shape.position;

        var maxDuration = 0;
        var subEffectAnimators = [];
        for (var i = 0; i < shapeList.length; i++) {
            shapeList[i].effect = effect;
            var subEffectShape = line(zr, null, shapeList[i], zlevel, true);
            var subEffectAnimator = subEffectShape.effectAnimator;
            effectShape.style.shapeList.push(subEffectShape);
            if (subEffectAnimator.duration > maxDuration) {
                maxDuration = subEffectAnimator.duration;
            }
            if (i === 0) {
                effectShape.style.color = subEffectShape.style.color;
                effectShape.style.shadowBlur = subEffectShape.style.shadowBlur;
                effectShape.style.shadowColor = subEffectShape.style.shadowColor;
            }
            subEffectAnimators.push(subEffectAnimator);
        }
        effectList.push(effectShape);
        zr.addShape(effectShape);

        var clearAllAnimators = function () {
            for (var i = 0; i < subEffectAnimators.length; i++) {
                subEffectAnimators[i].stop();
            }
        };
        if (maxDuration) {
            effectShape.__dummy = 0;
            // Proxy animator
            var animator = zr.animate(effectShape.id, '', effect.loop)
                .when(maxDuration, {
                    __dummy: 1
                })
                .during(function () {
                    zr.modShape(effectShape);
                })
                .done(function () {
                    shape.effect.show = false;
                    zr.delShape(effectShape.id);
                })
                .start();
            var oldStop = animator.stop;

            animator.stop = function () {
                clearAllAnimators();
                oldStop.call(this);
            };
        }
    }

    return {
        point : point,
        largePoint : largePoint,
        line : line,
        largeLine: largeLine
    };
});
define('echarts/util/accMath', [], function () {
    // ³ý·¨º¯Êý£¬ÓÃÀ´µÃµ½¾«È·µÄ³ý·¨½á¹û 
    // ËµÃ÷£ºjavascriptµÄ³ý·¨½á¹û»áÓÐÎó²î£¬ÔÚÁ½¸ö¸¡µãÊýÏà³ýµÄÊ±ºò»á±È½ÏÃ÷ÏÔ¡£Õâ¸öº¯Êý·µ»Ø½ÏÎª¾«È·µÄ³ý·¨½á¹û¡£ 
    // µ÷ÓÃ£ºaccDiv(arg1,arg2) 
    // ·µ»ØÖµ£ºarg1³ýÒÔarg2µÄ¾«È·½á¹û
    function accDiv(arg1,arg2){
        var s1 = arg1.toString();
        var s2 = arg2.toString(); 
        var m = 0;
        try {
            m = s2.split('.')[1].length;
        }
        catch(e) {}
        try {
            m -= s1.split('.')[1].length;
        }
        catch(e) {}
        
        return (s1.replace('.', '') - 0) / (s2.replace('.', '') - 0) * Math.pow(10, m);
    }

    // ³Ë·¨º¯Êý£¬ÓÃÀ´µÃµ½¾«È·µÄ³Ë·¨½á¹û
    // ËµÃ÷£ºjavascriptµÄ³Ë·¨½á¹û»áÓÐÎó²î£¬ÔÚÁ½¸ö¸¡µãÊýÏà³ËµÄÊ±ºò»á±È½ÏÃ÷ÏÔ¡£Õâ¸öº¯Êý·µ»Ø½ÏÎª¾«È·µÄ³Ë·¨½á¹û¡£ 
    // µ÷ÓÃ£ºaccMul(arg1,arg2) 
    // ·µ»ØÖµ£ºarg1³ËÒÔarg2µÄ¾«È·½á¹û
    function accMul(arg1, arg2) {
        var s1 = arg1.toString();
        var s2 = arg2.toString();
        var m = 0;
        try {
            m += s1.split('.')[1].length;
        }
        catch(e) {}
        try {
            m += s2.split('.')[1].length;
        }
        catch(e) {}
        
        return (s1.replace('.', '') - 0) * (s2.replace('.', '') - 0) / Math.pow(10, m);
    }

    // ¼Ó·¨º¯Êý£¬ÓÃÀ´µÃµ½¾«È·µÄ¼Ó·¨½á¹û 
    // ËµÃ÷£ºjavascriptµÄ¼Ó·¨½á¹û»áÓÐÎó²î£¬ÔÚÁ½¸ö¸¡µãÊýÏà¼ÓµÄÊ±ºò»á±È½ÏÃ÷ÏÔ¡£Õâ¸öº¯Êý·µ»Ø½ÏÎª¾«È·µÄ¼Ó·¨½á¹û¡£ 
    // µ÷ÓÃ£ºaccAdd(arg1,arg2) 
    // ·µ»ØÖµ£ºarg1¼ÓÉÏarg2µÄ¾«È·½á¹û 
    function accAdd(arg1, arg2) {
        var r1 = 0;
        var r2 = 0;
        try {
            r1 = arg1.toString().split('.')[1].length;
        }
        catch(e) {}
        try {
            r2 = arg2.toString().split('.')[1].length;
        }
        catch(e) {}
        
        var m = Math.pow(10, Math.max(r1, r2));
        return (Math.round(arg1 * m) + Math.round(arg2 * m)) / m; 
    }

    //¼õ·¨º¯Êý£¬ÓÃÀ´µÃµ½¾«È·µÄ¼õ·¨½á¹û 
    //ËµÃ÷£ºjavascriptµÄ¼õ·¨½á¹û»áÓÐÎó²î£¬ÔÚÁ½¸ö¸¡µãÊý¼õ·¨µÄÊ±ºò»á±È½ÏÃ÷ÏÔ¡£Õâ¸öº¯Êý·µ»Ø½ÏÎª¾«È·µÄ¼õ·¨½á¹û¡£ 
    //µ÷ÓÃ£ºaccSub(arg1,arg2) 
    //·µ»ØÖµ£ºarg1¼õ·¨arg2µÄ¾«È·½á¹û 
    function accSub(arg1,arg2) {
        return accAdd(arg1, -arg2);
    }

    return {
        accDiv : accDiv,
        accMul : accMul,
        accAdd : accAdd,
        accSub : accSub
    };
});
define('echarts/layout/EdgeBundling', ['require', '../data/KDTree', 'zrender/tool/vector'], function (require) {

    var KDTree = require('../data/KDTree');
    var vec2 = require('zrender/tool/vector');
    var v2Create = vec2.create;
    var v2DistSquare = vec2.distSquare;
    var v2Dist = vec2.dist;
    var v2Copy = vec2.copy;
    var v2Clone = vec2.clone;

    function squaredDistance(a, b) {
        a = a.array;
        b = b.array;

        var x = b[0] - a[0];
        var y = b[1] - a[1];
        var z = b[2] - a[2];
        var w = b[3] - a[3];

        return x * x + y * y + z * z + w * w;
    }

    function CoarsenedEdge(group) {
        this.points = [
            group.mp0, group.mp1
        ];

        this.group = group;
    }

    function Edge(edge) {
        var points = edge.points;
        // Sort on y
        if (
            points[0][1] < points[1][1]
            // If coarsened edge is flipped, the final composition of meet point
            // will be unordered
            || edge instanceof CoarsenedEdge
        ) {
            this.array = [points[0][0], points[0][1], points[1][0], points[1][1]];
            this._startPoint = points[0];
            this._endPoint = points[1];
        }
        else {
            this.array = [points[1][0], points[1][1], points[0][0], points[0][1]];
            this._startPoint = points[1];
            this._endPoint = points[0];
        }

        this.ink = v2Dist(points[0], points[1]);

        this.edge = edge;

        this.group = null;
    }

    Edge.prototype.getStartPoint = function () {
        return this._startPoint;
    };

    Edge.prototype.getEndPoint = function () {
        return this._endPoint;
    };

    function BundledEdgeGroup() {

        this.edgeList = [];

        this.mp0 = v2Create();
        this.mp1 = v2Create();

        this.ink = 0;
    }

    BundledEdgeGroup.prototype.addEdge = function (edge) {
        edge.group = this;
        this.edgeList.push(edge);
    };

    BundledEdgeGroup.prototype.removeEdge = function (edge) {
        edge.group = null;
        this.edgeList.splice(this.edgeList.indexOf(edge), 1);
    };

    /**
     * @constructor
     * @alias module:echarts/layout/EdgeBundling
     */
    function EdgeBundling() {
        this.maxNearestEdge = 6;
        this.maxTurningAngle = Math.PI / 4;
        this.maxIteration = 20;
    }

    EdgeBundling.prototype = {
        
        constructor: EdgeBundling,

        run: function (rawEdges) {
            var res = this._iterate(rawEdges);
            var nIterate = 0;
            while (nIterate++ < this.maxIteration) {
                var coarsenedEdges = [];
                for (var i = 0; i < res.groups.length; i++) {
                    coarsenedEdges.push(new CoarsenedEdge(res.groups[i]));
                }
                var newRes = this._iterate(coarsenedEdges);
                if (newRes.savedInk <= 0) {
                    break;
                } else {
                    res = newRes;
                }
            }

            // Get new edges
            var newEdges = [];

            function pointApproxEqual(p0, p1) {
                // Use Float32Array may affect the precision
                return v2DistSquare(p0, p1) < 1e-10;
            }
            // Clone all points to make sure all points in edge will not reference to the same array
            // And clean the duplicate points
            function cleanEdgePoints(edgePoints, rawEdgePoints) {
                var res = [];
                var off = 0;
                for (var i = 0; i < edgePoints.length; i++) {
                    if (! (off > 0 && pointApproxEqual(edgePoints[i], res[off - 1]))) {
                        res[off++] = v2Clone(edgePoints[i]);
                    }
                }
                // Edge has been reversed
                if (rawEdgePoints[0] && !pointApproxEqual(res[0], rawEdgePoints[0])) {
                    res = res.reverse();
                }
                return res;
            }

            var buildNewEdges = function (groups, fromEdgePoints) {
                var newEdgePoints;
                for (var i = 0; i < groups.length; i++) {
                    var group = groups[i];
                    if (
                        group.edgeList[0]
                        && (group.edgeList[0].edge instanceof CoarsenedEdge)
                    ) {
                        var newGroups = [];
                        for (var j = 0; j < group.edgeList.length; j++) {
                            newGroups.push(group.edgeList[j].edge.group);
                        }
                        if (! fromEdgePoints) {
                            newEdgePoints = [];
                        } else {
                            newEdgePoints = fromEdgePoints.slice();
                        }
                        newEdgePoints.unshift(group.mp0);
                        newEdgePoints.push(group.mp1);
                        buildNewEdges(newGroups, newEdgePoints);
                    } else {
                        // console.log(group.edgeList.length);
                        for (var j = 0; j < group.edgeList.length; j++) {
                            var edge = group.edgeList[j];
                            if (! fromEdgePoints) {
                                newEdgePoints = [];
                            } else {
                                newEdgePoints = fromEdgePoints.slice();
                            }
                            newEdgePoints.unshift(group.mp0);
                            newEdgePoints.push(group.mp1);
                            newEdgePoints.unshift(edge.getStartPoint());
                            newEdgePoints.push(edge.getEndPoint());
                            newEdges.push({
                                points: cleanEdgePoints(newEdgePoints, edge.edge.points),
                                rawEdge: edge.edge
                            });
                        }
                    }
                }
            };

            buildNewEdges(res.groups);

            return newEdges;
        },

        _iterate: function (rawEdges) {
            var edges = [];
            var groups = [];
            var totalSavedInk = 0;
            for (var i = 0; i < rawEdges.length; i++) {
                var edge = new Edge(rawEdges[i]);
                edges.push(edge);
            }

            var tree = new KDTree(edges, 4);

            var nearests = [];

            var _mp0 = v2Create();
            var _mp1 = v2Create();
            var _newGroupInk = 0;
            var mp0 = v2Create();
            var mp1 = v2Create();
            var newGroupInk = 0;
            for (var i = 0; i < edges.length; i++) {
                var edge = edges[i];
                if (edge.group) {
                    // Edge have been groupped
                    continue;
                }
                tree.nearestN(
                    edge, this.maxNearestEdge,
                    squaredDistance, nearests
                );
                var maxSavedInk = 0;
                var mostSavingInkEdge = null;
                var lastCheckedGroup = null;
                for (var j = 0; j < nearests.length; j++) {
                    var nearest = nearests[j];
                    var savedInk = 0;
                    if (nearest.group) {
                        if (nearest.group !== lastCheckedGroup) {
                            lastCheckedGroup = nearest.group;
                            _newGroupInk = this._calculateGroupEdgeInk(
                                nearest.group, edge, _mp0, _mp1
                            );
                            savedInk = nearest.group.ink + edge.ink - _newGroupInk;
                        }
                    }
                    else {
                        _newGroupInk = this._calculateEdgeEdgeInk(
                            edge, nearest, _mp0, _mp1
                        );
                        savedInk = nearest.ink + edge.ink - _newGroupInk;
                    }
                    if (savedInk > maxSavedInk) {
                        maxSavedInk = savedInk;
                        mostSavingInkEdge = nearest;
                        v2Copy(mp1, _mp1);
                        v2Copy(mp0, _mp0);
                        newGroupInk = _newGroupInk;
                    }
                }
                if (mostSavingInkEdge) {
                    totalSavedInk += maxSavedInk;
                    var group;
                    if (! mostSavingInkEdge.group) {
                        group = new BundledEdgeGroup();
                        groups.push(group);
                        group.addEdge(mostSavingInkEdge);
                    }
                    group = mostSavingInkEdge.group;
                    // Use the meet point and group ink calculated before
                    v2Copy(group.mp0, mp0);
                    v2Copy(group.mp1, mp1);
                    group.ink = newGroupInk;
                    mostSavingInkEdge.group.addEdge(edge);
                }
                else {
                    var group = new BundledEdgeGroup();
                    groups.push(group);
                    v2Copy(group.mp0, edge.getStartPoint());
                    v2Copy(group.mp1, edge.getEndPoint());
                    group.ink = edge.ink;
                    group.addEdge(edge);
                }
            }

            return {
                groups: groups,
                edges: edges,
                savedInk: totalSavedInk
            };
        },

        _calculateEdgeEdgeInk: (function () {
            var startPointSet = [];
            var endPointSet = [];
            return function (e0, e1, mp0, mp1) {
                startPointSet[0] = e0.getStartPoint();
                startPointSet[1] = e1.getStartPoint();
                endPointSet[0] = e0.getEndPoint();
                endPointSet[1] = e1.getEndPoint();

                this._calculateMeetPoints(
                    startPointSet, endPointSet, mp0, mp1
                );
                var ink = v2Dist(startPointSet[0], mp0)
                    + v2Dist(mp0, mp1)
                    + v2Dist(mp1, endPointSet[0])
                    + v2Dist(startPointSet[1], mp0)
                    + v2Dist(mp1, endPointSet[1]);

                return ink;
            };
        })(),

        _calculateGroupEdgeInk: function (group, edgeTryAdd, mp0, mp1) {
            var startPointSet = [];
            var endPointSet = [];
            for (var i = 0; i < group.edgeList.length; i++) {
                var edge = group.edgeList[i];
                startPointSet.push(edge.getStartPoint());
                endPointSet.push(edge.getEndPoint());
            }
            startPointSet.push(edgeTryAdd.getStartPoint());
            endPointSet.push(edgeTryAdd.getEndPoint());

            this._calculateMeetPoints(
                startPointSet, endPointSet, mp0, mp1
            );

            var ink = v2Dist(mp0, mp1);
            for (var i = 0; i < startPointSet.length; i++) {
                ink += v2Dist(startPointSet[i], mp0)
                    + v2Dist(endPointSet[i], mp1);
            }

            return ink;
        },

        /**
         * Calculating the meet points
         * @method
         * @param {Array} startPointSet Start points set of bundled edges
         * @param {Array} endPointSet End points set of bundled edges
         * @param {Array.<number>} mp0 Output meet point 0
         * @param {Array.<number>} mp1 Output meet point 1
         */
        _calculateMeetPoints: (function () {
            var cp0 = v2Create();
            var cp1 = v2Create();
            return function (startPointSet, endPointSet, mp0, mp1) {
                vec2.set(cp0, 0, 0);
                vec2.set(cp1, 0, 0);
                var len = startPointSet.length;
                // Calculate the centroid of start points set
                for (var i = 0; i < len; i++) {
                    vec2.add(cp0, cp0, startPointSet[i]);
                }
                vec2.scale(cp0, cp0, 1 / len);

                // Calculate the centroid of end points set
                len = endPointSet.length;
                for (var i = 0; i < len; i++) {
                    vec2.add(cp1, cp1, endPointSet[i]);
                }
                vec2.scale(cp1, cp1, 1 / len);

                this._limitTurningAngle(
                    startPointSet, cp0, cp1, mp0
                );
                this._limitTurningAngle(
                    endPointSet, cp1, cp0, mp1
                );
            };
        })(),

        _limitTurningAngle: (function () {
            var v10 = v2Create();
            var vTmp = v2Create();
            var project = v2Create();
            var tmpOut = v2Create();
            return function (pointSet, p0, p1, out) {
                // Limit the max turning angle
                var maxTurningAngleCos = Math.cos(this.maxTurningAngle);
                var maxTurningAngleTan = Math.tan(this.maxTurningAngle);

                vec2.sub(v10, p0, p1);
                vec2.normalize(v10, v10);

                // Simply copy the centroid point if no need to turn the angle
                vec2.copy(out, p0);

                var maxMovement = 0;
                for (var i = 0; i < pointSet.length; i++) {
                    var p = pointSet[i];
                    vec2.sub(vTmp, p, p0);
                    var len = vec2.len(vTmp);
                    vec2.scale(vTmp, vTmp, 1 / len);
                    var turningAngleCos = vec2.dot(vTmp, v10);
                    // Turning angle is to large
                    if (turningAngleCos < maxTurningAngleCos) {
                        // Calculat p's project point on vector p1-p0 
                        // and distance to the vector
                        vec2.scaleAndAdd(
                            project, p0, v10, len * turningAngleCos
                        );
                        var distance = v2Dist(project, p);

                        // Use the max turning angle to calculate the new meet point
                        var d = distance / maxTurningAngleTan;
                        vec2.scaleAndAdd(tmpOut, project, v10, -d);

                        var movement = v2DistSquare(tmpOut, p0);
                        if (movement > maxMovement) {
                            maxMovement = movement;
                            vec2.copy(out, tmpOut);
                        }
                    }
                }
            };
        })()
    };

    return EdgeBundling;
});
define('zrender/tool/area', ['require', './util', './curve'], function (require) {

        'use strict';

        var util = require('./util');
        var curve = require('./curve');

        var _ctx;
        
        var _textWidthCache = {};
        var _textHeightCache = {};
        var _textWidthCacheCounter = 0;
        var _textHeightCacheCounter = 0;
        var TEXT_CACHE_MAX = 5000;
            
        var PI2 = Math.PI * 2;

        function normalizeRadian(angle) {
            angle %= PI2;
            if (angle < 0) {
                angle += PI2;
            }
            return angle;
        }
        /**
         * °üº¬ÅÐ¶Ï
         *
         * @param {Object} shape : Í¼ÐÎ
         * @param {Object} area £º Ä¿±êÇøÓò
         * @param {number} x £º ºá×ø±ê
         * @param {number} y £º ×Ý×ø±ê
         */
        function isInside(shape, area, x, y) {
            if (!area || !shape) {
                // ÎÞ²ÎÊý»ò²»Ö§³ÖÀàÐÍ
                return false;
            }
            var zoneType = shape.type;

            _ctx = _ctx || util.getContext();

            // Î´ÊµÏÖ»ò²»¿ÉÓÃÊ±(excanvas²»Ö§³Ö)ÔòÊýÑ§ÔËËã£¬Ö÷ÒªÊÇline£¬polyline£¬ring
            var _mathReturn = _mathMethod(shape, area, x, y);
            if (typeof _mathReturn != 'undefined') {
                return _mathReturn;
            }

            if (shape.buildPath && _ctx.isPointInPath) {
                return _buildPathMethod(shape, _ctx, area, x, y);
            }

            // ÉÏÃæµÄ·½·¨¶¼ÐÐ²»Í¨Ê±
            switch (zoneType) {
                case 'ellipse': // Todo£¬²»¾«È·
                    return true;
                // ÐýÂÖÇúÏß  ²»×¼È·
                case 'trochoid':
                    var _r = area.location == 'out'
                            ? area.r1 + area.r2 + area.d
                            : area.r1 - area.r2 + area.d;
                    return isInsideCircle(area, x, y, _r);
                // Ãµ¹åÏß ²»×¼È·
                case 'rose' :
                    return isInsideCircle(area, x, y, area.maxr);
                // Â·¾¶£¬ÍÖÔ²£¬ÇúÏßµÈ-----------------13
                default:
                    return false;   // Todo£¬ÔÝ²»Ö§³Ö
            }
        }

        /**
         * @param {Object} shape : Í¼ÐÎ
         * @param {Object} area £ºÄ¿±êÇøÓò
         * @param {number} x £º ºá×ø±ê
         * @param {number} y £º ×Ý×ø±ê
         * @return {boolean=} true±íÊ¾×ø±ê´¦ÔÚÍ¼ÐÎÖÐ
         */
        function _mathMethod(shape, area, x, y) {
            var zoneType = shape.type;
            // ÔÚ¾ØÐÎÄÚÔò²¿·ÖÍ¼ÐÎÐèÒª½øÒ»²½ÅÐ¶Ï
            switch (zoneType) {
                // ±´Èû¶ûÇúÏß
                case 'bezier-curve':
                    if (typeof(area.cpX2) === 'undefined') {
                        return isInsideQuadraticStroke(
                            area.xStart, area.yStart,
                            area.cpX1, area.cpY1, 
                            area.xEnd, area.yEnd,
                            area.lineWidth, x, y
                        );
                    }
                    return isInsideCubicStroke(
                        area.xStart, area.yStart,
                        area.cpX1, area.cpY1, 
                        area.cpX2, area.cpY2, 
                        area.xEnd, area.yEnd,
                        area.lineWidth, x, y
                    );
                // Ïß
                case 'line':
                    return isInsideLine(
                        area.xStart, area.yStart,
                        area.xEnd, area.yEnd,
                        area.lineWidth, x, y
                    );
                // ÕÛÏß
                case 'polyline':
                    return isInsidePolyline(
                        area.pointList, area.lineWidth, x, y
                    );
                // Ô²»·
                case 'ring':
                    return isInsideRing(
                        area.x, area.y, area.r0, area.r, x, y
                    );
                // Ô²ÐÎ
                case 'circle':
                    return isInsideCircle(
                        area.x, area.y, area.r, x, y
                    );
                // ÉÈÐÎ
                case 'sector':
                    var startAngle = area.startAngle * Math.PI / 180;
                    var endAngle = area.endAngle * Math.PI / 180;
                    if (!area.clockWise) {
                        startAngle = -startAngle;
                        endAngle = -endAngle;
                    }
                    return isInsideSector(
                        area.x, area.y, area.r0, area.r,
                        startAngle, endAngle,
                        !area.clockWise,
                        x, y
                    );
                // ¶à±ßÐÎ
                case 'path':
                    return area.pathArray && isInsidePath(
                        area.pathArray, Math.max(area.lineWidth, 5),
                        area.brushType, x, y
                    );
                case 'polygon':
                case 'star':
                case 'isogon':
                    return isInsidePolygon(area.pointList, x, y);
                // ÎÄ±¾
                case 'text':
                    var rect =  area.__rect || shape.getRect(area);
                    return isInsideRect(
                        rect.x, rect.y, rect.width, rect.height, x, y
                    );
                // ¾ØÐÎ
                case 'rectangle':
                // Í¼Æ¬
                case 'image':
                    return isInsideRect(
                        area.x, area.y, area.width, area.height, x, y
                    );
            }
        }

        /**
         * Í¨¹ýbuildPath·½·¨À´ÅÐ¶Ï£¬Èý¸ö·½·¨ÖÐ½Ï¿ì£¬µ«ÊÇ²»Ö§³ÖÏßÌõÀàÐÍµÄshape£¬
         * ¶øÇÒexcanvas²»Ö§³ÖisPointInPath·½·¨
         *
         * @param {Object} shape £º shape
         * @param {Object} context : ÉÏÏÂÎÄ
         * @param {Object} area £ºÄ¿±êÇøÓò
         * @param {number} x £º ºá×ø±ê
         * @param {number} y £º ×Ý×ø±ê
         * @return {boolean} true±íÊ¾×ø±ê´¦ÔÚÍ¼ÐÎÖÐ
         */
        function _buildPathMethod(shape, context, area, x, y) {
            // Í¼ÐÎÀàÊµÏÖÂ·¾¶´´½¨ÁËÔòÓÃÀàµÄpath
            context.beginPath();
            shape.buildPath(context, area);
            context.closePath();
            return context.isPointInPath(x, y);
        }

        /**
         * !isInside
         */
        function isOutside(shape, area, x, y) {
            return !isInside(shape, area, x, y);
        }

        /**
         * Ïß¶Î°üº¬ÅÐ¶Ï
         * @param  {number}  x0
         * @param  {number}  y0
         * @param  {number}  x1
         * @param  {number}  y1
         * @param  {number}  lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {boolean}
         */
        function isInsideLine(x0, y0, x1, y1, lineWidth, x, y) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);
            var _a = 0;
            var _b = x0;
            // Quick reject
            if (
                (y > y0 + _l && y > y1 + _l)
                || (y < y0 - _l && y < y1 - _l)
                || (x > x0 + _l && x > x1 + _l)
                || (x < x0 - _l && x < x1 - _l)
            ) {
                return false;
            }

            if (x0 !== x1) {
                _a = (y0 - y1) / (x0 - x1);
                _b = (x0 * y1 - x1 * y0) / (x0 - x1) ;
            }
            else {
                return Math.abs(x - x0) <= _l / 2;
            }
            var tmp = _a * x - y + _b;
            var _s = tmp * tmp / (_a * _a + 1);
            return _s <= _l / 2 * _l / 2;
        }

        /**
         * Èý´Î±´Èû¶ûÇúÏßÃè±ß°üº¬ÅÐ¶Ï
         * @param  {number}  x0
         * @param  {number}  y0
         * @param  {number}  x1
         * @param  {number}  y1
         * @param  {number}  x2
         * @param  {number}  y2
         * @param  {number}  x3
         * @param  {number}  y3
         * @param  {number}  lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {boolean}
         */
        function isInsideCubicStroke(
            x0, y0, x1, y1, x2, y2, x3, y3,
            lineWidth, x, y
        ) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);
            // Quick reject
            if (
                (y > y0 + _l && y > y1 + _l && y > y2 + _l && y > y3 + _l)
                || (y < y0 - _l && y < y1 - _l && y < y2 - _l && y < y3 - _l)
                || (x > x0 + _l && x > x1 + _l && x > x2 + _l && x > x3 + _l)
                || (x < x0 - _l && x < x1 - _l && x < x2 - _l && x < x3 - _l)
            ) {
                return false;
            }
            var d =  curve.cubicProjectPoint(
                x0, y0, x1, y1, x2, y2, x3, y3,
                x, y, null
            );
            return d <= _l / 2;
        }

        /**
         * ¶þ´Î±´Èû¶ûÇúÏßÃè±ß°üº¬ÅÐ¶Ï
         * @param  {number}  x0
         * @param  {number}  y0
         * @param  {number}  x1
         * @param  {number}  y1
         * @param  {number}  x2
         * @param  {number}  y2
         * @param  {number}  lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {boolean}
         */
        function isInsideQuadraticStroke(
            x0, y0, x1, y1, x2, y2,
            lineWidth, x, y
        ) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);
            // Quick reject
            if (
                (y > y0 + _l && y > y1 + _l && y > y2 + _l)
                || (y < y0 - _l && y < y1 - _l && y < y2 - _l)
                || (x > x0 + _l && x > x1 + _l && x > x2 + _l)
                || (x < x0 - _l && x < x1 - _l && x < x2 - _l)
            ) {
                return false;
            }
            var d =  curve.quadraticProjectPoint(
                x0, y0, x1, y1, x2, y2,
                x, y, null
            );
            return d <= _l / 2;
        }

        /**
         * Ô²»¡Ãè±ß°üº¬ÅÐ¶Ï
         * @param  {number}  cx
         * @param  {number}  cy
         * @param  {number}  r
         * @param  {number}  startAngle
         * @param  {number}  endAngle
         * @param  {boolean}  anticlockwise
         * @param  {number} lineWidth
         * @param  {number}  x
         * @param  {number}  y
         * @return {Boolean}
         */
        function isInsideArcStroke(
            cx, cy, r, startAngle, endAngle, anticlockwise,
            lineWidth, x, y
        ) {
            if (lineWidth === 0) {
                return false;
            }
            var _l = Math.max(lineWidth, 5);

            x -= cx;
            y -= cy;
            var d = Math.sqrt(x * x + y * y);
            if ((d - _l > r) || (d + _l < r)) {
                return false;
            }
            if (Math.abs(startAngle - endAngle) >= PI2) {
                // Is a circle
                return true;
            }
            if (anticlockwise) {
                var tmp = startAngle;
                startAngle = normalizeRadian(endAngle);
                endAngle = normalizeRadian(tmp);
            } else {
                startAngle = normalizeRadian(startAngle);
                endAngle = normalizeRadian(endAngle);
            }
            if (startAngle > endAngle) {
                endAngle += PI2;
            }
            
            var angle = Math.atan2(y, x);
            if (angle < 0) {
                angle += PI2;
            }
            return (angle >= startAngle && angle <= endAngle)
                || (angle + PI2 >= startAngle && angle + PI2 <= endAngle);
        }

        function isInsidePolyline(points, lineWidth, x, y) {
            var lineWidth = Math.max(lineWidth, 10);
            for (var i = 0, l = points.length - 1; i < l; i++) {
                var x0 = points[i][0];
                var y0 = points[i][1];
                var x1 = points[i + 1][0];
                var y1 = points[i + 1][1];

                if (isInsideLine(x0, y0, x1, y1, lineWidth, x, y)) {
                    return true;
                }
            }

            return false;
        }

        function isInsideRing(cx, cy, r0, r, x, y) {
            var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            return (d < r * r) && (d > r0 * r0);
        }

        /**
         * ¾ØÐÎ°üº¬ÅÐ¶Ï
         */
        function isInsideRect(x0, y0, width, height, x, y) {
            return x >= x0 && x <= (x0 + width)
                && y >= y0 && y <= (y0 + height);
        }

        /**
         * Ô²ÐÎ°üº¬ÅÐ¶Ï
         */
        function isInsideCircle(x0, y0, r, x, y) {
            return (x - x0) * (x - x0) + (y - y0) * (y - y0)
                   < r * r;
        }

        /**
         * ÉÈÐÎ°üº¬ÅÐ¶Ï
         */
        function isInsideSector(
            cx, cy, r0, r, startAngle, endAngle, anticlockwise, x, y
        ) {
            return isInsideArcStroke(
                cx, cy, (r0 + r) / 2, startAngle, endAngle, anticlockwise,
                r - r0, x, y
            );
        }

        /**
         * ¶à±ßÐÎ°üº¬ÅÐ¶Ï
         * Óë canvas Ò»Ñù²ÉÓÃ non-zero winding rule
         */
        function isInsidePolygon(points, x, y) {
            var N = points.length;
            var w = 0;

            for (var i = 0, j = N - 1; i < N; i++) {
                var x0 = points[j][0];
                var y0 = points[j][1];
                var x1 = points[i][0];
                var y1 = points[i][1];
                w += windingLine(x0, y0, x1, y1, x, y);
                j = i;
            }
            return w !== 0;
        }

        function windingLine(x0, y0, x1, y1, x, y) {
            if ((y > y0 && y > y1) || (y < y0 && y < y1)) {
                return 0;
            }
            if (y1 == y0) {
                return 0;
            }
            var dir = y1 < y0 ? 1 : -1;
            var t = (y - y0) / (y1 - y0);
            var x_ = t * (x1 - x0) + x0;

            return x_ > x ? dir : 0;
        }

        // ÁÙÊ±Êý×é
        var roots = [-1, -1, -1];
        var extrema = [-1, -1];

        function swapExtrema() {
            var tmp = extrema[0];
            extrema[0] = extrema[1];
            extrema[1] = tmp;
        }
        function windingCubic(x0, y0, x1, y1, x2, y2, x3, y3, x, y) {
            // Quick reject
            if (
                (y > y0 && y > y1 && y > y2 && y > y3)
                || (y < y0 && y < y1 && y < y2 && y < y3)
            ) {
                return 0;
            }
            var nRoots = curve.cubicRootAt(y0, y1, y2, y3, y, roots);
            if (nRoots === 0) {
                return 0;
            }
            else {
                var w = 0;
                var nExtrema = -1;
                var y0_, y1_;
                for (var i = 0; i < nRoots; i++) {
                    var t = roots[i];
                    var x_ = curve.cubicAt(x0, x1, x2, x3, t);
                    if (x_ < x) { // Quick reject
                        continue;
                    }
                    if (nExtrema < 0) {
                        nExtrema = curve.cubicExtrema(y0, y1, y2, y3, extrema);
                        if (extrema[1] < extrema[0] && nExtrema > 1) {
                            swapExtrema();
                        }
                        y0_ = curve.cubicAt(y0, y1, y2, y3, extrema[0]);
                        if (nExtrema > 1) {
                            y1_ = curve.cubicAt(y0, y1, y2, y3, extrema[1]);
                        }
                    }
                    if (nExtrema == 2) {
                        // ·Ö³ÉÈý¶Îµ¥µ÷º¯Êý
                        if (t < extrema[0]) {
                            w += y0_ < y0 ? 1 : -1;
                        } 
                        else if (t < extrema[1]) {
                            w += y1_ < y0_ ? 1 : -1;
                        } 
                        else {
                            w += y3 < y1_ ? 1 : -1;
                        }
                    } 
                    else {
                        // ·Ö³ÉÁ½¶Îµ¥µ÷º¯Êý
                        if (t < extrema[0]) {
                            w += y0_ < y0 ? 1 : -1;
                        } 
                        else {
                            w += y3 < y0_ ? 1 : -1;
                        }
                    }
                }
                return w;
            }
        }

        function windingQuadratic(x0, y0, x1, y1, x2, y2, x, y) {
            // Quick reject
            if (
                (y > y0 && y > y1 && y > y2)
                || (y < y0 && y < y1 && y < y2)
            ) {
                return 0;
            }
            var nRoots = curve.quadraticRootAt(y0, y1, y2, y, roots);
            if (nRoots === 0) {
                return 0;
            } 
            else {
                var t = curve.quadraticExtremum(y0, y1, y2);
                if (t >=0 && t <= 1) {
                    var w = 0;
                    var y_ = curve.quadraticAt(y0, y1, y2, t);
                    for (var i = 0; i < nRoots; i++) {
                        var x_ = curve.quadraticAt(x0, x1, x2, roots[i]);
                        if (x_ < x) {
                            continue;
                        }
                        if (roots[i] < t) {
                            w += y_ < y0 ? 1 : -1;
                        } 
                        else {
                            w += y2 < y_ ? 1 : -1;
                        }
                    }
                    return w;
                } 
                else {
                    var x_ = curve.quadraticAt(x0, x1, x2, roots[0]);
                    if (x_ < x) {
                        return 0;
                    }
                    return y2 < y0 ? 1 : -1;
                }
            }
        }
        
        // TODO
        // Arc Ðý×ª
        function windingArc(
            cx, cy, r, startAngle, endAngle, anticlockwise, x, y
        ) {
            y -= cy;
            if (y > r || y < -r) {
                return 0;
            }
            var tmp = Math.sqrt(r * r - y * y);
            roots[0] = -tmp;
            roots[1] = tmp;

            if (Math.abs(startAngle - endAngle) >= PI2) {
                // Is a circle
                startAngle = 0;
                endAngle = PI2;
                var dir = anticlockwise ? 1 : -1;
                if (x >= roots[0] + cx && x <= roots[1] + cx) {
                    return dir;
                } else {
                    return 0;
                }
            }

            if (anticlockwise) {
                var tmp = startAngle;
                startAngle = normalizeRadian(endAngle);
                endAngle = normalizeRadian(tmp);   
            } else {
                startAngle = normalizeRadian(startAngle);
                endAngle = normalizeRadian(endAngle);   
            }
            if (startAngle > endAngle) {
                endAngle += PI2;
            }

            var w = 0;
            for (var i = 0; i < 2; i++) {
                var x_ = roots[i];
                if (x_ + cx > x) {
                    var angle = Math.atan2(y, x_);
                    var dir = anticlockwise ? 1 : -1;
                    if (angle < 0) {
                        angle = PI2 + angle;
                    }
                    if (
                        (angle >= startAngle && angle <= endAngle)
                        || (angle + PI2 >= startAngle && angle + PI2 <= endAngle)
                    ) {
                        if (angle > Math.PI / 2 && angle < Math.PI * 1.5) {
                            dir = -dir;
                        }
                        w += dir;
                    }
                }
            }
            return w;
        }

        /**
         * Â·¾¶°üº¬ÅÐ¶Ï
         * Óë canvas Ò»Ñù²ÉÓÃ non-zero winding rule
         */
        function isInsidePath(pathArray, lineWidth, brushType, x, y) {
            var w = 0;
            var xi = 0;
            var yi = 0;
            var x0 = 0;
            var y0 = 0;
            var beginSubpath = true;
            var firstCmd = true;

            brushType = brushType || 'fill';

            var hasStroke = brushType === 'stroke' || brushType === 'both';
            var hasFill = brushType === 'fill' || brushType === 'both';

            // var roots = [-1, -1, -1];
            for (var i = 0; i < pathArray.length; i++) {
                var seg = pathArray[i];
                var p = seg.points;
                // Begin a new subpath
                if (beginSubpath || seg.command === 'M') {
                    if (i > 0) {
                        // Close previous subpath
                        if (hasFill) {
                            w += windingLine(xi, yi, x0, y0, x, y);
                        }
                        if (w !== 0) {
                            return true;
                        }
                    }
                    x0 = p[p.length - 2];
                    y0 = p[p.length - 1];
                    beginSubpath = false;
                    if (firstCmd && seg.command !== 'A') {
                        // Èç¹ûµÚÒ»¸öÃüÁî²»ÊÇM, ÊÇlineTo, bezierCurveTo
                        // µÈ»æÖÆÃüÁîµÄ»°£¬ÊÇ»á´Ó¸Ã»æÖÆµÄÆðµã¿ªÊ¼ËãµÄ
                        // Arc »áÔÚÖ®ºó×öµ¥¶À´¦ÀíËùÒÔÕâÀïºöÂÔ
                        firstCmd = false;
                        xi = x0;
                        yi = y0;
                    }
                }
                switch (seg.command) {
                    case 'M':
                        xi = p[0];
                        yi = p[1];
                        break;
                    case 'L':
                        if (hasStroke) {
                            if (isInsideLine(
                                xi, yi, p[0], p[1], lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingLine(xi, yi, p[0], p[1], x, y);
                        }
                        xi = p[0];
                        yi = p[1];
                        break;
                    case 'C':
                        if (hasStroke) {
                            if (isInsideCubicStroke(
                                xi, yi, p[0], p[1], p[2], p[3], p[4], p[5],
                                lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingCubic(
                                xi, yi, p[0], p[1], p[2], p[3], p[4], p[5], x, y
                            );
                        }
                        xi = p[4];
                        yi = p[5];
                        break;
                    case 'Q':
                        if (hasStroke) {
                            if (isInsideQuadraticStroke(
                                xi, yi, p[0], p[1], p[2], p[3],
                                lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingQuadratic(
                                xi, yi, p[0], p[1], p[2], p[3], x, y
                            );
                        }
                        xi = p[2];
                        yi = p[3];
                        break;
                    case 'A':
                        // TODO Arc Ðý×ª
                        // TODO Arc ÅÐ¶ÏµÄ¿ªÏú±È½Ï´ó
                        var cx = p[0];
                        var cy = p[1];
                        var rx = p[2];
                        var ry = p[3];
                        var theta = p[4];
                        var dTheta = p[5];
                        var x1 = Math.cos(theta) * rx + cx;
                        var y1 = Math.sin(theta) * ry + cy;
                        // ²»ÊÇÖ±½ÓÊ¹ÓÃ arc ÃüÁî
                        if (!firstCmd) {
                            w += windingLine(xi, yi, x1, y1);
                        } else {
                            firstCmd = false;
                            // µÚÒ»¸öÃüÁîÆðµã»¹Î´¶¨Òå
                            x0 = x1;
                            y0 = y1;
                        }
                        // zr Ê¹ÓÃscaleÀ´Ä£ÄâÍÖÔ², ÕâÀïÒ²¶Ôx×öÒ»¶¨µÄËõ·Å
                        var _x = (x - cx) * ry / rx + cx;
                        if (hasStroke) {
                            if (isInsideArcStroke(
                                cx, cy, ry, theta, theta + dTheta, 1 - p[7],
                                lineWidth, _x, y
                            )) {
                                return true;
                            }
                        }
                        if (hasFill) {
                            w += windingArc(
                                cx, cy, ry, theta, theta + dTheta, 1 - p[7],
                                _x, y
                            );
                        }
                        xi = Math.cos(theta + dTheta) * rx + cx;
                        yi = Math.sin(theta + dTheta) * ry + cy;
                        break;
                    case 'z':
                        if (hasStroke) {
                            if (isInsideLine(
                                xi, yi, x0, y0, lineWidth, x, y
                            )) {
                                return true;
                            }
                        }
                        beginSubpath = true;
                        break;
                }
            }
            if (hasFill) {
                w += windingLine(xi, yi, x0, y0, x, y);
            }
            return w !== 0;
        }

        /**
         * ²âËã¶àÐÐÎÄ±¾¿í¶È
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextWidth(text, textFont) {
            var key = text + ':' + textFont;
            if (_textWidthCache[key]) {
                return _textWidthCache[key];
            }
            _ctx = _ctx || util.getContext();
            _ctx.save();

            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            var width = 0;
            for (var i = 0, l = text.length; i < l; i++) {
                width =  Math.max(
                    _ctx.measureText(text[i]).width,
                    width
                );
            }
            _ctx.restore();

            _textWidthCache[key] = width;
            if (++_textWidthCacheCounter > TEXT_CACHE_MAX) {
                // ÄÚ´æÊÍ·Å
                _textWidthCacheCounter = 0;
                _textWidthCache = {};
            }
            
            return width;
        }
        
        /**
         * ²âËã¶àÐÐÎÄ±¾¸ß¶È
         * @param {Object} text
         * @param {Object} textFont
         */
        function getTextHeight(text, textFont) {
            var key = text + ':' + textFont;
            if (_textHeightCache[key]) {
                return _textHeightCache[key];
            }
            
            _ctx = _ctx || util.getContext();

            _ctx.save();
            if (textFont) {
                _ctx.font = textFont;
            }
            
            text = (text + '').split('\n');
            // ±È½Ï´Ö±©
            var height = (_ctx.measureText('¹ú').width + 2) * text.length;

            _ctx.restore();

            _textHeightCache[key] = height;
            if (++_textHeightCacheCounter > TEXT_CACHE_MAX) {
                // ÄÚ´æÊÍ·Å
                _textHeightCacheCounter = 0;
                _textHeightCache = {};
            }
            return height;
        }

        return {
            isInside : isInside,
            isOutside : isOutside,
            getTextWidth : getTextWidth,
            getTextHeight : getTextHeight,

            isInsidePath: isInsidePath,
            isInsidePolygon: isInsidePolygon,
            isInsideSector: isInsideSector,
            isInsideCircle: isInsideCircle,
            isInsideLine: isInsideLine,
            isInsideRect: isInsideRect,
            isInsidePolyline: isInsidePolyline,

            isInsideCubicStroke: isInsideCubicStroke,
            isInsideQuadraticStroke: isInsideQuadraticStroke
        };
    });
define('echarts/component/base', ['require', '../config', '../util/ecData', '../util/ecQuery', '../util/number', 'zrender/tool/util', 'zrender/tool/env'], function (require) {
    var ecConfig = require('../config');
    var ecData = require('../util/ecData');
    var ecQuery = require('../util/ecQuery');
    var number = require('../util/number');
    var zrUtil = require('zrender/tool/util');
    
    function Base(ecTheme, messageCenter, zr, option, myChart){
        this.ecTheme = ecTheme;
        this.messageCenter = messageCenter;
        this.zr =zr;
        this.option = option;
        this.series = option.series;
        this.myChart = myChart;
        this.component = myChart.component;

        this.shapeList = [];
        this.effectList = [];
        
        var self = this;
        
        self._onlegendhoverlink = function(param) {
            if (self.legendHoverLink) {
                var targetName = param.target;
                var name;
                for (var i = self.shapeList.length - 1; i >= 0; i--) {
                    name = self.type == ecConfig.CHART_TYPE_PIE
                           || self.type == ecConfig.CHART_TYPE_FUNNEL
                           ? ecData.get(self.shapeList[i], 'name')
                           : (ecData.get(self.shapeList[i], 'series') || {}).name;
                    if (name == targetName 
                        && !self.shapeList[i].invisible 
                        && !self.shapeList[i].__animating
                    ) {
                        self.zr.addHoverShape(self.shapeList[i]);
                    }
                }
            }
        };
        messageCenter && messageCenter.bind(
            ecConfig.EVENT.LEGEND_HOVERLINK, this._onlegendhoverlink
        );
    }

    /**
     * »ùÀà·½·¨
     */
    Base.prototype = {
        canvasSupported: require('zrender/tool/env').canvasSupported,
        _getZ : function(zWhat) {
            if (this[zWhat] != null) {
                return this[zWhat];
            }
            var opt = this.ecTheme[this.type];
            if (opt && opt[zWhat] != null) {
                return opt[zWhat];
            }
            opt = ecConfig[this.type];
            if (opt && opt[zWhat] != null) {
                return opt[zWhat];
            }
            return 0;
        },

        /**
         * »ñÈ¡zlevel»ùÊýÅäÖÃ
         */
        getZlevelBase: function () {
            return this._getZ('zlevel');
        },
        
        /**
         * »ñÈ¡z»ùÊýÅäÖÃ
         */
        getZBase: function() {
            return this._getZ('z');
        },

        /**
         * ²ÎÊýÐÞÕý&Ä¬ÈÏÖµ¸³Öµ
         * @param {Object} opt ²ÎÊý
         *
         * @return {Object} ÐÞÕýºóµÄ²ÎÊý
         */
        reformOption: function (opt) {
            // Ä¬ÈÏÅäÖÃÏî¶¯Ì¬¶à¼¶ºÏ²¢£¬ÒÀÀµ¼ÓÔØµÄ×é¼þÑ¡ÏîÎ´±»mergeµ½ecThemeÀï£¬ÐèÒª´ÓconfigÀïÈ¡
            opt = zrUtil.merge(
                       zrUtil.merge(
                           opt || {},
                           zrUtil.clone(this.ecTheme[this.type] || {})
                       ),
                       zrUtil.clone(ecConfig[this.type] || {})
                   );
            this.z = opt.z;
            this.zlevel = opt.zlevel;
            return opt;
        },
        
        /**
         * cssÀàÊôÐÔÊý×é²¹È«£¬Èçpadding£¬marginµÈ~
         */
        reformCssArray: function (p) {
            if (p instanceof Array) {
                switch (p.length + '') {
                    case '4':
                        return p;
                    case '3':
                        return [p[0], p[1], p[2], p[1]];
                    case '2':
                        return [p[0], p[1], p[0], p[1]];
                    case '1':
                        return [p[0], p[0], p[0], p[0]];
                    case '0':
                        return [0, 0, 0, 0];
                }
            }
            else {
                return [p, p, p, p];
            }
        },
        
        getShapeById: function(id) {
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].id === id) {
                    return this.shapeList[i];
                }
            }
            return null;
        },
        
        /**
         * »ñÈ¡×Ô¶¨ÒåºÍÄ¬ÈÏÅäÖÃºÏ²¢ºóµÄ×ÖÌåÉèÖÃ
         */
        getFont: function (textStyle) {
            var finalTextStyle = this.getTextStyle(
                zrUtil.clone(textStyle)
            );
            return finalTextStyle.fontStyle + ' '
                   + finalTextStyle.fontWeight + ' '
                   + finalTextStyle.fontSize + 'px '
                   + finalTextStyle.fontFamily;
        },

        /**
         * »ñÈ¡Í³Ò»Ö÷Ìâ×ÖÌåÑùÊ½
         */
        getTextStyle: function(targetStyle) {
            return zrUtil.merge(
                       zrUtil.merge(
                           targetStyle || {},
                           this.ecTheme.textStyle
                       ),
                       ecConfig.textStyle
                   );
        },
        
        getItemStyleColor: function (itemColor, seriesIndex, dataIndex, data) {
            return typeof itemColor === 'function'
                   ? itemColor.call(
                        this.myChart,
                        {
                            seriesIndex: seriesIndex,
                            series: this.series[seriesIndex],
                            dataIndex: dataIndex,
                            data: data
                        }
                   )
                   : itemColor;
            
        }, 

        /**
         * @parmas {object | number} data Ä¿±êdata
         * @params {string= | number=} defaultData ÎÞÊý¾ÝÊ±Ä¬ÈÏ·µ»Ø
         */
        getDataFromOption: function (data, defaultData) {
            return data != null ? (data.value != null ? data.value : data) : defaultData;
        },
        
        // ÑÇÏñËØÓÅ»¯
        subPixelOptimize: function (position, lineWidth) {
            if (lineWidth % 2 === 1) {
                //position += position === Math.ceil(position) ? 0.5 : 0;
                position = Math.floor(position) + 0.5;
            }
            else {
                position = Math.round(position);
            }
            return position;
        },
        
        // Ä¬ÈÏresize
        resize: function () {
            this.refresh && this.refresh();
            this.clearEffectShape && this.clearEffectShape(true);
            var self = this;
            setTimeout(function(){
                self.animationEffect && self.animationEffect();
            },200);
        },

        /**
         * Çå³ýÍ¼ÐÎÊý¾Ý£¬ÊµÀýÈÔ¿ÉÓÃ
         */
        clear :function () {
            this.clearEffectShape && this.clearEffectShape();
            this.zr && this.zr.delShape(this.shapeList);
            this.shapeList = [];
        },

        /**
         * ÊÍ·ÅºóÊµÀý²»¿ÉÓÃ
         */
        dispose: function () {
            this.onbeforDispose && this.onbeforDispose();
            this.clear();
            this.shapeList = null;
            this.effectList = null;
            this.messageCenter && this.messageCenter.unbind(
                ecConfig.EVENT.LEGEND_HOVERLINK, this._onlegendhoverlink
            );
            this.onafterDispose && this.onafterDispose();
        },
        
        query: ecQuery.query,
        deepQuery: ecQuery.deepQuery,
        deepMerge: ecQuery.deepMerge,
        
        parsePercent: number.parsePercent,
        parseCenter: number.parseCenter,
        parseRadius: number.parseRadius,
        numAddCommas: number.addCommas,

        getPrecision: number.getPrecision
    };
    
    return Base;
});
define('zrender/shape/Base', ['require', '../tool/matrix', '../tool/guid', '../tool/util', '../tool/log', '../mixin/Transformable', '../mixin/Eventful', '../tool/area', '../tool/color'], function (require) {
        var vmlCanvasManager = window['G_vmlCanvasManager'];

        var matrix = require('../tool/matrix');
        var guid = require('../tool/guid');
        var util = require('../tool/util');
        var log = require('../tool/log');

        var Transformable = require('../mixin/Transformable');
        var Eventful = require('../mixin/Eventful');

        function _fillText(ctx, text, x, y, textFont, textAlign, textBaseline) {
            if (textFont) {
                ctx.font = textFont;
            }
            ctx.textAlign = textAlign;
            ctx.textBaseline = textBaseline;
            var rect = _getTextRect(
                text, x, y, textFont, textAlign, textBaseline
            );
            
            text = (text + '').split('\n');
            var lineHeight = require('../tool/area').getTextHeight('¹ú', textFont);
            
            switch (textBaseline) {
                case 'top':
                    y = rect.y;
                    break;
                case 'bottom':
                    y = rect.y + lineHeight;
                    break;
                default:
                    y = rect.y + lineHeight / 2;
            }
            
            for (var i = 0, l = text.length; i < l; i++) {
                ctx.fillText(text[i], x, y);
                y += lineHeight;
            }
        }

        /**
         * ·µ»Ø¾ØÐÎÇøÓò£¬ÓÃÓÚ¾Ö²¿Ë¢ÐÂºÍÎÄ×Ö¶¨Î»
         * @inner
         * @param {string} text
         * @param {number} x
         * @param {number} y
         * @param {string} textFont
         * @param {string} textAlign
         * @param {string} textBaseline
         */
        function _getTextRect(text, x, y, textFont, textAlign, textBaseline) {
            var area = require('../tool/area');
            var width = area.getTextWidth(text, textFont);
            var lineHeight = area.getTextHeight('¹ú', textFont);
            
            text = (text + '').split('\n');
            
            switch (textAlign) {
                case 'end':
                case 'right':
                    x -= width;
                    break;
                case 'center':
                    x -= (width / 2);
                    break;
            }

            switch (textBaseline) {
                case 'top':
                    break;
                case 'bottom':
                    y -= lineHeight * text.length;
                    break;
                default:
                    y -= lineHeight * text.length / 2;
            }

            return {
                x : x,
                y : y,
                width : width,
                height : lineHeight * text.length
            };
        }

        /**
         * @alias module:zrender/shape/Base
         * @constructor
         * @extends module:zrender/mixin/Transformable
         * @extends module:zrender/mixin/Eventful
         * @param {Object} options ¹ØÓÚshapeµÄÅäÖÃÏî£¬¿ÉÒÔÊÇshapeµÄ×ÔÓÐÊôÐÔ£¬Ò²¿ÉÒÔÊÇ×Ô¶¨ÒåµÄÊôÐÔ¡£
         */
        var Base = function(options) {
            
            options = options || {};
            
            /**
             * Shape id, È«¾ÖÎ¨Ò»
             * @type {string}
             */
            this.id = options.id || guid();

            for (var key in options) {
                this[key] = options[key];
            }

            /**
             * »ù´¡»æÖÆÑùÊ½
             * @type {module:zrender/shape/Base~IBaseShapeStyle}
             */
            this.style = this.style || {};

            /**
             * ¸ßÁÁÑùÊ½
             * @type {module:zrender/shape/Base~IBaseShapeStyle}
             */
            this.highlightStyle = this.highlightStyle || null;

            /**
             * ¸¸½Úµã
             * @readonly
             * @type {module:zrender/Group}
             * @default null
             */
            this.parent = null;

            this.__dirty = true;

            this.__clipShapes = [];

            Transformable.call(this);
            Eventful.call(this);
        };
        /**
         * Í¼ÐÎÊÇ·ñ¿É¼û£¬ÎªtrueÊ±²»»æÖÆÍ¼ÐÎ£¬µ«ÊÇÈÔÄÜ´¥·¢Êó±êÊÂ¼þ
         * @name module:zrender/shape/Base#invisible
         * @type {boolean}
         * @default false
         */
        Base.prototype.invisible = false;

        /**
         * Í¼ÐÎÊÇ·ñºöÂÔ£¬ÎªtrueÊ±ºöÂÔÍ¼ÐÎµÄ»æÖÆÒÔ¼°ÊÂ¼þ´¥·¢
         * @name module:zrender/shape/Base#ignore
         * @type {boolean}
         * @default false
         */
        Base.prototype.ignore = false;

        /**
         * z²ãlevel£¬¾ö¶¨»æ»­ÔÚÄÄ²ãcanvasÖÐ
         * @name module:zrender/shape/Base#zlevel
         * @type {number}
         * @default 0
         */
        Base.prototype.zlevel = 0;

        /**
         * ÊÇ·ñ¿ÉÍÏ×§
         * @name module:zrender/shape/Base#draggable
         * @type {boolean}
         * @default false
         */
        Base.prototype.draggable = false;

        /**
         * ÊÇ·ñ¿Éµã»÷
         * @name module:zrender/shape/Base#clickable
         * @type {boolean}
         * @default false
         */
        Base.prototype.clickable = false;

        /**
         * ÊÇ·ñ¿ÉÒÔhover
         * @name module:zrender/shape/Base#hoverable
         * @type {boolean}
         * @default true
         */
        Base.prototype.hoverable = true;
        
        /**
         * zÖµ£¬¸úzlevelÒ»ÑùÓ°Ïìshape»æÖÆµÄÇ°ºóË³Ðò£¬zÖµ´óµÄshape»á¸²¸ÇÔÚzÖµÐ¡µÄÉÏÃæ£¬
         * µ«ÊÇ²¢²»»á´´½¨ÐÂµÄcanvas£¬ËùÒÔÓÅÏÈ¼¶µÍÓÚzlevel£¬¶øÇÒÆµ·±¸Ä¶¯µÄ¿ªÏú±ÈzlevelÐ¡ºÜ¶à¡£
         * 
         * @name module:zrender/shape/Base#z
         * @type {number}
         * @default 0
         */
        Base.prototype.z = 0;

        /**
         * »æÖÆÍ¼ÐÎ
         * 
         * @param {CanvasRenderingContext2D} ctx
         * @param {boolean} [isHighlight=false] ÊÇ·ñÊ¹ÓÃ¸ßÁÁÊôÐÔ
         * @param {Function} [updateCallback]
         *        ÐèÒªÒì²½¼ÓÔØ×ÊÔ´µÄshape¿ÉÒÔÍ¨¹ýÕâ¸öcallback(e), 
         *        ÈÃpainter¸üÐÂÊÓÍ¼£¬base.brushÃ»ÓÃ£¬ÐèÒªµÄ»°ÖØÔØbrush
         */
        Base.prototype.brush = function (ctx, isHighlight) {

            var style = this.beforeBrush(ctx, isHighlight);

            ctx.beginPath();
            this.buildPath(ctx, style);

            switch (style.brushType) {
                /* jshint ignore:start */
                case 'both':
                    ctx.fill();
                case 'stroke':
                    style.lineWidth > 0 && ctx.stroke();
                    break;
                /* jshint ignore:end */
                default:
                    ctx.fill();
            }
            
            this.drawText(ctx, style, this.style);

            this.afterBrush(ctx);
        };

        /**
         * ¾ßÌå»æÖÆ²Ù×÷Ç°µÄÒ»Ð©¹«¹²²Ù×÷
         * @param {CanvasRenderingContext2D} ctx
         * @param {boolean} [isHighlight=false] ÊÇ·ñÊ¹ÓÃ¸ßÁÁÊôÐÔ
         * @return {Object} ´¦ÀíºóµÄÑùÊ½
         */
        Base.prototype.beforeBrush = function (ctx, isHighlight) {
            var style = this.style;
            
            if (this.brushTypeOnly) {
                style.brushType = this.brushTypeOnly;
            }

            if (isHighlight) {
                // ¸ù¾ÝstyleÀ©Õ¹Ä¬ÈÏ¸ßÁÁÑùÊ½
                style = this.getHighlightStyle(
                    style,
                    this.highlightStyle || {},
                    this.brushTypeOnly
                );
            }

            if (this.brushTypeOnly == 'stroke') {
                style.strokeColor = style.strokeColor || style.color;
            }

            ctx.save();

            this.doClip(ctx);

            this.setContext(ctx, style);

            // ÉèÖÃtransform
            this.setTransform(ctx);

            return style;
        };

        /**
         * »æÖÆºóµÄ´¦Àí
         * @param {CanvasRenderingContext2D} ctx
         */
        Base.prototype.afterBrush = function (ctx) {
            ctx.restore();
        };

        var STYLE_CTX_MAP = [
            [ 'color', 'fillStyle' ],
            [ 'strokeColor', 'strokeStyle' ],
            [ 'opacity', 'globalAlpha' ],
            [ 'lineCap', 'lineCap' ],
            [ 'lineJoin', 'lineJoin' ],
            [ 'miterLimit', 'miterLimit' ],
            [ 'lineWidth', 'lineWidth' ],
            [ 'shadowBlur', 'shadowBlur' ],
            [ 'shadowColor', 'shadowColor' ],
            [ 'shadowOffsetX', 'shadowOffsetX' ],
            [ 'shadowOffsetY', 'shadowOffsetY' ]
        ];

        /**
         * ÉèÖÃ fillStyle, strokeStyle, shadow µÈÍ¨ÓÃ»æÖÆÑùÊ½
         * @param {CanvasRenderingContext2D} ctx
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style
         */
        Base.prototype.setContext = function (ctx, style) {
            for (var i = 0, len = STYLE_CTX_MAP.length; i < len; i++) {
                var styleProp = STYLE_CTX_MAP[i][0];
                var styleValue = style[styleProp];
                var ctxProp = STYLE_CTX_MAP[i][1];

                if (typeof styleValue != 'undefined') {
                    ctx[ctxProp] = styleValue;
                }
            }
        };

        var clipShapeInvTransform = matrix.create();
        Base.prototype.doClip = function (ctx) {
            if (this.__clipShapes && !vmlCanvasManager) {
                for (var i = 0; i < this.__clipShapes.length; i++) {
                    var clipShape = this.__clipShapes[i];
                    if (clipShape.needTransform) {
                        var m = clipShape.transform;
                        matrix.invert(clipShapeInvTransform, m);
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                    ctx.beginPath();
                    clipShape.buildPath(ctx, clipShape.style);
                    ctx.clip();
                    // Transform back
                    if (clipShape.needTransform) {
                        var m = clipShapeInvTransform;
                        ctx.transform(
                            m[0], m[1],
                            m[2], m[3],
                            m[4], m[5]
                        );
                    }
                }
            }
        };
    
        /**
         * ¸ù¾ÝÄ¬ÈÏÑùÊ½À©Õ¹¸ßÁÁÑùÊ½
         * 
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style Ä¬ÈÏÑùÊ½
         * @param {module:zrender/shape/Base~IBaseShapeStyle} highlightStyle ¸ßÁÁÑùÊ½
         * @param {string} brushTypeOnly
         */
        Base.prototype.getHighlightStyle = function (style, highlightStyle, brushTypeOnly) {
            var newStyle = {};
            for (var k in style) {
                newStyle[k] = style[k];
            }

            var color = require('../tool/color');
            var highlightColor = color.getHighlightColor();
            // ¸ù¾ÝhighlightStyleÀ©Õ¹
            if (style.brushType != 'stroke') {
                // ´øÌî³äÔòÓÃ¸ßÁÁÉ«¼Ó´Ö±ßÏß
                newStyle.strokeColor = highlightColor;
                newStyle.lineWidth = (style.lineWidth || 1)
                                      + this.getHighlightZoom();
                newStyle.brushType = 'both';
            }
            else {
                if (brushTypeOnly != 'stroke') {
                    // Ãè±ßÐÍµÄÔòÓÃÔ­É«¼Ó¹¤¸ßÁÁ
                    newStyle.strokeColor = highlightColor;
                    newStyle.lineWidth = (style.lineWidth || 1)
                                          + this.getHighlightZoom();
                } 
                else {
                    // ÏßÐÍµÄÔòÓÃÔ­É«¼Ó¹¤¸ßÁÁ
                    newStyle.strokeColor = highlightStyle.strokeColor
                                           || color.mix(
                                                 style.strokeColor,
                                                 color.toRGB(highlightColor)
                                              );
                }
            }

            // ¿É×Ô¶¨Òå¸²¸ÇÄ¬ÈÏÖµ
            for (var k in highlightStyle) {
                if (typeof highlightStyle[k] != 'undefined') {
                    newStyle[k] = highlightStyle[k];
                }
            }

            return newStyle;
        };

        // ¸ßÁÁ·Å´óÐ§¹û²ÎÊý
        // µ±Ç°Í³Ò»ÉèÖÃÎª6£¬ÈçÓÐÐèÒª²îÒìÉèÖÃ£¬Í¨¹ýthis.typeÅÐ¶ÏÊµÀýÀàÐÍ
        Base.prototype.getHighlightZoom = function () {
            return this.type != 'text' ? 6 : 2;
        };

        /**
         * ÒÆ¶¯Î»ÖÃ
         * @param {number} dx ºá×ø±ê±ä»¯
         * @param {number} dy ×Ý×ø±ê±ä»¯
         */
        Base.prototype.drift = function (dx, dy) {
            this.position[0] += dx;
            this.position[1] += dy;
        };

        /**
         * ¹¹½¨»æÖÆµÄPath
         * @param {CanvasRenderingContext2D} ctx
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style
         */
        Base.prototype.buildPath = function (ctx, style) {
            log('buildPath not implemented in ' + this.type);
        };

        /**
         * ¼ÆËã·µ»Ø°üÎ§ºÐ¾ØÐÎ
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style
         * @return {module:zrender/shape/Base~IBoundingRect}
         */
        Base.prototype.getRect = function (style) {
            log('getRect not implemented in ' + this.type);   
        };
        
        /**
         * ÅÐ¶ÏÊó±êÎ»ÖÃÊÇ·ñÔÚÍ¼ÐÎÄÚ
         * @param {number} x
         * @param {number} y
         * @return {boolean}
         */
        Base.prototype.isCover = function (x, y) {
            var originPos = this.transformCoordToLocal(x, y);
            x = originPos[0];
            y = originPos[1];

            // ¿ìËÙÔ¤ÅÐ²¢±£ÁôÅÐ¶Ï¾ØÐÎ
            if (this.isCoverRect(x, y)) {
                // ¾ØÐÎÄÚ
                return require('../tool/area').isInside(this, this.style, x, y);
            }
            
            return false;
        };

        Base.prototype.isCoverRect = function (x, y) {
            // ¿ìËÙÔ¤ÅÐ²¢±£ÁôÅÐ¶Ï¾ØÐÎ
            var rect = this.style.__rect;
            if (!rect) {
                rect = this.style.__rect = this.getRect(this.style);
            }
            return x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height);
        };

        /**
         * »æÖÆ¸½¼ÓÎÄ±¾
         * @param {CanvasRenderingContext2D} ctx
         * @param {module:zrender/shape/Base~IBaseShapeStyle} style ÑùÊ½
         * @param {module:zrender/shape/Base~IBaseShapeStyle} normalStyle Ä¬ÈÏÑùÊ½£¬ÓÃÓÚ¶¨Î»ÎÄ×ÖÏÔÊ¾
         */
        Base.prototype.drawText = function (ctx, style, normalStyle) {
            if (typeof(style.text) == 'undefined' || style.text === false) {
                return;
            }
            // ×ÖÌåÑÕÉ«²ßÂÔ
            var textColor = style.textColor || style.color || style.strokeColor;
            ctx.fillStyle = textColor;

            // ÎÄ±¾ÓëÍ¼ÐÎ¼ä¿Õ°×¼äÏ¶
            var dd = 10;
            var al;         // ÎÄ±¾Ë®Æ½¶ÔÆë
            var bl;         // ÎÄ±¾´¹Ö±¶ÔÆë
            var tx;         // ÎÄ±¾ºá×ø±ê
            var ty;         // ÎÄ±¾×Ý×ø±ê

            var textPosition = style.textPosition       // ÓÃ»§¶¨Òå
                               || this.textPosition     // shapeÄ¬ÈÏ
                               || 'top';                // È«¾ÖÄ¬ÈÏ

            switch (textPosition) {
                case 'inside': 
                case 'top': 
                case 'bottom': 
                case 'left': 
                case 'right': 
                    if (this.getRect) {
                        var rect = (normalStyle || style).__rect
                                   || this.getRect(normalStyle || style);

                        switch (textPosition) {
                            case 'inside':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y + rect.height / 2;
                                al = 'center';
                                bl = 'middle';
                                if (style.brushType != 'stroke'
                                    && textColor == style.color
                                ) {
                                    ctx.fillStyle = '#fff';
                                }
                                break;
                            case 'left':
                                tx = rect.x - dd;
                                ty = rect.y + rect.height / 2;
                                al = 'end';
                                bl = 'middle';
                                break;
                            case 'right':
                                tx = rect.x + rect.width + dd;
                                ty = rect.y + rect.height / 2;
                                al = 'start';
                                bl = 'middle';
                                break;
                            case 'top':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y - dd;
                                al = 'center';
                                bl = 'bottom';
                                break;
                            case 'bottom':
                                tx = rect.x + rect.width / 2;
                                ty = rect.y + rect.height + dd;
                                al = 'center';
                                bl = 'top';
                                break;
                        }
                    }
                    break;
                case 'start':
                case 'end':
                    var pointList = style.pointList
                                    || [
                                        [style.xStart || 0, style.yStart || 0],
                                        [style.xEnd || 0, style.yEnd || 0]
                                    ];
                    var length = pointList.length;
                    if (length < 2) {
                        // ÉÙÓÚ2¸öµã¾Í²»»­ÁË~
                        return;
                    }
                    var xStart;
                    var xEnd;
                    var yStart;
                    var yEnd;
                    switch (textPosition) {
                        case 'start':
                            xStart = pointList[1][0];
                            xEnd = pointList[0][0];
                            yStart = pointList[1][1];
                            yEnd = pointList[0][1];
                            break;
                        case 'end':
                            xStart = pointList[length - 2][0];
                            xEnd = pointList[length - 1][0];
                            yStart = pointList[length - 2][1];
                            yEnd = pointList[length - 1][1];
                            break;
                    }
                    tx = xEnd;
                    ty = yEnd;
                    
                    var angle = Math.atan((yStart - yEnd) / (xEnd - xStart)) / Math.PI * 180;
                    if ((xEnd - xStart) < 0) {
                        angle += 180;
                    }
                    else if ((yStart - yEnd) < 0) {
                        angle += 360;
                    }
                    
                    dd = 5;
                    if (angle >= 30 && angle <= 150) {
                        al = 'center';
                        bl = 'bottom';
                        ty -= dd;
                    }
                    else if (angle > 150 && angle < 210) {
                        al = 'right';
                        bl = 'middle';
                        tx -= dd;
                    }
                    else if (angle >= 210 && angle <= 330) {
                        al = 'center';
                        bl = 'top';
                        ty += dd;
                    }
                    else {
                        al = 'left';
                        bl = 'middle';
                        tx += dd;
                    }
                    break;
                case 'specific':
                    tx = style.textX || 0;
                    ty = style.textY || 0;
                    al = 'start';
                    bl = 'middle';
                    break;
            }

            if (tx != null && ty != null) {
                _fillText(
                    ctx,
                    style.text, 
                    tx, ty, 
                    style.textFont,
                    style.textAlign || al,
                    style.textBaseline || bl
                );
            }
        };

        Base.prototype.modSelf = function() {
            this.__dirty = true;
            if (this.style) {
                this.style.__rect = null;
            }
            if (this.highlightStyle) {
                this.highlightStyle.__rect = null;
            }
        };

        /**
         * Í¼ÐÎÊÇ·ñ»á´¥·¢ÊÂ¼þ
         * @return {boolean}
         */
        // TODO, Í¨¹ý bind °ó¶¨µÄÊÂ¼þ
        Base.prototype.isSilent = function () {
            return !(
                this.hoverable || this.draggable || this.clickable
                || this.onmousemove || this.onmouseover || this.onmouseout
                || this.onmousedown || this.onmouseup || this.onclick
                || this.ondragenter || this.ondragover || this.ondragleave
                || this.ondrop
            );
        };

        util.merge(Base.prototype, Transformable.prototype, true);
        util.merge(Base.prototype, Eventful.prototype, true);

        return Base;
    });
define('zrender/tool/matrix', [], function () {

        var ArrayCtor = typeof Float32Array === 'undefined'
            ? Array
            : Float32Array;
        /**
         * 3x2¾ØÕó²Ù×÷Àà
         * @exports zrender/tool/matrix
         */
        var matrix = {
            /**
             * ´´½¨Ò»¸öµ¥Î»¾ØÕó
             * @return {Float32Array|Array.<number>}
             */
            create : function() {
                var out = new ArrayCtor(6);
                matrix.identity(out);
                
                return out;
            },
            /**
             * ÉèÖÃ¾ØÕóÎªµ¥Î»¾ØÕó
             * @param {Float32Array|Array.<number>} out
             */
            identity : function(out) {
                out[0] = 1;
                out[1] = 0;
                out[2] = 0;
                out[3] = 1;
                out[4] = 0;
                out[5] = 0;
                return out;
            },
            /**
             * ¸´ÖÆ¾ØÕó
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} m
             */
            copy: function(out, m) {
                out[0] = m[0];
                out[1] = m[1];
                out[2] = m[2];
                out[3] = m[3];
                out[4] = m[4];
                out[5] = m[5];
                return out;
            },
            /**
             * ¾ØÕóÏà³Ë
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} m1
             * @param {Float32Array|Array.<number>} m2
             */
            mul : function (out, m1, m2) {
                out[0] = m1[0] * m2[0] + m1[2] * m2[1];
                out[1] = m1[1] * m2[0] + m1[3] * m2[1];
                out[2] = m1[0] * m2[2] + m1[2] * m2[3];
                out[3] = m1[1] * m2[2] + m1[3] * m2[3];
                out[4] = m1[0] * m2[4] + m1[2] * m2[5] + m1[4];
                out[5] = m1[1] * m2[4] + m1[3] * m2[5] + m1[5];
                return out;
            },
            /**
             * Æ½ÒÆ±ä»»
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {Float32Array|Array.<number>} v
             */
            translate : function(out, a, v) {
                out[0] = a[0];
                out[1] = a[1];
                out[2] = a[2];
                out[3] = a[3];
                out[4] = a[4] + v[0];
                out[5] = a[5] + v[1];
                return out;
            },
            /**
             * Ðý×ª±ä»»
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {number} rad
             */
            rotate : function(out, a, rad) {
                var aa = a[0];
                var ac = a[2];
                var atx = a[4];
                var ab = a[1];
                var ad = a[3];
                var aty = a[5];
                var st = Math.sin(rad);
                var ct = Math.cos(rad);

                out[0] = aa * ct + ab * st;
                out[1] = -aa * st + ab * ct;
                out[2] = ac * ct + ad * st;
                out[3] = -ac * st + ct * ad;
                out[4] = ct * atx + st * aty;
                out[5] = ct * aty - st * atx;
                return out;
            },
            /**
             * Ëõ·Å±ä»»
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             * @param {Float32Array|Array.<number>} v
             */
            scale : function(out, a, v) {
                var vx = v[0];
                var vy = v[1];
                out[0] = a[0] * vx;
                out[1] = a[1] * vy;
                out[2] = a[2] * vx;
                out[3] = a[3] * vy;
                out[4] = a[4] * vx;
                out[5] = a[5] * vy;
                return out;
            },
            /**
             * ÇóÄæ¾ØÕó
             * @param {Float32Array|Array.<number>} out
             * @param {Float32Array|Array.<number>} a
             */
            invert : function(out, a) {
            
                var aa = a[0];
                var ac = a[2];
                var atx = a[4];
                var ab = a[1];
                var ad = a[3];
                var aty = a[5];

                var det = aa * ad - ab * ac;
                if (!det) {
                    return null;
                }
                det = 1.0 / det;

                out[0] = ad * det;
                out[1] = -ab * det;
                out[2] = -ac * det;
                out[3] = aa * det;
                out[4] = (ac * aty - ad * atx) * det;
                out[5] = (ab * atx - aa * aty) * det;
                return out;
            }
        };

        return matrix;
    });
define('zrender/tool/guid', [], function () {
        var idStart = 0x0907;

        return function () {
            return 'zrender__' + (idStart++);
        };
    });
define('zrender/tool/log', ['require', '../config'], function (require) {
        var config = require('../config');

        /**
         * @exports zrender/tool/log
         * @author Kener (@Kener-ÁÖ·å, kener.linfeng@gmail.com)
         */
        return function() {
            if (config.debugMode === 0) {
                return;
            }
            else if (config.debugMode == 1) {
                for (var k in arguments) {
                    throw new Error(arguments[k]);
                }
            }
            else if (config.debugMode > 1) {
                for (var k in arguments) {
                    console.log(arguments[k]);
                }
            }
        };

        /* for debug
        return function(mes) {
            document.getElementById('wrong-message').innerHTML =
                mes + ' ' + (new Date() - 0)
                + '<br/>' 
                + document.getElementById('wrong-message').innerHTML;
        };
        */
    });
define('zrender/mixin/Transformable', ['require', '../tool/matrix', '../tool/vector'], function (require) {

    'use strict';

    var matrix = require('../tool/matrix');
    var vector = require('../tool/vector');
    var origin = [0, 0];

    var mTranslate = matrix.translate;

    var EPSILON = 5e-5;

    function isAroundZero(val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }

    /**
     * @alias module:zrender/mixin/Transformable
     * @constructor
     */
    var Transformable = function () {

        if (!this.position) {
            /**
             * Æ½ÒÆ
             * @type {Array.<number>}
             * @default [0, 0]
             */
            this.position = [ 0, 0 ];
        }
        if (typeof(this.rotation) == 'undefined') {
            /**
             * Ðý×ª£¬¿ÉÒÔÍ¨¹ýÊý×é¶þÈýÏîÖ¸¶¨Ðý×ªµÄÔ­µã
             * @type {Array.<number>}
             * @default [0, 0, 0]
             */
            this.rotation = [ 0, 0, 0 ];
        }
        if (!this.scale) {
            /**
             * Ëõ·Å£¬¿ÉÒÔÍ¨¹ýÊý×éÈýËÄÏîÖ¸¶¨Ëõ·ÅµÄÔ­µã
             * @type {Array.<number>}
             * @default [1, 1, 0, 0]
             */
            this.scale = [ 1, 1, 0, 0 ];
        }

        this.needLocalTransform = false;

        /**
         * ÊÇ·ñÓÐ×ø±ê±ä»»
         * @type {boolean}
         * @readOnly
         */
        this.needTransform = false;
    };

    Transformable.prototype = {
        
        constructor: Transformable,

        updateNeedTransform: function () {
            this.needLocalTransform = isNotAroundZero(this.rotation[0])
                || isNotAroundZero(this.position[0])
                || isNotAroundZero(this.position[1])
                || isNotAroundZero(this.scale[0] - 1)
                || isNotAroundZero(this.scale[1] - 1);
        },

        /**
         * ÅÐ¶ÏÊÇ·ñÐèÒªÓÐ×ø±ê±ä»»£¬¸üÐÂneedTransformÊôÐÔ¡£
         * Èç¹ûÓÐ×ø±ê±ä»», Ôò´Óposition, rotation, scaleÒÔ¼°¸¸½ÚµãµÄtransform¼ÆËã³ö×ÔÉíµÄtransform¾ØÕó
         */
        updateTransform: function () {
            
            this.updateNeedTransform();

            var parentHasTransform = this.parent && this.parent.needTransform;
            this.needTransform = this.needLocalTransform || parentHasTransform;
            
            if (!this.needTransform) {
                return;
            }

            var m = this.transform || matrix.create();
            matrix.identity(m);

            if (this.needLocalTransform) {
                var scale = this.scale;
                if (
                    isNotAroundZero(scale[0])
                 || isNotAroundZero(scale[1])
                ) {
                    origin[0] = -scale[2] || 0;
                    origin[1] = -scale[3] || 0;
                    var haveOrigin = isNotAroundZero(origin[0])
                                  || isNotAroundZero(origin[1]);
                    if (haveOrigin) {
                        mTranslate(m, m, origin);
                    }
                    matrix.scale(m, m, scale);
                    if (haveOrigin) {
                        origin[0] = -origin[0];
                        origin[1] = -origin[1];
                        mTranslate(m, m, origin);
                    }
                }

                if (this.rotation instanceof Array) {
                    if (this.rotation[0] !== 0) {
                        origin[0] = -this.rotation[1] || 0;
                        origin[1] = -this.rotation[2] || 0;
                        var haveOrigin = isNotAroundZero(origin[0])
                                      || isNotAroundZero(origin[1]);
                        if (haveOrigin) {
                            mTranslate(m, m, origin);
                        }
                        matrix.rotate(m, m, this.rotation[0]);
                        if (haveOrigin) {
                            origin[0] = -origin[0];
                            origin[1] = -origin[1];
                            mTranslate(m, m, origin);
                        }
                    }
                }
                else {
                    if (this.rotation !== 0) {
                        matrix.rotate(m, m, this.rotation);
                    }
                }

                if (
                    isNotAroundZero(this.position[0]) || isNotAroundZero(this.position[1])
                ) {
                    mTranslate(m, m, this.position);
                }
            }

            // Ó¦ÓÃ¸¸½Úµã±ä»»
            if (parentHasTransform) {
                if (this.needLocalTransform) {
                    matrix.mul(m, this.parent.transform, m);
                }
                else {
                    matrix.copy(m, this.parent.transform);
                }
            }
            // ±£´æÕâ¸ö±ä»»¾ØÕó
            this.transform = m;

            this.invTransform = this.invTransform || matrix.create();
            matrix.invert(this.invTransform, m);
        },
        /**
         * ½«×Ô¼ºµÄtransformÓ¦ÓÃµ½contextÉÏ
         * @param {Context2D} ctx
         */
        setTransform: function (ctx) {
            if (this.needTransform) {
                var m = this.transform;
                ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
            }
        },
        /**
         * ÉèÖÃÍ¼ÐÎµÄ³¯Ïò
         * @param  {Array.<number>|Float32Array} target
         * @method
         */
        lookAt: (function () {
            var v = vector.create();
            return function(target) {
                if (!this.transform) {
                    this.transform = matrix.create();
                }
                var m = this.transform;
                vector.sub(v, target, this.position);
                if (isAroundZero(v[0]) && isAroundZero(v[1])) {
                    return;
                }
                vector.normalize(v, v);
                var scale = this.scale;
                // Y Axis
                // TODO Scale origin ?
                m[2] = v[0] * scale[1];
                m[3] = v[1] * scale[1];
                // X Axis
                m[0] = v[1] * scale[0];
                m[1] = -v[0] * scale[0];
                // Position
                m[4] = this.position[0];
                m[5] = this.position[1];

                this.decomposeTransform();
            };
        })(),
        /**
         * ·Ö½â`transform`¾ØÕóµ½`position`, `rotation`, `scale`
         */
        decomposeTransform: function () {
            if (!this.transform) {
                return;
            }
            var m = this.transform;
            var sx = m[0] * m[0] + m[1] * m[1];
            var position = this.position;
            var scale = this.scale;
            var rotation = this.rotation;
            if (isNotAroundZero(sx - 1)) {
                sx = Math.sqrt(sx);
            }
            var sy = m[2] * m[2] + m[3] * m[3];
            if (isNotAroundZero(sy - 1)) {
                sy = Math.sqrt(sy);
            }
            position[0] = m[4];
            position[1] = m[5];
            scale[0] = sx;
            scale[1] = sy;
            scale[2] = scale[3] = 0;
            rotation[0] = Math.atan2(-m[1] / sy, m[0] / sx);
            rotation[1] = rotation[2] = 0;
        },

        /**
         * ±ä»»×ø±êÎ»ÖÃµ½ shape µÄ¾Ö²¿×ø±ê¿Õ¼ä
         * @method
         * @param {number} x
         * @param {number} y
         * @return {Array.<number>}
         */
        transformCoordToLocal: function (x, y) {
            var v2 = [x, y];
            if (this.needTransform && this.invTransform) {
                vector.applyTransform(v2, v2, this.invTransform);
            }
            return v2;
        }
    };

    return Transformable;
});
define('zrender/mixin/Eventful', ['require'], function (require) {

    /**
     * ÊÂ¼þ·Ö·¢Æ÷
     * @alias module:zrender/mixin/Eventful
     * @constructor
     */
    var Eventful = function () {
        this._handlers = {};
    };
    /**
     * µ¥´Î´¥·¢°ó¶¨£¬dispatchºóÏú»Ù
     * 
     * @param {string} event ÊÂ¼þÃû
     * @param {Function} handler ÏìÓ¦º¯Êý
     * @param {Object} context
     */
    Eventful.prototype.one = function (event, handler, context) {
        var _h = this._handlers;

        if (!handler || !event) {
            return this;
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        _h[event].push({
            h : handler,
            one : true,
            ctx: context || this
        });

        return this;
    };

    /**
     * °ó¶¨ÊÂ¼þ
     * @param {string} event ÊÂ¼þÃû
     * @param {Function} handler ÊÂ¼þ´¦Àíº¯Êý
     * @param {Object} [context]
     */
    Eventful.prototype.bind = function (event, handler, context) {
        var _h = this._handlers;

        if (!handler || !event) {
            return this;
        }

        if (!_h[event]) {
            _h[event] = [];
        }

        _h[event].push({
            h : handler,
            one : false,
            ctx: context || this
        });

        return this;
    };

    /**
     * ½â°óÊÂ¼þ
     * @param {string} event ÊÂ¼þÃû
     * @param {Function} [handler] ÊÂ¼þ´¦Àíº¯Êý
     */
    Eventful.prototype.unbind = function (event, handler) {
        var _h = this._handlers;

        if (!event) {
            this._handlers = {};
            return this;
        }

        if (handler) {
            if (_h[event]) {
                var newList = [];
                for (var i = 0, l = _h[event].length; i < l; i++) {
                    if (_h[event][i]['h'] != handler) {
                        newList.push(_h[event][i]);
                    }
                }
                _h[event] = newList;
            }

            if (_h[event] && _h[event].length === 0) {
                delete _h[event];
            }
        }
        else {
            delete _h[event];
        }

        return this;
    };

    /**
     * ÊÂ¼þ·Ö·¢
     * 
     * @param {string} type ÊÂ¼þÀàÐÍ
     */
    Eventful.prototype.dispatch = function (type) {
        if (this._handlers[type]) {
            var args = arguments;
            var argLen = args.length;

            if (argLen > 3) {
                args = Array.prototype.slice.call(args, 1);
            }
            
            var _h = this._handlers[type];
            var len = _h.length;
            for (var i = 0; i < len;) {
                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        _h[i]['h'].call(_h[i]['ctx']);
                        break;
                    case 2:
                        _h[i]['h'].call(_h[i]['ctx'], args[1]);
                        break;
                    case 3:
                        _h[i]['h'].call(_h[i]['ctx'], args[1], args[2]);
                        break;
                    default:
                        // have more than 2 given arguments
                        _h[i]['h'].apply(_h[i]['ctx'], args);
                        break;
                }
                
                if (_h[i]['one']) {
                    _h.splice(i, 1);
                    len--;
                }
                else {
                    i++;
                }
            }
        }

        return this;
    };

    /**
     * ´øÓÐcontextµÄÊÂ¼þ·Ö·¢, ×îºóÒ»¸ö²ÎÊýÊÇÊÂ¼þ»Øµ÷µÄcontext
     * @param {string} type ÊÂ¼þÀàÐÍ
     */
    Eventful.prototype.dispatchWithContext = function (type) {
        if (this._handlers[type]) {
            var args = arguments;
            var argLen = args.length;

            if (argLen > 4) {
                args = Array.prototype.slice.call(args, 1, args.length - 1);
            }
            var ctx = args[args.length - 1];

            var _h = this._handlers[type];
            var len = _h.length;
            for (var i = 0; i < len;) {
                // Optimize advise from backbone
                switch (argLen) {
                    case 1:
                        _h[i]['h'].call(ctx);
                        break;
                    case 2:
                        _h[i]['h'].call(ctx, args[1]);
                        break;
                    case 3:
                        _h[i]['h'].call(ctx, args[1], args[2]);
                        break;
                    default:
                        // have more than 2 given arguments
                        _h[i]['h'].apply(ctx, args);
                        break;
                }
                
                if (_h[i]['one']) {
                    _h.splice(i, 1);
                    len--;
                }
                else {
                    i++;
                }
            }
        }

        return this;
    };

    // ¶ÔÏó¿ÉÒÔÍ¨¹ý onxxxx °ó¶¨ÊÂ¼þ
    /**
     * @event module:zrender/mixin/Eventful#onclick
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmouseover
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmouseout
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmousemove
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmousewheel
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmousedown
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#onmouseup
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragstart
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragend
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragenter
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragleave
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondragover
     * @type {Function}
     * @default null
     */
    /**
     * @event module:zrender/mixin/Eventful#ondrop
     * @type {Function}
     * @default null
     */
    
    return Eventful;
});
define('zrender/dep/excanvas', ['require'], function (require) {
    
// Only add this code if we do not already have a canvas implementation
if (!document.createElement('canvas').getContext) {

(function() {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;
  var abs = m.abs;
  var sqrt = m.sqrt;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  var IE_VERSION = +navigator.userAgent.match(/MSIE ([\d.]+)?/)[1];

  /**
   * This funtion is assigned to the <canvas> elements as element.getContext().
   * @this {HTMLElement}
   * @return {CanvasRenderingContext2D_}
   */
  function getContext() {
    return this.context_ ||
        (this.context_ = new CanvasRenderingContext2D_(this));
  }

  var slice = Array.prototype.slice;

  /**
   * Binds a function to an object. The returned function will always use the
   * passed in {@code obj} as {@code this}.
   *
   * Example:
   *
   *   g = bind(f, obj, a, b)
   *   g(c, d) // will do f.call(obj, a, b, c, d)
   *
   * @param {Function} f The function to bind the object to
   * @param {Object} obj The object that should act as this when the function
   *     is called
   * @param {*} var_args Rest arguments that will be used as the initial
   *     arguments when the function is called
   * @return {Function} A new function that has bound this
   */
  function bind(f, obj, var_args) {
    var a = slice.call(arguments, 2);
    return function() {
      return f.apply(obj, a.concat(slice.call(arguments)));
    };
  }

  function encodeHtmlAttribute(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function addNamespace(doc, prefix, urn) {
    if (!doc.namespaces[prefix]) {
      doc.namespaces.add(prefix, urn, '#default#VML');
    }
  }

  function addNamespacesAndStylesheet(doc) {
    addNamespace(doc, 'g_vml_', 'urn:schemas-microsoft-com:vml');
    addNamespace(doc, 'g_o_', 'urn:schemas-microsoft-com:office:office');

    // Setup default CSS.  Only add one style sheet per document
    if (!doc.styleSheets['ex_canvas_']) {
      var ss = doc.createStyleSheet();
      ss.owningElement.id = 'ex_canvas_';
      ss.cssText = 'canvas{display:inline-block;overflow:hidden;' +
          // default size is 300x150 in Gecko and Opera
          'text-align:left;width:300px;height:150px}';
    }
  }

  // Add namespaces and stylesheet at startup.
  addNamespacesAndStylesheet(document);

  var G_vmlCanvasManager_ = {
    init: function(opt_doc) {
      var doc = opt_doc || document;
      // Create a dummy element so that IE will allow canvas elements to be
      // recognized.
      doc.createElement('canvas');
      doc.attachEvent('onreadystatechange', bind(this.init_, this, doc));
    },

    init_: function(doc) {
      // find all canvas elements
      var els = doc.getElementsByTagName('canvas');
      for (var i = 0; i < els.length; i++) {
        this.initElement(els[i]);
      }
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function(el) {
      if (!el.getContext) {
        el.getContext = getContext;

        // Add namespaces and stylesheet to document of the element.
        addNamespacesAndStylesheet(el.ownerDocument);

        // Remove fallback content. There is no way to hide text nodes so we
        // just remove all childNodes. We could hide all elements and remove
        // text nodes but who really cares about the fallback content.
        el.innerHTML = '';

        // do not use inline function because that will leak memory
        el.attachEvent('onpropertychange', onPropertyChange);
        el.attachEvent('onresize', onResize);

        var attrs = el.attributes;
        if (attrs.width && attrs.width.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setWidth_(attrs.width.nodeValue);
          el.style.width = attrs.width.nodeValue + 'px';
        } else {
          el.width = el.clientWidth;
        }
        if (attrs.height && attrs.height.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setHeight_(attrs.height.nodeValue);
          el.style.height = attrs.height.nodeValue + 'px';
        } else {
          el.height = el.clientHeight;
        }
        //el.getContext().setCoordsize_()
      }
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.getContext().clearRect();
        el.style.width = el.attributes.width.nodeValue + 'px';
        // In IE8 this does not trigger onresize.
        el.firstChild.style.width =  el.clientWidth + 'px';
        break;
      case 'height':
        el.getContext().clearRect();
        el.style.height = el.attributes.height.nodeValue + 'px';
        el.firstChild.style.height = el.clientHeight + 'px';
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var decToHex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      decToHex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.globalAlpha   = o1.globalAlpha;
    o2.font          = o1.font;
    o2.textAlign     = o1.textAlign;
    o2.textBaseline  = o1.textBaseline;
    o2.scaleX_    = o1.scaleX_;
    o2.scaleY_    = o1.scaleY_;
    o2.lineScale_    = o1.lineScale_;
  }

  var colorData = {
    aliceblue: '#F0F8FF',
    antiquewhite: '#FAEBD7',
    aquamarine: '#7FFFD4',
    azure: '#F0FFFF',
    beige: '#F5F5DC',
    bisque: '#FFE4C4',
    black: '#000000',
    blanchedalmond: '#FFEBCD',
    blueviolet: '#8A2BE2',
    brown: '#A52A2A',
    burlywood: '#DEB887',
    cadetblue: '#5F9EA0',
    chartreuse: '#7FFF00',
    chocolate: '#D2691E',
    coral: '#FF7F50',
    cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC',
    crimson: '#DC143C',
    cyan: '#00FFFF',
    darkblue: '#00008B',
    darkcyan: '#008B8B',
    darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9',
    darkgreen: '#006400',
    darkgrey: '#A9A9A9',
    darkkhaki: '#BDB76B',
    darkmagenta: '#8B008B',
    darkolivegreen: '#556B2F',
    darkorange: '#FF8C00',
    darkorchid: '#9932CC',
    darkred: '#8B0000',
    darksalmon: '#E9967A',
    darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F',
    darkslategrey: '#2F4F4F',
    darkturquoise: '#00CED1',
    darkviolet: '#9400D3',
    deeppink: '#FF1493',
    deepskyblue: '#00BFFF',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1E90FF',
    firebrick: '#B22222',
    floralwhite: '#FFFAF0',
    forestgreen: '#228B22',
    gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF',
    gold: '#FFD700',
    goldenrod: '#DAA520',
    grey: '#808080',
    greenyellow: '#ADFF2F',
    honeydew: '#F0FFF0',
    hotpink: '#FF69B4',
    indianred: '#CD5C5C',
    indigo: '#4B0082',
    ivory: '#FFFFF0',
    khaki: '#F0E68C',
    lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD',
    lightblue: '#ADD8E6',
    lightcoral: '#F08080',
    lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2',
    lightgreen: '#90EE90',
    lightgrey: '#D3D3D3',
    lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A',
    lightseagreen: '#20B2AA',
    lightskyblue: '#87CEFA',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0',
    limegreen: '#32CD32',
    linen: '#FAF0E6',
    magenta: '#FF00FF',
    mediumaquamarine: '#66CDAA',
    mediumblue: '#0000CD',
    mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371',
    mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A',
    mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585',
    midnightblue: '#191970',
    mintcream: '#F5FFFA',
    mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD',
    oldlace: '#FDF5E6',
    olivedrab: '#6B8E23',
    orange: '#FFA500',
    orangered: '#FF4500',
    orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA',
    palegreen: '#98FB98',
    paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093',
    papayawhip: '#FFEFD5',
    peachpuff: '#FFDAB9',
    peru: '#CD853F',
    pink: '#FFC0CB',
    plum: '#DDA0DD',
    powderblue: '#B0E0E6',
    rosybrown: '#BC8F8F',
    royalblue: '#4169E1',
    saddlebrown: '#8B4513',
    salmon: '#FA8072',
    sandybrown: '#F4A460',
    seagreen: '#2E8B57',
    seashell: '#FFF5EE',
    sienna: '#A0522D',
    skyblue: '#87CEEB',
    slateblue: '#6A5ACD',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#FFFAFA',
    springgreen: '#00FF7F',
    steelblue: '#4682B4',
    tan: '#D2B48C',
    thistle: '#D8BFD8',
    tomato: '#FF6347',
    turquoise: '#40E0D0',
    violet: '#EE82EE',
    wheat: '#F5DEB3',
    whitesmoke: '#F5F5F5',
    yellowgreen: '#9ACD32'
  };


  function getRgbHslContent(styleString) {
    var start = styleString.indexOf('(', 3);
    var end = styleString.indexOf(')', start + 1);
    var parts = styleString.substring(start + 1, end).split(',');
    // add alpha if needed
    if (parts.length != 4 || styleString.charAt(3) != 'a') {
      parts[3] = 1;
    }
    return parts;
  }

  function percent(s) {
    return parseFloat(s) / 100;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hslToRgb(parts){
    var r, g, b, h, s, l;
    h = parseFloat(parts[0]) / 360 % 360;
    if (h < 0)
      h++;
    s = clamp(percent(parts[1]), 0, 1);
    l = clamp(percent(parts[2]), 0, 1);
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }

    return '#' + decToHex[Math.floor(r * 255)] +
        decToHex[Math.floor(g * 255)] +
        decToHex[Math.floor(b * 255)];
  }

  function hueToRgb(m1, m2, h) {
    if (h < 0)
      h++;
    if (h > 1)
      h--;

    if (6 * h < 1)
      return m1 + (m2 - m1) * 6 * h;
    else if (2 * h < 1)
      return m2;
    else if (3 * h < 2)
      return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    else
      return m1;
  }

  var processStyleCache = {};

  function processStyle(styleString) {
    if (styleString in processStyleCache) {
      return processStyleCache[styleString];
    }

    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.charAt(0) == '#') {
      str = styleString;
    } else if (/^rgb/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      var str = '#', n;
      for (var i = 0; i < 3; i++) {
        if (parts[i].indexOf('%') != -1) {
          n = Math.floor(percent(parts[i]) * 255);
        } else {
          n = +parts[i];
        }
        str += decToHex[clamp(n, 0, 255)];
      }
      alpha = +parts[3];
    } else if (/^hsl/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      str = hslToRgb(parts);
      alpha = parts[3];
    } else {
      str = colorData[styleString] || styleString;
    }
    return processStyleCache[styleString] = {color: str, alpha: alpha};
  }

  var DEFAULT_STYLE = {
    style: 'normal',
    variant: 'normal',
    weight: 'normal',
    size: 12,           //10
    family: 'Î¢ÈíÑÅºÚ'     //'sans-serif'
  };

  // Internal text style cache
  var fontStyleCache = {};

  function processFontStyle(styleString) {
    if (fontStyleCache[styleString]) {
      return fontStyleCache[styleString];
    }

    var el = document.createElement('div');
    var style = el.style;
    var fontFamily;
    try {
      style.font = styleString;
      fontFamily = style.fontFamily.split(',')[0];
    } catch (ex) {
      // Ignore failures to set to invalid font.
    }

    return fontStyleCache[styleString] = {
      style: style.fontStyle || DEFAULT_STYLE.style,
      variant: style.fontVariant || DEFAULT_STYLE.variant,
      weight: style.fontWeight || DEFAULT_STYLE.weight,
      size: style.fontSize || DEFAULT_STYLE.size,
      family: fontFamily || DEFAULT_STYLE.family
    };
  }

  function getComputedStyle(style, element) {
    var computedStyle = {};

    for (var p in style) {
      computedStyle[p] = style[p];
    }

    // Compute the size
    var canvasFontSize = parseFloat(element.currentStyle.fontSize),
        fontSize = parseFloat(style.size);

    if (typeof style.size == 'number') {
      computedStyle.size = style.size;
    } else if (style.size.indexOf('px') != -1) {
      computedStyle.size = fontSize;
    } else if (style.size.indexOf('em') != -1) {
      computedStyle.size = canvasFontSize * fontSize;
    } else if(style.size.indexOf('%') != -1) {
      computedStyle.size = (canvasFontSize / 100) * fontSize;
    } else if (style.size.indexOf('pt') != -1) {
      computedStyle.size = fontSize / .75;
    } else {
      computedStyle.size = canvasFontSize;
    }

    // Different scaling between normal text and VML text. This was found using
    // trial and error to get the same size as non VML text.
    //computedStyle.size *= 0.981;

    return computedStyle;
  }

  function buildStyle(style) {
    return style.style + ' ' + style.variant + ' ' + style.weight + ' ' +
        style.size + "px '" + style.family + "'";
  }

  var lineCapMap = {
    'butt': 'flat',
    'round': 'round'
  };

  function processLineCap(lineCap) {
    return lineCapMap[lineCap] || 'square';
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} canvasElement The element that the 2D context should
   * be associated with
   */
  function CanvasRenderingContext2D_(canvasElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // Canvas context properties
    this.strokeStyle = '#000';
    this.fillStyle = '#000';

    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.lineCap = 'butt';
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    // this.font = '10px sans-serif';
    this.font = '12px Î¢ÈíÑÅºÚ';        // ¾ö¶¨»¹ÊÇ¸ÄÕâ°É£¬Ó°Ïì´ú¼Û×îÐ¡
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.canvas = canvasElement;

    var cssText = 'width:' + canvasElement.clientWidth + 'px;height:' +
        canvasElement.clientHeight + 'px;overflow:hidden;position:absolute';
    var el = canvasElement.ownerDocument.createElement('div');
    el.style.cssText = cssText;
    canvasElement.appendChild(el);

    var overlayEl = el.cloneNode(false);
    // Use a non transparent background.
    overlayEl.style.backgroundColor = '#fff'; //red, I don't know why, it work! 
    overlayEl.style.filter = 'alpha(opacity=0)';
    canvasElement.appendChild(overlayEl);

    this.element_ = el;
    this.scaleX_ = 1;
    this.scaleY_ = 1;
    this.lineScale_ = 1;
  }

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    if (this.textMeasureEl_) {
      this.textMeasureEl_.removeNode(true);
      this.textMeasureEl_ = null;
    }
    this.element_.innerHTML = '';
  };

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.
    this.currentPath_ = [];
  };

  contextPrototype.moveTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'moveTo', x: p.x, y: p.y});
    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.lineTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'lineTo', x: p.x, y: p.y});

    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    var p = getCoords(this, aX, aY);
    var cp1 = getCoords(this, aCP1x, aCP1y);
    var cp2 = getCoords(this, aCP2x, aCP2y);
    bezierCurveTo(this, cp1, cp2, p);
  };

  // Helper function that takes the already fixed cordinates.
  function bezierCurveTo(self, cp1, cp2, p) {
    self.currentPath_.push({
      type: 'bezierCurveTo',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: p.x,
      y: p.y
    });
    self.currentX_ = p.x;
    self.currentY_ = p.y;
  }

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes

    var cp = getCoords(this, aCPx, aCPy);
    var p = getCoords(this, aX, aY);

    var cp1 = {
      x: this.currentX_ + 2.0 / 3.0 * (cp.x - this.currentX_),
      y: this.currentY_ + 2.0 / 3.0 * (cp.y - this.currentY_)
    };
    var cp2 = {
      x: cp1.x + (p.x - this.currentX_) / 3.0,
      y: cp1.y + (p.y - this.currentY_) / 3.0
    };

    bezierCurveTo(this, cp1, cp2, p);
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? 'at' : 'wa';

    var xStart = aX + mc(aStartAngle) * aRadius - Z2;
    var yStart = aY + ms(aStartAngle) * aRadius - Z2;

    var xEnd = aX + mc(aEndAngle) * aRadius - Z2;
    var yEnd = aY + ms(aEndAngle) * aRadius - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    var p = getCoords(this, aX, aY);
    var pStart = getCoords(this, xStart, yStart);
    var pEnd = getCoords(this, xEnd, yEnd);

    this.currentPath_.push({type: arcType,
                           x: p.x,
                           y: p.y,
                           radius: aRadius,
                           xStart: pStart.x,
                           yStart: pStart.y,
                           xEnd: pEnd.x,
                           yEnd: pEnd.y});

  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();

    this.currentPath_ = oldPath;
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();

    this.currentPath_ = oldPath;
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_('gradient');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0, aR0,
                                                   aX1, aY1, aR1) {
    var gradient = new CanvasGradient_('gradientradial');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.r0_ = aR0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    gradient.r1_ = aR1;
    return gradient;
  };

  contextPrototype.drawImage = function(image, var_args) {
    var dx, dy, dw, dh, sx, sy, sw, sh;

    // to find the original width we overide the width and height
    var oldRuntimeWidth = image.runtimeStyle.width;
    var oldRuntimeHeight = image.runtimeStyle.height;
    image.runtimeStyle.width = 'auto';
    image.runtimeStyle.height = 'auto';

    // get the original size
    var w = image.width;
    var h = image.height;

    // and remove overides
    image.runtimeStyle.width = oldRuntimeWidth;
    image.runtimeStyle.height = oldRuntimeHeight;

    if (arguments.length == 3) {
      dx = arguments[1];
      dy = arguments[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (arguments.length == 5) {
      dx = arguments[1];
      dy = arguments[2];
      dw = arguments[3];
      dh = arguments[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (arguments.length == 9) {
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else {
      throw Error('Invalid number of arguments');
    }

    var d = getCoords(this, dx, dy);

    var w2 = sw / 2;
    var h2 = sh / 2;

    var vmlStr = [];

    var W = 10;
    var H = 10;

    var scaleX = scaleY = 1;
    
    // For some reason that I've now forgotten, using divs didn't work
    vmlStr.push(' <g_vml_:group',
                ' coordsize="', Z * W, ',', Z * H, '"',
                ' coordorigin="0,0"' ,
                ' style="width:', W, 'px;height:', H, 'px;position:absolute;');

    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.

    if (this.m_[0][0] != 1 || this.m_[0][1] ||
        this.m_[1][1] != 1 || this.m_[1][0]) {
      var filter = [];

     var scaleX = this.scaleX_;
     var scaleY = this.scaleY_;
      // Note the 12/21 reversal
      filter.push('M11=', this.m_[0][0] / scaleX, ',',
                  'M12=', this.m_[1][0] / scaleY, ',',
                  'M21=', this.m_[0][1] / scaleX, ',',
                  'M22=', this.m_[1][1] / scaleY, ',',
                  'Dx=', mr(d.x / Z), ',',
                  'Dy=', mr(d.y / Z), '');

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = getCoords(this, dx + dw, dy);
      var c3 = getCoords(this, dx, dy + dh);
      var c4 = getCoords(this, dx + dw, dy + dh);

      max.x = m.max(max.x, c2.x, c3.x, c4.x);
      max.y = m.max(max.y, c2.y, c3.y, c4.y);

      vmlStr.push('padding:0 ', mr(max.x / Z), 'px ', mr(max.y / Z),
                  'px 0;filter:progid:DXImageTransform.Microsoft.Matrix(',
                  filter.join(''), ", SizingMethod='clip');");

    } else {
      vmlStr.push('top:', mr(d.y / Z), 'px;left:', mr(d.x / Z), 'px;');
    }

    vmlStr.push(' ">');

    // Draw a special cropping div if needed
    if (sx || sy) {
      // Apply scales to width and height
      vmlStr.push('<div style="overflow: hidden; width:', Math.ceil((dw + sx * dw / sw) * scaleX), 'px;',
                  ' height:', Math.ceil((dh + sy * dh / sh) * scaleY), 'px;',
                  ' filter:progid:DxImageTransform.Microsoft.Matrix(Dx=',
                  -sx * dw / sw * scaleX, ',Dy=', -sy * dh / sh * scaleY, ');">');
    }
    
      
    // Apply scales to width and height
    vmlStr.push('<div style="width:', Math.round(scaleX * w * dw / sw), 'px;',
                ' height:', Math.round(scaleY * h * dh / sh), 'px;',
                ' filter:');
   
    // If there is a globalAlpha, apply it to image
    if(this.globalAlpha < 1) {
      vmlStr.push(' progid:DXImageTransform.Microsoft.Alpha(opacity=' + (this.globalAlpha * 100) + ')');
    }
    
    vmlStr.push(' progid:DXImageTransform.Microsoft.AlphaImageLoader(src=', image.src, ',sizingMethod=scale)">');
    
    // Close the crop div if necessary            
    if (sx || sy) vmlStr.push('</div>');
    
    vmlStr.push('</div></div>');
    
    this.element_.insertAdjacentHTML('BeforeEnd', vmlStr.join(''));
  };

  contextPrototype.stroke = function(aFill) {
    var lineStr = [];
    var lineOpen = false;

    var W = 10;
    var H = 10;

    lineStr.push('<g_vml_:shape',
                 ' filled="', !!aFill, '"',
                 ' style="position:absolute;width:', W, 'px;height:', H, 'px;"',
                 ' coordorigin="0,0"',
                 ' coordsize="', Z * W, ',', Z * H, '"',
                 ' stroked="', !aFill, '"',
                 ' path="');

    var newSeq = false;
    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];
      var c;

      switch (p.type) {
        case 'moveTo':
          c = p;
          lineStr.push(' m ', mr(p.x), ',', mr(p.y));
          break;
        case 'lineTo':
          lineStr.push(' l ', mr(p.x), ',', mr(p.y));
          break;
        case 'close':
          lineStr.push(' x ');
          p = null;
          break;
        case 'bezierCurveTo':
          lineStr.push(' c ',
                       mr(p.cp1x), ',', mr(p.cp1y), ',',
                       mr(p.cp2x), ',', mr(p.cp2y), ',',
                       mr(p.x), ',', mr(p.y));
          break;
        case 'at':
        case 'wa':
          lineStr.push(' ', p.type, ' ',
                       mr(p.x - this.scaleX_ * p.radius), ',',
                       mr(p.y - this.scaleY_ * p.radius), ' ',
                       mr(p.x + this.scaleX_ * p.radius), ',',
                       mr(p.y + this.scaleY_ * p.radius), ' ',
                       mr(p.xStart), ',', mr(p.yStart), ' ',
                       mr(p.xEnd), ',', mr(p.yEnd));
          break;
      }


      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if (p) {
        if (min.x == null || p.x < min.x) {
          min.x = p.x;
        }
        if (max.x == null || p.x > max.x) {
          max.x = p.x;
        }
        if (min.y == null || p.y < min.y) {
          min.y = p.y;
        }
        if (max.y == null || p.y > max.y) {
          max.y = p.y;
        }
      }
    }
    lineStr.push(' ">');

    if (!aFill) {
      appendStroke(this, lineStr);
    } else {
      appendFill(this, lineStr, min, max);
    }

    lineStr.push('</g_vml_:shape>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  function appendStroke(ctx, lineStr) {
    var a = processStyle(ctx.strokeStyle);
    var color = a.color;
    var opacity = a.alpha * ctx.globalAlpha;
    var lineWidth = ctx.lineScale_ * ctx.lineWidth;

    // VML cannot correctly render a line if the width is less than 1px.
    // In that case, we dilute the color to make the line look thinner.
    if (lineWidth < 1) {
      opacity *= lineWidth;
    }

    lineStr.push(
      '<g_vml_:stroke',
      ' opacity="', opacity, '"',
      ' joinstyle="', ctx.lineJoin, '"',
      ' miterlimit="', ctx.miterLimit, '"',
      ' endcap="', processLineCap(ctx.lineCap), '"',
      ' weight="', lineWidth, 'px"',
      ' color="', color, '" />'
    );
  }

  function appendFill(ctx, lineStr, min, max) {
    var fillStyle = ctx.fillStyle;
    var arcScaleX = ctx.scaleX_;
    var arcScaleY = ctx.scaleY_;
    var width = max.x - min.x;
    var height = max.y - min.y;
    if (fillStyle instanceof CanvasGradient_) {
      // TODO: Gradients transformed with the transformation matrix.
      var angle = 0;
      var focus = {x: 0, y: 0};

      // additional offset
      var shift = 0;
      // scale factor for offset
      var expansion = 1;

      if (fillStyle.type_ == 'gradient') {
        var x0 = fillStyle.x0_ / arcScaleX;
        var y0 = fillStyle.y0_ / arcScaleY;
        var x1 = fillStyle.x1_ / arcScaleX;
        var y1 = fillStyle.y1_ / arcScaleY;
        var p0 = getCoords(ctx, x0, y0);
        var p1 = getCoords(ctx, x1, y1);
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        angle = Math.atan2(dx, dy) * 180 / Math.PI;

        // The angle should be a non-negative number.
        if (angle < 0) {
          angle += 360;
        }

        // Very small angles produce an unexpected result because they are
        // converted to a scientific notation string.
        if (angle < 1e-6) {
          angle = 0;
        }
      } else {
        var p0 = getCoords(ctx, fillStyle.x0_, fillStyle.y0_);
        focus = {
          x: (p0.x - min.x) / width,
          y: (p0.y - min.y) / height
        };

        width  /= arcScaleX * Z;
        height /= arcScaleY * Z;
        var dimension = m.max(width, height);
        shift = 2 * fillStyle.r0_ / dimension;
        expansion = 2 * fillStyle.r1_ / dimension - shift;
      }

      // We need to sort the color stops in ascending order by offset,
      // otherwise IE won't interpret it correctly.
      var stops = fillStyle.colors_;
      stops.sort(function(cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      var length = stops.length;
      var color1 = stops[0].color;
      var color2 = stops[length - 1].color;
      var opacity1 = stops[0].alpha * ctx.globalAlpha;
      var opacity2 = stops[length - 1].alpha * ctx.globalAlpha;

      var colors = [];
      for (var i = 0; i < length; i++) {
        var stop = stops[i];
        colors.push(stop.offset * expansion + shift + ' ' + stop.color);
      }

      // When colors attribute is used, the meanings of opacity and o:opacity2
      // are reversed.
      lineStr.push('<g_vml_:fill type="', fillStyle.type_, '"',
                   ' method="none" focus="100%"',
                   ' color="', color1, '"',
                   ' color2="', color2, '"',
                   ' colors="', colors.join(','), '"',
                   ' opacity="', opacity2, '"',
                   ' g_o_:opacity2="', opacity1, '"',
                   ' angle="', angle, '"',
                   ' focusposition="', focus.x, ',', focus.y, '" />');
    } else if (fillStyle instanceof CanvasPattern_) {
      if (width && height) {
        var deltaLeft = -min.x;
        var deltaTop = -min.y;
        lineStr.push('<g_vml_:fill',
                     ' position="',
                     deltaLeft / width * arcScaleX * arcScaleX, ',',
                     deltaTop / height * arcScaleY * arcScaleY, '"',
                     ' type="tile"',
                     // TODO: Figure out the correct size to fit the scale.
                     //' size="', w, 'px ', h, 'px"',
                     ' src="', fillStyle.src_, '" />');
       }
    } else {
      var a = processStyle(ctx.fillStyle);
      var color = a.color;
      var opacity = a.alpha * ctx.globalAlpha;
      lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity,
                   '" />');
    }
  }

  contextPrototype.fill = function() {
    this.stroke(true);
  };

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: 'close'});
  };

  function getCoords(ctx, aX, aY) {
    var m = ctx.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0] + m[2][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1] + m[2][1]) - Z2
    };
  };

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    if (this.aStack_.length) {
      copyState(this.aStack_.pop(), this);
      this.m_ = this.mStack_.pop();
    }
  };

  function matrixIsFinite(m) {
    return isFinite(m[0][0]) && isFinite(m[0][1]) &&
        isFinite(m[1][0]) && isFinite(m[1][1]) &&
        isFinite(m[2][0]) && isFinite(m[2][1]);
  }

  function setM(ctx, m, updateLineScale) {
    if (!matrixIsFinite(m)) {
      return;
    }
    ctx.m_ = m;

    ctx.scaleX_ = Math.sqrt(m[0][0] * m[0][0] + m[0][1] * m[0][1]);
    ctx.scaleY_ = Math.sqrt(m[1][0] * m[1][0] + m[1][1] * m[1][1]);

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      ctx.lineScale_ = sqrt(abs(det));
    }
  }

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.scale = function(aX, aY) {
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);

  };

  contextPrototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    var m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, m, true);
  };

  /**
   * The text drawing function.
   * The maxWidth argument isn't taken in account, since no browser supports
   * it yet.
   */
  contextPrototype.drawText_ = function(text, x, y, maxWidth, stroke) {
    var m = this.m_,
        delta = 1000,
        left = 0,
        right = delta,
        offset = {x: 0, y: 0},
        lineStr = [];

    var fontStyle = getComputedStyle(processFontStyle(this.font),
                                     this.element_);

    var fontStyleString = buildStyle(fontStyle);

    var elementStyle = this.element_.currentStyle;
    var textAlign = this.textAlign.toLowerCase();
    switch (textAlign) {
      case 'left':
      case 'center':
      case 'right':
        break;
      case 'end':
        textAlign = elementStyle.direction == 'ltr' ? 'right' : 'left';
        break;
      case 'start':
        textAlign = elementStyle.direction == 'rtl' ? 'right' : 'left';
        break;
      default:
        textAlign = 'left';
    }

    // 1.75 is an arbitrary number, as there is no info about the text baseline
    switch (this.textBaseline) {
      case 'hanging':
      case 'top':
        offset.y = fontStyle.size / 1.75;
        break;
      case 'middle':
        break;
      default:
      case null:
      case 'alphabetic':
      case 'ideographic':
      case 'bottom':
        offset.y = -fontStyle.size / 2.25;
        break;
    }

    switch(textAlign) {
      case 'right':
        left = delta;
        right = 0.05;
        break;
      case 'center':
        left = right = delta / 2;
        break;
    }

    var d = getCoords(this, x + offset.x, y + offset.y);

    lineStr.push('<g_vml_:line from="', -left ,' 0" to="', right ,' 0.05" ',
                 ' coordsize="100 100" coordorigin="0 0"',
                 ' filled="', !stroke, '" stroked="', !!stroke,
                 '" style="position:absolute;width:1px;height:1px;">');

    if (stroke) {
      appendStroke(this, lineStr);
    } else {
      // TODO: Fix the min and max params.
      appendFill(this, lineStr, {x: -left, y: 0},
                 {x: right, y: fontStyle.size});
    }

    var skewM = m[0][0].toFixed(3) + ',' + m[1][0].toFixed(3) + ',' +
                m[0][1].toFixed(3) + ',' + m[1][1].toFixed(3) + ',0,0';

    var skewOffset = mr(d.x / Z) + ',' + mr(d.y / Z);

    lineStr.push('<g_vml_:skew on="t" matrix="', skewM ,'" ',
                 ' offset="', skewOffset, '" origin="', left ,' 0" />',
                 '<g_vml_:path textpathok="true" />',
                 '<g_vml_:textpath on="true" string="',
                 encodeHtmlAttribute(text),
                 '" style="v-text-align:', textAlign,
                 ';font:', encodeHtmlAttribute(fontStyleString),
                 '" /></g_vml_:line>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  contextPrototype.fillText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, false);
  };

  contextPrototype.strokeText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, true);
  };

  contextPrototype.measureText = function(text) {
    if (!this.textMeasureEl_) {
      var s = '<span style="position:absolute;' +
          'top:-20000px;left:0;padding:0;margin:0;border:none;' +
          'white-space:pre;"></span>';
      this.element_.insertAdjacentHTML('beforeEnd', s);
      this.textMeasureEl_ = this.element_.lastChild;
    }
    var doc = this.element_.ownerDocument;
    this.textMeasureEl_.innerHTML = '';
    try {
        this.textMeasureEl_.style.font = this.font;
    } catch (ex) {
        // Ignore failures to set to invalid font.
    }
    
    // Don't use innerHTML or innerText because they allow markup/whitespace.
    this.textMeasureEl_.appendChild(doc.createTextNode(text));
    return {width: this.textMeasureEl_.offsetWidth};
  };

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function(image, repetition) {
    return new CanvasPattern_(image, repetition);
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.x0_ = 0;
    this.y0_ = 0;
    this.r0_ = 0;
    this.x1_ = 0;
    this.y1_ = 0;
    this.r1_ = 0;
    this.colors_ = [];
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: aOffset,
                       color: aColor.color,
                       alpha: aColor.alpha});
  };

  function CanvasPattern_(image, repetition) {
    assertImageIsValid(image);
    switch (repetition) {
      case 'repeat':
      case null:
      case '':
        this.repetition_ = 'repeat';
        break
      case 'repeat-x':
      case 'repeat-y':
      case 'no-repeat':
        this.repetition_ = repetition;
        break;
      default:
        throwException('SYNTAX_ERR');
    }

    this.src_ = image.src;
    this.width_ = image.width;
    this.height_ = image.height;
  }

  function throwException(s) {
    throw new DOMException_(s);
  }

  function assertImageIsValid(img) {
    if (!img || img.nodeType != 1 || img.tagName != 'IMG') {
      throwException('TYPE_MISMATCH_ERR');
    }
    if (img.readyState != 'complete') {
      throwException('INVALID_STATE_ERR');
    }
  }

  function DOMException_(s) {
    this.code = this[s];
    this.message = s +': DOM Exception ' + this.code;
  }
  var p = DOMException_.prototype = new Error;
  p.INDEX_SIZE_ERR = 1;
  p.DOMSTRING_SIZE_ERR = 2;
  p.HIERARCHY_REQUEST_ERR = 3;
  p.WRONG_DOCUMENT_ERR = 4;
  p.INVALID_CHARACTER_ERR = 5;
  p.NO_DATA_ALLOWED_ERR = 6;
  p.NO_MODIFICATION_ALLOWED_ERR = 7;
  p.NOT_FOUND_ERR = 8;
  p.NOT_SUPPORTED_ERR = 9;
  p.INUSE_ATTRIBUTE_ERR = 10;
  p.INVALID_STATE_ERR = 11;
  p.SYNTAX_ERR = 12;
  p.INVALID_MODIFICATION_ERR = 13;
  p.NAMESPACE_ERR = 14;
  p.INVALID_ACCESS_ERR = 15;
  p.VALIDATION_ERR = 16;
  p.TYPE_MISMATCH_ERR = 17;

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;
  DOMException = DOMException_;
})();

} // if
else { // make the canvas test simple by kener.linfeng@gmail.com
    G_vmlCanvasManager = false;
}
return G_vmlCanvasManager;
});
define('zrender/tool/color', ['require', '../tool/util'], function (require) {
    var util = require('../tool/util');

    var _ctx;

    // Color palette is an array containing the default colors for the chart's
    // series.
    // When all colors are used, new colors are selected from the start again.
    // Defaults to:
    // Ä¬ÈÏÉ«°å
    var palette = [
        '#ff9277', ' #dddd00', ' #ffc877', ' #bbe3ff', ' #d5ffbb',
        '#bbbbff', ' #ddb000', ' #b0dd00', ' #e2bbff', ' #ffbbe3',
        '#ff7777', ' #ff9900', ' #83dd00', ' #77e3ff', ' #778fff',
        '#c877ff', ' #ff77ab', ' #ff6600', ' #aa8800', ' #77c7ff',
        '#ad77ff', ' #ff77ff', ' #dd0083', ' #777700', ' #00aa00',
        '#0088aa', ' #8400dd', ' #aa0088', ' #dd0000', ' #772e00'
    ];
    var _palette = palette;

    var highlightColor = 'rgba(255,255,0,0.5)';
    var _highlightColor = highlightColor;

    // ÑÕÉ«¸ñÊ½
    /*jshint maxlen: 330 */
    var colorRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i;

    var _nameColors = {
        aliceblue : '#f0f8ff',
        antiquewhite : '#faebd7',
        aqua : '#0ff',
        aquamarine : '#7fffd4',
        azure : '#f0ffff',
        beige : '#f5f5dc',
        bisque : '#ffe4c4',
        black : '#000',
        blanchedalmond : '#ffebcd',
        blue : '#00f',
        blueviolet : '#8a2be2',
        brown : '#a52a2a',
        burlywood : '#deb887',
        cadetblue : '#5f9ea0',
        chartreuse : '#7fff00',
        chocolate : '#d2691e',
        coral : '#ff7f50',
        cornflowerblue : '#6495ed',
        cornsilk : '#fff8dc',
        crimson : '#dc143c',
        cyan : '#0ff',
        darkblue : '#00008b',
        darkcyan : '#008b8b',
        darkgoldenrod : '#b8860b',
        darkgray : '#a9a9a9',
        darkgrey : '#a9a9a9',
        darkgreen : '#006400',
        darkkhaki : '#bdb76b',
        darkmagenta : '#8b008b',
        darkolivegreen : '#556b2f',
        darkorange : '#ff8c00',
        darkorchid : '#9932cc',
        darkred : '#8b0000',
        darksalmon : '#e9967a',
        darkseagreen : '#8fbc8f',
        darkslateblue : '#483d8b',
        darkslategray : '#2f4f4f',
        darkslategrey : '#2f4f4f',
        darkturquoise : '#00ced1',
        darkviolet : '#9400d3',
        deeppink : '#ff1493',
        deepskyblue : '#00bfff',
        dimgray : '#696969',
        dimgrey : '#696969',
        dodgerblue : '#1e90ff',
        firebrick : '#b22222',
        floralwhite : '#fffaf0',
        forestgreen : '#228b22',
        fuchsia : '#f0f',
        gainsboro : '#dcdcdc',
        ghostwhite : '#f8f8ff',
        gold : '#ffd700',
        goldenrod : '#daa520',
        gray : '#808080',
        grey : '#808080',
        green : '#008000',
        greenyellow : '#adff2f',
        honeydew : '#f0fff0',
        hotpink : '#ff69b4',
        indianred : '#cd5c5c',
        indigo : '#4b0082',
        ivory : '#fffff0',
        khaki : '#f0e68c',
        lavender : '#e6e6fa',
        lavenderblush : '#fff0f5',
        lawngreen : '#7cfc00',
        lemonchiffon : '#fffacd',
        lightblue : '#add8e6',
        lightcoral : '#f08080',
        lightcyan : '#e0ffff',
        lightgoldenrodyellow : '#fafad2',
        lightgray : '#d3d3d3',
        lightgrey : '#d3d3d3',
        lightgreen : '#90ee90',
        lightpink : '#ffb6c1',
        lightsalmon : '#ffa07a',
        lightseagreen : '#20b2aa',
        lightskyblue : '#87cefa',
        lightslategray : '#789',
        lightslategrey : '#789',
        lightsteelblue : '#b0c4de',
        lightyellow : '#ffffe0',
        lime : '#0f0',
        limegreen : '#32cd32',
        linen : '#faf0e6',
        magenta : '#f0f',
        maroon : '#800000',
        mediumaquamarine : '#66cdaa',
        mediumblue : '#0000cd',
        mediumorchid : '#ba55d3',
        mediumpurple : '#9370d8',
        mediumseagreen : '#3cb371',
        mediumslateblue : '#7b68ee',
        mediumspringgreen : '#00fa9a',
        mediumturquoise : '#48d1cc',
        mediumvioletred : '#c71585',
        midnightblue : '#191970',
        mintcream : '#f5fffa',
        mistyrose : '#ffe4e1',
        moccasin : '#ffe4b5',
        navajowhite : '#ffdead',
        navy : '#000080',
        oldlace : '#fdf5e6',
        olive : '#808000',
        olivedrab : '#6b8e23',
        orange : '#ffa500',
        orangered : '#ff4500',
        orchid : '#da70d6',
        palegoldenrod : '#eee8aa',
        palegreen : '#98fb98',
        paleturquoise : '#afeeee',
        palevioletred : '#d87093',
        papayawhip : '#ffefd5',
        peachpuff : '#ffdab9',
        peru : '#cd853f',
        pink : '#ffc0cb',
        plum : '#dda0dd',
        powderblue : '#b0e0e6',
        purple : '#800080',
        red : '#f00',
        rosybrown : '#bc8f8f',
        royalblue : '#4169e1',
        saddlebrown : '#8b4513',
        salmon : '#fa8072',
        sandybrown : '#f4a460',
        seagreen : '#2e8b57',
        seashell : '#fff5ee',
        sienna : '#a0522d',
        silver : '#c0c0c0',
        skyblue : '#87ceeb',
        slateblue : '#6a5acd',
        slategray : '#708090',
        slategrey : '#708090',
        snow : '#fffafa',
        springgreen : '#00ff7f',
        steelblue : '#4682b4',
        tan : '#d2b48c',
        teal : '#008080',
        thistle : '#d8bfd8',
        tomato : '#ff6347',
        turquoise : '#40e0d0',
        violet : '#ee82ee',
        wheat : '#f5deb3',
        white : '#fff',
        whitesmoke : '#f5f5f5',
        yellow : '#ff0',
        yellowgreen : '#9acd32'
    };

    /**
     * ×Ô¶¨Òåµ÷É«°å
     */
    function customPalette(userPalete) {
        palette = userPalete;
    }

    /**
     * ¸´Î»Ä¬ÈÏÉ«°å
     */
    function resetPalette() {
        palette = _palette;
    }

    /**
     * »ñÈ¡É«°åÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {number} idx É«°åÎ»ÖÃ
     * @param {Array.<string>} [userPalete] ×Ô¶¨ÒåÉ«°å
     * @return {string} ÑÕÉ«
     */
    function getColor(idx, userPalete) {
        idx = idx | 0;
        userPalete = userPalete || palette;
        return userPalete[idx % userPalete.length];
    }

    /**
     * ×Ô¶¨ÒåÄ¬ÈÏ¸ßÁÁÑÕÉ«
     */
    function customHighlight(userHighlightColor) {
        highlightColor = userHighlightColor;
    }

    /**
     * ÖØÖÃÄ¬ÈÏ¸ßÁÁÑÕÉ«
     */
    function resetHighlight() {
        _highlightColor = highlightColor;
    }

    /**
     * »ñÈ¡Ä¬ÈÏ¸ßÁÁÑÕÉ«
     */
    function getHighlightColor() {
        return highlightColor;
    }

    /**
     * ¾¶Ïò½¥±ä
     * @memberOf module:zrender/tool/color
     * @param {number} x0 ½¥±äÆðµã
     * @param {number} y0
     * @param {number} r0
     * @param {number} x1 ½¥±äÖÕµã
     * @param {number} y1
     * @param {number} r1
     * @param {Array} colorList ÑÕÉ«ÁÐ±í
     * @return {CanvasGradient}
     */
    function getRadialGradient(x0, y0, r0, x1, y1, r1, colorList) {
        if (!_ctx) {
            _ctx = util.getContext();
        }
        var gradient = _ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
        for (var i = 0, l = colorList.length; i < l; i++) {
            gradient.addColorStop(colorList[i][0], colorList[i][1]);
        }
        gradient.__nonRecursion = true;
        return gradient;
    }

    /**
     * ÏßÐÔ½¥±ä
     * @param {Object} x0 ½¥±äÆðµã
     * @param {Object} y0
     * @param {Object} x1 ½¥±äÖÕµã
     * @param {Object} y1
     * @param {Array} colorList ÑÕÉ«ÁÐ±í
     */
    function getLinearGradient(x0, y0, x1, y1, colorList) {
        if (!_ctx) {
            _ctx = util.getContext();
        }
        var gradient = _ctx.createLinearGradient(x0, y0, x1, y1);
        for (var i = 0, l = colorList.length; i < l; i++) {
            gradient.addColorStop(colorList[i][0], colorList[i][1]);
        }
        gradient.__nonRecursion = true;
        return gradient;
    }

    /**
     * »ñÈ¡Á½ÖÖÑÕÉ«Ö®¼ä½¥±äÑÕÉ«Êý×é
     * @param {color} start ÆðÊ¼ÑÕÉ«
     * @param {color} end ½áÊøÑÕÉ«
     * @param {number} step ½¥±ä¼¶Êý
     * @return {Array}  ÑÕÉ«Êý×é
     */
    function getStepColors(start, end, step) {
        start = toRGBA(start);
        end = toRGBA(end);
        start = getData(start);
        end = getData(end);

        var colors = [];
        var stepR = (end[0] - start[0]) / step;
        var stepG = (end[1] - start[1]) / step;
        var stepB = (end[2] - start[2]) / step;
        var stepA = (end[3] - start[3]) / step;
        // Éú³ÉÑÕÉ«¼¯ºÏ
        // fix by linfeng ÑÕÉ«¶Ñ»ý
        for (var i = 0, r = start[0], g = start[1], b = start[2], a = start[3]; i < step; i++) {
            colors[i] = toColor([
                adjust(Math.floor(r), [ 0, 255 ]),
                adjust(Math.floor(g), [ 0, 255 ]), 
                adjust(Math.floor(b), [ 0, 255 ]),
                a.toFixed(4) - 0
            ],'rgba');
            r += stepR;
            g += stepG;
            b += stepB;
            a += stepA;
        }
        r = end[0];
        g = end[1];
        b = end[2];
        a = end[3];
        colors[i] = toColor([r, g, b, a], 'rgba');
        return colors;
    }

    /**
     * »ñÈ¡Ö¸¶¨¼¶ÊýµÄ½¥±äÑÕÉ«Êý×é
     * @memberOf module:zrender/tool/color
     * @param {Array.<string>} colors ÑÕÉ«×é
     * @param {number} [step=20] ½¥±ä¼¶Êý
     * @return {Array.<string>}  ÑÕÉ«Êý×é
     */
    function getGradientColors(colors, step) {
        var ret = [];
        var len = colors.length;
        if (step === undefined) {
            step = 20;
        }
        if (len === 1) {
            ret = getStepColors(colors[0], colors[0], step);
        }
        else if (len > 1) {
            for (var i = 0, n = len - 1; i < n; i++) {
                var steps = getStepColors(colors[i], colors[i + 1], step);
                if (i < n - 1) {
                    steps.pop();
                }
                ret = ret.concat(steps);
            }
        }
        return ret;
    }

    /**
     * ÑÕÉ«ÖµÊý×é×ªÎªÖ¸¶¨¸ñÊ½ÑÕÉ«,ÀýÈç:<br/>
     * data = [60,20,20,0.1] format = 'rgba'
     * ·µ»Ø£ºrgba(60,20,20,0.1)
     * @param {Array} data ÑÕÉ«ÖµÊý×é
     * @param {string} format ¸ñÊ½,Ä¬ÈÏrgb
     * @return {string} ÑÕÉ«
     */
    function toColor(data, format) {
        format = format || 'rgb';
        if (data && (data.length === 3 || data.length === 4)) {
            data = map(data,
                function(c) {
                    return c > 1 ? Math.ceil(c) : c;
                }
            );

            if (format.indexOf('hex') > -1) {
                return '#' + ((1 << 24) + (data[0] << 16) + (data[1] << 8) + (+data[2])).toString(16).slice(1);
            }
            else if (format.indexOf('hs') > -1) {
                var sx = map(data.slice(1, 3),
                    function(c) {
                        return c + '%';
                    }
                );
                data[1] = sx[0];
                data[2] = sx[1];
            }

            if (format.indexOf('a') > -1) {
                if (data.length === 3) {
                    data.push(1);
                }
                data[3] = adjust(data[3], [ 0, 1 ]);
                return format + '(' + data.slice(0, 4).join(',') + ')';
            }

            return format + '(' + data.slice(0, 3).join(',') + ')';
        }
    }

    /**
     * ÑÕÉ«×Ö·û´®×ª»»ÎªrgbaÊý×é
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {Array.<number>} ÑÕÉ«ÖµÊý×é
     */
    function toArray(color) {
        color = trim(color);
        if (color.indexOf('rgba') < 0) {
            color = toRGBA(color);
        }

        var data = [];
        var i = 0;
        color.replace(/[\d.]+/g, function (n) {
            if (i < 3) {
                n = n | 0;
            }
            else {
                // Alpha
                n = +n;
            }
            data[i++] = n;
        });
        return data;
    }

    /**
     * ÑÕÉ«¸ñÊ½×ª»¯
     *
     * @param {string} color ÑÕÉ«ÖµÊý×é
     * @param {string} format ¸ñÊ½,Ä¬ÈÏrgb
     * @return {string} ÑÕÉ«
     */
    function convert(color, format) {
        if (!isCalculableColor(color)) {
            return color;
        }
        var data = getData(color);
        var alpha = data[3];
        if (typeof alpha === 'undefined') {
            alpha = 1;
        }

        if (color.indexOf('hsb') > -1) {
            data = _HSV_2_RGB(data);
        }
        else if (color.indexOf('hsl') > -1) {
            data = _HSL_2_RGB(data);
        }

        if (format.indexOf('hsb') > -1 || format.indexOf('hsv') > -1) {
            data = _RGB_2_HSB(data);
        }
        else if (format.indexOf('hsl') > -1) {
            data = _RGB_2_HSL(data);
        }

        data[3] = alpha;

        return toColor(data, format);
    }

    /**
     * ×ª»»Îªrgba¸ñÊ½µÄÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} rgbaÑÕÉ«£¬rgba(r,g,b,a)
     */
    function toRGBA(color) {
        return convert(color, 'rgba');
    }

    /**
     * ×ª»»ÎªrgbÊý×Ö¸ñÊ½µÄÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} rgbÑÕÉ«£¬rgb(0,0,0)¸ñÊ½
     */
    function toRGB(color) {
        return convert(color, 'rgb');
    }

    /**
     * ×ª»»Îª16½øÖÆÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} 16½øÖÆÑÕÉ«£¬#rrggbb¸ñÊ½
     */
    function toHex(color) {
        return convert(color, 'hex');
    }

    /**
     * ×ª»»ÎªHSVÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} HSVAÑÕÉ«£¬hsva(h,s,v,a)
     */
    function toHSVA(color) {
        return convert(color, 'hsva');
    }

    /**
     * ×ª»»ÎªHSVÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} HSVÑÕÉ«£¬hsv(h,s,v)
     */
    function toHSV(color) {
        return convert(color, 'hsv');
    }

    /**
     * ×ª»»ÎªHSBAÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} HSBAÑÕÉ«£¬hsba(h,s,b,a)
     */
    function toHSBA(color) {
        return convert(color, 'hsba');
    }

    /**
     * ×ª»»ÎªHSBÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} HSBÑÕÉ«£¬hsb(h,s,b)
     */
    function toHSB(color) {
        return convert(color, 'hsb');
    }

    /**
     * ×ª»»ÎªHSLAÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} HSLAÑÕÉ«£¬hsla(h,s,l,a)
     */
    function toHSLA(color) {
        return convert(color, 'hsla');
    }

    /**
     * ×ª»»ÎªHSLÑÕÉ«
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} HSLÑÕÉ«£¬hsl(h,s,l)
     */
    function toHSL(color) {
        return convert(color, 'hsl');
    }

    /**
     * ×ª»»ÑÕÉ«Ãû
     * 
     * @param {string} color ÑÕÉ«
     * @return {string} ÑÕÉ«Ãû
     */
    function toName(color) {
        for (var key in _nameColors) {
            if (toHex(_nameColors[key]) === toHex(color)) {
                return key;
            }
        }
        return null;
    }

    /**
     * ÒÆ³ýÑÕÉ«ÖÐ¶àÓà¿Õ¸ñ
     * 
     * @param {string} color ÑÕÉ«
     * @return {string} ÎÞ¿Õ¸ñÑÕÉ«
     */
    function trim(color) {
        return String(color).replace(/\s+/g, '');
    }

    /**
     * ÑÕÉ«¹æ·¶»¯
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} ¹æ·¶»¯ºóµÄÑÕÉ«
     */
    function normalize(color) {
        // ÑÕÉ«Ãû
        if (_nameColors[color]) {
            color = _nameColors[color];
        }
        // È¥µô¿Õ¸ñ
        color = trim(color);
        // hsvÓëhsbµÈ¼Û
        color = color.replace(/hsv/i, 'hsb');
        // rgb×ªÎªrrggbb
        if (/^#[\da-f]{3}$/i.test(color)) {
            color = parseInt(color.slice(1), 16);
            var r = (color & 0xf00) << 8;
            var g = (color & 0xf0) << 4;
            var b = color & 0xf;

            color = '#' + ((1 << 24) + (r << 4) + r + (g << 4) + g + (b << 4) + b).toString(16).slice(1);
        }
        // »òÕßÊ¹ÓÃÒÔÏÂÕýÔòÌæ»»£¬²»¹ý chrome ÏÂÐÔÄÜÏà¶Ô²îµã
        // color = color.replace(/^#([\da-f])([\da-f])([\da-f])$/i, '#$1$1$2$2$3$3');
        return color;
    }

    /**
     * ÑÕÉ«¼ÓÉî»ò¼õµ­£¬µ±level>0¼ÓÉî£¬µ±level<0¼õµ­
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @param {number} level Éý½µ³Ì¶È,È¡ÖµÇø¼ä[-1,1]
     * @return {string} ¼ÓÉî»ò¼õµ­ºóÑÕÉ«Öµ
     */
    function lift(color, level) {
        if (!isCalculableColor(color)) {
            return color;
        }
        var direct = level > 0 ? 1 : -1;
        if (typeof level === 'undefined') {
            level = 0;
        }
        level = Math.abs(level) > 1 ? 1 : Math.abs(level);
        color = toRGB(color);
        var data = getData(color);
        for (var i = 0; i < 3; i++) {
            if (direct === 1) {
                data[i] = data[i] * (1 - level) | 0;
            }
            else {
                data[i] = ((255 - data[i]) * level + data[i]) | 0;
            }
        }
        return 'rgb(' + data.join(',') + ')';
    }

    /**
     * ÑÕÉ«·­×ª,[255-r,255-g,255-b,1-a]
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @return {string} ·­×ªÑÕÉ«
     */
    function reverse(color) {
        if (!isCalculableColor(color)) {
            return color;
        }
        var data = getData(toRGBA(color));
        data = map(data,
            function(c) {
                return 255 - c;
            }
        );
        return toColor(data, 'rgb');
    }

    /**
     * ¼òµ¥Á½ÖÖÑÕÉ«»ìºÏ
     * @memberOf module:zrender/tool/color
     * @param {string} color1 µÚÒ»ÖÖÑÕÉ«
     * @param {string} color2 µÚ¶þÖÖÑÕÉ«
     * @param {number} weight »ìºÏÈ¨ÖØ[0-1]
     * @return {string} ½á¹ûÉ«,rgb(r,g,b)»òrgba(r,g,b,a)
     */
    function mix(color1, color2, weight) {
        if (!isCalculableColor(color1) || !isCalculableColor(color2)) {
            return color1;
        }
        
        if (typeof weight === 'undefined') {
            weight = 0.5;
        }
        weight = 1 - adjust(weight, [ 0, 1 ]);

        var w = weight * 2 - 1;
        var data1 = getData(toRGBA(color1));
        var data2 = getData(toRGBA(color2));

        var d = data1[3] - data2[3];

        var weight1 = (((w * d === -1) ? w : (w + d) / (1 + w * d)) + 1) / 2;
        var weight2 = 1 - weight1;

        var data = [];

        for (var i = 0; i < 3; i++) {
            data[i] = data1[i] * weight1 + data2[i] * weight2;
        }

        var alpha = data1[3] * weight + data2[3] * (1 - weight);
        alpha = Math.max(0, Math.min(1, alpha));

        if (data1[3] === 1 && data2[3] === 1) {// ²»¿¼ÂÇÍ¸Ã÷¶È
            return toColor(data, 'rgb');
        }
        data[3] = alpha;
        return toColor(data, 'rgba');
    }

    /**
     * Ëæ»úÑÕÉ«
     * 
     * @return {string} ÑÕÉ«Öµ£¬#rrggbb¸ñÊ½
     */
    function random() {
        return '#' + (Math.random().toString(16) + '0000').slice(2, 8);
    }

    /**
     * »ñÈ¡ÑÕÉ«ÖµÊý×é,·µ»ØÖµ·¶Î§£º <br/>
     * RGB ·¶Î§[0-255] <br/>
     * HSL/HSV/HSB ·¶Î§[0-1]<br/>
     * AÍ¸Ã÷¶È·¶Î§[0-1]
     * Ö§³Ö¸ñÊ½£º
     * #rgb
     * #rrggbb
     * rgb(r,g,b)
     * rgb(r%,g%,b%)
     * rgba(r,g,b,a)
     * hsb(h,s,b) // hsvÓëhsbµÈ¼Û
     * hsb(h%,s%,b%)
     * hsba(h,s,b,a)
     * hsl(h,s,l)
     * hsl(h%,s%,l%)
     * hsla(h,s,l,a)
     *
     * @param {string} color ÑÕÉ«
     * @return {Array.<number>} ÑÕÉ«ÖµÊý×é»ònull
     */
    function getData(color) {
        color = normalize(color);
        var r = color.match(colorRegExp);
        if (r === null) {
            throw new Error('The color format error'); // ÑÕÉ«¸ñÊ½´íÎó
        }
        var d;
        var a;
        var data = [];
        var rgb;

        if (r[2]) {
            // #rrggbb
            d = r[2].replace('#', '').split('');
            rgb = [ d[0] + d[1], d[2] + d[3], d[4] + d[5] ];
            data = map(rgb,
                function(c) {
                    return adjust(parseInt(c, 16), [ 0, 255 ]);
                }
            );

        }
        else if (r[4]) {
            // rgb rgba
            var rgba = (r[4]).split(',');
            a = rgba[3];
            rgb = rgba.slice(0, 3);
            data = map(
                rgb,
                function(c) {
                    c = Math.floor(
                        c.indexOf('%') > 0 ? parseInt(c, 0) * 2.55 : c
                    );
                    return adjust(c, [ 0, 255 ]);
                }
            );

            if (typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }
        else if (r[5] || r[6]) {
            // hsb hsba hsl hsla
            var hsxa = (r[5] || r[6]).split(',');
            var h = parseInt(hsxa[0], 0) / 360;
            var s = hsxa[1];
            var x = hsxa[2];
            a = hsxa[3];
            data = map([ s, x ],
                function(c) {
                    return adjust(parseFloat(c) / 100, [ 0, 1 ]);
                }
            );
            data.unshift(h);
            if (typeof a !== 'undefined') {
                data.push(adjust(parseFloat(a), [ 0, 1 ]));
            }
        }
        return data;
    }

    /**
     * ÉèÖÃÑÕÉ«Í¸Ã÷¶È
     * @memberOf module:zrender/tool/color
     * @param {string} color ÑÕÉ«
     * @param {number} a Í¸Ã÷¶È,Çø¼ä[0,1]
     * @return {string} rgbaÑÕÉ«Öµ
     */
    function alpha(color, a) {
        if (!isCalculableColor(color)) {
            return color;
        }
        if (a === null) {
            a = 1;
        }
        var data = getData(toRGBA(color));
        data[3] = adjust(Number(a).toFixed(4), [ 0, 1 ]);

        return toColor(data, 'rgba');
    }

    // Êý×éÓ³Éä
    function map(array, fun) {
        if (typeof fun !== 'function') {
            throw new TypeError();
        }
        var len = array ? array.length : 0;
        for (var i = 0; i < len; i++) {
            array[i] = fun(array[i]);
        }
        return array;
    }

    // µ÷ÕûÖµÇø¼ä
    function adjust(value, region) {
        // < to <= & > to >=
        // modify by linzhifeng 2014-05-25 because -0 == 0
        if (value <= region[0]) {
            value = region[0];
        }
        else if (value >= region[1]) {
            value = region[1];
        }
        return value;
    }
    
    function isCalculableColor(color) {
        return color instanceof Array || typeof color === 'string';
    }

    // ²Î¼û http:// www.easyrgb.com/index.php?X=MATH
    function _HSV_2_RGB(data) {
        var H = data[0];
        var S = data[1];
        var V = data[2];
        // HSV from 0 to 1
        var R; 
        var G;
        var B;
        if (S === 0) {
            R = V * 255;
            G = V * 255;
            B = V * 255;
        }
        else {
            var h = H * 6;
            if (h === 6) {
                h = 0;
            }
            var i = h | 0;
            var v1 = V * (1 - S);
            var v2 = V * (1 - S * (h - i));
            var v3 = V * (1 - S * (1 - (h - i)));
            var r = 0;
            var g = 0;
            var b = 0;

            if (i === 0) {
                r = V;
                g = v3;
                b = v1;
            }
            else if (i === 1) {
                r = v2;
                g = V;
                b = v1;
            }
            else if (i === 2) {
                r = v1;
                g = V;
                b = v3;
            }
            else if (i === 3) {
                r = v1;
                g = v2;
                b = V;
            }
            else if (i === 4) {
                r = v3;
                g = v1;
                b = V;
            }
            else {
                r = V;
                g = v1;
                b = v2;
            }

            // RGB results from 0 to 255
            R = r * 255;
            G = g * 255;
            B = b * 255;
        }
        return [ R, G, B ];
    }

    function _HSL_2_RGB(data) {
        var H = data[0];
        var S = data[1];
        var L = data[2];
        // HSL from 0 to 1
        var R;
        var G;
        var B;
        if (S === 0) {
            R = L * 255;
            G = L * 255;
            B = L * 255;
        }
        else {
            var v2;
            if (L < 0.5) {
                v2 = L * (1 + S);
            }
            else {
                v2 = (L + S) - (S * L);
            }

            var v1 = 2 * L - v2;

            R = 255 * _HUE_2_RGB(v1, v2, H + (1 / 3));
            G = 255 * _HUE_2_RGB(v1, v2, H);
            B = 255 * _HUE_2_RGB(v1, v2, H - (1 / 3));
        }
        return [ R, G, B ];
    }

    function _HUE_2_RGB(v1, v2, vH) {
        if (vH < 0) {
            vH += 1;
        }
        if (vH > 1) {
            vH -= 1;
        }
        if ((6 * vH) < 1) {
            return (v1 + (v2 - v1) * 6 * vH);
        }
        if ((2 * vH) < 1) {
            return (v2);
        }
        if ((3 * vH) < 2) {
            return (v1 + (v2 - v1) * ((2 / 3) - vH) * 6);
        }
        return v1;
    }

    function _RGB_2_HSB(data) {
        // RGB from 0 to 255
        var R = (data[0] / 255);
        var G = (data[1] / 255);
        var B = (data[2] / 255);

        var vMin = Math.min(R, G, B); // Min. value of RGB
        var vMax = Math.max(R, G, B); // Max. value of RGB
        var delta = vMax - vMin; // Delta RGB value
        var V = vMax;
        var H;
        var S;

        // HSV results from 0 to 1
        if (delta === 0) {
            H = 0;
            S = 0;
        }
        else {
            S = delta / vMax;

            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

            if (R === vMax) {
                H = deltaB - deltaG;
            }
            else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            }
            else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }

            if (H < 0) {
                H += 1;
            }
            if (H > 1) {
                H -= 1;
            }
        }
        H = H * 360;
        S = S * 100;
        V = V * 100;
        return [ H, S, V ];
    }

    function _RGB_2_HSL(data) {
        // RGB from 0 to 255
        var R = (data[0] / 255);
        var G = (data[1] / 255);
        var B = (data[2] / 255);

        var vMin = Math.min(R, G, B); // Min. value of RGB
        var vMax = Math.max(R, G, B); // Max. value of RGB
        var delta = vMax - vMin; // Delta RGB value

        var L = (vMax + vMin) / 2;
        var H;
        var S;
        // HSL results from 0 to 1
        if (delta === 0) {
            H = 0;
            S = 0;
        }
        else {
            if (L < 0.5) {
                S = delta / (vMax + vMin);
            }
            else {
                S = delta / (2 - vMax - vMin);
            }

            var deltaR = (((vMax - R) / 6) + (delta / 2)) / delta;
            var deltaG = (((vMax - G) / 6) + (delta / 2)) / delta;
            var deltaB = (((vMax - B) / 6) + (delta / 2)) / delta;

            if (R === vMax) {
                H = deltaB - deltaG;
            }
            else if (G === vMax) {
                H = (1 / 3) + deltaR - deltaB;
            }
            else if (B === vMax) {
                H = (2 / 3) + deltaG - deltaR;
            }

            if (H < 0) {
                H += 1;
            }

            if (H > 1) {
                H -= 1;
            }
        }

        H = H * 360;
        S = S * 100;
        L = L * 100;

        return [ H, S, L ];
    }

    return {
        customPalette : customPalette,
        resetPalette : resetPalette,
        getColor : getColor,
        getHighlightColor : getHighlightColor,
        customHighlight : customHighlight,
        resetHighlight : resetHighlight,
        getRadialGradient : getRadialGradient,
        getLinearGradient : getLinearGradient,
        getGradientColors : getGradientColors,
        getStepColors : getStepColors,
        reverse : reverse,
        mix : mix,
        lift : lift,
        trim : trim,
        random : random,
        toRGB : toRGB,
        toRGBA : toRGBA,
        toHex : toHex,
        toHSL : toHSL,
        toHSLA : toHSLA,
        toHSB : toHSB,
        toHSBA : toHSBA,
        toHSV : toHSV,
        toHSVA : toHSVA,
        toName : toName,
        toColor : toColor,
        toArray : toArray,
        alpha : alpha,
        getData : getData
    };
});
define('zrender/tool/vector', [], function () {
        var ArrayCtor = typeof Float32Array === 'undefined'
            ? Array
            : Float32Array;

        /**
         * @typedef {Float32Array|Array.<number>} Vector2
         */
        /**
         * ¶þÎ¬ÏòÁ¿Àà
         * @exports zrender/tool/vector
         */
        var vector = {
            /**
             * ´´½¨Ò»¸öÏòÁ¿
             * @param {number} [x=0]
             * @param {number} [y=0]
             * @return {Vector2}
             */
            create: function (x, y) {
                var out = new ArrayCtor(2);
                out[0] = x || 0;
                out[1] = y || 0;
                return out;
            },

            /**
             * ¸´ÖÆÏòÁ¿Êý¾Ý
             * @param {Vector2} out
             * @param {Vector2} v
             * @return {Vector2}
             */
            copy: function (out, v) {
                out[0] = v[0];
                out[1] = v[1];
                return out;
            },

            /**
             * ¿ËÂ¡Ò»¸öÏòÁ¿
             * @param {Vector2} v
             * @return {Vector2}
             */
            clone: function (v) {
                var out = new ArrayCtor(2);
                out[0] = v[0];
                out[1] = v[1];
                return out;
            },

            /**
             * ÉèÖÃÏòÁ¿µÄÁ½¸öÏî
             * @param {Vector2} out
             * @param {number} a
             * @param {number} b
             * @return {Vector2} ½á¹û
             */
            set: function (out, a, b) {
                out[0] = a;
                out[1] = b;
                return out;
            },

            /**
             * ÏòÁ¿Ïà¼Ó
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            add: function (out, v1, v2) {
                out[0] = v1[0] + v2[0];
                out[1] = v1[1] + v2[1];
                return out;
            },

            /**
             * ÏòÁ¿Ëõ·ÅºóÏà¼Ó
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @param {number} a
             */
            scaleAndAdd: function (out, v1, v2, a) {
                out[0] = v1[0] + v2[0] * a;
                out[1] = v1[1] + v2[1] * a;
                return out;
            },

            /**
             * ÏòÁ¿Ïà¼õ
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            sub: function (out, v1, v2) {
                out[0] = v1[0] - v2[0];
                out[1] = v1[1] - v2[1];
                return out;
            },

            /**
             * ÏòÁ¿³¤¶È
             * @param {Vector2} v
             * @return {number}
             */
            len: function (v) {
                return Math.sqrt(this.lenSquare(v));
            },

            /**
             * ÏòÁ¿³¤¶ÈÆ½·½
             * @param {Vector2} v
             * @return {number}
             */
            lenSquare: function (v) {
                return v[0] * v[0] + v[1] * v[1];
            },

            /**
             * ÏòÁ¿³Ë·¨
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            mul: function (out, v1, v2) {
                out[0] = v1[0] * v2[0];
                out[1] = v1[1] * v2[1];
                return out;
            },

            /**
             * ÏòÁ¿³ý·¨
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             */
            div: function (out, v1, v2) {
                out[0] = v1[0] / v2[0];
                out[1] = v1[1] / v2[1];
                return out;
            },

            /**
             * ÏòÁ¿µã³Ë
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @return {number}
             */
            dot: function (v1, v2) {
                return v1[0] * v2[0] + v1[1] * v2[1];
            },

            /**
             * ÏòÁ¿Ëõ·Å
             * @param {Vector2} out
             * @param {Vector2} v
             * @param {number} s
             */
            scale: function (out, v, s) {
                out[0] = v[0] * s;
                out[1] = v[1] * s;
                return out;
            },

            /**
             * ÏòÁ¿¹éÒ»»¯
             * @param {Vector2} out
             * @param {Vector2} v
             */
            normalize: function (out, v) {
                var d = vector.len(v);
                if (d === 0) {
                    out[0] = 0;
                    out[1] = 0;
                }
                else {
                    out[0] = v[0] / d;
                    out[1] = v[1] / d;
                }
                return out;
            },

            /**
             * ¼ÆËãÏòÁ¿¼ä¾àÀë
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @return {number}
             */
            distance: function (v1, v2) {
                return Math.sqrt(
                    (v1[0] - v2[0]) * (v1[0] - v2[0])
                    + (v1[1] - v2[1]) * (v1[1] - v2[1])
                );
            },

            /**
             * ÏòÁ¿¾àÀëÆ½·½
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @return {number}
             */
            distanceSquare: function (v1, v2) {
                return (v1[0] - v2[0]) * (v1[0] - v2[0])
                    + (v1[1] - v2[1]) * (v1[1] - v2[1]);
            },

            /**
             * Çó¸ºÏòÁ¿
             * @param {Vector2} out
             * @param {Vector2} v
             */
            negate: function (out, v) {
                out[0] = -v[0];
                out[1] = -v[1];
                return out;
            },

            /**
             * ²åÖµÁ½¸öµã
             * @param {Vector2} out
             * @param {Vector2} v1
             * @param {Vector2} v2
             * @param {number} t
             */
            lerp: function (out, v1, v2, t) {
                // var ax = v1[0];
                // var ay = v1[1];
                out[0] = v1[0] + t * (v2[0] - v1[0]);
                out[1] = v1[1] + t * (v2[1] - v1[1]);
                return out;
            },
            
            /**
             * ¾ØÕó×ó³ËÏòÁ¿
             * @param {Vector2} out
             * @param {Vector2} v
             * @param {Vector2} m
             */
            applyTransform: function (out, v, m) {
                var x = v[0];
                var y = v[1];
                out[0] = m[0] * x + m[2] * y + m[4];
                out[1] = m[1] * x + m[3] * y + m[5];
                return out;
            },
            /**
             * ÇóÁ½¸öÏòÁ¿×îÐ¡Öµ
             * @param  {Vector2} out
             * @param  {Vector2} v1
             * @param  {Vector2} v2
             */
            min: function (out, v1, v2) {
                out[0] = Math.min(v1[0], v2[0]);
                out[1] = Math.min(v1[1], v2[1]);
                return out;
            },
            /**
             * ÇóÁ½¸öÏòÁ¿×î´óÖµ
             * @param  {Vector2} out
             * @param  {Vector2} v1
             * @param  {Vector2} v2
             */
            max: function (out, v1, v2) {
                out[0] = Math.max(v1[0], v2[0]);
                out[1] = Math.max(v1[1], v2[1]);
                return out;
            }
        };

        vector.length = vector.len;
        vector.lengthSquare = vector.lenSquare;
        vector.dist = vector.distance;
        vector.distSquare = vector.distanceSquare;
        
        return vector;
    });
define('zrender/tool/curve', ['require', './vector'], function (require) {

    var vector = require('./vector');

    'use strict';

    var EPSILON = 1e-4;

    var THREE_SQRT = Math.sqrt(3);
    var ONE_THIRD = 1 / 3;

    // ÁÙÊ±±äÁ¿
    var _v0 = vector.create();
    var _v1 = vector.create();
    var _v2 = vector.create();
    // var _v3 = vector.create();

    function isAroundZero(val) {
        return val > -EPSILON && val < EPSILON;
    }
    function isNotAroundZero(val) {
        return val > EPSILON || val < -EPSILON;
    }
    /*
    function evalCubicCoeff(a, b, c, d, t) {
        return ((a * t + b) * t + c) * t + d;
    }
    */

    /** 
     * ¼ÆËãÈý´Î±´Èû¶ûÖµ
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} t
     * @return {number}
     */
    function cubicAt(p0, p1, p2, p3, t) {
        var onet = 1 - t;
        return onet * onet * (onet * p0 + 3 * t * p1)
             + t * t * (t * p3 + 3 * onet * p2);
    }

    /** 
     * ¼ÆËãÈý´Î±´Èû¶ûµ¼ÊýÖµ
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} t
     * @return {number}
     */
    function cubicDerivativeAt(p0, p1, p2, p3, t) {
        var onet = 1 - t;
        return 3 * (
            ((p1 - p0) * onet + 2 * (p2 - p1) * t) * onet
            + (p3 - p2) * t * t
        );
    }

    /**
     * ¼ÆËãÈý´Î±´Èû¶û·½³Ì¸ù£¬Ê¹ÓÃÊ¢½ð¹«Ê½
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} val
     * @param  {Array.<number>} roots
     * @return {number} ÓÐÐ§¸ùÊýÄ¿
     */
    function cubicRootAt(p0, p1, p2, p3, val, roots) {
        // Evaluate roots of cubic functions
        var a = p3 + 3 * (p1 - p2) - p0;
        var b = 3 * (p2 - p1 * 2 + p0);
        var c = 3 * (p1  - p0);
        var d = p0 - val;

        var A = b * b - 3 * a * c;
        var B = b * c - 9 * a * d;
        var C = c * c - 3 * b * d;

        var n = 0;

        if (isAroundZero(A) && isAroundZero(B)) {
            if (isAroundZero(b)) {
                roots[0] = 0;
            }
            else {
                var t1 = -c / b;  //t1, t2, t3, b is not zero
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
        }
        else {
            var disc = B * B - 4 * A * C;

            if (isAroundZero(disc)) {
                var K = B / A;
                var t1 = -b / a + K;  // t1, a is not zero
                var t2 = -K / 2;  // t2, t3
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
            }
            else if (disc > 0) {
                var discSqrt = Math.sqrt(disc);
                var Y1 = A * b + 1.5 * a * (-B + discSqrt);
                var Y2 = A * b + 1.5 * a * (-B - discSqrt);
                if (Y1 < 0) {
                    Y1 = -Math.pow(-Y1, ONE_THIRD);
                }
                else {
                    Y1 = Math.pow(Y1, ONE_THIRD);
                }
                if (Y2 < 0) {
                    Y2 = -Math.pow(-Y2, ONE_THIRD);
                }
                else {
                    Y2 = Math.pow(Y2, ONE_THIRD);
                }
                var t1 = (-b - (Y1 + Y2)) / (3 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
            else {
                var T = (2 * A * b - 3 * a * B) / (2 * Math.sqrt(A * A * A));
                var theta = Math.acos(T) / 3;
                var ASqrt = Math.sqrt(A);
                var tmp = Math.cos(theta);
                
                var t1 = (-b - 2 * ASqrt * tmp) / (3 * a);
                var t2 = (-b + ASqrt * (tmp + THREE_SQRT * Math.sin(theta))) / (3 * a);
                var t3 = (-b + ASqrt * (tmp - THREE_SQRT * Math.sin(theta))) / (3 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
                if (t3 >= 0 && t3 <= 1) {
                    roots[n++] = t3;
                }
            }
        }
        return n;
    }

    /**
     * ¼ÆËãÈý´Î±´Èû¶û·½³Ì¼«ÏÞÖµµÄÎ»ÖÃ
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {Array.<number>} extrema
     * @return {number} ÓÐÐ§ÊýÄ¿
     */
    function cubicExtrema(p0, p1, p2, p3, extrema) {
        var b = 6 * p2 - 12 * p1 + 6 * p0;
        var a = 9 * p1 + 3 * p3 - 3 * p0 - 9 * p2;
        var c = 3 * p1 - 3 * p0;

        var n = 0;
        if (isAroundZero(a)) {
            if (isNotAroundZero(b)) {
                var t1 = -c / b;
                if (t1 >= 0 && t1 <=1) {
                    extrema[n++] = t1;
                }
            }
        }
        else {
            var disc = b * b - 4 * a * c;
            if (isAroundZero(disc)) {
                extrema[0] = -b / (2 * a);
            }
            else if (disc > 0) {
                var discSqrt = Math.sqrt(disc);
                var t1 = (-b + discSqrt) / (2 * a);
                var t2 = (-b - discSqrt) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    extrema[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    extrema[n++] = t2;
                }
            }
        }
        return n;
    }

    /**
     * Ï¸·ÖÈý´Î±´Èû¶ûÇúÏß
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} p3
     * @param  {number} t
     * @param  {Array.<number>} out
     */
    function cubicSubdivide(p0, p1, p2, p3, t, out) {
        var p01 = (p1 - p0) * t + p0;
        var p12 = (p2 - p1) * t + p1;
        var p23 = (p3 - p2) * t + p2;

        var p012 = (p12 - p01) * t + p01;
        var p123 = (p23 - p12) * t + p12;

        var p0123 = (p123 - p012) * t + p012;
        // Seg0
        out[0] = p0;
        out[1] = p01;
        out[2] = p012;
        out[3] = p0123;
        // Seg1
        out[4] = p0123;
        out[5] = p123;
        out[6] = p23;
        out[7] = p3;
    }

    /**
     * Í¶Éäµãµ½Èý´Î±´Èû¶ûÇúÏßÉÏ£¬·µ»ØÍ¶Éä¾àÀë¡£
     * Í¶ÉäµãÓÐ¿ÉÄÜ»áÓÐÒ»¸ö»òÕß¶à¸ö£¬ÕâÀïÖ»·µ»ØÆäÖÐ¾àÀë×î¶ÌµÄÒ»¸ö¡£
     * @param {number} x0
     * @param {number} y0
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} x3
     * @param {number} y3
     * @param {number} x
     * @param {number} y
     * @param {Array.<number>} [out] Í¶Éäµã
     * @return {number}
     */
    function cubicProjectPoint(
        x0, y0, x1, y1, x2, y2, x3, y3,
        x, y, out
    ) {
        // http://pomax.github.io/bezierinfo/#projections
        var t;
        var interval = 0.005;
        var d = Infinity;

        _v0[0] = x;
        _v0[1] = y;

        // ÏÈ´ÖÂÔ¹À¼ÆÒ»ÏÂ¿ÉÄÜµÄ×îÐ¡¾àÀëµÄ t Öµ
        // PENDING
        for (var _t = 0; _t < 1; _t += 0.05) {
            _v1[0] = cubicAt(x0, x1, x2, x3, _t);
            _v1[1] = cubicAt(y0, y1, y2, y3, _t);
            var d1 = vector.distSquare(_v0, _v1);
            if (d1 < d) {
                t = _t;
                d = d1;
            }
        }
        d = Infinity;

        // At most 32 iteration
        for (var i = 0; i < 32; i++) {
            if (interval < EPSILON) {
                break;
            }
            var prev = t - interval;
            var next = t + interval;
            // t - interval
            _v1[0] = cubicAt(x0, x1, x2, x3, prev);
            _v1[1] = cubicAt(y0, y1, y2, y3, prev);

            var d1 = vector.distSquare(_v1, _v0);

            if (prev >= 0 && d1 < d) {
                t = prev;
                d = d1;
            }
            else {
                // t + interval
                _v2[0] = cubicAt(x0, x1, x2, x3, next);
                _v2[1] = cubicAt(y0, y1, y2, y3, next);
                var d2 = vector.distSquare(_v2, _v0);

                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }
        // t
        if (out) {
            out[0] = cubicAt(x0, x1, x2, x3, t);
            out[1] = cubicAt(y0, y1, y2, y3, t);   
        }
        // console.log(interval, i);
        return Math.sqrt(d);
    }

    /**
     * ¼ÆËã¶þ´Î·½±´Èû¶ûÖµ
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @return {number}
     */
    function quadraticAt(p0, p1, p2, t) {
        var onet = 1 - t;
        return onet * (onet * p0 + 2 * t * p1) + t * t * p2;
    }

    /**
     * ¼ÆËã¶þ´Î·½±´Èû¶ûµ¼ÊýÖµ
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @return {number}
     */
    function quadraticDerivativeAt(p0, p1, p2, t) {
        return 2 * ((1 - t) * (p1 - p0) + t * (p2 - p1));
    }

    /**
     * ¼ÆËã¶þ´Î·½±´Èû¶û·½³Ì¸ù
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @param  {Array.<number>} roots
     * @return {number} ÓÐÐ§¸ùÊýÄ¿
     */
    function quadraticRootAt(p0, p1, p2, val, roots) {
        var a = p0 - 2 * p1 + p2;
        var b = 2 * (p1 - p0);
        var c = p0 - val;

        var n = 0;
        if (isAroundZero(a)) {
            if (isNotAroundZero(b)) {
                var t1 = -c / b;
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
        }
        else {
            var disc = b * b - 4 * a * c;
            if (isAroundZero(disc)) {
                var t1 = -b / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
            }
            else if (disc > 0) {
                var discSqrt = Math.sqrt(disc);
                var t1 = (-b + discSqrt) / (2 * a);
                var t2 = (-b - discSqrt) / (2 * a);
                if (t1 >= 0 && t1 <= 1) {
                    roots[n++] = t1;
                }
                if (t2 >= 0 && t2 <= 1) {
                    roots[n++] = t2;
                }
            }
        }
        return n;
    }

    /**
     * ¼ÆËã¶þ´Î±´Èû¶û·½³Ì¼«ÏÞÖµ
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @return {number}
     */
    function quadraticExtremum(p0, p1, p2) {
        var divider = p0 + p2 - 2 * p1;
        if (divider === 0) {
            // p1 is center of p0 and p2 
            return 0.5;
        }
        else {
            return (p0 - p1) / divider;
        }
    }

    /**
     * Ï¸·Ö¶þ´Î±´Èû¶ûÇúÏß
     * @memberOf module:zrender/tool/curve
     * @param  {number} p0
     * @param  {number} p1
     * @param  {number} p2
     * @param  {number} t
     * @param  {Array.<number>} out
     */
    function quadraticSubdivide(p0, p1, p2, t, out) {
        var p01 = (p1 - p0) * t + p0;
        var p12 = (p2 - p1) * t + p1;
        var p012 = (p12 - p01) * t + p01;

        // Seg0
        out[0] = p0;
        out[1] = p01;
        out[2] = p012;

        // Seg1
        out[3] = p012;
        out[4] = p12;
        out[5] = p2;
    }

    /**
     * Í¶Éäµãµ½¶þ´Î±´Èû¶ûÇúÏßÉÏ£¬·µ»ØÍ¶Éä¾àÀë¡£
     * Í¶ÉäµãÓÐ¿ÉÄÜ»áÓÐÒ»¸ö»òÕß¶à¸ö£¬ÕâÀïÖ»·µ»ØÆäÖÐ¾àÀë×î¶ÌµÄÒ»¸ö¡£
     * @param {number} x0
     * @param {number} y0
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} x
     * @param {number} y
     * @param {Array.<number>} out Í¶Éäµã
     * @return {number}
     */
    function quadraticProjectPoint(
        x0, y0, x1, y1, x2, y2,
        x, y, out
    ) {
        // http://pomax.github.io/bezierinfo/#projections
        var t;
        var interval = 0.005;
        var d = Infinity;

        _v0[0] = x;
        _v0[1] = y;

        // ÏÈ´ÖÂÔ¹À¼ÆÒ»ÏÂ¿ÉÄÜµÄ×îÐ¡¾àÀëµÄ t Öµ
        // PENDING
        for (var _t = 0; _t < 1; _t += 0.05) {
            _v1[0] = quadraticAt(x0, x1, x2, _t);
            _v1[1] = quadraticAt(y0, y1, y2, _t);
            var d1 = vector.distSquare(_v0, _v1);
            if (d1 < d) {
                t = _t;
                d = d1;
            }
        }
        d = Infinity;

        // At most 32 iteration
        for (var i = 0; i < 32; i++) {
            if (interval < EPSILON) {
                break;
            }
            var prev = t - interval;
            var next = t + interval;
            // t - interval
            _v1[0] = quadraticAt(x0, x1, x2, prev);
            _v1[1] = quadraticAt(y0, y1, y2, prev);

            var d1 = vector.distSquare(_v1, _v0);

            if (prev >= 0 && d1 < d) {
                t = prev;
                d = d1;
            }
            else {
                // t + interval
                _v2[0] = quadraticAt(x0, x1, x2, next);
                _v2[1] = quadraticAt(y0, y1, y2, next);
                var d2 = vector.distSquare(_v2, _v0);
                if (next <= 1 && d2 < d) {
                    t = next;
                    d = d2;
                }
                else {
                    interval *= 0.5;
                }
            }
        }
        // t
        if (out) {
            out[0] = quadraticAt(x0, x1, x2, t);
            out[1] = quadraticAt(y0, y1, y2, t);   
        }
        // console.log(interval, i);
        return Math.sqrt(d);
    }

    return {

        cubicAt: cubicAt,

        cubicDerivativeAt: cubicDerivativeAt,

        cubicRootAt: cubicRootAt,

        cubicExtrema: cubicExtrema,

        cubicSubdivide: cubicSubdivide,

        cubicProjectPoint: cubicProjectPoint,

        quadraticAt: quadraticAt,

        quadraticDerivativeAt: quadraticDerivativeAt,

        quadraticRootAt: quadraticRootAt,

        quadraticExtremum: quadraticExtremum,

        quadraticSubdivide: quadraticSubdivide,

        quadraticProjectPoint: quadraticProjectPoint
    };
});
define('zrender/shape/Star', ['require', '../tool/math', './Base', '../tool/util'], function (require) {

        var math = require('../tool/math');
        var sin = math.sin;
        var cos = math.cos;
        var PI = Math.PI;

        var Base = require('./Base');

        /**
         * @alias module:zrender/shape/Star
         * @param {Object} options
         * @constructor
         * @extends module:zrender/shape/Base
         */
        var Star = function(options) {
            Base.call(this, options);
            /**
             * n½ÇÐÇ»æÖÆÑùÊ½
             * @name module:zrender/shape/Star#style
             * @type {module:zrender/shape/Star~IStarStyle}
             */
            /**
             * n½ÇÐÇ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Star#highlightStyle
             * @type {module:zrender/shape/Star~IStarStyle}
             */
        };

        Star.prototype = {
            type: 'star',

            /**
             * ´´½¨n½ÇÐÇ£¨n>3£©Â·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Star~IStarStyle} style
             */
            buildPath : function(ctx, style) {
                var n = style.n;
                if (!n || n < 2) {
                    return;
                }

                var x = style.x;
                var y = style.y;
                var r = style.r;
                var r0 = style.r0;

                // Èç¹ûÎ´Ö¸¶¨ÄÚ²¿¶¥µãÍâ½ÓÔ²°ë¾¶£¬Ôò×Ô¶¯¼ÆËã
                if (r0 == null) {
                    r0 = n > 4
                        // Ïà¸ôµÄÍâ²¿¶¥µãµÄÁ¬ÏßµÄ½»µã£¬
                        // ±»È¡ÎªÄÚ²¿½»µã£¬ÒÔ´Ë¼ÆËãr0
                        ? r * cos(2 * PI / n) / cos(PI / n)
                        // ¶þÈýËÄ½ÇÐÇµÄÌØÊâ´¦Àí
                        : r / 3;
                }

                var dStep = PI / n;
                var deg = -PI / 2;
                var xStart = x + r * cos(deg);
                var yStart = y + r * sin(deg);
                deg += dStep;

                // ¼ÇÂ¼±ß½çµã£¬ÓÃÓÚÅÐ¶Ïinside
                var pointList = style.pointList = [];
                pointList.push([ xStart, yStart ]);
                for (var i = 0, end = n * 2 - 1, ri; i < end; i++) {
                    ri = i % 2 === 0 ? r0 : r;
                    pointList.push([ x + ri * cos(deg), y + ri * sin(deg) ]);
                    deg += dStep;
                }
                pointList.push([ xStart, yStart ]);

                // »æÖÆ
                ctx.moveTo(pointList[0][0], pointList[0][1]);
                for (var i = 0; i < pointList.length; i++) {
                    ctx.lineTo(pointList[i][0], pointList[i][1]);
                }
                
                ctx.closePath();

                return;
            },

            /**
             * ·µ»Øn½ÇÐÇ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Star~IStarStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Star, Base);
        return Star;
    });
define('zrender/shape/Droplet', ['require', './Base', './util/PathProxy', '../tool/area', '../tool/util'], function (require) {
        'use strict';

        var Base = require('./Base');
        var PathProxy = require('./util/PathProxy');
        var area = require('../tool/area');

        /**
         * @alias module:zrender/shape/Droplet
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Droplet = function(options) {
            Base.call(this, options);
            this._pathProxy = new PathProxy();
            /**
             * Ë®µÎ»æÖÆÑùÊ½
             * @name module:zrender/shape/Droplet#style
             * @type {module:zrender/shape/Droplet~IDropletStyle}
             */
            /**
             * Ë®µÎ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Droplet#highlightStyle
             * @type {module:zrender/shape/Droplet~IDropletStyle}
             */
        };

        Droplet.prototype = {
            type: 'droplet',

            /**
             * ´´½¨Ë®µÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Droplet~IDropletStyle} style
             */
            buildPath : function(ctx, style) {
                var path = this._pathProxy || new PathProxy();
                path.begin(ctx);

                path.moveTo(style.x, style.y + style.a);
                path.bezierCurveTo(
                    style.x + style.a,
                    style.y + style.a,
                    style.x + style.a * 3 / 2,
                    style.y - style.a / 3,
                    style.x,
                    style.y - style.b
                );
                path.bezierCurveTo(
                    style.x - style.a * 3 / 2,
                    style.y - style.a / 3,
                    style.x - style.a,
                    style.y + style.a,
                    style.x,
                    style.y + style.a
                );
                path.closePath();
            },

            /**
             * ¼ÆËã·µ»ØË®µÎµÄ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Droplet~IDropletStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                if (!this._pathProxy.isEmpty()) {
                    this.buildPath(null, style);
                }
                return this._pathProxy.fastBoundingRect();
            },

            isCover: function (x, y) {
                var originPos = this.transformCoordToLocal(x, y);
                x = originPos[0];
                y = originPos[1];
                
                if (this.isCoverRect(x, y)) {
                    return area.isInsidePath(
                        this._pathProxy.pathCommands, this.style.lineWidth, this.style.brushType, x, y
                    );
                }
            }
        };

        require('../tool/util').inherits(Droplet, Base);
        return Droplet;
    });
define('zrender/shape/Heart', ['require', './Base', './util/PathProxy', '../tool/area', '../tool/util'], function (require) {
        'use strict';
        
        var Base = require('./Base');
        var PathProxy = require('./util/PathProxy');
        var area = require('../tool/area');
        
        /**
         * @alias module:zrender/shape/Heart
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Heart = function (options) {
            Base.call(this, options);

            this._pathProxy = new PathProxy();
            /**
             * ÐÄÐÎ»æÖÆÑùÊ½
             * @name module:zrender/shape/Heart#style
             * @type {module:zrender/shape/Heart~IHeartStyle}
             */
            /**
             * ÐÄÐÎ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Heart#highlightStyle
             * @type {module:zrender/shape/Heart~IHeartStyle}
             */
        };

        Heart.prototype = {
            type: 'heart',

            /**
             * ´´½¨ÉÈÐÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Heart~IHeartStyle} style
             */
            buildPath : function (ctx, style) {
                var path = this._pathProxy || new PathProxy();
                path.begin(ctx);

                path.moveTo(style.x, style.y);
                path.bezierCurveTo(
                    style.x + style.a / 2,
                    style.y - style.b * 2 / 3,
                    style.x + style.a * 2,
                    style.y + style.b / 3,
                    style.x,
                    style.y + style.b
                );
                path.bezierCurveTo(
                    style.x - style.a *  2,
                    style.y + style.b / 3,
                    style.x - style.a / 2,
                    style.y - style.b * 2 / 3,
                    style.x,
                    style.y
                );
                path.closePath();
                return;
            },

            /**
             * ¼ÆËã·µ»ØÐÄÐÎµÄ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Heart~IHeartStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                if (!this._pathProxy.isEmpty()) {
                    this.buildPath(null, style);
                }
                return this._pathProxy.fastBoundingRect();
            },

            isCover: function (x, y) {
                var originPos = this.transformCoordToLocal(x, y);
                x = originPos[0];
                y = originPos[1];
                
                if (this.isCoverRect(x, y)) {
                    return area.isInsidePath(
                        this._pathProxy.pathCommands, this.style.lineWidth, this.style.brushType, x, y
                    );
                }
            }
        };

        require('../tool/util').inherits(Heart, Base);
        return Heart;
    });
define('zrender/tool/math', [], function () {

        var _radians = Math.PI / 180;

        /**
         * @param {number} angle »¡¶È£¨½Ç¶È£©²ÎÊý
         * @param {boolean} isDegrees angle²ÎÊýÊÇ·ñÎª½Ç¶È¼ÆËã£¬Ä¬ÈÏÎªfalse£¬angleÎªÒÔ»¡¶È¼ÆÁ¿µÄ½Ç¶È
         */
        function sin(angle, isDegrees) {
            return Math.sin(isDegrees ? angle * _radians : angle);
        }

        /**
         * @param {number} angle »¡¶È£¨½Ç¶È£©²ÎÊý
         * @param {boolean} isDegrees angle²ÎÊýÊÇ·ñÎª½Ç¶È¼ÆËã£¬Ä¬ÈÏÎªfalse£¬angleÎªÒÔ»¡¶È¼ÆÁ¿µÄ½Ç¶È
         */
        function cos(angle, isDegrees) {
            return Math.cos(isDegrees ? angle * _radians : angle);
        }

        /**
         * ½Ç¶È×ª»¡¶È
         * @param {Object} angle
         */
        function degreeToRadian(angle) {
            return angle * _radians;
        }

        /**
         * »¡¶È×ª½Ç¶È
         * @param {Object} angle
         */
        function radianToDegree(angle) {
            return angle / _radians;
        }

        return {
            sin : sin,
            cos : cos,
            degreeToRadian : degreeToRadian,
            radianToDegree : radianToDegree
        };
    });
define('zrender/shape/util/PathProxy', ['require', '../../tool/vector'], function (require) {
    
    var vector = require('../../tool/vector');
    // var computeBoundingBox = require('../../tool/computeBoundingBox');

    var PathSegment = function(command, points) {
        this.command = command;
        this.points = points || null;
    };

    /**
     * @alias module:zrender/shape/tool/PathProxy
     * @constructor
     */
    var PathProxy = function () {

        /**
         * PathÃèÊöµÄÊý×é£¬ÓÃÓÚ`isInsidePath`µÄÅÐ¶Ï
         * @type {Array.<Object>}
         */
        this.pathCommands = [];

        this._ctx = null;

        this._min = [];
        this._max = [];
    };

    /**
     * ¿ìËÙ¼ÆËãPath°üÎ§ºÐ£¨²¢²»ÊÇ×îÐ¡°üÎ§ºÐ£©
     * @return {Object}
     */
    PathProxy.prototype.fastBoundingRect = function () {
        var min = this._min;
        var max = this._max;
        min[0] = min[1] = Infinity;
        max[0] = max[1] = -Infinity;
        for (var i = 0; i < this.pathCommands.length; i++) {
            var seg = this.pathCommands[i];
            var p = seg.points;
            switch (seg.command) {
                case 'M':
                    vector.min(min, min, p);
                    vector.max(max, max, p);
                    break;
                case 'L':
                    vector.min(min, min, p);
                    vector.max(max, max, p);
                    break;
                case 'C':
                    for (var j = 0; j < 6; j += 2) {
                        min[0] = Math.min(min[0], min[0], p[j]);
                        min[1] = Math.min(min[1], min[1], p[j + 1]);
                        max[0] = Math.max(max[0], max[0], p[j]);
                        max[1] = Math.max(max[1], max[1], p[j + 1]);
                    }
                    break;
                case 'Q':
                    for (var j = 0; j < 4; j += 2) {
                        min[0] = Math.min(min[0], min[0], p[j]);
                        min[1] = Math.min(min[1], min[1], p[j + 1]);
                        max[0] = Math.max(max[0], max[0], p[j]);
                        max[1] = Math.max(max[1], max[1], p[j + 1]);
                    }
                    break;
                case 'A':
                    var cx = p[0];
                    var cy = p[1];
                    var rx = p[2];
                    var ry = p[3];
                    min[0] = Math.min(min[0], min[0], cx - rx);
                    min[1] = Math.min(min[1], min[1], cy - ry);
                    max[0] = Math.max(max[0], max[0], cx + rx);
                    max[1] = Math.max(max[1], max[1], cy + ry);
                    break;
            }
        }

        return {
            x: min[0],
            y: min[1],
            width: max[0] - min[0],
            height: max[1] - min[1]
        };
    };

    /**
     * @param  {CanvasRenderingContext2D} ctx
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.begin = function (ctx) {
        this._ctx = ctx || null;
        // Çå¿ÕpathCommands
        this.pathCommands.length = 0;

        return this;
    };

    /**
     * @param  {number} x
     * @param  {number} y
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.moveTo = function (x, y) {
        this.pathCommands.push(new PathSegment('M', [x, y]));
        if (this._ctx) {
            this._ctx.moveTo(x, y);
        }
        return this;
    };

    /**
     * @param  {number} x
     * @param  {number} y
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.lineTo = function (x, y) {
        this.pathCommands.push(new PathSegment('L', [x, y]));
        if (this._ctx) {
            this._ctx.lineTo(x, y);
        }
        return this;
    };

    /**
     * @param  {number} x1
     * @param  {number} y1
     * @param  {number} x2
     * @param  {number} y2
     * @param  {number} x3
     * @param  {number} y3
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.bezierCurveTo = function (x1, y1, x2, y2, x3, y3) {
        this.pathCommands.push(new PathSegment('C', [x1, y1, x2, y2, x3, y3]));
        if (this._ctx) {
            this._ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
        }
        return this;
    };

    /**
     * @param  {number} x1
     * @param  {number} y1
     * @param  {number} x2
     * @param  {number} y2
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.quadraticCurveTo = function (x1, y1, x2, y2) {
        this.pathCommands.push(new PathSegment('Q', [x1, y1, x2, y2]));
        if (this._ctx) {
            this._ctx.quadraticCurveTo(x1, y1, x2, y2);
        }
        return this;
    };

    /**
     * @param  {number} cx
     * @param  {number} cy
     * @param  {number} r
     * @param  {number} startAngle
     * @param  {number} endAngle
     * @param  {boolean} anticlockwise
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.arc = function (cx, cy, r, startAngle, endAngle, anticlockwise) {
        this.pathCommands.push(new PathSegment(
            'A', [cx, cy, r, r, startAngle, endAngle - startAngle, 0, anticlockwise ? 0 : 1]
        ));
        if (this._ctx) {
            this._ctx.arc(cx, cy, r, startAngle, endAngle, anticlockwise);
        }
        return this;
    };

    // TODO
    PathProxy.prototype.arcTo = function (x1, y1, x2, y2, radius) {
        if (this._ctx) {
            this._ctx.arcTo(x1, y1, x2, y2, radius);
        }
        return this;
    };

    // TODO
    PathProxy.prototype.rect = function (x, y, w, h) {
        if (this._ctx) {
            this._ctx.rect(x, y, w, h);
        }
        return this;
    };

    /**
     * @return {module:zrender/shape/util/PathProxy}
     */
    PathProxy.prototype.closePath = function () {
        this.pathCommands.push(new PathSegment('z'));
        if (this._ctx) {
            this._ctx.closePath();
        }
        return this;
    };

    /**
     * ÊÇ·ñÃ»ÓÐPathÃüÁî
     * @return {boolean}
     */
    PathProxy.prototype.isEmpty = function() {
        return this.pathCommands.length === 0;
    };

    PathProxy.PathSegment = PathSegment;

    return PathProxy;
});
define('zrender/shape/util/dashedLineTo', [], function (/* require */) {

        var dashPattern = [ 5, 5 ];
        /**
         * ÐéÏßlineTo 
         */
        return function (ctx, x1, y1, x2, y2, dashLength) {
            // http://msdn.microsoft.com/en-us/library/ie/dn265063(v=vs.85).aspx
            if (ctx.setLineDash) {
                dashPattern[0] = dashPattern[1] = dashLength;
                ctx.setLineDash(dashPattern);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                return;
            }

            dashLength = typeof dashLength != 'number'
                            ? 5 
                            : dashLength;

            var dx = x2 - x1;
            var dy = y2 - y1;
            var numDashes = Math.floor(
                Math.sqrt(dx * dx + dy * dy) / dashLength
            );
            dx = dx / numDashes;
            dy = dy / numDashes;
            var flag = true;
            for (var i = 0; i < numDashes; ++i) {
                if (flag) {
                    ctx.moveTo(x1, y1);
                }
                else {
                    ctx.lineTo(x1, y1);
                }
                flag = !flag;
                x1 += dx;
                y1 += dy;
            }
            ctx.lineTo(x2, y2);
        };
    });
define('zrender/shape/Polygon', ['require', './Base', './util/smoothSpline', './util/smoothBezier', './util/dashedLineTo', '../tool/util'], function (require) {
        var Base = require('./Base');
        var smoothSpline = require('./util/smoothSpline');
        var smoothBezier = require('./util/smoothBezier');
        var dashedLineTo = require('./util/dashedLineTo');

        /**
         * @alias module:zrender/shape/Polygon
         * @param {Object} options
         * @constructor
         * @extends module:zrender/shape/Base
         */
        var Polygon = function (options) {
            Base.call(this, options);
            /**
             * ¶à±ßÐÎ»æÖÆÑùÊ½
             * @name module:zrender/shape/Polygon#style
             * @type {module:zrender/shape/Polygon~IPolygonStyle}
             */
            /**
             * ¶à±ßÐÎ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Polygon#highlightStyle
             * @type {module:zrender/shape/Polygon~IPolygonStyle}
             */
        };

        Polygon.prototype = {
            type: 'polygon',

            /**
             * ´´½¨¶à±ßÐÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Polygon~IPolygonStyle} style
             */
            buildPath : function (ctx, style) {
                // ËäÈ»ÄÜÖØÓÃbrokenLine£¬µ«µ×²ãÍ¼ÐÎ»ùÓÚÐÔÄÜ¿¼ÂÇ£¬ÖØ¸´´úÂë¼õÉÙµ÷ÓÃ°É
                var pointList = style.pointList;
                // ¿ªÊ¼µãºÍ½áÊøµãÖØ¸´
                /*
                var start = pointList[0];
                var end = pointList[pointList.length-1];

                if (start && end) {
                    if (start[0] == end[0] &&
                        start[1] == end[1]) {
                        // ÒÆ³ý×îºóÒ»¸öµã
                        pointList.pop();
                    }
                }
                */

                if (pointList.length < 2) {
                    // ÉÙÓÚ2¸öµã¾Í²»»­ÁË~
                    return;
                }

                if (style.smooth && style.smooth !== 'spline') {
                    var controlPoints = smoothBezier(
                        pointList, style.smooth, true, style.smoothConstraint
                    );

                    ctx.moveTo(pointList[0][0], pointList[0][1]);
                    var cp1;
                    var cp2;
                    var p;
                    var len = pointList.length;
                    for (var i = 0; i < len; i++) {
                        cp1 = controlPoints[i * 2];
                        cp2 = controlPoints[i * 2 + 1];
                        p = pointList[(i + 1) % len];
                        ctx.bezierCurveTo(
                            cp1[0], cp1[1], cp2[0], cp2[1], p[0], p[1]
                        );
                    }
                } 
                else {
                    if (style.smooth === 'spline') {
                        pointList = smoothSpline(pointList, true);
                    }

                    if (!style.lineType || style.lineType == 'solid') {
                        // Ä¬ÈÏÎªÊµÏß
                        ctx.moveTo(pointList[0][0], pointList[0][1]);
                        for (var i = 1, l = pointList.length; i < l; i++) {
                            ctx.lineTo(pointList[i][0], pointList[i][1]);
                        }
                        ctx.lineTo(pointList[0][0], pointList[0][1]);
                    }
                    else if (style.lineType == 'dashed'
                            || style.lineType == 'dotted'
                    ) {
                        var dashLength = 
                            style._dashLength
                            || (style.lineWidth || 1) 
                               * (style.lineType == 'dashed' ? 5 : 1);
                        style._dashLength = dashLength;
                        ctx.moveTo(pointList[0][0], pointList[0][1]);
                        for (var i = 1, l = pointList.length; i < l; i++) {
                            dashedLineTo(
                                ctx,
                                pointList[i - 1][0], pointList[i - 1][1],
                                pointList[i][0], pointList[i][1],
                                dashLength
                            );
                        }
                        dashedLineTo(
                            ctx,
                            pointList[pointList.length - 1][0], 
                            pointList[pointList.length - 1][1],
                            pointList[0][0],
                            pointList[0][1],
                            dashLength
                        );
                    }
                }

                ctx.closePath();
                return;
            },

            /**
             * ¼ÆËã·µ»Ø¶à±ßÐÎ°üÎ§ºÐ¾ØÕó
             * @param {module:zrender/shape/Polygon~IPolygonStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var minX =  Number.MAX_VALUE;
                var maxX =  Number.MIN_VALUE;
                var minY = Number.MAX_VALUE;
                var maxY = Number.MIN_VALUE;

                var pointList = style.pointList;
                for (var i = 0, l = pointList.length; i < l; i++) {
                    if (pointList[i][0] < minX) {
                        minX = pointList[i][0];
                    }
                    if (pointList[i][0] > maxX) {
                        maxX = pointList[i][0];
                    }
                    if (pointList[i][1] < minY) {
                        minY = pointList[i][1];
                    }
                    if (pointList[i][1] > maxY) {
                        maxY = pointList[i][1];
                    }
                }

                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                
                style.__rect = {
                    x : Math.round(minX - lineWidth / 2),
                    y : Math.round(minY - lineWidth / 2),
                    width : maxX - minX + lineWidth,
                    height : maxY - minY + lineWidth
                };
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Polygon, Base);
        return Polygon;
    });
define('echarts/util/shape/normalIsCover', [], function () {
    return function (x, y) {
        var originPos = this.transformCoordToLocal(x, y);
        x = originPos[0];
        y = originPos[1];

        return this.isCoverRect(x, y);
    };
});
define('echarts/echarts', ['require', './config', 'zrender/tool/util', 'zrender/tool/event', 'zrender/tool/env', 'zrender', 'zrender/config', './chart/island', './component/toolbox', './component', './component/title', './component/tooltip', './component/legend', './util/ecData', './chart', 'zrender/tool/color', './component/timeline', 'zrender/shape/Image', 'zrender/loadingEffect/Bar', 'zrender/loadingEffect/Bubble', 'zrender/loadingEffect/DynamicLine', 'zrender/loadingEffect/Ring', 'zrender/loadingEffect/Spin', 'zrender/loadingEffect/Whirling', './theme/macarons', './theme/infographic'], function (require) {
    var ecConfig = require('./config');
    var zrUtil = require('zrender/tool/util');
    var zrEvent = require('zrender/tool/event');

    var self = {};

    var _canvasSupported = require('zrender/tool/env').canvasSupported;
    var _idBase = new Date() - 0;
    var _instances = {};    // EChartsÊµÀýmapË÷Òý
    var DOM_ATTRIBUTE_KEY = '_echarts_instance_';

    self.version = '2.2.7';
    self.dependencies = {
        zrender: '2.1.1'
    };
    /**
     * Èë¿Ú·½·¨
     */
    self.init = function (dom, theme) {
        var zrender = require('zrender');
        if ((zrender.version.replace('.', '') - 0) < (self.dependencies.zrender.replace('.', '') - 0)) {
            console.error(
                'ZRender ' + zrender.version
                + ' is too old for ECharts ' + self.version
                + '. Current version need ZRender '
                + self.dependencies.zrender + '+'
            );
        }

        dom = dom instanceof Array ? dom[0] : dom;

        // domÓëechartsÊµÀýÓ³ÉäË÷Òý
        var key = dom.getAttribute(DOM_ATTRIBUTE_KEY);
        if (!key) {
            key = _idBase++;
            dom.setAttribute(DOM_ATTRIBUTE_KEY, key);
        }

        if (_instances[key]) {
            // Í¬Ò»¸ödomÉÏ¶à´Îinit£¬×Ô¶¯ÊÍ·ÅÒÑÓÐÊµÀý
            _instances[key].dispose();
        }
        _instances[key] = new Echarts(dom);
        _instances[key].id = key;
        _instances[key].canvasSupported = _canvasSupported;
        _instances[key].setTheme(theme);

        return _instances[key];
    };

    /**
     * Í¨¹ýid»ñµÃEChartsÊµÀý£¬id¿ÉÔÚÊµÀý»¯ºó¶ÁÈ¡
     */
    self.getInstanceById = function (key) {
        return _instances[key];
    };

    /**
     * ÏûÏ¢ÖÐÐÄ
     */
    function MessageCenter() {
        zrEvent.Dispatcher.call(this);
    }
    zrUtil.merge(MessageCenter.prototype, zrEvent.Dispatcher.prototype, true);

    /**
     * »ùÓÚzrenderÊµÏÖEcharts½Ó¿Ú²ã
     * @param {HtmlElement} dom ±ØÒª
     */
    function Echarts(dom) {
        // Fxxk IE11 for breaking initialization without a warrant;
        // Just set something to let it be!
        // by kener 2015-01-09
        dom.innerHTML = '';
        this._themeConfig = {}; // zrUtil.clone(ecConfig);

        this.dom = dom;
        // this._zr;
        // this._option;                    // curOption clone
        // this._optionRestore;             // for restore;
        // this._island;
        // this._toolbox;
        // this._timeline;
        // this._refreshInside;             // ÄÚ²¿Ë¢ÐÂ±êÖ¾Î»

        this._connected = false;
        this._status = {                    // ÓÃÓÚÍ¼±í¼äÍ¨ÐÅ
            dragIn: false,
            dragOut: false,
            needRefresh: false
        };
        this._curEventType = false;         // ÆÆÑ­»·ÐÅºÅµÆ
        this._chartList = [];               // Í¼±íÊµÀý

        this._messageCenter = new MessageCenter();

        this._messageCenterOutSide = new MessageCenter();    // Echarts²ãµÄÍâ²¿ÏûÏ¢ÖÐÐÄ£¬×öEcharts²ãµÄÏûÏ¢×ª·¢

        // resize·½·¨¾­³£±»°ó¶¨µ½window.resizeÉÏ£¬±Õ°üÒ»¸öthis
        this.resize = this.resize();

        // ³õÊ¼»¯::¹¹Ôìº¯Êý
        this._init();
    }

    /**
     * ZRender EVENT
     *
     * @inner
     * @const
     * @type {Object}
     */
    var ZR_EVENT = require('zrender/config').EVENT;

    /**
     * Òª°ó¶¨¼àÌýµÄzrenderÊÂ¼þÁÐ±í
     *
     * @const
     * @inner
     * @type {Array}
     */
    var ZR_EVENT_LISTENS = [
        'CLICK', 'DBLCLICK', 'MOUSEOVER', 'MOUSEOUT',
        'DRAGSTART', 'DRAGEND', 'DRAGENTER', 'DRAGOVER', 'DRAGLEAVE', 'DROP'
    ];

    /**
     * ¶ÔechartsµÄÊµÀýÖÐµÄchartListÊôÐÔ³ÉÔ±£¬Öð¸ö½øÐÐ·½·¨µ÷ÓÃ£¬±éÀúË³ÐòÎªÄæÐò
     * ÓÉÓÚÔÚÊÂ¼þ´¥·¢µÄÄ¬ÈÏÐÐÎª´¦ÀíÖÐ£¬¶à´ÎÓÃµ½ÏàÍ¬Âß¼­£¬ËùÒÔ³éÏóÁË¸Ã·½·¨
     * ÓÉÓÚËùÓÐµÄµ÷ÓÃ³¡¾°Àï£¬×î¶àÖ»ÓÐÁ½¸ö²ÎÊý£¬»ùÓÚÐÔÄÜºÍÌå»ý¿¼ÂÇ£¬ÕâÀï¾Í²»Ê¹ÓÃcall»òÕßapplyÁË
     *
     * @inner
     * @param {ECharts} ecInstance EChartsÊµÀý
     * @param {string} methodName Òªµ÷ÓÃµÄ·½·¨Ãû
     * @param {*} arg0 µ÷ÓÃ²ÎÊý1
     * @param {*} arg1 µ÷ÓÃ²ÎÊý2
     * @param {*} arg2 µ÷ÓÃ²ÎÊý3
     */
    function callChartListMethodReverse(ecInstance, methodName, arg0, arg1, arg2) {
        var chartList = ecInstance._chartList;
        var len = chartList.length;

        while (len--) {
            var chart = chartList[len];
            if (typeof chart[methodName] === 'function') {
                chart[methodName](arg0, arg1, arg2);
            }
        }
    }

    Echarts.prototype = {
        /**
         * ³õÊ¼»¯::¹¹Ôìº¯Êý
         */
        _init: function () {
            var self = this;
            var _zr = require('zrender').init(this.dom);
            this._zr = _zr;

            // wrap: n,e,d,t for name event data this
            this._messageCenter.dispatch = function(type, event, eventPackage, that) {
                eventPackage = eventPackage || {};
                eventPackage.type = type;
                eventPackage.event = event;

                self._messageCenter.dispatchWithContext(type, eventPackage, that);
                self._messageCenterOutSide.dispatchWithContext(type, eventPackage, that);

                // ÈçÏÂ×¢µôµÄ´úÂë£¬@see: https://github.com/ecomfe/echarts-discuss/issues/3
                // if (type != 'HOVER' && type != 'MOUSEOUT') {    // Æµ·±ÊÂ¼þÖ±½ÓÅ×³ö
                //     setTimeout(function(){
                //         self._messageCenterOutSide.dispatchWithContext(
                //             type, eventPackage, that
                //         );
                //     },50);
                // }
                // else {
                //     self._messageCenterOutSide.dispatchWithContext(
                //         type, eventPackage, that
                //     );
                // }
            };

            this._onevent = function(param){
                return self.__onevent(param);
            };
            for (var e in ecConfig.EVENT) {
                if (e != 'CLICK' && e != 'DBLCLICK'
                    && e != 'HOVER' && e != 'MOUSEOUT' && e != 'MAP_ROAM'
                ) {
                    this._messageCenter.bind(ecConfig.EVENT[e], this._onevent, this);
                }
            }


            var eventBehaviors = {};
            this._onzrevent = function (param) {
                return self[eventBehaviors[ param.type ]](param);
            };

            // ¹ÒÔØ¹ØÐÄµÄÊÂ¼þ
            for (var i = 0, len = ZR_EVENT_LISTENS.length; i < len; i++) {
                var eventName = ZR_EVENT_LISTENS[i];
                var eventValue = ZR_EVENT[eventName];
                eventBehaviors[eventValue] = '_on' + eventName.toLowerCase();
                _zr.on(eventValue, this._onzrevent);
            }

            this.chart = {};            // Í¼±íË÷Òý
            this.component = {};        // ×é¼þË÷Òý

            // ÄÚÖÃÍ¼±í
            // ¹Âµº
            var Island = require('./chart/island');
            this._island = new Island(this._themeConfig, this._messageCenter, _zr, {}, this);
            this.chart.island = this._island;

            // ÄÚÖÃÍ¨ÓÃ×é¼þ
            // ¹¤¾ßÏä
            var Toolbox = require('./component/toolbox');
            this._toolbox = new Toolbox(this._themeConfig, this._messageCenter, _zr, {}, this);
            this.component.toolbox = this._toolbox;

            var componentLibrary = require('./component');
            componentLibrary.define('title', require('./component/title'));
            componentLibrary.define('tooltip', require('./component/tooltip'));
            componentLibrary.define('legend', require('./component/legend'));

            if (_zr.getWidth() === 0 || _zr.getHeight() === 0) {
                console.error('Dom¡¯s width & height should be ready before init.');
            }
        },

        /**
         * EChartsÊÂ¼þ´¦ÀíÖÐÐÄ
         */
        __onevent: function (param){
            param.__echartsId = param.__echartsId || this.id;

            // À´×ÔÆäËûÁª¶¯Í¼±íµÄÊÂ¼þ
            var fromMyself = (param.__echartsId === this.id);

            if (!this._curEventType) {
                this._curEventType = param.type;
            }

            switch (param.type) {
                case ecConfig.EVENT.LEGEND_SELECTED :
                    this._onlegendSelected(param);
                    break;
                case ecConfig.EVENT.DATA_ZOOM :
                    if (!fromMyself) {
                        var dz = this.component.dataZoom;
                        if (dz) {
                            dz.silence(true);
                            dz.absoluteZoom(param.zoom);
                            dz.silence(false);
                        }
                    }
                    this._ondataZoom(param);
                    break;
                case ecConfig.EVENT.DATA_RANGE :
                    fromMyself && this._ondataRange(param);
                    break;
                case ecConfig.EVENT.MAGIC_TYPE_CHANGED :
                    if (!fromMyself) {
                        var tb = this.component.toolbox;
                        if (tb) {
                            tb.silence(true);
                            tb.setMagicType(param.magicType);
                            tb.silence(false);
                        }
                    }
                    this._onmagicTypeChanged(param);
                    break;
                case ecConfig.EVENT.DATA_VIEW_CHANGED :
                    fromMyself && this._ondataViewChanged(param);
                    break;
                case ecConfig.EVENT.TOOLTIP_HOVER :
                    fromMyself && this._tooltipHover(param);
                    break;
                case ecConfig.EVENT.RESTORE :
                    this._onrestore();
                    break;
                case ecConfig.EVENT.REFRESH :
                    fromMyself && this._onrefresh(param);
                    break;
                // Êó±êÍ¬²½
                case ecConfig.EVENT.TOOLTIP_IN_GRID :
                case ecConfig.EVENT.TOOLTIP_OUT_GRID :
                    if (!fromMyself) {
                        // Ö»´¦ÀíÀ´×ÔÍâ²¿µÄÊó±êÍ¬²½
                        var grid = this.component.grid;
                        if (grid) {
                            this._zr.trigger(
                                'mousemove',
                                {
                                    connectTrigger: true,
                                    zrenderX: grid.getX() + param.x * grid.getWidth(),
                                    zrenderY: grid.getY() + param.y * grid.getHeight()
                                }
                            );
                        }
                    }
                    else if (this._connected) {
                        // À´×Ô×Ô¼º£¬²¢ÇÒ´æÔÚ¶àÍ¼Áª¶¯£¬¿Õ¼ä×ø±êÓ³ÉäÐÞ¸Ä²ÎÊý·Ö·¢
                        var grid = this.component.grid;
                        if (grid) {
                            param.x = (param.event.zrenderX - grid.getX()) / grid.getWidth();
                            param.y = (param.event.zrenderY - grid.getY()) / grid.getHeight();
                        }
                    }
                    break;
                /*
                case ecConfig.EVENT.RESIZE :
                case ecConfig.EVENT.DATA_CHANGED :
                case ecConfig.EVENT.PIE_SELECTED :
                case ecConfig.EVENT.MAP_SELECTED :
                    break;
                */
            }

            // ¶àÍ¼Áª¶¯£¬Ö»×ö×Ô¼ºµÄÒ»¼¶ÊÂ¼þ·Ö·¢£¬±ÜÃâ¼¶ÁªÊÂ¼þÑ­»·
            if (this._connected && fromMyself && this._curEventType === param.type) {
                for (var c in this._connected) {
                    this._connected[c].connectedEventHandler(param);
                }
                // ·Ö·¢Íê±Ïºó¸´Î»
                this._curEventType = null;
            }

            if (!fromMyself || (!this._connected && fromMyself)) {  // ´¦ÀíÁËÍêÁª¶¯ÊÂ¼þ¸´Î»
                this._curEventType = null;
            }
        },

        /**
         * µã»÷ÊÂ¼þ£¬ÏìÓ¦zrenderÊÂ¼þ£¬°ü×°ºó·Ö·¢µ½Echarts²ã
         */
        _onclick: function (param) {
            callChartListMethodReverse(this, 'onclick', param);

            if (param.target) {
                var ecData = this._eventPackage(param.target);
                if (ecData && ecData.seriesIndex != null) {
                    this._messageCenter.dispatch(
                        ecConfig.EVENT.CLICK,
                        param.event,
                        ecData,
                        this
                    );
                }
            }
        },

        /**
         * Ë«»÷ÊÂ¼þ£¬ÏìÓ¦zrenderÊÂ¼þ£¬°ü×°ºó·Ö·¢µ½Echarts²ã
         */
        _ondblclick: function (param) {
            callChartListMethodReverse(this, 'ondblclick', param);

            if (param.target) {
                var ecData = this._eventPackage(param.target);
                if (ecData && ecData.seriesIndex != null) {
                    this._messageCenter.dispatch(
                        ecConfig.EVENT.DBLCLICK,
                        param.event,
                        ecData,
                        this
                    );
                }
            }
        },

        /**
         * Êó±êÒÆÈëÊÂ¼þ£¬ÏìÓ¦zrenderÊÂ¼þ£¬°ü×°ºó·Ö·¢µ½Echarts²ã
         */
        _onmouseover: function (param) {
            if (param.target) {
                var ecData = this._eventPackage(param.target);
                if (ecData && ecData.seriesIndex != null) {
                    this._messageCenter.dispatch(
                        ecConfig.EVENT.HOVER,
                        param.event,
                        ecData,
                        this
                    );
                }
            }
        },

        /**
         * Êó±êÒÆ³öÊÂ¼þ£¬ÏìÓ¦zrenderÊÂ¼þ£¬°ü×°ºó·Ö·¢µ½Echarts²ã
         */
        _onmouseout: function (param) {
            if (param.target) {
                var ecData = this._eventPackage(param.target);
                if (ecData && ecData.seriesIndex != null) {
                    this._messageCenter.dispatch(
                        ecConfig.EVENT.MOUSEOUT,
                        param.event,
                        ecData,
                        this
                    );
                }
            }
        },

        /**
         * dragstart»Øµ÷£¬¿É¼ÆËãÌØÐÔÊµÏÖ
         */
        _ondragstart: function (param) {
            // ¸´Î»ÓÃÓÚÍ¼±í¼äÍ¨ÐÅÍÏ×§±êÊ¶
            this._status = {
                dragIn: false,
                dragOut: false,
                needRefresh: false
            };

            callChartListMethodReverse(this, 'ondragstart', param);
        },

        /**
         * dragging»Øµ÷£¬¿É¼ÆËãÌØÐÔÊµÏÖ
         */
        _ondragenter: function (param) {
            callChartListMethodReverse(this, 'ondragenter', param);
        },

        /**
         * dragstart»Øµ÷£¬¿É¼ÆËãÌØÐÔÊµÏÖ
         */
        _ondragover: function (param) {
            callChartListMethodReverse(this, 'ondragover', param);
        },

        /**
         * dragstart»Øµ÷£¬¿É¼ÆËãÌØÐÔÊµÏÖ
         */
        _ondragleave: function (param) {
            callChartListMethodReverse(this, 'ondragleave', param);
        },

        /**
         * dragstart»Øµ÷£¬¿É¼ÆËãÌØÐÔÊµÏÖ
         */
        _ondrop: function (param) {
            callChartListMethodReverse(this, 'ondrop', param, this._status);
            this._island.ondrop(param, this._status);
        },

        /**
         * dragdone»Øµ÷ £¬¿É¼ÆËãÌØÐÔÊµÏÖ
         */
        _ondragend: function (param) {
            callChartListMethodReverse(this, 'ondragend', param, this._status);

            this._timeline && this._timeline.ondragend(param, this._status);
            this._island.ondragend(param, this._status);

            // ·¢Éú¹ýÖØ¼ÆËã
            if (this._status.needRefresh) {
                this._syncBackupData(this._option);

                var messageCenter = this._messageCenter;
                messageCenter.dispatch(
                    ecConfig.EVENT.DATA_CHANGED,
                    param.event,
                    this._eventPackage(param.target),
                    this
                );
                messageCenter.dispatch(ecConfig.EVENT.REFRESH, null, null, this);
            }
        },

        /**
         * Í¼ÀýÑ¡ÔñÏìÓ¦
         */
        _onlegendSelected: function (param) {
            // ÓÃÓÚÍ¼±í¼äÍ¨ÐÅ
            this._status.needRefresh = false;
            callChartListMethodReverse(this, 'onlegendSelected', param, this._status);

            if (this._status.needRefresh) {
                this._messageCenter.dispatch(ecConfig.EVENT.REFRESH, null, null, this);
            }
        },

        /**
         * Êý¾ÝÇøÓòËõ·ÅÏìÓ¦
         */
        _ondataZoom: function (param) {
            // ÓÃÓÚÍ¼±í¼äÍ¨ÐÅ
            this._status.needRefresh = false;
            callChartListMethodReverse(this, 'ondataZoom', param, this._status);

            if (this._status.needRefresh) {
                this._messageCenter.dispatch(ecConfig.EVENT.REFRESH, null, null, this);
            }
        },

        /**
         * ÖµÓòÂþÓÎÏìÓ¦
         */
        _ondataRange: function (param) {
            this._clearEffect();
            // ÓÃÓÚÍ¼±í¼äÍ¨ÐÅ
            this._status.needRefresh = false;
            callChartListMethodReverse(this, 'ondataRange', param, this._status);

            // Ã»ÓÐÏà»¥Ó°Ïì£¬Ö±½ÓË¢ÐÂ¼´¿É
            if (this._status.needRefresh) {
                this._zr.refreshNextFrame();
            }
        },

        /**
         * ¶¯Ì¬ÀàÐÍÇÐ»»ÏìÓ¦
         */
        _onmagicTypeChanged: function () {
            this._clearEffect();
            this._render(this._toolbox.getMagicOption());
        },

        /**
         * Êý¾ÝÊÓÍ¼ÐÞ¸ÄÏìÓ¦
         */
        _ondataViewChanged: function (param) {
            this._syncBackupData(param.option);
            this._messageCenter.dispatch(
                ecConfig.EVENT.DATA_CHANGED,
                null,
                param,
                this
            );
            this._messageCenter.dispatch(ecConfig.EVENT.REFRESH, null, null, this);
        },

        /**
         * tooltipÓëÍ¼±í¼äÍ¨ÐÅ
         */
        _tooltipHover: function (param) {
            var tipShape = [];
            callChartListMethodReverse(this, 'ontooltipHover', param, tipShape);
        },

        /**
         * »¹Ô­
         */
        _onrestore: function () {
            this.restore();
        },

        /**
         * Ë¢ÐÂ
         */
        _onrefresh: function (param) {
            this._refreshInside = true;
            this.refresh(param);
            this._refreshInside = false;
        },

        /**
         * Êý¾ÝÐÞ¸ÄºóµÄ·´ÏòÍ¬²½dataZoom³ÖÓÐµÄ±¸·ÝÊý¾Ý
         */
        _syncBackupData: function (curOption) {
            this.component.dataZoom && this.component.dataZoom.syncBackupData(curOption);
        },

        /**
         * ´ò°üEcharts²ãµÄÊÂ¼þ¸½¼þ
         */
        _eventPackage: function (target) {
            if (target) {
                var ecData = require('./util/ecData');

                var seriesIndex = ecData.get(target, 'seriesIndex');
                var dataIndex = ecData.get(target, 'dataIndex');

                dataIndex = seriesIndex != -1 && this.component.dataZoom
                            ? this.component.dataZoom.getRealDataIndex(
                                seriesIndex,
                                dataIndex
                              )
                            : dataIndex;
                return {
                    seriesIndex: seriesIndex,
                    seriesName: (ecData.get(target, 'series') || {}).name,
                    dataIndex: dataIndex,
                    data: ecData.get(target, 'data'),
                    name: ecData.get(target, 'name'),
                    value: ecData.get(target, 'value'),
                    special: ecData.get(target, 'special')
                };
            }
            return;
        },

        _noDataCheck: function(magicOption) {
            var series = magicOption.series;

            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].type == ecConfig.CHART_TYPE_MAP
                    || (series[i].data && series[i].data.length > 0)
                    || (series[i].markPoint && series[i].markPoint.data && series[i].markPoint.data.length > 0)
                    || (series[i].markLine && series[i].markLine.data && series[i].markLine.data.length > 0)
                    || (series[i].nodes && series[i].nodes.length > 0)
                    || (series[i].links && series[i].links.length > 0)
                    || (series[i].matrix && series[i].matrix.length > 0)
                    || (series[i].eventList && series[i].eventList.length > 0)
                ) {
                    return false;   // ´æÔÚÈÎÒâÊý¾ÝÔòÎª·Ç¿ÕÊý¾Ý
                }
            }
            var loadOption = (this._option && this._option.noDataLoadingOption)
                || this._themeConfig.noDataLoadingOption
                || ecConfig.noDataLoadingOption
                || {
                    text: (this._option && this._option.noDataText)
                          || this._themeConfig.noDataText
                          || ecConfig.noDataText,
                    effect: (this._option && this._option.noDataEffect)
                            || this._themeConfig.noDataEffect
                            || ecConfig.noDataEffect
                };
            // ¿ÕÊý¾Ý
            this.clear();
            this.showLoading(loadOption);
            return true;
        },

        /**
         * Í¼±íäÖÈ¾
         */
        _render: function (magicOption) {
            this._mergeGlobalConifg(magicOption);

            if (this._noDataCheck(magicOption)) {
                return;
            }

            var bgColor = magicOption.backgroundColor;
            if (bgColor) {
                if (!_canvasSupported
                    && bgColor.indexOf('rgba') != -1
                ) {
                    // IE6~8¶ÔRGBAµÄ´¦Àí£¬filter»á´øÀ´ÆäËûÑÕÉ«µÄÓ°Ïì
                    var cList = bgColor.split(',');
                    this.dom.style.filter = 'alpha(opacity=' +
                        cList[3].substring(0, cList[3].lastIndexOf(')')) * 100
                        + ')';
                    cList.length = 3;
                    cList[0] = cList[0].replace('a', '');
                    this.dom.style.backgroundColor = cList.join(',') + ')';
                }
                else {
                    this.dom.style.backgroundColor = bgColor;
                }
            }

            this._zr.clearAnimation();
            this._chartList = [];

            var chartLibrary = require('./chart');
            var componentLibrary = require('./component');

            if (magicOption.xAxis || magicOption.yAxis) {
                magicOption.grid = magicOption.grid || {};
                magicOption.dataZoom = magicOption.dataZoom || {};
            }

            var componentList = [
                'title', 'legend', 'tooltip', 'dataRange', 'roamController',
                'grid', 'dataZoom', 'xAxis', 'yAxis', 'polar'
            ];

            var ComponentClass;
            var componentType;
            var component;
            for (var i = 0, l = componentList.length; i < l; i++) {
                componentType = componentList[i];
                component = this.component[componentType];

                if (magicOption[componentType]) {
                    if (component) {
                        component.refresh && component.refresh(magicOption);
                    }
                    else {
                        ComponentClass = componentLibrary.get(
                            /^[xy]Axis$/.test(componentType) ? 'axis' : componentType
                        );
                        component = new ComponentClass(
                            this._themeConfig, this._messageCenter, this._zr,
                            magicOption, this, componentType
                        );
                        this.component[componentType] = component;
                    }
                    this._chartList.push(component);
                }
                else if (component) {
                    component.dispose();
                    this.component[componentType] = null;
                    delete this.component[componentType];
                }
            }

            var ChartClass;
            var chartType;
            var chart;
            var chartMap = {};      // ¼ÇÂ¼ÒÑ¾­³õÊ¼»¯µÄÍ¼±í
            for (var i = 0, l = magicOption.series.length; i < l; i++) {
                chartType = magicOption.series[i].type;
                if (!chartType) {
                    console.error('series[' + i + '] chart type has not been defined.');
                    continue;
                }

                if (!chartMap[chartType]) {
                    chartMap[chartType] = true;
                    ChartClass = chartLibrary.get(chartType);
                    if (ChartClass) {
                        if (this.chart[chartType]) {
                            chart = this.chart[chartType];
                            chart.refresh(magicOption);
                        }
                        else {
                            chart = new ChartClass(
                                this._themeConfig, this._messageCenter, this._zr,
                                magicOption, this
                            );
                        }
                        this._chartList.push(chart);
                        this.chart[chartType] = chart;
                    }
                    else {
                        console.error(chartType + ' has not been required.');
                    }
                }
            }

            // ÒÑÓÐÊµÀýµ«ÐÂoption²»´øÕâÀàÍ¼±íµÄÊµÀýÊÍ·Å
            for (chartType in this.chart) {
                if (chartType != ecConfig.CHART_TYPE_ISLAND  && !chartMap[chartType]) {
                    this.chart[chartType].dispose();
                    this.chart[chartType] = null;
                    delete this.chart[chartType];
                }
            }

            this.component.grid && this.component.grid.refixAxisShape(this.component);

            this._island.refresh(magicOption);
            this._toolbox.refresh(magicOption);

            magicOption.animation && !magicOption.renderAsImage
                ? this._zr.refresh()
                : this._zr.render();

            var imgId = 'IMG' + this.id;
            var img = document.getElementById(imgId);
            if (magicOption.renderAsImage && _canvasSupported) {
                // IE8- ²»Ö§³ÖÍ¼Æ¬äÖÈ¾ÐÎÊ½
                if (img) {
                    // ÒÑ¾­äÖÈ¾¹ýÔò¸üÐÂÏÔÊ¾
                    img.src = this.getDataURL(magicOption.renderAsImage);
                }
                else {
                    // Ã»ÓÐäÖÈ¾¹ý²åÈëimg dom
                    img = this.getImage(magicOption.renderAsImage);
                    img.id = imgId;
                    img.style.position = 'absolute';
                    img.style.left = 0;
                    img.style.top = 0;
                    this.dom.firstChild.appendChild(img);
                }
                this.un();
                this._zr.un();
                this._disposeChartList();
                this._zr.clear();
            }
            else if (img) {
                // É¾³ý¿ÉÄÜ´æÔÚµÄimg
                img.parentNode.removeChild(img);
            }
            img = null;

            this._option = magicOption;
        },

        /**
         * »¹Ô­
         */
        restore: function () {
            this._clearEffect();
            this._option = zrUtil.clone(this._optionRestore);
            this._disposeChartList();
            this._island.clear();
            this._toolbox.reset(this._option, true);
            this._render(this._option);
        },

        /**
         * Ë¢ÐÂ
         * @param {Object=} param£¬¿ÉÑ¡²ÎÊý£¬ÓÃÓÚ¸½´øoption£¬ÄÚ²¿Í¬²½ÓÃ£¬Íâ²¿²»½¨Òé´øÈëÊý¾ÝÐÞ¸Ä£¬ÎÞ·¨Í¬²½
         */
        refresh: function (param) {
            this._clearEffect();
            param = param || {};
            var magicOption = param.option;

            // Íâ²¿µ÷ÓÃµÄrefreshÇÒÓÐoption´øÈë
            if (!this._refreshInside && magicOption) {
                // ×ö¼òµ¥µÄ²îÒìºÏ²¢È¥Í¬²½ÄÚ²¿³ÖÓÐµÄÊý¾Ý¿ËÂ¡£¬²»½¨Òé´øÈëÊý¾Ý
                // ¿ªÆôÊý¾ÝÇøÓòËõ·Å¡¢ÍÏ×§ÖØ¼ÆËã¡¢Êý¾ÝÊÓÍ¼¿É±à¼­Ä£Ê½Çé¿öÏÂ£¬µ±ÓÃ»§²úÉúÁËÊý¾Ý±ä»¯ºóÎÞ·¨Í¬²½
                // ÈçÓÐ´øÈëoption´æÔÚÊý¾Ý±ä»¯£¬ÇëÖØÐÂsetOption
                magicOption = this.getOption();
                zrUtil.merge(magicOption, param.option, true);
                zrUtil.merge(this._optionRestore, param.option, true);
                this._toolbox.reset(magicOption);
            }

            this._island.refresh(magicOption);
            this._toolbox.refresh(magicOption);

            // Í£Ö¹¶¯»­
            this._zr.clearAnimation();
            // ÏÈÀ´ºóµ½£¬°²Ë³ÐòË¢ÐÂ¸÷ÖÖÍ¼±í£¬Í¼±íÄÚ²¿refreshÓÅ»¯¼ì²émagicOption£¬ÎÞÐè¸üÐÂÔò²»¸üÐÂ~
            for (var i = 0, l = this._chartList.length; i < l; i++) {
                this._chartList[i].refresh && this._chartList[i].refresh(magicOption);
            }
            this.component.grid && this.component.grid.refixAxisShape(this.component);
            this._zr.refresh();
        },

        /**
         * ÊÍ·ÅÍ¼±íÊµÀý
         */
        _disposeChartList: function () {
            this._clearEffect();

            // Í£Ö¹¶¯»­
            this._zr.clearAnimation();

            var len = this._chartList.length;
            while (len--) {
                var chart = this._chartList[len];

                if (chart) {
                    var chartType = chart.type;
                    this.chart[chartType] && delete this.chart[chartType];
                    this.component[chartType] && delete this.component[chartType];
                    chart.dispose && chart.dispose();
                }
            }

            this._chartList = [];
        },

        /**
         * ·ÇÍ¼±íÈ«¾ÖÊôÐÔmerge~~
         */
        _mergeGlobalConifg: function (magicOption) {
            var mergeList = [
                // ±³¾°ÑÕÉ«
                'backgroundColor',

                // ÍÏ×§ÖØ¼ÆËãÏà¹Ø
                'calculable', 'calculableColor', 'calculableHolderColor',

                // ¹ÂµºÏÔÊ¾Á¬½Ó·û
                'nameConnector', 'valueConnector',

                // ¶¯»­Ïà¹Ø
                'animation', 'animationThreshold',
                'animationDuration', 'animationDurationUpdate',
                'animationEasing', 'addDataAnimation',

                // Ä¬ÈÏ±êÖ¾Í¼ÐÎÀàÐÍÁÐ±í
                'symbolList',

                // ½µµÍÍ¼±íÄÚÔªËØÍÏ×§Ãô¸Ð¶È£¬µ¥Î»ms£¬²»½¨ÒéÍâ²¿¸ÉÔ¤
                'DRAG_ENABLE_TIME'
            ];

            var len = mergeList.length;
            while (len--) {
                var mergeItem = mergeList[len];
                if (magicOption[mergeItem] == null) {
                    magicOption[mergeItem] = this._themeConfig[mergeItem] != null
                        ? this._themeConfig[mergeItem]
                        : ecConfig[mergeItem];
                }
            }

            // ÊýÖµÏµÁÐµÄÑÕÉ«ÁÐ±í£¬²»´«Ôò²ÉÓÃÄÚÖÃÑÕÉ«£¬¿ÉÅäÊý×é£¬½èÓÃzrenderÊµÀý×¢Èë£¬»áÓÐ³åÍ»·çÏÕ£¬ÏÈÕâÑù
            var themeColor = magicOption.color;
            if (!(themeColor && themeColor.length)) {
                themeColor = this._themeConfig.color || ecConfig.color;
            }

            this._zr.getColor = function (idx) {
                var zrColor = require('zrender/tool/color');
                return zrColor.getColor(idx, themeColor);
            };

            if (!_canvasSupported) {
                // ²»Ö§³ÖCanvasµÄÇ¿ÖÆ¹Ø±Õ¶¯»­
                magicOption.animation = false;
                magicOption.addDataAnimation = false;
            }
        },

        /**
         * ÍòÄÜ½Ó¿Ú£¬ÅäÖÃÍ¼±íÊµÀýÈÎºÎ¿ÉÅäÖÃÑ¡Ïî£¬¶à´Îµ÷ÓÃÊ±optionÑ¡Ïî×ömerge´¦Àí
         * @param {Object} option
         * @param {boolean=} notMerge ¶à´Îµ÷ÓÃÊ±optionÑ¡ÏîÊÇÄ¬ÈÏÊÇºÏ²¢£¨merge£©µÄ£¬
         *                   Èç¹û²»ÐèÇó£¬¿ÉÒÔÍ¨¹ýnotMerger²ÎÊýÎªtrue×èÖ¹ÓëÉÏ´ÎoptionµÄºÏ²¢
         */
        setOption: function (option, notMerge) {
            if (!option.timeline) {
                return this._setOption(option, notMerge);
            }
            else {
                return this._setTimelineOption(option);
            }
        },

        /**
         * ÍòÄÜ½Ó¿Ú£¬ÅäÖÃÍ¼±íÊµÀýÈÎºÎ¿ÉÅäÖÃÑ¡Ïî£¬¶à´Îµ÷ÓÃÊ±optionÑ¡Ïî×ömerge´¦Àí
         * @param {Object} option
         * @param {boolean=} notMerge ¶à´Îµ÷ÓÃÊ±optionÑ¡ÏîÊÇÄ¬ÈÏÊÇºÏ²¢£¨merge£©µÄ£¬
         *                   Èç¹û²»ÐèÇó£¬¿ÉÒÔÍ¨¹ýnotMerger²ÎÊýÎªtrue×èÖ¹ÓëÉÏ´ÎoptionµÄºÏ²¢
         * @param {boolean=} Ä¬ÈÏfalse¡£keepTimeLine ±íÊ¾´Ótimeline×é¼þµ÷ÓÃ¶øÀ´£¬
         *                   ±íÊ¾µ±Ç°ÐÐÎªÊÇtimelineµÄÊý¾ÝÇÐ»»£¬±£³Ötimeline£¬
         *                   ·´Ö®Ïú»Ùtimeline¡£ Ïê¼ûIssue #1601
         */
        _setOption: function (option, notMerge, keepTimeLine) {
            if (!notMerge && this._option) {
                this._option = zrUtil.merge(
                    this.getOption(),
                    zrUtil.clone(option),
                    true
                );
            }
            else {
                this._option = zrUtil.clone(option);
                !keepTimeLine && this._timeline && this._timeline.dispose();
            }

            this._optionRestore = zrUtil.clone(this._option);

            if (!this._option.series || this._option.series.length === 0) {
                this._zr.clear();
                return;
            }

            if (this.component.dataZoom                         // ´æÔÚdataZoom¿Ø¼þ
                && (this._option.dataZoom                       // ²¢ÇÒÐÂoptionÒ²´æÔÚ
                    || (this._option.toolbox
                        && this._option.toolbox.feature
                        && this._option.toolbox.feature.dataZoom
                        && this._option.toolbox.feature.dataZoom.show
                    )
                )
            ) {
                // dataZoomÍ¬²½Êý¾Ý
                this.component.dataZoom.syncOption(this._option);
            }
            this._toolbox.reset(this._option);
            this._render(this._option);
            return this;
        },

        /**
         * ·µ»ØÄÚ²¿³ÖÓÐµÄµ±Ç°ÏÔÊ¾option¿ËÂ¡
         */
        getOption: function () {
            var magicOption = zrUtil.clone(this._option);

            var self = this;
            function restoreOption(prop) {
                var restoreSource = self._optionRestore[prop];

                if (restoreSource) {
                    if (restoreSource instanceof Array) {
                        var len = restoreSource.length;
                        while (len--) {
                            magicOption[prop][len].data = zrUtil.clone(
                                restoreSource[len].data
                            );
                        }
                    }
                    else {
                        magicOption[prop].data = zrUtil.clone(restoreSource.data);
                    }
                }
            }

            // ºáÖáÊý¾Ý»¹Ô­
            restoreOption('xAxis');

            // ×ÝÖáÊý¾Ý»¹Ô­
            restoreOption('yAxis');

            // ÏµÁÐÊý¾Ý»¹Ô­
            restoreOption('series');

            return magicOption;
        },

        /**
         * Êý¾ÝÉèÖÃ¿ì½Ý½Ó¿Ú
         * @param {Array} series
         * @param {boolean=} notMerge ¶à´Îµ÷ÓÃÊ±optionÑ¡ÏîÊÇÄ¬ÈÏÊÇºÏ²¢£¨merge£©µÄ£¬
         *                   Èç¹û²»ÐèÇó£¬¿ÉÒÔÍ¨¹ýnotMerger²ÎÊýÎªtrue×èÖ¹ÓëÉÏ´ÎoptionµÄºÏ²¢¡£
         */
        setSeries: function (series, notMerge) {
            if (!notMerge) {
                this.setOption({series: series});
            }
            else {
                this._option.series = series;
                this.setOption(this._option, notMerge);
            }
            return this;
        },

        /**
         * ·µ»ØÄÚ²¿³ÖÓÐµÄµ±Ç°ÏÔÊ¾series¿ËÂ¡
         */
        getSeries: function () {
            return this.getOption().series;
        },

        /**
         * timelineOption½Ó¿Ú£¬ÅäÖÃÍ¼±íÊµÀýÈÎºÎ¿ÉÅäÖÃÑ¡Ïî
         * @param {Object} option
         */
        _setTimelineOption: function(option) {
            this._timeline && this._timeline.dispose();
            var Timeline = require('./component/timeline');
            var timeline = new Timeline(
                this._themeConfig, this._messageCenter, this._zr, option, this
            );
            this._timeline = timeline;
            this.component.timeline = this._timeline;

            return this;
        },

        /**
         * ¶¯Ì¬Êý¾ÝÌí¼Ó
         * ÐÎ²ÎÎªµ¥×éÊý¾Ý²ÎÊý£¬¶à×éÊ±ÎªÊý¾Ý£¬ÄÚÈÝÍ¬[seriesIdx, data, isShift, additionData]
         * @param {number} seriesIdx ÏµÁÐË÷Òý
         * @param {number | Object} data Ôö¼ÓÊý¾Ý
         * @param {boolean=} isHead ÊÇ·ñ¶ÓÍ·¼ÓÈë£¬Ä¬ÈÏ£¬²»Ö¸¶¨»òfalseÊ±Îª¶ÓÎ²²åÈë
         * @param {boolean=} dataGrow ÊÇ·ñÔö³¤Êý¾Ý¶ÓÁÐ³¤¶È£¬Ä¬ÈÏ£¬²»Ö¸¶¨»òfalseÊ±ÒÆ³öÄ¿±êÊý×é¶ÔÎ»Êý¾Ý
         * @param {string=} additionData ÊÇ·ñÔö¼ÓÀàÄ¿Öá(±ýÍ¼ÎªÍ¼Àý)Êý¾Ý£¬¸½¼Ó²Ù×÷Í¬isHeadºÍdataGrow
         */
        addData: function (seriesIdx, data, isHead, dataGrow, additionData) {
            var params = seriesIdx instanceof Array
                ? seriesIdx
                : [[seriesIdx, data, isHead, dataGrow, additionData]];

            //this._optionRestore ºÍ magicOption ¶¼ÒªÍ¬²½
            var magicOption = this.getOption();
            var optionRestore = this._optionRestore;
            var self = this;
            for (var i = 0, l = params.length; i < l; i++) {
                seriesIdx = params[i][0];
                data = params[i][1];
                isHead = params[i][2];
                dataGrow = params[i][3];
                additionData = params[i][4];

                var seriesItem = optionRestore.series[seriesIdx];
                var inMethod = isHead ? 'unshift' : 'push';
                var outMethod = isHead ? 'pop' : 'shift';
                if (seriesItem) {
                    var seriesItemData = seriesItem.data;
                    var mSeriesItemData = magicOption.series[seriesIdx].data;

                    seriesItemData[inMethod](data);
                    mSeriesItemData[inMethod](data);
                    if (!dataGrow) {
                        seriesItemData[outMethod]();
                        data = mSeriesItemData[outMethod]();
                    }

                    if (additionData != null) {
                        var legend;
                        var legendData;

                        if (seriesItem.type === ecConfig.CHART_TYPE_PIE
                            && (legend = optionRestore.legend)
                            && (legendData = legend.data)
                        ) {
                            var mLegendData = magicOption.legend.data;
                            legendData[inMethod](additionData);
                            mLegendData[inMethod](additionData);

                            if (!dataGrow) {
                                var legendDataIdx = zrUtil.indexOf(legendData, data.name);
                                legendDataIdx != -1 && legendData.splice(legendDataIdx, 1);

                                legendDataIdx = zrUtil.indexOf(mLegendData, data.name);
                                legendDataIdx != -1 && mLegendData.splice(legendDataIdx, 1);
                            }
                        }
                        else if (optionRestore.xAxis != null && optionRestore.yAxis != null) {
                            // xÖáÀàÄ¿
                            var axisData;
                            var mAxisData;
                            var axisIdx = seriesItem.xAxisIndex || 0;

                            if (optionRestore.xAxis[axisIdx].type == null
                                || optionRestore.xAxis[axisIdx].type === 'category'
                            ) {
                                axisData = optionRestore.xAxis[axisIdx].data;
                                mAxisData = magicOption.xAxis[axisIdx].data;

                                axisData[inMethod](additionData);
                                mAxisData[inMethod](additionData);
                                if (!dataGrow) {
                                    axisData[outMethod]();
                                    mAxisData[outMethod]();
                                }
                            }

                            // yÖáÀàÄ¿
                            axisIdx = seriesItem.yAxisIndex || 0;
                            if (optionRestore.yAxis[axisIdx].type === 'category') {
                                axisData = optionRestore.yAxis[axisIdx].data;
                                mAxisData = magicOption.yAxis[axisIdx].data;

                                axisData[inMethod](additionData);
                                mAxisData[inMethod](additionData);
                                if (!dataGrow) {
                                    axisData[outMethod]();
                                    mAxisData[outMethod]();
                                }
                            }
                        }
                    }

                    // Í¬²½Í¼±íÄÚ×´Ì¬£¬¶¯»­ÐèÒª
                    this._option.series[seriesIdx].data = magicOption.series[seriesIdx].data;
                }
            }

            this._zr.clearAnimation();
            var chartList = this._chartList;
            var chartAnimationCount = 0;
            var chartAnimationDone = function () {
                chartAnimationCount--;
                if (chartAnimationCount === 0) {
                    animationDone();
                }
            };
            for (var i = 0, l = chartList.length; i < l; i++) {
                if (magicOption.addDataAnimation && chartList[i].addDataAnimation) {
                    chartAnimationCount++;
                    chartList[i].addDataAnimation(params, chartAnimationDone);
                }
            }

            // dataZoomÍ¬²½Êý¾Ý
            this.component.dataZoom && this.component.dataZoom.syncOption(magicOption);

            this._option = magicOption;
            function animationDone() {
                if (!self._zr) {
                    return; // ÒÑ¾­±»ÊÍ·Å
                }
                self._zr.clearAnimation();
                for (var i = 0, l = chartList.length; i < l; i++) {
                    // ÓÐaddData¶¯»­¾ÍÈ¥µô¹ý¶É¶¯»­
                    chartList[i].motionlessOnce =
                        magicOption.addDataAnimation && chartList[i].addDataAnimation;
                }
                self._messageCenter.dispatch(
                    ecConfig.EVENT.REFRESH,
                    null,
                    {option: magicOption},
                    self
                );
            }

            if (!magicOption.addDataAnimation) {
                setTimeout(animationDone, 0);
            }
            return this;
        },

        /**
         * ¶¯Ì¬[±ê×¢ | ±êÏß]Ìí¼Ó
         * @param {number} seriesIdx ÏµÁÐË÷Òý
         * @param {Object} markData [±ê×¢ | ±êÏß]¶ÔÏó£¬Ö§³Ö¶à¸ö
         */
        addMarkPoint: function (seriesIdx, markData) {
            return this._addMark(seriesIdx, markData, 'markPoint');
        },

        addMarkLine: function (seriesIdx, markData) {
            return this._addMark(seriesIdx, markData, 'markLine');
        },

        _addMark: function (seriesIdx, markData, markType) {
            var series = this._option.series;
            var seriesItem;

            if (series && (seriesItem = series[seriesIdx])) {
                var seriesR = this._optionRestore.series;
                var seriesRItem = seriesR[seriesIdx];
                var markOpt = seriesItem[markType];
                var markOptR = seriesRItem[markType];

                markOpt = seriesItem[markType] = markOpt || {data: []};
                markOptR = seriesRItem[markType] = markOptR || {data: []};

                for (var key in markData) {
                    if (key === 'data') {
                        // Êý¾Ýconcat
                        markOpt.data = markOpt.data.concat(markData.data);
                        markOptR.data = markOptR.data.concat(markData.data);
                    }
                    else if (typeof markData[key] != 'object' || markOpt[key] == null) {
                        // ¼òµ¥ÀàÐÍ»òÐÂÖµÖ±½Ó¸³Öµ
                        markOpt[key] = markOptR[key] = markData[key];
                    }
                    else {
                        // ·ÇÊý¾ÝµÄ¸´ÔÓ¶ÔÏómerge
                        zrUtil.merge(markOpt[key], markData[key], true);
                        zrUtil.merge(markOptR[key], markData[key], true);
                    }
                }

                var chart = this.chart[seriesItem.type];
                chart && chart.addMark(seriesIdx, markData, markType);
            }

            return this;
        },

        /**
         * ¶¯Ì¬[±ê×¢ | ±êÏß]É¾³ý
         * @param {number} seriesIdx ÏµÁÐË÷Òý
         * @param {string} markName [±ê×¢ | ±êÏß]Ãû³Æ
         */
        delMarkPoint: function (seriesIdx, markName) {
            return this._delMark(seriesIdx, markName, 'markPoint');
        },

        delMarkLine: function (seriesIdx, markName) {
            return this._delMark(seriesIdx, markName, 'markLine');
        },

        _delMark: function (seriesIdx, markName, markType) {
            var series = this._option.series;
            var seriesItem;
            var mark;
            var dataArray;

            if (!(
                    series
                    && (seriesItem = series[seriesIdx])
                    && (mark = seriesItem[markType])
                    && (dataArray = mark.data)
                )
            ) {
                return this;
            }

            markName = markName.split(' > ');
            var targetIndex = -1;

            for (var i = 0, l = dataArray.length; i < l; i++) {
                var dataItem = dataArray[i];
                if (dataItem instanceof Array) {
                    if (dataItem[0].name === markName[0]
                        && dataItem[1].name === markName[1]
                    ) {
                        targetIndex = i;
                        break;
                    }
                }
                else if (dataItem.name === markName[0]) {
                    targetIndex = i;
                    break;
                }
            }

            if (targetIndex > -1) {
                dataArray.splice(targetIndex, 1);
                this._optionRestore.series[seriesIdx][markType].data.splice(targetIndex, 1);

                var chart = this.chart[seriesItem.type];
                chart && chart.delMark(seriesIdx, markName.join(' > '), markType);
            }

            return this;
        },

        /**
         * »ñÈ¡µ±Ç°dom
         */
        getDom: function () {
            return this.dom;
        },

        /**
         * »ñÈ¡µ±Ç°zrenderÊµÀý£¬¿ÉÓÃÓÚÌí¼Ó¶îÎªµÄshapeºÍÉî¶È¿ØÖÆ
         */
        getZrender: function () {
            return this._zr;
        },

        /**
         * »ñÈ¡Base64Í¼Æ¬dataURL
         * @param {string} imgType Í¼Æ¬ÀàÐÍ£¬Ö§³Öpng|jpeg£¬Ä¬ÈÏÎªpng
         * @return imgDataURL
         */
        getDataURL: function (imgType) {
            if (!_canvasSupported) {
                return '';
            }

            if (this._chartList.length === 0) {
                // äÖÈ¾ÎªÍ¼Æ¬
                var imgId = 'IMG' + this.id;
                var img = document.getElementById(imgId);
                if (img) {
                    return img.src;
                }
            }

            // Çå³ý¿ÉÄÜ´æÔÚµÄtooltipÔªËØ
            var tooltip = this.component.tooltip;
            tooltip && tooltip.hideTip();

            switch (imgType) {
                case 'jpeg':
                    break;
                default:
                    imgType = 'png';
            }

            var bgColor = this._option.backgroundColor;
            if (bgColor && bgColor.replace(' ','') === 'rgba(0,0,0,0)') {
                bgColor = '#fff';
            }

            return this._zr.toDataURL('image/' + imgType, bgColor);
        },

        /**
         * »ñÈ¡img
         * @param {string} imgType Í¼Æ¬ÀàÐÍ£¬Ö§³Öpng|jpeg£¬Ä¬ÈÏÎªpng
         * @return img dom
         */
        getImage: function (imgType) {
            var title = this._optionRestore.title;
            var imgDom = document.createElement('img');
            imgDom.src = this.getDataURL(imgType);
            imgDom.title = (title && title.text) || 'ECharts';
            return imgDom;
        },

        /**
         * »ñÈ¡¶àÍ¼Áª¶¯µÄBase64Í¼Æ¬dataURL
         * @param {string} imgType Í¼Æ¬ÀàÐÍ£¬Ö§³Öpng|jpeg£¬Ä¬ÈÏÎªpng
         * @return imgDataURL
         */
        getConnectedDataURL: function (imgType) {
            if (!this.isConnected()) {
                return this.getDataURL(imgType);
            }

            var tempDom = this.dom;
            var imgList = {
                'self': {
                    img: this.getDataURL(imgType),
                    left: tempDom.offsetLeft,
                    top: tempDom.offsetTop,
                    right: tempDom.offsetLeft + tempDom.offsetWidth,
                    bottom: tempDom.offsetTop + tempDom.offsetHeight
                }
            };

            var minLeft = imgList.self.left;
            var minTop = imgList.self.top;
            var maxRight = imgList.self.right;
            var maxBottom = imgList.self.bottom;

            for (var c in this._connected) {
                tempDom = this._connected[c].getDom();
                imgList[c] = {
                    img: this._connected[c].getDataURL(imgType),
                    left: tempDom.offsetLeft,
                    top: tempDom.offsetTop,
                    right: tempDom.offsetLeft + tempDom.offsetWidth,
                    bottom: tempDom.offsetTop + tempDom.offsetHeight
                };

                minLeft = Math.min(minLeft, imgList[c].left);
                minTop = Math.min(minTop, imgList[c].top);
                maxRight = Math.max(maxRight, imgList[c].right);
                maxBottom = Math.max(maxBottom, imgList[c].bottom);
            }

            var zrDom = document.createElement('div');
            zrDom.style.position = 'absolute';
            zrDom.style.left = '-4000px';
            zrDom.style.width = (maxRight - minLeft) + 'px';
            zrDom.style.height = (maxBottom - minTop) + 'px';
            document.body.appendChild(zrDom);

            var zrImg = require('zrender').init(zrDom);

            var ImageShape = require('zrender/shape/Image');
            for (var c in imgList) {
                zrImg.addShape(new ImageShape({
                    style: {
                        x: imgList[c].left - minLeft,
                        y: imgList[c].top - minTop,
                        image: imgList[c].img
                    }
                }));
            }

            zrImg.render();
            var bgColor = this._option.backgroundColor;
            if (bgColor && bgColor.replace(/ /g, '') === 'rgba(0,0,0,0)') {
                bgColor = '#fff';
            }

            var image = zrImg.toDataURL('image/png', bgColor);

            setTimeout(function () {
                zrImg.dispose();
                zrDom.parentNode.removeChild(zrDom);
                zrDom = null;
            }, 100);

            return image;
        },

        /**
         * »ñÈ¡¶àÍ¼Áª¶¯µÄimg
         * @param {string} imgType Í¼Æ¬ÀàÐÍ£¬Ö§³Öpng|jpeg£¬Ä¬ÈÏÎªpng
         * @return img dom
         */
        getConnectedImage: function (imgType) {
            var title = this._optionRestore.title;
            var imgDom = document.createElement('img');
            imgDom.src = this.getConnectedDataURL(imgType);
            imgDom.title = (title && title.text) || 'ECharts';
            return imgDom;
        },

        /**
         * Íâ²¿½Ó¿Ú°ó¶¨ÊÂ¼þ
         * @param {Object} eventName ÊÂ¼þÃû³Æ
         * @param {Object} eventListener ÊÂ¼þÏìÓ¦º¯Êý
         */
        on: function (eventName, eventListener) {
            this._messageCenterOutSide.bind(eventName, eventListener, this);
            return this;
        },

        /**
         * Íâ²¿½Ó¿Ú½â³ýÊÂ¼þ°ó¶¨
         * @param {Object} eventName ÊÂ¼þÃû³Æ
         * @param {Object} eventListener ÊÂ¼þÏìÓ¦º¯Êý
         */
        un: function (eventName, eventListener) {
            this._messageCenterOutSide.unbind(eventName, eventListener);
            return this;
        },

        /**
         * ¶àÍ¼Áª¶¯
         * @param connectTarget{ECharts | Array <ECharts>} connectTarget Áª¶¯Ä¿±ê
         */
        connect: function (connectTarget) {
            if (!connectTarget) {
                return this;
            }

            if (!this._connected) {
                this._connected = {};
            }

            if (connectTarget instanceof Array) {
                for (var i = 0, l = connectTarget.length; i < l; i++) {
                    this._connected[connectTarget[i].id] = connectTarget[i];
                }
            }
            else {
                this._connected[connectTarget.id] = connectTarget;
            }

            return this;
        },

        /**
         * ½â³ý¶àÍ¼Áª¶¯
         * @param connectTarget{ECharts | Array <ECharts>} connectTarget ½â³ýÁª¶¯Ä¿±ê
         */
        disConnect: function (connectTarget) {
            if (!connectTarget || !this._connected) {
                return this;
            }

            if (connectTarget instanceof Array) {
                for (var i = 0, l = connectTarget.length; i < l; i++) {
                    delete this._connected[connectTarget[i].id];
                }
            }
            else {
                delete this._connected[connectTarget.id];
            }

            for (var k in this._connected) {
                return k, this; // ·Ç¿Õ
            }

            // ¿Õ£¬×ªÎª±êÖ¾Î»
            this._connected = false;
            return this;
        },

        /**
         * Áª¶¯ÊÂ¼þÏìÓ¦
         */
        connectedEventHandler: function (param) {
            if (param.__echartsId != this.id) {
                // À´×ÔÆäËûÁª¶¯Í¼±íµÄÊÂ¼þ
                this._onevent(param);
            }
        },

        /**
         * ÊÇ·ñ´æÔÚ¶àÍ¼Áª¶¯
         */
        isConnected: function () {
            return !!this._connected;
        },

        /**
         * ÏÔÊ¾loading¹ý¶É
         * @param {Object} loadingOption
         */
        showLoading: function (loadingOption) {
            var effectList = {
                bar: require('zrender/loadingEffect/Bar'),
                bubble: require('zrender/loadingEffect/Bubble'),
                dynamicLine: require('zrender/loadingEffect/DynamicLine'),
                ring: require('zrender/loadingEffect/Ring'),
                spin: require('zrender/loadingEffect/Spin'),
                whirling: require('zrender/loadingEffect/Whirling')
            };
            this._toolbox.hideDataView();

            loadingOption = loadingOption || {};

            var textStyle = loadingOption.textStyle || {};
            loadingOption.textStyle = textStyle;

            var finalTextStyle = zrUtil.merge(
                zrUtil.merge(
                    zrUtil.clone(textStyle),
                    this._themeConfig.textStyle
                ),
                ecConfig.textStyle
            );

            textStyle.textFont = finalTextStyle.fontStyle + ' '
                                 + finalTextStyle.fontWeight + ' '
                                 + finalTextStyle.fontSize + 'px '
                                 + finalTextStyle.fontFamily;

            textStyle.text = loadingOption.text
                             || (this._option && this._option.loadingText)
                             || this._themeConfig.loadingText
                             || ecConfig.loadingText;

            if (loadingOption.x != null) {
                textStyle.x = loadingOption.x;
            }
            if (loadingOption.y != null) {
                textStyle.y = loadingOption.y;
            }

            loadingOption.effectOption = loadingOption.effectOption || {};
            loadingOption.effectOption.textStyle = textStyle;

            var Effect = loadingOption.effect;
            if (typeof Effect === 'string' || Effect == null) {
                Effect =  effectList[
                              loadingOption.effect
                              || (this._option && this._option.loadingEffect)
                              || this._themeConfig.loadingEffect
                              || ecConfig.loadingEffect
                          ]
                          || effectList.spin;
            }
            this._zr.showLoading(new Effect(loadingOption.effectOption));
            return this;
        },

        /**
         * Òþ²Øloading¹ý¶É
         */
        hideLoading: function () {
            this._zr.hideLoading();
            return this;
        },

        /**
         * Ö÷ÌâÉèÖÃ
         */
        setTheme: function (theme) {
            if (theme) {
               if (typeof theme === 'string') {
                    // Ä¬ÈÏÖ÷Ìâ
                    switch (theme) {
                        case 'macarons':
                            theme = require('./theme/macarons');
                            break;
                        case 'infographic':
                            theme = require('./theme/infographic');
                            break;
                        default:
                            theme = {}; // require('./theme/default');
                    }
                }
                else {
                    theme = theme || {};
                }

                // // ¸´Î»Ä¬ÈÏÅäÖÃ
                // // this._themeConfig»á±»±ðµÄ¶ÔÏóÒýÓÃ³ÖÓÐ
                // // ËùÒÔ²»ÄÜ¸Ä³Éthis._themeConfig = {};
                // for (var key in this._themeConfig) {
                //     delete this._themeConfig[key];
                // }
                // for (var key in ecConfig) {
                //     this._themeConfig[key] = zrUtil.clone(ecConfig[key]);
                // }

                // // ÑÕÉ«Êý×éËætheme£¬²»merge
                // theme.color && (this._themeConfig.color = []);

                // // Ä¬ÈÏ±êÖ¾Í¼ÐÎÀàÐÍÁÐ±í£¬²»merge
                // theme.symbolList && (this._themeConfig.symbolList = []);

                // // Ó¦ÓÃÐÂÖ÷Ìâ
                // zrUtil.merge(this._themeConfig, zrUtil.clone(theme), true);
                this._themeConfig = theme;
            }

            if (!_canvasSupported) {   // IE8-
                var textStyle = this._themeConfig.textStyle;
                textStyle && textStyle.fontFamily && textStyle.fontFamily2
                    && (textStyle.fontFamily = textStyle.fontFamily2);

                textStyle = ecConfig.textStyle;
                textStyle.fontFamily = textStyle.fontFamily2;
            }

            this._timeline && this._timeline.setTheme(true);
            this._optionRestore && this.restore();
        },

        /**
         * ÊÓÍ¼ÇøÓò´óÐ¡±ä»¯¸üÐÂ£¬²»Ä¬ÈÏ°ó¶¨£¬¹©Ê¹ÓÃ·½°´Ðèµ÷ÓÃ
         */
        resize: function () {
            var self = this;
            return function(){
                self._clearEffect();
                self._zr.resize();
                if (self._option && self._option.renderAsImage && _canvasSupported) {
                    // äÖÈ¾ÎªÍ¼Æ¬ÖØ×ßrenderÄ£Ê½
                    self._render(self._option);
                    return self;
                }
                // Í£Ö¹¶¯»­
                self._zr.clearAnimation();
                self._island.resize();
                self._toolbox.resize();
                self._timeline && self._timeline.resize();
                // ÏÈÀ´ºóµ½£¬²»ÄÜ½öË¢ÐÂ×Ô¼º£¬Ò²²»ÄÜÔÚÉÏÒ»¸öÑ­»·ÖÐË¢ÐÂ£¬Èç×ø±êÏµÊý¾Ý¸Ä±ä»áÓ°ÏìÆäËûÍ¼±íµÄ´óÐ¡
                // ËùÒÔ°²Ë³ÐòË¢ÐÂ¸÷ÖÖÍ¼±í£¬Í¼±íÄÚ²¿refreshÓÅ»¯ÎÞÐè¸üÐÂÔò²»¸üÐÂ~
                for (var i = 0, l = self._chartList.length; i < l; i++) {
                    self._chartList[i].resize && self._chartList[i].resize();
                }
                self.component.grid && self.component.grid.refixAxisShape(self.component);
                self._zr.refresh();
                self._messageCenter.dispatch(ecConfig.EVENT.RESIZE, null, null, self);
                return self;
            };
        },

        _clearEffect: function() {
            this._zr.modLayer(ecConfig.EFFECT_ZLEVEL, { motionBlur: false });
            this._zr.painter.clearLayer(ecConfig.EFFECT_ZLEVEL);
        },

        /**
         * Çå³ýÒÑäÖÈ¾ÄÚÈÝ £¬clearºóechartsÊµÀý¿ÉÓÃ
         */
        clear: function () {
            this._disposeChartList();
            this._zr.clear();
            this._option = {};
            this._optionRestore = {};
            this.dom.style.backgroundColor = null;
            return this;
        },

        /**
         * ÊÍ·Å£¬disposeºóechartsÊµÀý²»¿ÉÓÃ
         */
        dispose: function () {
            var key = this.dom.getAttribute(DOM_ATTRIBUTE_KEY);
            key && delete _instances[key];

            this._island.dispose();
            this._toolbox.dispose();
            this._timeline && this._timeline.dispose();
            this._messageCenter.unbind();
            this.clear();
            this._zr.dispose();
            this._zr = null;
        }
    };

    return self;
});
define('zrender/shape/util/smoothSpline', ['require', '../../tool/vector'], function (require) {
        var vector = require('../../tool/vector');

        /**
         * @inner
         */
        function interpolate(p0, p1, p2, p3, t, t2, t3) {
            var v0 = (p2 - p0) * 0.5;
            var v1 = (p3 - p1) * 0.5;
            return (2 * (p1 - p2) + v0 + v1) * t3 
                    + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
                    + v0 * t + p1;
        }

        /**
         * @alias module:zrender/shape/util/smoothSpline
         * @param {Array} points Ïß¶Î¶¥µãÊý×é
         * @param {boolean} isLoop
         * @param {Array} constraint 
         * @return {Array}
         */
        return function (points, isLoop, constraint) {
            var len = points.length;
            var ret = [];

            var distance = 0;
            for (var i = 1; i < len; i++) {
                distance += vector.distance(points[i - 1], points[i]);
            }
            
            var segs = distance / 5;
            segs = segs < len ? len : segs;
            for (var i = 0; i < segs; i++) {
                var pos = i / (segs - 1) * (isLoop ? len : len - 1);
                var idx = Math.floor(pos);

                var w = pos - idx;

                var p0;
                var p1 = points[idx % len];
                var p2;
                var p3;
                if (!isLoop) {
                    p0 = points[idx === 0 ? idx : idx - 1];
                    p2 = points[idx > len - 2 ? len - 1 : idx + 1];
                    p3 = points[idx > len - 3 ? len - 1 : idx + 2];
                }
                else {
                    p0 = points[(idx - 1 + len) % len];
                    p2 = points[(idx + 1) % len];
                    p3 = points[(idx + 2) % len];
                }

                var w2 = w * w;
                var w3 = w * w2;

                ret.push([
                    interpolate(p0[0], p1[0], p2[0], p3[0], w, w2, w3),
                    interpolate(p0[1], p1[1], p2[1], p3[1], w, w2, w3)
                ]);
            }
            return ret;
        };
    });
define('zrender/shape/util/smoothBezier', ['require', '../../tool/vector'], function (require) {
        var vector = require('../../tool/vector');

        /**
         * ±´Èû¶ûÆ½»¬ÇúÏß
         * @alias module:zrender/shape/util/smoothBezier
         * @param {Array} points Ïß¶Î¶¥µãÊý×é
         * @param {number} smooth Æ½»¬µÈ¼¶, 0-1
         * @param {boolean} isLoop
         * @param {Array} constraint ½«¼ÆËã³öÀ´µÄ¿ØÖÆµãÔ¼ÊøÔÚÒ»¸ö°üÎ§ºÐÄÚ
         *                           ±ÈÈç [[0, 0], [100, 100]], Õâ¸ö°üÎ§ºÐ»áÓë
         *                           Õû¸öÕÛÏßµÄ°üÎ§ºÐ×öÒ»¸ö²¢¼¯ÓÃÀ´Ô¼Êø¿ØÖÆµã¡£
         * @param {Array} ¼ÆËã³öÀ´µÄ¿ØÖÆµãÊý×é
         */
        return function (points, smooth, isLoop, constraint) {
            var cps = [];

            var v = [];
            var v1 = [];
            var v2 = [];
            var prevPoint;
            var nextPoint;

            var hasConstraint = !!constraint;
            var min, max;
            if (hasConstraint) {
                min = [Infinity, Infinity];
                max = [-Infinity, -Infinity];
                for (var i = 0, len = points.length; i < len; i++) {
                    vector.min(min, min, points[i]);
                    vector.max(max, max, points[i]);
                }
                // ÓëÖ¸¶¨µÄ°üÎ§ºÐ×ö²¢¼¯
                vector.min(min, min, constraint[0]);
                vector.max(max, max, constraint[1]);
            }

            for (var i = 0, len = points.length; i < len; i++) {
                var point = points[i];
                var prevPoint;
                var nextPoint;

                if (isLoop) {
                    prevPoint = points[i ? i - 1 : len - 1];
                    nextPoint = points[(i + 1) % len];
                } 
                else {
                    if (i === 0 || i === len - 1) {
                        cps.push(vector.clone(points[i]));
                        continue;
                    } 
                    else {
                        prevPoint = points[i - 1];
                        nextPoint = points[i + 1];
                    }
                }

                vector.sub(v, nextPoint, prevPoint);

                // use degree to scale the handle length
                vector.scale(v, v, smooth);

                var d0 = vector.distance(point, prevPoint);
                var d1 = vector.distance(point, nextPoint);
                var sum = d0 + d1;
                if (sum !== 0) {
                    d0 /= sum;
                    d1 /= sum;
                }

                vector.scale(v1, v, -d0);
                vector.scale(v2, v, d1);
                var cp0 = vector.add([], point, v1);
                var cp1 = vector.add([], point, v2);
                if (hasConstraint) {
                    vector.max(cp0, cp0, min);
                    vector.min(cp0, cp0, max);
                    vector.max(cp1, cp1, min);
                    vector.min(cp1, cp1, max);
                }
                cps.push(cp0);
                cps.push(cp1);
            }
            
            if (isLoop) {
                cps.push(vector.clone(cps.shift()));
            }

            return cps;
        };
    });
define('zrender/tool/env', [], function () {
    // Zepto.js
    // (c) 2010-2013 Thomas Fuchs
    // Zepto.js may be freely distributed under the MIT license.

    function detect(ua) {
        var os = this.os = {};
        var browser = this.browser = {};
        var webkit = ua.match(/Web[kK]it[\/]{0,1}([\d.]+)/);
        var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/);
        var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);
        var ipod = ua.match(/(iPod)(.*OS\s([\d_]+))?/);
        var iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/);
        var webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/);
        var touchpad = webos && ua.match(/TouchPad/);
        var kindle = ua.match(/Kindle\/([\d.]+)/);
        var silk = ua.match(/Silk\/([\d._]+)/);
        var blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/);
        var bb10 = ua.match(/(BB10).*Version\/([\d.]+)/);
        var rimtabletos = ua.match(/(RIM\sTablet\sOS)\s([\d.]+)/);
        var playbook = ua.match(/PlayBook/);
        var chrome = ua.match(/Chrome\/([\d.]+)/) || ua.match(/CriOS\/([\d.]+)/);
        var firefox = ua.match(/Firefox\/([\d.]+)/);
        var ie = ua.match(/MSIE ([\d.]+)/);
        var safari = webkit && ua.match(/Mobile\//) && !chrome;
        var webview = ua.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/) && !chrome;
        var ie = ua.match(/MSIE\s([\d.]+)/);

        // Todo: clean this up with a better OS/browser seperation:
        // - discern (more) between multiple browsers on android
        // - decide if kindle fire in silk mode is android or not
        // - Firefox on Android doesn't specify the Android version
        // - possibly devide in os, device and browser hashes

        if (browser.webkit = !!webkit) browser.version = webkit[1];

        if (android) os.android = true, os.version = android[2];
        if (iphone && !ipod) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.');
        if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.');
        if (ipod) os.ios = os.ipod = true, os.version = ipod[3] ? ipod[3].replace(/_/g, '.') : null;
        if (webos) os.webos = true, os.version = webos[2];
        if (touchpad) os.touchpad = true;
        if (blackberry) os.blackberry = true, os.version = blackberry[2];
        if (bb10) os.bb10 = true, os.version = bb10[2];
        if (rimtabletos) os.rimtabletos = true, os.version = rimtabletos[2];
        if (playbook) browser.playbook = true;
        if (kindle) os.kindle = true, os.version = kindle[1];
        if (silk) browser.silk = true, browser.version = silk[1];
        if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true;
        if (chrome) browser.chrome = true, browser.version = chrome[1];
        if (firefox) browser.firefox = true, browser.version = firefox[1];
        if (ie) browser.ie = true, browser.version = ie[1];
        if (safari && (ua.match(/Safari/) || !!os.ios)) browser.safari = true;
        if (webview) browser.webview = true;
        if (ie) browser.ie = true, browser.version = ie[1];

        os.tablet = !!(ipad || playbook || (android && !ua.match(/Mobile/)) ||
            (firefox && ua.match(/Tablet/)) || (ie && !ua.match(/Phone/) && ua.match(/Touch/)));
        os.phone  = !!(!os.tablet && !os.ipod && (android || iphone || webos || blackberry || bb10 ||
            (chrome && ua.match(/Android/)) || (chrome && ua.match(/CriOS\/([\d.]+)/)) ||
            (firefox && ua.match(/Mobile/)) || (ie && ua.match(/Touch/))));

        return {
            browser: browser,
            os: os,
            // Ô­ÉúcanvasÖ§³Ö£¬¸Ä¼«¶ËµãÁË
            // canvasSupported : !(browser.ie && parseFloat(browser.version) < 9)
            canvasSupported : document.createElement('canvas').getContext ? true : false
        };
    }

    return detect(navigator.userAgent);
});
define('zrender/zrender', ['require', './dep/excanvas', './tool/util', './tool/log', './tool/guid', './Handler', './Painter', './Storage', './animation/Animation', './tool/env'], function (require) {
        /*
         * HTML5 Canvas for Internet Explorer!
         * Modern browsers like Firefox, Safari, Chrome and Opera support
         * the HTML5 canvas tag to allow 2D command-based drawing.
         * ExplorerCanvas brings the same functionality to Internet Explorer.
         * To use, web developers only need to include a single script tag
         * in their existing web pages.
         *
         * https://code.google.com/p/explorercanvas/
         * http://explorercanvas.googlecode.com/svn/trunk/excanvas.js
         */
        // ºËÐÄ´úÂë»áÉú³ÉÒ»¸öÈ«¾Ö±äÁ¿ G_vmlCanvasManager£¬Ä£¿é¸ÄÔìºó½èÓÃÓÚ¿ìËÙÅÐ¶ÏcanvasÖ§³Ö
        require('./dep/excanvas');

        var util = require('./tool/util');
        var log = require('./tool/log');
        var guid = require('./tool/guid');

        var Handler = require('./Handler');
        var Painter = require('./Painter');
        var Storage = require('./Storage');
        var Animation = require('./animation/Animation');

        var _instances = {};    // ZRenderÊµÀýmapË÷Òý

        /**
         * @exports zrender
         * @author Kener (@Kener-ÁÖ·å, kener.linfeng@gmail.com)
         *         pissang (https://www.github.com/pissang)
         */
        var zrender = {};
        /**
         * @type {string}
         */
        zrender.version = '2.1.1';

        /**
         * ´´½¨zrenderÊµÀý
         *
         * @param {HTMLElement} dom »æÍ¼ÈÝÆ÷
         * @return {module:zrender/ZRender} ZRenderÊµÀý
         */
        // ²»ÈÃÍâ²¿Ö±½Ónew ZRenderÊµÀý£¬ÎªÉ¶£¿
        // ²»ÎªÉ¶£¬Ìá¹©È«¾Ö¿É¿ØÍ¬Ê±¼õÉÙÈ«¾ÖÎÛÈ¾ºÍ½µµÍÃüÃû³åÍ»µÄ·çÏÕ£¡
        zrender.init = function(dom) {
            var zr = new ZRender(guid(), dom);
            _instances[zr.id] = zr;
            return zr;
        };

        /**
         * zrenderÊµÀýÏú»Ù
         * @param {module:zrender/ZRender} zr ZRender¶ÔÏó£¬²»´«ÔòÏú»ÙÈ«²¿
         */
        // ÔÚ_instancesÀïµÄË÷ÒýÒ²»áÉ¾³ýÁË
        // ¹ÜÉú¾ÍµÃ¹ÜËÀ£¬¿ÉÒÔÍ¨¹ýzrender.dispose(zr)Ïú»ÙÖ¸¶¨ZRenderÊµÀý
        // µ±È»Ò²¿ÉÒÔÖ±½Ózr.dispose()×Ô¼ºÏú»Ù
        zrender.dispose = function (zr) {
            if (zr) {
                zr.dispose();
            }
            else {
                for (var key in _instances) {
                    _instances[key].dispose();
                }
                _instances = {};
            }

            return zrender;
        };

        /**
         * »ñÈ¡zrenderÊµÀý
         * @param {string} id ZRender¶ÔÏóË÷Òý
         * @return {module:zrender/ZRender}
         */
        zrender.getInstance = function (id) {
            return _instances[id];
        };

        /**
         * É¾³ýzrenderÊµÀý£¬ZRenderÊµÀýdisposeÊ±»áµ÷ÓÃ£¬
         * É¾³ýºógetInstanceÔò·µ»Øundefined
         * ps: ½öÊÇÉ¾³ý£¬É¾³ýµÄÊµÀý²»´ú±íÒÑ¾­disposeÁË~~
         *     ÕâÊÇÒ»¸ö°ÚÍÑÈ«¾Özrender.dispose()×Ô¶¯Ïú»ÙµÄºóÃÅ£¬
         *     take care of yourself~
         *
         * @param {string} id ZRender¶ÔÏóË÷Òý
         */
        zrender.delInstance = function (id) {
            delete _instances[id];
            return zrender;
        };

        function getFrameCallback(zrInstance) {
            return function () {
                if (zrInstance._needsRefreshNextFrame) {
                    zrInstance.refresh();
                }
            };
        }

        /**
         * @module zrender/ZRender
         */
        /**
         * ZRender½Ó¿ÚÀà£¬¶ÔÍâ¿ÉÓÃµÄËùÓÐ½Ó¿Ú¶¼ÔÚÕâÀï
         * ·Çget½Ó¿ÚÍ³Ò»·µ»ØÖ§³ÖÁ´Ê½µ÷ÓÃ
         *
         * @constructor
         * @alias module:zrender/ZRender
         * @param {string} id Î¨Ò»±êÊ¶
         * @param {HTMLElement} dom dom¶ÔÏó£¬²»°ïÄã×ödocument.getElementById
         * @return {ZRender} ZRenderÊµÀý
         */
        var ZRender = function(id, dom) {
            /**
             * ÊµÀý id
             * @type {string}
             */
            this.id = id;
            this.env = require('./tool/env');

            this.storage = new Storage();
            this.painter = new Painter(dom, this.storage);
            this.handler = new Handler(dom, this.storage, this.painter);

            /**
             * @type {module:zrender/animation/Animation}
             */
            this.animation = new Animation({
                stage: {
                    update: getFrameCallback(this)
                }
            });
            this.animation.start();

            var self = this;
            this.painter.refreshNextFrame = function () {
                self.refreshNextFrame();
            };

            this._needsRefreshNextFrame = false;

            // ÐÞ¸Ä storage.delFromMap, Ã¿´ÎÉ¾³ýÔªËØÖ®Ç°É¾³ý¶¯»­
            // FIXME ÓÐµãugly
            var self = this;
            var storage = this.storage;
            var oldDelFromMap = storage.delFromMap;
            storage.delFromMap = function (elId) {
                var el = storage.get(elId);
                self.stopAnimation(el);
                oldDelFromMap.call(storage, elId);
            };
        };

        /**
         * »ñÈ¡ÊµÀýÎ¨Ò»±êÊ¶
         * @return {string}
         */
        ZRender.prototype.getId = function () {
            return this.id;
        };

        /**
         * Ìí¼ÓÍ¼ÐÎÐÎ×´µ½¸ù½Úµã
         * @deprecated Use {@link module:zrender/ZRender.prototype.addElement} instead
         * @param {module:zrender/shape/Base} shape ÐÎ×´¶ÔÏó£¬¿ÉÓÃÊôÐÔÈ«¼¯£¬Ïê¼û¸÷shape
         */
        ZRender.prototype.addShape = function (shape) {
            this.addElement(shape);
            return this;
        };

        /**
         * Ìí¼Ó×éµ½¸ù½Úµã
         * @deprecated Use {@link module:zrender/ZRender.prototype.addElement} instead
         * @param {module:zrender/Group} group
         */
        ZRender.prototype.addGroup = function(group) {
            this.addElement(group);
            return this;
        };

        /**
         * ´Ó¸ù½ÚµãÉ¾³ýÍ¼ÐÎÐÎ×´
         * @deprecated Use {@link module:zrender/ZRender.prototype.delElement} instead
         * @param {string} shapeId ÐÎ×´¶ÔÏóÎ¨Ò»±êÊ¶
         */
        ZRender.prototype.delShape = function (shapeId) {
            this.delElement(shapeId);
            return this;
        };

        /**
         * ´Ó¸ù½ÚµãÉ¾³ý×é
         * @deprecated Use {@link module:zrender/ZRender.prototype.delElement} instead
         * @param {string} groupId
         */
        ZRender.prototype.delGroup = function (groupId) {
            this.delElement(groupId);
            return this;
        };

        /**
         * ÐÞ¸ÄÍ¼ÐÎÐÎ×´
         * @deprecated Use {@link module:zrender/ZRender.prototype.modElement} instead
         * @param {string} shapeId ÐÎ×´¶ÔÏóÎ¨Ò»±êÊ¶
         * @param {Object} shape ÐÎ×´¶ÔÏó
         */
        ZRender.prototype.modShape = function (shapeId, shape) {
            this.modElement(shapeId, shape);
            return this;
        };

        /**
         * ÐÞ¸Ä×é
         * @deprecated Use {@link module:zrender/ZRender.prototype.modElement} instead
         * @param {string} groupId
         * @param {Object} group
         */
        ZRender.prototype.modGroup = function (groupId, group) {
            this.modElement(groupId, group);
            return this;
        };

        /**
         * Ìí¼ÓÔªËØ
         * @param  {string|module:zrender/Group|module:zrender/shape/Base} el
         */
        ZRender.prototype.addElement = function (el) {
            this.storage.addRoot(el);
            this._needsRefreshNextFrame = true;
            return this;
        };

        /**
         * É¾³ýÔªËØ
         * @param  {string|module:zrender/Group|module:zrender/shape/Base} el
         */
        ZRender.prototype.delElement = function (el) {
            this.storage.delRoot(el);
            this._needsRefreshNextFrame = true;
            return this;
        };

        /**
         * ÐÞ¸ÄÔªËØ, Ö÷Òª±ê¼ÇÍ¼ÐÎ»òÕß×éÐèÒªÔÚÏÂÒ»Ö¡Ë¢ÐÂ¡£
         * µÚ¶þ¸ö²ÎÊýÎªÐèÒª¸²¸Çµ½ÔªËØÉÏµÄ²ÎÊý£¬²»½¨ÒéÊ¹ÓÃ¡£
         *
         * @example
         *     el.style.color = 'red';
         *     el.position = [10, 10];
         *     zr.modElement(el);
         * @param  {string|module:zrender/Group|module:zrender/shape/Base} el
         * @param {Object} [params]
         */
        ZRender.prototype.modElement = function (el, params) {
            this.storage.mod(el, params);
            this._needsRefreshNextFrame = true;
            return this;
        };

        /**
         * ÐÞ¸ÄÖ¸¶¨zlevelµÄ»æÖÆÅäÖÃÏî
         * 
         * @param {string} zLevel
         * @param {Object} config ÅäÖÃ¶ÔÏó
         * @param {string} [config.clearColor=0] Ã¿´ÎÇå¿Õ»­²¼µÄÑÕÉ«
         * @param {string} [config.motionBlur=false] ÊÇ·ñ¿ªÆô¶¯Ì¬Ä£ºý
         * @param {number} [config.lastFrameAlpha=0.7]
         *                 ÔÚ¿ªÆô¶¯Ì¬Ä£ºýµÄÊ±ºòÊ¹ÓÃ£¬ÓëÉÏÒ»Ö¡»ìºÏµÄalphaÖµ£¬ÖµÔ½´óÎ²¼£Ô½Ã÷ÏÔ
         * @param {Array.<number>} [config.position] ²ãµÄÆ½ÒÆ
         * @param {Array.<number>} [config.rotation] ²ãµÄÐý×ª
         * @param {Array.<number>} [config.scale] ²ãµÄËõ·Å
         * @param {boolean} [config.zoomable=false] ²ãÊÇ·ñÖ§³ÖÊó±êËõ·Å²Ù×÷
         * @param {boolean} [config.panable=false] ²ãÊÇ·ñÖ§³ÖÊó±êÆ½ÒÆ²Ù×÷
         */
        ZRender.prototype.modLayer = function (zLevel, config) {
            this.painter.modLayer(zLevel, config);
            this._needsRefreshNextFrame = true;
            return this;
        };

        /**
         * Ìí¼Ó¶îÍâ¸ßÁÁ²ãÏÔÊ¾£¬½öÌá¹©Ìí¼Ó·½·¨£¬Ã¿´ÎË¢ÐÂºó¸ßÁÁ²ãÍ¼ÐÎ¾ù±»Çå¿Õ
         * 
         * @param {Object} shape ÐÎ×´¶ÔÏó
         */
        ZRender.prototype.addHoverShape = function (shape) {
            this.storage.addHover(shape);
            return this;
        };

        /**
         * äÖÈ¾
         * 
         * @param {Function} callback  äÖÈ¾½áÊøºó»Øµ÷º¯Êý
         */
        ZRender.prototype.render = function (callback) {
            this.painter.render(callback);
            this._needsRefreshNextFrame = false;
            return this;
        };

        /**
         * ÊÓÍ¼¸üÐÂ
         * 
         * @param {Function} callback  ÊÓÍ¼¸üÐÂºó»Øµ÷º¯Êý
         */
        ZRender.prototype.refresh = function (callback) {
            this.painter.refresh(callback);
            this._needsRefreshNextFrame = false;
            return this;
        };

        /**
         * ±ê¼ÇÊÓÍ¼ÔÚä¯ÀÀÆ÷ÏÂÒ»Ö¡ÐèÒª»æÖÆ
         */
        ZRender.prototype.refreshNextFrame = function() {
            this._needsRefreshNextFrame = true;
            return this;
        };
        
        /**
         * »æÖÆ¸ßÁÁ²ã
         * @param {Function} callback  ÊÓÍ¼¸üÐÂºó»Øµ÷º¯Êý
         */
        ZRender.prototype.refreshHover = function (callback) {
            this.painter.refreshHover(callback);
            return this;
        };

        /**
         * ÊÓÍ¼¸üÐÂ
         * 
         * @param {Array.<module:zrender/shape/Base>} shapeList ÐèÒª¸üÐÂµÄÍ¼ÐÎÁÐ±í
         * @param {Function} callback  ÊÓÍ¼¸üÐÂºó»Øµ÷º¯Êý
         */
        ZRender.prototype.refreshShapes = function (shapeList, callback) {
            this.painter.refreshShapes(shapeList, callback);
            return this;
        };

        /**
         * µ÷ÕûÊÓÍ¼´óÐ¡
         */
        ZRender.prototype.resize = function() {
            this.painter.resize();
            return this;
        };

        /**
         * ¶¯»­
         * 
         * @param {string|module:zrender/Group|module:zrender/shape/Base} el ¶¯»­¶ÔÏó
         * @param {string} path ÐèÒªÌí¼Ó¶¯»­µÄÊôÐÔ»ñÈ¡Â·¾¶£¬¿ÉÒÔÍ¨¹ýa.b.cÀ´»ñÈ¡Éî²ãµÄÊôÐÔ
         * @param {boolean} [loop] ¶¯»­ÊÇ·ñÑ­»·
         * @return {module:zrender/animation/Animation~Animator}
         * @example:
         *     zr.animate(circle.id, 'style', false)
         *         .when(1000, {x: 10} )
         *         .done(function(){ // Animation done })
         *         .start()
         */
        ZRender.prototype.animate = function (el, path, loop) {
            var self = this;

            if (typeof(el) === 'string') {
                el = this.storage.get(el);
            }
            if (el) {
                var target;
                if (path) {
                    var pathSplitted = path.split('.');
                    var prop = el;
                    for (var i = 0, l = pathSplitted.length; i < l; i++) {
                        if (!prop) {
                            continue;
                        }
                        prop = prop[pathSplitted[i]];
                    }
                    if (prop) {
                        target = prop;
                    }
                }
                else {
                    target = el;
                }

                if (!target) {
                    log(
                        'Property "'
                        + path
                        + '" is not existed in element '
                        + el.id
                    );
                    return;
                }

                if (el.__animators == null) {
                    // ÕýÔÚ½øÐÐµÄ¶¯»­¼ÇÊý
                    el.__animators = [];
                }
                var animators = el.__animators;

                var animator = this.animation.animate(target, { loop: loop })
                    .during(function () {
                        self.modShape(el);
                    })
                    .done(function () {
                        var idx = util.indexOf(el.__animators, animator);
                        if (idx >= 0) {
                            animators.splice(idx, 1);
                        }
                    });
                animators.push(animator);

                return animator;
            }
            else {
                log('Element not existed');
            }
        };

        /**
         * Í£Ö¹¶¯»­¶ÔÏóµÄ¶¯»­
         * @param  {string|module:zrender/Group|module:zrender/shape/Base} el
         */
        ZRender.prototype.stopAnimation = function (el) {
            if (el.__animators) {
                var animators = el.__animators;
                var len = animators.length;
                for (var i = 0; i < len; i++) {
                    animators[i].stop();
                }
                animators.length = 0;
            }
            return this;
        };

        /**
         * Í£Ö¹ËùÓÐ¶¯»­
         */
        ZRender.prototype.clearAnimation = function () {
            this.animation.clear();
            return this;
        };

        /**
         * loadingÏÔÊ¾
         * 
         * @param {Object=} loadingEffect loadingÐ§¹û¶ÔÏó
         */
        ZRender.prototype.showLoading = function (loadingEffect) {
            this.painter.showLoading(loadingEffect);
            return this;
        };

        /**
         * loading½áÊø
         */
        ZRender.prototype.hideLoading = function () {
            this.painter.hideLoading();
            return this;
        };

        /**
         * »ñÈ¡ÊÓÍ¼¿í¶È
         */
        ZRender.prototype.getWidth = function() {
            return this.painter.getWidth();
        };

        /**
         * »ñÈ¡ÊÓÍ¼¸ß¶È
         */
        ZRender.prototype.getHeight = function() {
            return this.painter.getHeight();
        };

        /**
         * Í¼Ïñµ¼³ö
         * @param {string} type
         * @param {string} [backgroundColor='#fff'] ±³¾°É«
         * @return {string} Í¼Æ¬µÄBase64 url
         */
        ZRender.prototype.toDataURL = function(type, backgroundColor, args) {
            return this.painter.toDataURL(type, backgroundColor, args);
        };

        /**
         * ½«³£¹æshape×ª³Éimage shape
         * @param {module:zrender/shape/Base} e
         * @param {number} width
         * @param {number} height
         */
        ZRender.prototype.shapeToImage = function(e, width, height) {
            var id = guid();
            return this.painter.shapeToImage(id, e, width, height);
        };

        /**
         * ÊÂ¼þ°ó¶¨
         * 
         * @param {string} eventName ÊÂ¼þÃû³Æ
         * @param {Function} eventHandler ÏìÓ¦º¯Êý
         * @param {Object} [context] ÏìÓ¦º¯Êý
         */
        ZRender.prototype.on = function(eventName, eventHandler, context) {
            this.handler.on(eventName, eventHandler, context);
            return this;
        };

        /**
         * ÊÂ¼þ½â°ó¶¨£¬²ÎÊýÎª¿ÕÔò½â°óËùÓÐ×Ô¶¨ÒåÊÂ¼þ
         * 
         * @param {string} eventName ÊÂ¼þÃû³Æ
         * @param {Function} eventHandler ÏìÓ¦º¯Êý
         */
        ZRender.prototype.un = function(eventName, eventHandler) {
            this.handler.un(eventName, eventHandler);
            return this;
        };
        
        /**
         * ÊÂ¼þ´¥·¢
         * 
         * @param {string} eventName ÊÂ¼þÃû³Æ£¬resize£¬hover£¬drag£¬etc
         * @param {event=} event event domÊÂ¼þ¶ÔÏó
         */
        ZRender.prototype.trigger = function (eventName, event) {
            this.handler.trigger(eventName, event);
            return this;
        };
        

        /**
         * Çå³ýµ±Ç°ZRenderÏÂËùÓÐÀàÍ¼µÄÊý¾ÝºÍÏÔÊ¾£¬clearºóMVCºÍÒÑ°ó¶¨ÊÂ¼þ¾ù»¹´æÔÚÔÚ£¬ZRender¿ÉÓÃ
         */
        ZRender.prototype.clear = function () {
            this.storage.delRoot();
            this.painter.clear();
            return this;
        };

        /**
         * ÊÍ·Åµ±Ç°ZRÊµÀý£¨É¾³ý°üÀ¨dom£¬Êý¾Ý¡¢ÏÔÊ¾ºÍÊÂ¼þ°ó¶¨£©£¬disposeºóZR²»¿ÉÓÃ
         */
        ZRender.prototype.dispose = function () {
            this.animation.stop();
            
            this.clear();
            this.storage.dispose();
            this.painter.dispose();
            this.handler.dispose();

            this.animation = 
            this.storage = 
            this.painter = 
            this.handler = null;

            // ÊÍ·Åºó¸æËßÈ«¾ÖÉ¾³ý¶Ô×Ô¼ºµÄË÷Òý£¬Ã»Ïëµ½É¶ºÃ·½·¨
            zrender.delInstance(this.id);
        };

        return zrender;
    });
define('echarts/component', [], function (/*require*/) {     // component
    var self = {};

    var _componentLibrary = {};     // echart×é¼þ¿â

    /**
     * ¶¨ÒåÍ¼ÐÎÊµÏÖ
     * @param {Object} name
     * @param {Object} clazz Í¼ÐÎÊµÏÖ
     */
    self.define = function (name, clazz) {
        _componentLibrary[name] = clazz;
        return self;
    };

    /**
     * »ñÈ¡Í¼ÐÎÊµÏÖ
     * @param {Object} name
     */
    self.get = function (name) {
        return _componentLibrary[name];
    };
    
    return self;
});
define('echarts/component/title', ['require', './base', 'zrender/shape/Text', 'zrender/shape/Rectangle', '../config', 'zrender/tool/util', 'zrender/tool/area', 'zrender/tool/color', '../component'], function (require) {
    var Base = require('./base');
    
    // Í¼ÐÎÒÀÀµ
    var TextShape = require('zrender/shape/Text');
    var RectangleShape = require('zrender/shape/Rectangle');
    
    var ecConfig = require('../config');
    // Í¼±í±êÌâ
    ecConfig.title = {
        zlevel: 0,                  // Ò»¼¶²ãµþ
        z: 6,                       // ¶þ¼¶²ãµþ
        show: true,
        text: '',
        // link: null,             // ³¬Á´½ÓÌø×ª
        // target: null,           // ½öÖ§³Öself | blank
        subtext: '',
        // sublink: null,          // ³¬Á´½ÓÌø×ª
        // subtarget: null,        // ½öÖ§³Öself | blank
        x: 'left',                 // Ë®Æ½°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎª×ó¶ÔÆë£¬¿ÉÑ¡Îª£º
                                   // 'center' | 'left' | 'right'
                                   // | {number}£¨x×ø±ê£¬µ¥Î»px£©
        y: 'top',                  // ´¹Ö±°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎªÈ«Í¼¶¥¶Ë£¬¿ÉÑ¡Îª£º
                                   // 'top' | 'bottom' | 'center'
                                   // | {number}£¨y×ø±ê£¬µ¥Î»px£©
        //textAlign: null          // Ë®Æ½¶ÔÆë·½Ê½£¬Ä¬ÈÏ¸ù¾ÝxÉèÖÃ×Ô¶¯µ÷Õû
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#ccc',       // ±êÌâ±ß¿òÑÕÉ«
        borderWidth: 0,            // ±êÌâ±ß¿òÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª0£¨ÎÞ±ß¿ò£©
        padding: 5,                // ±êÌâÄÚ±ß¾à£¬µ¥Î»px£¬Ä¬ÈÏ¸÷·½ÏòÄÚ±ß¾àÎª5£¬
                                   // ½ÓÊÜÊý×é·Ö±ðÉè¶¨ÉÏÓÒÏÂ×ó±ß¾à£¬Í¬css
        itemGap: 5,                // Ö÷¸±±êÌâ×ÝÏò¼ä¸ô£¬µ¥Î»px£¬Ä¬ÈÏÎª10£¬
        textStyle: {
            fontSize: 18,
            fontWeight: 'bolder',
            color: '#333'          // Ö÷±êÌâÎÄ×ÖÑÕÉ«
        },
        subtextStyle: {
            color: '#aaa'          // ¸±±êÌâÎÄ×ÖÑÕÉ«
        }
    };
    
    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');
    var zrColor = require('zrender/tool/color');
    
    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} option Í¼±í²ÎÊý
     */
    function Title(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        this.refresh(option);
    }
    
    Title.prototype = {
        type: ecConfig.COMPONENT_TYPE_TITLE,
        _buildShape: function () {
            if (!this.titleOption.show) {
                return;
            }
            // ±êÌâÔªËØ×éµÄÎ»ÖÃ²ÎÊý£¬Í¨¹ý¼ÆËãËùµÃx, y, width, height
            this._itemGroupLocation = this._getItemGroupLocation();

            this._buildBackground();
            this._buildItem();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        /**
         * ¹¹½¨ËùÓÐ±êÌâÔªËØ
         */
        _buildItem: function () {
            var text = this.titleOption.text;
            var link = this.titleOption.link;
            var target = this.titleOption.target;
            var subtext = this.titleOption.subtext;
            var sublink = this.titleOption.sublink;
            var subtarget = this.titleOption.subtarget;
            var font = this.getFont(this.titleOption.textStyle);
            var subfont = this.getFont(this.titleOption.subtextStyle);
            
            var x = this._itemGroupLocation.x;
            var y = this._itemGroupLocation.y;
            var width = this._itemGroupLocation.width;
            var height = this._itemGroupLocation.height;
            
            var textShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    y: y,
                    color: this.titleOption.textStyle.color,
                    text: text,
                    textFont: font,
                    textBaseline: 'top'
                },
                highlightStyle: {
                    color: zrColor.lift(this.titleOption.textStyle.color, 1),
                    brushType: 'fill'
                },
                hoverable: false
            };
            if (link) {
                textShape.hoverable = true;
                textShape.clickable = true;
                textShape.onclick = function (){
                    if (!target || target != 'self') {
                        window.open(link);
                    }
                    else {
                        window.location = link;
                    }
                };
            }
            
            var subtextShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    y: y + height,
                    color: this.titleOption.subtextStyle.color,
                    text: subtext,
                    textFont: subfont,
                    textBaseline: 'bottom'
                },
                highlightStyle: {
                    color: zrColor.lift(this.titleOption.subtextStyle.color, 1),
                    brushType: 'fill'
                },
                hoverable: false
            };
            if (sublink) {
                subtextShape.hoverable = true;
                subtextShape.clickable = true;
                subtextShape.onclick = function (){
                    if (!subtarget || subtarget != 'self') {
                        window.open(sublink);
                    }
                    else {
                        window.location = sublink;
                    }
                };
            }

            switch (this.titleOption.x) {
                case 'center' :
                    textShape.style.x = subtextShape.style.x = x + width / 2;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'center';
                    break;
                case 'left' :
                    textShape.style.x = subtextShape.style.x = x;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'left';
                    break;
                case 'right' :
                    textShape.style.x = subtextShape.style.x = x + width;
                    textShape.style.textAlign = subtextShape.style.textAlign 
                                              = 'right';
                    break;
                default :
                    x = this.titleOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    textShape.style.x = subtextShape.style.x = x;
                    break;
            }
            
            if (this.titleOption.textAlign) {
                textShape.style.textAlign = subtextShape.style.textAlign 
                                          = this.titleOption.textAlign;
            }

            this.shapeList.push(new TextShape(textShape));
            subtext !== '' && this.shapeList.push(new TextShape(subtextShape));
        },

        _buildBackground: function () {
            var padding = this.reformCssArray(this.titleOption.padding);

            this.shapeList.push(new RectangleShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable :false,
                style: {
                    x: this._itemGroupLocation.x - padding[3],
                    y: this._itemGroupLocation.y - padding[0],
                    width: this._itemGroupLocation.width + padding[3] + padding[1],
                    height: this._itemGroupLocation.height + padding[0] + padding[2],
                    brushType: this.titleOption.borderWidth === 0 ? 'fill' : 'both',
                    color: this.titleOption.backgroundColor,
                    strokeColor: this.titleOption.borderColor,
                    lineWidth: this.titleOption.borderWidth
                }
            }));
        },

        /**
         * ¸ù¾ÝÑ¡Ïî¼ÆËã±êÌâÊµÌåµÄÎ»ÖÃ×ø±ê
         */
        _getItemGroupLocation: function () {
            var padding = this.reformCssArray(this.titleOption.padding);
            var text = this.titleOption.text;
            var subtext = this.titleOption.subtext;
            var font = this.getFont(this.titleOption.textStyle);
            var subfont = this.getFont(this.titleOption.subtextStyle);
            
            var totalWidth = Math.max(
                    zrArea.getTextWidth(text, font),
                    zrArea.getTextWidth(subtext, subfont)
                );
            var totalHeight = zrArea.getTextHeight(text, font)
                              + (subtext === ''
                                 ? 0
                                 : (this.titleOption.itemGap
                                    + zrArea.getTextHeight(subtext, subfont))
                                );

            var x;
            var zrWidth = this.zr.getWidth();
            switch (this.titleOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = padding[3] + this.titleOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - padding[1]
                        - this.titleOption.borderWidth;
                    break;
                default :
                    x = this.titleOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = this.zr.getHeight();
            switch (this.titleOption.y) {
                case 'top' :
                    y = padding[0] + this.titleOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - padding[2]
                        - this.titleOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = this.titleOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            return {
                x: x,
                y: y,
                width: totalWidth,
                height: totalHeight
            };
        },
        
        /**
         * Ë¢ÐÂ
         */
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption;

                this.option.title = this.reformOption(this.option.title);
                this.titleOption = this.option.title;
                this.titleOption.textStyle = this.getTextStyle(
                    this.titleOption.textStyle
                );
                this.titleOption.subtextStyle = this.getTextStyle(
                    this.titleOption.subtextStyle
                );
            }
            
            this.clear();
            this._buildShape();
        }
    };
    
    zrUtil.inherits(Title, Base);
    
    require('../component').define('title', Title);
    
    return Title;
});
define('echarts/component/toolbox', ['require', './base', 'zrender/shape/Line', 'zrender/shape/Image', 'zrender/shape/Rectangle', '../util/shape/Icon', '../config', 'zrender/tool/util', 'zrender/config', 'zrender/tool/event', './dataView', '../component'], function (require) {
    var Base = require('./base');
    
    // Í¼ÐÎÒÀÀµ
    var LineShape = require('zrender/shape/Line');
    var ImageShape = require('zrender/shape/Image');
    var RectangleShape = require('zrender/shape/Rectangle');
    var IconShape = require('../util/shape/Icon');
    
    var ecConfig = require('../config');
    ecConfig.toolbox = {
        zlevel: 0,                  // Ò»¼¶²ãµþ
        z: 6,                       // ¶þ¼¶²ãµþ
        show: false,
        orient: 'horizontal',      // ²¼¾Ö·½Ê½£¬Ä¬ÈÏÎªË®Æ½²¼¾Ö£¬¿ÉÑ¡Îª£º
                                   // 'horizontal' | 'vertical'
        x: 'right',                // Ë®Æ½°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎªÈ«Í¼ÓÒ¶ÔÆë£¬¿ÉÑ¡Îª£º
                                   // 'center' | 'left' | 'right'
                                   // | {number}£¨x×ø±ê£¬µ¥Î»px£©
        y: 'top',                  // ´¹Ö±°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎªÈ«Í¼¶¥¶Ë£¬¿ÉÑ¡Îª£º
                                   // 'top' | 'bottom' | 'center'
                                   // | {number}£¨y×ø±ê£¬µ¥Î»px£©
        color: ['#1e90ff','#22bb22','#4b0082','#d2691e'],
        disableColor: '#ddd',
        effectiveColor: 'red',
        backgroundColor: 'rgba(0,0,0,0)', // ¹¤¾ßÏä±³¾°ÑÕÉ«
        borderColor: '#ccc',       // ¹¤¾ßÏä±ß¿òÑÕÉ«
        borderWidth: 0,            // ¹¤¾ßÏä±ß¿òÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª0£¨ÎÞ±ß¿ò£©
        padding: 5,                // ¹¤¾ßÏäÄÚ±ß¾à£¬µ¥Î»px£¬Ä¬ÈÏ¸÷·½ÏòÄÚ±ß¾àÎª5£¬
                                   // ½ÓÊÜÊý×é·Ö±ðÉè¶¨ÉÏÓÒÏÂ×ó±ß¾à£¬Í¬css
        itemGap: 10,               // ¸÷¸öitemÖ®¼äµÄ¼ä¸ô£¬µ¥Î»px£¬Ä¬ÈÏÎª10£¬
                                   // ºáÏò²¼¾ÖÊ±ÎªË®Æ½¼ä¸ô£¬×ÝÏò²¼¾ÖÊ±Îª×ÝÏò¼ä¸ô
        itemSize: 16,              // ¹¤¾ßÏäÍ¼ÐÎ¿í¶È
        showTitle: true,
        // textStyle: {},
        feature: {
            mark: {
                show: false,
                title: {
                    mark: '¸¨ÖúÏß¿ª¹Ø',
                    markUndo: 'É¾³ý¸¨ÖúÏß',
                    markClear: 'Çå¿Õ¸¨ÖúÏß'
                },
                lineStyle: {
                    width: 1,
                    color: '#1e90ff',
                    type: 'dashed'
                }
            },
            dataZoom: {
                show: false,
                title: {
                    dataZoom: 'ÇøÓòËõ·Å',
                    dataZoomReset: 'ÇøÓòËõ·ÅºóÍË'
                }
            },
            dataView: {
                show: false,
                title: 'Êý¾ÝÊÓÍ¼',
                readOnly: false,
                lang: ['Êý¾ÝÊÓÍ¼', '¹Ø±Õ', 'Ë¢ÐÂ']
            },
            magicType: {
                show: false,
                title: {
                    line: 'ÕÛÏßÍ¼ÇÐ»»',
                    bar: 'ÖùÐÎÍ¼ÇÐ»»',
                    stack: '¶Ñ»ý',
                    tiled: 'Æ½ÆÌ',
                    force: 'Á¦µ¼Ïò²¼¾ÖÍ¼ÇÐ»»',
                    chord: 'ºÍÏÒÍ¼ÇÐ»»',
                    pie: '±ýÍ¼ÇÐ»»',
                    funnel: 'Â©¶·Í¼ÇÐ»»'
                },
                /*
                option: {
                    line: {},
                    bar: {},
                    stack: {},
                    tiled: {},
                    force: {},
                    chord: {},
                    pie: {},
                    funnel: {}
                },
                */
                type: [] // 'line', 'bar', 'stack', 'tiled', 'force', 'chord', 'pie', 'funnel'
            },
            restore: {
                show: false,
                title: '»¹Ô­'
            },
            saveAsImage: {
                show: false,
                title: '±£´æÎªÍ¼Æ¬',
                type: 'png',
                lang: ['µã»÷±£´æ'] 
            }
        }
    };

    var zrUtil = require('zrender/tool/util');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    
    var _MAGICTYPE_STACK = 'stack';
    var _MAGICTYPE_TILED = 'tiled';
        
    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {HtmlElement} dom Ä¿±ê¶ÔÏó
     * @param {ECharts} myChart µ±Ç°Í¼±íÊµÀý
     */
    function Toolbox(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.dom = myChart.dom;
        
        this._magicType = {};
        this._magicMap = {};
        this._isSilence = false;
        
        this._iconList;
        this._iconShapeMap = {};
        //this._itemGroupLocation;
        this._featureTitle = {};             // ÎÄ×Ö
        this._featureIcon = {};              // Í¼±ê
        this._featureColor = {};             // ÑÕÉ«
        this._featureOption = {};
        this._enableColor = 'red';
        this._disableColor = '#ccc';
        // this._markStart;
        // this._marking;
        // this._markShape;
        // this._zoomStart;
        // this._zooming;
        // this._zoomShape;
        // this._zoomQueue;
        // this._dataView;
        this._markShapeList = [];
        var self = this;
        self._onMark = function (param) {
            self.__onMark(param);
        };
        self._onMarkUndo = function (param) {
            self.__onMarkUndo(param);
        };
        self._onMarkClear = function (param) {
            self.__onMarkClear(param);
        };
        self._onDataZoom = function (param) {
            self.__onDataZoom(param);
        };
        self._onDataZoomReset = function (param) {
            self.__onDataZoomReset(param);
        };
        self._onDataView = function (param) {
            self.__onDataView(param);
        };
        self._onRestore = function (param) {
            self.__onRestore(param);
        };
        self._onSaveAsImage = function (param) {
            self.__onSaveAsImage(param);
        };
        self._onMagicType = function (param) {
            self.__onMagicType(param);
        };
        self._onCustomHandler = function (param) {
            self.__onCustomHandler(param);
        };
        self._onmousemove = function (param) {
            return self.__onmousemove(param);
        };

        self._onmousedown = function (param) {
            return self.__onmousedown(param);
        };
        
        self._onmouseup = function (param) {
            return self.__onmouseup(param);
        };
        
        self._onclick = function (param) {
            return self.__onclick(param);
        };
    }

    Toolbox.prototype = {
        type: ecConfig.COMPONENT_TYPE_TOOLBOX,
        _buildShape: function () {
            this._iconList = [];
            var toolboxOption = this.option.toolbox;
            this._enableColor = toolboxOption.effectiveColor;
            this._disableColor = toolboxOption.disableColor;
            var feature = toolboxOption.feature;
            var iconName = [];
            for (var key in feature){
                if (feature[key].show) {
                    switch (key) {
                        case 'mark' :
                            iconName.push({ key: key, name: 'mark' });
                            iconName.push({ key: key, name: 'markUndo' });
                            iconName.push({ key: key, name: 'markClear' });
                            break;
                        case 'magicType' :
                            for (var i = 0, l = feature[key].type.length; i < l; i++) {
                                feature[key].title[feature[key].type[i] + 'Chart']
                                    = feature[key].title[feature[key].type[i]];
                                if (feature[key].option) {
                                    feature[key].option[feature[key].type[i] + 'Chart']
                                        = feature[key].option[feature[key].type[i]];
                                }
                                iconName.push({ key: key, name: feature[key].type[i] + 'Chart' });
                            }
                            break;
                        case 'dataZoom' :
                            iconName.push({ key: key, name: 'dataZoom' });
                            iconName.push({ key: key, name: 'dataZoomReset' });
                            break;
                        case 'saveAsImage' :
                            if (this.canvasSupported) {
                                iconName.push({ key: key, name: 'saveAsImage' });
                            }
                            break;
                        default :
                            iconName.push({ key: key, name: key });
                            break;
                    }
                }
            }
            if (iconName.length > 0) {
                var name;
                var key;
                for (var i = 0, l = iconName.length; i < l; i++) {
                    name = iconName[i].name;
                    key = iconName[i].key;
                    this._iconList.push(name);
                    this._featureTitle[name] = feature[key].title[name] || feature[key].title;
                    if (feature[key].icon) {
                        this._featureIcon[name] = feature[key].icon[name] || feature[key].icon;
                    }
                    if (feature[key].color) {
                        this._featureColor[name] = feature[key].color[name] || feature[key].color;
                    }
                    if (feature[key].option) {
                        this._featureOption[name] = feature[key].option[name] 
                                                    || feature[key].option;
                    }
                }
                this._itemGroupLocation = this._getItemGroupLocation();

                this._buildBackground();
                this._buildItem();

                for (var i = 0, l = this.shapeList.length; i < l; i++) {
                    this.zr.addShape(this.shapeList[i]);
                }
                if (this._iconShapeMap['mark']) {
                    this._iconDisable(this._iconShapeMap['markUndo']);
                    this._iconDisable(this._iconShapeMap['markClear']);
                }
                if (this._iconShapeMap['dataZoomReset'] && this._zoomQueue.length === 0) {
                    this._iconDisable(this._iconShapeMap['dataZoomReset']);
                }
            }
        },

        /**
         * ¹¹½¨ËùÓÐÍ¼ÀýÔªËØ
         */
        _buildItem: function () {
            var toolboxOption = this.option.toolbox;
            var iconLength = this._iconList.length;
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemSize = toolboxOption.itemSize;
            var itemGap = toolboxOption.itemGap;
            var itemShape;

            var color = toolboxOption.color instanceof Array
                        ? toolboxOption.color : [toolboxOption.color];
            
            var textFont = this.getFont(toolboxOption.textStyle);
            var textPosition;
            var textAlign;
            var textBaseline;
            if (toolboxOption.orient === 'horizontal') {
                textPosition = this._itemGroupLocation.y / this.zr.getHeight() < 0.5
                               ? 'bottom' : 'top';
                textAlign = this._itemGroupLocation.x / this.zr.getWidth() < 0.5
                            ? 'left' : 'right';
                textBaseline = this._itemGroupLocation.y / this.zr.getHeight() < 0.5
                               ? 'top' : 'bottom';
            }
            else {
                textPosition = this._itemGroupLocation.x / this.zr.getWidth() < 0.5
                               ? 'right' : 'left';
            }
            
           this._iconShapeMap = {};
           var self = this;

            for (var i = 0; i < iconLength; i++) {
                // Í¼ÐÎ
                itemShape = {
                    type: 'icon',
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: lastX,
                        y: lastY,
                        width: itemSize,
                        height: itemSize,
                        iconType: this._iconList[i],
                        lineWidth: 1,
                        strokeColor: this._featureColor[this._iconList[i]] 
                                     || color[i % color.length],
                        brushType: 'stroke'
                    },
                    highlightStyle: {
                        lineWidth: 1,
                        text: toolboxOption.showTitle 
                              ? this._featureTitle[this._iconList[i]]
                              : undefined,
                        textFont: textFont,
                        textPosition: textPosition,
                        strokeColor: this._featureColor[this._iconList[i]] 
                                     || color[i % color.length]
                    },
                    hoverable: true,
                    clickable: true
                };
                
                if (this._featureIcon[this._iconList[i]]) {
                    itemShape.style.image = this._featureIcon[this._iconList[i]].replace(
                        new RegExp('^image:\\/\\/'), ''
                    );
                    itemShape.style.opacity = 0.8;
                    itemShape.highlightStyle.opacity = 1;
                    itemShape.type = 'image';
                }
                
                if (toolboxOption.orient === 'horizontal') {
                    // ÐÞÕý×ó¶ÔÆëµÚÒ»¸ö»òÓÒ¶ÔÆë×îºóÒ»¸ö
                    if (i === 0 && textAlign === 'left') {
                        itemShape.highlightStyle.textPosition = 'specific';
                        itemShape.highlightStyle.textAlign = textAlign;
                        itemShape.highlightStyle.textBaseline = textBaseline;
                        itemShape.highlightStyle.textX = lastX;
                        itemShape.highlightStyle.textY = textBaseline === 'top' 
                                                     ? lastY + itemSize + 10
                                                     : lastY - 10;
                    }
                    if (i === iconLength - 1 && textAlign === 'right') {
                        itemShape.highlightStyle.textPosition = 'specific';
                        itemShape.highlightStyle.textAlign = textAlign;
                        itemShape.highlightStyle.textBaseline = textBaseline;
                        itemShape.highlightStyle.textX = lastX + itemSize;
                        itemShape.highlightStyle.textY = textBaseline === 'top' 
                                                         ? lastY + itemSize + 10
                                                         : lastY - 10;
                    }
                }
                
                switch(this._iconList[i]) {
                    case 'mark':
                        itemShape.onclick = self._onMark;
                        break;
                    case 'markUndo':
                        itemShape.onclick = self._onMarkUndo;
                        break;
                    case 'markClear':
                        itemShape.onclick = self._onMarkClear;
                        break;
                    case 'dataZoom':
                        itemShape.onclick = self._onDataZoom;
                        break;
                    case 'dataZoomReset':
                        itemShape.onclick = self._onDataZoomReset;
                        break;
                    case 'dataView' :
                        if (!this._dataView) {
                            var DataView = require('./dataView');
                            this._dataView = new DataView(
                                this.ecTheme, this.messageCenter, this.zr, this.option, this.myChart
                            );
                        }
                        itemShape.onclick = self._onDataView;
                        break;
                    case 'restore':
                        itemShape.onclick = self._onRestore;
                        break;
                    case 'saveAsImage':
                        itemShape.onclick = self._onSaveAsImage;
                        break;
                    default:
                        if (this._iconList[i].match('Chart')) {
                            itemShape._name = this._iconList[i].replace('Chart', '');
                            itemShape.onclick = self._onMagicType;
                        }
                        else {
                            itemShape.onclick = self._onCustomHandler;
                        }
                        break;
                }

                if (itemShape.type === 'icon') {
                    itemShape = new IconShape(itemShape);
                }
                else if (itemShape.type === 'image') {
                    itemShape = new ImageShape(itemShape);
                }
                this.shapeList.push(itemShape);
                this._iconShapeMap[this._iconList[i]] = itemShape;

                if (toolboxOption.orient === 'horizontal') {
                    lastX += itemSize + itemGap;
                }
                else {
                    lastY += itemSize + itemGap;
                }
            }
        },

        _buildBackground: function () {
            var toolboxOption = this.option.toolbox;
            var padding = this.reformCssArray(this.option.toolbox.padding);

            this.shapeList.push(new RectangleShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable :false,
                style: {
                    x: this._itemGroupLocation.x - padding[3],
                    y: this._itemGroupLocation.y - padding[0],
                    width: this._itemGroupLocation.width + padding[3] + padding[1],
                    height: this._itemGroupLocation.height + padding[0] + padding[2],
                    brushType: toolboxOption.borderWidth === 0 ? 'fill' : 'both',
                    color: toolboxOption.backgroundColor,
                    strokeColor: toolboxOption.borderColor,
                    lineWidth: toolboxOption.borderWidth
                }
            }));
        },

        /**
         * ¸ù¾ÝÑ¡Ïî¼ÆËãÍ¼ÀýÊµÌåµÄÎ»ÖÃ×ø±ê
         */
        _getItemGroupLocation: function () {
            var toolboxOption = this.option.toolbox;
            var padding = this.reformCssArray(this.option.toolbox.padding);
            var iconLength = this._iconList.length;
            var itemGap = toolboxOption.itemGap;
            var itemSize = toolboxOption.itemSize;
            var totalWidth = 0;
            var totalHeight = 0;

            if (toolboxOption.orient === 'horizontal') {
                // Ë®Æ½²¼¾Ö£¬¼ÆËã×Ü¿í¶È£¬±ðÍü¼õÈ¥×îºóÒ»¸öµÄitemGap
                totalWidth = (itemSize + itemGap) * iconLength - itemGap;
                totalHeight = itemSize;
            }
            else {
                // ´¹Ö±²¼¾Ö£¬¼ÆËã×Ü¸ß¶È
                totalHeight = (itemSize + itemGap) * iconLength - itemGap;
                totalWidth = itemSize;
            }

            var x;
            var zrWidth = this.zr.getWidth();
            switch (toolboxOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = padding[3] + toolboxOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - padding[1]
                        - toolboxOption.borderWidth;
                    break;
                default :
                    x = toolboxOption.x - 0;
                    x = isNaN(x) ? 0 : x;
                    break;
            }

            var y;
            var zrHeight = this.zr.getHeight();
            switch (toolboxOption.y) {
                case 'top' :
                    y = padding[0] + toolboxOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - padding[2]
                        - toolboxOption.borderWidth;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = toolboxOption.y - 0;
                    y = isNaN(y) ? 0 : y;
                    break;
            }

            return {
                x: x,
                y: y,
                width: totalWidth,
                height: totalHeight
            };
        },

        __onmousemove: function (param) {
            if (this._marking) {
                this._markShape.style.xEnd = zrEvent.getX(param.event);
                this._markShape.style.yEnd = zrEvent.getY(param.event);
                this.zr.addHoverShape(this._markShape);
            }
            if (this._zooming) {
                this._zoomShape.style.width = 
                    zrEvent.getX(param.event) - this._zoomShape.style.x;
                this._zoomShape.style.height = 
                    zrEvent.getY(param.event) - this._zoomShape.style.y;
                this.zr.addHoverShape(this._zoomShape);
                this.dom.style.cursor = 'crosshair';
                zrEvent.stop(param.event);
            }
            if (this._zoomStart
                && (this.dom.style.cursor != 'pointer' && this.dom.style.cursor != 'move')
            ) {
                this.dom.style.cursor = 'crosshair';
            }
        },

        __onmousedown: function (param) {
            if (param.target) {
                return;
            }
            this._zooming = true;
            var x = zrEvent.getX(param.event);
            var y = zrEvent.getY(param.event);
            var zoomOption = this.option.dataZoom || {};
            this._zoomShape = new RectangleShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: x,
                    y: y,
                    width: 1,
                    height: 1,
                    brushType: 'both'
                },
                highlightStyle: {
                    lineWidth: 2,
                    color: zoomOption.fillerColor 
                           || ecConfig.dataZoom.fillerColor,
                    strokeColor: zoomOption.handleColor 
                                  || ecConfig.dataZoom.handleColor,
                    brushType: 'both'
                }
            });
            this.zr.addHoverShape(this._zoomShape);
            return true; // ×èÈûÈ«¾ÖÊÂ¼þ
        },
        
        __onmouseup: function (/*param*/) {
            if (!this._zoomShape 
                || Math.abs(this._zoomShape.style.width) < 10 
                || Math.abs(this._zoomShape.style.height) < 10
            ) {
                this._zooming = false;
                return true;
            }
            if (this._zooming && this.component.dataZoom) {
                this._zooming = false;
                
                var zoom = this.component.dataZoom.rectZoom(this._zoomShape.style);
                if (zoom) {
                    this._zoomQueue.push({
                        start: zoom.start,
                        end: zoom.end,
                        start2: zoom.start2,
                        end2: zoom.end2
                    });
                    this._iconEnable(this._iconShapeMap['dataZoomReset']);
                    this.zr.refreshNextFrame();
                }
            }
            return true; // ×èÈûÈ«¾ÖÊÂ¼þ
        },
        
        __onclick: function (param) {
            if (param.target) {
                return;
            }
            if (this._marking) {
                this._marking = false;
                this._markShapeList.push(this._markShape);
                this._iconEnable(this._iconShapeMap['markUndo']);
                this._iconEnable(this._iconShapeMap['markClear']);
                this.zr.addShape(this._markShape);
                this.zr.refreshNextFrame();
            } 
            else if (this._markStart) {
                this._marking = true;
                var x = zrEvent.getX(param.event);
                var y = zrEvent.getY(param.event);
                this._markShape = new LineShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        xStart: x,
                        yStart: y,
                        xEnd: x,
                        yEnd: y,
                        lineWidth: this.query(
                                       this.option,
                                       'toolbox.feature.mark.lineStyle.width'
                                   ),
                        strokeColor: this.query(
                                         this.option,
                                         'toolbox.feature.mark.lineStyle.color'
                                     ),
                        lineType: this.query(
                                      this.option,
                                      'toolbox.feature.mark.lineStyle.type'
                                  )
                    }
                });
                this.zr.addHoverShape(this._markShape);
            }
        },
        
        __onMark: function (param) {
            var target = param.target;
            if (this._marking || this._markStart) {
                // È¡Ïû
                this._resetMark();
                this.zr.refreshNextFrame();
            }
            else {
                // ÆôÓÃMark
                this._resetZoom();   // markÓëdataZoom»¥³â
                
                this.zr.modShape(target.id, {style: {strokeColor: this._enableColor}});
                this.zr.refreshNextFrame();
                this._markStart = true;
                var self = this;
                setTimeout(function (){
                    self.zr
                    && self.zr.on(zrConfig.EVENT.CLICK, self._onclick)
                    && self.zr.on(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
                }, 10);
            }
            return true; // ×èÈûÈ«¾ÖÊÂ¼þ
        },
        
        __onMarkUndo: function () {
            if (this._marking) {
                this._marking = false;
            } else {
                var len = this._markShapeList.length;
                if (len >= 1) {
                    var target = this._markShapeList[len - 1];
                    this.zr.delShape(target.id);
                    this.zr.refreshNextFrame();
                    this._markShapeList.pop();
                    if (len === 1) {
                        this._iconDisable(this._iconShapeMap['markUndo']);
                        this._iconDisable(this._iconShapeMap['markClear']);
                    }
                }
            }
            return true;
        },

        __onMarkClear: function () {
            if (this._marking) {
                this._marking = false;
            }
            var len = this._markShapeList.length;
            if (len > 0) {
                while(len--) {
                    this.zr.delShape(this._markShapeList.pop().id);
                }
                this._iconDisable(this._iconShapeMap['markUndo']);
                this._iconDisable(this._iconShapeMap['markClear']);
                this.zr.refreshNextFrame();
            }
            return true;
        },
        
        __onDataZoom: function (param) {
            var target = param.target;
            if (this._zooming || this._zoomStart) {
                // È¡Ïû
                this._resetZoom();
                this.zr.refreshNextFrame();
                this.dom.style.cursor = 'default';
            }
            else {
                // ÆôÓÃZoom
                this._resetMark();   // markÓëdataZoom»¥³â
                
                this.zr.modShape(target.id, {style: {strokeColor: this._enableColor}});
                this.zr.refreshNextFrame();
                this._zoomStart = true;
                var self = this;
                setTimeout(function (){
                    self.zr
                    && self.zr.on(zrConfig.EVENT.MOUSEDOWN, self._onmousedown)
                    && self.zr.on(zrConfig.EVENT.MOUSEUP, self._onmouseup)
                    && self.zr.on(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
                }, 10);
                
                this.dom.style.cursor = 'crosshair';
            }
            return true; // ×èÈûÈ«¾ÖÊÂ¼þ
        },
        
        __onDataZoomReset: function () {
            if (this._zooming) {
                this._zooming = false;
            }
            this._zoomQueue.pop();
            //console.log(this._zoomQueue)
            if (this._zoomQueue.length > 0) {
                this.component.dataZoom.absoluteZoom(
                    this._zoomQueue[this._zoomQueue.length - 1]
                );
            }
            else {
                this.component.dataZoom.rectZoom();
                this._iconDisable(this._iconShapeMap['dataZoomReset']);
                this.zr.refreshNextFrame();
            }
            
            return true;
        },

        _resetMark: function () {
            this._marking = false;
            if (this._markStart) {
                this._markStart = false;
                if (this._iconShapeMap['mark']) {
                    // »¹Ô­Í¼±êÎªÎ´ÉúÐ§×´Ì¬
                    this.zr.modShape(
                        this._iconShapeMap['mark'].id,
                        {
                            style: {
                                strokeColor: this._iconShapeMap['mark']
                                                 .highlightStyle
                                                 .strokeColor
                            }
                         }
                    );
                }
                
                this.zr.un(zrConfig.EVENT.CLICK, this._onclick);
                this.zr.un(zrConfig.EVENT.MOUSEMOVE, this._onmousemove);
            }
        },
        
        _resetZoom: function () {
            this._zooming = false;
            if (this._zoomStart) {
                this._zoomStart = false;
                if (this._iconShapeMap['dataZoom']) {
                    // »¹Ô­Í¼±êÎªÎ´ÉúÐ§×´Ì¬
                    this.zr.modShape(
                        this._iconShapeMap['dataZoom'].id,
                        {
                            style: {
                                strokeColor: this._iconShapeMap['dataZoom']
                                                 .highlightStyle
                                                 .strokeColor
                            }
                         }
                    );
                }
                
                this.zr.un(zrConfig.EVENT.MOUSEDOWN, this._onmousedown);
                this.zr.un(zrConfig.EVENT.MOUSEUP, this._onmouseup);
                this.zr.un(zrConfig.EVENT.MOUSEMOVE, this._onmousemove);
            }
        },

        _iconDisable: function (target) {
            if (target.type != 'image') {
                this.zr.modShape(target.id, {
                    hoverable: false,
                    clickable: false,
                    style: {
                        strokeColor: this._disableColor
                    }
                });
            }
            else {
                this.zr.modShape(target.id, {
                    hoverable: false,
                    clickable: false,
                    style: {
                        opacity: 0.3
                    }
                });
            }
        },

        _iconEnable: function (target) {
            if (target.type != 'image') {
                this.zr.modShape(target.id, {
                    hoverable: true,
                    clickable: true,
                    style: {
                        strokeColor: target.highlightStyle.strokeColor
                    }
                });
            }
            else {
                this.zr.modShape(target.id, {
                    hoverable: true,
                    clickable: true,
                    style: {
                        opacity: 0.8
                    }
                });
            }
        },

        __onDataView: function () {
            this._dataView.show(this.option);
            return true;
        },

        __onRestore: function (){
            this._resetMark();
            this._resetZoom();
            this.messageCenter.dispatch(ecConfig.EVENT.RESTORE, null, null, this.myChart);
            return true;
        },
        
        __onSaveAsImage: function () {
            var saveOption = this.option.toolbox.feature.saveAsImage;
            var imgType = saveOption.type || 'png';
            if (imgType != 'png' && imgType != 'jpeg') {
                imgType = 'png';
            }
            
            var image;
            if (!this.myChart.isConnected()) {
                image = this.zr.toDataURL(
                    'image/' + imgType,
                    this.option.backgroundColor 
                    && this.option.backgroundColor.replace(' ','') === 'rgba(0,0,0,0)'
                        ? '#fff' : this.option.backgroundColor
                );
            }
            else {
                image = this.myChart.getConnectedDataURL(imgType);
            }
             
            var downloadDiv = document.createElement('div');
            downloadDiv.id = '__echarts_download_wrap__';
            downloadDiv.style.cssText = 'position:fixed;'
                + 'z-index:99999;'
                + 'display:block;'
                + 'top:0;left:0;'
                + 'background-color:rgba(33,33,33,0.5);'
                + 'text-align:center;'
                + 'width:100%;'
                + 'height:100%;'
                + 'line-height:' 
                + document.documentElement.clientHeight + 'px;';
                
            var downloadLink = document.createElement('a');
            //downloadLink.onclick = _saveImageForIE;
            downloadLink.href = image;
            downloadLink.setAttribute(
                'download',
                (saveOption.name 
                 ? saveOption.name 
                 : (this.option.title && (this.option.title.text || this.option.title.subtext))
                   ? (this.option.title.text || this.option.title.subtext)
                   : 'ECharts')
                + '.' + imgType 
            );
            downloadLink.innerHTML = '<img style="vertical-align:middle" src="' + image 
                + '" title="'
                + ((!!window.ActiveXObject || 'ActiveXObject' in window)
                  ? 'ÓÒ¼ü->Í¼Æ¬Áí´æÎª'
                  : (saveOption.lang ? saveOption.lang[0] : 'µã»÷±£´æ'))
                + '"/>';
            
            downloadDiv.appendChild(downloadLink);
            document.body.appendChild(downloadDiv);
            downloadLink = null;
            downloadDiv = null;
            
            setTimeout(function (){
                var _d = document.getElementById('__echarts_download_wrap__');
                if (_d) {
                    _d.onclick = function () {
                        var d = document.getElementById(
                            '__echarts_download_wrap__'
                        );
                        d.onclick = null;
                        d.innerHTML = '';
                        document.body.removeChild(d);
                        d = null;
                    };
                    _d = null;
                }
            }, 500);
            
            /*
            function _saveImageForIE() {
                window.win = window.open(image);
                win.document.execCommand("SaveAs");
                win.close()
            }
            */
            return;
        },

        __onMagicType: function (param) {
            this._resetMark();
            var itemName = param.target._name;
            if (!this._magicType[itemName]) {
                // ÆôÓÃ
                this._magicType[itemName] = true;
                // ÕÛÖù»¥³â
                if (itemName === ecConfig.CHART_TYPE_LINE) {
                    this._magicType[ecConfig.CHART_TYPE_BAR] = false;
                }
                else if (itemName === ecConfig.CHART_TYPE_BAR) {
                    this._magicType[ecConfig.CHART_TYPE_LINE] = false;
                }
                // ±ýÍ¼Â©¶·»¥³â
                if (itemName === ecConfig.CHART_TYPE_PIE) {
                    this._magicType[ecConfig.CHART_TYPE_FUNNEL] = false;
                }
                else if (itemName === ecConfig.CHART_TYPE_FUNNEL) {
                    this._magicType[ecConfig.CHART_TYPE_PIE] = false;
                }
                // Á¦µ¼ºÍÏÒ»¥³â
                if (itemName === ecConfig.CHART_TYPE_FORCE) {
                    this._magicType[ecConfig.CHART_TYPE_CHORD] = false;
                }
                else if (itemName === ecConfig.CHART_TYPE_CHORD) {
                    this._magicType[ecConfig.CHART_TYPE_FORCE] = false;
                }
                // ¶Ñ»ýÆ½ÆÌ»¥³â
                if (itemName === _MAGICTYPE_STACK) {
                    this._magicType[_MAGICTYPE_TILED] = false;
                }
                else if (itemName === _MAGICTYPE_TILED) {
                    this._magicType[_MAGICTYPE_STACK] = false;
                }
                this.messageCenter.dispatch(
                    ecConfig.EVENT.MAGIC_TYPE_CHANGED,
                    param.event,
                    { magicType: this._magicType },
                    this.myChart
                );
            }
            
            return true;
        },
        
        setMagicType: function (magicType) {
            this._resetMark();
            this._magicType = magicType;
            
            !this._isSilence && this.messageCenter.dispatch(
                ecConfig.EVENT.MAGIC_TYPE_CHANGED,
                null,
                { magicType: this._magicType },
                this.myChart
            );
        },
        
        // ÓÃ»§×Ô¶¨ÒåÀ©Õ¹toolbox·½·¨
        __onCustomHandler: function (param) {
            var target = param.target.style.iconType;
            var featureHandler = this.option.toolbox.feature[target].onclick;
            if (typeof featureHandler === 'function') {
                featureHandler.call(this, this.option);
            }
        },

        // ÖØÖÃ±¸·Ý»¹Ô­×´Ì¬µÈ
        reset: function (newOption, isRestore) {
            isRestore && this.clear();
            
            if (this.query(newOption, 'toolbox.show')
                && this.query(newOption, 'toolbox.feature.magicType.show')
            ) {
                var magicType = newOption.toolbox.feature.magicType.type;
                var len = magicType.length;
                this._magicMap = {};     // ±êÊ¶¿É¿ØÀàÐÍ
                while (len--) {
                    this._magicMap[magicType[len]] = true;
                }

                len = newOption.series.length;
                var oriType;        // ±¸·Ý»¹Ô­¿É¿ØÀàÐÍ
                var axis;
                while (len--) {
                    oriType = newOption.series[len].type;
                    if (this._magicMap[oriType]) {
                        axis = newOption.xAxis instanceof Array
                               ? newOption.xAxis[newOption.series[len].xAxisIndex || 0]
                               : newOption.xAxis;
                        if (axis && (axis.type || 'category') === 'category') {
                            axis.__boundaryGap = axis.boundaryGap != null
                                                 ? axis.boundaryGap : true;
                        }
                        axis = newOption.yAxis instanceof Array
                               ? newOption.yAxis[newOption.series[len].yAxisIndex || 0]
                               : newOption.yAxis;
                        if (axis && axis.type === 'category') {
                            axis.__boundaryGap = axis.boundaryGap != null
                                                 ? axis.boundaryGap : true;
                        }
                        newOption.series[len].__type = oriType;
                        // ±ÜÃâ²»Í¬ÀàÐÍÍ¼±íÀàÐÍµÄÑùÊ½ÎÛÈ¾
                        newOption.series[len].__itemStyle = zrUtil.clone(
                            newOption.series[len].itemStyle || {}
                        );
                    }
                    
                    if (this._magicMap[_MAGICTYPE_STACK] || this._magicMap[_MAGICTYPE_TILED]) {
                        newOption.series[len].__stack = newOption.series[len].stack;
                    }
                }
            }
            
            this._magicType = isRestore ? {} : (this._magicType || {});
            for (var itemName in this._magicType) {
                if (this._magicType[itemName]) {
                    this.option = newOption;
                    this.getMagicOption();
                    break;
                }
            }
            
            // ¿òÑ¡Ëõ·Å
            var zoomOption = newOption.dataZoom;
            if (zoomOption && zoomOption.show) {
                var start = zoomOption.start != null
                            && zoomOption.start >= 0
                            && zoomOption.start <= 100
                            ? zoomOption.start : 0;
                var end = zoomOption.end != null
                          && zoomOption.end >= 0
                          && zoomOption.end <= 100
                          ? zoomOption.end : 100;
                if (start > end) {
                    // ´óÐ¡µßµ¹×Ô¶¯·­×ª
                    start = start + end;
                    end = start - end;
                    start = start - end;
                }
                this._zoomQueue = [{
                    start: start,
                    end: end,
                    start2: 0,
                    end2: 100
                }];
            }
            else {
                this._zoomQueue = [];
            }
        },
        
        getMagicOption: function (){
            var axis;
            var chartType;
            if (this._magicType[ecConfig.CHART_TYPE_LINE] 
                || this._magicType[ecConfig.CHART_TYPE_BAR]
            ) {
                // Í¼±íÀàÐÍÓÐÕÛÖùÇÐ»»
                var boundaryGap = this._magicType[ecConfig.CHART_TYPE_LINE] ? false : true;
                for (var i = 0, l = this.option.series.length; i < l; i++) {
                    chartType = this.option.series[i].type;
                    if (chartType == ecConfig.CHART_TYPE_LINE
                        || chartType == ecConfig.CHART_TYPE_BAR
                    ) {
                        axis = this.option.xAxis instanceof Array
                               ? this.option.xAxis[this.option.series[i].xAxisIndex || 0]
                               : this.option.xAxis;
                        if (axis && (axis.type || 'category') === 'category') {
                            axis.boundaryGap = boundaryGap ? true : axis.__boundaryGap;
                        }
                        axis = this.option.yAxis instanceof Array
                               ? this.option.yAxis[this.option.series[i].yAxisIndex || 0]
                               : this.option.yAxis;
                        if (axis && axis.type === 'category') {
                            axis.boundaryGap = boundaryGap ? true : axis.__boundaryGap;
                        }
                    }
                }
                
                this._defaultMagic(ecConfig.CHART_TYPE_LINE, ecConfig.CHART_TYPE_BAR);
            }
            this._defaultMagic(ecConfig.CHART_TYPE_CHORD, ecConfig.CHART_TYPE_FORCE);
            this._defaultMagic(ecConfig.CHART_TYPE_PIE, ecConfig.CHART_TYPE_FUNNEL);
            
            if (this._magicType[_MAGICTYPE_STACK] || this._magicType[_MAGICTYPE_TILED]) {
                // ÓÐ¶Ñ»ýÆ½ÆÌÇÐ»»
                for (var i = 0, l = this.option.series.length; i < l; i++) {
                    if (this._magicType[_MAGICTYPE_STACK]) {
                        // ÆôÓÃ¶Ñ»ý
                        this.option.series[i].stack = '_ECHARTS_STACK_KENER_2014_';
                        chartType = _MAGICTYPE_STACK;
                    }
                    else if (this._magicType[_MAGICTYPE_TILED]) {
                        // ÆôÓÃÆ½ÆÌ
                        this.option.series[i].stack = null;
                        chartType = _MAGICTYPE_TILED;
                    }
                    if (this._featureOption[chartType + 'Chart']) {
                        zrUtil.merge(
                            this.option.series[i],
                            this._featureOption[chartType + 'Chart'] || {},
                            true
                        );
                    }
                }
            }
            return this.option;
        },
        
        _defaultMagic : function(cType1, cType2) {
            if (this._magicType[cType1] || this._magicType[cType2]) {
                for (var i = 0, l = this.option.series.length; i < l; i++) {
                    var chartType = this.option.series[i].type;
                    if (chartType == cType1 || chartType == cType2) {
                        this.option.series[i].type = this._magicType[cType1] ? cType1 : cType2;
                        // ±ÜÃâ²»Í¬ÀàÐÍÍ¼±íÀàÐÍµÄÑùÊ½ÎÛÈ¾
                        this.option.series[i].itemStyle = zrUtil.clone(
                            this.option.series[i].__itemStyle
                        );
                        chartType = this.option.series[i].type;
                        if (this._featureOption[chartType + 'Chart']) {
                            zrUtil.merge(
                                this.option.series[i],
                                this._featureOption[chartType + 'Chart'] || {},
                                true
                            );
                        }
                    }
                }
            }
        },

        silence: function (s) {
            this._isSilence = s;
        },
        
        resize: function () {
            this._resetMark();
            this.clear();
            if (this.option && this.option.toolbox && this.option.toolbox.show) {
               this._buildShape();
            }
            if (this._dataView) {
                this._dataView.resize();
            }
        },

        hideDataView: function () {
            if (this._dataView) {
                this._dataView.hide();
            }
        },
        
        clear: function(notMark) {
            if (this.zr) {
                this.zr.delShape(this.shapeList);
                this.shapeList = [];
                
                if (!notMark) {
                    this.zr.delShape(this._markShapeList);
                    this._markShapeList = [];
                }
            }
        },
        
        /**
         * ÊÍ·ÅºóÊµÀý²»¿ÉÓÃ
         */
        onbeforDispose: function () {
            if (this._dataView) {
                this._dataView.dispose();
                this._dataView = null;
            }
            this._markShapeList = null;
        },
        
        /**
         * Ë¢ÐÂ
         */
        refresh: function (newOption) {
            if (newOption) {
                this._resetMark();
                this._resetZoom();
                
                newOption.toolbox = this.reformOption(newOption.toolbox);
                this.option = newOption;
                
                this.clear(true);
    
                if (newOption.toolbox.show) {
                    this._buildShape();
                }
    
                this.hideDataView();
            }
        }
    };
    
    zrUtil.inherits(Toolbox, Base);
    
    require('../component').define('toolbox', Toolbox);
    
    return Toolbox;
});
define('echarts/component/legend', ['require', './base', 'zrender/shape/Text', 'zrender/shape/Rectangle', 'zrender/shape/Sector', '../util/shape/Icon', '../util/shape/Candle', '../config', 'zrender/tool/util', 'zrender/tool/area', '../component'], function (require) {
    var Base = require('./base');
    
    // Í¼ÐÎÒÀÀµ
    var TextShape = require('zrender/shape/Text');
    var RectangleShape = require('zrender/shape/Rectangle');
    var SectorShape = require('zrender/shape/Sector');
    //var BeziercurveShape = require('zrender/shape/Beziercurve');
    var IconShape = require('../util/shape/Icon');
    var CandleShape = require('../util/shape/Candle');
    
    var ecConfig = require('../config');
     // Í¼Àý
    ecConfig.legend = {
        zlevel: 0,                  // Ò»¼¶²ãµþ
        z: 4,                       // ¶þ¼¶²ãµþ
        show: true,
        orient: 'horizontal',      // ²¼¾Ö·½Ê½£¬Ä¬ÈÏÎªË®Æ½²¼¾Ö£¬¿ÉÑ¡Îª£º
                                   // 'horizontal' | 'vertical'
        x: 'center',               // Ë®Æ½°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎªÈ«Í¼¾ÓÖÐ£¬¿ÉÑ¡Îª£º
                                   // 'center' | 'left' | 'right'
                                   // | {number}£¨x×ø±ê£¬µ¥Î»px£©
        y: 'top',                  // ´¹Ö±°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎªÈ«Í¼¶¥¶Ë£¬¿ÉÑ¡Îª£º
                                   // 'top' | 'bottom' | 'center'
                                   // | {number}£¨y×ø±ê£¬µ¥Î»px£©
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#ccc',       // Í¼Àý±ß¿òÑÕÉ«
        borderWidth: 0,            // Í¼Àý±ß¿òÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª0£¨ÎÞ±ß¿ò£©
        padding: 5,                // Í¼ÀýÄÚ±ß¾à£¬µ¥Î»px£¬Ä¬ÈÏ¸÷·½ÏòÄÚ±ß¾àÎª5£¬
                                   // ½ÓÊÜÊý×é·Ö±ðÉè¶¨ÉÏÓÒÏÂ×ó±ß¾à£¬Í¬css
        itemGap: 10,               // ¸÷¸öitemÖ®¼äµÄ¼ä¸ô£¬µ¥Î»px£¬Ä¬ÈÏÎª10£¬
                                   // ºáÏò²¼¾ÖÊ±ÎªË®Æ½¼ä¸ô£¬×ÝÏò²¼¾ÖÊ±Îª×ÝÏò¼ä¸ô
        itemWidth: 20,             // Í¼ÀýÍ¼ÐÎ¿í¶È
        itemHeight: 14,            // Í¼ÀýÍ¼ÐÎ¸ß¶È
        textStyle: {
            color: '#333'          // Í¼ÀýÎÄ×ÖÑÕÉ«
        },
        selectedMode: true         // Ñ¡ÔñÄ£Ê½£¬Ä¬ÈÏ¿ªÆôÍ¼Àý¿ª¹Ø
        // selected: null,         // ÅäÖÃÄ¬ÈÏÑ¡ÖÐ×´Ì¬£¬¿ÉÅäºÏLEGEND.SELECTEDÊÂ¼þ×ö¶¯Ì¬Êý¾ÝÔØÈë
        // data: [],               // Í¼ÀýÄÚÈÝ£¨Ïê¼ûlegend.data£¬Êý×éÖÐÃ¿Ò»Ïî´ú±íÒ»¸öitem
    };

    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');

    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} option Í¼±í²ÎÊý
     */
    function Legend(ecTheme, messageCenter, zr, option, myChart) {
        if (!this.query(option, 'legend.data')) {
            console.error('option.legend.data has not been defined.');
            return;
        }
        
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        var self = this;
        self._legendSelected = function (param) {
            self.__legendSelected(param);
        };
        self._dispatchHoverLink = function(param) {
            return self.__dispatchHoverLink(param);
        };
        
        this._colorIndex = 0;
        this._colorMap = {};
        this._selectedMap = {};
        this._hasDataMap = {};
        
        this.refresh(option);
    }
    
    Legend.prototype = {
        type: ecConfig.COMPONENT_TYPE_LEGEND,
        _buildShape: function () {
            if (!this.legendOption.show) {
                return;
            }
            // Í¼ÀýÔªËØ×éµÄÎ»ÖÃ²ÎÊý£¬Í¨¹ý¼ÆËãËùµÃx, y, width, height
            this._itemGroupLocation = this._getItemGroupLocation();

            this._buildBackground();
            this._buildItem();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        /**
         * ¹¹½¨ËùÓÐÍ¼ÀýÔªËØ
         */
        _buildItem: function () {
            var data = this.legendOption.data;
            var dataLength = data.length;
            var itemName;
            var itemType;
            var itemShape;
            var textShape;
            var textStyle  = this.legendOption.textStyle;
            var dataTextStyle;
            var dataFont;
            var formattedName;

            var zrWidth = this.zr.getWidth();
            var zrHeight = this.zr.getHeight();
            var lastX = this._itemGroupLocation.x;
            var lastY = this._itemGroupLocation.y;
            var itemWidth = this.legendOption.itemWidth;
            var itemHeight = this.legendOption.itemHeight;
            var itemGap = this.legendOption.itemGap;
            var color;

            if (this.legendOption.orient === 'vertical' && this.legendOption.x === 'right') {
                lastX = this._itemGroupLocation.x
                        + this._itemGroupLocation.width
                        - itemWidth;
            }

            for (var i = 0; i < dataLength; i++) {
                dataTextStyle = zrUtil.merge(
                    data[i].textStyle || {},
                    textStyle
                );
                dataFont = this.getFont(dataTextStyle);
                
                itemName = this._getName(data[i]);
                formattedName = this._getFormatterName(itemName);
                if (itemName === '') { // ±ð°ïÎÒ´úÂëÓÅ»¯
                    if (this.legendOption.orient === 'horizontal') {
                        lastX = this._itemGroupLocation.x;
                        lastY += itemHeight + itemGap;
                    }
                    else {
                        this.legendOption.x === 'right'
                            ? lastX -= this._itemGroupLocation.maxWidth + itemGap
                            : lastX += this._itemGroupLocation.maxWidth + itemGap;
                        lastY = this._itemGroupLocation.y;
                    }
                    continue;
                }
                itemType = data[i].icon || this._getSomethingByName(itemName).type;
                
                color = this.getColor(itemName);

                if (this.legendOption.orient === 'horizontal') {
                    if (zrWidth - lastX < 200   // ×îºó200px×ö·ÖÐÐÔ¤ÅÐ
                        && (itemWidth + 5 + zrArea.getTextWidth(formattedName, dataFont)
                            // ·ÖÐÐµÄ×îºóÒ»¸ö²»ÓÃËãitemGap
                            + (i === dataLength - 1 || data[i + 1] === '' ? 0 : itemGap)
                           ) >= zrWidth - lastX
                    ) {
                        lastX = this._itemGroupLocation.x;
                        lastY += itemHeight + itemGap;
                    }
                }
                else {
                    if (zrHeight - lastY < 200   // ×îºó200px×ö·ÖÐÐÔ¤ÅÐ
                        && (itemHeight
                            // ·ÖÐÐµÄ×îºóÒ»¸ö²»ÓÃËãitemGap
                            + (i === dataLength - 1 || data[i + 1] === '' ? 0 : itemGap)
                           ) 
                           >= zrHeight - lastY
                    ) {
                        this.legendOption.x === 'right'
                        ? lastX -= this._itemGroupLocation.maxWidth + itemGap
                        : lastX += this._itemGroupLocation.maxWidth + itemGap;
                        lastY = this._itemGroupLocation.y;
                    }
                }

                // Í¼ÐÎ
                itemShape = this._getItemShapeByType(
                    lastX, lastY,
                    itemWidth, itemHeight,
                    (this._selectedMap[itemName] && this._hasDataMap[itemName] ? color : '#ccc'),
                    itemType,
                    color
                );
                itemShape._name = itemName;
                itemShape = new IconShape(itemShape);

                // ÎÄ×Ö
                textShape = {
                    // shape: 'text',
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    style: {
                        x: lastX + itemWidth + 5,
                        y: lastY + itemHeight / 2,
                        color: this._selectedMap[itemName]
                                ? (dataTextStyle.color === 'auto' ? color : dataTextStyle.color)
                                : '#ccc',
                        text: formattedName,
                        textFont: dataFont,
                        textBaseline: 'middle'
                    },
                    highlightStyle: {
                        color: color,
                        brushType: 'fill'
                    },
                    hoverable: !!this.legendOption.selectedMode,
                    clickable: !!this.legendOption.selectedMode
                };

                if (this.legendOption.orient === 'vertical'
                    && this.legendOption.x === 'right'
                ) {
                    textShape.style.x -= (itemWidth + 10);
                    textShape.style.textAlign = 'right';
                }

                textShape._name = itemName;
                textShape = new TextShape(textShape);
                
                if (this.legendOption.selectedMode) {
                    itemShape.onclick = textShape.onclick = this._legendSelected;
                    itemShape.onmouseover =  textShape.onmouseover = this._dispatchHoverLink;
                    itemShape.hoverConnect = textShape.id;
                    textShape.hoverConnect = itemShape.id;
                }
                this.shapeList.push(itemShape);
                this.shapeList.push(textShape);

                if (this.legendOption.orient === 'horizontal') {
                    lastX += itemWidth + 5
                             + zrArea.getTextWidth(formattedName, dataFont)
                             + itemGap;
                }
                else {
                    lastY += itemHeight + itemGap;
                }
            }
        
            if (this.legendOption.orient === 'horizontal'
                && this.legendOption.x === 'center'
                && lastY != this._itemGroupLocation.y
            ) {
                // ¶àÐÐ™MÅÅ¾ÓÖÐÓÅ»¯
                this._mLineOptimize();
            }
        },
        
        _getName: function(data) {
            return typeof data.name != 'undefined' ? data.name : data;
        },

        _getFormatterName: function(itemName) {
            var formatter = this.legendOption.formatter;
            var formattedName;
            if (typeof formatter === 'function') {
                formattedName = formatter.call(this.myChart, itemName);
            }
            else if (typeof formatter === 'string') {
                formattedName = formatter.replace('{name}', itemName);
            }
            else {
                formattedName = itemName;
            }
            return formattedName;
        },

        _getFormatterNameFromData: function(data) {
            var itemName = this._getName(data);
            return this._getFormatterName(itemName);
        },
        
        // ¶àÐÐ™MÅÅ¾ÓÖÐÓÅ»¯
        _mLineOptimize: function () {
            var lineOffsetArray = []; // Ã¿ÐÐ¿í¶È
            var lastX = this._itemGroupLocation.x;
            for (var i = 2, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].style.x === lastX) {
                    lineOffsetArray.push(
                        (
                            this._itemGroupLocation.width 
                            - (
                                this.shapeList[i - 1].style.x
                                + zrArea.getTextWidth(
                                      this.shapeList[i - 1].style.text,
                                      this.shapeList[i - 1].style.textFont
                                  )
                                - lastX
                            )
                        ) / 2
                    );
                }
                else if (i === l - 1) {
                    lineOffsetArray.push(
                        (
                            this._itemGroupLocation.width 
                            - (
                                this.shapeList[i].style.x
                                + zrArea.getTextWidth(
                                      this.shapeList[i].style.text,
                                      this.shapeList[i].style.textFont
                                  )
                                - lastX
                            )
                        ) / 2
                    );
                }
            }
            var curLineIndex = -1;
            for (var i = 1, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].style.x === lastX) {
                    curLineIndex++;
                }
                if (lineOffsetArray[curLineIndex] === 0) {
                    continue;
                }
                else {
                    this.shapeList[i].style.x += lineOffsetArray[curLineIndex];
                }
            }
        },

        _buildBackground: function () {
            var padding = this.reformCssArray(this.legendOption.padding);

            this.shapeList.push(new RectangleShape({
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                hoverable :false,
                style: {
                    x: this._itemGroupLocation.x - padding[3],
                    y: this._itemGroupLocation.y - padding[0],
                    width: this._itemGroupLocation.width + padding[3] + padding[1],
                    height: this._itemGroupLocation.height + padding[0] + padding[2],
                    brushType: this.legendOption.borderWidth === 0 ? 'fill' : 'both',
                    color: this.legendOption.backgroundColor,
                    strokeColor: this.legendOption.borderColor,
                    lineWidth: this.legendOption.borderWidth
                }
            }));
        },

        /**
         * ¸ù¾ÝÑ¡Ïî¼ÆËãÍ¼ÀýÊµÌåµÄÎ»ÖÃ×ø±ê
         */
        _getItemGroupLocation: function () {
            var data = this.legendOption.data;
            var dataLength = data.length;
            var itemGap = this.legendOption.itemGap;
            var itemWidth = this.legendOption.itemWidth + 5; // 5pxÊÇÍ¼ÐÎºÍÎÄ×ÖµÄ¼ä¸ô£¬²»¿ÉÅä
            var itemHeight = this.legendOption.itemHeight;
            var textStyle  = this.legendOption.textStyle;
            var font = this.getFont(textStyle);
            var totalWidth = 0;
            var totalHeight = 0;
            var padding = this.reformCssArray(this.legendOption.padding);
            var zrWidth = this.zr.getWidth() - padding[1] - padding[3];
            var zrHeight = this.zr.getHeight() - padding[0] - padding[2];
            
            var temp = 0; // ¿í¸ß¼ÆËã£¬ÓÃÓÚ¶àÐÐÅÐ¶Ï
            var maxWidth = 0; // ´¹Ö±²¼¾ÖÓÐÓÃ
            if (this.legendOption.orient === 'horizontal') {
                // Ë®Æ½²¼¾Ö£¬¼ÆËã×Ü¿í¶È
                totalHeight = itemHeight;
                for (var i = 0; i < dataLength; i++) {
                    if (this._getName(data[i]) === '') {
                        temp -= itemGap;
                        totalWidth = Math.max(totalWidth, temp);
                        totalHeight += itemHeight + itemGap;
                        temp = 0;
                        continue;
                    }
                    var tempTextWidth = zrArea.getTextWidth(
                        this._getFormatterNameFromData(data[i]),
                        data[i].textStyle 
                        ? this.getFont(zrUtil.merge(
                            data[i].textStyle || {},
                            textStyle
                          ))
                        : font
                    );
                    if (temp + itemWidth + tempTextWidth + itemGap > zrWidth) {
                        // new line
                        temp -= itemGap;  // ¼õÈ¥×îºóÒ»¸öµÄitemGap
                        totalWidth = Math.max(totalWidth, temp);
                        totalHeight += itemHeight + itemGap;
                        temp = 0;
                    }
                    else {
                        temp += itemWidth + tempTextWidth + itemGap;
                        totalWidth = Math.max(totalWidth, temp - itemGap);
                    }
                }
            }
            else {
                // ´¹Ö±²¼¾Ö£¬¼ÆËã×Ü¸ß¶È
                for (var i = 0; i < dataLength; i++) {
                    maxWidth = Math.max(
                        maxWidth,
                        zrArea.getTextWidth(
                            this._getFormatterNameFromData(data[i]),
                            data[i].textStyle 
                            ? this.getFont(zrUtil.merge(
                                  data[i].textStyle || {},
                                  textStyle
                              ))
                            : font
                        )
                    );
                }
                maxWidth += itemWidth;
                totalWidth = maxWidth;
                for (var i = 0; i < dataLength; i++) {
                    if (this._getName(data[i]) === '') {
                        totalWidth += maxWidth + itemGap;
                        temp -= itemGap;  // ¼õÈ¥×îºóÒ»¸öµÄitemGap
                        totalHeight = Math.max(totalHeight, temp);
                        temp = 0;
                        continue;
                    }
                    if (temp + itemHeight + itemGap > zrHeight) {
                        // new line
                        totalWidth += maxWidth + itemGap;
                        temp -= itemGap;  // ¼õÈ¥×îºóÒ»¸öµÄitemGap
                        totalHeight = Math.max(totalHeight, temp);
                        temp = 0;
                    }
                    else {
                        temp += itemHeight + itemGap;
                        totalHeight = Math.max(totalHeight, temp - itemGap);
                    }
                }
            }

            zrWidth = this.zr.getWidth();
            zrHeight = this.zr.getHeight();
            var x;
            switch (this.legendOption.x) {
                case 'center' :
                    x = Math.floor((zrWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = padding[3] + this.legendOption.borderWidth;
                    break;
                case 'right' :
                    x = zrWidth
                        - totalWidth
                        - padding[1]
                        - padding[3]
                        - this.legendOption.borderWidth * 2;
                    break;
                default :
                    x = this.parsePercent(this.legendOption.x, zrWidth);
                    break;
            }
            
            var y;
            switch (this.legendOption.y) {
                case 'top' :
                    y = padding[0] + this.legendOption.borderWidth;
                    break;
                case 'bottom' :
                    y = zrHeight
                        - totalHeight
                        - padding[0]
                        - padding[2]
                        - this.legendOption.borderWidth * 2;
                    break;
                case 'center' :
                    y = Math.floor((zrHeight - totalHeight) / 2);
                    break;
                default :
                    y = this.parsePercent(this.legendOption.y, zrHeight);
                    break;
            }

            return {
                x: x,
                y: y,
                width: totalWidth,
                height: totalHeight,
                maxWidth: maxWidth
            };
        },

        /**
         * ¸ù¾ÝÃû³Æ·µ»ØseriesÊý¾Ý»òdata
         */
        _getSomethingByName: function (name) {
            var series = this.option.series;
            var data;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].name === name) {
                    // ÏµÁÐÃû³ÆÓÅÏÈ
                    return {
                        type: series[i].type,
                        series: series[i],
                        seriesIndex: i,
                        data: null,
                        dataIndex: -1
                    };
                }

                if (
                    series[i].type === ecConfig.CHART_TYPE_PIE 
                    || series[i].type === ecConfig.CHART_TYPE_RADAR
                    || series[i].type === ecConfig.CHART_TYPE_CHORD
                    || series[i].type === ecConfig.CHART_TYPE_FORCE
                    || series[i].type === ecConfig.CHART_TYPE_FUNNEL
                    || series[i].type === ecConfig.CHART_TYPE_TREEMAP
                ) {
                    data = series[i].categories || series[i].data || series[i].nodes;

                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name === name) {
                            return {
                                type: series[i].type,
                                series: series[i],
                                seriesIndex: i,
                                data: data[j],
                                dataIndex: j
                            };
                        }
                    }
                }
            }
            return {
                type: 'bar',
                series: null,
                seriesIndex: -1,
                data: null,
                dataIndex: -1
            };
        },
        
        _getItemShapeByType: function (x, y, width, height, color, itemType, defaultColor) {
            var highlightColor = color === '#ccc' ? defaultColor : color;
            var itemShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    iconType: 'legendicon' + itemType,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    color: color,
                    strokeColor: color,
                    lineWidth: 2
                },
                highlightStyle: {
                    color: highlightColor,
                    strokeColor: highlightColor,
                    lineWidth: 1
                },
                hoverable: this.legendOption.selectedMode,
                clickable: this.legendOption.selectedMode
            };
            
            var imageLocation;
            if (itemType.match('image')) {
                var imageLocation = itemType.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
                itemType = 'image';
            }
            // ÌØÊâÉèÖÃ
            switch (itemType) {
                case 'line':
                    itemShape.style.brushType = 'stroke';
                    itemShape.highlightStyle.lineWidth = 3;
                    break;
                case 'radar':
                case 'venn':
                case 'tree':
                case 'treemap':
                case 'scatter':
                    itemShape.highlightStyle.lineWidth = 3;
                    break;
                case 'k':
                    itemShape.style.brushType = 'both';
                    itemShape.highlightStyle.lineWidth = 3;
                    itemShape.highlightStyle.color =
                    itemShape.style.color = this.deepQuery(
                        [this.ecTheme, ecConfig], 'k.itemStyle.normal.color'
                    ) || '#fff';
                    itemShape.style.strokeColor = color != '#ccc' 
                        ? (
                            this.deepQuery(
                                [this.ecTheme, ecConfig], 'k.itemStyle.normal.lineStyle.color'
                            ) || '#ff3200'
                        )
                        : color;
                    break;
                case 'image':
                    itemShape.style.iconType = 'image';
                    itemShape.style.image = imageLocation;
                    if (color === '#ccc') {
                        itemShape.style.opacity = 0.5;
                    }
                    break;
            }
            return itemShape;
        },

        __legendSelected: function (param) {
            var itemName = param.target._name;
            if (this.legendOption.selectedMode === 'single') {
                for (var k in this._selectedMap) {
                    this._selectedMap[k] = false;
                }
            }
            this._selectedMap[itemName] = !this._selectedMap[itemName];
            this.messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                param.event,
                {
                    selected: this._selectedMap,
                    target: itemName
                },
                this.myChart
            );
        },
        
        /**
         * ²úÉúhover linkÊÂ¼þ 
         */
        __dispatchHoverLink : function(param) {
            this.messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_HOVERLINK,
                param.event,
                {
                    target: param.target._name
                },
                this.myChart
            );
            return;
        },
        
        /**
         * Ë¢ÐÂ
         */
        refresh: function (newOption) {
            if (newOption) {
                this.option = newOption || this.option;
                this.option.legend = this.reformOption(this.option.legend);
                this.legendOption = this.option.legend;
                
                var data = this.legendOption.data || [];
                var itemName;
                var something;
                var color;
                var queryTarget;
                if (this.legendOption.selected) {
                    for (var k in this.legendOption.selected) {
                        this._selectedMap[k] = typeof this._selectedMap[k] != 'undefined'
                                               ? this._selectedMap[k]
                                               : this.legendOption.selected[k];
                    }
                }
                for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                    itemName = this._getName(data[i]);
                    if (itemName === '') {
                        continue;
                    }
                    something = this._getSomethingByName(itemName);
                    if (!something.series) {
                        this._hasDataMap[itemName] = false;
                    } 
                    else {
                        this._hasDataMap[itemName] = true;
                        if (something.data
                            && (something.type === ecConfig.CHART_TYPE_PIE
                                || something.type === ecConfig.CHART_TYPE_FORCE
                                || something.type === ecConfig.CHART_TYPE_FUNNEL)
                        ) {
                            queryTarget = [something.data, something.series];
                        }
                        else {
                            queryTarget = [something.series];
                        }
                        
                        color = this.getItemStyleColor(
                            this.deepQuery(queryTarget, 'itemStyle.normal.color'),
                            something.seriesIndex,
                            something.dataIndex,
                            something.data
                        );
                        if (color && something.type != ecConfig.CHART_TYPE_K) {
                            this.setColor(itemName, color);
                        }
                        this._selectedMap[itemName] = 
                            this._selectedMap[itemName] != null
                            ? this._selectedMap[itemName] : true; 
                    }
                }
            }
            this.clear();
            this._buildShape();
        },
        
        getRelatedAmount: function(name) {
            var amount = 0;
            var series = this.option.series;
            var data;
            for (var i = 0, l = series.length; i < l; i++) {
                if (series[i].name === name) {
                    // ÏµÁÐÃû³ÆÓÅÏÈ
                    amount++;
                }

                if (
                    series[i].type === ecConfig.CHART_TYPE_PIE 
                    || series[i].type === ecConfig.CHART_TYPE_RADAR
                    || series[i].type === ecConfig.CHART_TYPE_CHORD
                    || series[i].type === ecConfig.CHART_TYPE_FORCE
                    || series[i].type === ecConfig.CHART_TYPE_FUNNEL
                ) {
                    data = series[i].type != ecConfig.CHART_TYPE_FORCE
                           ? series[i].data         // ±ýÍ¼¡¢À×´ïÍ¼¡¢ºÍÏÒÍ¼µÃ²éÕÒÀïÃæµÄÊý¾ÝÃû×Ö
                           : series[i].categories;  // Á¦µ¼²¼¾Ö²éÕÒcategoriesÅäÖÃ
                    for (var j = 0, k = data.length; j < k; j++) {
                        if (data[j].name === name && data[j].value != '-') {
                            amount++;
                        }
                    }
                }
            }
            return amount;
        },

        setColor: function (legendName, color) {
            this._colorMap[legendName] = color;
        },

        getColor: function (legendName) {
            if (!this._colorMap[legendName]) {
                this._colorMap[legendName] = this.zr.getColor(this._colorIndex++);
            }
            return this._colorMap[legendName];
        },
        
        hasColor: function (legendName) {
            return this._colorMap[legendName] ? this._colorMap[legendName] : false;
        },

        add: function (name, color){
            var data = this.legendOption.data;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                if (this._getName(data[i]) === name) {
                    // ÒÑÓÐ¾Í²»ÖØ¸´¼ÓÁË
                    return;
                }
            }
            this.legendOption.data.push(name);
            this.setColor(name,color);
            this._selectedMap[name] = true;
            this._hasDataMap[name] = true;
        },

        del: function (name){
            var data = this.legendOption.data;
            for (var i = 0, dataLength = data.length; i < dataLength; i++) {
                if (this._getName(data[i]) === name) {
                    return this.legendOption.data.splice(i, 1);
                }
            }
        },
        
        /**
         * ÌØÊâÍ¼ÐÎÔªËØ»Øµ÷ÉèÖÃ
         * @param {Object} name
         * @param {Object} itemShape
         */
        getItemShape: function (name) {
            if (name == null) {
                return;
            }
            var shape;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                shape = this.shapeList[i];
                if (shape._name === name && shape.type != 'text') {
                    return shape;
                }
            }
        },
        
        /**
         * ÌØÊâÍ¼ÐÎÔªËØ»Øµ÷ÉèÖÃ
         * @param {Object} name
         * @param {Object} itemShape
         */
        setItemShape: function (name, itemShape) {
            var shape;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                shape = this.shapeList[i];
                if (shape._name === name && shape.type != 'text') {
                    if (!this._selectedMap[name]) {
                        itemShape.style.color = '#ccc';
                        itemShape.style.strokeColor = '#ccc';
                    }
                    this.zr.modShape(shape.id, itemShape);
                }
            }
        },

        isSelected: function (itemName) {
            if (typeof this._selectedMap[itemName] != 'undefined') {
                return this._selectedMap[itemName];
            }
            else {
                // Ã»ÔÚlegendÀï¶¨ÒåµÄ¶¼Îªtrue°¡~
                return true;
            }
        },
        
        getSelectedMap: function () {
            return this._selectedMap;
        },
        
        setSelected: function(itemName, selectStatus) {
            if (this.legendOption.selectedMode === 'single') {
                for (var k in this._selectedMap) {
                    this._selectedMap[k] = false;
                }
            }
            this._selectedMap[itemName] = selectStatus;
            this.messageCenter.dispatch(
                ecConfig.EVENT.LEGEND_SELECTED,
                null,
                {
                    selected: this._selectedMap,
                    target: itemName
                },
                this.myChart
            );
        },
        
        /**
         * Í¼ÀýÑ¡Ôñ
         */
        onlegendSelected: function (param, status) {
            var legendSelected = param.selected;
            for (var itemName in legendSelected) {
                if (this._selectedMap[itemName] != legendSelected[itemName]) {
                    // ÓÐÒ»Ïî²»Ò»ÖÂ¶¼ÐèÒªÖØ»æ
                    status.needRefresh = true;
                }
                this._selectedMap[itemName] = legendSelected[itemName];
            }
            return;
        }
    };
    
    var legendIcon = {
        line: function (ctx, style) {
            var dy = style.height / 2;
            ctx.moveTo(style.x,     style.y + dy);
            ctx.lineTo(style.x + style.width,style.y + dy);
        },
        
        pie: function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            SectorShape.prototype.buildPath(ctx, {
                x: x + width / 2,
                y: y + height + 2,
                r: height,
                r0: 6,
                startAngle: 45,
                endAngle: 135
            });
        },
        
        eventRiver: function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            ctx.moveTo(x, y + height);
            ctx.bezierCurveTo(
                x + width, y + height, x, y + 4, x + width, y + 4
            );
            ctx.lineTo(x + width, y);
            ctx.bezierCurveTo(
                x, y, x + width, y + height - 4, x, y + height - 4
            );
            ctx.lineTo(x, y + height);
        },
        
        k: function (ctx, style) {
            var x = style.x;
            var y = style.y;
            var width = style.width;
            var height = style.height;
            CandleShape.prototype.buildPath(ctx, {
                x: x + width / 2,
                y: [y + 1, y + 1, y + height - 6, y + height],
                width: width - 6
            });
        },
        
        bar: function (ctx, style) {
            var x = style.x;
            var y = style.y +1;
            var width = style.width;
            var height = style.height - 2;
            var r = 3;
            
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + width - r, y);
            ctx.quadraticCurveTo(
                x + width, y, x + width, y + r
            );
            ctx.lineTo(x + width, y + height - r);
            ctx.quadraticCurveTo(
                x + width, y + height, x + width - r, y + height
            );
            ctx.lineTo(x + r, y + height);
            ctx.quadraticCurveTo(
                x, y + height, x, y + height - r
            );
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
        },
        
        force: function (ctx, style) {
            IconShape.prototype.iconLibrary.circle(ctx, style);
        },
        
        radar: function (ctx, style) {
            var n = 6;
            var x = style.x + style.width / 2;
            var y = style.y + style.height / 2;
            var r = style.height / 2;

            var dStep = 2 * Math.PI / n;
            var deg = -Math.PI / 2;
            var xStart = x + r * Math.cos(deg);
            var yStart = y + r * Math.sin(deg);
            
            ctx.moveTo(xStart, yStart);
            deg += dStep;
            for (var i = 0, end = n - 1; i < end; i ++) {
                ctx.lineTo(x + r * Math.cos(deg), y + r * Math.sin(deg));
                deg += dStep;
            }
            ctx.lineTo(xStart, yStart);
        }
    };
    legendIcon.chord = legendIcon.pie;
    legendIcon.map = legendIcon.bar;
    
    for (var k in legendIcon) {
        IconShape.prototype.iconLibrary['legendicon' + k] = legendIcon[k];
    }
    
    zrUtil.inherits(Legend, Base);
    
    require('../component').define('legend', Legend);
    
    return Legend;
});
define('zrender/loadingEffect/Bar', ['require', './Base', '../tool/util', '../tool/color', '../shape/Rectangle'], function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrColor = require('../tool/color');
        var RectangleShape = require('../shape/Rectangle');

        function Bar(options) {
            Base.call(this, options);
        }
        util.inherits(Bar, Base);

        
        /**
         * ½ø¶ÈÌõ
         * 
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        Bar.prototype._start = function (addShapeHandle, refreshHandle) {
            // ÌØÐ§Ä¬ÈÏÅäÖÃ
            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#888'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effectOption : {
                        x : 0,
                        y : this.canvasHeight / 2 - 30,
                        width : this.canvasWidth,
                        height : 5,
                        brushType : 'fill',
                        timeInterval : 100
                    }
                }
            );

            var textShape = this.createTextShape(options.textStyle);
            var background = this.createBackgroundShape(options.backgroundColor);

            var effectOption = options.effectOption;

            // ³õÊ¼»¯¶¯»­ÔªËØ
            var barShape = new RectangleShape({
                highlightStyle : util.clone(effectOption)
            });

            barShape.highlightStyle.color =
                effectOption.color
                || zrColor.getLinearGradient(
                    effectOption.x,
                    effectOption.y,
                    effectOption.x + effectOption.width,
                    effectOption.y + effectOption.height,
                    [ [ 0, '#ff6400' ], [ 0.5, '#ffe100' ], [ 1, '#b1ff00' ] ]
                );

            if (options.progress != null) {
                // Ö¸¶¨½ø¶È
                addShapeHandle(background);

                barShape.highlightStyle.width =
                    this.adjust(options.progress, [ 0, 1 ])
                    * options.effectOption.width;
                    
                addShapeHandle(barShape);
                addShapeHandle(textShape);

                refreshHandle();
                return;
            }
            else {
                // Ñ­»·ÏÔÊ¾
                barShape.highlightStyle.width = 0;
                return setInterval(
                    function () {
                        addShapeHandle(background);

                        if (barShape.highlightStyle.width < effectOption.width) {
                            barShape.highlightStyle.width += 8;
                        }
                        else {
                            barShape.highlightStyle.width = 0;
                        }
                        addShapeHandle(barShape);
                        addShapeHandle(textShape);
                        refreshHandle();
                    },
                    effectOption.timeInterval
                );
            }
        };

        return Bar;
    });
define('echarts/component/tooltip', ['require', './base', '../util/shape/Cross', 'zrender/shape/Line', 'zrender/shape/Rectangle', '../config', '../util/ecData', 'zrender/config', 'zrender/tool/event', 'zrender/tool/area', 'zrender/tool/color', 'zrender/tool/util', 'zrender/shape/Base', '../component'], function (require) {
    var Base = require('./base');
    
    // Í¼ÐÎÒÀÀµ
    var CrossShape = require('../util/shape/Cross');
    var LineShape = require('zrender/shape/Line');
    var RectangleShape = require('zrender/shape/Rectangle');
    var rectangleInstance = new RectangleShape({});
    
    var ecConfig = require('../config');
    // ÌáÊ¾¿ò
    ecConfig.tooltip = {
        zlevel: 1,                  // Ò»¼¶²ãµþ£¬Æµ·±±ä»¯µÄtooltipÖ¸Ê¾Æ÷ÔÚpcÉÏ¶ÀÁ¢Ò»²ã
        z: 8,                       // ¶þ¼¶²ãµþ
        show: true,
        showContent: true,         // tooltipÖ÷ÌåÄÚÈÝ
        trigger: 'item',           // ´¥·¢ÀàÐÍ£¬Ä¬ÈÏÊý¾Ý´¥·¢£¬¼ûÏÂÍ¼£¬¿ÉÑ¡Îª£º'item' | 'axis'
        // position: null          // Î»ÖÃ {Array} | {Function}
        // formatter: null         // ÄÚÈÝ¸ñÊ½Æ÷£º{string}£¨Template£© | {Function}
        islandFormatter: '{a} <br/>{b} : {c}',  // Êý¾Ý¹ÂµºÄÚÈÝ¸ñÊ½Æ÷
        showDelay: 20,             // ÏÔÊ¾ÑÓ³Ù£¬Ìí¼ÓÏÔÊ¾ÑÓ³Ù¿ÉÒÔ±ÜÃâÆµ·±ÇÐ»»£¬µ¥Î»ms
        hideDelay: 100,            // Òþ²ØÑÓ³Ù£¬µ¥Î»ms
        transitionDuration: 0.4,   // ¶¯»­±ä»»Ê±¼ä£¬µ¥Î»s
        enterable: false,
        backgroundColor: 'rgba(0,0,0,0.7)',     // ÌáÊ¾±³¾°ÑÕÉ«£¬Ä¬ÈÏÎªÍ¸Ã÷¶ÈÎª0.7µÄºÚÉ«
        borderColor: '#333',       // ÌáÊ¾±ß¿òÑÕÉ«
        borderRadius: 4,           // ÌáÊ¾±ß¿òÔ²½Ç£¬µ¥Î»px£¬Ä¬ÈÏÎª4
        borderWidth: 0,            // ÌáÊ¾±ß¿òÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª0£¨ÎÞ±ß¿ò£©
        padding: 5,                // ÌáÊ¾ÄÚ±ß¾à£¬µ¥Î»px£¬Ä¬ÈÏ¸÷·½ÏòÄÚ±ß¾àÎª5£¬
                                   // ½ÓÊÜÊý×é·Ö±ðÉè¶¨ÉÏÓÒÏÂ×ó±ß¾à£¬Í¬css
        axisPointer: {             // ×ø±êÖáÖ¸Ê¾Æ÷£¬×ø±êÖá´¥·¢ÓÐÐ§
            type: 'line',          // Ä¬ÈÏÎªÖ±Ïß£¬¿ÉÑ¡Îª£º'line' | 'shadow' | 'cross'
            lineStyle: {           // Ö±ÏßÖ¸Ê¾Æ÷ÑùÊ½ÉèÖÃ
                color: '#48b',
                width: 2,
                type: 'solid'
            },
            crossStyle: {
                color: '#1e90ff',
                width: 1,
                type: 'dashed'
            },
            shadowStyle: {                      // ÒõÓ°Ö¸Ê¾Æ÷ÑùÊ½ÉèÖÃ
                color: 'rgba(150,150,150,0.3)', // ÒõÓ°ÑÕÉ«
                width: 'auto',                  // ÒõÓ°´óÐ¡
                type: 'default'
            }
        },
        textStyle: {
            color: '#fff'
        }
    };

    var ecData = require('../util/ecData');
    var zrConfig = require('zrender/config');
    var zrEvent = require('zrender/tool/event');
    var zrArea = require('zrender/tool/area');
    var zrColor = require('zrender/tool/color');
    var zrUtil = require('zrender/tool/util');
    var zrShapeBase = require('zrender/shape/Base');

    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} option ÌáÊ¾¿ò²ÎÊý
     * @param {HtmlElement} dom Ä¿±ê¶ÔÏó
     * @param {ECharts} myChart µ±Ç°Í¼±íÊµÀý
     */
    function Tooltip(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);
        
        this.dom = myChart.dom;
        
        var self = this;
        self._onmousemove = function (param) {
            return self.__onmousemove(param);
        };
        self._onglobalout = function (param) {
            return self.__onglobalout(param);
        };
        
        this.zr.on(zrConfig.EVENT.MOUSEMOVE, self._onmousemove);
        this.zr.on(zrConfig.EVENT.GLOBALOUT, self._onglobalout);

        self._hide = function (param) {
            return self.__hide(param);
        };
        self._tryShow = function(param) {
            return self.__tryShow(param);
        };
        self._refixed = function(param) {
            return self.__refixed(param);
        };
        
        self._setContent = function(ticket, res) {
            return self.__setContent(ticket, res);
        };
        
        this._tDom = this._tDom || document.createElement('div');
        // ±ÜÃâÍÏ×§Ê±Ò³ÃæÑ¡ÖÐµÄÞÏÞÎ
        this._tDom.onselectstart = function() {
            return false;
        };
        this._tDom.onmouseover = function() {
            self._mousein = true;
        };
        this._tDom.onmouseout = function() {
            self._mousein = false;
        };
        this._tDom.className = 'echarts-tooltip';
        this._tDom.style.position = 'absolute';  // ²»ÊÇ¶àÓàµÄ£¬±ðÉ¾£¡
        this.hasAppend = false;
        
        this._axisLineShape && this.zr.delShape(this._axisLineShape.id);
        this._axisLineShape = new LineShape({
            zlevel: this.getZlevelBase(),
            z: this.getZBase(),
            invisible: true,
            hoverable: false
        });
        this.shapeList.push(this._axisLineShape);
        this.zr.addShape(this._axisLineShape);
        
        this._axisShadowShape && this.zr.delShape(this._axisShadowShape.id);
        this._axisShadowShape = new LineShape({
            zlevel: this.getZlevelBase(),
            z: 1,                      // gridÉÏ£¬chartÏÂ
            invisible: true,
            hoverable: false
        });
        this.shapeList.push(this._axisShadowShape);
        this.zr.addShape(this._axisShadowShape);
        
        this._axisCrossShape && this.zr.delShape(this._axisCrossShape.id);
        this._axisCrossShape = new CrossShape({
            zlevel: this.getZlevelBase(),
            z: this.getZBase(),
            invisible: true,
            hoverable: false
        });
        this.shapeList.push(this._axisCrossShape);
        this.zr.addShape(this._axisCrossShape);
        
        this.showing = false;
        this.refresh(option);
    }
    
    Tooltip.prototype = {
        type: ecConfig.COMPONENT_TYPE_TOOLTIP,
        // Í¨ÓÃÑùÊ½
        _gCssText: 'position:absolute;display:block;border-style:solid;white-space:nowrap;',
        /**
         * ¸ù¾ÝÅäÖÃÉèÖÃdomÑùÊ½
         */
        _style: function (opt) {
            if (!opt) {
                return '';
            }
            var cssText = [];
            if (opt.transitionDuration) {
                var transitionText = 'left ' + opt.transitionDuration + 's,'
                                    + 'top ' + opt.transitionDuration + 's';
                cssText.push(
                    'transition:' + transitionText
                );
                cssText.push(
                    '-moz-transition:' + transitionText
                );
                cssText.push(
                    '-webkit-transition:' + transitionText
                );
                cssText.push(
                    '-o-transition:' + transitionText
                );
            }

            if (opt.backgroundColor) {
                // for sb ie~
                cssText.push(
                    'background-Color:' + zrColor.toHex(
                        opt.backgroundColor
                    )
                );
                cssText.push('filter:alpha(opacity=70)');
                cssText.push('background-Color:' + opt.backgroundColor);
            }

            if (opt.borderWidth != null) {
                cssText.push('border-width:' + opt.borderWidth + 'px');
            }

            if (opt.borderColor != null) {
                cssText.push('border-color:' + opt.borderColor);
            }

            if (opt.borderRadius != null) {
                cssText.push(
                    'border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-moz-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-webkit-border-radius:' + opt.borderRadius + 'px'
                );
                cssText.push(
                    '-o-border-radius:' + opt.borderRadius + 'px'
                );
            }

            var textStyle = opt.textStyle;
            if (textStyle) {
                textStyle.color && cssText.push('color:' + textStyle.color);
                textStyle.decoration && cssText.push(
                    'text-decoration:' + textStyle.decoration
                );
                textStyle.align && cssText.push(
                    'text-align:' + textStyle.align
                );
                textStyle.fontFamily && cssText.push(
                    'font-family:' + textStyle.fontFamily
                );
                textStyle.fontSize && cssText.push(
                    'font-size:' + textStyle.fontSize + 'px'
                );
                textStyle.fontSize && cssText.push(
                    'line-height:' + Math.round(textStyle.fontSize*3/2) + 'px'
                );
                textStyle.fontStyle && cssText.push(
                    'font-style:' + textStyle.fontStyle
                );
                textStyle.fontWeight && cssText.push(
                    'font-weight:' + textStyle.fontWeight
                );
            }


            var padding = opt.padding;
            if (padding != null) {
                padding = this.reformCssArray(padding);
                cssText.push(
                    'padding:' + padding[0] + 'px '
                               + padding[1] + 'px '
                               + padding[2] + 'px '
                               + padding[3] + 'px'
                );
            }

            cssText = cssText.join(';') + ';';

            return cssText;
        },
        
        __hide: function () {
            this._lastDataIndex = -1;
            this._lastSeriesIndex = -1;
            this._lastItemTriggerId = -1;
            if (this._tDom) {
                this._tDom.style.display = 'none';
            }
            var needRefresh = false;
            if (!this._axisLineShape.invisible) {
                this._axisLineShape.invisible = true;
                this.zr.modShape(this._axisLineShape.id);
                needRefresh = true;
            }
            if (!this._axisShadowShape.invisible) {
                this._axisShadowShape.invisible = true;
                this.zr.modShape(this._axisShadowShape.id);
                needRefresh = true;
            }
            if (!this._axisCrossShape.invisible) {
                this._axisCrossShape.invisible = true;
                this.zr.modShape(this._axisCrossShape.id);
                needRefresh = true;
            }
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
                this._lastTipShape = false;
                this.shapeList.length = 2;
            }
            needRefresh && this.zr.refreshNextFrame();
            this.showing = false;
        },
        
        _show: function (position, x, y, specialCssText) {
            var domHeight = this._tDom.offsetHeight;
            var domWidth = this._tDom.offsetWidth;
            if (position) {
                if (typeof position === 'function') {
                    position = position([x, y]);
                }
                if (position instanceof Array) {
                    x = position[0];
                    y = position[1];
                }
            }
            if (x + domWidth > this._zrWidth) {
                // Ì«¿¿ÓÒ
                //x = this._zrWidth - domWidth;
                x -= (domWidth + 40);
            }
            if (y + domHeight > this._zrHeight) {
                // Ì«¿¿ÏÂ
                //y = this._zrHeight - domHeight;
                y -= (domHeight - 20);
            }
            if (y < 20) {
                y = 0;
            }
            this._tDom.style.cssText = this._gCssText
                                  + this._defaultCssText
                                  + (specialCssText ? specialCssText : '')
                                  + 'left:' + x + 'px;top:' + y + 'px;';
            
            if (domHeight < 10 || domWidth < 10) {
                // this._zrWidth - x < 100 || this._zrHeight - y < 100
                setTimeout(this._refixed, 20);
            }
            this.showing = true;
        },
        
        __refixed: function () {
            if (this._tDom) {
                var cssText = '';
                var domHeight = this._tDom.offsetHeight;
                var domWidth = this._tDom.offsetWidth;
                if (this._tDom.offsetLeft + domWidth > this._zrWidth) {
                    cssText += 'left:' + (this._zrWidth - domWidth - 20) + 'px;';
                }
                if (this._tDom.offsetTop + domHeight > this._zrHeight) {
                    cssText += 'top:' + (this._zrHeight - domHeight - 10) + 'px;';
                }
                if (cssText !== '') {
                    this._tDom.style.cssText += cssText;
                }
            }
        },
        
        __tryShow: function () {
            var needShow;
            var trigger;
            if (!this._curTarget) {
                // ×ø±êÖáÊÂ¼þ
                this._findPolarTrigger() || this._findAxisTrigger();
            }
            else {
                // Êý¾ÝÏîÊÂ¼þ
                if (this._curTarget._type === 'island' && this.option.tooltip.show) {
                    this._showItemTrigger();
                    return;
                }
                var serie = ecData.get(this._curTarget, 'series');
                var data = ecData.get(this._curTarget, 'data');
                needShow = this.deepQuery(
                    [data, serie, this.option],
                    'tooltip.show'
                );
                if (serie == null || data == null || !needShow) {
                    // ²»ÏìÓ¦tooltipµÄÊý¾Ý¶ÔÏóÑÓÊ±Òþ²Ø
                    clearTimeout(this._hidingTicket);
                    clearTimeout(this._showingTicket);
                    this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                }
                else {
                    trigger = this.deepQuery(
                        [data, serie, this.option],
                        'tooltip.trigger'
                    );
                    
                    trigger === 'axis'
                                ? this._showAxisTrigger(
                                      serie.xAxisIndex, serie.yAxisIndex,
                                      ecData.get(this._curTarget, 'dataIndex')
                                  )
                                : this._showItemTrigger();
                }
            }
        },

        /**
         * Ö±½ÇÏµ 
         */
        _findAxisTrigger: function () {
            if (!this.component.xAxis || !this.component.yAxis) {
                this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                return;
            }
            var series = this.option.series;
            var xAxisIndex;
            var yAxisIndex;
            for (var i = 0, l = series.length; i < l; i++) {
                // ÕÒµ½µÚÒ»¸öaxis´¥·¢tooltipµÄÏµÁÐ
                if (this.deepQuery([series[i], this.option], 'tooltip.trigger') === 'axis') {
                    xAxisIndex = series[i].xAxisIndex || 0;
                    yAxisIndex = series[i].yAxisIndex || 0;
                    if (this.component.xAxis.getAxis(xAxisIndex)
                        && this.component.xAxis.getAxis(xAxisIndex).type
                           === ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // ºáÖáÎªÀàÄ¿Öá
                        this._showAxisTrigger(xAxisIndex, yAxisIndex,
                            this._getNearestDataIndex(
                                'x', this.component.xAxis.getAxis(xAxisIndex)
                            )
                        );
                        return;
                    } 
                    else if (this.component.yAxis.getAxis(yAxisIndex)
                             && this.component.yAxis.getAxis(yAxisIndex).type
                                === ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                    ) {
                        // ×ÝÖáÎªÀàÄ¿Öá
                        this._showAxisTrigger(xAxisIndex, yAxisIndex,
                            this._getNearestDataIndex(
                                'y', this.component.yAxis.getAxis(yAxisIndex)
                            )
                        );
                        return;
                    }
                    else {
                        // Ë«ÊýÖµÖá
                        this._showAxisTrigger(xAxisIndex, yAxisIndex, -1);
                        return;
                    }
                }
            }
            if (this.option.tooltip.axisPointer.type === 'cross') {
                this._showAxisTrigger(-1, -1, -1);
            }
        },
        
        /**
         * ¼«×ø±ê 
         */
        _findPolarTrigger: function () {
            if (!this.component.polar) {
                return false;
            }
            var x = zrEvent.getX(this._event);
            var y = zrEvent.getY(this._event);
            var polarIndex = this.component.polar.getNearestIndex([x, y]);
            var valueIndex;
            if (polarIndex) {
                valueIndex = polarIndex.valueIndex;
                polarIndex = polarIndex.polarIndex;
            }
            else {
                polarIndex = -1;
            }
            
            if (polarIndex != -1) {
                return this._showPolarTrigger(polarIndex, valueIndex);
            }
            
            return false;
        },
        
        /**
         * ¸ù¾Ý×ø±êÖáÊÂ¼þ´øµÄÊôÐÔ»ñÈ¡×î½üµÄaxisDataIndex
         */
        _getNearestDataIndex: function (direction, categoryAxis) {
            var dataIndex = -1;
            var x = zrEvent.getX(this._event);
            var y = zrEvent.getY(this._event);
            if (direction === 'x') {
                // ºáÖáÎªÀàÄ¿Öá
                var left;
                var right;
                var xEnd = this.component.grid.getXend();
                var curCoord = categoryAxis.getCoordByIndex(dataIndex);
                while (curCoord < xEnd) {
                    right = curCoord;
                    if (curCoord <= x) {
                        left = curCoord;
                    }
                    else {
                        break;
                    }
                    curCoord = categoryAxis.getCoordByIndex(++dataIndex);
                }
                if (dataIndex <= 0) {
                    dataIndex = 0;
                }
                else if (x - left <= right - x) {
                    dataIndex -= 1;
                }
                else {
                    // ÀëÓÒ±ß½ü£¬¿´ÊÇ·ñÎª×îºóÒ»¸ö
                    if (categoryAxis.getNameByIndex(dataIndex) == null) {
                        dataIndex -= 1;
                    }
                }
                return dataIndex;
            }
            else {
                // ×ÝÖáÎªÀàÄ¿Öá
                var top;
                var bottom;
                var yStart = this.component.grid.getY();
                var curCoord = categoryAxis.getCoordByIndex(dataIndex);
                while (curCoord > yStart) {
                    top = curCoord;
                    if (curCoord >= y) {
                        bottom = curCoord;
                    }
                    else {
                        break;
                    }
                    curCoord = categoryAxis.getCoordByIndex(++dataIndex);
                }

                if (dataIndex <= 0) {
                    dataIndex = 0;
                }
                else if (y - top >= bottom - y) {
                    dataIndex -= 1;
                }
                else {
                    // ÀëÉÏ·½±ß½ü£¬¿´ÊÇ·ñÎª×îºóÒ»¸ö
                    if (categoryAxis.getNameByIndex(dataIndex) == null) {
                        dataIndex -= 1;
                    }
                }
                return dataIndex;
            }
            return -1;
        },

        /**
         * Ö±½ÇÏµ 
         */
        _showAxisTrigger: function (xAxisIndex, yAxisIndex, dataIndex) {
            !this._event.connectTrigger && this.messageCenter.dispatch(
                ecConfig.EVENT.TOOLTIP_IN_GRID,
                this._event,
                null,
                this.myChart
            );
            if (this.component.xAxis == null
                || this.component.yAxis == null
                || xAxisIndex == null
                || yAxisIndex == null
                // || dataIndex < 0
            ) {
                // ²»ÏìÓ¦tooltipµÄÊý¾Ý¶ÔÏóÑÓÊ±Òþ²Ø
                clearTimeout(this._hidingTicket);
                clearTimeout(this._showingTicket);
                this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                return;
            }
            var series = this.option.series;
            var seriesArray = [];
            var seriesIndex = [];
            var categoryAxis;

            var formatter;
            var position;
            var showContent;
            var specialCssText = '';
            if (this.option.tooltip.trigger === 'axis') {
                if (!this.option.tooltip.show) {
                    return;
                }
                formatter = this.option.tooltip.formatter;
                position = this.option.tooltip.position;
            }

            var axisLayout = xAxisIndex != -1
                             && this.component.xAxis.getAxis(xAxisIndex).type
                                === ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                             ? 'xAxis'      // ºáÖáÎªÀàÄ¿Öá£¬ÕÒµ½ËùÓÐÓÃÕâÌõºáÖá²¢ÇÒaxis´¥·¢µÄÏµÁÐÊý¾Ý
                             : yAxisIndex != -1
                               && this.component.yAxis.getAxis(yAxisIndex).type
                                  === ecConfig.COMPONENT_TYPE_AXIS_CATEGORY
                               ? 'yAxis'    // ×ÝÖáÎªÀàÄ¿Öá£¬ÕÒµ½ËùÓÐÓÃÕâÌõ×ÝÖá²¢ÇÒaxis´¥·¢µÄÏµÁÐÊý¾Ý
                               : false;
            var x;
            var y;
            if (axisLayout) {
                var axisIndex = axisLayout == 'xAxis' ? xAxisIndex : yAxisIndex;
                categoryAxis = this.component[axisLayout].getAxis(axisIndex);
                for (var i = 0, l = series.length; i < l; i++) {
                    if (!this._isSelected(series[i].name)) {
                        continue;
                    }
                    if (series[i][axisLayout + 'Index'] === axisIndex
                        && this.deepQuery([series[i], this.option], 'tooltip.trigger') === 'axis'
                    ) {
                        showContent = this.query(series[i], 'tooltip.showContent') 
                                      || showContent;
                        formatter = this.query(series[i], 'tooltip.formatter') 
                                    || formatter;
                        position = this.query(series[i], 'tooltip.position') 
                                   || position;
                        
                        specialCssText += this._style(this.query(series[i], 'tooltip'));
                        if (series[i].stack != null && axisLayout == 'xAxis') {
                            seriesArray.unshift(series[i]);
                            seriesIndex.unshift(i);
                        }
                        else {
                            seriesArray.push(series[i]);
                            seriesIndex.push(i);
                        }
                    }
                }
                
                // Ñ°ÕÒ¸ßÁÁÔªËØ
                this.messageCenter.dispatch(
                    ecConfig.EVENT.TOOLTIP_HOVER,
                    this._event,
                    {
                        seriesIndex: seriesIndex,
                        dataIndex: dataIndex
                    },
                    this.myChart
                );
                
                var rect;
                if (axisLayout == 'xAxis') {
                    x = this.subPixelOptimize(
                        categoryAxis.getCoordByIndex(dataIndex),
                        this._axisLineWidth
                    );
                    y = zrEvent.getY(this._event);
                    rect = [
                        x, this.component.grid.getY(), 
                        x, this.component.grid.getYend()
                    ];
                }
                else {
                    x = zrEvent.getX(this._event);
                    y = this.subPixelOptimize(
                        categoryAxis.getCoordByIndex(dataIndex),
                        this._axisLineWidth
                    );
                    rect = [
                        this.component.grid.getX(), y, 
                        this.component.grid.getXend(), y
                    ];
                }
                this._styleAxisPointer(
                    seriesArray,
                    rect[0], rect[1], rect[2], rect[3],
                    categoryAxis.getGap(), x, y
                );
            }
            else {
                // Ë«ÊýÖµÖá
                x = zrEvent.getX(this._event);
                y = zrEvent.getY(this._event);
                this._styleAxisPointer(
                    series,
                    this.component.grid.getX(), y, 
                    this.component.grid.getXend(), y,
                    0, x, y
                );
                if (dataIndex >= 0) {
                    this._showItemTrigger(true);
                }
                else {
                    clearTimeout(this._hidingTicket);
                    clearTimeout(this._showingTicket);
                    this._tDom.style.display = 'none';
                }
            }

            if (seriesArray.length > 0) {
                // ¸´Î»item triggerºÍaxis trigger¼ä¶Ì¾àÀëÀ´»Ø±ä»»Ê±µÄ²»ÏìÓ¦
                this._lastItemTriggerId = -1;
                // ÏàÍ¬dataIndex seriesIndexÊ±²»ÔÙ´¥·¢ÄÚÈÝ¸üÐÂ
                if (this._lastDataIndex != dataIndex || this._lastSeriesIndex != seriesIndex[0]) {
                    this._lastDataIndex = dataIndex;
                    this._lastSeriesIndex = seriesIndex[0];
                    var data;
                    var value;
                    if (typeof formatter === 'function') {
                        var params = [];
                        for (var i = 0, l = seriesArray.length; i < l; i++) {
                            data = seriesArray[i].data[dataIndex];
                            value = this.getDataFromOption(data, '-');
                            
                            params.push({
                                seriesIndex: seriesIndex[i],
                                seriesName: seriesArray[i].name || '',
                                series: seriesArray[i],
                                dataIndex: dataIndex,
                                data: data,
                                name: categoryAxis.getNameByIndex(dataIndex),
                                value: value,
                                // ÏòÏÂ¼æÈÝ
                                0: seriesArray[i].name || '',
                                1: categoryAxis.getNameByIndex(dataIndex),
                                2: value,
                                3: data
                            });
                        }
                        this._curTicket = 'axis:' + dataIndex;
                        this._tDom.innerHTML = formatter.call(
                            this.myChart, params, this._curTicket, this._setContent
                        );
                    }
                    else if (typeof formatter === 'string') {
                        this._curTicket = NaN;
                        formatter = formatter.replace('{a}','{a0}')
                                             .replace('{b}','{b0}')
                                             .replace('{c}','{c0}');
                        for (var i = 0, l = seriesArray.length; i < l; i++) {
                            formatter = formatter.replace(
                                '{a' + i + '}',
                                this._encodeHTML(seriesArray[i].name || '')
                            );
                            formatter = formatter.replace(
                                '{b' + i + '}',
                                this._encodeHTML(categoryAxis.getNameByIndex(dataIndex))
                            );
                            data = seriesArray[i].data[dataIndex];
                            data = this.getDataFromOption(data, '-');
                            formatter = formatter.replace(
                                '{c' + i + '}',
                                data instanceof Array 
                                ? data : this.numAddCommas(data)
                            );
                        }
                        this._tDom.innerHTML = formatter;
                    }
                    else {
                        this._curTicket = NaN;
                        formatter = this._encodeHTML(
                            categoryAxis.getNameByIndex(dataIndex)
                        );
    
                        for (var i = 0, l = seriesArray.length; i < l; i++) {
                            formatter += '<br/>' 
                                         + this._encodeHTML(seriesArray[i].name || '')
                                         + ' : ';
                            data = seriesArray[i].data[dataIndex];
                            data = this.getDataFromOption(data, '-');
                            formatter += data instanceof Array 
                                         ? data : this.numAddCommas(data);
                        }
                        this._tDom.innerHTML = formatter;
                    }
                }

                // don't modify, just false, showContent == undefined == true
                if (showContent === false || !this.option.tooltip.showContent) {
                    // Ö»ÓÃtooltipµÄÐÐÎª£¬²»ÏÔÊ¾Ö÷Ìå
                    return;
                }
                
                if (!this.hasAppend) {
                    this._tDom.style.left = this._zrWidth / 2 + 'px';
                    this._tDom.style.top = this._zrHeight / 2 + 'px';
                    this.dom.firstChild.appendChild(this._tDom);
                    this.hasAppend = true;
                }
                this._show(position, x + 10, y + 10, specialCssText);
            }
        },
        
        /**
         * ¼«×ø±ê 
         */
        _showPolarTrigger: function (polarIndex, dataIndex) {
            if (this.component.polar == null
                || polarIndex == null
                || dataIndex == null
                || dataIndex < 0
            ) {
                return false;
            }
            var series = this.option.series;
            var seriesArray = [];
            var seriesIndex = [];

            var formatter;
            var position;
            var showContent;
            var specialCssText = '';
            if (this.option.tooltip.trigger === 'axis') {
                if (!this.option.tooltip.show) {
                    return false;
                }
                formatter = this.option.tooltip.formatter;
                position = this.option.tooltip.position;
            }
            var indicatorName = this.option.polar[polarIndex].indicator[dataIndex].text;

            // ÕÒµ½ËùÓÐÓÃÕâ¸ö¼«×ø±ê²¢ÇÒaxis´¥·¢µÄÏµÁÐÊý¾Ý
            for (var i = 0, l = series.length; i < l; i++) {
                if (!this._isSelected(series[i].name)) {
                    continue;
                }
                if (series[i].polarIndex === polarIndex
                    && this.deepQuery([series[i], this.option], 'tooltip.trigger') === 'axis'
                ) {
                    showContent = this.query(series[i], 'tooltip.showContent') 
                                  || showContent;
                    formatter = this.query(series[i], 'tooltip.formatter') 
                                || formatter;
                    position = this.query(series[i], 'tooltip.position') 
                               || position;
                    specialCssText += this._style(this.query(series[i], 'tooltip'));
                    seriesArray.push(series[i]);
                    seriesIndex.push(i);
                }
            }
            if (seriesArray.length > 0) {
                var polarData;
                var data;
                var value;
                var params = [];

                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    polarData = seriesArray[i].data;
                    for (var j = 0, k = polarData.length; j < k; j++) {
                        data = polarData[j];
                        if (!this._isSelected(data.name)) {
                            continue;
                        }
                        data = data != null
                               ? data
                               : {name:'', value: {dataIndex:'-'}};
                        value = this.getDataFromOption(data.value[dataIndex]);
                        params.push({
                            seriesIndex: seriesIndex[i],
                            seriesName: seriesArray[i].name || '',
                            series: seriesArray[i],
                            dataIndex: dataIndex,
                            data: data,
                            name: data.name,
                            indicator: indicatorName,
                            value: value,
                            // ÏòÏÂ¼æÈÝ
                            0: seriesArray[i].name || '',
                            1: data.name,
                            2: value,
                            3: indicatorName
                        });
                    }
                }
                if (params.length <= 0) {
                    return;
                }
                // ¸´Î»item triggerºÍaxis trigger¼ä¶Ì¾àÀëÀ´»Ø±ä»»Ê±µÄ²»ÏìÓ¦
                this._lastItemTriggerId = -1;

                // ÏàÍ¬dataIndex seriesIndexÊ±²»ÔÙ´¥·¢ÄÚÈÝ¸üÐÂ
                if (this._lastDataIndex != dataIndex || this._lastSeriesIndex != seriesIndex[0]) {
                    this._lastDataIndex = dataIndex;
                    this._lastSeriesIndex = seriesIndex[0];
                    if (typeof formatter === 'function') {
                        this._curTicket = 'axis:' + dataIndex;
                        this._tDom.innerHTML = formatter.call(
                            this.myChart, params, this._curTicket, this._setContent
                        );
                    }
                    else if (typeof formatter === 'string') {
                        formatter = formatter.replace('{a}','{a0}')
                                             .replace('{b}','{b0}')
                                             .replace('{c}','{c0}')
                                             .replace('{d}','{d0}');
                        for (var i = 0, l = params.length; i < l; i++) {
                            formatter = formatter.replace(
                                '{a' + i + '}',
                                this._encodeHTML(params[i].seriesName)
                            );
                            formatter = formatter.replace(
                                '{b' + i + '}',
                                this._encodeHTML(params[i].name)
                            );
                            formatter = formatter.replace(
                                '{c' + i + '}',
                                this.numAddCommas(params[i].value)
                            );
                            formatter = formatter.replace(
                                '{d' + i + '}',
                                this._encodeHTML(params[i].indicator)
                            );
                        }
                        this._tDom.innerHTML = formatter;
                    }
                    else {
                        formatter = this._encodeHTML(params[0].name) + '<br/>' 
                                    + this._encodeHTML(params[0].indicator) + ' : ' 
                                    + this.numAddCommas(params[0].value);
                        for (var i = 1, l = params.length; i < l; i++) {
                            formatter += '<br/>' + this._encodeHTML(params[i].name) 
                                         + '<br/>';
                            formatter += this._encodeHTML(params[i].indicator) + ' : ' 
                                         + this.numAddCommas(params[i].value);
                        }
                        this._tDom.innerHTML = formatter;
                    }
                }

                // don't modify, just false, showContent == undefined == true
                if (showContent === false || !this.option.tooltip.showContent) {
                    // Ö»ÓÃtooltipµÄÐÐÎª£¬²»ÏÔÊ¾Ö÷Ìå
                    return;
                }
                
                if (!this.hasAppend) {
                    this._tDom.style.left = this._zrWidth / 2 + 'px';
                    this._tDom.style.top = this._zrHeight / 2 + 'px';
                    this.dom.firstChild.appendChild(this._tDom);
                    this.hasAppend = true;
                }
                this._show(
                    position,
                    zrEvent.getX(this._event), 
                    zrEvent.getY(this._event), 
                    specialCssText
                );
                return true;
            }
        },
        
        /**
         * @parma {boolean} axisTrigger 
         */
        _showItemTrigger: function (axisTrigger) {
            if (!this._curTarget) {
                return;
            }
            var serie = ecData.get(this._curTarget, 'series');
            var seriesIndex = ecData.get(this._curTarget, 'seriesIndex');
            var data = ecData.get(this._curTarget, 'data');
            var dataIndex = ecData.get(this._curTarget, 'dataIndex');
            var name = ecData.get(this._curTarget, 'name');
            var value = ecData.get(this._curTarget, 'value');
            var special = ecData.get(this._curTarget, 'special');
            var special2 = ecData.get(this._curTarget, 'special2');
            var queryTarget = [data, serie, this.option];
            // ´ÓµÍÓÅÏÈ¼¶ÍùÉÏÕÒµ½triggerÎªitemµÄformatterºÍÑùÊ½
            var formatter;
            var position;
            var showContent;
            var specialCssText = '';
            if (this._curTarget._type != 'island') {
                // È«¾Ö
                var trigger = axisTrigger ? 'axis' : 'item';
                if (this.option.tooltip.trigger === trigger) {
                    formatter = this.option.tooltip.formatter;
                    position = this.option.tooltip.position;
                }
                // ÏµÁÐ
                if (this.query(serie, 'tooltip.trigger') === trigger) {
                    showContent = this.query(serie, 'tooltip.showContent') || showContent;
                    formatter = this.query(serie, 'tooltip.formatter') || formatter;
                    position = this.query(serie, 'tooltip.position') || position;
                    specialCssText += this._style(this.query(serie, 'tooltip'));
                }
                // Êý¾ÝÏî
                showContent = this.query(data, 'tooltip.showContent') || showContent;
                formatter = this.query(data, 'tooltip.formatter') || formatter;
                position = this.query(data, 'tooltip.position') || position;
                specialCssText += this._style(this.query(data, 'tooltip'));
            }
            else {
                this._lastItemTriggerId = NaN;
                showContent = this.deepQuery(queryTarget, 'tooltip.showContent');
                formatter = this.deepQuery(queryTarget, 'tooltip.islandFormatter');
                position = this.deepQuery(queryTarget, 'tooltip.islandPosition');
            }

            // ¸´Î»item triggerºÍaxis trigger¼ä¶Ì¾àÀëÀ´»Ø±ä»»Ê±µÄ²»ÏìÓ¦
            this._lastDataIndex = -1;
            this._lastSeriesIndex = -1;

            // ÏàÍ¬dataIndex seriesIndexÊ±²»ÔÙ´¥·¢ÄÚÈÝ¸üÐÂ
            if (this._lastItemTriggerId !== this._curTarget.id) {
                this._lastItemTriggerId = this._curTarget.id;
                if (typeof formatter === 'function') {
                    this._curTicket = (serie.name || '') + ':' + dataIndex;
                    this._tDom.innerHTML = formatter.call(
                        this.myChart,
                        {
                            seriesIndex: seriesIndex,
                            seriesName: serie.name || '',
                            series: serie,
                            dataIndex: dataIndex,
                            data: data,
                            name: name,
                            value: value,
                            percent: special,   // ±ýÍ¼
                            indicator: special, // À×´ïÍ¼
                            value2: special2,
                            indicator2: special2,
                            // ÏòÏÂ¼æÈÝ
                            0: serie.name || '',
                            1: name,
                            2: value,
                            3: special,
                            4: special2,
                            5: data,
                            6: seriesIndex,
                            7: dataIndex
                        },
                        this._curTicket,
                        this._setContent
                    );
                }
                else if (typeof formatter === 'string') {
                    this._curTicket = NaN;
                    formatter = formatter.replace('{a}', '{a0}')
                                         .replace('{b}', '{b0}')
                                         .replace('{c}', '{c0}');
                    formatter = formatter.replace('{a0}', this._encodeHTML(serie.name || ''))
                                         .replace('{b0}', this._encodeHTML(name))
                                         .replace(
                                             '{c0}',
                                             value instanceof Array ? value : this.numAddCommas(value)
                                         );
    
                    formatter = formatter.replace('{d}', '{d0}')
                                         .replace('{d0}', special || '');
                    formatter = formatter.replace('{e}', '{e0}')
                                         .replace(
                                             '{e0}',
                                             ecData.get(this._curTarget, 'special2') || ''
                                         );
    
                    this._tDom.innerHTML = formatter;
                }
                else {
                    this._curTicket = NaN;
                    if (serie.type === ecConfig.CHART_TYPE_RADAR && special) {
                        this._tDom.innerHTML = this._itemFormatter.radar.call(
                            this, serie, name, value, special
                        );
                    }
                    // chord ´¦ÀíÔÝÊ±¸ú force Ò»Ñù
                    // else if (serie.type === ecConfig.CHART_TYPE_CHORD) {
                    //     this._tDom.innerHTML = this._itemFormatter.chord.call(
                    //         this, serie, name, value, special, special2
                    //     );
                    // }
                    else if (serie.type === ecConfig.CHART_TYPE_EVENTRIVER) {
                        this._tDom.innerHTML = this._itemFormatter.eventRiver.call(
                            this, serie, name, value, data
                        );
                    }
                    else {
                        this._tDom.innerHTML = ''
                            + (serie.name != null ? (this._encodeHTML(serie.name) + '<br/>') : '')
                            + (name === '' ? '' : (this._encodeHTML(name) + ' : '))
                            + (value instanceof Array ? value : this.numAddCommas(value));
                    }
                }
            }

            var x = zrEvent.getX(this._event);
            var y = zrEvent.getY(this._event);
            if (this.deepQuery(queryTarget, 'tooltip.axisPointer.show') 
                && this.component.grid
            ) {
                this._styleAxisPointer(
                    [serie],
                    this.component.grid.getX(), y, 
                    this.component.grid.getXend(), y,
                    0, x, y
                );
            }
            else {
                this._hide();
            }
            
            // don't modify, just false, showContent == undefined == true
            if (showContent === false || !this.option.tooltip.showContent) {
                // Ö»ÓÃtooltipµÄÐÐÎª£¬²»ÏÔÊ¾Ö÷Ìå
                return;
            }
            
            if (!this.hasAppend) {
                this._tDom.style.left = this._zrWidth / 2 + 'px';
                this._tDom.style.top = this._zrHeight / 2 + 'px';
                this.dom.firstChild.appendChild(this._tDom);
                this.hasAppend = true;
            }
            
            this._show(position, x + 20, y - 20, specialCssText);
        },

        _itemFormatter: {
            radar: function(serie, name, value, indicator){
                var html = '';
                html += this._encodeHTML(name === '' ? (serie.name || '') : name);
                html += html === '' ? '' : '<br />';
                for (var i = 0 ; i < indicator.length; i ++) {
                    html += this._encodeHTML(indicator[i].text) + ' : ' 
                            + this.numAddCommas(value[i]) + '<br />';
                }
                return html;
            },
            chord: function(serie, name, value, special, special2) {
                if (special2 == null) {
                    // Íâ»·ÉÏ
                    return this._encodeHTML(name) + ' (' + this.numAddCommas(value) + ')';
                }
                else {
                    var name1 = this._encodeHTML(name);
                    var name2 = this._encodeHTML(special);
                    // ÄÚ²¿ÏÒÉÏ
                    return ''
                        + (serie.name != null ? (this._encodeHTML(serie.name) + '<br/>') : '')
                        + name1 + ' -> ' + name2 
                        + ' (' + this.numAddCommas(value) + ')'
                        + '<br />'
                        + name2 + ' -> ' + name1
                        + ' (' + this.numAddCommas(special2) + ')';
                }
            },
            eventRiver: function(serie, name, value, data) {
                var html = '';
                html += this._encodeHTML(serie.name === '' ? '' : (serie.name + ' : ') );
                html += this._encodeHTML(name);
                html += html === '' ? '' : '<br />';
                data = data.evolution;
                for (var i = 0, l = data.length; i < l; i++) {
                    html += '<div style="padding-top:5px;">';
                    if (!data[i].detail) {
                        continue;
                    }
                    if (data[i].detail.img) {
                        html += '<img src="' + data[i].detail.img 
                                + '" style="float:left;width:40px;height:40px;">';
                    }
                    html += '<div style="margin-left:45px;">' + data[i].time + '<br/>';
                    html += '<a href="' + data[i].detail.link + '" target="_blank">';
                    html += data[i].detail.text + '</a></div>';
                    html += '</div>';
                }
                return html;
            }
        },
        
        /**
         * ÉèÖÃ×ø±êÖáÖ¸Ê¾Æ÷ÑùÊ½ 
         */
        _styleAxisPointer: function (seriesArray, xStart, yStart, xEnd, yEnd, gap, x, y) {
            if (seriesArray.length > 0) {
                var queryTarget;
                var curType;
                var axisPointer = this.option.tooltip.axisPointer;
                var pointType = axisPointer.type;
                var style = {
                    line: {},
                    cross: {},
                    shadow: {}
                };
                for (var pType in style) {
                    style[pType].color = axisPointer[pType + 'Style'].color;
                    style[pType].width = axisPointer[pType + 'Style'].width;
                    style[pType].type = axisPointer[pType + 'Style'].type;
                }
                for (var i = 0, l = seriesArray.length; i < l; i++) {
                    //if (this.deepQuery([seriesArray[i], this.option], 'tooltip.trigger') === 'axis') {
                        queryTarget = seriesArray[i];
                        curType = this.query(queryTarget, 'tooltip.axisPointer.type');
                        pointType = curType || pointType; 
                        if (curType) {
                            style[curType].color = this.query(
                                queryTarget,
                                'tooltip.axisPointer.' + curType + 'Style.color'
                            ) || style[curType].color;
                            style[curType].width = this.query(
                                queryTarget,
                                'tooltip.axisPointer.' + curType + 'Style.width'
                            ) || style[curType].width;
                            style[curType].type = this.query(
                                queryTarget,
                                'tooltip.axisPointer.' + curType + 'Style.type'
                            ) || style[curType].type;
                        }
                    //}
                }
                
                if (pointType === 'line') {
                    var lineWidth = style.line.width;
                    var isVertical = xStart == xEnd;
                    this._axisLineShape.style = {
                        xStart: isVertical ? this.subPixelOptimize(xStart, lineWidth) : xStart,
                        yStart: isVertical ? yStart : this.subPixelOptimize(yStart, lineWidth),
                        xEnd: isVertical ? this.subPixelOptimize(xEnd, lineWidth) : xEnd,
                        yEnd: isVertical ? yEnd : this.subPixelOptimize(yEnd, lineWidth),
                        strokeColor: style.line.color,
                        lineWidth: lineWidth,
                        lineType: style.line.type
                    };
                    this._axisLineShape.invisible = false;
                    this.zr.modShape(this._axisLineShape.id);
                }
                else if (pointType === 'cross') {
                    var crossWidth = style.cross.width;
                    this._axisCrossShape.style = {
                        brushType: 'stroke',
                        rect: this.component.grid.getArea(),
                        x: this.subPixelOptimize(x, crossWidth),
                        y: this.subPixelOptimize(y, crossWidth),
                        text: ('( ' 
                               + this.component.xAxis.getAxis(0).getValueFromCoord(x)
                               + ' , '
                               + this.component.yAxis.getAxis(0).getValueFromCoord(y) 
                               + ' )'
                              ).replace('  , ', ' ').replace(' ,  ', ' '),
                        textPosition: 'specific',
                        strokeColor: style.cross.color,
                        lineWidth: crossWidth,
                        lineType: style.cross.type
                    };
                    if (this.component.grid.getXend() - x > 100) {          // ÓÒ²àÓÐ¿Õ¼ä
                        this._axisCrossShape.style.textAlign = 'left';
                        this._axisCrossShape.style.textX = x + 10;
                    }
                    else {
                        this._axisCrossShape.style.textAlign = 'right';
                        this._axisCrossShape.style.textX = x - 10;
                    }
                    if (y - this.component.grid.getY() > 50) {             // ÉÏ·½ÓÐ¿Õ¼ä
                        this._axisCrossShape.style.textBaseline = 'bottom';
                        this._axisCrossShape.style.textY = y - 10;
                    }
                    else {
                        this._axisCrossShape.style.textBaseline = 'top';
                        this._axisCrossShape.style.textY = y + 10;
                    }
                    this._axisCrossShape.invisible = false;
                    this.zr.modShape(this._axisCrossShape.id);
                }
                else if (pointType === 'shadow') {
                    if (style.shadow.width == null 
                        || style.shadow.width === 'auto'
                        || isNaN(style.shadow.width)
                    ) {
                        style.shadow.width = gap;
                    }
                    if (xStart === xEnd) {
                        // ×ÝÏò
                        if (Math.abs(this.component.grid.getX() - xStart) < 2) {
                            // ×î×ó±ß
                            style.shadow.width /= 2;
                            xStart = xEnd = xEnd + style.shadow.width / 2;
                        }
                        else if (Math.abs(this.component.grid.getXend() - xStart) < 2) {
                            // ×îÓÒ±ß
                            style.shadow.width /= 2;
                            xStart = xEnd = xEnd - style.shadow.width / 2;
                        }
                    }
                    else if (yStart === yEnd) {
                        // ºáÏò
                        if (Math.abs(this.component.grid.getY() - yStart) < 2) {
                            // ×îÉÏ±ß
                            style.shadow.width /= 2;
                            yStart = yEnd = yEnd + style.shadow.width / 2;
                        }
                        else if (Math.abs(this.component.grid.getYend() - yStart) < 2) {
                            // ×îÓÒ±ß
                            style.shadow.width /= 2;
                            yStart = yEnd = yEnd - style.shadow.width / 2;
                        }
                    }
                    this._axisShadowShape.style = {
                        xStart: xStart,
                        yStart: yStart,
                        xEnd: xEnd,
                        yEnd: yEnd,
                        strokeColor: style.shadow.color,
                        lineWidth: style.shadow.width
                    };
                    this._axisShadowShape.invisible = false;
                    this.zr.modShape(this._axisShadowShape.id);
                }
                this.zr.refreshNextFrame();
            }
        },

        __onmousemove: function (param) {
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            if (this._mousein && this._enterable) {
                return;
            }
            var target = param.target;
            var mx = zrEvent.getX(param.event);
            var my = zrEvent.getY(param.event);
            if (!target) {
                // ÅÐ¶ÏÊÇ·ñÂäµ½Ö±½ÇÏµÀï£¬axis´¥·¢µÄtooltip
                this._curTarget = false;
                this._event = param.event;
                // this._event._target = this._event.target || this._event.toElement;
                this._event.zrenderX = mx;
                this._event.zrenderY = my;
                if (this._needAxisTrigger 
                    && this.component.grid 
                    && zrArea.isInside(rectangleInstance, this.component.grid.getArea(), mx, my)
                ) {
                    this._showingTicket = setTimeout(this._tryShow, this._showDelay);
                }
                else if (this._needAxisTrigger 
                        && this.component.polar 
                        && this.component.polar.isInside([mx, my]) != -1
                ) {
                    this._showingTicket = setTimeout(this._tryShow, this._showDelay);
                }
                else {
                    !this._event.connectTrigger && this.messageCenter.dispatch(
                        ecConfig.EVENT.TOOLTIP_OUT_GRID,
                        this._event,
                        null,
                        this.myChart
                    );
                    this._hidingTicket = setTimeout(this._hide, this._hideDelay);
                }
            }
            else {
                this._curTarget = target;
                this._event = param.event;
                // this._event._target = this._event.target || this._event.toElement;
                this._event.zrenderX = mx;
                this._event.zrenderY = my;
                var polarIndex;
                if (this._needAxisTrigger 
                    && this.component.polar 
                    && (polarIndex = this.component.polar.isInside([mx, my])) != -1
                ) {
                    // ¿´ÓÃÕâ¸öpolarµÄÏµÁÐÊý¾ÝÊÇ·ñÊÇaxis´¥·¢£¬Èç¹ûÊÇÉèÖÃ_curTargetÎªnul
                    var series = this.option.series;
                    for (var i = 0, l = series.length; i < l; i++) {
                        if (series[i].polarIndex === polarIndex
                            && this.deepQuery(
                                   [series[i], this.option], 'tooltip.trigger'
                               ) === 'axis'
                        ) {
                            this._curTarget = null;
                            break;
                        }
                    }
                   
                }
                this._showingTicket = setTimeout(this._tryShow, this._showDelay);
            }
        },

        /**
         * zrenderÊÂ¼þÏìÓ¦£ºÊó±êÀë¿ª»æÍ¼ÇøÓò
         */
        __onglobalout: function () {
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            this._hidingTicket = setTimeout(this._hide, this._hideDelay);
        },
        
        /**
         * Òì²½»Øµ÷Ìî³äÄÚÈÝ
         */
        __setContent: function (ticket, content) {
            if (!this._tDom) {
                return;
            }
            if (ticket === this._curTicket) {
                this._tDom.innerHTML = content;
            }
            
            setTimeout(this._refixed, 20);
        },

        ontooltipHover: function (param, tipShape) {
            if (!this._lastTipShape // ²»´æÔÚ»òÕß´æÔÚµ«dataIndex·¢Éú±ä»¯²ÅÐèÒªÖØ»æ
                || (this._lastTipShape && this._lastTipShape.dataIndex != param.dataIndex)
            ) {
                if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                    this.zr.delShape(this._lastTipShape.tipShape);
                    this.shapeList.length = 2;
                }
                for (var i = 0, l = tipShape.length; i < l; i++) {
                    tipShape[i].zlevel = this.getZlevelBase();
                    tipShape[i].z = this.getZBase();
                    
                    tipShape[i].style = zrShapeBase.prototype.getHighlightStyle(
                        tipShape[i].style,
                        tipShape[i].highlightStyle
                    );
                    tipShape[i].draggable = false;
                    tipShape[i].hoverable = false;
                    tipShape[i].clickable = false;
                    tipShape[i].ondragend = null;
                    tipShape[i].ondragover = null;
                    tipShape[i].ondrop = null;
                    this.shapeList.push(tipShape[i]);
                    this.zr.addShape(tipShape[i]);
                }
                this._lastTipShape = {
                    dataIndex: param.dataIndex,
                    tipShape: tipShape
                };
            }
        },
        
        ondragend: function () {
            this._hide();
        },
        
        /**
         * Í¼ÀýÑ¡Ôñ
         */
        onlegendSelected: function (param) {
            this._selectedMap = param.selected;
        },
        
        _setSelectedMap: function () {
            if (this.component.legend) {
                this._selectedMap = zrUtil.clone(this.component.legend.getSelectedMap());
            }
            else {
                this._selectedMap = {};
            }
        },
        
        _isSelected: function (itemName) {
            if (this._selectedMap[itemName] != null) {
                return this._selectedMap[itemName];
            }
            else {
                return true; // Ã»ÔÚlegendÀï¶¨ÒåµÄ¶¼Îªtrue°¡~
            }
        },

        /**
         * Ä£Äâtooltip hover·½·¨
         * {object} params  ²ÎÊý
         *          {seriesIndex: 0, seriesName:'', dataInex:0} line¡¢bar¡¢scatter¡¢k¡¢radar
         *          {seriesIndex: 0, seriesName:'', name:''} map¡¢pie¡¢chord
         */
        showTip: function (params) {
            if (!params) {
                return;
            }
            
            var seriesIndex;
            var series = this.option.series;
            if (params.seriesIndex != null) {
                seriesIndex = params.seriesIndex;
            }
            else {
                var seriesName = params.seriesName;
                for (var i = 0, l = series.length; i < l; i++) {
                    if (series[i].name === seriesName) {
                        seriesIndex = i;
                        break;
                    }
                }
            }
            
            var serie = series[seriesIndex];
            if (serie == null) {
                return;
            }
            var chart = this.myChart.chart[serie.type];
            var isAxisTrigger = this.deepQuery(
                                    [serie, this.option], 'tooltip.trigger'
                                ) === 'axis';
            
            if (!chart) {
                return;
            }
            
            if (isAxisTrigger) {
                // axis trigger
                var dataIndex = params.dataIndex;
                switch (chart.type) {
                    case ecConfig.CHART_TYPE_LINE :
                    case ecConfig.CHART_TYPE_BAR :
                    case ecConfig.CHART_TYPE_K :
                    case ecConfig.CHART_TYPE_RADAR :
                        if (this.component.polar == null 
                            || serie.data[0].value.length <= dataIndex
                        ) {
                            return;
                        }
                        var polarIndex = serie.polarIndex || 0;
                        var vector = this.component.polar.getVector(
                            polarIndex, dataIndex, 'max'
                        );
                        this._event = {
                            zrenderX: vector[0],
                            zrenderY: vector[1]
                        };
                        this._showPolarTrigger(
                            polarIndex, 
                            dataIndex
                        );
                        break;
                }
            }
            else {
                // item trigger
                var shapeList = chart.shapeList;
                var x;
                var y;
                switch (chart.type) {
                    case ecConfig.CHART_TYPE_LINE :
                    case ecConfig.CHART_TYPE_BAR :
                    case ecConfig.CHART_TYPE_K :
                    case ecConfig.CHART_TYPE_TREEMAP :
                    case ecConfig.CHART_TYPE_SCATTER :
                        var dataIndex = params.dataIndex;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i]._mark == null
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'dataIndex') == dataIndex
                            ) {
                                this._curTarget = shapeList[i];
                                x = shapeList[i].style.x;
                                y = chart.type != ecConfig.CHART_TYPE_K 
                                    ? shapeList[i].style.y : shapeList[i].style.y[0];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_RADAR :
                        var dataIndex = params.dataIndex;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type === 'polygon'
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'dataIndex') == dataIndex
                            ) {
                                this._curTarget = shapeList[i];
                                var vector = this.component.polar.getCenter(
                                    serie.polarIndex || 0
                                );
                                x = vector[0];
                                y = vector[1];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_PIE :
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type === 'sector'
                                && ecData.get(shapeList[i], 'seriesIndex') == seriesIndex
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                this._curTarget = shapeList[i];
                                var style = this._curTarget.style;
                                var midAngle = (style.startAngle + style.endAngle) 
                                                / 2 * Math.PI / 180;
                                x = this._curTarget.style.x + Math.cos(midAngle) * style.r / 1.5;
                                y = this._curTarget.style.y - Math.sin(midAngle) * style.r / 1.5;
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_MAP :
                        var name = params.name;
                        var mapType = serie.mapType;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type === 'text'
                                && shapeList[i]._mapType === mapType
                                && shapeList[i].style._name === name
                            ) {
                                this._curTarget = shapeList[i];
                                x = this._curTarget.style.x + this._curTarget.position[0];
                                y = this._curTarget.style.y + this._curTarget.position[1];
                                break;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_CHORD:
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type === 'sector'
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                this._curTarget = shapeList[i];
                                var style = this._curTarget.style;
                                var midAngle = (style.startAngle + style.endAngle) 
                                                / 2 * Math.PI / 180;
                                x = this._curTarget.style.x + Math.cos(midAngle) * (style.r - 2);
                                y = this._curTarget.style.y - Math.sin(midAngle) * (style.r - 2);
                                this.zr.trigger(
                                    zrConfig.EVENT.MOUSEMOVE,
                                    {
                                        zrenderX: x,
                                        zrenderY: y
                                    }
                                );
                                return;
                            }
                        }
                        break;
                    case ecConfig.CHART_TYPE_FORCE:
                        var name = params.name;
                        for (var i = 0, l = shapeList.length; i < l; i++) {
                            if (shapeList[i].type === 'circle'
                                && ecData.get(shapeList[i], 'name') == name
                            ) {
                                this._curTarget = shapeList[i];
                                x = this._curTarget.position[0];
                                y = this._curTarget.position[1];
                                break;
                            }
                        }
                        break;
                }
                if (x != null && y != null) {
                    this._event = {
                        zrenderX: x,
                        zrenderY: y
                    };
                    this.zr.addHoverShape(this._curTarget);
                    this.zr.refreshHover();
                    this._showItemTrigger();
                }
            }
        },
        
        /**
         * ¹Ø±Õ£¬¹«¿ª½Ó¿Ú 
         */
        hideTip: function () {
            this._hide();
        },
        
        /**
         * Ë¢ÐÂ
         */
        refresh: function (newOption) {
            // this._selectedMap;
            // this._defaultCssText;    // cssÑùÊ½»º´æ
            // this._needAxisTrigger;   // ×ø±êÖá´¥·¢
            // this._curTarget;
            // this._event;
            // this._curTicket;         // Òì²½»Øµ÷±êÊ¶£¬ÓÃÀ´Çø·Ö¶à¸öÇëÇó
            
            // »º´æÒ»Ð©¸ß¿íÊý¾Ý
            this._zrHeight = this.zr.getHeight();
            this._zrWidth = this.zr.getWidth();
            
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
            }
            this._lastTipShape = false;
            this.shapeList.length = 2;
            
            this._lastDataIndex = -1;
            this._lastSeriesIndex = -1;
            this._lastItemTriggerId = -1;
            
            if (newOption) {
                this.option = newOption;
                this.option.tooltip = this.reformOption(this.option.tooltip);
                
                this.option.tooltip.textStyle = zrUtil.merge(
                    this.option.tooltip.textStyle,
                    this.ecTheme.textStyle
                );
                this._needAxisTrigger = false;
                if (this.option.tooltip.trigger === 'axis') {
                    this._needAxisTrigger = true;
                }
    
                var series = this.option.series;
                for (var i = 0, l = series.length; i < l; i++) {
                    if (this.query(series[i], 'tooltip.trigger') === 'axis') {
                        this._needAxisTrigger = true;
                        break;
                    }
                }
                // this._hidingTicket;
                // this._showingTicket;
                this._showDelay = this.option.tooltip.showDelay; // ÏÔÊ¾ÑÓ³Ù
                this._hideDelay = this.option.tooltip.hideDelay; // Òþ²ØÑÓ³Ù
                this._defaultCssText = this._style(this.option.tooltip);
                
                this._setSelectedMap();
                this._axisLineWidth = this.option.tooltip.axisPointer.lineStyle.width;
                this._enterable = this.option.tooltip.enterable;

                if (! this._enterable && this._tDom.className.indexOf(zrConfig.elementClassName) < 0) {
                    this._tDom.className += ' ' + zrConfig.elementClassName;
                }
            }
            if (this.showing) {
                var self = this;
                setTimeout(function(){
                    self.zr.trigger(zrConfig.EVENT.MOUSEMOVE, self.zr.handler._event);
                },50);
            }
        },

        /**
         * ÊÍ·ÅºóÊµÀý²»¿ÉÓÃ£¬ÖØÔØ»ùÀà·½·¨
         */
        onbeforDispose: function () {
            if (this._lastTipShape && this._lastTipShape.tipShape.length > 0) {
                this.zr.delShape(this._lastTipShape.tipShape);
            }
            clearTimeout(this._hidingTicket);
            clearTimeout(this._showingTicket);
            this.zr.un(zrConfig.EVENT.MOUSEMOVE, this._onmousemove);
            this.zr.un(zrConfig.EVENT.GLOBALOUT, this._onglobalout);
            
            if (this.hasAppend && !!this.dom.firstChild) {
                this.dom.firstChild.removeChild(this._tDom);
            }
            this._tDom = null;
        },
        
        /**
         * html×ªÂëµÄ·½·¨
         */
        _encodeHTML: function (source) {
            return String(source)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
        }
    };
    
    zrUtil.inherits(Tooltip, Base);
    
    require('../component').define('tooltip', Tooltip);

    return Tooltip;
});
define('echarts/component/timeline', ['require', './base', 'zrender/shape/Rectangle', '../util/shape/Icon', '../util/shape/Chain', '../config', 'zrender/tool/util', 'zrender/tool/area', 'zrender/tool/event', '../component'], function (require) {
    var Base = require('./base');
    
    // Í¼ÐÎÒÀÀµ
    var RectangleShape = require('zrender/shape/Rectangle');
    var IconShape = require('../util/shape/Icon');
    var ChainShape = require('../util/shape/Chain');
    
    var ecConfig = require('../config');
    ecConfig.timeline = {
        zlevel: 0,                  // Ò»¼¶²ãµþ
        z: 4,                       // ¶þ¼¶²ãµþ
        show: true,
        type: 'time',  // Ä£Ê½ÊÇÊ±¼äÀàÐÍ£¬Ö§³Ö number
        notMerge: false,
        realtime: true,
        x: 80,
        // y: {number},
        x2: 80,
        y2: 0,
        // width: {totalWidth} - x - x2,
        height: 50,
        backgroundColor: 'rgba(0,0,0,0)',   // Ê±¼äÖá±³¾°ÑÕÉ«
        borderColor: '#ccc',               // Ê±¼äÖá±ß¿òÑÕÉ«
        borderWidth: 0,                    // Ê±¼äÖá±ß¿òÏß¿í£¬µ¥Î»px£¬Ä¬ÈÏÎª0£¨ÎÞ±ß¿ò£©
        padding: 5,                        // Ê±¼äÖáÄÚ±ß¾à£¬µ¥Î»px£¬Ä¬ÈÏ¸÷·½ÏòÄÚ±ß¾àÎª5£¬
        controlPosition: 'left',           // 'right' | 'none'
        autoPlay: false,
        loop: true,
        playInterval: 2000,                // ²¥·ÅÊ±¼ä¼ä¸ô£¬µ¥Î»ms
        lineStyle: {
            width: 1,
            color: '#666',
            type: 'dashed'
        },
        label: {                            // ÎÄ±¾±êÇ©
            show: true,
            interval: 'auto',
            rotate: 0,
            // formatter: null,
            textStyle: {                    // ÆäÓàÊôÐÔÄ¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                color: '#333'
            }
        },
        checkpointStyle: {
            symbol: 'auto',
            symbolSize: 'auto',
            color: 'auto',
            borderColor: 'auto',
            borderWidth: 'auto',
            label: {                            // ÎÄ±¾±êÇ©
                show: false,
                textStyle: {                    // ÆäÓàÊôÐÔÄ¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                    color: 'auto'
                }
            }
        },
        controlStyle: {
            itemSize: 15,
            itemGap: 5,
            normal: { color: '#333'},
            emphasis: { color: '#1e90ff'}
        },
        symbol: 'emptyDiamond',
        symbolSize: 4,
        currentIndex: 0
        // data: []
    };

    var zrUtil = require('zrender/tool/util');
    var zrArea = require('zrender/tool/area');
    var zrEvent = require('zrender/tool/event');

    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} option Í¼±í²ÎÊý
     */
    function Timeline(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);

        var self = this;
        self._onclick = function(param) {
            return self.__onclick(param);
        };
        self._ondrift = function (dx, dy) {
            return self.__ondrift(this, dx, dy);
        };
        self._ondragend = function () {
            return self.__ondragend();
        };
        self._setCurrentOption = function() {
            var timelineOption = self.timelineOption;
            self.currentIndex %= timelineOption.data.length;
            // console.log(self.currentIndex);
            var curOption = self.options[self.currentIndex] || {};
            self.myChart._setOption(curOption, timelineOption.notMerge, true);
            
            self.messageCenter.dispatch(
                ecConfig.EVENT.TIMELINE_CHANGED,
                null,
                {
                    currentIndex: self.currentIndex,
                    data: timelineOption.data[self.currentIndex].name != null
                          ? timelineOption.data[self.currentIndex].name
                          : timelineOption.data[self.currentIndex]
                },
                self.myChart
            );
        };
        self._onFrame = function() {
            self._setCurrentOption();
            self._syncHandleShape();
            
            if (self.timelineOption.autoPlay) {
                self.playTicket = setTimeout(
                    function() {
                        self.currentIndex += 1;
                        if (!self.timelineOption.loop
                            && self.currentIndex >= self.timelineOption.data.length
                        ) {
                            self.currentIndex = self.timelineOption.data.length - 1;
                            self.stop();
                            return;
                        }
                        self._onFrame();
                    },
                    self.timelineOption.playInterval
                );
            }
        };

        this.setTheme(false);
        this.options = this.option.options;
        this.currentIndex = this.timelineOption.currentIndex % this.timelineOption.data.length;
        
        if (!this.timelineOption.notMerge && this.currentIndex !== 0) {
            /*
            for (var i = 1, l = this.timelineOption.data.length; i < l; i++) {
                this.options[i] = zrUtil.merge(
                    this.options[i], this.options[i - 1]
                );
            }
            */
           this.options[this.currentIndex] = zrUtil.merge(
               this.options[this.currentIndex], this.options[0]
           );
        }
        
        if (this.timelineOption.show) {
            this._buildShape();
            this._syncHandleShape();
        }
        
        this._setCurrentOption();
        
        if (this.timelineOption.autoPlay) {
            var self = this;
            this.playTicket = setTimeout(
                function() {
                    self.play();
                },
                this.ecTheme.animationDuration != null
                ? this.ecTheme.animationDuration
                : ecConfig.animationDuration
            );
        }
    }
    
    Timeline.prototype = {
        type: ecConfig.COMPONENT_TYPE_TIMELINE,
        _buildShape: function () {
            // Î»ÖÃ²ÎÊý£¬Í¨¹ý¼ÆËãËùµÃx, y, width, height
            this._location = this._getLocation();
            this._buildBackground();
            this._buildControl();
            this._chainPoint = this._getChainPoint();
            if (this.timelineOption.label.show) {
                // ±êÇ©ÏÔÊ¾µÄÌôÑ¡¼ä¸ô
                var interval = this._getInterval();
                for (var i = 0, len = this._chainPoint.length; i < len; i += interval) {
                    this._chainPoint[i].showLabel = true;
                }
            }
            this._buildChain();
            this._buildHandle();

            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.addShape(this.shapeList[i]);
            }
        },

        /**
         * ¸ù¾ÝÑ¡Ïî¼ÆËãÊµÌåµÄÎ»ÖÃ×ø±ê
         */
        _getLocation: function () {
            var timelineOption = this.timelineOption;
            var padding = this.reformCssArray(this.timelineOption.padding);
            
            // Ë®Æ½²¼¾Ö
            var zrWidth = this.zr.getWidth();
            var x = this.parsePercent(timelineOption.x, zrWidth);
            var x2 = this.parsePercent(timelineOption.x2, zrWidth);
            var width;
            if (timelineOption.width == null) {
                width = zrWidth - x - x2;
                x2 = zrWidth - x2;
            }
            else {
                width = this.parsePercent(timelineOption.width, zrWidth);
                x2 = x + width;
            }

            var zrHeight = this.zr.getHeight();
            var height = this.parsePercent(timelineOption.height, zrHeight);
            var y;
            var y2;
            if (timelineOption.y != null) {
                y = this.parsePercent(timelineOption.y, zrHeight);
                y2 = y + height;
            }
            else {
                y2 = zrHeight - this.parsePercent(timelineOption.y2, zrHeight);
                y = y2 - height;
            }

            return {
                x: x + padding[3],
                y: y + padding[0],
                x2: x2 - padding[1],
                y2: y2 - padding[2],
                width: width - padding[1] - padding[3],
                height: height - padding[0] - padding[2]
            };
        },

        _getReformedLabel: function (idx) {
            var timelineOption = this.timelineOption;
            var data = timelineOption.data[idx].name != null
                       ? timelineOption.data[idx].name
                       : timelineOption.data[idx];
            var formatter = timelineOption.data[idx].formatter 
                            || timelineOption.label.formatter;
            if (formatter) {
                if (typeof formatter === 'function') {
                    data = formatter.call(this.myChart, data);
                }
                else if (typeof formatter === 'string') {
                    data = formatter.replace('{value}', data);
                }
            }
            return data;
        },
        
        /**
         * ¼ÆËã±êÇ©ÏÔÊ¾ÌôÑ¡¼ä¸ô
         */
        _getInterval: function () {
            var chainPoint = this._chainPoint;
            var timelineOption = this.timelineOption;
            var interval   = timelineOption.label.interval;
            if (interval === 'auto') {
                // Âé·³µÄ×ÔÊÊÓ¦¼ÆËã
                var fontSize = timelineOption.label.textStyle.fontSize;
                var data = timelineOption.data;
                var dataLength = timelineOption.data.length;

                // ºáÏò
                if (dataLength > 3) {
                    var isEnough = false;
                    var labelSpace;
                    var labelSize;
                    interval = 0;
                    while (!isEnough && interval < dataLength) {
                        interval++;
                        isEnough = true;
                        for (var i = interval; i < dataLength; i += interval) {
                            labelSpace = chainPoint[i].x - chainPoint[i - interval].x;
                            if (timelineOption.label.rotate !== 0) {
                                // ÓÐÐý×ª
                                labelSize = fontSize;
                            }
                            else if (data[i].textStyle) {
                                labelSize = zrArea.getTextWidth(
                                    chainPoint[i].name,
                                    chainPoint[i].textFont
                                );
                            }
                            else {
                                // ²»¶¨Òådata¼¶ÌØÊâÎÄ±¾ÑùÊ½£¬ÓÃfontSizeÓÅ»¯getTextWidth
                                var label = chainPoint[i].name + '';
                                var wLen = (label.match(/\w/g) || '').length;
                                var oLen = label.length - wLen;
                                labelSize = wLen * fontSize * 2 / 3 + oLen * fontSize;
                            }

                            if (labelSpace < labelSize) {
                                // ·Å²»ÏÂ£¬ÖÐ¶ÏÑ­»·ÈÃinterval++
                                isEnough = false;
                                break;
                            }
                        }
                    }
                }
                else {
                    // ÉÙÓÚ3¸öÔòÈ«²¿ÏÔÊ¾
                    interval = 1;
                }
            }
            else {
                // ÓÃ»§×Ô¶¨Òå¼ä¸ô
                interval = interval - 0 + 1;
            }

            return interval;
        },
        
        /**
         * ¸ù¾ÝÑ¡Ïî¼ÆËãÊ±¼äÁ´ÌõÉÏµÄ×ø±ê¼°symbolList
         */
        _getChainPoint: function() {
            var timelineOption = this.timelineOption;
            var symbol = timelineOption.symbol.toLowerCase();
            var symbolSize = timelineOption.symbolSize;
            var rotate = timelineOption.label.rotate;
            var textStyle = timelineOption.label.textStyle;
            var textFont = this.getFont(textStyle);
            var dataTextStyle;
            var data = timelineOption.data;
            var x = this._location.x;
            var y = this._location.y + this._location.height / 4 * 3;
            var width = this._location.x2 - this._location.x;
            var len = data.length;
            
            function _getName(i) {
                return (data[i].name != null ? data[i].name : data[i] + '');
            }
            var xList = [];
            if (len > 1) {
                var boundaryGap = width / len;
                boundaryGap = boundaryGap > 50 ? 50 : (boundaryGap < 20 ? 5 : boundaryGap);
                width -= boundaryGap * 2;
                if (timelineOption.type === 'number') {
                    // Æ½¾ù·Ö²¼
                    for (var i = 0; i < len; i++) {
                        xList.push(x + boundaryGap + width / (len - 1) * i);
                    }
                }
                else {
                    // Ê±¼ä±ÈÀý
                    xList[0] = new Date(_getName(0).replace(/-/g, '/'));
                    xList[len - 1] = new Date(_getName(len - 1).replace(/-/g, '/')) - xList[0];
                    for (var i = 1; i < len; i++) {
                        xList[i] =  x + boundaryGap 
                                    + width 
                                      * (new Date(_getName(i).replace(/-/g, '/')) - xList[0]) 
                                      / xList[len - 1];
                    }
                    xList[0] = x + boundaryGap;
                }
            }
            else {
                xList.push(x + width / 2);
            }
            
            var list = [];
            var curSymbol;
            var n;
            var isEmpty;
            var textAlign;
            var rotation;
            for (var i = 0; i < len; i++) {
                x = xList[i];
                curSymbol = (data[i].symbol && data[i].symbol.toLowerCase()) || symbol;
                if (curSymbol.match('empty')) {
                    curSymbol = curSymbol.replace('empty', '');
                    isEmpty = true;
                }
                else {
                    isEmpty = false;
                }
                if (curSymbol.match('star')) {
                    n = (curSymbol.replace('star','') - 0) || 5;
                    curSymbol = 'star';
                }
                
                dataTextStyle = data[i].textStyle 
                                ? zrUtil.merge(data[i].textStyle || {}, textStyle)
                                : textStyle;
                
                textAlign = dataTextStyle.align || 'center';
                
                if (rotate) {
                    textAlign = rotate > 0 ? 'right' : 'left';
                    rotation = [rotate * Math.PI / 180, x, y - 5];
                }
                else {
                    rotation = false;
                }
                
                list.push({
                    x: x,
                    n: n,
                    isEmpty: isEmpty,
                    symbol: curSymbol,
                    symbolSize: data[i].symbolSize || symbolSize,
                    color: data[i].color,
                    borderColor: data[i].borderColor,
                    borderWidth: data[i].borderWidth,
                    name: this._getReformedLabel(i),
                    textColor: dataTextStyle.color,
                    textAlign: textAlign,
                    textBaseline: dataTextStyle.baseline || 'middle',
                    textX: x,
                    textY: y - (rotate ? 5 : 0),
                    textFont: data[i].textStyle ? this.getFont(dataTextStyle) : textFont,
                    rotation: rotation,
                    showLabel: false
                });
            }
            
            return list;
        },
        
        _buildBackground: function () {
            var timelineOption = this.timelineOption;
            var padding = this.reformCssArray(this.timelineOption.padding);
            var width = this._location.width;
            var height = this._location.height;
            
            if (timelineOption.borderWidth !== 0 
                || timelineOption.backgroundColor.replace(/\s/g,'') != 'rgba(0,0,0,0)'
            ) {
                // ±³¾°
                this.shapeList.push(new RectangleShape({
                    zlevel: this.getZlevelBase(),
                    z: this.getZBase(),
                    hoverable :false,
                    style: {
                        x: this._location.x - padding[3],
                        y: this._location.y - padding[0],
                        width: width + padding[1] + padding[3],
                        height: height + padding[0] + padding[2],
                        brushType: timelineOption.borderWidth === 0 ? 'fill' : 'both',
                        color: timelineOption.backgroundColor,
                        strokeColor: timelineOption.borderColor,
                        lineWidth: timelineOption.borderWidth
                    }
                }));
            }
        },

        _buildControl: function() {
            var self = this;
            var timelineOption = this.timelineOption;
            var lineStyle = timelineOption.lineStyle;
            var controlStyle = timelineOption.controlStyle;
            if (timelineOption.controlPosition === 'none') {
                return;
            }
            var iconSize = controlStyle.itemSize;
            var iconGap = controlStyle.itemGap;
            var x;
            if (timelineOption.controlPosition === 'left') {
                x = this._location.x;
                this._location.x += (iconSize + iconGap) * 3;
            }
            else {
                x = this._location.x2 - ((iconSize + iconGap) * 3 - iconGap);
                this._location.x2 -= (iconSize + iconGap) * 3;
            }
            
            var y = this._location.y;
            var iconStyle = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                style: {
                    iconType: 'timelineControl',
                    symbol: 'last',
                    x: x,
                    y: y,
                    width: iconSize,
                    height: iconSize,
                    brushType: 'stroke',
                    color: controlStyle.normal.color,
                    strokeColor: controlStyle.normal.color,
                    lineWidth: lineStyle.width
                },
                highlightStyle: {
                    color: controlStyle.emphasis.color,
                    strokeColor: controlStyle.emphasis.color,
                    lineWidth: lineStyle.width + 1
                },
                clickable: true
            };
            
            this._ctrLastShape = new IconShape(iconStyle);
            this._ctrLastShape.onclick = function() {
                self.last();
            };
            this.shapeList.push(this._ctrLastShape);
            
            x += iconSize + iconGap;
            this._ctrPlayShape = new IconShape(zrUtil.clone(iconStyle));
            this._ctrPlayShape.style.brushType = 'fill';
            this._ctrPlayShape.style.symbol = 'play';
            this._ctrPlayShape.style.status = this.timelineOption.autoPlay ? 'playing' : 'stop';
            this._ctrPlayShape.style.x = x;
            this._ctrPlayShape.onclick = function() {
                if (self._ctrPlayShape.style.status === 'stop') {
                    self.play();
                }
                else {
                    self.stop();
                }
            };
            this.shapeList.push(this._ctrPlayShape);
            
            x += iconSize + iconGap;
            this._ctrNextShape = new IconShape(zrUtil.clone(iconStyle));
            this._ctrNextShape.style.symbol = 'next';
            this._ctrNextShape.style.x = x;
            this._ctrNextShape.onclick = function() {
                self.next();
            };
            this.shapeList.push(this._ctrNextShape);
        },
        
        /**
         * ¹¹½¨Ê±¼äÖá
         */
        _buildChain: function () {
            var timelineOption = this.timelineOption;
            var lineStyle = timelineOption.lineStyle;
            this._timelineShae = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase(),
                style: {
                    x: this._location.x,
                    y: this.subPixelOptimize(this._location.y, lineStyle.width),
                    width: this._location.x2 - this._location.x,
                    height: this._location.height,
                    chainPoint: this._chainPoint,
                    brushType:'both',
                    strokeColor: lineStyle.color,
                    lineWidth: lineStyle.width,
                    lineType: lineStyle.type
                },
                hoverable: false,
                clickable: true,
                onclick: this._onclick
            };

            this._timelineShae = new ChainShape(this._timelineShae);
            this.shapeList.push(this._timelineShae);
        },

        /**
         * ¹¹½¨ÍÏ×§ÊÖ±ú
         */
        _buildHandle: function () {
            var curPoint = this._chainPoint[this.currentIndex];
            var symbolSize = curPoint.symbolSize + 1;
            symbolSize = symbolSize < 5 ? 5 : symbolSize;
            
            this._handleShape = {
                zlevel: this.getZlevelBase(),
                z: this.getZBase() + 1,
                hoverable: false,
                draggable: true,
                style: {
                    iconType: 'diamond',
                    n: curPoint.n,
                    x: curPoint.x - symbolSize,
                    y: this._location.y + this._location.height / 4 - symbolSize,
                    width: symbolSize * 2,
                    height: symbolSize * 2,
                    brushType:'both',
                    textPosition: 'specific',
                    textX: curPoint.x,
                    textY: this._location.y - this._location.height / 4,
                    textAlign: 'center',
                    textBaseline: 'middle'
                },
                highlightStyle: {},
                ondrift: this._ondrift,
                ondragend: this._ondragend
            };
            
            this._handleShape = new IconShape(this._handleShape);
            this.shapeList.push(this._handleShape);
        },
        
        /**
         * Í¬²½ÍÏ×§Í¼ÐÎÑùÊ½ 
         */
        _syncHandleShape: function() {
            if (!this.timelineOption.show) {
                return;
            }
            
            var timelineOption = this.timelineOption;
            var cpStyle = timelineOption.checkpointStyle;
            var curPoint = this._chainPoint[this.currentIndex];

            this._handleShape.style.text = cpStyle.label.show ? curPoint.name : '';
            this._handleShape.style.textFont = curPoint.textFont;
            
            this._handleShape.style.n = curPoint.n;
            if (cpStyle.symbol === 'auto') {
                this._handleShape.style.iconType = curPoint.symbol != 'none' 
                                                   ? curPoint.symbol : 'diamond';
            }
            else {
                this._handleShape.style.iconType = cpStyle.symbol;
                if (cpStyle.symbol.match('star')) {
                    this._handleShape.style.n = (cpStyle.symbol.replace('star','') - 0) || 5;
                    this._handleShape.style.iconType = 'star';
                }
            }
            
            var symbolSize;
            if (cpStyle.symbolSize === 'auto') {
                symbolSize = curPoint.symbolSize + 2;
                symbolSize = symbolSize < 5 ? 5 : symbolSize;
            }
            else {
                symbolSize = cpStyle.symbolSize - 0;
            }
            
            this._handleShape.style.color = cpStyle.color === 'auto'
                                            ? (curPoint.color 
                                               ? curPoint.color 
                                               : timelineOption.controlStyle.emphasis.color
                                              )
                                            : cpStyle.color;
            this._handleShape.style.textColor = cpStyle.label.textStyle.color === 'auto'
                                                ? this._handleShape.style.color
                                                : cpStyle.label.textStyle.color;
            this._handleShape.highlightStyle.strokeColor = 
            this._handleShape.style.strokeColor = cpStyle.borderColor === 'auto'
                                ? (curPoint.borderColor ? curPoint.borderColor : '#fff')
                                : cpStyle.borderColor;
            this._handleShape.style.lineWidth = cpStyle.borderWidth === 'auto'
                                ? (curPoint.borderWidth ? curPoint.borderWidth : 0)
                                : (cpStyle.borderWidth - 0);
            this._handleShape.highlightStyle.lineWidth = this._handleShape.style.lineWidth + 1;
            
            this.zr.animate(this._handleShape.id, 'style')
                .when(
                    500,
                    {
                        x: curPoint.x - symbolSize,
                        textX: curPoint.x,
                        y: this._location.y + this._location.height / 4 - symbolSize,
                        width: symbolSize * 2,
                        height: symbolSize * 2
                    }
                )
                .start('ExponentialOut');
        },

        _findChainIndex: function(x) {
            var chainPoint = this._chainPoint;
            var len = chainPoint.length;
            if (x <= chainPoint[0].x) {
                return 0;
            }
            else if (x >= chainPoint[len - 1].x) {
                return len - 1;
            }
            for (var i = 0; i < len - 1; i++) {
                if (x >= chainPoint[i].x && x <= chainPoint[i + 1].x) {
                    // catch you£¡
                    return (Math.abs(x - chainPoint[i].x) < Math.abs(x - chainPoint[i + 1].x))
                           ? i : (i + 1);
                }
            }
        },
        
        __onclick: function(param) {
            var x = zrEvent.getX(param.event);
            var newIndex =  this._findChainIndex(x);
            if (newIndex === this.currentIndex) {
                return true; // É¶ÊÂ¶¼Ã»·¢Éú
            }
            
            this.currentIndex = newIndex;
            this.timelineOption.autoPlay && this.stop(); // Í£Ö¹×Ô¶¯²¥·Å
            clearTimeout(this.playTicket);
            this._onFrame();
        },
        
        /**
         * ÍÏ×§·¶Î§¿ØÖÆ
         */
        __ondrift: function (shape, dx) {
            this.timelineOption.autoPlay && this.stop(); // Í£Ö¹×Ô¶¯²¥·Å
            
            var chainPoint = this._chainPoint;
            var len = chainPoint.length;
            var newIndex;
            if (shape.style.x + dx <= chainPoint[0].x - chainPoint[0].symbolSize) {
                shape.style.x = chainPoint[0].x - chainPoint[0].symbolSize;
                newIndex = 0;
            }
            else if (shape.style.x + dx >= chainPoint[len - 1].x - chainPoint[len - 1].symbolSize) {
                shape.style.x = chainPoint[len - 1].x - chainPoint[len - 1].symbolSize;
                newIndex = len - 1;
            }
            else {
                shape.style.x += dx;
                newIndex = this._findChainIndex(shape.style.x);
            }
            var curPoint = chainPoint[newIndex];
            var symbolSize = curPoint.symbolSize + 2;
            shape.style.iconType = curPoint.symbol;
            shape.style.n = curPoint.n;
            shape.style.textX = shape.style.x + symbolSize / 2;
            shape.style.y = this._location.y + this._location.height / 4 - symbolSize;
            shape.style.width = symbolSize * 2;
            shape.style.height = symbolSize * 2;
            shape.style.text = curPoint.name;
            
            //console.log(newIndex)
            if (newIndex === this.currentIndex) {
                return true; // É¶ÊÂ¶¼Ã»·¢Éú
            }
            
            this.currentIndex = newIndex;
            if (this.timelineOption.realtime) {
                clearTimeout(this.playTicket);
                var self = this;
                this.playTicket = setTimeout(function() {
                    self._setCurrentOption();
                },200);
            }

            return true;
        },
        
        __ondragend: function () {
            this.isDragend = true;
        },
        
        /**
         * Êý¾ÝÏî±»ÍÏ×§³öÈ¥
         */
        ondragend: function (param, status) {
            if (!this.isDragend || !param.target) {
                // Ã»ÓÐÔÚµ±Ç°ÊµÀýÉÏ·¢ÉúÍÏ×§ÐÐÎªÔòÖ±½Ó·µ»Ø
                return;
            }
            !this.timelineOption.realtime && this._setCurrentOption();
            
            // ±ðstatus = {}¸³Öµ°¡£¡£¡
            status.dragOut = true;
            status.dragIn = true;
            status.needRefresh = false; // »áÓÐÏûÏ¢´¥·¢fresh£¬²»ÓÃÔÙË¢Ò»±é
            // ´¦ÀíÍêÍÏ×§ÊÂ¼þºó¸´Î»
            this.isDragend = false;
            this._syncHandleShape();
            return;
        },
        
        last: function () {
            this.timelineOption.autoPlay && this.stop(); // Í£Ö¹×Ô¶¯²¥·Å
            
            this.currentIndex -= 1;
            if (this.currentIndex < 0) {
                this.currentIndex = this.timelineOption.data.length - 1;
            }
            this._onFrame();
            
            return this.currentIndex;
        },
        
        next: function () {
            this.timelineOption.autoPlay && this.stop(); // Í£Ö¹×Ô¶¯²¥·Å
            
            this.currentIndex += 1;
            if (this.currentIndex >= this.timelineOption.data.length) {
                this.currentIndex = 0;
            }
            this._onFrame();
            
            return this.currentIndex;
        },
        
        play: function (targetIndex, autoPlay) {
            if (this._ctrPlayShape && this._ctrPlayShape.style.status != 'playing') {
                this._ctrPlayShape.style.status = 'playing';
                this.zr.modShape(this._ctrPlayShape.id);
                this.zr.refreshNextFrame();
            }
            
            
            this.timelineOption.autoPlay = autoPlay != null ? autoPlay : true;
            
            if (!this.timelineOption.autoPlay) {
                clearTimeout(this.playTicket);
            }
            
            this.currentIndex = targetIndex != null ? targetIndex : (this.currentIndex + 1);
            if (this.currentIndex >= this.timelineOption.data.length) {
                this.currentIndex = 0;
            }
            this._onFrame();
            
            return this.currentIndex;
        },
        
        stop: function () {
            if (this._ctrPlayShape && this._ctrPlayShape.style.status != 'stop') {
                this._ctrPlayShape.style.status = 'stop';
                this.zr.modShape(this._ctrPlayShape.id);
                this.zr.refreshNextFrame();
            }
            
            this.timelineOption.autoPlay = false;
            
            clearTimeout(this.playTicket);
            
            return this.currentIndex;
        },
        
        /**
         * ±ÜÃâdataZoom´øÀ´Á½´Îrefresh£¬²»Éèrefresh½Ó¿Ú£¬resizeÖØ¸´Ò»ÏÂbuildshapeÂß¼­ 
         */
        resize: function () {
            if (this.timelineOption.show) {
                this.clear();
                this._buildShape();
                this._syncHandleShape();
            }
        },
        
        setTheme: function(needRefresh) {
            this.timelineOption = this.reformOption(zrUtil.clone(this.option.timeline));
            // Í¨ÓÃ×ÖÌåÉèÖÃ
            this.timelineOption.label.textStyle = this.getTextStyle(
                this.timelineOption.label.textStyle
            );
            this.timelineOption.checkpointStyle.label.textStyle = this.getTextStyle(
                this.timelineOption.checkpointStyle.label.textStyle
            );
            if (!this.myChart.canvasSupported) {
                // ²»Ö§³ÖCanvasµÄÇ¿ÖÆ¹Ø±ÕÊµÊ±¶¯»­
                this.timelineOption.realtime = false;
            }
            
            if (this.timelineOption.show && needRefresh) {
                this.clear();
                this._buildShape();
                this._syncHandleShape();
            }
        },
        
        /**
         * ÊÍ·ÅºóÊµÀý²»¿ÉÓÃ£¬ÖØÔØ»ùÀà·½·¨
         */
        onbeforDispose: function () {
            clearTimeout(this.playTicket);
        }
    };
    
    function timelineControl(ctx, style) {
        var lineWidth = 2;//style.lineWidth;
        var x = style.x + lineWidth;
        var y = style.y + lineWidth + 2;
        var width = style.width - lineWidth;
        var height = style.height - lineWidth;
        
        
        var symbol = style.symbol;
        if (symbol === 'last') {
            ctx.moveTo(x + width - 2, y + height / 3);
            ctx.lineTo(x + width - 2, y);
            ctx.lineTo(x + 2, y + height / 2);
            ctx.lineTo(x + width - 2, y + height);
            ctx.lineTo(x + width - 2, y + height / 3 * 2);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y);
        } 
        else if (symbol === 'next') {
            ctx.moveTo(x + 2, y + height / 3);
            ctx.lineTo(x + 2, y);
            ctx.lineTo(x + width - 2, y + height / 2);
            ctx.lineTo(x + 2, y + height);
            ctx.lineTo(x + 2, y + height / 3 * 2);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y);
        }
        else if (symbol === 'play') {
            if (style.status === 'stop') {
                ctx.moveTo(x + 2, y);
                ctx.lineTo(x + width - 2, y + height / 2);
                ctx.lineTo(x + 2, y + height);
                ctx.lineTo(x + 2, y);
            }
            else {
                var delta = style.brushType === 'both' ? 2 : 3;
                ctx.rect(x + 2, y, delta, height);
                ctx.rect(x + width - delta - 2, y, delta, height);
            }
        }
        else if (symbol.match('image')) {
            var imageLocation = '';
            imageLocation = symbol.replace(
                    new RegExp('^image:\\/\\/'), ''
                );
            symbol = IconShape.prototype.iconLibrary.image;
            symbol(ctx, {
                x: x,
                y: y,
                width: width,
                height: height,
                image: imageLocation
            });
        }
    }
    IconShape.prototype.iconLibrary['timelineControl'] = timelineControl;
    
    zrUtil.inherits(Timeline, Base);
    
    require('../component').define('timeline', Timeline);
    
    return Timeline;
});
define('zrender/loadingEffect/Bubble', ['require', './Base', '../tool/util', '../tool/color', '../shape/Circle'], function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrColor = require('../tool/color');
        var CircleShape = require('../shape/Circle');

        function Bubble(options) {
            Base.call(this, options);
        }
        util.inherits(Bubble, Base);

        /**
         * ÅÝÅÝ
         *
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        Bubble.prototype._start = function (addShapeHandle, refreshHandle) {
            
            // ÌØÐ§Ä¬ÈÏÅäÖÃ
            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#888'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effect : {
                        n : 50,
                        lineWidth : 2,
                        brushType : 'stroke',
                        color : 'random',
                        timeInterval : 100
                    }
                }
            );

            var textShape = this.createTextShape(options.textStyle);
            var background = this.createBackgroundShape(options.backgroundColor);

            var effectOption = options.effect;
            var n = effectOption.n;
            var brushType = effectOption.brushType;
            var lineWidth = effectOption.lineWidth;

            var shapeList = [];
            var canvasWidth = this.canvasWidth;
            var canvasHeight = this.canvasHeight;
            
            // ³õÊ¼»¯¶¯»­ÔªËØ
            for (var i = 0; i < n; i++) {
                var color = effectOption.color == 'random'
                    ? zrColor.alpha(zrColor.random(), 0.3)
                    : effectOption.color;

                shapeList[i] = new CircleShape({
                    highlightStyle : {
                        x : Math.ceil(Math.random() * canvasWidth),
                        y : Math.ceil(Math.random() * canvasHeight),
                        r : Math.ceil(Math.random() * 40),
                        brushType : brushType,
                        color : color,
                        strokeColor : color,
                        lineWidth : lineWidth
                    },
                    animationY : Math.ceil(Math.random() * 20)
                });
            }
            
            return setInterval(
                function () {
                    addShapeHandle(background);
                    
                    for (var i = 0; i < n; i++) {
                        var style = shapeList[i].highlightStyle;

                        if (style.y - shapeList[i].animationY + style.r <= 0) {
                            shapeList[i].highlightStyle.y = canvasHeight + style.r;
                            shapeList[i].highlightStyle.x = Math.ceil(
                                Math.random() * canvasWidth
                            );
                        }
                        shapeList[i].highlightStyle.y -=
                            shapeList[i].animationY;

                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        };

        return Bubble;
    });
define('zrender/loadingEffect/DynamicLine', ['require', './Base', '../tool/util', '../tool/color', '../shape/Line'], function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrColor = require('../tool/color');
        var LineShape = require('../shape/Line');

        function DynamicLine(options) {
            Base.call(this, options);
        }
        util.inherits(DynamicLine, Base);


        /**
         * ¶¯Ì¬Ïß
         * 
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        DynamicLine.prototype._start = function (addShapeHandle, refreshHandle) {
            // ÌØÐ§Ä¬ÈÏÅäÖÃ
            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#fff'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)',
                    effectOption : {
                        n : 30,
                        lineWidth : 1,
                        color : 'random',
                        timeInterval : 100
                    }
                }
            );

            var textShape = this.createTextShape(options.textStyle);
            var background = this.createBackgroundShape(options.backgroundColor);

            var effectOption = options.effectOption;
            var n = effectOption.n;
            var lineWidth = effectOption.lineWidth;

            var shapeList = [];
            var canvasWidth = this.canvasWidth;
            var canvasHeight = this.canvasHeight;
            
            // ³õÊ¼»¯¶¯»­ÔªËØ
            for (var i = 0; i < n; i++) {
                var xStart = -Math.ceil(Math.random() * 1000);
                var len = Math.ceil(Math.random() * 400);
                var pos = Math.ceil(Math.random() * canvasHeight);

                var color = effectOption.color == 'random'
                    ? zrColor.random()
                    : effectOption.color;
                
                shapeList[i] = new LineShape({
                    highlightStyle : {
                        xStart : xStart,
                        yStart : pos,
                        xEnd : xStart + len,
                        yEnd : pos,
                        strokeColor : color,
                        lineWidth : lineWidth
                    },
                    animationX : Math.ceil(Math.random() * 100),
                    len : len
                });
            }
            
            return setInterval(
                function() {
                    addShapeHandle(background);
                    
                    for (var i = 0; i < n; i++) {
                        var style = shapeList[i].highlightStyle;

                        if (style.xStart >= canvasWidth) {
                            
                            shapeList[i].len = Math.ceil(Math.random() * 400);
                            style.xStart = -400;
                            style.xEnd = -400 + shapeList[i].len;
                            style.yStart = Math.ceil(Math.random() * canvasHeight);
                            style.yEnd = style.yStart;
                        }

                        style.xStart += shapeList[i].animationX;
                        style.xEnd += shapeList[i].animationX;

                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        };

        return DynamicLine;
    });
define('zrender/loadingEffect/Ring', ['require', './Base', '../tool/util', '../tool/color', '../shape/Ring', '../shape/Sector'], function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrColor = require('../tool/color');
        var RingShape = require('../shape/Ring');
        var SectorShape = require('../shape/Sector');

        function Ring(options) {
            Base.call(this, options);
        }
        util.inherits(Ring, Base);


        /**
         * Ô²»·
         * 
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        Ring.prototype._start = function (addShapeHandle, refreshHandle) {
            
            // ÌØÐ§Ä¬ÈÏÅäÖÃ
            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#07a'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)',
                    effect : {
                        x : this.canvasWidth / 2,
                        y : this.canvasHeight / 2,
                        r0 : 60,
                        r : 100,
                        color : '#bbdcff',
                        brushType: 'fill',
                        textPosition : 'inside',
                        textFont : 'normal 30px verdana',
                        textColor : 'rgba(30, 144, 255, 0.6)',
                        timeInterval : 100
                    }
                }
            );

            var effectOption = options.effect;

            var textStyle = options.textStyle;
            if (textStyle.x == null) {
                textStyle.x = effectOption.x;
            }
            if (textStyle.y == null) {
                textStyle.y = (effectOption.y + (effectOption.r0 + effectOption.r) / 2 - 5);
            }
            
            var textShape = this.createTextShape(options.textStyle);
            var background = this.createBackgroundShape(options.backgroundColor);

            var x = effectOption.x;
            var y = effectOption.y;
            var r0 = effectOption.r0 + 6;
            var r = effectOption.r - 6;
            var color = effectOption.color;
            var darkColor = zrColor.lift(color, 0.1);

            var shapeRing = new RingShape({
                highlightStyle : util.clone(effectOption)
            });

            // ³õÊ¼»¯¶¯»­ÔªËØ
            var shapeList = [];
            var clolrList = zrColor.getGradientColors(
                [ '#ff6400', '#ffe100', '#97ff00' ], 25
            );
            var preAngle = 15;
            var endAngle = 240;

            for (var i = 0; i < 16; i++) {
                shapeList.push(new SectorShape({
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : endAngle - preAngle,
                        endAngle : endAngle,
                        brushType: 'fill',
                        color : darkColor
                    },
                    _color : zrColor.getLinearGradient(
                        x + r0 * Math.cos(endAngle, true),
                        y - r0 * Math.sin(endAngle, true),
                        x + r0 * Math.cos(endAngle - preAngle, true),
                        y - r0 * Math.sin(endAngle - preAngle, true),
                        [
                            [ 0, clolrList[i * 2] ],
                            [ 1, clolrList[i * 2 + 1] ]
                        ]
                    )
                }));
                endAngle -= preAngle;
            }
            endAngle = 360;
            for (var i = 0; i < 4; i++) {
                shapeList.push(new SectorShape({
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : endAngle - preAngle,
                        endAngle : endAngle,
                        brushType: 'fill',
                        color : darkColor
                    },
                    _color : zrColor.getLinearGradient(
                        x + r0 * Math.cos(endAngle, true),
                        y - r0 * Math.sin(endAngle, true),
                        x + r0 * Math.cos(endAngle - preAngle, true),
                        y - r0 * Math.sin(endAngle - preAngle, true),
                        [
                            [ 0, clolrList[i * 2 + 32] ],
                            [ 1, clolrList[i * 2 + 33] ]
                        ]
                    )
                }));
                endAngle -= preAngle;
            }

            var n = 0;
            if (options.progress != null) {
                // Ö¸¶¨½ø¶È
                addShapeHandle(background);

                n = this.adjust(options.progress, [ 0, 1 ]).toFixed(2) * 100 / 5;
                shapeRing.highlightStyle.text = n * 5 + '%';
                addShapeHandle(shapeRing);

                for (var i = 0; i < 20; i++) {
                    shapeList[i].highlightStyle.color = i < n
                        ? shapeList[i]._color : darkColor;
                    addShapeHandle(shapeList[i]);
                }

                addShapeHandle(textShape);
                refreshHandle();
                return;
            }

            // Ñ­»·ÏÔÊ¾
            return setInterval(
                function() {
                    addShapeHandle(background);

                    n += n >= 20 ? -20 : 1;

                    // shapeRing.highlightStyle.text = n * 5 + '%';
                    addShapeHandle(shapeRing);

                    for (var i = 0; i < 20; i++) {
                        shapeList[i].highlightStyle.color = i < n
                            ? shapeList[i]._color : darkColor;
                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        };

        return Ring;
    });
define('echarts/chart/island', ['require', './base', 'zrender/shape/Circle', '../config', '../util/ecData', 'zrender/tool/util', 'zrender/tool/event', 'zrender/tool/color', '../util/accMath', '../chart'], function (require) {
    var ChartBase = require('./base');
    
    // Í¼ÐÎÒÀÀµ
    var CircleShape = require('zrender/shape/Circle');
    
    var ecConfig = require('../config');
    ecConfig.island = {
        zlevel: 0,                  // Ò»¼¶²ãµþ
        z: 5,                       // ¶þ¼¶²ãµþ
        r: 15,
        calculateStep: 0.1  // ¹öÂÖ¿É¼ÆËã²½³¤ 0.1 = 10%
    };

    var ecData = require('../util/ecData');
    var zrUtil = require('zrender/tool/util');
    var zrEvent = require('zrender/tool/event');
    
    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} option Í¼±íÑ¡Ïî
     */
    function Island(ecTheme, messageCenter, zr, option, myChart) {
        // Í¼±í»ùÀà
        ChartBase.call(this, ecTheme, messageCenter, zr, option, myChart);

        this._nameConnector;
        this._valueConnector;
        this._zrHeight = this.zr.getHeight();
        this._zrWidth = this.zr.getWidth();

        var self = this;
        /**
         * ¹öÂÖ¸Ä±ä¹ÂµºÊý¾ÝÖµ
         */
        self.shapeHandler.onmousewheel = function (param) {
            var shape = param.target;

            var event = param.event;
            var delta = zrEvent.getDelta(event);
            delta = delta > 0 ? (-1) : 1;
            shape.style.r -= delta;
            shape.style.r = shape.style.r < 5 ? 5 : shape.style.r;

            var value = ecData.get(shape, 'value');
            var dvalue = value * self.option.island.calculateStep;
            value = dvalue > 1
                    ? (Math.round(value - dvalue * delta))
                    : +(value - dvalue * delta).toFixed(2);

            var name = ecData.get(shape, 'name');
            shape.style.text = name + ':' + value;

            ecData.set(shape, 'value', value);
            ecData.set(shape, 'name', name);

            self.zr.modShape(shape.id);
            self.zr.refreshNextFrame();
            zrEvent.stop(event);
        };
    }
    
    Island.prototype = {
        type: ecConfig.CHART_TYPE_ISLAND,
        /**
         * ¹ÂµººÏ²¢
         *
         * @param {string} tarShapeIndex Ä¿±êË÷Òý
         * @param {Object} srcShape Ô´Ä¿±ê£¬ºÏÈëÄ¿±êºóÉ¾³ý
         */
        _combine: function (tarShape, srcShape) {
            var zrColor = require('zrender/tool/color');
            var accMath = require('../util/accMath');
            var value = accMath.accAdd(
                            ecData.get(tarShape, 'value'),
                            ecData.get(srcShape, 'value')
                        );
            var name = ecData.get(tarShape, 'name')
                       + this._nameConnector
                       + ecData.get(srcShape, 'name');

            tarShape.style.text = name + this._valueConnector + value;

            ecData.set(tarShape, 'value', value);
            ecData.set(tarShape, 'name', name);
            tarShape.style.r = this.option.island.r;
            tarShape.style.color = zrColor.mix(
                tarShape.style.color,
                srcShape.style.color
            );
        },

        /**
         * Ë¢ÐÂ
         */
        refresh: function (newOption) {
            if (newOption) {
                newOption.island = this.reformOption(newOption.island);
                this.option = newOption;
    
                this._nameConnector = this.option.nameConnector;
                this._valueConnector = this.option.valueConnector;
            }
        },
        
        getOption: function () {
            return this.option;
        },

        resize: function () {
            var newWidth = this.zr.getWidth();
            var newHieght = this.zr.getHeight();
            var xScale = newWidth / (this._zrWidth || newWidth);
            var yScale = newHieght / (this._zrHeight || newHieght);
            if (xScale === 1 && yScale === 1) {
                return;
            }
            this._zrWidth = newWidth;
            this._zrHeight = newHieght;
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                this.zr.modShape(
                    this.shapeList[i].id,
                    {
                        style: {
                            x: Math.round(this.shapeList[i].style.x * xScale),
                            y: Math.round(this.shapeList[i].style.y * yScale)
                        }
                    }
                );
            }
        },

        add: function (shape) {
            var name = ecData.get(shape, 'name');
            var value = ecData.get(shape, 'value');
            var seriesName = ecData.get(shape, 'series') != null
                             ? ecData.get(shape, 'series').name
                             : '';
            var font = this.getFont(this.option.island.textStyle);
            var islandOption = this.option.island;
            var islandShape = {
                zlevel: islandOption.zlevel,
                z: islandOption.z,
                style: {
                    x: shape.style.x,
                    y: shape.style.y,
                    r: this.option.island.r,
                    color: shape.style.color || shape.style.strokeColor,
                    text: name + this._valueConnector + value,
                    textFont: font
                },
                draggable: true,
                hoverable: true,
                onmousewheel: this.shapeHandler.onmousewheel,
                _type: 'island'
            };
            if (islandShape.style.color === '#fff') {
                islandShape.style.color = shape.style.strokeColor;
            }
            this.setCalculable(islandShape);
            islandShape.dragEnableTime = 0;
            ecData.pack(
                islandShape,
                {name:seriesName}, -1,
                value, -1,
                name
            );
            islandShape = new CircleShape(islandShape);
            this.shapeList.push(islandShape);
            this.zr.addShape(islandShape);
        },

        del: function (shape) {
            this.zr.delShape(shape.id);
            var newShapeList = [];
            for (var i = 0, l = this.shapeList.length; i < l; i++) {
                if (this.shapeList[i].id != shape.id) {
                    newShapeList.push(this.shapeList[i]);
                }
            }
            this.shapeList = newShapeList;
        },

        /**
         * Êý¾ÝÏî±»ÍÏ×§½øÀ´£¬ ÖØÔØ»ùÀà·½·¨
         */
        ondrop: function (param, status) {
            if (!this.isDrop || !param.target) {
                // Ã»ÓÐÔÚµ±Ç°ÊµÀýÉÏ·¢ÉúÍÏ×§ÐÐÎªÔòÖ±½Ó·µ»Ø
                return;
            }
            // ÍÏ×§²úÉú¹ÂµºÊý¾ÝºÏ²¢
            var target = param.target;      // ÍÏ×§°²·ÅÄ¿±ê
            var dragged = param.dragged;    // µ±Ç°±»ÍÏ×§µÄÍ¼ÐÎ¶ÔÏó

            this._combine(target, dragged);
            this.zr.modShape(target.id);

            status.dragIn = true;

            // ´¦ÀíÍêÍÏ×§ÊÂ¼þºó¸´Î»
            this.isDrop = false;

            return;
        },

        /**
         * Êý¾ÝÏî±»ÍÏ×§³öÈ¥£¬ ÖØÔØ»ùÀà·½·¨
         */
        ondragend: function (param, status) {
            var target = param.target;      // ÍÏ×§°²·ÅÄ¿±ê
            if (!this.isDragend) {
                // ÍÏ×§µÄ²»ÊÇ¹ÂµºÊý¾Ý£¬Èç¹ûÃ»ÓÐÍ¼±í½ÓÊÜ¹ÂµºÊý¾Ý£¬ÐèÒªÐÂÔö¹ÂµºÊý¾Ý
                if (!status.dragIn) {
                    target.style.x = zrEvent.getX(param.event);
                    target.style.y = zrEvent.getY(param.event);
                    this.add(target);
                    status.needRefresh = true;
                }
            }
            else {
                // ÍÏ×§µÄÊÇ¹ÂµºÊý¾Ý£¬Èç¹ûÓÐÍ¼±í½ÓÊÜÁË¹ÂµºÊý¾Ý£¬ÐèÒªÉ¾³ý¹ÂµºÊý¾Ý
                if (status.dragIn) {
                    this.del(target);
                    status.needRefresh = true;
                }
            }

            // ´¦ÀíÍêÍÏ×§ÊÂ¼þºó¸´Î»
            this.isDragend = false;

            return;
        }
    };
    
    zrUtil.inherits(Island, ChartBase);
    
    // Í¼±í×¢²á
    require('../chart').define('island', Island);
    
    return Island;
});
define('zrender/loadingEffect/Spin', ['require', './Base', '../tool/util', '../tool/color', '../tool/area', '../shape/Sector'], function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrColor = require('../tool/color');
        var zrArea = require('../tool/area');
        var SectorShape = require('../shape/Sector');

        function Spin(options) {
            Base.call(this, options);
        }
        util.inherits(Spin, Base);

        /**
         * Ðý×ª
         * 
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        Spin.prototype._start = function (addShapeHandle, refreshHandle) {
            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#fff',
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(0, 0, 0, 0.8)'
                }
            );
            var textShape = this.createTextShape(options.textStyle);
            
            var textGap = 10;
            var textWidth = zrArea.getTextWidth(
                textShape.highlightStyle.text, textShape.highlightStyle.textFont
            );
            var textHeight = zrArea.getTextHeight(
                textShape.highlightStyle.text, textShape.highlightStyle.textFont
            );
            
            // ÌØÐ§Ä¬ÈÏÅäÖÃ
            var effectOption =  util.merge(
                this.options.effect || {},
                {
                    r0 : 9,
                    r : 15,
                    n : 18,
                    color : '#fff',
                    timeInterval : 100
                }
            );
            
            var location = this.getLocation(
                this.options.textStyle,
                textWidth + textGap + effectOption.r * 2,
                Math.max(effectOption.r * 2, textHeight)
            );
            effectOption.x = location.x + effectOption.r;
            effectOption.y = textShape.highlightStyle.y = location.y + location.height / 2;
            textShape.highlightStyle.x = effectOption.x + effectOption.r + textGap;
            
            var background = this.createBackgroundShape(options.backgroundColor);
            var n = effectOption.n;
            var x = effectOption.x;
            var y = effectOption.y;
            var r0 = effectOption.r0;
            var r = effectOption.r;
            var color = effectOption.color;

            // ³õÊ¼»¯¶¯»­ÔªËØ
            var shapeList = [];
            var preAngle = Math.round(180 / n);
            for (var i = 0; i < n; i++) {
                shapeList[i] = new SectorShape({
                    highlightStyle  : {
                        x : x,
                        y : y,
                        r0 : r0,
                        r : r,
                        startAngle : preAngle * i * 2,
                        endAngle : preAngle * i * 2 + preAngle,
                        color : zrColor.alpha(color, (i + 1) / n),
                        brushType: 'fill'
                    }
                });
            }

            var pos = [ 0, x, y ];

            return setInterval(
                function() {
                    addShapeHandle(background);
                    pos[0] -= 0.3;
                    for (var i = 0; i < n; i++) {
                        shapeList[i].rotation = pos;
                        addShapeHandle(shapeList[i]);
                    }

                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        };

        return Spin;
    });
define('zrender/loadingEffect/Whirling', ['require', './Base', '../tool/util', '../tool/area', '../shape/Ring', '../shape/Droplet', '../shape/Circle'], function (require) {
        var Base = require('./Base');
        var util = require('../tool/util');
        var zrArea = require('../tool/area');
        var RingShape = require('../shape/Ring');
        var DropletShape = require('../shape/Droplet');
        var CircleShape = require('../shape/Circle');

        function Whirling(options) {
            Base.call(this, options);
        }
        util.inherits(Whirling, Base);

        /**
         * Ðý×ªË®µÎ
         * 
         * @param {Object} addShapeHandle
         * @param {Object} refreshHandle
         */
        Whirling.prototype._start = function (addShapeHandle, refreshHandle) {
            var options = util.merge(
                this.options,
                {
                    textStyle : {
                        color : '#888',
                        textAlign : 'start'
                    },
                    backgroundColor : 'rgba(250, 250, 250, 0.8)'
                }
            );
            var textShape = this.createTextShape(options.textStyle);
            
            var textGap = 10;
            var textWidth = zrArea.getTextWidth(
                textShape.highlightStyle.text, textShape.highlightStyle.textFont
            );
            var textHeight = zrArea.getTextHeight(
                textShape.highlightStyle.text, textShape.highlightStyle.textFont
            );
            
            // ÌØÐ§Ä¬ÈÏÅäÖÃ
            var effectOption = util.merge(
                this.options.effect || {},
                {
                    r : 18,
                    colorIn : '#fff',
                    colorOut : '#555',
                    colorWhirl : '#6cf',
                    timeInterval : 50
                }
            );
            
            var location = this.getLocation(
                this.options.textStyle,
                textWidth + textGap + effectOption.r * 2,
                Math.max(effectOption.r * 2, textHeight)
            );
            effectOption.x = location.x + effectOption.r;
            effectOption.y = textShape.highlightStyle.y = location.y + location.height / 2;
            textShape.highlightStyle.x = effectOption.x + effectOption.r + textGap;
            
            var background = this.createBackgroundShape(options.backgroundColor);
            // ³õÊ¼»¯¶¯»­ÔªËØ
            var droplet = new DropletShape({
                highlightStyle : {
                    a : Math.round(effectOption.r / 2),
                    b : Math.round(effectOption.r - effectOption.r / 6),
                    brushType : 'fill',
                    color : effectOption.colorWhirl
                }
            });
            var circleIn = new CircleShape({
                highlightStyle : {
                    r : Math.round(effectOption.r / 6),
                    brushType : 'fill',
                    color : effectOption.colorIn
                }
            });
            var circleOut = new RingShape({
                highlightStyle : {
                    r0 : Math.round(effectOption.r - effectOption.r / 3),
                    r : effectOption.r,
                    brushType : 'fill',
                    color : effectOption.colorOut
                }
            });

            var pos = [ 0, effectOption.x, effectOption.y ];

            droplet.highlightStyle.x
                = circleIn.highlightStyle.x
                = circleOut.highlightStyle.x
                = pos[1];
            droplet.highlightStyle.y
                = circleIn.highlightStyle.y
                = circleOut.highlightStyle.y
                = pos[2];

            return setInterval(
                function() {
                    addShapeHandle(background);
                    addShapeHandle(circleOut);
                    pos[0] -= 0.3;
                    droplet.rotation = pos;
                    addShapeHandle(droplet);
                    addShapeHandle(circleIn);
                    addShapeHandle(textShape);
                    refreshHandle();
                },
                effectOption.timeInterval
            );
        };

        return Whirling;
    });
define('echarts/theme/macarons', [], function () {

var theme = {
    // Ä¬ÈÏÉ«°å
    color: [
        '#2ec7c9','#b6a2de','#5ab1ef','#ffb980','#d87a80',
        '#8d98b3','#e5cf0d','#97b552','#95706d','#dc69aa',
        '#07a2a4','#9a7fd1','#588dd5','#f5994e','#c05050',
        '#59678c','#c9ab00','#7eb00a','#6f5553','#c14089'
    ],

    // Í¼±í±êÌâ
    title: {
        textStyle: {
            fontWeight: 'normal',
            color: '#008acd'          // Ö÷±êÌâÎÄ×ÖÑÕÉ«
        }
    },
    
    // ÖµÓò
    dataRange: {
        itemWidth: 15,
        color: ['#5ab1ef','#e0ffff']
    },

    // ¹¤¾ßÏä
    toolbox: {
        color : ['#1e90ff', '#1e90ff', '#1e90ff', '#1e90ff'],
        effectiveColor : '#ff4500'
    },

    // ÌáÊ¾¿ò
    tooltip: {
        backgroundColor: 'rgba(50,50,50,0.5)',     // ÌáÊ¾±³¾°ÑÕÉ«£¬Ä¬ÈÏÎªÍ¸Ã÷¶ÈÎª0.7µÄºÚÉ«
        axisPointer : {            // ×ø±êÖáÖ¸Ê¾Æ÷£¬×ø±êÖá´¥·¢ÓÐÐ§
            type : 'line',         // Ä¬ÈÏÎªÖ±Ïß£¬¿ÉÑ¡Îª£º'line' | 'shadow'
            lineStyle : {          // Ö±ÏßÖ¸Ê¾Æ÷ÑùÊ½ÉèÖÃ
                color: '#008acd'
            },
            crossStyle: {
                color: '#008acd'
            },
            shadowStyle : {                     // ÒõÓ°Ö¸Ê¾Æ÷ÑùÊ½ÉèÖÃ
                color: 'rgba(200,200,200,0.2)'
            }
        }
    },

    // ÇøÓòËõ·Å¿ØÖÆÆ÷
    dataZoom: {
        dataBackgroundColor: '#efefff',            // Êý¾Ý±³¾°ÑÕÉ«
        fillerColor: 'rgba(182,162,222,0.2)',   // Ìî³äÑÕÉ«
        handleColor: '#008acd'    // ÊÖ±úÑÕÉ«
    },

    // Íø¸ñ
    grid: {
        borderColor: '#eee'
    },

    // ÀàÄ¿Öá
    categoryAxis: {
        axisLine: {            // ×ø±êÖáÏß
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: '#008acd'
            }
        },
        splitLine: {           // ·Ö¸ôÏß
            lineStyle: {       // ÊôÐÔlineStyle£¨Ïê¼ûlineStyle£©¿ØÖÆÏßÌõÑùÊ½
                color: ['#eee']
            }
        }
    },

    // ÊýÖµÐÍ×ø±êÖáÄ¬ÈÏ²ÎÊý
    valueAxis: {
        axisLine: {            // ×ø±êÖáÏß
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: '#008acd'
            }
        },
        splitArea : {
            show : true,
            areaStyle : {
                color: ['rgba(250,250,250,0.1)','rgba(200,200,200,0.1)']
            }
        },
        splitLine: {           // ·Ö¸ôÏß
            lineStyle: {       // ÊôÐÔlineStyle£¨Ïê¼ûlineStyle£©¿ØÖÆÏßÌõÑùÊ½
                color: ['#eee']
            }
        }
    },

    polar : {
        axisLine: {            // ×ø±êÖáÏß
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: '#ddd'
            }
        },
        splitArea : {
            show : true,
            areaStyle : {
                color: ['rgba(250,250,250,0.2)','rgba(200,200,200,0.2)']
            }
        },
        splitLine : {
            lineStyle : {
                color : '#ddd'
            }
        }
    },

    timeline : {
        lineStyle : {
            color : '#008acd'
        },
        controlStyle : {
            normal : { color : '#008acd'},
            emphasis : { color : '#008acd'}
        },
        symbol : 'emptyCircle',
        symbolSize : 3
    },

    // ÖùÐÎÍ¼Ä¬ÈÏ²ÎÊý
    bar: {
        itemStyle: {
            normal: {
                barBorderRadius: 5
            },
            emphasis: {
                barBorderRadius: 5
            }
        }
    },

    // ÕÛÏßÍ¼Ä¬ÈÏ²ÎÊý
    line: {
        smooth : true,
        symbol: 'emptyCircle',  // ¹ÕµãÍ¼ÐÎÀàÐÍ
        symbolSize: 3           // ¹ÕµãÍ¼ÐÎ´óÐ¡
    },
    
    // KÏßÍ¼Ä¬ÈÏ²ÎÊý
    k: {
        itemStyle: {
            normal: {
                color: '#d87a80',       // ÑôÏßÌî³äÑÕÉ«
                color0: '#2ec7c9',      // ÒõÏßÌî³äÑÕÉ«
                lineStyle: {
                    color: '#d87a80',   // ÑôÏß±ß¿òÑÕÉ«
                    color0: '#2ec7c9'   // ÒõÏß±ß¿òÑÕÉ«
                }
            }
        }
    },
    
    // É¢µãÍ¼Ä¬ÈÏ²ÎÊý
    scatter: {
        symbol: 'circle',    // Í¼ÐÎÀàÐÍ
        symbolSize: 4        // Í¼ÐÎ´óÐ¡£¬°ë¿í£¨°ë¾¶£©²ÎÊý£¬µ±Í¼ÐÎÎª·½Ïò»òÁâÐÎÔò×Ü¿í¶ÈÎªsymbolSize * 2
    },

    // À×´ïÍ¼Ä¬ÈÏ²ÎÊý
    radar : {
        symbol: 'emptyCircle',    // Í¼ÐÎÀàÐÍ
        symbolSize:3
        //symbol: null,         // ¹ÕµãÍ¼ÐÎÀàÐÍ
        //symbolRotate : null,  // Í¼ÐÎÐý×ª¿ØÖÆ
    },

    map: {
        itemStyle: {
            normal: {
                areaStyle: {
                    color: '#ddd'
                },
                label: {
                    textStyle: {
                        color: '#d87a80'
                    }
                }
            },
            emphasis: {                 // Ò²ÊÇÑ¡ÖÐÑùÊ½
                areaStyle: {
                    color: '#fe994e'
                }
            }
        }
    },
    
    force : {
        itemStyle: {
            normal: {
                linkStyle : {
                    color : '#1e90ff'
                }
            }
        }
    },

    chord : {
        itemStyle : {
            normal : {
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)',
                chordStyle : {
                    lineStyle : {
                        color : 'rgba(128, 128, 128, 0.5)'
                    }
                }
            },
            emphasis : {
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)',
                chordStyle : {
                    lineStyle : {
                        color : 'rgba(128, 128, 128, 0.5)'
                    }
                }
            }
        }
    },

    gauge : {
        axisLine: {            // ×ø±êÖáÏß
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: [[0.2, '#2ec7c9'],[0.8, '#5ab1ef'],[1, '#d87a80']], 
                width: 10
            }
        },
        axisTick: {            // ×ø±êÖáÐ¡±ê¼Ç
            splitNumber: 10,   // Ã¿·ÝsplitÏ¸·Ö¶àÉÙ¶Î
            length :15,        // ÊôÐÔlength¿ØÖÆÏß³¤
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: 'auto'
            }
        },
        splitLine: {           // ·Ö¸ôÏß
            length :22,         // ÊôÐÔlength¿ØÖÆÏß³¤
            lineStyle: {       // ÊôÐÔlineStyle£¨Ïê¼ûlineStyle£©¿ØÖÆÏßÌõÑùÊ½
                color: 'auto'
            }
        },
        pointer : {
            width : 5
        }
    },
    
    textStyle: {
        fontFamily: 'Î¢ÈíÑÅºÚ, Arial, Verdana, sans-serif'
    }
};

    return theme;
});
define('zrender/shape/Circle', ['require', './Base', '../tool/util'], function (require) {
        'use strict';

        var Base = require('./Base');

        /**
         * @alias module:zrender/shape/Circle
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Circle = function(options) {
            Base.call(this, options);
            /**
             * Ô²ÐÎ»æÖÆÑùÊ½
             * @name module:zrender/shape/Circle#style
             * @type {module:zrender/shape/Circle~ICircleStyle}
             */
            /**
             * Ô²ÐÎ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Circle#highlightStyle
             * @type {module:zrender/shape/Circle~ICircleStyle}
             */
        };

        Circle.prototype = {
            type: 'circle',
            /**
             * ´´½¨Ô²ÐÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Circle~ICircleStyle} style
             */
            buildPath : function (ctx, style) {
                // Better stroking in ShapeBundle
                ctx.moveTo(style.x + style.r, style.y);
                ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, true);
                return;
            },

            /**
             * ¼ÆËã·µ»ØÔ²ÐÎµÄ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Circle~ICircleStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Circle, Base);
        return Circle;
    });
define('zrender/Painter', ['require', './config', './tool/util', './tool/log', './loadingEffect/Base', './Layer', './shape/Image'], function (require) {
        'use strict';

        var config = require('./config');
        var util = require('./tool/util');
        // var vec2 = require('./tool/vector');
        var log = require('./tool/log');
        // var matrix = require('./tool/matrix');
        var BaseLoadingEffect = require('./loadingEffect/Base');

        var Layer = require('./Layer');

        // ·µ»ØfalseµÄ·½·¨£¬ÓÃÓÚ±ÜÃâÒ³Ãæ±»Ñ¡ÖÐ
        function returnFalse() {
            return false;
        }

        // Ê²Ã´¶¼²»¸ÉµÄ¿Õ·½·¨
        function doNothing() {}

        function isLayerValid(layer) {
            if (!layer) {
                return false;
            }
            
            if (layer.isBuildin) {
                return true;
            }

            if (typeof(layer.resize) !== 'function'
                || typeof(layer.refresh) !== 'function'
            ) {
                return false;
            }

            return true;
        }

        /**
         * @alias module:zrender/Painter
         * @constructor
         * @param {HTMLElement} root »æÍ¼ÈÝÆ÷
         * @param {module:zrender/Storage} storage
         */
        var Painter = function (root, storage) {
            /**
             * »æÍ¼ÈÝÆ÷
             * @type {HTMLElement}
             */
            this.root = root;
            root.style['-webkit-tap-highlight-color'] = 'transparent';
            root.style['-webkit-user-select'] = 'none';
            root.style['user-select'] = 'none';
            root.style['-webkit-touch-callout'] = 'none';

            /**
             * @type {module:zrender/Storage}
             */
            this.storage = storage;

            root.innerHTML = '';
            this._width = this._getWidth(); // ¿í£¬»º´æ¼ÇÂ¼
            this._height = this._getHeight(); // ¸ß£¬»º´æ¼ÇÂ¼

            var domRoot = document.createElement('div');
            this._domRoot = domRoot;

            // domRoot.onselectstart = returnFalse; // ±ÜÃâÒ³ÃæÑ¡ÖÐµÄÞÏÞÎ
            domRoot.style.position = 'relative';
            domRoot.style.overflow = 'hidden';
            domRoot.style.width = this._width + 'px';
            domRoot.style.height = this._height + 'px';
            root.appendChild(domRoot);

            this._layers = {};

            this._zlevelList = [];

            this._layerConfig = {};

            this._loadingEffect = new BaseLoadingEffect({});
            this.shapeToImage = this._createShapeToImageProcessor();

            // ´´½¨¸÷²ãcanvas
            // ±³¾°
            this._bgDom = document.createElement('div');
            this._bgDom.style.cssText = [
                'position:absolute;left:0px;top:0px;width:',
                this._width, 'px;height:', this._height + 'px;', 
                '-webkit-user-select:none;user-select;none;',
                '-webkit-touch-callout:none;'
            ].join('');
            this._bgDom.setAttribute('data-zr-dom-id', 'bg');
            this._bgDom.className = config.elementClassName;

            domRoot.appendChild(this._bgDom);
            this._bgDom.onselectstart = returnFalse;

            // ¸ßÁÁ
            var hoverLayer = new Layer('_zrender_hover_', this);
            this._layers['hover'] = hoverLayer;
            domRoot.appendChild(hoverLayer.dom);
            hoverLayer.initContext();

            hoverLayer.dom.onselectstart = returnFalse;
            hoverLayer.dom.style['-webkit-user-select'] = 'none';
            hoverLayer.dom.style['user-select'] = 'none';
            hoverLayer.dom.style['-webkit-touch-callout'] = 'none';

            // Will be injected by zrender instance
            this.refreshNextFrame = null;
        };

        /**
         * Ê×´Î»æÍ¼£¬´´½¨¸÷ÖÖdomºÍcontext
         * 
         * @param {Function} callback »æ»­½áÊøºóµÄ»Øµ÷º¯Êý
         */
        Painter.prototype.render = function (callback) {
            if (this.isLoading()) {
                this.hideLoading();
            }
            // TODO
            this.refresh(callback, true);

            return this;
        };

        /**
         * Ë¢ÐÂ
         * @param {Function} callback Ë¢ÐÂ½áÊøºóµÄ»Øµ÷º¯Êý
         * @param {boolean} paintAll Ç¿ÖÆ»æÖÆËùÓÐshape
         */
        Painter.prototype.refresh = function (callback, paintAll) {
            var list = this.storage.getShapeList(true);
            this._paintList(list, paintAll);

            // Paint custum layers
            for (var i = 0; i < this._zlevelList.length; i++) {
                var z = this._zlevelList[i];
                var layer = this._layers[z];
                if (! layer.isBuildin && layer.refresh) {
                    layer.refresh();
                }
            }

            if (typeof callback == 'function') {
                callback();
            }

            return this;
        };

        Painter.prototype._preProcessLayer = function (layer) {
            layer.unusedCount++;
            layer.updateTransform();
        };

        Painter.prototype._postProcessLayer = function (layer) {
            layer.dirty = false;
            // É¾³ý¹ýÆÚµÄ²ã
            // PENDING
            // if (layer.unusedCount >= 500) {
            //     this.delLayer(z);
            // }
            if (layer.unusedCount == 1) {
                layer.clear();
            }
        };
 
        Painter.prototype._paintList = function (list, paintAll) {

            if (typeof(paintAll) == 'undefined') {
                paintAll = false;
            }

            this._updateLayerStatus(list);

            var currentLayer;
            var currentZLevel;
            var ctx;

            this.eachBuildinLayer(this._preProcessLayer);

            // var invTransform = [];

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];

                // Change draw layer
                if (currentZLevel !== shape.zlevel) {
                    if (currentLayer) {
                        if (currentLayer.needTransform) {
                            ctx.restore();
                        }
                        ctx.flush && ctx.flush();
                    }

                    currentZLevel = shape.zlevel;
                    currentLayer = this.getLayer(currentZLevel);

                    if (!currentLayer.isBuildin) {
                        log(
                            'ZLevel ' + currentZLevel
                            + ' has been used by unkown layer ' + currentLayer.id
                        );
                    }

                    ctx = currentLayer.ctx;

                    // Reset the count
                    currentLayer.unusedCount = 0;

                    if (currentLayer.dirty || paintAll) {
                        currentLayer.clear();
                    }

                    if (currentLayer.needTransform) {
                        ctx.save();
                        currentLayer.setTransform(ctx);
                    }
                }

                if ((currentLayer.dirty || paintAll) && !shape.invisible) {
                    if (
                        !shape.onbrush
                        || (shape.onbrush && !shape.onbrush(ctx, false))
                    ) {
                        if (config.catchBrushException) {
                            try {
                                shape.brush(ctx, false, this.refreshNextFrame);
                            }
                            catch (error) {
                                log(
                                    error,
                                    'brush error of ' + shape.type,
                                    shape
                                );
                            }
                        }
                        else {
                            shape.brush(ctx, false, this.refreshNextFrame);
                        }
                    }
                }

                shape.__dirty = false;
            }

            if (currentLayer) {
                if (currentLayer.needTransform) {
                    ctx.restore();
                }
                ctx.flush && ctx.flush();
            }

            this.eachBuildinLayer(this._postProcessLayer);
        };

        /**
         * »ñÈ¡ zlevel ËùÔÚ²ã£¬Èç¹û²»´æÔÚÔò»á´´½¨Ò»¸öÐÂµÄ²ã
         * @param {number} zlevel
         * @return {module:zrender/Layer}
         */
        Painter.prototype.getLayer = function (zlevel) {
            var layer = this._layers[zlevel];
            if (!layer) {
                // Create a new layer
                layer = new Layer(zlevel, this);
                layer.isBuildin = true;

                if (this._layerConfig[zlevel]) {
                    util.merge(layer, this._layerConfig[zlevel], true);
                }

                layer.updateTransform();

                this.insertLayer(zlevel, layer);

                // Context is created after dom inserted to document
                // Or excanvas will get 0px clientWidth and clientHeight
                layer.initContext();
            }

            return layer;
        };

        Painter.prototype.insertLayer = function (zlevel, layer) {
            if (this._layers[zlevel]) {
                log('ZLevel ' + zlevel + ' has been used already');
                return;
            }
            // Check if is a valid layer
            if (!isLayerValid(layer)) {
                log('Layer of zlevel ' + zlevel + ' is not valid');
                return;
            }

            var len = this._zlevelList.length;
            var prevLayer = null;
            var i = -1;
            if (len > 0 && zlevel > this._zlevelList[0]) {
                for (i = 0; i < len - 1; i++) {
                    if (
                        this._zlevelList[i] < zlevel
                        && this._zlevelList[i + 1] > zlevel
                    ) {
                        break;
                    }
                }
                prevLayer = this._layers[this._zlevelList[i]];
            }
            this._zlevelList.splice(i + 1, 0, zlevel);

            var prevDom = prevLayer ? prevLayer.dom : this._bgDom;
            if (prevDom.nextSibling) {
                prevDom.parentNode.insertBefore(
                    layer.dom,
                    prevDom.nextSibling
                );
            }
            else {
                prevDom.parentNode.appendChild(layer.dom);
            }

            this._layers[zlevel] = layer;
        };

        // Iterate each layer
        Painter.prototype.eachLayer = function (cb, context) {
            for (var i = 0; i < this._zlevelList.length; i++) {
                var z = this._zlevelList[i];
                cb.call(context, this._layers[z], z);
            }
        };

        // Iterate each buildin layer
        Painter.prototype.eachBuildinLayer = function (cb, context) {
            for (var i = 0; i < this._zlevelList.length; i++) {
                var z = this._zlevelList[i];
                var layer = this._layers[z];
                if (layer.isBuildin) {
                    cb.call(context, layer, z);
                }
            }
        };

        // Iterate each other layer except buildin layer
        Painter.prototype.eachOtherLayer = function (cb, context) {
            for (var i = 0; i < this._zlevelList.length; i++) {
                var z = this._zlevelList[i];
                var layer = this._layers[z];
                if (! layer.isBuildin) {
                    cb.call(context, layer, z);
                }
            }
        };

        /**
         * »ñÈ¡ËùÓÐÒÑ´´½¨µÄ²ã
         * @param {Array.<module:zrender/Layer>} [prevLayer]
         */
        Painter.prototype.getLayers = function () {
            return this._layers;
        };

        Painter.prototype._updateLayerStatus = function (list) {
            
            var layers = this._layers;

            var elCounts = {};

            this.eachBuildinLayer(function (layer, z) {
                elCounts[z] = layer.elCount;
                layer.elCount = 0;
            });

            for (var i = 0, l = list.length; i < l; i++) {
                var shape = list[i];
                var zlevel = shape.zlevel;
                var layer = layers[zlevel];
                if (layer) {
                    layer.elCount++;
                    // ÒÑ¾­±»±ê¼ÇÎªÐèÒªË¢ÐÂ
                    if (layer.dirty) {
                        continue;
                    }
                    layer.dirty = shape.__dirty;
                }
            }

            // ²ãÖÐµÄÔªËØÊýÁ¿ÓÐ·¢Éú±ä»¯
            this.eachBuildinLayer(function (layer, z) {
                if (elCounts[z] !== layer.elCount) {
                    layer.dirty = true;
                }
            });
        };

        /**
         * Ö¸¶¨µÄÍ¼ÐÎÁÐ±í
         * @param {Array.<module:zrender/shape/Base>} shapeList ÐèÒª¸üÐÂµÄÍ¼ÐÎÔªËØÁÐ±í
         * @param {Function} [callback] ÊÓÍ¼¸üÐÂºó»Øµ÷º¯Êý
         */
        Painter.prototype.refreshShapes = function (shapeList, callback) {
            for (var i = 0, l = shapeList.length; i < l; i++) {
                var shape = shapeList[i];
                shape.modSelf();
            }

            this.refresh(callback);
            return this;
        };

        /**
         * ÉèÖÃloadingÌØÐ§
         * 
         * @param {Object} loadingEffect loadingÌØÐ§
         * @return {Painter}
         */
        Painter.prototype.setLoadingEffect = function (loadingEffect) {
            this._loadingEffect = loadingEffect;
            return this;
        };

        /**
         * Çå³ýhover²ãÍâËùÓÐÄÚÈÝ
         */
        Painter.prototype.clear = function () {
            this.eachBuildinLayer(this._clearLayer);
            return this;
        };

        Painter.prototype._clearLayer = function (layer) {
            layer.clear();
        };

        /**
         * ÐÞ¸ÄÖ¸¶¨zlevelµÄ»æÖÆ²ÎÊý
         * 
         * @param {string} zlevel
         * @param {Object} config ÅäÖÃ¶ÔÏó
         * @param {string} [config.clearColor=0] Ã¿´ÎÇå¿Õ»­²¼µÄÑÕÉ«
         * @param {string} [config.motionBlur=false] ÊÇ·ñ¿ªÆô¶¯Ì¬Ä£ºý
         * @param {number} [config.lastFrameAlpha=0.7]
         *                 ÔÚ¿ªÆô¶¯Ì¬Ä£ºýµÄÊ±ºòÊ¹ÓÃ£¬ÓëÉÏÒ»Ö¡»ìºÏµÄalphaÖµ£¬ÖµÔ½´óÎ²¼£Ô½Ã÷ÏÔ
         * @param {Array.<number>} [position] ²ãµÄÆ½ÒÆ
         * @param {Array.<number>} [rotation] ²ãµÄÐý×ª
         * @param {Array.<number>} [scale] ²ãµÄËõ·Å
         * @param {boolean} [zoomable=false] ²ãÊÇ·ñÖ§³ÖÊó±êËõ·Å²Ù×÷
         * @param {boolean} [panable=false] ²ãÊÇ·ñÖ§³ÖÊó±êÆ½ÒÆ²Ù×÷
         */
        Painter.prototype.modLayer = function (zlevel, config) {
            if (config) {
                if (!this._layerConfig[zlevel]) {
                    this._layerConfig[zlevel] = config;
                }
                else {
                    util.merge(this._layerConfig[zlevel], config, true);
                }

                var layer = this._layers[zlevel];

                if (layer) {
                    util.merge(layer, this._layerConfig[zlevel], true);
                }
            }
        };

        /**
         * É¾³ýÖ¸¶¨²ã
         * @param {number} zlevel ²ãËùÔÚµÄzlevel
         */
        Painter.prototype.delLayer = function (zlevel) {
            var layer = this._layers[zlevel];
            if (!layer) {
                return;
            }
            // Save config
            this.modLayer(zlevel, {
                position: layer.position,
                rotation: layer.rotation,
                scale: layer.scale
            });
            layer.dom.parentNode.removeChild(layer.dom);
            delete this._layers[zlevel];

            this._zlevelList.splice(util.indexOf(this._zlevelList, zlevel), 1);
        };

        /**
         * Ë¢ÐÂhover²ã
         */
        Painter.prototype.refreshHover = function () {
            this.clearHover();
            var list = this.storage.getHoverShapes(true);
            for (var i = 0, l = list.length; i < l; i++) {
                this._brushHover(list[i]);
            }
            var ctx = this._layers.hover.ctx;
            ctx.flush && ctx.flush();

            this.storage.delHover();

            return this;
        };

        /**
         * Çå³ýhover²ãËùÓÐÄÚÈÝ
         */
        Painter.prototype.clearHover = function () {
            var hover = this._layers.hover;
            hover && hover.clear();

            return this;
        };

        /**
         * ÏÔÊ¾loading
         * 
         * @param {Object=} loadingEffect loadingÐ§¹û¶ÔÏó
         */
        Painter.prototype.showLoading = function (loadingEffect) {
            this._loadingEffect && this._loadingEffect.stop();
            loadingEffect && this.setLoadingEffect(loadingEffect);
            this._loadingEffect.start(this);
            this.loading = true;

            return this;
        };

        /**
         * loading½áÊø
         */
        Painter.prototype.hideLoading = function () {
            this._loadingEffect.stop();

            this.clearHover();
            this.loading = false;
            return this;
        };

        /**
         * loading½áÊøÅÐ¶Ï
         */
        Painter.prototype.isLoading = function () {
            return this.loading;
        };

        /**
         * ÇøÓò´óÐ¡±ä»¯ºóÖØ»æ
         */
        Painter.prototype.resize = function () {
            var domRoot = this._domRoot;
            domRoot.style.display = 'none';

            var width = this._getWidth();
            var height = this._getHeight();

            domRoot.style.display = '';

            // ÓÅ»¯Ã»ÓÐÊµ¼Ê¸Ä±äµÄresize
            if (this._width != width || height != this._height) {
                this._width = width;
                this._height = height;

                domRoot.style.width = width + 'px';
                domRoot.style.height = height + 'px';

                for (var id in this._layers) {

                    this._layers[id].resize(width, height);
                }

                this.refresh(null, true);
            }

            return this;
        };

        /**
         * Çå³ýµ¥¶ÀµÄÒ»¸ö²ã
         * @param {number} zLevel
         */
        Painter.prototype.clearLayer = function (zLevel) {
            var layer = this._layers[zLevel];
            if (layer) {
                layer.clear();
            }
        };

        /**
         * ÊÍ·Å
         */
        Painter.prototype.dispose = function () {
            if (this.isLoading()) {
                this.hideLoading();
            }

            this.root.innerHTML = '';

            this.root =
            this.storage =

            this._domRoot = 
            this._layers = null;
        };

        Painter.prototype.getDomHover = function () {
            return this._layers.hover.dom;
        };

        /**
         * Í¼Ïñµ¼³ö
         * @param {string} type
         * @param {string} [backgroundColor='#fff'] ±³¾°É«
         * @return {string} Í¼Æ¬µÄBase64 url
         */
        Painter.prototype.toDataURL = function (type, backgroundColor, args) {
            if (window['G_vmlCanvasManager']) {
                return null;
            }

            var imageLayer = new Layer('image', this);
            this._bgDom.appendChild(imageLayer.dom);
            imageLayer.initContext();
            
            var ctx = imageLayer.ctx;
            imageLayer.clearColor = backgroundColor || '#fff';
            imageLayer.clear();
            
            var self = this;
            // ÉýÐò±éÀú£¬shapeÉÏµÄzlevelÖ¸¶¨»æ»­Í¼²ãµÄzÖá²ãµþ

            this.storage.iterShape(
                function (shape) {
                    if (!shape.invisible) {
                        if (!shape.onbrush // Ã»ÓÐonbrush
                            // ÓÐonbrush²¢ÇÒµ÷ÓÃÖ´ÐÐ·µ»Øfalse»òundefinedÔò¼ÌÐø·ÛË¢
                            || (shape.onbrush && !shape.onbrush(ctx, false))
                        ) {
                            if (config.catchBrushException) {
                                try {
                                    shape.brush(ctx, false, self.refreshNextFrame);
                                }
                                catch (error) {
                                    log(
                                        error,
                                        'brush error of ' + shape.type,
                                        shape
                                    );
                                }
                            }
                            else {
                                shape.brush(ctx, false, self.refreshNextFrame);
                            }
                        }
                    }
                },
                { normal: 'up', update: true }
            );
            var image = imageLayer.dom.toDataURL(type, args); 
            ctx = null;
            this._bgDom.removeChild(imageLayer.dom);
            return image;
        };

        /**
         * »ñÈ¡»æÍ¼ÇøÓò¿í¶È
         */
        Painter.prototype.getWidth = function () {
            return this._width;
        };

        /**
         * »ñÈ¡»æÍ¼ÇøÓò¸ß¶È
         */
        Painter.prototype.getHeight = function () {
            return this._height;
        };

        Painter.prototype._getWidth = function () {
            var root = this.root;
            var stl = root.currentStyle
                      || document.defaultView.getComputedStyle(root);

            return ((root.clientWidth || parseInt(stl.width, 10))
                    - parseInt(stl.paddingLeft, 10) // ÇëÔ­ÁÂÎÒÕâ±È½Ï´Ö±©
                    - parseInt(stl.paddingRight, 10)).toFixed(0) - 0;
        };

        Painter.prototype._getHeight = function () {
            var root = this.root;
            var stl = root.currentStyle
                      || document.defaultView.getComputedStyle(root);

            return ((root.clientHeight || parseInt(stl.height, 10))
                    - parseInt(stl.paddingTop, 10) // ÇëÔ­ÁÂÎÒÕâ±È½Ï´Ö±©
                    - parseInt(stl.paddingBottom, 10)).toFixed(0) - 0;
        };

        Painter.prototype._brushHover = function (shape) {
            var ctx = this._layers.hover.ctx;

            if (!shape.onbrush // Ã»ÓÐonbrush
                // ÓÐonbrush²¢ÇÒµ÷ÓÃÖ´ÐÐ·µ»Øfalse»òundefinedÔò¼ÌÐø·ÛË¢
                || (shape.onbrush && !shape.onbrush(ctx, true))
            ) {
                var layer = this.getLayer(shape.zlevel);
                if (layer.needTransform) {
                    ctx.save();
                    layer.setTransform(ctx);
                }
                // Retina ÓÅ»¯
                if (config.catchBrushException) {
                    try {
                        shape.brush(ctx, true, this.refreshNextFrame);
                    }
                    catch (error) {
                        log(
                            error, 'hoverBrush error of ' + shape.type, shape
                        );
                    }
                }
                else {
                    shape.brush(ctx, true, this.refreshNextFrame);
                }
                if (layer.needTransform) {
                    ctx.restore();
                }
            }
        };

        Painter.prototype._shapeToImage = function (
            id, shape, width, height, devicePixelRatio
        ) {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            canvas.setAttribute('width', width * devicePixelRatio);
            canvas.setAttribute('height', height * devicePixelRatio);

            ctx.clearRect(0, 0, width * devicePixelRatio, height * devicePixelRatio);

            var shapeTransform = {
                position : shape.position,
                rotation : shape.rotation,
                scale : shape.scale
            };
            shape.position = [ 0, 0, 0 ];
            shape.rotation = 0;
            shape.scale = [ 1, 1 ];
            if (shape) {
                shape.brush(ctx, false);
            }

            var ImageShape = require('./shape/Image');
            var imgShape = new ImageShape({
                id : id,
                style : {
                    x : 0,
                    y : 0,
                    image : canvas
                }
            });

            if (shapeTransform.position != null) {
                imgShape.position = shape.position = shapeTransform.position;
            }

            if (shapeTransform.rotation != null) {
                imgShape.rotation = shape.rotation = shapeTransform.rotation;
            }

            if (shapeTransform.scale != null) {
                imgShape.scale = shape.scale = shapeTransform.scale;
            }

            return imgShape;
        };

        Painter.prototype._createShapeToImageProcessor = function () {
            if (window['G_vmlCanvasManager']) {
                return doNothing;
            }

            var me = this;

            return function (id, e, width, height) {
                return me._shapeToImage(
                    id, e, width, height, config.devicePixelRatio
                );
            };
        };

        return Painter;
    });
define('echarts/theme/infographic', [], function () {

var theme = {
    // Ä¬ÈÏÉ«°å
    color: [
        '#C1232B','#B5C334','#FCCE10','#E87C25','#27727B',
        '#FE8463','#9BCA63','#FAD860','#F3A43B','#60C0DD',
        '#D7504B','#C6E579','#F4E001','#F0805A','#26C0C0'
    ],

    // Í¼±í±êÌâ
    title: {
        textStyle: {
            fontWeight: 'normal',
            color: '#27727B'          // Ö÷±êÌâÎÄ×ÖÑÕÉ«
        }
    },

    // ÖµÓò
    dataRange: {
        x:'right',
        y:'center',
        itemWidth: 5,
        itemHeight:25,
        color:['#C1232B','#FCCE10']
    },

    toolbox: {
        color : [
            '#C1232B','#B5C334','#FCCE10','#E87C25','#27727B',
            '#FE8463','#9BCA63','#FAD860','#F3A43B','#60C0DD'
        ],
        effectiveColor : '#ff4500'
    },

    // ÌáÊ¾¿ò
    tooltip: {
        backgroundColor: 'rgba(50,50,50,0.5)',     // ÌáÊ¾±³¾°ÑÕÉ«£¬Ä¬ÈÏÎªÍ¸Ã÷¶ÈÎª0.7µÄºÚÉ«
        axisPointer : {            // ×ø±êÖáÖ¸Ê¾Æ÷£¬×ø±êÖá´¥·¢ÓÐÐ§
            type : 'line',         // Ä¬ÈÏÎªÖ±Ïß£¬¿ÉÑ¡Îª£º'line' | 'shadow'
            lineStyle : {          // Ö±ÏßÖ¸Ê¾Æ÷ÑùÊ½ÉèÖÃ
                color: '#27727B',
                type: 'dashed'
            },
            crossStyle: {
                color: '#27727B'
            },
            shadowStyle : {                     // ÒõÓ°Ö¸Ê¾Æ÷ÑùÊ½ÉèÖÃ
                color: 'rgba(200,200,200,0.3)'
            }
        }
    },

    // ÇøÓòËõ·Å¿ØÖÆÆ÷
    dataZoom: {
        dataBackgroundColor: 'rgba(181,195,52,0.3)',            // Êý¾Ý±³¾°ÑÕÉ«
        fillerColor: 'rgba(181,195,52,0.2)',   // Ìî³äÑÕÉ«
        handleColor: '#27727B'    // ÊÖ±úÑÕÉ«
    },

    // Íø¸ñ
    grid: {
        borderWidth:0
    },

    // ÀàÄ¿Öá
    categoryAxis: {
        axisLine: {            // ×ø±êÖáÏß
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: '#27727B'
            }
        },
        splitLine: {           // ·Ö¸ôÏß
            show: false
        }
    },

    // ÊýÖµÐÍ×ø±êÖáÄ¬ÈÏ²ÎÊý
    valueAxis: {
        axisLine: {            // ×ø±êÖáÏß
            show: false
        },
        splitArea : {
            show: false
        },
        splitLine: {           // ·Ö¸ôÏß
            lineStyle: {       // ÊôÐÔlineStyle£¨Ïê¼ûlineStyle£©¿ØÖÆÏßÌõÑùÊ½
                color: ['#ccc'],
                type: 'dashed'
            }
        }
    },

    polar : {
        axisLine: {            // ×ø±êÖáÏß
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: '#ddd'
            }
        },
        splitArea : {
            show : true,
            areaStyle : {
                color: ['rgba(250,250,250,0.2)','rgba(200,200,200,0.2)']
            }
        },
        splitLine : {
            lineStyle : {
                color : '#ddd'
            }
        }
    },

    timeline : {
        lineStyle : {
            color : '#27727B'
        },
        controlStyle : {
            normal : { color : '#27727B'},
            emphasis : { color : '#27727B'}
        },
        symbol : 'emptyCircle',
        symbolSize : 3
    },

    // ÕÛÏßÍ¼Ä¬ÈÏ²ÎÊý
    line: {
        itemStyle: {
            normal: {
                borderWidth:2,
                borderColor:'#fff',
                lineStyle: {
                    width: 3
                }
            },
            emphasis: {
                borderWidth:0
            }
        },
        symbol: 'circle',  // ¹ÕµãÍ¼ÐÎÀàÐÍ
        symbolSize: 3.5           // ¹ÕµãÍ¼ÐÎ´óÐ¡
    },

    // KÏßÍ¼Ä¬ÈÏ²ÎÊý
    k: {
        itemStyle: {
            normal: {
                color: '#C1232B',       // ÑôÏßÌî³äÑÕÉ«
                color0: '#B5C334',      // ÒõÏßÌî³äÑÕÉ«
                lineStyle: {
                    width: 1,
                    color: '#C1232B',   // ÑôÏß±ß¿òÑÕÉ«
                    color0: '#B5C334'   // ÒõÏß±ß¿òÑÕÉ«
                }
            }
        }
    },

    // É¢µãÍ¼Ä¬ÈÏ²ÎÊý
    scatter: {
        itemStyle: {
            normal: {
                borderWidth:1,
                borderColor:'rgba(200,200,200,0.5)'
            },
            emphasis: {
                borderWidth:0
            }
        },
        symbol: 'star4',    // Í¼ÐÎÀàÐÍ
        symbolSize: 4        // Í¼ÐÎ´óÐ¡£¬°ë¿í£¨°ë¾¶£©²ÎÊý£¬µ±Í¼ÐÎÎª·½Ïò»òÁâÐÎÔò×Ü¿í¶ÈÎªsymbolSize * 2
    },

    // À×´ïÍ¼Ä¬ÈÏ²ÎÊý
    radar : {
        symbol: 'emptyCircle',    // Í¼ÐÎÀàÐÍ
        symbolSize:3
        //symbol: null,         // ¹ÕµãÍ¼ÐÎÀàÐÍ
        //symbolRotate : null,  // Í¼ÐÎÐý×ª¿ØÖÆ
    },

    map: {
        itemStyle: {
            normal: {
                areaStyle: {
                    color: '#ddd'
                },
                label: {
                    textStyle: {
                        color: '#C1232B'
                    }
                }
            },
            emphasis: {                 // Ò²ÊÇÑ¡ÖÐÑùÊ½
                areaStyle: {
                    color: '#fe994e'
                },
                label: {
                    textStyle: {
                        color: 'rgb(100,0,0)'
                    }
                }
            }
        }
    },

    force : {
        itemStyle: {
            normal: {
                linkStyle : {
                    color : '#27727B'
                }
            }
        }
    },

    chord : {
        itemStyle : {
            normal : {
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)',
                chordStyle : {
                    lineStyle : {
                        color : 'rgba(128, 128, 128, 0.5)'
                    }
                }
            },
            emphasis : {
                borderWidth: 1,
                borderColor: 'rgba(128, 128, 128, 0.5)',
                chordStyle : {
                    lineStyle : {
                        color : 'rgba(128, 128, 128, 0.5)'
                    }
                }
            }
        }
    },

    gauge : {
        center:['50%','80%'],
        radius:'100%',
        startAngle: 180,
        endAngle : 0,
        axisLine: {            // ×ø±êÖáÏß
            show: true,        // Ä¬ÈÏÏÔÊ¾£¬ÊôÐÔshow¿ØÖÆÏÔÊ¾Óë·ñ
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: [[0.2, '#B5C334'],[0.8, '#27727B'],[1, '#C1232B']],
                width: '40%'
            }
        },
        axisTick: {            // ×ø±êÖáÐ¡±ê¼Ç
            splitNumber: 2,   // Ã¿·ÝsplitÏ¸·Ö¶àÉÙ¶Î
            length: 5,        // ÊôÐÔlength¿ØÖÆÏß³¤
            lineStyle: {       // ÊôÐÔlineStyle¿ØÖÆÏßÌõÑùÊ½
                color: '#fff'
            }
        },
        axisLabel: {           // ×ø±êÖáÎÄ±¾±êÇ©£¬Ïê¼ûaxis.axisLabel
            textStyle: {       // ÆäÓàÊôÐÔÄ¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                color: '#fff',
                fontWeight:'bolder'
            }
        },
        splitLine: {           // ·Ö¸ôÏß
            length: '5%',         // ÊôÐÔlength¿ØÖÆÏß³¤
            lineStyle: {       // ÊôÐÔlineStyle£¨Ïê¼ûlineStyle£©¿ØÖÆÏßÌõÑùÊ½
                color: '#fff'
            }
        },
        pointer : {
            width : '40%',
            length: '80%',
            color: '#fff'
        },
        title : {
          offsetCenter: [0, -20],       // x, y£¬µ¥Î»px
          textStyle: {       // ÆäÓàÊôÐÔÄ¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
            color: 'auto',
            fontSize: 20
          }
        },
        detail : {
            offsetCenter: [0, 0],       // x, y£¬µ¥Î»px
            textStyle: {       // ÆäÓàÊôÐÔÄ¬ÈÏÊ¹ÓÃÈ«¾ÖÎÄ±¾ÑùÊ½£¬Ïê¼ûTEXTSTYLE
                color: 'auto',
                fontSize: 40
            }
        }
    },

    textStyle: {
        fontFamily: 'Î¢ÈíÑÅºÚ, Arial, Verdana, sans-serif'
    }
};

    return theme;
});
define('zrender/Storage', ['require', './tool/util', './Group'], function (require) {

        'use strict';

        var util = require('./tool/util');

        var Group = require('./Group');

        var defaultIterateOption = {
            hover: false,
            normal: 'down',
            update: false
        };

        function shapeCompareFunc(a, b) {
            if (a.zlevel == b.zlevel) {
                if (a.z == b.z) {
                    return a.__renderidx - b.__renderidx;
                }
                return a.z - b.z;
            }
            return a.zlevel - b.zlevel;
        }
        /**
         * ÄÚÈÝ²Ö¿â (M)
         * @alias module:zrender/Storage
         * @constructor
         */
        var Storage = function () {
            // ËùÓÐ³£¹æÐÎ×´£¬idË÷ÒýµÄmap
            this._elements = {};

            // ¸ßÁÁ²ãÐÎ×´£¬²»ÎÈ¶¨£¬¶¯Ì¬ÔöÉ¾£¬Êý×éÎ»ÖÃÒ²ÊÇzÖá·½Ïò£¬¿¿Ç°ÏÔÊ¾ÔÚÏÂ·½
            this._hoverElements = [];

            this._roots = [];

            this._shapeList = [];

            this._shapeListOffset = 0;
        };

        /**
         * ±éÀúµü´úÆ÷
         * 
         * @param {Function} fun µü´ú»Øµ÷º¯Êý£¬return trueÖÕÖ¹µü´ú
         * @param {Object} [option] µü´ú²ÎÊý£¬È±Ê¡Îª½ö½µÐò±éÀúÆÕÍ¨²ãÍ¼ÐÎ
         * @param {boolean} [option.hover=true] ÊÇ·ñÊÇ¸ßÁÁ²ãÍ¼ÐÎ
         * @param {string} [option.normal='up'] ÊÇ·ñÊÇÆÕÍ¨²ãÍ¼ÐÎ£¬µü´úÊ±ÊÇ·ñÖ¸¶¨¼°zÖáË³Ðò
         * @param {boolean} [option.update=false] ÊÇ·ñÔÚµü´úÇ°¸üÐÂÐÎ×´ÁÐ±í
         * 
         */
        Storage.prototype.iterShape = function (fun, option) {
            if (!option) {
                option = defaultIterateOption;
            }

            if (option.hover) {
                // ¸ßÁÁ²ãÊý¾Ý±éÀú
                for (var i = 0, l = this._hoverElements.length; i < l; i++) {
                    var el = this._hoverElements[i];
                    el.updateTransform();
                    if (fun(el)) {
                        return this;
                    }
                }
            }

            if (option.update) {
                this.updateShapeList();
            }

            // ±éÀú: 'down' | 'up'
            switch (option.normal) {
                case 'down':
                    // ½µÐò±éÀú£¬¸ß²ãÓÅÏÈ
                    var l = this._shapeList.length;
                    while (l--) {
                        if (fun(this._shapeList[l])) {
                            return this;
                        }
                    }
                    break;
                // case 'up':
                default:
                    // ÉýÐò±éÀú£¬µ×²ãÓÅÏÈ
                    for (var i = 0, l = this._shapeList.length; i < l; i++) {
                        if (fun(this._shapeList[i])) {
                            return this;
                        }
                    }
                    break;
            }

            return this;
        };

        /**
         * ·µ»Øhover²ãµÄÐÎ×´Êý×é
         * @param  {boolean} [update=false] ÊÇ·ñÔÚ·µ»ØÇ°¸üÐÂÍ¼ÐÎµÄ±ä»»
         * @return {Array.<module:zrender/shape/Base>}
         */
        Storage.prototype.getHoverShapes = function (update) {
            // hoverConnect
            var hoverElements = [];
            for (var i = 0, l = this._hoverElements.length; i < l; i++) {
                hoverElements.push(this._hoverElements[i]);
                var target = this._hoverElements[i].hoverConnect;
                if (target) {
                    var shape;
                    target = target instanceof Array ? target : [target];
                    for (var j = 0, k = target.length; j < k; j++) {
                        shape = target[j].id ? target[j] : this.get(target[j]);
                        if (shape) {
                            hoverElements.push(shape);
                        }
                    }
                }
            }
            hoverElements.sort(shapeCompareFunc);
            if (update) {
                for (var i = 0, l = hoverElements.length; i < l; i++) {
                    hoverElements[i].updateTransform();
                }
            }
            return hoverElements;
        };

        /**
         * ·µ»ØËùÓÐÍ¼ÐÎµÄ»æÖÆ¶ÓÁÐ
         * @param  {boolean} [update=false] ÊÇ·ñÔÚ·µ»ØÇ°¸üÐÂ¸ÃÊý×é
         * Ïê¼û{@link module:zrender/shape/Base.prototype.updateShapeList}
         * @return {Array.<module:zrender/shape/Base>}
         */
        Storage.prototype.getShapeList = function (update) {
            if (update) {
                this.updateShapeList();
            }
            return this._shapeList;
        };

        /**
         * ¸üÐÂÍ¼ÐÎµÄ»æÖÆ¶ÓÁÐ¡£
         * Ã¿´Î»æÖÆÇ°¶¼»áµ÷ÓÃ£¬¸Ã·½·¨»áÏÈÉî¶ÈÓÅÏÈ±éÀúÕû¸öÊ÷£¬¸üÐÂËùÓÐGroupºÍShapeµÄ±ä»»²¢ÇÒ°ÑËùÓÐ¿É¼ûµÄShape±£´æµ½Êý×éÖÐ£¬
         * ×îºó¸ù¾Ý»æÖÆµÄÓÅÏÈ¼¶£¨zlevel > z > ²åÈëË³Ðò£©ÅÅÐòµÃµ½»æÖÆ¶ÓÁÐ
         */
        Storage.prototype.updateShapeList = function () {
            this._shapeListOffset = 0;
            for (var i = 0, len = this._roots.length; i < len; i++) {
                var root = this._roots[i];
                this._updateAndAddShape(root);
            }
            this._shapeList.length = this._shapeListOffset;

            for (var i = 0, len = this._shapeList.length; i < len; i++) {
                this._shapeList[i].__renderidx = i;
            }

            this._shapeList.sort(shapeCompareFunc);
        };

        Storage.prototype._updateAndAddShape = function (el, clipShapes) {
            
            if (el.ignore) {
                return;
            }

            el.updateTransform();

            if (el.clipShape) {
                // clipShape µÄ±ä»»ÊÇ»ùÓÚ group µÄ±ä»»
                el.clipShape.parent = el;
                el.clipShape.updateTransform();

                // PENDING Ð§ÂÊÓ°Ïì
                if (clipShapes) {
                    clipShapes = clipShapes.slice();
                    clipShapes.push(el.clipShape);
                } else {
                    clipShapes = [el.clipShape];
                }
            }

            if (el.type == 'group') {
                
                for (var i = 0; i < el._children.length; i++) {
                    var child = el._children[i];

                    // Force to mark as dirty if group is dirty
                    child.__dirty = el.__dirty || child.__dirty;

                    this._updateAndAddShape(child, clipShapes);
                }

                // Mark group clean here
                el.__dirty = false;
                
            }
            else {
                el.__clipShapes = clipShapes;

                this._shapeList[this._shapeListOffset++] = el;
            }
        };

        /**
         * ÐÞ¸ÄÍ¼ÐÎ(Shape)»òÕß×é(Group)
         * 
         * @param {string|module:zrender/shape/Base|module:zrender/Group} el
         * @param {Object} [params] ²ÎÊý
         */
        Storage.prototype.mod = function (el, params) {
            if (typeof (el) === 'string') {
                el = this._elements[el];
            }
            if (el) {

                el.modSelf();

                if (params) {
                    // Èç¹ûµÚ¶þ¸ö²ÎÊýÖ±½ÓÊ¹ÓÃ shape
                    // parent, _storage, __clipShapes Èý¸öÊôÐÔ»áÓÐÑ­»·ÒýÓÃ
                    // Ö÷ÒªÎªÁËÏò 1.x °æ±¾¼æÈÝ£¬2.x °æ±¾²»½¨ÒéÊ¹ÓÃµÚ¶þ¸ö²ÎÊý
                    if (params.parent || params._storage || params.__clipShapes) {
                        var target = {};
                        for (var name in params) {
                            if (
                                name === 'parent'
                                || name === '_storage'
                                || name === '__clipShapes'
                            ) {
                                continue;
                            }
                            if (params.hasOwnProperty(name)) {
                                target[name] = params[name];
                            }
                        }
                        util.merge(el, target, true);
                    }
                    else {
                        util.merge(el, params, true);
                    }
                }
            }

            return this;
        };

        /**
         * ÒÆ¶¯Ö¸¶¨µÄÍ¼ÐÎ(Shape)»òÕß×é(Group)µÄÎ»ÖÃ
         * @param {string} shapeId ÐÎ×´Î¨Ò»±êÊ¶
         * @param {number} dx
         * @param {number} dy
         */
        Storage.prototype.drift = function (shapeId, dx, dy) {
            var shape = this._elements[shapeId];
            if (shape) {
                shape.needTransform = true;
                if (shape.draggable === 'horizontal') {
                    dy = 0;
                }
                else if (shape.draggable === 'vertical') {
                    dx = 0;
                }
                if (!shape.ondrift // ondrift
                    // ÓÐonbrush²¢ÇÒµ÷ÓÃÖ´ÐÐ·µ»Øfalse»òundefinedÔò¼ÌÐø
                    || (shape.ondrift && !shape.ondrift(dx, dy))
                ) {
                    shape.drift(dx, dy);
                }
            }

            return this;
        };

        /**
         * Ìí¼Ó¸ßÁÁ²ãÊý¾Ý
         * 
         * @param {module:zrender/shape/Base} shape
         */
        Storage.prototype.addHover = function (shape) {
            shape.updateNeedTransform();
            this._hoverElements.push(shape);
            return this;
        };

        /**
         * Çå¿Õ¸ßÁÁ²ãÊý¾Ý
         */
        Storage.prototype.delHover = function () {
            this._hoverElements = [];
            return this;
        };

        /**
         * ÊÇ·ñÓÐÍ¼ÐÎÔÚ¸ßÁÁ²ãÀï
         * @return {boolean}
         */
        Storage.prototype.hasHoverShape = function () {
            return this._hoverElements.length > 0;
        };

        /**
         * Ìí¼ÓÍ¼ÐÎ(Shape)»òÕß×é(Group)µ½¸ù½Úµã
         * @param {module:zrender/shape/Shape|module:zrender/Group} el
         */
        Storage.prototype.addRoot = function (el) {
            // Element has been added
            if (this._elements[el.id]) {
                return;
            }

            if (el instanceof Group) {
                el.addChildrenToStorage(this);
            }

            this.addToMap(el);
            this._roots.push(el);
        };

        /**
         * É¾³ýÖ¸¶¨µÄÍ¼ÐÎ(Shape)»òÕß×é(Group)
         * @param {string|Array.<string>} [elId] Èç¹ûÎª¿ÕÇå¿ÕÕû¸öStorage
         */
        Storage.prototype.delRoot = function (elId) {
            if (typeof(elId) == 'undefined') {
                // ²»Ö¸¶¨elIdÇå¿Õ
                for (var i = 0; i < this._roots.length; i++) {
                    var root = this._roots[i];
                    if (root instanceof Group) {
                        root.delChildrenFromStorage(this);
                    }
                }

                this._elements = {};
                this._hoverElements = [];
                this._roots = [];
                this._shapeList = [];
                this._shapeListOffset = 0;

                return;
            }

            if (elId instanceof Array) {
                for (var i = 0, l = elId.length; i < l; i++) {
                    this.delRoot(elId[i]);
                }
                return;
            }

            var el;
            if (typeof(elId) == 'string') {
                el = this._elements[elId];
            }
            else {
                el = elId;
            }

            var idx = util.indexOf(this._roots, el);
            if (idx >= 0) {
                this.delFromMap(el.id);
                this._roots.splice(idx, 1);
                if (el instanceof Group) {
                    el.delChildrenFromStorage(this);
                }
            }
        };

        Storage.prototype.addToMap = function (el) {
            if (el instanceof Group) {
                el._storage = this;
            }
            el.modSelf();

            this._elements[el.id] = el;

            return this;
        };

        Storage.prototype.get = function (elId) {
            return this._elements[elId];
        };

        Storage.prototype.delFromMap = function (elId) {
            var el = this._elements[elId];
            if (el) {
                delete this._elements[elId];

                if (el instanceof Group) {
                    el._storage = null;
                }
            }

            return this;
        };

        /**
         * Çå¿Õ²¢ÇÒÊÍ·ÅStorage
         */
        Storage.prototype.dispose = function () {
            this._elements = 
            this._renderList = 
            this._roots =
            this._hoverElements = null;
        };

        return Storage;
    });
define('echarts/util/ecQuery', ['require', 'zrender/tool/util'], function (require) {
    var zrUtil = require('zrender/tool/util');
    
    /**
     * »ñÈ¡Ç¶Ì×Ñ¡ÏîµÄ»ù´¡·½·¨
     * ·µ»ØoptionTargetÖÐÎ»ÓÚoptionLocationÉÏµÄÖµ£¬Èç¹ûÃ»ÓÐ¶¨Òå£¬Ôò·µ»Øundefined
     */
    function query(optionTarget, optionLocation) {
        if (typeof optionTarget == 'undefined') {
            return;
        }

        if (!optionLocation) {
            return optionTarget;
        }

        optionLocation = optionLocation.split('.');
        var length = optionLocation.length;
        var curIdx = 0;
        while (curIdx < length) {
            optionTarget = optionTarget[optionLocation[curIdx]];
            if (typeof optionTarget == 'undefined') {
                return;
            }
            curIdx++;
        }

        return optionTarget;
    }
        
    /**
     * »ñÈ¡¶à¼¶¿ØÖÆÇ¶Ì×ÊôÐÔµÄ»ù´¡·½·¨
     * ·µ»ØctrListÖÐÓÅÏÈ¼¶×î¸ß£¨×î¿¿Ç°£©µÄ·ÇundefinedÊôÐÔ£¬ctrListÖÐ¾ùÎÞ¶¨ÒåÔò·µ»Øundefined
     */
    function deepQuery(ctrList, optionLocation) {
        var finalOption;
        for (var i = 0, l = ctrList.length; i < l; i++) {
            finalOption = query(ctrList[i], optionLocation);
            if (typeof finalOption != 'undefined') {
                return finalOption;
            }
        }
    }
    
    /**
     * »ñÈ¡¶à¼¶¿ØÖÆÇ¶Ì×ÊôÐÔµÄ»ù´¡·½·¨
     * ¸ù¾ÝctrListÖÐÓÅÏÈ¼¶ºÏ²¢²ú³öÄ¿±êÊôÐÔ
     */
    function deepMerge(ctrList, optionLocation) {
        var finalOption;
        var len = ctrList.length;
        while (len--) {
            var tempOption = query(ctrList[len], optionLocation);
            if (typeof tempOption != 'undefined') {
                if (typeof finalOption == 'undefined') {
                    finalOption = zrUtil.clone(tempOption);
                }
                else {
                    zrUtil.merge(
                        finalOption, tempOption, true
                    );
                }
            }
        }
        
        return finalOption;
    }
    
    return {
        query : query,
        deepQuery : deepQuery,
        deepMerge : deepMerge
    };
});
define('echarts/util/number', [], function () {
    function _trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    }
    
    /**
     * °Ù·Ö±È¼ÆËã
     */
    function parsePercent(value, maxValue) {
        if (typeof value === 'string') {
            if (_trim(value).match(/%$/)) {
                return parseFloat(value) / 100 * maxValue;
            }

            return parseFloat(value);
        }

        return value;
    }
    
    /**
     * »ñÈ¡ÖÐÐÄ×ø±ê
     */ 
    function parseCenter(zr, center) {
        return [
            parsePercent(center[0], zr.getWidth()),
            parsePercent(center[1], zr.getHeight())
        ];
    }

    /**
     * »ñÈ¡×ÔÊÊÓ¦°ë¾¶
     */ 
    function parseRadius(zr, radius) {
        // ´«Êý×éÊµÏÖ»·ÐÎÍ¼£¬[ÄÚ°ë¾¶£¬Íâ°ë¾¶]£¬´«µ¥¸öÔòÄ¬ÈÏÎªÍâ°ë¾¶Îª
        if (!(radius instanceof Array)) {
            radius = [0, radius];
        }
        var zrSize = Math.min(zr.getWidth(), zr.getHeight()) / 2;
        return [
            parsePercent(radius[0], zrSize),
            parsePercent(radius[1], zrSize)
        ];
    }
    
    /**
     * Ã¿ÈýÎ»Ä¬ÈÏ¼Ó,¸ñÊ½»¯
     */
    function addCommas(x) {
        if (isNaN(x)) {
            return '-';
        }
        x = (x + '').split('.');
        return x[0].replace(/(\d{1,3})(?=(?:\d{3})+(?!\d))/g,'$1,') 
               + (x.length > 1 ? ('.' + x[1]) : '');
    }

    /**
     * »ñÈ¡Êý×ÖµÄÐ¡ÊýÎ»Êý
     * @param {number} val
     */
    
    // It is much faster than methods converting number to string as follows 
    //      var tmp = val.toString();
    //      return tmp.length - 1 - tmp.indexOf('.');
    // especially when precision is low
    function getPrecision(val) {
        var e = 1;
        var count = 0;
        while (Math.round(val * e) / e !== val) {
            e *= 10;
            count++;
        }
        return count;
    }
    
    return {
        parsePercent: parsePercent,
        parseCenter: parseCenter,
        parseRadius: parseRadius,
        addCommas: addCommas,
        getPrecision: getPrecision
    };
});
define('zrender/animation/Animation', ['require', './Clip', '../tool/color', '../tool/util', '../tool/event'], function (require) {
        
        'use strict';

        var Clip = require('./Clip');
        var color = require('../tool/color');
        var util = require('../tool/util');
        var Dispatcher = require('../tool/event').Dispatcher;

        var requestAnimationFrame = window.requestAnimationFrame
                                    || window.msRequestAnimationFrame
                                    || window.mozRequestAnimationFrame
                                    || window.webkitRequestAnimationFrame
                                    || function (func) {
                                        setTimeout(func, 16);
                                    };

        var arraySlice = Array.prototype.slice;

        /**
         * @typedef {Object} IZRenderStage
         * @property {Function} update
         */
        
        /** 
         * @alias module:zrender/animation/Animation
         * @constructor
         * @param {Object} [options]
         * @param {Function} [options.onframe]
         * @param {IZRenderStage} [options.stage]
         * @example
         *     var animation = new Animation();
         *     var obj = {
         *         x: 100,
         *         y: 100
         *     };
         *     animation.animate(node.position)
         *         .when(1000, {
         *             x: 500,
         *             y: 500
         *         })
         *         .when(2000, {
         *             x: 100,
         *             y: 100
         *         })
         *         .start('spline');
         */
        var Animation = function (options) {

            options = options || {};

            this.stage = options.stage || {};

            this.onframe = options.onframe || function() {};

            // private properties
            this._clips = [];

            this._running = false;

            this._time = 0;

            Dispatcher.call(this);
        };

        Animation.prototype = {
            /**
             * Ìí¼Ó¶¯»­Æ¬¶Î
             * @param {module:zrender/animation/Clip} clip
             */
            add: function(clip) {
                this._clips.push(clip);
            },
            /**
             * É¾³ý¶¯»­Æ¬¶Î
             * @param {module:zrender/animation/Clip} clip
             */
            remove: function(clip) {
                if (clip.__inStep) {
                    // Èç¹ûÊÇÔÚ step ÖÐ£¬²»ÄÜÖ±½ÓÒÆ³ý
                    // ÐèÒª±ê¼ÇÎª needsRemove È»ºóÔÚËùÓÐ clip step Íê³ÉºóÒÆ³ý
                    clip.__needsRemove = true;
                }
                else {
                    var idx = util.indexOf(this._clips, clip);
                    if (idx >= 0) {
                        this._clips.splice(idx, 1);
                    }
                }
            },
            _update: function() {

                var time = new Date().getTime();
                var delta = time - this._time;
                var clips = this._clips;
                var len = clips.length;

                var deferredEvents = [];
                var deferredClips = [];
                for (var i = 0; i < len; i++) {
                    var clip = clips[i];
                    clip.__inStep = true;
                    var e = clip.step(time);
                    clip.__inStep = false;
                    // Throw out the events need to be called after
                    // stage.update, like destroy
                    if (e) {
                        deferredEvents.push(e);
                        deferredClips.push(clip);
                    }
                }

                // Remove the finished clip
                for (var i = 0; i < len;) {
                    if (clips[i].__needsRemove) {
                        clips[i] = clips[len - 1];
                        clips.pop();
                        len--;
                    }
                    else {
                        i++;
                    }
                }

                len = deferredEvents.length;
                for (var i = 0; i < len; i++) {
                    deferredClips[i].fire(deferredEvents[i]);
                }

                this._time = time;

                this.onframe(delta);

                this.dispatch('frame', delta);

                if (this.stage.update) {
                    this.stage.update();
                }
            },
            /**
             * ¿ªÊ¼ÔËÐÐ¶¯»­
             */
            start: function () {
                var self = this;

                this._running = true;

                function step() {
                    if (self._running) {
                        
                        requestAnimationFrame(step);

                        self._update();
                    }
                }

                this._time = new Date().getTime();
                requestAnimationFrame(step);
            },
            /**
             * Í£Ö¹ÔËÐÐ¶¯»­
             */
            stop: function () {
                this._running = false;
            },
            /**
             * Çå³ýËùÓÐ¶¯»­Æ¬¶Î
             */
            clear : function () {
                this._clips = [];
            },
            /**
             * ¶ÔÒ»¸öÄ¿±ê´´½¨Ò»¸öanimator¶ÔÏó£¬¿ÉÒÔÖ¸¶¨Ä¿±êÖÐµÄÊôÐÔÊ¹ÓÃ¶¯»­
             * @param  {Object} target
             * @param  {Object} options
             * @param  {boolean} [options.loop=false] ÊÇ·ñÑ­»·²¥·Å¶¯»­
             * @param  {Function} [options.getter=null]
             *         Èç¹ûÖ¸¶¨getterº¯Êý£¬»áÍ¨¹ýgetterº¯ÊýÈ¡ÊôÐÔÖµ
             * @param  {Function} [options.setter=null]
             *         Èç¹ûÖ¸¶¨setterº¯Êý£¬»áÍ¨¹ýsetterº¯ÊýÉèÖÃÊôÐÔÖµ
             * @return {module:zrender/animation/Animation~Animator}
             */
            animate : function (target, options) {
                options = options || {};
                var deferred = new Animator(
                    target,
                    options.loop,
                    options.getter, 
                    options.setter
                );
                deferred.animation = this;
                return deferred;
            },
            constructor: Animation
        };

        util.merge(Animation.prototype, Dispatcher.prototype, true);

        function _defaultGetter(target, key) {
            return target[key];
        }

        function _defaultSetter(target, key, value) {
            target[key] = value;
        }

        function _interpolateNumber(p0, p1, percent) {
            return (p1 - p0) * percent + p0;
        }

        function _interpolateArray(p0, p1, percent, out, arrDim) {
            var len = p0.length;
            if (arrDim == 1) {
                for (var i = 0; i < len; i++) {
                    out[i] = _interpolateNumber(p0[i], p1[i], percent); 
                }
            }
            else {
                var len2 = p0[0].length;
                for (var i = 0; i < len; i++) {
                    for (var j = 0; j < len2; j++) {
                        out[i][j] = _interpolateNumber(
                            p0[i][j], p1[i][j], percent
                        );
                    }
                }
            }
        }

        function _isArrayLike(data) {
            switch (typeof data) {
                case 'undefined':
                case 'string':
                    return false;
            }
            
            return typeof data.length !== 'undefined';
        }

        function _catmullRomInterpolateArray(
            p0, p1, p2, p3, t, t2, t3, out, arrDim
        ) {
            var len = p0.length;
            if (arrDim == 1) {
                for (var i = 0; i < len; i++) {
                    out[i] = _catmullRomInterpolate(
                        p0[i], p1[i], p2[i], p3[i], t, t2, t3
                    );
                }
            }
            else {
                var len2 = p0[0].length;
                for (var i = 0; i < len; i++) {
                    for (var j = 0; j < len2; j++) {
                        out[i][j] = _catmullRomInterpolate(
                            p0[i][j], p1[i][j], p2[i][j], p3[i][j],
                            t, t2, t3
                        );
                    }
                }
            }
        }

        function _catmullRomInterpolate(p0, p1, p2, p3, t, t2, t3) {
            var v0 = (p2 - p0) * 0.5;
            var v1 = (p3 - p1) * 0.5;
            return (2 * (p1 - p2) + v0 + v1) * t3 
                    + (-3 * (p1 - p2) - 2 * v0 - v1) * t2
                    + v0 * t + p1;
        }

        function _cloneValue(value) {
            if (_isArrayLike(value)) {
                var len = value.length;
                if (_isArrayLike(value[0])) {
                    var ret = [];
                    for (var i = 0; i < len; i++) {
                        ret.push(arraySlice.call(value[i]));
                    }
                    return ret;
                }
                else {
                    return arraySlice.call(value);
                }
            }
            else {
                return value;
            }
        }

        function rgba2String(rgba) {
            rgba[0] = Math.floor(rgba[0]);
            rgba[1] = Math.floor(rgba[1]);
            rgba[2] = Math.floor(rgba[2]);

            return 'rgba(' + rgba.join(',') + ')';
        }

        /**
         * @alias module:zrender/animation/Animation~Animator
         * @constructor
         * @param {Object} target
         * @param {boolean} loop
         * @param {Function} getter
         * @param {Function} setter
         */
        var Animator = function(target, loop, getter, setter) {
            this._tracks = {};
            this._target = target;

            this._loop = loop || false;

            this._getter = getter || _defaultGetter;
            this._setter = setter || _defaultSetter;

            this._clipCount = 0;

            this._delay = 0;

            this._doneList = [];

            this._onframeList = [];

            this._clipList = [];
        };

        Animator.prototype = {
            /**
             * ÉèÖÃ¶¯»­¹Ø¼üÖ¡
             * @param  {number} time ¹Ø¼üÖ¡Ê±¼ä£¬µ¥Î»ÊÇms
             * @param  {Object} props ¹Ø¼üÖ¡µÄÊôÐÔÖµ£¬key-value±íÊ¾
             * @return {module:zrender/animation/Animation~Animator}
             */
            when : function(time /* ms */, props) {
                for (var propName in props) {
                    if (!this._tracks[propName]) {
                        this._tracks[propName] = [];
                        // If time is 0 
                        //  Then props is given initialize value
                        // Else
                        //  Initialize value from current prop value
                        if (time !== 0) {
                            this._tracks[propName].push({
                                time : 0,
                                value : _cloneValue(
                                    this._getter(this._target, propName)
                                )
                            });
                        }
                    }
                    this._tracks[propName].push({
                        time : parseInt(time, 10),
                        value : props[propName]
                    });
                }
                return this;
            },
            /**
             * Ìí¼Ó¶¯»­Ã¿Ò»Ö¡µÄ»Øµ÷º¯Êý
             * @param  {Function} callback
             * @return {module:zrender/animation/Animation~Animator}
             */
            during: function (callback) {
                this._onframeList.push(callback);
                return this;
            },
            /**
             * ¿ªÊ¼Ö´ÐÐ¶¯»­
             * @param  {string|Function} easing 
             *         ¶¯»­»º¶¯º¯Êý£¬Ïê¼û{@link module:zrender/animation/easing}
             * @return {module:zrender/animation/Animation~Animator}
             */
            start: function (easing) {

                var self = this;
                var setter = this._setter;
                var getter = this._getter;
                var useSpline = easing === 'spline';

                var ondestroy = function() {
                    self._clipCount--;
                    if (self._clipCount === 0) {
                        // Clear all tracks
                        self._tracks = {};

                        var len = self._doneList.length;
                        for (var i = 0; i < len; i++) {
                            self._doneList[i].call(self);
                        }
                    }
                };

                var createTrackClip = function (keyframes, propName) {
                    var trackLen = keyframes.length;
                    if (!trackLen) {
                        return;
                    }
                    // Guess data type
                    var firstVal = keyframes[0].value;
                    var isValueArray = _isArrayLike(firstVal);
                    var isValueColor = false;

                    // For vertices morphing
                    var arrDim = (
                            isValueArray 
                            && _isArrayLike(firstVal[0])
                        )
                        ? 2 : 1;
                    // Sort keyframe as ascending
                    keyframes.sort(function(a, b) {
                        return a.time - b.time;
                    });
                    var trackMaxTime;
                    if (trackLen) {
                        trackMaxTime = keyframes[trackLen - 1].time;
                    }
                    else {
                        return;
                    }
                    // Percents of each keyframe
                    var kfPercents = [];
                    // Value of each keyframe
                    var kfValues = [];
                    for (var i = 0; i < trackLen; i++) {
                        kfPercents.push(keyframes[i].time / trackMaxTime);
                        // Assume value is a color when it is a string
                        var value = keyframes[i].value;
                        if (typeof(value) == 'string') {
                            value = color.toArray(value);
                            if (value.length === 0) {    // Invalid color
                                value[0] = value[1] = value[2] = 0;
                                value[3] = 1;
                            }
                            isValueColor = true;
                        }
                        kfValues.push(value);
                    }

                    // Cache the key of last frame to speed up when 
                    // animation playback is sequency
                    var cacheKey = 0;
                    var cachePercent = 0;
                    var start;
                    var i;
                    var w;
                    var p0;
                    var p1;
                    var p2;
                    var p3;


                    if (isValueColor) {
                        var rgba = [ 0, 0, 0, 0 ];
                    }

                    var onframe = function (target, percent) {
                        // Find the range keyframes
                        // kf1-----kf2---------current--------kf3
                        // find kf2 and kf3 and do interpolation
                        if (percent < cachePercent) {
                            // Start from next key
                            start = Math.min(cacheKey + 1, trackLen - 1);
                            for (i = start; i >= 0; i--) {
                                if (kfPercents[i] <= percent) {
                                    break;
                                }
                            }
                            i = Math.min(i, trackLen - 2);
                        }
                        else {
                            for (i = cacheKey; i < trackLen; i++) {
                                if (kfPercents[i] > percent) {
                                    break;
                                }
                            }
                            i = Math.min(i - 1, trackLen - 2);
                        }
                        cacheKey = i;
                        cachePercent = percent;

                        var range = (kfPercents[i + 1] - kfPercents[i]);
                        if (range === 0) {
                            return;
                        }
                        else {
                            w = (percent - kfPercents[i]) / range;
                        }
                        if (useSpline) {
                            p1 = kfValues[i];
                            p0 = kfValues[i === 0 ? i : i - 1];
                            p2 = kfValues[i > trackLen - 2 ? trackLen - 1 : i + 1];
                            p3 = kfValues[i > trackLen - 3 ? trackLen - 1 : i + 2];
                            if (isValueArray) {
                                _catmullRomInterpolateArray(
                                    p0, p1, p2, p3, w, w * w, w * w * w,
                                    getter(target, propName),
                                    arrDim
                                );
                            }
                            else {
                                var value;
                                if (isValueColor) {
                                    value = _catmullRomInterpolateArray(
                                        p0, p1, p2, p3, w, w * w, w * w * w,
                                        rgba, 1
                                    );
                                    value = rgba2String(rgba);
                                }
                                else {
                                    value = _catmullRomInterpolate(
                                        p0, p1, p2, p3, w, w * w, w * w * w
                                    );
                                }
                                setter(
                                    target,
                                    propName,
                                    value
                                );
                            }
                        }
                        else {
                            if (isValueArray) {
                                _interpolateArray(
                                    kfValues[i], kfValues[i + 1], w,
                                    getter(target, propName),
                                    arrDim
                                );
                            }
                            else {
                                var value;
                                if (isValueColor) {
                                    _interpolateArray(
                                        kfValues[i], kfValues[i + 1], w,
                                        rgba, 1
                                    );
                                    value = rgba2String(rgba);
                                }
                                else {
                                    value = _interpolateNumber(kfValues[i], kfValues[i + 1], w);
                                }
                                setter(
                                    target,
                                    propName,
                                    value
                                );
                            }
                        }

                        for (i = 0; i < self._onframeList.length; i++) {
                            self._onframeList[i](target, percent);
                        }
                    };

                    var clip = new Clip({
                        target : self._target,
                        life : trackMaxTime,
                        loop : self._loop,
                        delay : self._delay,
                        onframe : onframe,
                        ondestroy : ondestroy
                    });

                    if (easing && easing !== 'spline') {
                        clip.easing = easing;
                    }
                    self._clipList.push(clip);
                    self._clipCount++;
                    self.animation.add(clip);
                };

                for (var propName in this._tracks) {
                    createTrackClip(this._tracks[propName], propName);
                }
                return this;
            },
            /**
             * Í£Ö¹¶¯»­
             */
            stop : function() {
                for (var i = 0; i < this._clipList.length; i++) {
                    var clip = this._clipList[i];
                    this.animation.remove(clip);
                }
                this._clipList = [];
            },
            /**
             * ÉèÖÃ¶¯»­ÑÓ³Ù¿ªÊ¼µÄÊ±¼ä
             * @param  {number} time µ¥Î»ms
             * @return {module:zrender/animation/Animation~Animator}
             */
            delay : function (time) {
                this._delay = time;
                return this;
            },
            /**
             * Ìí¼Ó¶¯»­½áÊøµÄ»Øµ÷
             * @param  {Function} cb
             * @return {module:zrender/animation/Animation~Animator}
             */
            done : function(cb) {
                if (cb) {
                    this._doneList.push(cb);
                }
                return this;
            }
        };

        return Animation;
    });
define('echarts/data/KDTree', ['require', './quickSelect'], function (require) {

    var quickSelect = require('./quickSelect');

    function Node(axis, data) {
        this.left = null;
        this.right = null;
        this.axis = axis;

        this.data = data;
    }

    /**
     * @constructor
     * @alias module:echarts/data/KDTree
     * @param {Array} points List of points.
     * each point needs an array property to repesent the actual data
     * @param {Number} [dimension]
     *        Point dimension.
     *        Default will use the first point's length as dimensiont
     */
    var KDTree = function (points, dimension) {
        if (!points.length) {
            return;
        }

        if (!dimension) {
            dimension = points[0].array.length;
        }
        this.dimension = dimension;
        this.root = this._buildTree(points, 0, points.length - 1, 0);

        // Use one stack to avoid allocation 
        // each time searching the nearest point
        this._stack = [];
        // Again avoid allocating a new array
        // each time searching nearest N points
        this._nearstNList = [];
    };

    /**
     * Resursively build the tree
     */
    KDTree.prototype._buildTree = function (points, left, right, axis) {
        if (right < left) {
            return null;
        }

        var medianIndex = Math.floor((left + right) / 2);
        medianIndex = quickSelect(
            points, left, right, medianIndex,
            function (a, b) {
                return a.array[axis] - b.array[axis];
            }
        );
        var median = points[medianIndex];

        var node = new Node(axis, median);

        axis = (axis + 1) % this.dimension;
        if (right > left) {
            node.left = this._buildTree(points, left, medianIndex - 1, axis);
            node.right = this._buildTree(points, medianIndex + 1, right, axis);   
        }

        return node;
    };

    /**
     * Find nearest point
     * @param  {Array} target Target point
     * @param  {Function} squaredDistance Squared distance function
     * @return {Array} Nearest point
     */
    KDTree.prototype.nearest = function (target, squaredDistance) {
        var curr = this.root;
        var stack = this._stack;
        var idx = 0;
        var minDist = Infinity;
        var nearestNode = null;
        if (curr.data !== target) {
            minDist = squaredDistance(curr.data, target);
            nearestNode = curr;
        }

        if (target.array[curr.axis] < curr.data.array[curr.axis]) {
            // Left first
            curr.right && (stack[idx++] = curr.right);
            curr.left && (stack[idx++] = curr.left);
        }
        else {
            // Right first
            curr.left && (stack[idx++] = curr.left);
            curr.right && (stack[idx++] = curr.right);
        }

        while (idx--) {
            curr = stack[idx];
            var currDist = target.array[curr.axis] - curr.data.array[curr.axis];
            var isLeft = currDist < 0;
            var needsCheckOtherSide = false;
            currDist = currDist * currDist;
            // Intersecting right hyperplane with minDist hypersphere
            if (currDist < minDist) {
                currDist = squaredDistance(curr.data, target);
                if (currDist < minDist && curr.data !== target) {
                    minDist = currDist;
                    nearestNode = curr;
                }
                needsCheckOtherSide = true;
            }
            if (isLeft) {
                if (needsCheckOtherSide) {
                    curr.right && (stack[idx++] = curr.right);
                }
                // Search in the left area
                curr.left && (stack[idx++] = curr.left);
            }
            else {
                if (needsCheckOtherSide) {
                    curr.left && (stack[idx++] = curr.left);
                }
                // Search the right area
                curr.right && (stack[idx++] = curr.right);
            }
        }

        return nearestNode.data;
    };

    KDTree.prototype._addNearest = function (found, dist, node) {
        var nearestNList = this._nearstNList;

        // Insert to the right position
        // Sort from small to large
        for (var i = found - 1; i > 0; i--) {
            if (dist >= nearestNList[i - 1].dist) {                
                break;
            }
            else {
                nearestNList[i].dist = nearestNList[i - 1].dist;
                nearestNList[i].node = nearestNList[i - 1].node;
            }
        }

        nearestNList[i].dist = dist;
        nearestNList[i].node = node;
    };

    /**
     * Find nearest N points
     * @param  {Array} target Target point
     * @param  {number} N
     * @param  {Function} squaredDistance Squared distance function
     * @param  {Array} [output] Output nearest N points
     */
    KDTree.prototype.nearestN = function (target, N, squaredDistance, output) {
        if (N <= 0) {
            output.length = 0;
            return output;
        }

        var curr = this.root;
        var stack = this._stack;
        var idx = 0;

        var nearestNList = this._nearstNList;
        for (var i = 0; i < N; i++) {
            // Allocate
            if (!nearestNList[i]) {
                nearestNList[i] = {};
            }
            nearestNList[i].dist = 0;
            nearestNList[i].node = null;
        }
        var currDist = squaredDistance(curr.data, target);

        var found = 0;
        if (curr.data !== target) {
            found++;
            this._addNearest(found, currDist, curr);
        }

        if (target.array[curr.axis] < curr.data.array[curr.axis]) {
            // Left first
            curr.right && (stack[idx++] = curr.right);
            curr.left && (stack[idx++] = curr.left);
        }
        else {
            // Right first
            curr.left && (stack[idx++] = curr.left);
            curr.right && (stack[idx++] = curr.right);
        }

        while (idx--) {
            curr = stack[idx];
            var currDist = target.array[curr.axis] - curr.data.array[curr.axis];
            var isLeft = currDist < 0;
            var needsCheckOtherSide = false;
            currDist = currDist * currDist;
            // Intersecting right hyperplane with minDist hypersphere
            if (found < N || currDist < nearestNList[found - 1].dist) {
                currDist = squaredDistance(curr.data, target);
                if (
                    (found < N || currDist < nearestNList[found - 1].dist)
                    && curr.data !== target
                ) {
                    if (found < N) {
                        found++;
                    }
                    this._addNearest(found, currDist, curr);
                }
                needsCheckOtherSide = true;
            }
            if (isLeft) {
                if (needsCheckOtherSide) {
                    curr.right && (stack[idx++] = curr.right);
                }
                // Search in the left area
                curr.left && (stack[idx++] = curr.left);
            }
            else {
                if (needsCheckOtherSide) {
                    curr.left && (stack[idx++] = curr.left);
                }
                // Search the right area
                curr.right && (stack[idx++] = curr.right);
            }
        }

        // Copy to output
        for (var i = 0; i < found; i++) {
            output[i] = nearestNList[i].node.data;
        }
        output.length = found;

        return output;
    };

    return KDTree;
});
define('echarts/data/quickSelect', ['require'], function (require) {

    function defaultCompareFunc(a, b) {
        return a - b;
    }

    function swapElement(list, idx0, idx1) {
        var tmp = list[idx0];
        list[idx0] = list[idx1];
        list[idx1] = tmp;
    }

    function select(list, left, right, nth, compareFunc) {
        var pivotIdx = left;
        while (right > left) {
            var pivotIdx = Math.round((right + left) / 2);
            var pivotValue = list[pivotIdx];
            // Swap pivot to the end
            swapElement(list, pivotIdx, right);
            pivotIdx = left;
            for (var i = left; i <= right - 1; i++) {
                if (compareFunc(pivotValue, list[i]) >= 0) {
                    swapElement(list, i, pivotIdx);
                    pivotIdx++;
                }
            }
            swapElement(list, right, pivotIdx);

            if (pivotIdx === nth) {
                return pivotIdx;
            } else if (pivotIdx < nth) {
                left = pivotIdx + 1;
            } else {
                right = pivotIdx - 1;
            }
        }
        // Left == right
        return left;
    }

    /**
     * @alias module:echarts/data/quickSelect
     * @param {Array} list
     * @param {number} [left]
     * @param {number} [right]
     * @param {number} nth
     * @param {Function} [compareFunc]
     * @example
     *     var quickSelect = require('echarts/data/quickSelect');
     *     var list = [5, 2, 1, 4, 3]
     *     quickSelect(list, 3);
     *     quickSelect(list, 0, 3, 1, function (a, b) {return a - b});
     *
     * @return {number}
     */
    function quickSelect(list, left, right, nth, compareFunc) {
        if (arguments.length <= 3) {
            nth = left;
            if (arguments.length == 2) {
                compareFunc = defaultCompareFunc;
            } else {
                compareFunc = right;
            }
            left = 0;
            right = list.length - 1;
        }
        return select(list, left, right, nth, compareFunc);
    }
    
    return quickSelect;
});
define('zrender/Handler', ['require', './config', './tool/env', './tool/event', './tool/util', './tool/vector', './tool/matrix', './mixin/Eventful'], function (require) {

        'use strict';

        var config = require('./config');
        var env = require('./tool/env');
        var eventTool = require('./tool/event');
        var util = require('./tool/util');
        var vec2 = require('./tool/vector');
        var mat2d = require('./tool/matrix');
        var EVENT = config.EVENT;

        var Eventful = require('./mixin/Eventful');

        var domHandlerNames = [
            'resize', 'click', 'dblclick',
            'mousewheel', 'mousemove', 'mouseout', 'mouseup', 'mousedown',
            'touchstart', 'touchend', 'touchmove'
        ];

        var isZRenderElement = function (event) {
            // ÔÝÊ±ºöÂÔ IE8-
            if (window.G_vmlCanvasManager) {
                return true;
            }

            event = event || window.event;

            // ½øÈë¶ÔÏóÓÅÏÈ~
            var target = event.toElement
                          || event.relatedTarget
                          || event.srcElement
                          || event.target;

            return target && target.className.match(config.elementClassName)
        };

        var domHandlers = {
            /**
             * ´°¿Ú´óÐ¡¸Ä±äÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            resize: function (event) {
                event = event || window.event;
                this._lastHover = null;
                this._isMouseDown = 0;
                
                // ·Ö·¢config.EVENT.RESIZEÊÂ¼þ£¬global
                this.dispatch(EVENT.RESIZE, event);
            },

            /**
             * µã»÷ÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            click: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                event = this._zrenderEventFixed(event);

                // ·Ö·¢config.EVENT.CLICKÊÂ¼þ
                var _lastHover = this._lastHover;
                if ((_lastHover && _lastHover.clickable)
                    || !_lastHover
                ) {

                    // ÅÐ¶ÏÃ»ÓÐ·¢ÉúÍÏ×§²Å´¥·¢clickÊÂ¼þ
                    if (this._clickThreshold < 5) {
                        this._dispatchAgency(_lastHover, EVENT.CLICK, event);
                    }
                }

                this._mousemoveHandler(event);
            },
            
            /**
             * Ë«»÷ÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            dblclick: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                event = event || window.event;
                event = this._zrenderEventFixed(event);

                // ·Ö·¢config.EVENT.DBLCLICKÊÂ¼þ
                var _lastHover = this._lastHover;
                if ((_lastHover && _lastHover.clickable)
                    || !_lastHover
                ) {

                    // ÅÐ¶ÏÃ»ÓÐ·¢ÉúÍÏ×§²Å´¥·¢dblclickÊÂ¼þ
                    if (this._clickThreshold < 5) {
                        this._dispatchAgency(_lastHover, EVENT.DBLCLICK, event);
                    }
                }

                this._mousemoveHandler(event);
            },
            

            /**
             * Êó±ê¹öÂÖÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            mousewheel: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                event = this._zrenderEventFixed(event);

                // http://www.sitepoint.com/html5-javascript-mouse-wheel/
                // https://developer.mozilla.org/en-US/docs/DOM/DOM_event_reference/mousewheel
                var delta = event.wheelDelta // Webkit
                            || -event.detail; // Firefox
                var scale = delta > 0 ? 1.1 : 1 / 1.1;

                var needsRefresh = false;

                var mouseX = this._mouseX;
                var mouseY = this._mouseY;
                this.painter.eachBuildinLayer(function (layer) {
                    var pos = layer.position;
                    if (layer.zoomable) {
                        layer.__zoom = layer.__zoom || 1;
                        var newZoom = layer.__zoom;
                        newZoom *= scale;
                        newZoom = Math.max(
                            Math.min(layer.maxZoom, newZoom),
                            layer.minZoom
                        );
                        scale = newZoom / layer.__zoom;
                        layer.__zoom = newZoom;
                        // Keep the mouse center when scaling
                        pos[0] -= (mouseX - pos[0]) * (scale - 1);
                        pos[1] -= (mouseY - pos[1]) * (scale - 1);
                        layer.scale[0] *= scale;
                        layer.scale[1] *= scale;
                        layer.dirty = true;
                        needsRefresh = true;

                        // Prevent browser default scroll action 
                        eventTool.stop(event);
                    }
                });
                if (needsRefresh) {
                    this.painter.refresh();
                }

                // ·Ö·¢config.EVENT.MOUSEWHEELÊÂ¼þ
                this._dispatchAgency(this._lastHover, EVENT.MOUSEWHEEL, event);
                this._mousemoveHandler(event);
            },

            /**
             * Êó±ê£¨ÊÖÖ¸£©ÒÆ¶¯ÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            mousemove: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                if (this.painter.isLoading()) {
                    return;
                }

                event = this._zrenderEventFixed(event);
                this._lastX = this._mouseX;
                this._lastY = this._mouseY;
                this._mouseX = eventTool.getX(event);
                this._mouseY = eventTool.getY(event);
                var dx = this._mouseX - this._lastX;
                var dy = this._mouseY - this._lastY;

                // ¿ÉÄÜ³öÏÖconfig.EVENT.DRAGSTARTÊÂ¼þ
                // ±ÜÃâÊÖ¶¶µã»÷ÎóÈÏÎªÍÏ×§
                // if (this._mouseX - this._lastX > 1 || this._mouseY - this._lastY > 1) {
                this._processDragStart(event);
                // }
                this._hasfound = 0;
                this._event = event;

                this._iterateAndFindHover();

                // ÕÒµ½µÄÔÚµü´úº¯ÊýÀï×öÁË´¦Àí£¬Ã»ÕÒµ½µÃÔÚµü´úÍêºó´¦Àí
                if (!this._hasfound) {
                    // ¹ýÂËÊ×´ÎÍÏ×§²úÉúµÄmouseoutºÍdragLeave
                    if (!this._draggingTarget
                        || (this._lastHover && this._lastHover != this._draggingTarget)
                    ) {
                        // ¿ÉÄÜ³öÏÖconfig.EVENT.MOUSEOUTÊÂ¼þ
                        this._processOutShape(event);

                        // ¿ÉÄÜ³öÏÖconfig.EVENT.DRAGLEAVEÊÂ¼þ
                        this._processDragLeave(event);
                    }

                    this._lastHover = null;
                    this.storage.delHover();
                    this.painter.clearHover();
                }

                // set cursor for root element
                var cursor = 'default';

                // Èç¹û´æÔÚÍÏ×§ÖÐÔªËØ£¬±»ÍÏ×§µÄÍ¼ÐÎÔªËØ×îºóaddHover
                if (this._draggingTarget) {
                    this.storage.drift(this._draggingTarget.id, dx, dy);
                    this._draggingTarget.modSelf();
                    this.storage.addHover(this._draggingTarget);

                    // ÍÏ×§²»´¥·¢clickÊÂ¼þ
                    this._clickThreshold++;
                }
                else if (this._isMouseDown) {
                    var needsRefresh = false;
                    // Layer dragging
                    this.painter.eachBuildinLayer(function (layer) {
                        if (layer.panable) {
                            // PENDING
                            cursor = 'move';
                            // Keep the mouse center when scaling
                            layer.position[0] += dx;
                            layer.position[1] += dy;
                            needsRefresh = true;
                            layer.dirty = true;
                        }
                    });
                    if (needsRefresh) {
                        this.painter.refresh();
                    }
                }

                if (this._draggingTarget || (this._hasfound && this._lastHover.draggable)) {
                    cursor = 'move';
                }
                else if (this._hasfound && this._lastHover.clickable) {
                    cursor = 'pointer';
                }
                this.root.style.cursor = cursor;

                // ·Ö·¢config.EVENT.MOUSEMOVEÊÂ¼þ
                this._dispatchAgency(this._lastHover, EVENT.MOUSEMOVE, event);

                if (this._draggingTarget || this._hasfound || this.storage.hasHoverShape()) {
                    this.painter.refreshHover();
                }
            },

            /**
             * Êó±ê£¨ÊÖÖ¸£©Àë¿ªÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            mouseout: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                event = this._zrenderEventFixed(event);

                var element = event.toElement || event.relatedTarget;
                if (element != this.root) {
                    while (element && element.nodeType != 9) {
                        // ºöÂÔ°üº¬ÔÚrootÖÐµÄdomÒýÆðµÄmouseOut
                        if (element == this.root) {
                            this._mousemoveHandler(event);
                            return;
                        }

                        element = element.parentNode;
                    }
                }

                event.zrenderX = this._lastX;
                event.zrenderY = this._lastY;
                this.root.style.cursor = 'default';
                this._isMouseDown = 0;

                this._processOutShape(event);
                this._processDrop(event);
                this._processDragEnd(event);
                if (!this.painter.isLoading()) {
                    this.painter.refreshHover();
                }
                
                this.dispatch(EVENT.GLOBALOUT, event);
            },

            /**
             * Êó±ê£¨ÊÖÖ¸£©°´ÏÂÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            mousedown: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                // ÖØÖÃ clickThreshold
                this._clickThreshold = 0;

                if (this._lastDownButton == 2) {
                    this._lastDownButton = event.button;
                    this._mouseDownTarget = null;
                    // ½ö×÷Îª¹Ø±ÕÓÒ¼ü²Ëµ¥Ê¹ÓÃ
                    return;
                }

                this._lastMouseDownMoment = new Date();
                event = this._zrenderEventFixed(event);
                this._isMouseDown = 1;

                // ·Ö·¢config.EVENT.MOUSEDOWNÊÂ¼þ
                this._mouseDownTarget = this._lastHover;
                this._dispatchAgency(this._lastHover, EVENT.MOUSEDOWN, event);
                this._lastDownButton = event.button;
            },

            /**
             * Êó±ê£¨ÊÖÖ¸£©Ì§ÆðÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            mouseup: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                event = this._zrenderEventFixed(event);
                this.root.style.cursor = 'default';
                this._isMouseDown = 0;
                this._mouseDownTarget = null;

                // ·Ö·¢config.EVENT.MOUSEUPÊÂ¼þ
                this._dispatchAgency(this._lastHover, EVENT.MOUSEUP, event);
                this._processDrop(event);
                this._processDragEnd(event);
            },

            /**
             * Touch¿ªÊ¼ÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            touchstart: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                // eventTool.stop(event);// ×èÖ¹ä¯ÀÀÆ÷Ä¬ÈÏÊÂ¼þ£¬ÖØÒª
                event = this._zrenderEventFixed(event, true);
                this._lastTouchMoment = new Date();

                // Æ½°å²¹³äÒ»´ÎfindHover
                this._mobileFindFixed(event);
                this._mousedownHandler(event);
            },

            /**
             * TouchÒÆ¶¯ÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            touchmove: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                event = this._zrenderEventFixed(event, true);
                this._mousemoveHandler(event);
                if (this._isDragging) {
                    eventTool.stop(event);// ×èÖ¹ä¯ÀÀÆ÷Ä¬ÈÏÊÂ¼þ£¬ÖØÒª
                }
            },

            /**
             * Touch½áÊøÏìÓ¦º¯Êý
             * @inner
             * @param {Event} event
             */
            touchend: function (event, manually) {
                if (! isZRenderElement(event) && ! manually) {
                    return;
                }

                // eventTool.stop(event);// ×èÖ¹ä¯ÀÀÆ÷Ä¬ÈÏÊÂ¼þ£¬ÖØÒª
                event = this._zrenderEventFixed(event, true);
                this._mouseupHandler(event);
                
                var now = new Date();
                if (now - this._lastTouchMoment < EVENT.touchClickDelay) {
                    this._mobileFindFixed(event);
                    this._clickHandler(event);
                    if (now - this._lastClickMoment < EVENT.touchClickDelay / 2) {
                        this._dblclickHandler(event);
                        if (this._lastHover && this._lastHover.clickable) {
                            eventTool.stop(event);// ×èÖ¹ä¯ÀÀÆ÷Ä¬ÈÏÊÂ¼þ£¬ÖØÒª
                        }
                    }
                    this._lastClickMoment = now;
                }
                this.painter.clearHover();
            }
        };

        /**
         * bindÒ»¸ö²ÎÊýµÄfunction
         * 
         * @inner
         * @param {Function} handler ÒªbindµÄfunction
         * @param {Object} context ÔËÐÐÊ±this»·¾³
         * @return {Function}
         */
        // function bind1Arg(handler, context) {
        //     return function (e) {
        //         return handler.call(context, e);
        //     };
        // }
        function bind2Arg(handler, context) {
            return function (arg1, arg2) {
                return handler.call(context, arg1, arg2);
            };
        }

        function bind3Arg(handler, context) {
            return function (arg1, arg2, arg3) {
                return handler.call(context, arg1, arg2, arg3);
            };
        }
        /**
         * Îª¿ØÖÆÀàÊµÀý³õÊ¼»¯dom ÊÂ¼þ´¦Àíº¯Êý
         * 
         * @inner
         * @param {module:zrender/Handler} instance ¿ØÖÆÀàÊµÀý
         */
        function initDomHandler(instance) {
            var len = domHandlerNames.length;
            while (len--) {
                var name = domHandlerNames[len];
                instance['_' + name + 'Handler'] = bind2Arg(domHandlers[name], instance);
            }
        }

        /**
         * @alias module:zrender/Handler
         * @constructor
         * @extends module:zrender/mixin/Eventful
         * @param {HTMLElement} root »æÍ¼ÇøÓò
         * @param {module:zrender/Storage} storage StorageÊµÀý
         * @param {module:zrender/Painter} painter PainterÊµÀý
         */
        var Handler = function(root, storage, painter) {
            // Ìí¼ÓÊÂ¼þ·Ö·¢Æ÷ÌØÐÔ
            Eventful.call(this);

            this.root = root;
            this.storage = storage;
            this.painter = painter;

            // ¸÷ÖÖÊÂ¼þ±êÊ¶µÄË½ÓÐ±äÁ¿
            // this._hasfound = false;              //ÊÇ·ñÕÒµ½hoverÍ¼ÐÎÔªËØ
            // this._lastHover = null;              //×îºóÒ»¸öhoverÍ¼ÐÎÔªËØ
            // this._mouseDownTarget = null;
            // this._draggingTarget = null;         //µ±Ç°±»ÍÏ×§µÄÍ¼ÐÎÔªËØ
            // this._isMouseDown = false;
            // this._isDragging = false;
            // this._lastMouseDownMoment;
            // this._lastTouchMoment;
            // this._lastDownButton;

            this._lastX = 
            this._lastY = 
            this._mouseX = 
            this._mouseY = 0;

            this._findHover = bind3Arg(findHover, this);
            this._domHover = painter.getDomHover();
            initDomHandler(this);

            // ³õÊ¼»¯£¬ÊÂ¼þ°ó¶¨£¬Ö§³ÖµÄËùÓÐÊÂ¼þ¶¼ÓÉÈçÏÂÔ­ÉúÊÂ¼þ¼ÆËãµÃÀ´
            if (window.addEventListener) {
                window.addEventListener('resize', this._resizeHandler);
                
                if (env.os.tablet || env.os.phone) {
                    // mobileÖ§³Ö
                    root.addEventListener('touchstart', this._touchstartHandler);
                    root.addEventListener('touchmove', this._touchmoveHandler);
                    root.addEventListener('touchend', this._touchendHandler);
                }
                else {
                    // mobileµÄclick/move/up/down×Ô¼ºÄ£Äâ
                    root.addEventListener('click', this._clickHandler);
                    root.addEventListener('dblclick', this._dblclickHandler);
                    root.addEventListener('mousewheel', this._mousewheelHandler);
                    root.addEventListener('mousemove', this._mousemoveHandler);
                    root.addEventListener('mousedown', this._mousedownHandler);
                    root.addEventListener('mouseup', this._mouseupHandler);
                } 
                root.addEventListener('DOMMouseScroll', this._mousewheelHandler);
                root.addEventListener('mouseout', this._mouseoutHandler);
            }
            else {
                window.attachEvent('onresize', this._resizeHandler);

                root.attachEvent('onclick', this._clickHandler);
                //root.attachEvent('ondblclick ', this._dblclickHandler);
                root.ondblclick = this._dblclickHandler;
                root.attachEvent('onmousewheel', this._mousewheelHandler);
                root.attachEvent('onmousemove', this._mousemoveHandler);
                root.attachEvent('onmouseout', this._mouseoutHandler);
                root.attachEvent('onmousedown', this._mousedownHandler);
                root.attachEvent('onmouseup', this._mouseupHandler);
            }
        };

        /**
         * ×Ô¶¨ÒåÊÂ¼þ°ó¶¨
         * @param {string} eventName ÊÂ¼þÃû³Æ£¬resize£¬hover£¬drag£¬etc~
         * @param {Function} handler ÏìÓ¦º¯Êý
         * @param {Object} [context] ÏìÓ¦º¯Êý
         */
        Handler.prototype.on = function (eventName, handler, context) {
            this.bind(eventName, handler, context);
            return this;
        };

        /**
         * ×Ô¶¨ÒåÊÂ¼þ½â°ó
         * @param {string} eventName ÊÂ¼þÃû³Æ£¬resize£¬hover£¬drag£¬etc~
         * @param {Function} handler ÏìÓ¦º¯Êý
         */
        Handler.prototype.un = function (eventName, handler) {
            this.unbind(eventName, handler);
            return this;
        };

        /**
         * ÊÂ¼þ´¥·¢
         * @param {string} eventName ÊÂ¼þÃû³Æ£¬resize£¬hover£¬drag£¬etc~
         * @param {event=} eventArgs event domÊÂ¼þ¶ÔÏó
         */
        Handler.prototype.trigger = function (eventName, eventArgs) {
            switch (eventName) {
                case EVENT.RESIZE:
                case EVENT.CLICK:
                case EVENT.DBLCLICK:
                case EVENT.MOUSEWHEEL:
                case EVENT.MOUSEMOVE:
                case EVENT.MOUSEDOWN:
                case EVENT.MOUSEUP:
                case EVENT.MOUSEOUT:
                    this['_' + eventName + 'Handler'](eventArgs, true);
                    break;
            }
        };

        /**
         * ÊÍ·Å£¬½â°óËùÓÐÊÂ¼þ
         */
        Handler.prototype.dispose = function () {
            var root = this.root;

            if (window.removeEventListener) {
                window.removeEventListener('resize', this._resizeHandler);

                if (env.os.tablet || env.os.phone) {
                    // mobileÖ§³Ö
                    root.removeEventListener('touchstart', this._touchstartHandler);
                    root.removeEventListener('touchmove', this._touchmoveHandler);
                    root.removeEventListener('touchend', this._touchendHandler);
                }
                else {
                    // mobileµÄclick×Ô¼ºÄ£Äâ
                    root.removeEventListener('click', this._clickHandler);
                    root.removeEventListener('dblclick', this._dblclickHandler);
                    root.removeEventListener('mousewheel', this._mousewheelHandler);
                    root.removeEventListener('mousemove', this._mousemoveHandler);
                    root.removeEventListener('mousedown', this._mousedownHandler);
                    root.removeEventListener('mouseup', this._mouseupHandler);
                }
                root.removeEventListener('DOMMouseScroll', this._mousewheelHandler);
                root.removeEventListener('mouseout', this._mouseoutHandler);
            }
            else {
                window.detachEvent('onresize', this._resizeHandler);

                root.detachEvent('onclick', this._clickHandler);
                root.detachEvent('dblclick', this._dblclickHandler);
                root.detachEvent('onmousewheel', this._mousewheelHandler);
                root.detachEvent('onmousemove', this._mousemoveHandler);
                root.detachEvent('onmouseout', this._mouseoutHandler);
                root.detachEvent('onmousedown', this._mousedownHandler);
                root.detachEvent('onmouseup', this._mouseupHandler);
            }

            this.root =
            this._domHover =
            this.storage =
            this.painter = null;
            
            this.un();
        };

        /**
         * ÍÏ×§¿ªÊ¼
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processDragStart = function (event) {
            var _lastHover = this._lastHover;

            if (this._isMouseDown
                && _lastHover
                && _lastHover.draggable
                && !this._draggingTarget
                && this._mouseDownTarget == _lastHover
            ) {
                // ÍÏ×§µã»÷ÉúÐ§Ê±³¤·§ÃÅ£¬Ä³Ð©³¡¾°ÐèÒª½µµÍÍÏ×§Ãô¸Ð¶È
                if (_lastHover.dragEnableTime && 
                    new Date() - this._lastMouseDownMoment < _lastHover.dragEnableTime
                ) {
                    return;
                }

                var _draggingTarget = _lastHover;
                this._draggingTarget = _draggingTarget;
                this._isDragging = 1;

                _draggingTarget.invisible = true;
                this.storage.mod(_draggingTarget.id);

                // ·Ö·¢config.EVENT.DRAGSTARTÊÂ¼þ
                this._dispatchAgency(
                    _draggingTarget,
                    EVENT.DRAGSTART,
                    event
                );
                this.painter.refresh();
            }
        };

        /**
         * ÍÏ×§½øÈëÄ¿±êÔªËØ
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processDragEnter = function (event) {
            if (this._draggingTarget) {
                // ·Ö·¢config.EVENT.DRAGENTERÊÂ¼þ
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGENTER,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * ÍÏ×§ÔÚÄ¿±êÔªËØÉÏÒÆ¶¯
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processDragOver = function (event) {
            if (this._draggingTarget) {
                // ·Ö·¢config.EVENT.DRAGOVERÊÂ¼þ
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGOVER,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * ÍÏ×§Àë¿ªÄ¿±êÔªËØ
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processDragLeave = function (event) {
            if (this._draggingTarget) {
                // ·Ö·¢config.EVENT.DRAGLEAVEÊÂ¼þ
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DRAGLEAVE,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * ÍÏ×§ÔÚÄ¿±êÔªËØÉÏÍê³É
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processDrop = function (event) {
            if (this._draggingTarget) {
                this._draggingTarget.invisible = false;
                this.storage.mod(this._draggingTarget.id);
                this.painter.refresh();

                // ·Ö·¢config.EVENT.DROPÊÂ¼þ
                this._dispatchAgency(
                    this._lastHover,
                    EVENT.DROP,
                    event,
                    this._draggingTarget
                );
            }
        };

        /**
         * ÍÏ×§½áÊø
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processDragEnd = function (event) {
            if (this._draggingTarget) {
                // ·Ö·¢config.EVENT.DRAGENDÊÂ¼þ
                this._dispatchAgency(
                    this._draggingTarget,
                    EVENT.DRAGEND,
                    event
                );

                this._lastHover = null;
            }

            this._isDragging = 0;
            this._draggingTarget = null;
        };

        /**
         * Êó±êÔÚÄ³¸öÍ¼ÐÎÔªËØÉÏÒÆ¶¯
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processOverShape = function (event) {
            // ·Ö·¢config.EVENT.MOUSEOVERÊÂ¼þ
            this._dispatchAgency(this._lastHover, EVENT.MOUSEOVER, event);
        };

        /**
         * Êó±êÀë¿ªÄ³¸öÍ¼ÐÎÔªËØ
         * 
         * @private
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         */
        Handler.prototype._processOutShape = function (event) {
            // ·Ö·¢config.EVENT.MOUSEOUTÊÂ¼þ
            this._dispatchAgency(this._lastHover, EVENT.MOUSEOUT, event);
        };

        /**
         * ÊÂ¼þ·Ö·¢´úÀí
         * 
         * @private
         * @param {Object} targetShape Ä¿±êÍ¼ÐÎÔªËØ
         * @param {string} eventName ÊÂ¼þÃû³Æ
         * @param {Object} event ÊÂ¼þ¶ÔÏó
         * @param {Object=} draggedShape ÍÏ×§ÊÂ¼þÌØÓÐ£¬µ±Ç°±»ÍÏ×§Í¼ÐÎÔªËØ
         */
        Handler.prototype._dispatchAgency = function (targetShape, eventName, event, draggedShape) {
            var eventHandler = 'on' + eventName;
            var eventPacket = {
                type : eventName,
                event : event,
                target : targetShape,
                cancelBubble: false
            };

            var el = targetShape;

            if (draggedShape) {
                eventPacket.dragged = draggedShape;
            }

            while (el) {
                el[eventHandler] 
                && (eventPacket.cancelBubble = el[eventHandler](eventPacket));
                el.dispatch(eventName, eventPacket);

                el = el.parent;
                
                if (eventPacket.cancelBubble) {
                    break;
                }
            }

            if (targetShape) {
                // Ã°ÅÝµ½¶¥¼¶ zrender ¶ÔÏó
                if (!eventPacket.cancelBubble) {
                    this.dispatch(eventName, eventPacket);
                }
            }
            else if (!draggedShape) {
                // ÎÞhoverÄ¿±ê£¬ÎÞÍÏ×§¶ÔÏó£¬Ô­ÉúÊÂ¼þ·Ö·¢
                var eveObj = {
                    type: eventName,
                    event: event
                };
                this.dispatch(eventName, eveObj);
                // ·Ö·¢ÊÂ¼þµ½ÓÃ»§×Ô¶¨Òå²ã
                this.painter.eachOtherLayer(function (layer) {
                    if (typeof(layer[eventHandler]) == 'function') {
                        layer[eventHandler](eveObj);
                    }
                    if (layer.dispatch) {
                        layer.dispatch(eventName, eveObj);
                    }
                });
            }
        };

        /**
         * µü´úÑ°ÕÒhover shape
         * @private
         * @method
         */
        Handler.prototype._iterateAndFindHover = (function() {
            var invTransform = mat2d.create();
            return function() {
                var list = this.storage.getShapeList();
                var currentZLevel;
                var currentLayer;
                var tmp = [ 0, 0 ];
                for (var i = list.length - 1; i >= 0 ; i--) {
                    var shape = list[i];

                    if (currentZLevel !== shape.zlevel) {
                        currentLayer = this.painter.getLayer(shape.zlevel, currentLayer);
                        tmp[0] = this._mouseX;
                        tmp[1] = this._mouseY;

                        if (currentLayer.needTransform) {
                            mat2d.invert(invTransform, currentLayer.transform);
                            vec2.applyTransform(tmp, tmp, invTransform);
                        }
                    }

                    if (this._findHover(shape, tmp[0], tmp[1])) {
                        break;
                    }
                }
            };
        })();
        
        // touchÖ¸¼â´í¾õµÄ³¢ÊÔÆ«ÒÆÁ¿ÅäÖÃ
        var MOBILE_TOUCH_OFFSETS = [
            { x: 10 },
            { x: -20 },
            { x: 10, y: 10 },
            { y: -20 }
        ];

        // touchÓÐÖ¸¼â´í¾õ£¬ËÄÏò³¢ÊÔ£¬ÈÃtouchÉÏµÄµã»÷¸üºÃ´¥·¢ÊÂ¼þ
        Handler.prototype._mobileFindFixed = function (event) {
            this._lastHover = null;
            this._mouseX = event.zrenderX;
            this._mouseY = event.zrenderY;

            this._event = event;

            this._iterateAndFindHover();
            for (var i = 0; !this._lastHover && i < MOBILE_TOUCH_OFFSETS.length ; i++) {
                var offset = MOBILE_TOUCH_OFFSETS[ i ];
                offset.x && (this._mouseX += offset.x);
                offset.y && (this._mouseY += offset.y);

                this._iterateAndFindHover();
            }

            if (this._lastHover) {
                event.zrenderX = this._mouseX;
                event.zrenderY = this._mouseY;
            }
        };

        /**
         * µü´úº¯Êý£¬²éÕÒhoverµ½µÄÍ¼ÐÎÔªËØ²¢¼´Ê±×öÐ©ÊÂ¼þ·Ö·¢
         * 
         * @inner
         * @param {Object} shape Í¼ÐÎÔªËØ
         * @param {number} x
         * @param {number} y
         */
        function findHover(shape, x, y) {
            if (
                (this._draggingTarget && this._draggingTarget.id == shape.id) // µü´úµ½µ±Ç°ÍÏ×§µÄÍ¼ÐÎÉÏ
                || shape.isSilent() // ´ò½´ÓÍµÄÂ·¹ý£¬É¶¶¼²»ÏìÓ¦µÄshape~
            ) {
                return false;
            }

            var event = this._event;
            if (shape.isCover(x, y)) {
                if (shape.hoverable) {
                    this.storage.addHover(shape);
                }
                // ²éÕÒÊÇ·ñÔÚ clipShape ÖÐ
                var p = shape.parent;
                while (p) {
                    if (p.clipShape && !p.clipShape.isCover(this._mouseX, this._mouseY))  {
                        // ÒÑ¾­±»×æÏÈ clip µôÁË
                        return false;
                    }
                    p = p.parent;
                }

                if (this._lastHover != shape) {
                    this._processOutShape(event);

                    // ¿ÉÄÜ³öÏÖconfig.EVENT.DRAGLEAVEÊÂ¼þ
                    this._processDragLeave(event);

                    this._lastHover = shape;

                    // ¿ÉÄÜ³öÏÖconfig.EVENT.DRAGENTERÊÂ¼þ
                    this._processDragEnter(event);
                }

                this._processOverShape(event);

                // ¿ÉÄÜ³öÏÖconfig.EVENT.DRAGOVER
                this._processDragOver(event);

                this._hasfound = 1;

                return true;    // ÕÒµ½ÔòÖÐ¶Ïµü´ú²éÕÒ
            }

            return false;
        }

        /**
         * Èç¹û´æÔÚµÚÈý·½Ç¶ÈëµÄÒ»Ð©dom´¥·¢µÄÊÂ¼þ£¬»òtouchÊÂ¼þ£¬ÐèÒª×ª»»Ò»ÏÂÊÂ¼þ×ø±ê
         * 
         * @private
         */
        Handler.prototype._zrenderEventFixed = function (event, isTouch) {
            if (event.zrenderFixed) {
                return event;
            }

            if (!isTouch) {
                event = event || window.event;
                // ½øÈë¶ÔÏóÓÅÏÈ~
                var target = event.toElement
                              || event.relatedTarget
                              || event.srcElement
                              || event.target;

                if (target && target != this._domHover) {
                    event.zrenderX = (typeof event.offsetX != 'undefined'
                                        ? event.offsetX
                                        : event.layerX)
                                      + target.offsetLeft;
                    event.zrenderY = (typeof event.offsetY != 'undefined'
                                        ? event.offsetY
                                        : event.layerY)
                                      + target.offsetTop;
                }
            }
            else {
                var touch = event.type != 'touchend'
                                ? event.targetTouches[0]
                                : event.changedTouches[0];
                if (touch) {
                    var rBounding = this.painter._domRoot.getBoundingClientRect();
                    // touchÊÂ¼þ×ø±êÊÇÈ«ÆÁµÄ~
                    event.zrenderX = touch.clientX - rBounding.left;
                    event.zrenderY = touch.clientY - rBounding.top;
                }
            }

            event.zrenderFixed = 1;
            return event;
        };

        util.merge(Handler.prototype, Eventful.prototype, true);

        return Handler;
    });
define('zrender/Layer', ['require', './mixin/Transformable', './tool/util', './config'], function (require) {

    var Transformable = require('./mixin/Transformable');
    var util = require('./tool/util');
    var vmlCanvasManager = window['G_vmlCanvasManager'];
    var config = require('./config');

    function returnFalse() {
        return false;
    }

    /**
     * ´´½¨dom
     * 
     * @inner
     * @param {string} id dom id ´ýÓÃ
     * @param {string} type dom type£¬such as canvas, div etc.
     * @param {Painter} painter painter instance
     */
    function createDom(id, type, painter) {
        var newDom = document.createElement(type);
        var width = painter.getWidth();
        var height = painter.getHeight();

        // Ã»appendÄØ£¬ÇëÔ­ÁÂÎÒÕâÑùÐ´£¬ÇåÎú~
        newDom.style.position = 'absolute';
        newDom.style.left = 0;
        newDom.style.top = 0;
        newDom.style.width = width + 'px';
        newDom.style.height = height + 'px';
        newDom.width = width * config.devicePixelRatio;
        newDom.height = height * config.devicePixelRatio;

        // id²»×÷ÎªË÷ÒýÓÃ£¬±ÜÃâ¿ÉÄÜÔì³ÉµÄÖØÃû£¬¶¨ÒåÎªË½ÓÐÊôÐÔ
        newDom.setAttribute('data-zr-dom-id', id);
        return newDom;
    }

    /**
     * @alias module:zrender/Layer
     * @constructor
     * @extends module:zrender/mixin/Transformable
     * @param {string} id
     * @param {module:zrender/Painter} painter
     */
    var Layer = function(id, painter) {

        this.id = id;

        this.dom = createDom(id, 'canvas', painter);
        this.dom.onselectstart = returnFalse; // ±ÜÃâÒ³ÃæÑ¡ÖÐµÄÞÏÞÎ
        this.dom.style['-webkit-user-select'] = 'none';
        this.dom.style['user-select'] = 'none';
        this.dom.style['-webkit-touch-callout'] = 'none';
        this.dom.style['-webkit-tap-highlight-color'] = 'rgba(0,0,0,0)';

        this.dom.className = config.elementClassName;

        vmlCanvasManager && vmlCanvasManager.initElement(this.dom);

        this.domBack = null;
        this.ctxBack = null;

        this.painter = painter;

        this.unusedCount = 0;

        this.config = null;

        this.dirty = true;

        this.elCount = 0;

        // Configs
        /**
         * Ã¿´ÎÇå¿Õ»­²¼µÄÑÕÉ«
         * @type {string}
         * @default 0
         */
        this.clearColor = 0;
        /**
         * ÊÇ·ñ¿ªÆô¶¯Ì¬Ä£ºý
         * @type {boolean}
         * @default false
         */
        this.motionBlur = false;
        /**
         * ÔÚ¿ªÆô¶¯Ì¬Ä£ºýµÄÊ±ºòÊ¹ÓÃ£¬ÓëÉÏÒ»Ö¡»ìºÏµÄalphaÖµ£¬ÖµÔ½´óÎ²¼£Ô½Ã÷ÏÔ
         * @type {number}
         * @default 0.7
         */
        this.lastFrameAlpha = 0.7;
        /**
         * ²ãÊÇ·ñÖ§³ÖÊó±êÆ½ÒÆ²Ù×÷
         * @type {boolean}
         * @default false
         */
        this.zoomable = false;
        /**
         * ²ãÊÇ·ñÖ§³ÖÊó±êËõ·Å²Ù×÷
         * @type {boolean}
         * @default false
         */
        this.panable = false;

        this.maxZoom = Infinity;
        this.minZoom = 0;

        Transformable.call(this);
    };

    Layer.prototype.initContext = function () {
        this.ctx = this.dom.getContext('2d');

        var dpr = config.devicePixelRatio;
        if (dpr != 1) { 
            this.ctx.scale(dpr, dpr);
        }
    };

    Layer.prototype.createBackBuffer = function () {
        if (vmlCanvasManager) { // IE 8- should not support back buffer
            return;
        }
        this.domBack = createDom('back-' + this.id, 'canvas', this.painter);
        this.ctxBack = this.domBack.getContext('2d');

        var dpr = config.devicePixelRatio;

        if (dpr != 1) { 
            this.ctxBack.scale(dpr, dpr);
        }
    };

    /**
     * @param  {number} width
     * @param  {number} height
     */
    Layer.prototype.resize = function (width, height) {
        var dpr = config.devicePixelRatio;

        this.dom.style.width = width + 'px';
        this.dom.style.height = height + 'px';

        this.dom.setAttribute('width', width * dpr);
        this.dom.setAttribute('height', height * dpr);

        if (dpr != 1) { 
            this.ctx.scale(dpr, dpr);
        }

        if (this.domBack) {
            this.domBack.setAttribute('width', width * dpr);
            this.domBack.setAttribute('height', height * dpr);

            if (dpr != 1) { 
                this.ctxBack.scale(dpr, dpr);
            }
        }
    };

    /**
     * Çå¿Õ¸Ã²ã»­²¼
     */
    Layer.prototype.clear = function () {
        var dom = this.dom;
        var ctx = this.ctx;
        var width = dom.width;
        var height = dom.height;

        var haveClearColor = this.clearColor && !vmlCanvasManager;
        var haveMotionBLur = this.motionBlur && !vmlCanvasManager;
        var lastFrameAlpha = this.lastFrameAlpha;
        
        var dpr = config.devicePixelRatio;

        if (haveMotionBLur) {
            if (!this.domBack) {
                this.createBackBuffer();
            } 

            this.ctxBack.globalCompositeOperation = 'copy';
            this.ctxBack.drawImage(
                dom, 0, 0,
                width / dpr,
                height / dpr
            );
        }

        ctx.clearRect(0, 0, width / dpr, height / dpr);
        if (haveClearColor) {
            ctx.save();
            ctx.fillStyle = this.clearColor;
            ctx.fillRect(0, 0, width / dpr, height / dpr);
            ctx.restore();
        }

        if (haveMotionBLur) {
            var domBack = this.domBack;
            ctx.save();
            ctx.globalAlpha = lastFrameAlpha;
            ctx.drawImage(domBack, 0, 0, width / dpr, height / dpr);
            ctx.restore();
        }
    };

    util.merge(Layer.prototype, Transformable.prototype);

    return Layer;
});
define('zrender/loadingEffect/Base', ['require', '../tool/util', '../shape/Text', '../shape/Rectangle'], function (require) {
        var util = require('../tool/util');
        var TextShape = require('../shape/Text');
        var RectangleShape = require('../shape/Rectangle');


        var DEFAULT_TEXT = 'Loading...';
        var DEFAULT_TEXT_FONT = 'normal 16px Arial';

        /**
         * @constructor
         * 
         * @param {Object} options Ñ¡Ïî
         * @param {color} options.backgroundColor ±³¾°ÑÕÉ«
         * @param {Object} options.textStyle ÎÄ×ÖÑùÊ½£¬Í¬shape/text.style
         * @param {number=} options.progress ½ø¶È²ÎÊý£¬²¿·ÖÌØÐ§ÓÐÓÃ
         * @param {Object=} options.effect ÌØÐ§²ÎÊý£¬²¿·ÖÌØÐ§ÓÐÓÃ
         * 
         * {
         *     effect,
         *     //loading»°Êõ
         *     text:'',
         *     // Ë®Æ½°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎª 'center'£¬¿ÉÖ¸¶¨x×ø±ê
         *     x:'center' || 'left' || 'right' || {number},
         *     // ´¹Ö±°²·ÅÎ»ÖÃ£¬Ä¬ÈÏÎª'top'£¬¿ÉÖ¸¶¨y×ø±ê
         *     y:'top' || 'bottom' || {number},
         *
         *     textStyle:{
         *         textFont: 'normal 20px Arial' || {textFont}, //ÎÄ±¾×ÖÌå
         *         color: {color}
         *     }
         * }
         */
        function Base(options) {
            this.setOptions(options);
        }

        /**
         * ´´½¨loadingÎÄ×ÖÍ¼ÐÎ
         * 
         * @param {Object} textStyle ÎÄ×Östyle£¬Í¬shape/text.style
         */
        Base.prototype.createTextShape = function (textStyle) {
            return new TextShape({
                highlightStyle : util.merge(
                    {
                        x : this.canvasWidth / 2,
                        y : this.canvasHeight / 2,
                        text : DEFAULT_TEXT,
                        textAlign : 'center',
                        textBaseline : 'middle',
                        textFont : DEFAULT_TEXT_FONT,
                        color: '#333',
                        brushType : 'fill'
                    },
                    textStyle,
                    true
                )
            });
        };
        
        /**
         * »ñÈ¡loading±³¾°Í¼ÐÎ
         * 
         * @param {color} color ±³¾°ÑÕÉ«
         */
        Base.prototype.createBackgroundShape = function (color) {
            return new RectangleShape({
                highlightStyle : {
                    x : 0,
                    y : 0,
                    width : this.canvasWidth,
                    height : this.canvasHeight,
                    brushType : 'fill',
                    color : color
                }
            });
        };

        Base.prototype.start = function (painter) {
            this.canvasWidth = painter._width;
            this.canvasHeight = painter._height;

            function addShapeHandle(param) {
                painter.storage.addHover(param);
            }
            function refreshHandle() {
                painter.refreshHover();
            }
            this.loadingTimer = this._start(addShapeHandle, refreshHandle);
        };

        Base.prototype._start = function (/*addShapeHandle, refreshHandle*/) {
            return setInterval(function () {
            }, 10000);
        };

        Base.prototype.stop = function () {
            clearInterval(this.loadingTimer);
        };

        Base.prototype.setOptions = function (options) {
            this.options = options || {};
        };
        
        Base.prototype.adjust = function (value, region) {
            if (value <= region[0]) {
                value = region[0];
            }
            else if (value >= region[1]) {
                value = region[1];
            }
            return value;
        };
        
        Base.prototype.getLocation = function(loc, totalWidth, totalHeight) {
            var x = loc.x != null ? loc.x : 'center';
            switch (x) {
                case 'center' :
                    x = Math.floor((this.canvasWidth - totalWidth) / 2);
                    break;
                case 'left' :
                    x = 0;
                    break;
                case 'right' :
                    x = this.canvasWidth - totalWidth;
                    break;
            }
            var y = loc.y != null ? loc.y : 'center';
            switch (y) {
                case 'center' :
                    y = Math.floor((this.canvasHeight - totalHeight) / 2);
                    break;
                case 'top' :
                    y = 0;
                    break;
                case 'bottom' :
                    y = this.canvasHeight - totalHeight;
                    break;
            }
            return {
                x : x,
                y : y,
                width : totalWidth,
                height : totalHeight
            };
        };

        return Base;
    });
define('zrender/shape/Rectangle', ['require', './Base', '../tool/util'], function (require) {
        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/Rectangle
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Rectangle = function (options) {
            Base.call(this, options);
            /**
             * ¾ØÐÎ»æÖÆÑùÊ½
             * @name module:zrender/shape/Rectangle#style
             * @type {module:zrender/shape/Rectangle~IRectangleStyle}
             */
            /**
             * ¾ØÐÎ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Rectangle#highlightStyle
             * @type {module:zrender/shape/Rectangle~IRectangleStyle}
             */
        };

        Rectangle.prototype =  {
            type: 'rectangle',

            _buildRadiusPath: function (ctx, style) {
                // ×óÉÏ¡¢ÓÒÉÏ¡¢ÓÒÏÂ¡¢×óÏÂ½ÇµÄ°ë¾¶ÒÀ´ÎÎªr1¡¢r2¡¢r3¡¢r4
                // rËõÐ´Îª1         Ïàµ±ÓÚ [1, 1, 1, 1]
                // rËõÐ´Îª[1]       Ïàµ±ÓÚ [1, 1, 1, 1]
                // rËõÐ´Îª[1, 2]    Ïàµ±ÓÚ [1, 2, 1, 2]
                // rËõÐ´Îª[1, 2, 3] Ïàµ±ÓÚ [1, 2, 3, 2]
                var x = style.x;
                var y = style.y;
                var width = style.width;
                var height = style.height;
                var r = style.radius;
                var r1; 
                var r2; 
                var r3; 
                var r4;
                  
                if (typeof r === 'number') {
                    r1 = r2 = r3 = r4 = r;
                }
                else if (r instanceof Array) {
                    if (r.length === 1) {
                        r1 = r2 = r3 = r4 = r[0];
                    }
                    else if (r.length === 2) {
                        r1 = r3 = r[0];
                        r2 = r4 = r[1];
                    }
                    else if (r.length === 3) {
                        r1 = r[0];
                        r2 = r4 = r[1];
                        r3 = r[2];
                    }
                    else {
                        r1 = r[0];
                        r2 = r[1];
                        r3 = r[2];
                        r4 = r[3];
                    }
                }
                else {
                    r1 = r2 = r3 = r4 = 0;
                }
                
                var total;
                if (r1 + r2 > width) {
                    total = r1 + r2;
                    r1 *= width / total;
                    r2 *= width / total;
                }
                if (r3 + r4 > width) {
                    total = r3 + r4;
                    r3 *= width / total;
                    r4 *= width / total;
                }
                if (r2 + r3 > height) {
                    total = r2 + r3;
                    r2 *= height / total;
                    r3 *= height / total;
                }
                if (r1 + r4 > height) {
                    total = r1 + r4;
                    r1 *= height / total;
                    r4 *= height / total;
                }
                ctx.moveTo(x + r1, y);
                ctx.lineTo(x + width - r2, y);
                r2 !== 0 && ctx.quadraticCurveTo(
                    x + width, y, x + width, y + r2
                );
                ctx.lineTo(x + width, y + height - r3);
                r3 !== 0 && ctx.quadraticCurveTo(
                    x + width, y + height, x + width - r3, y + height
                );
                ctx.lineTo(x + r4, y + height);
                r4 !== 0 && ctx.quadraticCurveTo(
                    x, y + height, x, y + height - r4
                );
                ctx.lineTo(x, y + r1);
                r1 !== 0 && ctx.quadraticCurveTo(x, y, x + r1, y);
            },
            
            /**
             * ´´½¨¾ØÐÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {Object} style
             */
            buildPath : function (ctx, style) {
                if (!style.radius) {
                    ctx.moveTo(style.x, style.y);
                    ctx.lineTo(style.x + style.width, style.y);
                    ctx.lineTo(style.x + style.width, style.y + style.height);
                    ctx.lineTo(style.x, style.y + style.height);
                    ctx.lineTo(style.x, style.y);
                    // ctx.rect(style.x, style.y, style.width, style.height);
                }
                else {
                    this._buildRadiusPath(ctx, style);
                }
                ctx.closePath();
                return;
            },

            /**
             * ¼ÆËã·µ»Ø¾ØÐÎ°üÎ§ºÐ¾ØÕó
             * @param {module:zrender/shape/Rectangle~IRectangleStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - lineWidth / 2),
                    y : Math.round(style.y - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.height + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Rectangle, Base);
        return Rectangle;
    });
define('zrender/shape/Text', ['require', '../tool/area', './Base', '../tool/util'], function (require) {
        var area = require('../tool/area');
        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/Text
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Text = function (options) {
            Base.call(this, options);
            /**
             * ÎÄ×Ö»æÖÆÑùÊ½
             * @name module:zrender/shape/Text#style
             * @type {module:zrender/shape/Text~ITextStyle}
             */
            /**
             * ÎÄ×Ö¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Text#highlightStyle
             * @type {module:zrender/shape/Text~ITextStyle}
             */
        };

        Text.prototype =  {
            type: 'text',

            brush : function (ctx, isHighlight) {
                var style = this.style;
                if (isHighlight) {
                    // ¸ù¾ÝstyleÀ©Õ¹Ä¬ÈÏ¸ßÁÁÑùÊ½
                    style = this.getHighlightStyle(
                        style, this.highlightStyle || {}
                    );
                }
                
                if (typeof(style.text) == 'undefined' || style.text === false) {
                    return;
                }

                ctx.save();
                this.doClip(ctx);

                this.setContext(ctx, style);

                // ÉèÖÃtransform
                this.setTransform(ctx);

                if (style.textFont) {
                    ctx.font = style.textFont;
                }
                ctx.textAlign = style.textAlign || 'start';
                ctx.textBaseline = style.textBaseline || 'middle';

                var text = (style.text + '').split('\n');
                var lineHeight = area.getTextHeight('¹ú', style.textFont);
                var rect = this.getRect(style);
                var x = style.x;
                var y;
                if (style.textBaseline == 'top') {
                    y = rect.y;
                }
                else if (style.textBaseline == 'bottom') {
                    y = rect.y + lineHeight;
                }
                else {
                    y = rect.y + lineHeight / 2;
                }
                
                for (var i = 0, l = text.length; i < l; i++) {
                    if (style.maxWidth) {
                        switch (style.brushType) {
                            case 'fill':
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            case 'stroke':
                                ctx.strokeText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            case 'both':
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                ctx.strokeText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                                break;
                            default:
                                ctx.fillText(
                                    text[i],
                                    x, y, style.maxWidth
                                );
                        }
                    }
                    else {
                        switch (style.brushType) {
                            case 'fill':
                                ctx.fillText(text[i], x, y);
                                break;
                            case 'stroke':
                                ctx.strokeText(text[i], x, y);
                                break;
                            case 'both':
                                ctx.fillText(text[i], x, y);
                                ctx.strokeText(text[i], x, y);
                                break;
                            default:
                                ctx.fillText(text[i], x, y);
                        }
                    }
                    y += lineHeight;
                }

                ctx.restore();
                return;
            },

            /**
             * ·µ»ØÎÄ×Ö°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Text~ITextStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var width = area.getTextWidth(style.text, style.textFont);
                var height = area.getTextHeight(style.text, style.textFont);
                
                var textX = style.x;                 // Ä¬ÈÏstart == left
                if (style.textAlign == 'end' || style.textAlign == 'right') {
                    textX -= width;
                }
                else if (style.textAlign == 'center') {
                    textX -= (width / 2);
                }

                var textY;
                if (style.textBaseline == 'top') {
                    textY = style.y;
                }
                else if (style.textBaseline == 'bottom') {
                    textY = style.y - height;
                }
                else {
                    // middle
                    textY = style.y - height / 2;
                }

                style.__rect = {
                    x : textX,
                    y : textY,
                    width : width,
                    height : height
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Text, Base);
        return Text;
    });
define('zrender/Group', ['require', './tool/guid', './tool/util', './mixin/Transformable', './mixin/Eventful'], function (require) {

    var guid = require('./tool/guid');
    var util = require('./tool/util');

    var Transformable = require('./mixin/Transformable');
    var Eventful = require('./mixin/Eventful');

    /**
     * @alias module:zrender/Group
     * @constructor
     * @extends module:zrender/mixin/Transformable
     * @extends module:zrender/mixin/Eventful
     */
    var Group = function(options) {

        options = options || {};

        /**
         * Group id
         * @type {string}
         */
        this.id = options.id || guid();

        for (var key in options) {
            this[key] = options[key];
        }

        /**
         * @type {string}
         */
        this.type = 'group';

        /**
         * ÓÃÓÚ²Ã¼ôµÄÍ¼ÐÎ(shape)£¬ËùÓÐ Group ÄÚµÄÍ¼ÐÎÔÚ»æÖÆÊ±¶¼»á±»Õâ¸öÍ¼ÐÎ²Ã¼ô
         * ¸ÃÍ¼ÐÎ»á¼Ì³ÐGroupµÄ±ä»»
         * @type {module:zrender/shape/Base}
         * @see http://www.w3.org/TR/2dcontext/#clipping-region
         */
        this.clipShape = null;

        this._children = [];

        this._storage = null;

        this.__dirty = true;

        // Mixin
        Transformable.call(this);
        Eventful.call(this);
    };

    /**
     * ÊÇ·ñºöÂÔ¸Ã Group ¼°ÆäËùÓÐ×Ó½Úµã
     * @type {boolean}
     * @default false
     */
    Group.prototype.ignore = false;

    /**
     * ¸´ÖÆ²¢·µ»ØÒ»·ÝÐÂµÄ°üº¬ËùÓÐ¶ù×Ó½ÚµãµÄÊý×é
     * @return {Array.<module:zrender/Group|module:zrender/shape/Base>}
     */
    Group.prototype.children = function() {
        return this._children.slice();
    };

    /**
     * »ñÈ¡Ö¸¶¨ index µÄ¶ù×Ó½Úµã
     * @param  {number} idx
     * @return {module:zrender/Group|module:zrender/shape/Base}
     */
    Group.prototype.childAt = function(idx) {
        return this._children[idx];
    };

    /**
     * Ìí¼Ó×Ó½Úµã£¬¿ÉÒÔÊÇShape»òÕßGroup
     * @param {module:zrender/Group|module:zrender/shape/Base} child
     */
    // TODO Type Check
    Group.prototype.addChild = function(child) {
        if (child == this) {
            return;
        }

        if (child.parent == this) {
            return;
        }
        if (child.parent) {
            child.parent.removeChild(child);
        }

        this._children.push(child);
        child.parent = this;

        if (this._storage && this._storage !== child._storage) {

            this._storage.addToMap(child);

            if (child instanceof Group) {
                child.addChildrenToStorage(this._storage);
            }
        }
    };

    /**
     * ÒÆ³ý×Ó½Úµã
     * @param {module:zrender/Group|module:zrender/shape/Base} child
     */
    // TODO Type Check
    Group.prototype.removeChild = function(child) {
        var idx = util.indexOf(this._children, child);

        if (idx >= 0) {
            this._children.splice(idx, 1);
        }
        child.parent = null;

        if (this._storage) {

            this._storage.delFromMap(child.id);

            if (child instanceof Group) {
                child.delChildrenFromStorage(this._storage);
            }
        }
    };

    /**
     * ÒÆ³ýËùÓÐ×Ó½Úµã
     */
    Group.prototype.clearChildren = function () {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (this._storage) {
                this._storage.delFromMap(child.id);
                if (child instanceof Group) {
                    child.delChildrenFromStorage(this._storage);
                }
            }
        }
        this._children.length = 0;
    };

    /**
     * ±éÀúËùÓÐ×Ó½Úµã
     * @param  {Function} cb
     * @param  {}   context
     */
    Group.prototype.eachChild = function(cb, context) {
        var haveContext = !!context;
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (haveContext) {
                cb.call(context, child);
            } else {
                cb(child);
            }
        }
    };

    /**
     * Éî¶ÈÓÅÏÈ±éÀúËùÓÐ×ÓËï½Úµã
     * @param  {Function} cb
     * @param  {}   context
     */
    Group.prototype.traverse = function(cb, context) {
        var haveContext = !!context;
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            if (haveContext) {
                cb.call(context, child);
            } else {
                cb(child);
            }

            if (child.type === 'group') {
                child.traverse(cb, context);
            }
        }
    };

    Group.prototype.addChildrenToStorage = function(storage) {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            storage.addToMap(child);
            if (child instanceof Group) {
                child.addChildrenToStorage(storage);
            }
        }
    };

    Group.prototype.delChildrenFromStorage = function(storage) {
        for (var i = 0; i < this._children.length; i++) {
            var child = this._children[i];
            storage.delFromMap(child.id);
            if (child instanceof Group) {
                child.delChildrenFromStorage(storage);
            }
        }
    };

    Group.prototype.modSelf = function() {
        this.__dirty = true;
    };

    util.merge(Group.prototype, Transformable.prototype, true);
    util.merge(Group.prototype, Eventful.prototype, true);

    return Group;
});
define('zrender/animation/Clip', ['require', './easing'], function (require) {

        var Easing = require('./easing');

        function Clip(options) {

            this._targetPool = options.target || {};
            if (!(this._targetPool instanceof Array)) {
                this._targetPool = [ this._targetPool ];
            }

            // ÉúÃüÖÜÆÚ
            this._life = options.life || 1000;
            // ÑÓÊ±
            this._delay = options.delay || 0;
            // ¿ªÊ¼Ê±¼ä
            this._startTime = new Date().getTime() + this._delay;// µ¥Î»ºÁÃë

            // ½áÊøÊ±¼ä
            this._endTime = this._startTime + this._life * 1000;

            // ÊÇ·ñÑ­»·
            this.loop = typeof options.loop == 'undefined'
                        ? false : options.loop;

            this.gap = options.gap || 0;

            this.easing = options.easing || 'Linear';

            this.onframe = options.onframe;
            this.ondestroy = options.ondestroy;
            this.onrestart = options.onrestart;
        }

        Clip.prototype = {
            step : function (time) {
                var percent = (time - this._startTime) / this._life;

                // »¹Ã»¿ªÊ¼
                if (percent < 0) {
                    return;
                }

                percent = Math.min(percent, 1);

                var easingFunc = typeof this.easing == 'string'
                                 ? Easing[this.easing]
                                 : this.easing;
                var schedule = typeof easingFunc === 'function'
                    ? easingFunc(percent)
                    : percent;

                this.fire('frame', schedule);

                // ½áÊø
                if (percent == 1) {
                    if (this.loop) {
                        this.restart();
                        // ÖØÐÂ¿ªÊ¼ÖÜÆÚ
                        // Å×³ö¶ø²»ÊÇÖ±½Óµ÷ÓÃÊÂ¼þÖ±µ½ stage.update ºóÔÙÍ³Ò»µ÷ÓÃÕâÐ©ÊÂ¼þ
                        return 'restart';
                    }
                    
                    // ¶¯»­Íê³É½«Õâ¸ö¿ØÖÆÆ÷±êÊ¶Îª´ýÉ¾³ý
                    // ÔÚAnimation.updateÖÐ½øÐÐÅúÁ¿É¾³ý
                    this.__needsRemove = true;
                    return 'destroy';
                }
                
                return null;
            },
            restart : function() {
                var time = new Date().getTime();
                var remainder = (time - this._startTime) % this._life;
                this._startTime = new Date().getTime() - remainder + this.gap;

                this.__needsRemove = false;
            },
            fire : function(eventType, arg) {
                for (var i = 0, len = this._targetPool.length; i < len; i++) {
                    if (this['on' + eventType]) {
                        this['on' + eventType](this._targetPool[i], arg);
                    }
                }
            },
            constructor: Clip
        };

        return Clip;
    });
define('zrender/animation/easing', [], function () {
        /**
         * »º¶¯´úÂëÀ´×Ô https://github.com/sole/tween.js/blob/master/src/Tween.js
         * @see http://sole.github.io/tween.js/examples/03_graphs.html
         * @exports zrender/animation/easing
         */
        var easing = {
            // ÏßÐÔ
            /**
             * @param {number} k
             * @return {number}
             */
            Linear: function (k) {
                return k;
            },

            // ¶þ´Î·½µÄ»º¶¯£¨t^2£©
            /**
             * @param {number} k
             * @return {number}
             */
            QuadraticIn: function (k) {
                return k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuadraticOut: function (k) {
                return k * (2 - k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuadraticInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k;
                }
                return -0.5 * (--k * (k - 2) - 1);
            },

            // Èý´Î·½µÄ»º¶¯£¨t^3£©
            /**
             * @param {number} k
             * @return {number}
             */
            CubicIn: function (k) {
                return k * k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CubicOut: function (k) {
                return --k * k * k + 1;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CubicInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k + 2);
            },

            // ËÄ´Î·½µÄ»º¶¯£¨t^4£©
            /**
             * @param {number} k
             * @return {number}
             */
            QuarticIn: function (k) {
                return k * k * k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuarticOut: function (k) {
                return 1 - (--k * k * k * k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuarticInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k;
                }
                return -0.5 * ((k -= 2) * k * k * k - 2);
            },

            // Îå´Î·½µÄ»º¶¯£¨t^5£©
            /**
             * @param {number} k
             * @return {number}
             */
            QuinticIn: function (k) {
                return k * k * k * k * k;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuinticOut: function (k) {
                return --k * k * k * k * k + 1;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            QuinticInOut: function (k) {
                if ((k *= 2) < 1) {
                    return 0.5 * k * k * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k * k * k + 2);
            },

            // ÕýÏÒÇúÏßµÄ»º¶¯£¨sin(t)£©
            /**
             * @param {number} k
             * @return {number}
             */
            SinusoidalIn: function (k) {
                return 1 - Math.cos(k * Math.PI / 2);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            SinusoidalOut: function (k) {
                return Math.sin(k * Math.PI / 2);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            SinusoidalInOut: function (k) {
                return 0.5 * (1 - Math.cos(Math.PI * k));
            },

            // Ö¸ÊýÇúÏßµÄ»º¶¯£¨2^t£©
            /**
             * @param {number} k
             * @return {number}
             */
            ExponentialIn: function (k) {
                return k === 0 ? 0 : Math.pow(1024, k - 1);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ExponentialOut: function (k) {
                return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ExponentialInOut: function (k) {
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if ((k *= 2) < 1) {
                    return 0.5 * Math.pow(1024, k - 1);
                }
                return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
            },

            // Ô²ÐÎÇúÏßµÄ»º¶¯£¨sqrt(1-t^2)£©
            /**
             * @param {number} k
             * @return {number}
             */
            CircularIn: function (k) {
                return 1 - Math.sqrt(1 - k * k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CircularOut: function (k) {
                return Math.sqrt(1 - (--k * k));
            },
            /**
             * @param {number} k
             * @return {number}
             */
            CircularInOut: function (k) {
                if ((k *= 2) < 1) {
                    return -0.5 * (Math.sqrt(1 - k * k) - 1);
                }
                return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
            },

            // ´´½¨ÀàËÆÓÚµ¯»ÉÔÚÍ£Ö¹Ç°À´»ØÕñµ´µÄ¶¯»­
            /**
             * @param {number} k
             * @return {number}
             */
            ElasticIn: function (k) {
                var s; 
                var a = 0.1;
                var p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else {
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return -(a * Math.pow(2, 10 * (k -= 1)) *
                            Math.sin((k - s) * (2 * Math.PI) / p));
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ElasticOut: function (k) {
                var s;
                var a = 0.1;
                var p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else {
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                return (a * Math.pow(2, -10 * k) *
                        Math.sin((k - s) * (2 * Math.PI) / p) + 1);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            ElasticInOut: function (k) {
                var s;
                var a = 0.1;
                var p = 0.4;
                if (k === 0) {
                    return 0;
                }
                if (k === 1) {
                    return 1;
                }
                if (!a || a < 1) {
                    a = 1; s = p / 4;
                }
                else {
                    s = p * Math.asin(1 / a) / (2 * Math.PI);
                }
                if ((k *= 2) < 1) {
                    return -0.5 * (a * Math.pow(2, 10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p));
                }
                return a * Math.pow(2, -10 * (k -= 1))
                        * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

            },

            // ÔÚÄ³Ò»¶¯»­¿ªÊ¼ÑØÖ¸Ê¾µÄÂ·¾¶½øÐÐ¶¯»­´¦ÀíÇ°ÉÔÉÔÊÕ»Ø¸Ã¶¯»­µÄÒÆ¶¯
            /**
             * @param {number} k
             * @return {number}
             */
            BackIn: function (k) {
                var s = 1.70158;
                return k * k * ((s + 1) * k - s);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BackOut: function (k) {
                var s = 1.70158;
                return --k * k * ((s + 1) * k + s) + 1;
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BackInOut: function (k) {
                var s = 1.70158 * 1.525;
                if ((k *= 2) < 1) {
                    return 0.5 * (k * k * ((s + 1) * k - s));
                }
                return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
            },

            // ´´½¨µ¯ÌøÐ§¹û
            /**
             * @param {number} k
             * @return {number}
             */
            BounceIn: function (k) {
                return 1 - easing.BounceOut(1 - k);
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BounceOut: function (k) {
                if (k < (1 / 2.75)) {
                    return 7.5625 * k * k;
                }
                else if (k < (2 / 2.75)) {
                    return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
                }
                else if (k < (2.5 / 2.75)) {
                    return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
                }
                else {
                    return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
                }
            },
            /**
             * @param {number} k
             * @return {number}
             */
            BounceInOut: function (k) {
                if (k < 0.5) {
                    return easing.BounceIn(k * 2) * 0.5;
                }
                return easing.BounceOut(k * 2 - 1) * 0.5 + 0.5;
            }
        };

        return easing;
    });
define('echarts/component/dataView', ['require', './base', '../config', 'zrender/tool/util', '../component'], function (require) {
    var Base = require('./base');

    var ecConfig = require('../config');
    var zrUtil = require('zrender/tool/util');
    
    /**
     * ¹¹Ôìº¯Êý
     * @param {Object} messageCenter echartÏûÏ¢ÖÐÐÄ
     * @param {ZRender} zr zrenderÊµÀý
     * @param {Object} option ÌáÊ¾¿ò²ÎÊý
     * @param {HtmlElement} dom Ä¿±ê¶ÔÏó
     */
    function DataView(ecTheme, messageCenter, zr, option, myChart) {
        Base.call(this, ecTheme, messageCenter, zr, option, myChart);

        this.dom = myChart.dom;
        
        // dataview dom & css
        this._tDom = document.createElement('div');
        this._textArea = document.createElement('textArea');
        this._buttonRefresh = document.createElement('button');
        // ¸ß¼¶ä¯ÀÀÆ÷Ä¬ÈÏtypeÎªsubmit
        // Èç¹ûÍ¼±í³öÏÖÔÚform±íµ¥Ê±£¬µã»÷buttonºó»áÌá½»±íµ¥
        // ÉèÖÃÎªbutton£¬·ÀÖ¹µã»÷buttonºóÌá½»±íµ¥
        this._buttonRefresh.setAttribute('type', 'button');
        this._buttonClose = document.createElement('button');
        this._buttonClose.setAttribute('type', 'button');
        this._hasShow = false;

        // »º´æÒ»Ð©¸ß¿íÊý¾Ý
        this._zrHeight = zr.getHeight();
        this._zrWidth = zr.getWidth();
    
        this._tDom.className = 'echarts-dataview';
        this.hide();
        this.dom.firstChild.appendChild(this._tDom);

        if (window.addEventListener) {
            this._tDom.addEventListener('click', this._stop);
            this._tDom.addEventListener('mousewheel', this._stop);
            this._tDom.addEventListener('mousemove', this._stop);
            this._tDom.addEventListener('mousedown', this._stop);
            this._tDom.addEventListener('mouseup', this._stop);

            // mobileÖ§³Ö
            this._tDom.addEventListener('touchstart', this._stop);
            this._tDom.addEventListener('touchmove', this._stop);
            this._tDom.addEventListener('touchend', this._stop);
        }
        else {
            this._tDom.attachEvent('onclick', this._stop);
            this._tDom.attachEvent('onmousewheel', this._stop);
            this._tDom.attachEvent('onmousemove', this._stop);
            this._tDom.attachEvent('onmousedown', this._stop);
            this._tDom.attachEvent('onmouseup', this._stop);
        }
    }
    
    DataView.prototype = {
        type : ecConfig.COMPONENT_TYPE_DATAVIEW,
        _lang : ['Data View', 'close', 'refresh'],
        // Í¨ÓÃÑùÊ½
        _gCssText : 'position:absolute;'
                    + 'display:block;'
                    + 'overflow:hidden;'
                    + 'transition:height 0.8s,background-color 1s;'
                    + '-moz-transition:height 0.8s,background-color 1s;'
                    + '-webkit-transition:height 0.8s,background-color 1s;'
                    + '-o-transition:height 0.8s,background-color 1s;'
                    + 'z-index:1;'
                    + 'left:0;'
                    + 'top:0;',
        hide : function () {
            this._sizeCssText = 'width:' + this._zrWidth + 'px;'
                           + 'height:' + 0 + 'px;'
                           + 'background-color:#f0ffff;';
            this._tDom.style.cssText = this._gCssText + this._sizeCssText;
            // ÕâÊÇ¸öºÜ¶ñÐÄµÄÊÂÇé
            /*
            this.dom.onselectstart = function () {
                return false;
            };
            */
        },

        show : function (newOption) {
            this._hasShow = true;
            var lang = this.query(this.option, 'toolbox.feature.dataView.lang')
                       || this._lang;

            this.option = newOption;

            this._tDom.innerHTML = '<p style="padding:8px 0;margin:0 0 10px 0;'
                              + 'border-bottom:1px solid #eee">'
                              + (lang[0] || this._lang[0])
                              + '</p>';

            var customContent = this.query(
                this.option, 'toolbox.feature.dataView.optionToContent'
            );
            if (typeof customContent != 'function') {
                this._textArea.value = this._optionToContent();
            }
            else {
                // innerHTML the custom optionToContent;
                this._textArea = document.createElement('div');
                this._textArea.innerHTML = customContent(this.option);
            }

            this._textArea.style.cssText =
                'display:block;margin:0 0 8px 0;padding:4px 6px;overflow:auto;'
                + 'width:100%;'
                + 'height:' + (this._zrHeight - 100) + 'px;';

            this._tDom.appendChild(this._textArea);

            this._buttonClose.style.cssText = 'float:right;padding:1px 6px;';
            this._buttonClose.innerHTML = lang[1] || this._lang[1];
            var self = this;
            this._buttonClose.onclick = function (){
                self.hide();
            };
            this._tDom.appendChild(this._buttonClose);

            if (this.query(this.option, 'toolbox.feature.dataView.readOnly')
                === false
            ) {
                this._buttonRefresh.style.cssText =
                    'float:right;margin-right:10px;padding:1px 6px;';
                this._buttonRefresh.innerHTML = lang[2] || this._lang[2];
                this._buttonRefresh.onclick = function (){
                    self._save();
                };
                this._textArea.readOnly = false;
                this._textArea.style.cursor = 'default';
            }
            else {
                this._buttonRefresh.style.cssText =
                    'display:none';
                this._textArea.readOnly = true;
                this._textArea.style.cursor = 'text';
            }
            this._tDom.appendChild(this._buttonRefresh);

            this._sizeCssText = 'width:' + this._zrWidth + 'px;'
                           + 'height:' + this._zrHeight + 'px;'
                           + 'background-color:#fff;';
            this._tDom.style.cssText = this._gCssText + this._sizeCssText;
            // ÕâÊÇ¸öºÜ¶ñÐÄµÄÊÂÇé
            /*
            this.dom.onselectstart = function () {
                return true;
            };
            */
        },

        _optionToContent : function () {
            var i;
            var j;
            var k;
            var len;
            var data;
            var valueList;
            var axisList = [];
            var content = '';
            if (this.option.xAxis) {
                if (this.option.xAxis instanceof Array) {
                    axisList = this.option.xAxis;
                } else {
                    axisList = [this.option.xAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    // ºá×ÝÄ¬ÈÏÎªÀàÄ¿
                    if ((axisList[i].type || 'category') == 'category') {
                        valueList = [];
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            valueList.push(this.getDataFromOption(axisList[i].data[j]));
                        }
                        content += valueList.join(', ') + '\n\n';
                    }
                }
            }

            if (this.option.yAxis) {
                if (this.option.yAxis instanceof Array) {
                    axisList = this.option.yAxis;
                } else {
                    axisList = [this.option.yAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    if (axisList[i].type  == 'category') {
                        valueList = [];
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            valueList.push(this.getDataFromOption(axisList[i].data[j]));
                        }
                        content += valueList.join(', ') + '\n\n';
                    }
                }
            }

            var series = this.option.series;
            var itemName;
            for (i = 0, len = series.length; i < len; i++) {
                valueList = [];
                for (j = 0, k = series[i].data.length; j < k; j++) {
                    data = series[i].data[j];
                    if (series[i].type == ecConfig.CHART_TYPE_PIE
                        || series[i].type == ecConfig.CHART_TYPE_MAP
                    ) {
                        itemName = (data.name || '-') + ':';
                    }
                    else {
                        itemName = '';
                    }
                    
                    if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                        data = this.getDataFromOption(data).join(', ');
                    }
                    valueList.push(itemName + this.getDataFromOption(data));
                }
                content += (series[i].name || '-') + ' : \n';
                content += valueList.join(
                    series[i].type == ecConfig.CHART_TYPE_SCATTER ? '\n': ', '
                );
                content += '\n\n';
            }

            return content;
        },

        _save : function () {
            var customContent = this.query(
                this.option, 'toolbox.feature.dataView.contentToOption'
            );
            if (typeof customContent != 'function') {
                var text = this._textArea.value.split('\n');
                var content = [];
                for (var i = 0, l = text.length; i < l; i++) {
                    text[i] = this._trim(text[i]);
                    if (text[i] !== '') {
                        content.push(text[i]);
                    }
                }
                this._contentToOption(content);
            }
            else {
                // return the textArea dom for custom contentToOption
                customContent(this._textArea, this.option);
            }

            this.hide();
            
            var self = this;
            setTimeout(
                function (){
                    self.messageCenter && self.messageCenter.dispatch(
                        ecConfig.EVENT.DATA_VIEW_CHANGED,
                        null,
                        {option : self.option},
                        self.myChart
                    );
                },
                // ÓÐ¶¯»­£¬ËùÒÔ¸ß¼¶ä¯ÀÀÆ÷Ê±¼ä¸ü³¤µã
                self.canvasSupported ? 800 : 100
            );
        },

        _contentToOption : function (content) {
            var i;
            var j;
            var k;
            var len;
            var data;
            var axisList = [];

            var contentIdx = 0;
            var contentValueList;
            var value;

            if (this.option.xAxis) {
                if (this.option.xAxis instanceof Array) {
                    axisList = this.option.xAxis;
                } else {
                    axisList = [this.option.xAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    // ºá×ÝÄ¬ÈÏÎªÀàÄ¿
                    if ((axisList[i].type || 'category') == 'category'
                    ) {
                        contentValueList = content[contentIdx].split(',');
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            value = this._trim(contentValueList[j] || '');
                            data = axisList[i].data[j];
                            if (typeof axisList[i].data[j].value != 'undefined'
                            ) {
                                axisList[i].data[j].value = value;
                            }
                            else {
                                axisList[i].data[j] = value;
                            }
                        }
                        contentIdx++;
                    }
                }
            }

            if (this.option.yAxis) {
                if (this.option.yAxis instanceof Array) {
                    axisList = this.option.yAxis;
                } else {
                    axisList = [this.option.yAxis];
                }
                for (i = 0, len = axisList.length; i < len; i++) {
                    if (axisList[i].type  == 'category') {
                        contentValueList = content[contentIdx].split(',');
                        for (j = 0, k = axisList[i].data.length; j < k; j++) {
                            value = this._trim(contentValueList[j] || '');
                            data = axisList[i].data[j];
                            if (typeof axisList[i].data[j].value != 'undefined'
                            ) {
                                axisList[i].data[j].value = value;
                            }
                            else {
                                axisList[i].data[j] = value;
                            }
                        }
                        contentIdx++;
                    }
                }
            }

            var series = this.option.series;
            for (i = 0, len = series.length; i < len; i++) {
                contentIdx++;
                if (series[i].type == ecConfig.CHART_TYPE_SCATTER) {
                    for (var j = 0, k = series[i].data.length; j < k; j++) {
                        contentValueList = content[contentIdx];
                        value = contentValueList.replace(' ','').split(',');
                        if (typeof series[i].data[j].value != 'undefined'
                        ) {
                            series[i].data[j].value = value;
                        }
                        else {
                            series[i].data[j] = value;
                        }
                        contentIdx++;
                    }
                }
                else {
                    contentValueList = content[contentIdx].split(',');
                    for (var j = 0, k = series[i].data.length; j < k; j++) {
                        value = (contentValueList[j] || '').replace(/.*:/,'');
                        value = this._trim(value);
                        value = (value != '-' && value !== '')
                                ? (value - 0)
                                : '-';
                        if (typeof series[i].data[j].value != 'undefined'
                        ) {
                            series[i].data[j].value = value;
                        }
                        else {
                            series[i].data[j] = value;
                        }
                    }
                    contentIdx++;
                }
            }
        },

        _trim : function (str){
            var trimer = new RegExp(
                '(^[\\s\\t\\xa0\\u3000]+)|([\\u3000\\xa0\\s\\t]+\x24)', 'g'
            );
            return str.replace(trimer, '');
        },

        // ×èÈûzrenderÊÂ¼þ
        _stop : function (e){
            e = e || window.event;
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            else {
                e.cancelBubble = true;
            }
        },

        /**
         * zrenderÊÂ¼þÏìÓ¦£º´°¿Ú´óÐ¡¸Ä±ä
         */
        resize : function () {
            this._zrHeight = this.zr.getHeight();
            this._zrWidth = this.zr.getWidth();
            if (this._tDom.offsetHeight > 10) {
                this._sizeCssText = 'width:' + this._zrWidth + 'px;'
                               + 'height:' + this._zrHeight + 'px;'
                               + 'background-color:#fff;';
                this._tDom.style.cssText = this._gCssText + this._sizeCssText;
                this._textArea.style.cssText = 'display:block;margin:0 0 8px 0;'
                                        + 'padding:4px 6px;overflow:auto;'
                                        + 'width:100%;'
                                        + 'height:' + (this._zrHeight - 100) + 'px;';
            }
        },

        /**
         * ÊÍ·ÅºóÊµÀý²»¿ÉÓÃ£¬ÖØÔØ»ùÀà·½·¨
         */
        dispose : function () {
            if (window.removeEventListener) {
                this._tDom.removeEventListener('click', this._stop);
                this._tDom.removeEventListener('mousewheel', this._stop);
                this._tDom.removeEventListener('mousemove', this._stop);
                this._tDom.removeEventListener('mousedown', this._stop);
                this._tDom.removeEventListener('mouseup', this._stop);

                // mobileÖ§³Ö
                this._tDom.removeEventListener('touchstart', this._stop);
                this._tDom.removeEventListener('touchmove', this._stop);
                this._tDom.removeEventListener('touchend', this._stop);
            }
            else {
                this._tDom.detachEvent('onclick', this._stop);
                this._tDom.detachEvent('onmousewheel', this._stop);
                this._tDom.detachEvent('onmousemove', this._stop);
                this._tDom.detachEvent('onmousedown', this._stop);
                this._tDom.detachEvent('onmouseup', this._stop);
            }

            this._buttonRefresh.onclick = null;
            this._buttonClose.onclick = null;

            if (this._hasShow) {
                this._tDom.removeChild(this._textArea);
                this._tDom.removeChild(this._buttonRefresh);
                this._tDom.removeChild(this._buttonClose);
            }

            this._textArea = null;
            this._buttonRefresh = null;
            this._buttonClose = null;

            this.dom.firstChild.removeChild(this._tDom);
            this._tDom = null;
        }
    };
    
    zrUtil.inherits(DataView, Base);
    
    require('../component').define('dataView', DataView);
    
    return DataView;
});
define('echarts/util/shape/Cross', ['require', 'zrender/shape/Base', 'zrender/shape/Line', 'zrender/tool/util', './normalIsCover'], function (require) {
    var Base = require('zrender/shape/Base');
    var LineShape = require('zrender/shape/Line');
    var zrUtil = require('zrender/tool/util');

    function Cross(options) {
        Base.call(this, options);
    }

    Cross.prototype =  {
        type : 'cross',

        /**
         * ´´½¨¾ØÐÎÂ·¾¶
         * @param {Context2D} ctx Canvas 2DÉÏÏÂÎÄ
         * @param {Object} style ÑùÊ½
         */
        buildPath : function (ctx, style) {
            var rect = style.rect;
            style.xStart = rect.x;
            style.xEnd = rect.x + rect.width;
            style.yStart = style.yEnd = style.y;
            LineShape.prototype.buildPath(ctx, style);
            style.xStart = style.xEnd = style.x;
            style.yStart = rect.y;
            style.yEnd = rect.y + rect.height;
            LineShape.prototype.buildPath(ctx, style);
        },

        /**
         * ·µ»Ø¾ØÐÎÇøÓò£¬ÓÃÓÚ¾Ö²¿Ë¢ÐÂºÍÎÄ×Ö¶¨Î»
         * @param {Object} style
         */
        getRect : function (style) {
            return style.rect;
        },

        isCover : require('./normalIsCover')
    };

    zrUtil.inherits(Cross, Base);

    return Cross;
});
define('echarts/util/shape/Candle', ['require', 'zrender/shape/Base', 'zrender/tool/util', './normalIsCover'], function (require) {
    var Base = require('zrender/shape/Base');
    var zrUtil = require('zrender/tool/util');

    function Candle(options) {
        Base.call(this, options);
    }

    Candle.prototype =  {
        type: 'candle',
        _numberOrder : function (a, b) {
            return b - a;
        },

        /**
         * ´´½¨¾ØÐÎÂ·¾¶
         * @param {Context2D} ctx Canvas 2DÉÏÏÂÎÄ
         * @param {Object} style ÑùÊ½
         */
        buildPath : function (ctx, style) {
            var yList = zrUtil.clone(style.y).sort(this._numberOrder);

            ctx.moveTo(style.x, yList[3]);
            ctx.lineTo(style.x, yList[2]);
            ctx.moveTo(style.x - style.width / 2, yList[2]);
            ctx.rect(
                style.x - style.width / 2,
                yList[2],
                style.width,
                yList[1] - yList[2]
            );
            ctx.moveTo(style.x, yList[1]);
            ctx.lineTo(style.x, yList[0]);
        },

        /**
         * ·µ»Ø¾ØÐÎÇøÓò£¬ÓÃÓÚ¾Ö²¿Ë¢ÐÂºÍÎÄ×Ö¶¨Î»
         * @param {Object} style
         */
        getRect : function (style) {
            if (!style.__rect) {
                var lineWidth = 0;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }

                var yList = zrUtil.clone(style.y).sort(this._numberOrder);
                style.__rect = {
                    x : Math.round(style.x - style.width / 2 - lineWidth / 2),
                    y : Math.round(yList[3] - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : yList[0] - yList[3] + lineWidth
                };
            }

            return style.__rect;
        },


        isCover : require('./normalIsCover')
    };

    zrUtil.inherits(Candle, Base);

    return Candle;
});
define('zrender/shape/Sector', ['require', '../tool/math', '../tool/computeBoundingBox', '../tool/vector', './Base', '../tool/util'], function (require) {

        var math = require('../tool/math');
        var computeBoundingBox = require('../tool/computeBoundingBox');
        var vec2 = require('../tool/vector');
        var Base = require('./Base');
        
        var min0 = vec2.create();
        var min1 = vec2.create();
        var max0 = vec2.create();
        var max1 = vec2.create();
        /**
         * @alias module:zrender/shape/Sector
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Sector = function (options) {
            Base.call(this, options);
            /**
             * ÉÈÐÎ»æÖÆÑùÊ½
             * @name module:zrender/shape/Sector#style
             * @type {module:zrender/shape/Sector~ISectorStyle}
             */
            /**
             * ÉÈÐÎ¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Sector#highlightStyle
             * @type {module:zrender/shape/Sector~ISectorStyle}
             */
        };

        Sector.prototype = {
            type: 'sector',

            /**
             * ´´½¨ÉÈÐÎÂ·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Sector~ISectorStyle} style
             */
            buildPath : function (ctx, style) {
                var x = style.x;   // Ô²ÐÄx
                var y = style.y;   // Ô²ÐÄy
                var r0 = style.r0 || 0;     // ÐÎÄÚ°ë¾¶[0,r)
                var r = style.r;            // ÉÈÐÎÍâ°ë¾¶(0,r]
                var startAngle = style.startAngle;          // ÆðÊ¼½Ç¶È[0,360)
                var endAngle = style.endAngle;              // ½áÊø½Ç¶È(0,360]
                var clockWise = style.clockWise || false;

                startAngle = math.degreeToRadian(startAngle);
                endAngle = math.degreeToRadian(endAngle);

                if (!clockWise) {
                    // ÉÈÐÎÄ¬ÈÏÊÇÄæÊ±Õë·½Ïò£¬YÖáÏòÉÏ
                    // Õâ¸ö¸úarcµÄ±ê×¼²»Ò»Ñù£¬ÎªÁË¼æÈÝecharts
                    startAngle = -startAngle;
                    endAngle = -endAngle;
                }

                var unitX = math.cos(startAngle);
                var unitY = math.sin(startAngle);
                ctx.moveTo(
                    unitX * r0 + x,
                    unitY * r0 + y
                );

                ctx.lineTo(
                    unitX * r + x,
                    unitY * r + y
                );

                ctx.arc(x, y, r, startAngle, endAngle, !clockWise);

                ctx.lineTo(
                    math.cos(endAngle) * r0 + x,
                    math.sin(endAngle) * r0 + y
                );

                if (r0 !== 0) {
                    ctx.arc(x, y, r0, endAngle, startAngle, clockWise);
                }

                ctx.closePath();

                return;
            },

            /**
             * ·µ»ØÉÈÐÎ°üÎ§ºÐ¾ØÐÎ
             * @param {module:zrender/shape/Sector~ISectorStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var x = style.x;   // Ô²ÐÄx
                var y = style.y;   // Ô²ÐÄy
                var r0 = style.r0 || 0;     // ÐÎÄÚ°ë¾¶[0,r)
                var r = style.r;            // ÉÈÐÎÍâ°ë¾¶(0,r]
                var startAngle = math.degreeToRadian(style.startAngle);
                var endAngle = math.degreeToRadian(style.endAngle);
                var clockWise = style.clockWise;

                if (!clockWise) {
                    startAngle = -startAngle;
                    endAngle = -endAngle;
                }

                if (r0 > 1) {
                    computeBoundingBox.arc(
                        x, y, r0, startAngle, endAngle, !clockWise, min0, max0
                    );   
                } else {
                    min0[0] = max0[0] = x;
                    min0[1] = max0[1] = y;
                }
                computeBoundingBox.arc(
                    x, y, r, startAngle, endAngle, !clockWise, min1, max1
                );

                vec2.min(min0, min0, min1);
                vec2.max(max0, max0, max1);
                style.__rect = {
                    x: min0[0],
                    y: min0[1],
                    width: max0[0] - min0[0],
                    height: max0[1] - min0[1]
                };
                return style.__rect;
            }
        };


        require('../tool/util').inherits(Sector, Base);
        return Sector;
    });
define('zrender/tool/computeBoundingBox', ['require', './vector', './curve'], function (require) {
        var vec2 = require('./vector');
        var curve = require('./curve');

        /**
         * ´Ó¶¥µãÊý×éÖÐ¼ÆËã³ö×îÐ¡°üÎ§ºÐ£¬Ð´Èë`min`ºÍ`max`ÖÐ
         * @module zrender/tool/computeBoundingBox
         * @param {Array<Object>} points ¶¥µãÊý×é
         * @param {number} min
         * @param {number} max
         */
        function computeBoundingBox(points, min, max) {
            if (points.length === 0) {
                return;
            }
            var left = points[0][0];
            var right = points[0][0];
            var top = points[0][1];
            var bottom = points[0][1];
            
            for (var i = 1; i < points.length; i++) {
                var p = points[i];
                if (p[0] < left) {
                    left = p[0];
                }
                if (p[0] > right) {
                    right = p[0];
                }
                if (p[1] < top) {
                    top = p[1];
                }
                if (p[1] > bottom) {
                    bottom = p[1];
                }
            }

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        /**
         * ´ÓÈý½×±´Èû¶ûÇúÏß(p0, p1, p2, p3)ÖÐ¼ÆËã³ö×îÐ¡°üÎ§ºÐ£¬Ð´Èë`min`ºÍ`max`ÖÐ
         * @memberOf module:zrender/tool/computeBoundingBox
         * @param {Array.<number>} p0
         * @param {Array.<number>} p1
         * @param {Array.<number>} p2
         * @param {Array.<number>} p3
         * @param {Array.<number>} min
         * @param {Array.<number>} max
         */
        function computeCubeBezierBoundingBox(p0, p1, p2, p3, min, max) {
            var xDim = [];
            curve.cubicExtrema(p0[0], p1[0], p2[0], p3[0], xDim);
            for (var i = 0; i < xDim.length; i++) {
                xDim[i] = curve.cubicAt(p0[0], p1[0], p2[0], p3[0], xDim[i]);
            }
            var yDim = [];
            curve.cubicExtrema(p0[1], p1[1], p2[1], p3[1], yDim);
            for (var i = 0; i < yDim.length; i++) {
                yDim[i] = curve.cubicAt(p0[1], p1[1], p2[1], p3[1], yDim[i]);
            }

            xDim.push(p0[0], p3[0]);
            yDim.push(p0[1], p3[1]);

            var left = Math.min.apply(null, xDim);
            var right = Math.max.apply(null, xDim);
            var top = Math.min.apply(null, yDim);
            var bottom = Math.max.apply(null, yDim);

            min[0] = left;
            min[1] = top;
            max[0] = right;
            max[1] = bottom;
        }

        /**
         * ´Ó¶þ½×±´Èû¶ûÇúÏß(p0, p1, p2)ÖÐ¼ÆËã³ö×îÐ¡°üÎ§ºÐ£¬Ð´Èë`min`ºÍ`max`ÖÐ
         * @memberOf module:zrender/tool/computeBoundingBox
         * @param {Array.<number>} p0
         * @param {Array.<number>} p1
         * @param {Array.<number>} p2
         * @param {Array.<number>} min
         * @param {Array.<number>} max
         */
        function computeQuadraticBezierBoundingBox(p0, p1, p2, min, max) {
            // Find extremities, where derivative in x dim or y dim is zero
            var t1 = curve.quadraticExtremum(p0[0], p1[0], p2[0]);
            var t2 = curve.quadraticExtremum(p0[1], p1[1], p2[1]);

            t1 = Math.max(Math.min(t1, 1), 0);
            t2 = Math.max(Math.min(t2, 1), 0);

            var ct1 = 1 - t1;
            var ct2 = 1 - t2;

            var x1 = ct1 * ct1 * p0[0] 
                     + 2 * ct1 * t1 * p1[0] 
                     + t1 * t1 * p2[0];
            var y1 = ct1 * ct1 * p0[1] 
                     + 2 * ct1 * t1 * p1[1] 
                     + t1 * t1 * p2[1];

            var x2 = ct2 * ct2 * p0[0] 
                     + 2 * ct2 * t2 * p1[0] 
                     + t2 * t2 * p2[0];
            var y2 = ct2 * ct2 * p0[1] 
                     + 2 * ct2 * t2 * p1[1] 
                     + t2 * t2 * p2[1];
            min[0] = Math.min(p0[0], p2[0], x1, x2);
            min[1] = Math.min(p0[1], p2[1], y1, y2);
            max[0] = Math.max(p0[0], p2[0], x1, x2);
            max[1] = Math.max(p0[1], p2[1], y1, y2);
        }

        var start = vec2.create();
        var end = vec2.create();
        var extremity = vec2.create();
        /**
         * ´ÓÔ²»¡ÖÐ¼ÆËã³ö×îÐ¡°üÎ§ºÐ£¬Ð´Èë`min`ºÍ`max`ÖÐ
         * @method
         * @memberOf module:zrender/tool/computeBoundingBox
         * @param {Array.<number>} center Ô²»¡ÖÐÐÄµã
         * @param {number} radius Ô²»¡°ë¾¶
         * @param {number} startAngle Ô²»¡¿ªÊ¼½Ç¶È
         * @param {number} endAngle Ô²»¡½áÊø½Ç¶È
         * @param {number} anticlockwise ÊÇ·ñÊÇË³Ê±Õë
         * @param {Array.<number>} min
         * @param {Array.<number>} max
         */
        var computeArcBoundingBox = function (
            x, y, r, startAngle, endAngle, anticlockwise, min, max
        ) { 
            if (Math.abs(startAngle - endAngle) >= Math.PI * 2) {
                // Is a circle
                min[0] = x - r;
                min[1] = y - r;
                max[0] = x + r;
                max[1] = y + r;
                return;
            }

            start[0] = Math.cos(startAngle) * r + x;
            start[1] = Math.sin(startAngle) * r + y;

            end[0] = Math.cos(endAngle) * r + x;
            end[1] = Math.sin(endAngle) * r + y;

            vec2.min(min, start, end);
            vec2.max(max, start, end);
            
            // Thresh to [0, Math.PI * 2]
            startAngle = startAngle % (Math.PI * 2);
            if (startAngle < 0) {
                startAngle = startAngle + Math.PI * 2;
            }
            endAngle = endAngle % (Math.PI * 2);
            if (endAngle < 0) {
                endAngle = endAngle + Math.PI * 2;
            }

            if (startAngle > endAngle && !anticlockwise) {
                endAngle += Math.PI * 2;
            } else if (startAngle < endAngle && anticlockwise) {
                startAngle += Math.PI * 2;
            }
            if (anticlockwise) {
                var tmp = endAngle;
                endAngle = startAngle;
                startAngle = tmp;
            }

            // var number = 0;
            // var step = (anticlockwise ? -Math.PI : Math.PI) / 2;
            for (var angle = 0; angle < endAngle; angle += Math.PI / 2) {
                if (angle > startAngle) {
                    extremity[0] = Math.cos(angle) * r + x;
                    extremity[1] = Math.sin(angle) * r + y;

                    vec2.min(min, extremity, min);
                    vec2.max(max, extremity, max);
                }
            }
        };

        computeBoundingBox.cubeBezier = computeCubeBezierBoundingBox;
        computeBoundingBox.quadraticBezier = computeQuadraticBezierBoundingBox;
        computeBoundingBox.arc = computeArcBoundingBox;

        return computeBoundingBox;
    });
define('echarts/util/shape/Chain', ['require', 'zrender/shape/Base', './Icon', 'zrender/shape/util/dashedLineTo', 'zrender/tool/util', 'zrender/tool/matrix'], function (require) {
    var Base = require('zrender/shape/Base');
    var IconShape = require('./Icon');

    var dashedLineTo = require('zrender/shape/util/dashedLineTo');
    var zrUtil = require('zrender/tool/util');
    var matrix = require('zrender/tool/matrix');

    function Chain(options) {
        Base.call(this, options);
    }

    Chain.prototype =  {
        type : 'chain',

        /**
         * »­Ë¢
         * @param ctx       »­²¼¾ä±ú
         * @param e         ÐÎ×´ÊµÌå
         * @param isHighlight   ÊÇ·ñÎª¸ßÁÁ×´Ì¬
         * @param updateCallback ÐèÒªÒì²½¼ÓÔØ×ÊÔ´µÄshape¿ÉÒÔÍ¨¹ýÕâ¸öcallback(e)
         *                       ÈÃpainter¸üÐÂÊÓÍ¼£¬base.brushÃ»ÓÃ£¬ÐèÒªµÄ»°ÖØÔØbrush
         */
        brush : function (ctx, isHighlight) {
            var style = this.style;

            if (isHighlight) {
                // ¸ù¾ÝstyleÀ©Õ¹Ä¬ÈÏ¸ßÁÁÑùÊ½
                style = this.getHighlightStyle(
                    style,
                    this.highlightStyle || {}
                );
            }

            ctx.save();
            this.setContext(ctx, style);

            // ÉèÖÃtransform
            this.setTransform(ctx);

            ctx.save();
            ctx.beginPath();
            this.buildLinePath(ctx, style);
            ctx.stroke();
            ctx.restore();
            
            this.brushSymbol(ctx, style);

            ctx.restore();
            return;
        },

        /**
         * ´´½¨ÏßÌõÂ·¾¶
         * @param {Context2D} ctx Canvas 2DÉÏÏÂÎÄ
         * @param {Object} style ÑùÊ½
         */
        buildLinePath : function (ctx, style) {
            var x = style.x;
            var y = style.y + 5;
            var width = style.width;
            var height = style.height / 2 - 10;

            ctx.moveTo(x, y);
            ctx.lineTo(x, y + height);
            ctx.moveTo(x + width, y);
            ctx.lineTo(x + width, y + height);

            ctx.moveTo(x, y + height / 2);
            if (!style.lineType || style.lineType == 'solid') {
                ctx.lineTo(x + width, y + height / 2);
            }
            else if (style.lineType == 'dashed' || style.lineType == 'dotted') {
                var dashLength = (style.lineWidth || 1)
                             * (style.lineType == 'dashed' ? 5 : 1);
                dashedLineTo(ctx, x, y + height / 2, x + width, y + height / 2, dashLength);
            }
        },

        /**
         * ±êÏßÊ¼Ä©±ê×¢
         */
        brushSymbol : function (ctx, style) {
            var y = style.y + style.height / 4;
            ctx.save();

            var chainPoint = style.chainPoint;
            var curPoint;
            for (var idx = 0, l = chainPoint.length; idx < l; idx++) {
                curPoint = chainPoint[idx];
                if (curPoint.symbol != 'none') {
                    ctx.beginPath();
                    var symbolSize = curPoint.symbolSize;
                    IconShape.prototype.buildPath(
                        ctx,
                        {
                            iconType : curPoint.symbol,
                            x : curPoint.x - symbolSize,
                            y : y - symbolSize,
                            width : symbolSize * 2,
                            height : symbolSize * 2,
                            n : curPoint.n
                        }
                    );
                    ctx.fillStyle = curPoint.isEmpty ? '#fff' : style.strokeColor;
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }

                if (curPoint.showLabel) {
                    ctx.font = curPoint.textFont;
                    ctx.fillStyle = curPoint.textColor;
                    ctx.textAlign = curPoint.textAlign;
                    ctx.textBaseline = curPoint.textBaseline;
                    if (curPoint.rotation) {
                        ctx.save();
                        this._updateTextTransform(ctx, curPoint.rotation);
                        ctx.fillText(curPoint.name, curPoint.textX, curPoint.textY);
                        ctx.restore();
                    }
                    else {
                        ctx.fillText(curPoint.name, curPoint.textX, curPoint.textY);
                    }
                }
            }

            ctx.restore();
        },

        _updateTextTransform : function (ctx, rotation) {
            var _transform = matrix.create();
            matrix.identity(_transform);

            if (rotation[0] !== 0) {
                var originX = rotation[1] || 0;
                var originY = rotation[2] || 0;
                if (originX || originY) {
                    matrix.translate(
                        _transform, _transform, [-originX, -originY]
                    );
                }
                matrix.rotate(_transform, _transform, rotation[0]);
                if (originX || originY) {
                    matrix.translate(
                        _transform, _transform, [originX, originY]
                    );
                }
            }

            // ±£´æÕâ¸ö±ä»»¾ØÕó
            ctx.transform.apply(ctx, _transform);
        },

        isCover : function (x, y) {
            var rect = this.style;
            if (x >= rect.x
                && x <= (rect.x + rect.width)
                && y >= rect.y
                && y <= (rect.y + rect.height)
            ) {
                // ¾ØÐÎÄÚ
                return true;
            }
            else {
                return false;
            }
        }
    };

    zrUtil.inherits(Chain, Base);

    return Chain;
});
define('zrender/shape/Ring', ['require', './Base', '../tool/util'], function (require) {
        var Base = require('./Base');
        
        /**
         * @alias module:zrender/shape/Ring
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var Ring = function (options) {
            Base.call(this, options);
            /**
             * Ô²»·»æÖÆÑùÊ½
             * @name module:zrender/shape/Ring#style
             * @type {module:zrender/shape/Ring~IRingStyle}
             */
            /**
             * Ô²»·¸ßÁÁ»æÖÆÑùÊ½
             * @name module:zrender/shape/Ring#highlightStyle
             * @type {module:zrender/shape/Ring~IRingStyle}
             */
        };

        Ring.prototype = {
            type: 'ring',

            /**
             * ´´½¨Ô²»·Â·¾¶
             * @param {CanvasRenderingContext2D} ctx
             * @param {module:zrender/shape/Ring~IRingStyle} style
             */
            buildPath : function (ctx, style) {
                // ·ÇÁã»·ÈÆÌî³äÓÅ»¯
                ctx.arc(style.x, style.y, style.r, 0, Math.PI * 2, false);
                ctx.moveTo(style.x + style.r0, style.y);
                ctx.arc(style.x, style.y, style.r0, 0, Math.PI * 2, true);
                return;
            },

            /**
             * ¼ÆËã·µ»ØÔ²»·°üÎ§ºÐ¾ØÕó
             * @param {module:zrender/shape/Ring~IRingStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function (style) {
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - style.r - lineWidth / 2),
                    y : Math.round(style.y - style.r - lineWidth / 2),
                    width : style.r * 2 + lineWidth,
                    height : style.r * 2 + lineWidth
                };
                
                return style.__rect;
            }
        };

        require('../tool/util').inherits(Ring, Base);
        return Ring;
    });

define("mousewheelevent", ["require", "exports", "module"], function(e, t, n) {
    t.addEvent = function(e, t) {
        var n = function(e) {
            var n = e.type;
            if (n == "DOMMouseScroll" || n == "mousewheel")
                e.delta = e.wheelDelta ? e.wheelDelta / 120 : -(e.detail || 0) / 3;
            return e.srcElement && !e.target && (e.target = e.srcElement),
            !e.preventDefault && e.returnValue !== t && (e.preventDefault = function() {
                e.returnValue = !1
            }
            ),
            e
        }
        ;
        return e.addEventListener ? function(e, r, i, s) {
            r === "mousewheel" && document.mozHidden !== t && (r = "DOMMouseScroll"),
            e.addEventListener(r, function(e) {
                i.call(this, n(e))
            }, s || !1)
        }
        : e.attachEvent ? function(t, r, i, s) {
            t.attachEvent("on" + r, function(r) {
                r = r || e.event,
                i.call(t, n(r))
            })
        }
        : function() {}
    }(window)
});
define("zoomutil", ["mousewheelevent"], function(e) {
    function t(t) {
        var n = this;
        this.zoomContainer = $(".zoom-container"),
        this.zoomCursor = this.zoomContainer.find(".amap-zoom-cursor"),
        this.zoomRulerHeight = this.zoomContainer.find(".amap-zoom-ruler").height(),
        this.zoomInBtn = this.zoomContainer.find(".amap-zoom-plus"),
        this.zoomOutBtn = this.zoomContainer.find(".amap-zoom-minus"),
        this.zoomRange = [1, 20],
        this.level = 10,
        this.isAllowZoom = !0,
        this.dom = t.dom,
        this.isMouseDown = !1,
        this.mouseY = 0,
        this.chart = t.chart,
        this.zoomInBtn.bind("click", function(e) {
            n.updateLevel(1)
        }),
        this.zoomOutBtn.bind("click", function(e) {
            n.updateLevel(-1)
        }),
        this.zoomCursor.bind("mousedown", function(e) {
            n.isMouseDown = !0,
            document.unselectable = "on",
            document.onselectstart = function() {
                return !1
            }
        }),
        $(document).bind("mousemove", function(e) {
            if (n.isMouseDown) {
                var t = $(".amap-zoom-ruler")[0].getBoundingClientRect()
                  , r = t.bottom - t.top - 11;
                n.mouseY = e.clientY - t.top,
                n.mouseY = n.mouseY < 0 ? 0 : n.mouseY > r ? r : n.mouseY,
                n.zoomCursor.css("top", n.mouseY)
            }
        }),
        $(document).bind("mouseup", function(e) {
            if (e.which == 1 && n.isMouseDown) {
                n.isMouseDown = !1,
                document.unselectable = "off",
                document.onselectstart = null ;
                var t = $(".amap-zoom-ruler")[0].getBoundingClientRect()
                  , r = t.bottom - t.top - 11
                  , i = n.mouseY / r * 20;
                i = i == 0 ? 1 : i;
                var s = i < n.level ? 1 : i > n.level ? -1 : 0
                  , o = Math.ceil(Math.abs(i - n.level));
                n.updateLevel(s, o)
            }
        }),
        e.addEvent(t.dom, "mousewheel", function(e) {
            n.updateLevel(e.delta)
        }),
        this.zoomCursor.css("top", this.calculateCursorTop())
    }
    return t.prototype.calculateCursorTop = function() {
        var e = this.level / 20 * this.zoomRulerHeight - 11;
        return e < 0 && (e = 0),
        e
    }
    ,
    t.prototype.updateLevel = function(e, t) {
        t = t || 1;
        if (e > 0 && this.level > this.zoomRange[0])
            this.level -= t,
            this.level = this.level < 0 ? 0 : this.level;
        else {
            if (!(e < 0 && this.level < this.zoomRange[1]))
                return;
            this.level += t,
            this.level = this.level > 20 ? 20 : this.level
        }
        this.level < this.zoomRange[0] ? this.level = this.zoomRange[0] : this.level > this.zoomRange[1] ? this.level = this.zoomRange[1] : this.level >= this.zoomRange[0] && this.level <= this.zoomRange[1] && this.doScale(e, t),
        this.zoomCursor.css("top", this.calculateCursorTop())
    }
    ,
    t.prototype.doScale = function(e, t) {
        var n = this.chart.getOption()
          , r = e > 0 ? 1.1 : 1 / 1.1
          , i = this.chart.getZrender().painter
          , s = !1
          , o = $(this.dom).width() / 2
          , u = $(this.dom).height() / 2;
        i.eachBuildinLayer(function(e) {
            var n = e.position;
            if (e.panable) {
                e.__zoom = e.__zoom || 1;
                var i = e.__zoom;
                i *= Math.pow(r, t),
                i = Math.max(Math.min(e.maxZoom, i), e.minZoom),
                r = i / e.__zoom,
                e.__zoom = i,
                n[0] -= (o - n[0]) * (r - 1),
                n[1] -= (u - n[1]) * (r - 1),
                e.scale[0] *= r,
                e.scale[1] *= r,
                e.dirty = !0,
                s = !0
            }
        }),
        s && i.refresh()
    }
    ,
    t.prototype.reset = function(e) {
        this.zoomContainer = $(".zoom-container"),
        this.zoomCursor = this.zoomContainer.find(".amap-zoom-cursor"),
        this.zoomRulerHeight = this.zoomContainer.find(".amap-zoom-ruler").height(),
        this.zoomInBtn = this.zoomContainer.find(".amap-zoom-plus"),
        this.zoomOutBtn = this.zoomContainer.find(".amap-zoom-minus"),
        this.zoomRange = [1, 20],
        this.level = 10,
        this.isAllowZoom = !0,
        this.isMouseDown = !1,
        this.mouseY = 0,
        this.zoomCursor.css("top", this.calculateCursorTop()),
        this.chart = e
    }
    ,
    t
});


define('zrender', ['zrender/zrender'], function (zrender) { return zrender;});
define('echarts', ['echarts/echarts'], function (echarts) { return echarts;});


var zrender = require('zrender');
zrender.tool = {
    color: require('zrender/tool/color'),
    math: require('zrender/tool/math'),
    util: require('zrender/tool/util'),
    vector: require('zrender/tool/vector'),
    area: require('zrender/tool/area'),
    event: require('zrender/tool/event')
}

zrender.animation = {
    Animation: require('zrender/animation/Animation'),
    Cip: require('zrender/animation/Clip'),
    easing: require('zrender/animation/easing')
}
var echarts = require('echarts');
echarts.config = require('echarts/config');
var zoomutil = require('zoomutil');


require("echarts/chart/tree");


_global['echarts'] = echarts;
_global['zrender'] = zrender;
_global['zoomutil'] = zoomutil;
_global['require'] = require;

return echarts;

})(window);
