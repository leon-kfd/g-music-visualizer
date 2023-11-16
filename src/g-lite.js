import { __assign, __read, __extends, __spreadArray, __awaiter, __generator, __values, __rest } from 'tslib';
import EventEmitter from 'eventemitter3';
import { mat4, vec4, vec3, mat3, quat as quat$1, vec2 } from 'gl-matrix';
import { isNumber, distanceSquareRoot, isString, isNil, clamp, getTotalLength, min, max, isNumberEqual, mod, normalizePath, path2Curve, equalizeSegments, getDrawDirection, reverseCurve, clonePath, getRotatedCurve, isArray, isBoolean, isObject, isUndefined, getPointAtLength } from '@antv/util';
import * as d3 from 'd3-color';
import { arcBox, cubicBox, quadBox, polylineLength, lineLength, linePointAt } from '@antv/g-math';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var rbush = {exports: {}};

(function (module, exports) {
	(function (global, factory) {
	module.exports = factory() ;
	}(commonjsGlobal, function () {
	function quickselect(arr, k, left, right, compare) {
	    quickselectStep(arr, k, left || 0, right || (arr.length - 1), compare || defaultCompare);
	}

	function quickselectStep(arr, k, left, right, compare) {

	    while (right > left) {
	        if (right - left > 600) {
	            var n = right - left + 1;
	            var m = k - left + 1;
	            var z = Math.log(n);
	            var s = 0.5 * Math.exp(2 * z / 3);
	            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
	            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
	            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
	            quickselectStep(arr, k, newLeft, newRight, compare);
	        }

	        var t = arr[k];
	        var i = left;
	        var j = right;

	        swap(arr, left, k);
	        if (compare(arr[right], t) > 0) { swap(arr, left, right); }

	        while (i < j) {
	            swap(arr, i, j);
	            i++;
	            j--;
	            while (compare(arr[i], t) < 0) { i++; }
	            while (compare(arr[j], t) > 0) { j--; }
	        }

	        if (compare(arr[left], t) === 0) { swap(arr, left, j); }
	        else {
	            j++;
	            swap(arr, j, right);
	        }

	        if (j <= k) { left = j + 1; }
	        if (k <= j) { right = j - 1; }
	    }
	}

	function swap(arr, i, j) {
	    var tmp = arr[i];
	    arr[i] = arr[j];
	    arr[j] = tmp;
	}

	function defaultCompare(a, b) {
	    return a < b ? -1 : a > b ? 1 : 0;
	}

	var RBush = function RBush(maxEntries) {
	    if ( maxEntries === void 0 ) maxEntries = 9;

	    // max entries in a node is 9 by default; min node fill is 40% for best performance
	    this._maxEntries = Math.max(4, maxEntries);
	    this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
	    this.clear();
	};

	RBush.prototype.all = function all () {
	    return this._all(this.data, []);
	};

	RBush.prototype.search = function search (bbox) {
	    var node = this.data;
	    var result = [];

	    if (!intersects(bbox, node)) { return result; }

	    var toBBox = this.toBBox;
	    var nodesToSearch = [];

	    while (node) {
	        for (var i = 0; i < node.children.length; i++) {
	            var child = node.children[i];
	            var childBBox = node.leaf ? toBBox(child) : child;

	            if (intersects(bbox, childBBox)) {
	                if (node.leaf) { result.push(child); }
	                else if (contains(bbox, childBBox)) { this._all(child, result); }
	                else { nodesToSearch.push(child); }
	            }
	        }
	        node = nodesToSearch.pop();
	    }

	    return result;
	};

	RBush.prototype.collides = function collides (bbox) {
	    var node = this.data;

	    if (!intersects(bbox, node)) { return false; }

	    var nodesToSearch = [];
	    while (node) {
	        for (var i = 0; i < node.children.length; i++) {
	            var child = node.children[i];
	            var childBBox = node.leaf ? this.toBBox(child) : child;

	            if (intersects(bbox, childBBox)) {
	                if (node.leaf || contains(bbox, childBBox)) { return true; }
	                nodesToSearch.push(child);
	            }
	        }
	        node = nodesToSearch.pop();
	    }

	    return false;
	};

	RBush.prototype.load = function load (data) {
	    if (!(data && data.length)) { return this; }

	    if (data.length < this._minEntries) {
	        for (var i = 0; i < data.length; i++) {
	            this.insert(data[i]);
	        }
	        return this;
	    }

	    // recursively build the tree with the given data from scratch using OMT algorithm
	    var node = this._build(data.slice(), 0, data.length - 1, 0);

	    if (!this.data.children.length) {
	        // save as is if tree is empty
	        this.data = node;

	    } else if (this.data.height === node.height) {
	        // split root if trees have the same height
	        this._splitRoot(this.data, node);

	    } else {
	        if (this.data.height < node.height) {
	            // swap trees if inserted one is bigger
	            var tmpNode = this.data;
	            this.data = node;
	            node = tmpNode;
	        }

	        // insert the small tree into the large tree at appropriate level
	        this._insert(node, this.data.height - node.height - 1, true);
	    }

	    return this;
	};

	RBush.prototype.insert = function insert (item) {
	    if (item) { this._insert(item, this.data.height - 1); }
	    return this;
	};

	RBush.prototype.clear = function clear () {
	    this.data = createNode([]);
	    return this;
	};

	RBush.prototype.remove = function remove (item, equalsFn) {
	    if (!item) { return this; }

	    var node = this.data;
	    var bbox = this.toBBox(item);
	    var path = [];
	    var indexes = [];
	    var i, parent, goingUp;

	    // depth-first iterative tree traversal
	    while (node || path.length) {

	        if (!node) { // go up
	            node = path.pop();
	            parent = path[path.length - 1];
	            i = indexes.pop();
	            goingUp = true;
	        }

	        if (node.leaf) { // check current node
	            var index = findItem(item, node.children, equalsFn);

	            if (index !== -1) {
	                // item found, remove the item and condense tree upwards
	                node.children.splice(index, 1);
	                path.push(node);
	                this._condense(path);
	                return this;
	            }
	        }

	        if (!goingUp && !node.leaf && contains(node, bbox)) { // go down
	            path.push(node);
	            indexes.push(i);
	            i = 0;
	            parent = node;
	            node = node.children[0];

	        } else if (parent) { // go right
	            i++;
	            node = parent.children[i];
	            goingUp = false;

	        } else { node = null; } // nothing found
	    }

	    return this;
	};

	RBush.prototype.toBBox = function toBBox (item) { return item; };

	RBush.prototype.compareMinX = function compareMinX (a, b) { return a.minX - b.minX; };
	RBush.prototype.compareMinY = function compareMinY (a, b) { return a.minY - b.minY; };

	RBush.prototype.toJSON = function toJSON () { return this.data; };

	RBush.prototype.fromJSON = function fromJSON (data) {
	    this.data = data;
	    return this;
	};

	RBush.prototype._all = function _all (node, result) {
	    var nodesToSearch = [];
	    while (node) {
	        if (node.leaf) { result.push.apply(result, node.children); }
	        else { nodesToSearch.push.apply(nodesToSearch, node.children); }

	        node = nodesToSearch.pop();
	    }
	    return result;
	};

	RBush.prototype._build = function _build (items, left, right, height) {

	    var N = right - left + 1;
	    var M = this._maxEntries;
	    var node;

	    if (N <= M) {
	        // reached leaf level; return leaf
	        node = createNode(items.slice(left, right + 1));
	        calcBBox(node, this.toBBox);
	        return node;
	    }

	    if (!height) {
	        // target height of the bulk-loaded tree
	        height = Math.ceil(Math.log(N) / Math.log(M));

	        // target number of root entries to maximize storage utilization
	        M = Math.ceil(N / Math.pow(M, height - 1));
	    }

	    node = createNode([]);
	    node.leaf = false;
	    node.height = height;

	    // split the items into M mostly square tiles

	    var N2 = Math.ceil(N / M);
	    var N1 = N2 * Math.ceil(Math.sqrt(M));

	    multiSelect(items, left, right, N1, this.compareMinX);

	    for (var i = left; i <= right; i += N1) {

	        var right2 = Math.min(i + N1 - 1, right);

	        multiSelect(items, i, right2, N2, this.compareMinY);

	        for (var j = i; j <= right2; j += N2) {

	            var right3 = Math.min(j + N2 - 1, right2);

	            // pack each entry recursively
	            node.children.push(this._build(items, j, right3, height - 1));
	        }
	    }

	    calcBBox(node, this.toBBox);

	    return node;
	};

	RBush.prototype._chooseSubtree = function _chooseSubtree (bbox, node, level, path) {
	    while (true) {
	        path.push(node);

	        if (node.leaf || path.length - 1 === level) { break; }

	        var minArea = Infinity;
	        var minEnlargement = Infinity;
	        var targetNode = (void 0);

	        for (var i = 0; i < node.children.length; i++) {
	            var child = node.children[i];
	            var area = bboxArea(child);
	            var enlargement = enlargedArea(bbox, child) - area;

	            // choose entry with the least area enlargement
	            if (enlargement < minEnlargement) {
	                minEnlargement = enlargement;
	                minArea = area < minArea ? area : minArea;
	                targetNode = child;

	            } else if (enlargement === minEnlargement) {
	                // otherwise choose one with the smallest area
	                if (area < minArea) {
	                    minArea = area;
	                    targetNode = child;
	                }
	            }
	        }

	        node = targetNode || node.children[0];
	    }

	    return node;
	};

	RBush.prototype._insert = function _insert (item, level, isNode) {
	    var bbox = isNode ? item : this.toBBox(item);
	    var insertPath = [];

	    // find the best node for accommodating the item, saving all nodes along the path too
	    var node = this._chooseSubtree(bbox, this.data, level, insertPath);

	    // put the item into the node
	    node.children.push(item);
	    extend(node, bbox);

	    // split on node overflow; propagate upwards if necessary
	    while (level >= 0) {
	        if (insertPath[level].children.length > this._maxEntries) {
	            this._split(insertPath, level);
	            level--;
	        } else { break; }
	    }

	    // adjust bboxes along the insertion path
	    this._adjustParentBBoxes(bbox, insertPath, level);
	};

	// split overflowed node into two
	RBush.prototype._split = function _split (insertPath, level) {
	    var node = insertPath[level];
	    var M = node.children.length;
	    var m = this._minEntries;

	    this._chooseSplitAxis(node, m, M);

	    var splitIndex = this._chooseSplitIndex(node, m, M);

	    var newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
	    newNode.height = node.height;
	    newNode.leaf = node.leaf;

	    calcBBox(node, this.toBBox);
	    calcBBox(newNode, this.toBBox);

	    if (level) { insertPath[level - 1].children.push(newNode); }
	    else { this._splitRoot(node, newNode); }
	};

	RBush.prototype._splitRoot = function _splitRoot (node, newNode) {
	    // split root node
	    this.data = createNode([node, newNode]);
	    this.data.height = node.height + 1;
	    this.data.leaf = false;
	    calcBBox(this.data, this.toBBox);
	};

	RBush.prototype._chooseSplitIndex = function _chooseSplitIndex (node, m, M) {
	    var index;
	    var minOverlap = Infinity;
	    var minArea = Infinity;

	    for (var i = m; i <= M - m; i++) {
	        var bbox1 = distBBox(node, 0, i, this.toBBox);
	        var bbox2 = distBBox(node, i, M, this.toBBox);

	        var overlap = intersectionArea(bbox1, bbox2);
	        var area = bboxArea(bbox1) + bboxArea(bbox2);

	        // choose distribution with minimum overlap
	        if (overlap < minOverlap) {
	            minOverlap = overlap;
	            index = i;

	            minArea = area < minArea ? area : minArea;

	        } else if (overlap === minOverlap) {
	            // otherwise choose distribution with minimum area
	            if (area < minArea) {
	                minArea = area;
	                index = i;
	            }
	        }
	    }

	    return index || M - m;
	};

	// sorts node children by the best axis for split
	RBush.prototype._chooseSplitAxis = function _chooseSplitAxis (node, m, M) {
	    var compareMinX = node.leaf ? this.compareMinX : compareNodeMinX;
	    var compareMinY = node.leaf ? this.compareMinY : compareNodeMinY;
	    var xMargin = this._allDistMargin(node, m, M, compareMinX);
	    var yMargin = this._allDistMargin(node, m, M, compareMinY);

	    // if total distributions margin value is minimal for x, sort by minX,
	    // otherwise it's already sorted by minY
	    if (xMargin < yMargin) { node.children.sort(compareMinX); }
	};

	// total margin of all possible split distributions where each node is at least m full
	RBush.prototype._allDistMargin = function _allDistMargin (node, m, M, compare) {
	    node.children.sort(compare);

	    var toBBox = this.toBBox;
	    var leftBBox = distBBox(node, 0, m, toBBox);
	    var rightBBox = distBBox(node, M - m, M, toBBox);
	    var margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

	    for (var i = m; i < M - m; i++) {
	        var child = node.children[i];
	        extend(leftBBox, node.leaf ? toBBox(child) : child);
	        margin += bboxMargin(leftBBox);
	    }

	    for (var i$1 = M - m - 1; i$1 >= m; i$1--) {
	        var child$1 = node.children[i$1];
	        extend(rightBBox, node.leaf ? toBBox(child$1) : child$1);
	        margin += bboxMargin(rightBBox);
	    }

	    return margin;
	};

	RBush.prototype._adjustParentBBoxes = function _adjustParentBBoxes (bbox, path, level) {
	    // adjust bboxes along the given tree path
	    for (var i = level; i >= 0; i--) {
	        extend(path[i], bbox);
	    }
	};

	RBush.prototype._condense = function _condense (path) {
	    // go through the path, removing empty nodes and updating bboxes
	    for (var i = path.length - 1, siblings = (void 0); i >= 0; i--) {
	        if (path[i].children.length === 0) {
	            if (i > 0) {
	                siblings = path[i - 1].children;
	                siblings.splice(siblings.indexOf(path[i]), 1);

	            } else { this.clear(); }

	        } else { calcBBox(path[i], this.toBBox); }
	    }
	};

	function findItem(item, items, equalsFn) {
	    if (!equalsFn) { return items.indexOf(item); }

	    for (var i = 0; i < items.length; i++) {
	        if (equalsFn(item, items[i])) { return i; }
	    }
	    return -1;
	}

	// calculate node's bbox from bboxes of its children
	function calcBBox(node, toBBox) {
	    distBBox(node, 0, node.children.length, toBBox, node);
	}

	// min bounding rectangle of node children from k to p-1
	function distBBox(node, k, p, toBBox, destNode) {
	    if (!destNode) { destNode = createNode(null); }
	    destNode.minX = Infinity;
	    destNode.minY = Infinity;
	    destNode.maxX = -Infinity;
	    destNode.maxY = -Infinity;

	    for (var i = k; i < p; i++) {
	        var child = node.children[i];
	        extend(destNode, node.leaf ? toBBox(child) : child);
	    }

	    return destNode;
	}

	function extend(a, b) {
	    a.minX = Math.min(a.minX, b.minX);
	    a.minY = Math.min(a.minY, b.minY);
	    a.maxX = Math.max(a.maxX, b.maxX);
	    a.maxY = Math.max(a.maxY, b.maxY);
	    return a;
	}

	function compareNodeMinX(a, b) { return a.minX - b.minX; }
	function compareNodeMinY(a, b) { return a.minY - b.minY; }

	function bboxArea(a)   { return (a.maxX - a.minX) * (a.maxY - a.minY); }
	function bboxMargin(a) { return (a.maxX - a.minX) + (a.maxY - a.minY); }

	function enlargedArea(a, b) {
	    return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
	           (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
	}

	function intersectionArea(a, b) {
	    var minX = Math.max(a.minX, b.minX);
	    var minY = Math.max(a.minY, b.minY);
	    var maxX = Math.min(a.maxX, b.maxX);
	    var maxY = Math.min(a.maxY, b.maxY);

	    return Math.max(0, maxX - minX) *
	           Math.max(0, maxY - minY);
	}

	function contains(a, b) {
	    return a.minX <= b.minX &&
	           a.minY <= b.minY &&
	           b.maxX <= a.maxX &&
	           b.maxY <= a.maxY;
	}

	function intersects(a, b) {
	    return b.minX <= a.maxX &&
	           b.minY <= a.maxY &&
	           b.maxX >= a.minX &&
	           b.maxY >= a.minY;
	}

	function createNode(children) {
	    return {
	        children: children,
	        height: 1,
	        leaf: true,
	        minX: Infinity,
	        minY: Infinity,
	        maxX: -Infinity,
	        maxY: -Infinity
	    };
	}

	// sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
	// combines selection algorithm with binary divide & conquer approach

	function multiSelect(arr, left, right, n, compare) {
	    var stack = [left, right];

	    while (stack.length) {
	        right = stack.pop();
	        left = stack.pop();

	        if (right - left <= n) { continue; }

	        var mid = left + Math.ceil((right - left) / n / 2) * n;
	        quickselect(arr, mid, left, right, compare);

	        stack.push(left, mid, mid, right);
	    }
	}

	return RBush;

	})); 
} (rbush));

var rbushExports = rbush.exports;
var RBush = /*@__PURE__*/getDefaultExportFromCjs(rbushExports);

var Shape;
(function (Shape) {
    Shape["GROUP"] = "g";
    Shape["CIRCLE"] = "circle";
    Shape["ELLIPSE"] = "ellipse";
    Shape["IMAGE"] = "image";
    Shape["RECT"] = "rect";
    Shape["LINE"] = "line";
    Shape["POLYLINE"] = "polyline";
    Shape["POLYGON"] = "polygon";
    Shape["TEXT"] = "text";
    Shape["PATH"] = "path";
    Shape["HTML"] = "html";
    Shape["MESH"] = "mesh";
})(Shape || (Shape = {}));
var ClipSpaceNearZ;
(function (ClipSpaceNearZ) {
    ClipSpaceNearZ[ClipSpaceNearZ["ZERO"] = 0] = "ZERO";
    ClipSpaceNearZ[ClipSpaceNearZ["NEGATIVE_ONE"] = 1] = "NEGATIVE_ONE";
})(ClipSpaceNearZ || (ClipSpaceNearZ = {}));

var AbstractRendererPlugin = /** @class */ (function () {
    function AbstractRendererPlugin() {
        this.plugins = [];
    }
    AbstractRendererPlugin.prototype.addRenderingPlugin = function (plugin) {
        this.plugins.push(plugin);
        this.context.renderingPlugins.push(plugin);
    };
    AbstractRendererPlugin.prototype.removeAllRenderingPlugins = function () {
        var _this = this;
        this.plugins.forEach(function (plugin) {
            var index = _this.context.renderingPlugins.indexOf(plugin);
            if (index >= 0) {
                _this.context.renderingPlugins.splice(index, 1);
            }
        });
    };
    return AbstractRendererPlugin;
}());
var AbstractRenderer = /** @class */ (function () {
    function AbstractRenderer(config) {
        this.clipSpaceNearZ = ClipSpaceNearZ.NEGATIVE_ONE;
        this.plugins = [];
        this.config = __assign({ 
            /**
             * only dirty object will cause re-render
             */
            enableDirtyCheck: true, enableCulling: false, 
            /**
             * enable auto rendering by default
             */
            enableAutoRendering: true, 
            /**
             * enable dirty rectangle rendering by default
             */
            enableDirtyRectangleRendering: true, enableDirtyRectangleRenderingDebug: false }, config);
    }
    AbstractRenderer.prototype.registerPlugin = function (plugin) {
        var index = this.plugins.findIndex(function (p) { return p === plugin; });
        if (index === -1) {
            this.plugins.push(plugin);
        }
    };
    AbstractRenderer.prototype.unregisterPlugin = function (plugin) {
        var index = this.plugins.findIndex(function (p) { return p === plugin; });
        if (index > -1) {
            this.plugins.splice(index, 1);
        }
    };
    AbstractRenderer.prototype.getPlugins = function () {
        return this.plugins;
    };
    AbstractRenderer.prototype.getPlugin = function (name) {
        return this.plugins.find(function (plugin) { return plugin.name === name; });
    };
    AbstractRenderer.prototype.getConfig = function () {
        return this.config;
    };
    AbstractRenderer.prototype.setConfig = function (config) {
        Object.assign(this.config, config);
    };
    return AbstractRenderer;
}());

function copyVec3(a, b) {
    a[0] = b[0];
    a[1] = b[1];
    a[2] = b[2];
    return a;
}
function subVec3(o, a, b) {
    o[0] = a[0] - b[0];
    o[1] = a[1] - b[1];
    o[2] = a[2] - b[2];
    return o;
}
function addVec3(o, a, b) {
    o[0] = a[0] + b[0];
    o[1] = a[1] + b[1];
    o[2] = a[2] + b[2];
    return o;
}
function scaleVec3(o, a, b) {
    o[0] = a[0] * b;
    o[1] = a[1] * b;
    o[2] = a[2] * b;
    return o;
}
function maxVec3(o, a, b) {
    o[0] = Math.max(a[0], b[0]);
    o[1] = Math.max(a[1], b[1]);
    o[2] = Math.max(a[2], b[2]);
    return o;
}
function minVec3(o, a, b) {
    o[0] = Math.min(a[0], b[0]);
    o[1] = Math.min(a[1], b[1]);
    o[2] = Math.min(a[2], b[2]);
    return o;
}
function getAngle(angle) {
    if (angle === undefined) {
        return 0;
    }
    else if (angle > 360 || angle < -360) {
        return angle % 360;
    }
    return angle;
}
function createVec3(x, y, z) {
    if (y === void 0) { y = 0; }
    if (z === void 0) { z = 0; }
    if (Array.isArray(x) && x.length === 3) {
        return vec3.clone(x);
    }
    if (isNumber(x)) {
        return vec3.fromValues(x, y, z);
    }
    return vec3.fromValues(x[0], x[1] || y, x[2] || z);
}
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
function rad2deg(rad) {
    return rad * (180 / Math.PI);
}
function grad2deg(grads) {
    grads = grads % 400;
    if (grads < 0) {
        grads += 400;
    }
    return (grads / 400) * 360;
}
function deg2turn(deg) {
    return deg / 360;
}
function turn2deg(turn) {
    return 360 * turn;
}
function getEulerFromQuat(out, quat) {
    var x = quat[0];
    var y = quat[1];
    var z = quat[2];
    var w = quat[3];
    var x2 = x * x;
    var y2 = y * y;
    var z2 = z * z;
    var w2 = w * w;
    var unit = x2 + y2 + z2 + w2;
    var test = x * w - y * z;
    if (test > 0.499995 * unit) {
        // TODO: Use glmatrix.EPSILON
        // singularity at the north pole
        out[0] = Math.PI / 2;
        out[1] = 2 * Math.atan2(y, x);
        out[2] = 0;
    }
    else if (test < -0.499995 * unit) {
        //TODO: Use glmatrix.EPSILON
        // singularity at the south pole
        out[0] = -Math.PI / 2;
        out[1] = 2 * Math.atan2(y, x);
        out[2] = 0;
    }
    else {
        out[0] = Math.asin(2 * (x * z - w * y));
        out[1] = Math.atan2(2 * (x * w + y * z), 1 - 2 * (z2 + w2));
        out[2] = Math.atan2(2 * (x * y + z * w), 1 - 2 * (y2 + z2));
    }
    // TODO: Return them as degrees and not as radians
    return out;
}
function getEulerFromMat4(out, m) {
    var x;
    var z;
    var halfPi = Math.PI * 0.5;
    var _a = __read(mat4.getScaling(vec3.create(), m), 3), sx = _a[0], sy = _a[1], sz = _a[2];
    var y = Math.asin(-m[2] / sx);
    if (y < halfPi) {
        if (y > -halfPi) {
            x = Math.atan2(m[6] / sy, m[10] / sz);
            z = Math.atan2(m[1] / sx, m[0] / sx);
        }
        else {
            // Not a unique solution
            z = 0;
            x = -Math.atan2(m[4] / sy, m[5] / sy);
        }
    }
    else {
        // Not a unique solution
        z = 0;
        x = Math.atan2(m[4] / sy, m[5] / sy);
    }
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
}
/**
 * @see https://github.com/toji/gl-matrix/issues/329
 * @see https://doc.babylonjs.com/divingDeeper/mesh/transforms/center_origin/rotation_conventions
 */
function getEuler(out, quat) {
    if (quat.length === 16) {
        return getEulerFromMat4(out, quat);
    }
    else {
        return getEulerFromQuat(out, quat);
    }
}
function fromRotationTranslationScale(rotation, x, y, scaleX, scaleY) {
    var cos = Math.cos(rotation);
    var sin = Math.sin(rotation);
    return mat3.fromValues(scaleX * cos, scaleY * sin, 0, -scaleX * sin, scaleY * cos, 0, x, y, 1);
}
function makePerspective(out, left, right, top, bottom, near, far, zero) {
    if (zero === void 0) { zero = false; }
    var x = (2 * near) / (right - left);
    var y = (2 * near) / (top - bottom);
    var a = (right + left) / (right - left);
    var b = (top + bottom) / (top - bottom);
    var c;
    var d;
    if (zero) {
        c = -far / (far - near);
        d = (-far * near) / (far - near);
    }
    else {
        c = -(far + near) / (far - near);
        d = (-2 * far * near) / (far - near);
    }
    out[0] = x;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = y;
    out[6] = 0;
    out[7] = 0;
    out[8] = a;
    out[9] = b;
    out[10] = c;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = d;
    out[15] = 0;
    return out;
}
function decompose(mat) {
    var row0x = mat[0];
    var row0y = mat[1];
    var row1x = mat[3];
    var row1y = mat[4];
    // decompose 3x3 matrix
    // @see https://www.w3.org/TR/css-transforms-1/#decomposing-a-2d-matrix
    var scalingX = Math.sqrt(row0x * row0x + row0y * row0y);
    var scalingY = Math.sqrt(row1x * row1x + row1y * row1y);
    // If determinant is negative, one axis was flipped.
    var determinant = row0x * row1y - row0y * row1x;
    if (determinant < 0) {
        // Flip axis with minimum unit vector dot product.
        if (row0x < row1y) {
            scalingX = -scalingX;
        }
        else {
            scalingY = -scalingY;
        }
    }
    // Renormalize matrix to remove scale.
    if (scalingX) {
        row0x *= 1 / scalingX;
        row0y *= 1 / scalingX;
    }
    if (scalingY) {
        row1x *= 1 / scalingY;
        row1y *= 1 / scalingY;
    }
    // Compute rotation and renormalize matrix.
    var rotation = Math.atan2(row0y, row0x);
    var angle = rad2deg(rotation);
    return [mat[6], mat[7], scalingX, scalingY, angle];
}
var tmp = mat4.create();
var perspectiveMatrix = mat4.create();
var tmpVec4 = vec4.create();
var row = [vec3.create(), vec3.create(), vec3.create()];
var pdum3 = vec3.create();
/*
Input:  matrix      ; a 4x4 matrix
Output: translation ; a 3 component vector
        scale       ; a 3 component vector
        skew        ; skew factors XY,XZ,YZ represented as a 3 component vector
        perspective ; a 4 component vector
        quaternion  ; a 4 component vector
Returns false if the matrix cannot be decomposed, true if it can


References:
https://github.com/kamicane/matrix3d/blob/master/lib/Matrix3d.js
https://github.com/ChromiumWebApps/chromium/blob/master/ui/gfx/transform_util.cc
http://www.w3.org/TR/css3-transforms/#decomposing-a-3d-matrix
*/
function decomposeMat4(matrix, translation, scale, skew, perspective, quaternion) {
    //normalize, if not possible then bail out early
    if (!normalize(tmp, matrix))
        return false;
    // perspectiveMatrix is used to solve for perspective, but it also provides
    // an easy way to test for singularity of the upper 3x3 component.
    mat4.copy(perspectiveMatrix, tmp);
    perspectiveMatrix[3] = 0;
    perspectiveMatrix[7] = 0;
    perspectiveMatrix[11] = 0;
    perspectiveMatrix[15] = 1;
    // If the perspectiveMatrix is not invertible, we are also unable to
    // decompose, so we'll bail early. Constant taken from SkMatrix44::invert.
    if (Math.abs(mat4.determinant(perspectiveMatrix)) < 1e-8)
        return false;
    var a03 = tmp[3], a13 = tmp[7], a23 = tmp[11], a30 = tmp[12], a31 = tmp[13], a32 = tmp[14], a33 = tmp[15];
    // First, isolate perspective.
    if (a03 !== 0 || a13 !== 0 || a23 !== 0) {
        tmpVec4[0] = a03;
        tmpVec4[1] = a13;
        tmpVec4[2] = a23;
        tmpVec4[3] = a33;
        // Solve the equation by inverting perspectiveMatrix and multiplying
        // rightHandSide by the inverse.
        // resuing the perspectiveMatrix here since it's no longer needed
        var ret = mat4.invert(perspectiveMatrix, perspectiveMatrix);
        if (!ret)
            return false;
        mat4.transpose(perspectiveMatrix, perspectiveMatrix);
        //multiply by transposed inverse perspective matrix, into perspective vec4
        vec4.transformMat4(perspective, tmpVec4, perspectiveMatrix);
    }
    else {
        //no perspective
        perspective[0] = perspective[1] = perspective[2] = 0;
        perspective[3] = 1;
    }
    // Next take care of translation
    translation[0] = a30;
    translation[1] = a31;
    translation[2] = a32;
    // Now get scale and shear. 'row' is a 3 element array of 3 component vectors
    mat3from4(row, tmp);
    // Compute X scale factor and normalize first row.
    scale[0] = vec3.length(row[0]);
    vec3.normalize(row[0], row[0]);
    // Compute XY shear factor and make 2nd row orthogonal to 1st.
    skew[0] = vec3.dot(row[0], row[1]);
    combine(row[1], row[1], row[0], 1.0, -skew[0]);
    // Now, compute Y scale and normalize 2nd row.
    scale[1] = vec3.length(row[1]);
    vec3.normalize(row[1], row[1]);
    skew[0] /= scale[1];
    // Compute XZ and YZ shears, orthogonalize 3rd row
    skew[1] = vec3.dot(row[0], row[2]);
    combine(row[2], row[2], row[0], 1.0, -skew[1]);
    skew[2] = vec3.dot(row[1], row[2]);
    combine(row[2], row[2], row[1], 1.0, -skew[2]);
    // Next, get Z scale and normalize 3rd row.
    scale[2] = vec3.length(row[2]);
    vec3.normalize(row[2], row[2]);
    skew[1] /= scale[2];
    skew[2] /= scale[2];
    // At this point, the matrix (in rows) is orthonormal.
    // Check for a coordinate system flip.  If the determinant
    // is -1, then negate the matrix and the scaling factors.
    vec3.cross(pdum3, row[1], row[2]);
    if (vec3.dot(row[0], pdum3) < 0) {
        for (var i = 0; i < 3; i++) {
            scale[i] *= -1;
            row[i][0] *= -1;
            row[i][1] *= -1;
            row[i][2] *= -1;
        }
    }
    // Now, get the rotations out
    quaternion[0] =
        0.5 * Math.sqrt(Math.max(1 + row[0][0] - row[1][1] - row[2][2], 0));
    quaternion[1] =
        0.5 * Math.sqrt(Math.max(1 - row[0][0] + row[1][1] - row[2][2], 0));
    quaternion[2] =
        0.5 * Math.sqrt(Math.max(1 - row[0][0] - row[1][1] + row[2][2], 0));
    quaternion[3] =
        0.5 * Math.sqrt(Math.max(1 + row[0][0] + row[1][1] + row[2][2], 0));
    if (row[2][1] > row[1][2])
        quaternion[0] = -quaternion[0];
    if (row[0][2] > row[2][0])
        quaternion[1] = -quaternion[1];
    if (row[1][0] > row[0][1])
        quaternion[2] = -quaternion[2];
    return true;
}
function normalize(out, mat) {
    var m44 = mat[15];
    // Cannot normalize.
    if (m44 === 0)
        return false;
    var scale = 1 / m44;
    for (var i = 0; i < 16; i++)
        out[i] = mat[i] * scale;
    return true;
}
//gets upper-left of a 4x4 matrix into a 3x3 of vectors
function mat3from4(out, mat4x4) {
    out[0][0] = mat4x4[0];
    out[0][1] = mat4x4[1];
    out[0][2] = mat4x4[2];
    out[1][0] = mat4x4[4];
    out[1][1] = mat4x4[5];
    out[1][2] = mat4x4[6];
    out[2][0] = mat4x4[8];
    out[2][1] = mat4x4[9];
    out[2][2] = mat4x4[10];
}
function combine(out, a, b, scale1, scale2) {
    out[0] = a[0] * scale1 + b[0] * scale2;
    out[1] = a[1] * scale1 + b[1] * scale2;
    out[2] = a[2] * scale1 + b[2] * scale2;
}

/**
 * Axis-Aligned Bounding Box
 * 为了便于后续 Frustum Culling，通过查找表定义 p-vertex 和 n-vertex
 * @see https://github.com/antvis/GWebGPUEngine/issues/3
 */
var AABB = /** @class */ (function () {
    function AABB() {
        this.center = [0, 0, 0];
        this.halfExtents = [0, 0, 0];
        this.min = [0, 0, 0];
        this.max = [0, 0, 0];
    }
    AABB.isEmpty = function (aabb) {
        return (!aabb ||
            (aabb.halfExtents[0] === 0 &&
                aabb.halfExtents[1] === 0 &&
                aabb.halfExtents[2] === 0));
    };
    // center: vec3 = vec3.create();
    // halfExtents: vec3 = vec3.create();
    // min: vec3 = vec3.create();
    // max: vec3 = vec3.create();
    AABB.prototype.update = function (center, halfExtents) {
        copyVec3(this.center, center);
        copyVec3(this.halfExtents, halfExtents);
        subVec3(this.min, this.center, this.halfExtents);
        addVec3(this.max, this.center, this.halfExtents);
        // vec3.copy(this.center, center);
        // vec3.copy(this.halfExtents, halfExtents);
        // vec3.sub(this.min, this.center, this.halfExtents);
        // vec3.add(this.max, this.center, this.halfExtents);
    };
    AABB.prototype.setMinMax = function (min, max) {
        // vec3.add(this.center, max, min);
        // vec3.scale(this.center, this.center, 0.5);
        // vec3.sub(this.halfExtents, max, min);
        // vec3.scale(this.halfExtents, this.halfExtents, 0.5);
        // vec3.copy(this.min, min);
        // vec3.copy(this.max, max);
        addVec3(this.center, max, min);
        scaleVec3(this.center, this.center, 0.5);
        subVec3(this.halfExtents, max, min);
        scaleVec3(this.halfExtents, this.halfExtents, 0.5);
        copyVec3(this.min, min);
        copyVec3(this.max, max);
    };
    AABB.prototype.getMin = function () {
        return this.min;
    };
    AABB.prototype.getMax = function () {
        return this.max;
    };
    AABB.prototype.add = function (aabb) {
        if (AABB.isEmpty(aabb)) {
            return;
        }
        if (AABB.isEmpty(this)) {
            this.setMinMax(aabb.getMin(), aabb.getMax());
            return;
        }
        var tc = this.center;
        var tcx = tc[0];
        var tcy = tc[1];
        var tcz = tc[2];
        var th = this.halfExtents;
        var thx = th[0];
        var thy = th[1];
        var thz = th[2];
        var tminx = tcx - thx;
        var tmaxx = tcx + thx;
        var tminy = tcy - thy;
        var tmaxy = tcy + thy;
        var tminz = tcz - thz;
        var tmaxz = tcz + thz;
        var oc = aabb.center;
        var ocx = oc[0];
        var ocy = oc[1];
        var ocz = oc[2];
        var oh = aabb.halfExtents;
        var ohx = oh[0];
        var ohy = oh[1];
        var ohz = oh[2];
        var ominx = ocx - ohx;
        var omaxx = ocx + ohx;
        var ominy = ocy - ohy;
        var omaxy = ocy + ohy;
        var ominz = ocz - ohz;
        var omaxz = ocz + ohz;
        if (ominx < tminx) {
            tminx = ominx;
        }
        if (omaxx > tmaxx) {
            tmaxx = omaxx;
        }
        if (ominy < tminy) {
            tminy = ominy;
        }
        if (omaxy > tmaxy) {
            tmaxy = omaxy;
        }
        if (ominz < tminz) {
            tminz = ominz;
        }
        if (omaxz > tmaxz) {
            tmaxz = omaxz;
        }
        tc[0] = (tminx + tmaxx) * 0.5;
        tc[1] = (tminy + tmaxy) * 0.5;
        tc[2] = (tminz + tmaxz) * 0.5;
        th[0] = (tmaxx - tminx) * 0.5;
        th[1] = (tmaxy - tminy) * 0.5;
        th[2] = (tmaxz - tminz) * 0.5;
        this.min[0] = tminx;
        this.min[1] = tminy;
        this.min[2] = tminz;
        this.max[0] = tmaxx;
        this.max[1] = tmaxy;
        this.max[2] = tmaxz;
    };
    AABB.prototype.setFromTransformedAABB = function (aabb, m) {
        var bc = this.center;
        var br = this.halfExtents;
        var ac = aabb.center;
        var ar = aabb.halfExtents;
        var mx0 = m[0];
        var mx1 = m[4];
        var mx2 = m[8];
        var my0 = m[1];
        var my1 = m[5];
        var my2 = m[9];
        var mz0 = m[2];
        var mz1 = m[6];
        var mz2 = m[10];
        var mx0a = Math.abs(mx0);
        var mx1a = Math.abs(mx1);
        var mx2a = Math.abs(mx2);
        var my0a = Math.abs(my0);
        var my1a = Math.abs(my1);
        var my2a = Math.abs(my2);
        var mz0a = Math.abs(mz0);
        var mz1a = Math.abs(mz1);
        var mz2a = Math.abs(mz2);
        bc[0] = m[12] + mx0 * ac[0] + mx1 * ac[1] + mx2 * ac[2];
        bc[1] = m[13] + my0 * ac[0] + my1 * ac[1] + my2 * ac[2];
        bc[2] = m[14] + mz0 * ac[0] + mz1 * ac[1] + mz2 * ac[2];
        // vec3.set(
        //   bc,
        //   m[12] + mx0 * ac[0] + mx1 * ac[1] + mx2 * ac[2],
        //   m[13] + my0 * ac[0] + my1 * ac[1] + my2 * ac[2],
        //   m[14] + mz0 * ac[0] + mz1 * ac[1] + mz2 * ac[2],
        // );
        br[0] = mx0a * ar[0] + mx1a * ar[1] + mx2a * ar[2];
        br[1] = my0a * ar[0] + my1a * ar[1] + my2a * ar[2];
        br[2] = mz0a * ar[0] + mz1a * ar[1] + mz2a * ar[2];
        // vec3.set(
        //   br,
        //   mx0a * ar[0] + mx1a * ar[1] + mx2a * ar[2],
        //   my0a * ar[0] + my1a * ar[1] + my2a * ar[2],
        //   mz0a * ar[0] + mz1a * ar[1] + mz2a * ar[2],
        // );
        // this.min = vec3.sub(this.min, bc, br);
        // this.max = vec3.add(this.max, bc, br);
        subVec3(this.min, bc, br);
        addVec3(this.max, bc, br);
    };
    AABB.prototype.intersects = function (aabb) {
        var aMax = this.getMax();
        var aMin = this.getMin();
        var bMax = aabb.getMax();
        var bMin = aabb.getMin();
        return (aMin[0] <= bMax[0] &&
            aMax[0] >= bMin[0] &&
            aMin[1] <= bMax[1] &&
            aMax[1] >= bMin[1] &&
            aMin[2] <= bMax[2] &&
            aMax[2] >= bMin[2]);
    };
    AABB.prototype.intersection = function (aabb) {
        if (!this.intersects(aabb)) {
            return null;
        }
        var intersection = new AABB();
        // const min = vec3.max(vec3.create(), this.getMin(), aabb.getMin());
        // const max = vec3.min(vec3.create(), this.getMax(), aabb.getMax());
        var min = maxVec3([0, 0, 0], this.getMin(), aabb.getMin());
        var max = minVec3([0, 0, 0], this.getMax(), aabb.getMax());
        intersection.setMinMax(min, max);
        return intersection;
    };
    // containsPoint(point: vec3) {
    //   const min = this.getMin();
    //   const max = this.getMax();
    //   return !(
    //     point[0] < min[0] ||
    //     point[0] > max[0] ||
    //     point[1] < min[1] ||
    //     point[1] > max[1] ||
    //     point[2] < min[2] ||
    //     point[2] > max[2]
    //   );
    // }
    /**
     * get n-vertex
     * @param plane plane of CullingVolume
     */
    AABB.prototype.getNegativeFarPoint = function (plane) {
        if (plane.pnVertexFlag === 0x111) {
            return copyVec3([0, 0, 0], this.min);
            // return vec3.copy(vec3.create(), this.min);
        }
        else if (plane.pnVertexFlag === 0x110) {
            return [this.min[0], this.min[1], this.max[2]];
            // return vec3.fromValues(this.min[0], this.min[1], this.max[2]);
        }
        else if (plane.pnVertexFlag === 0x101) {
            return [this.min[0], this.max[1], this.min[2]];
            // return vec3.fromValues(this.min[0], this.max[1], this.min[2]);
        }
        else if (plane.pnVertexFlag === 0x100) {
            return [this.min[0], this.max[1], this.max[2]];
            // return vec3.fromValues(this.min[0], this.max[1], this.max[2]);
        }
        else if (plane.pnVertexFlag === 0x011) {
            return [this.max[0], this.min[1], this.min[2]];
            // return vec3.fromValues(this.max[0], this.min[1], this.min[2]);
        }
        else if (plane.pnVertexFlag === 0x010) {
            return [this.max[0], this.min[1], this.max[2]];
            // return vec3.fromValues(this.max[0], this.min[1], this.max[2]);
        }
        else if (plane.pnVertexFlag === 0x001) {
            return [this.max[0], this.max[1], this.min[2]];
            // return vec3.fromValues(this.max[0], this.max[1], this.min[2]);
        }
        else {
            return [this.max[0], this.max[1], this.max[2]];
            // return vec3.fromValues(this.max[0], this.max[1], this.max[2]);
        }
    };
    /**
     * get p-vertex
     * @param plane plane of CullingVolume
     */
    AABB.prototype.getPositiveFarPoint = function (plane) {
        if (plane.pnVertexFlag === 0x111) {
            return copyVec3([0, 0, 0], this.max);
            // return vec3.copy(vec3.create(), this.max);
        }
        else if (plane.pnVertexFlag === 0x110) {
            return [this.max[0], this.max[1], this.min[2]];
            // return vec3.fromValues(this.max[0], this.max[1], this.min[2]);
        }
        else if (plane.pnVertexFlag === 0x101) {
            return [this.max[0], this.min[1], this.max[2]];
            // return vec3.fromValues(this.max[0], this.min[1], this.max[2]);
        }
        else if (plane.pnVertexFlag === 0x100) {
            return [this.max[0], this.min[1], this.min[2]];
            // return vec3.fromValues(this.max[0], this.min[1], this.min[2]);
        }
        else if (plane.pnVertexFlag === 0x011) {
            return [this.min[0], this.max[1], this.max[2]];
            // return vec3.fromValues(this.min[0], this.max[1], this.max[2]);
        }
        else if (plane.pnVertexFlag === 0x010) {
            return [this.min[0], this.max[1], this.min[2]];
            // return vec3.fromValues(this.min[0], this.max[1], this.min[2]);
        }
        else if (plane.pnVertexFlag === 0x001) {
            return [this.min[0], this.min[1], this.max[2]];
            // return vec3.fromValues(this.min[0], this.min[1], this.max[2]);
        }
        else {
            return [this.min[0], this.min[1], this.min[2]];
            // return vec3.fromValues(this.min[0], this.min[1], this.min[2]);
        }
    };
    return AABB;
}());

var Plane = /** @class */ (function () {
    function Plane(distance, normal) {
        this.distance = distance || 0;
        this.normal = normal || vec3.fromValues(0, 1, 0);
        this.updatePNVertexFlag();
    }
    Plane.prototype.updatePNVertexFlag = function () {
        this.pnVertexFlag =
            (Number(this.normal[0] >= 0) << 8) +
                (Number(this.normal[1] >= 0) << 4) +
                Number(this.normal[2] >= 0);
    };
    Plane.prototype.distanceToPoint = function (point) {
        return vec3.dot(point, this.normal) - this.distance;
    };
    Plane.prototype.normalize = function () {
        var invLen = 1 / vec3.len(this.normal);
        vec3.scale(this.normal, this.normal, invLen);
        this.distance *= invLen;
    };
    Plane.prototype.intersectsLine = function (start, end, point) {
        var d0 = this.distanceToPoint(start);
        var d1 = this.distanceToPoint(end);
        var t = d0 / (d0 - d1);
        var intersects = t >= 0 && t <= 1;
        if (intersects && point) {
            vec3.lerp(point, start, end, t);
        }
        return intersects;
    };
    return Plane;
}());

var Mask;
(function (Mask) {
    Mask[Mask["OUTSIDE"] = 4294967295] = "OUTSIDE";
    Mask[Mask["INSIDE"] = 0] = "INSIDE";
    Mask[Mask["INDETERMINATE"] = 2147483647] = "INDETERMINATE";
})(Mask || (Mask = {}));
var Frustum = /** @class */ (function () {
    function Frustum(planes) {
        this.planes = [];
        if (planes) {
            this.planes = planes;
        }
        else {
            for (var i = 0; i < 6; i++) {
                this.planes.push(new Plane());
            }
        }
    }
    /**
     * extract 6 planes from projectionMatrix
     * @see http://www8.cs.umu.se/kurser/5DV051/HT12/lab/plane_extraction.pdf
     */
    Frustum.prototype.extractFromVPMatrix = function (projectionMatrix) {
        // @ts-ignore
        var _a = __read(projectionMatrix, 16), m0 = _a[0], m1 = _a[1], m2 = _a[2], m3 = _a[3], m4 = _a[4], m5 = _a[5], m6 = _a[6], m7 = _a[7], m8 = _a[8], m9 = _a[9], m10 = _a[10], m11 = _a[11], m12 = _a[12], m13 = _a[13], m14 = _a[14], m15 = _a[15];
        // right
        vec3.set(this.planes[0].normal, m3 - m0, m7 - m4, m11 - m8);
        this.planes[0].distance = m15 - m12;
        // left
        vec3.set(this.planes[1].normal, m3 + m0, m7 + m4, m11 + m8);
        this.planes[1].distance = m15 + m12;
        // bottom
        vec3.set(this.planes[2].normal, m3 + m1, m7 + m5, m11 + m9);
        this.planes[2].distance = m15 + m13;
        // top
        vec3.set(this.planes[3].normal, m3 - m1, m7 - m5, m11 - m9);
        this.planes[3].distance = m15 - m13;
        // far
        vec3.set(this.planes[4].normal, m3 - m2, m7 - m6, m11 - m10);
        this.planes[4].distance = m15 - m14;
        // near
        vec3.set(this.planes[5].normal, m3 + m2, m7 + m6, m11 + m10);
        this.planes[5].distance = m15 + m14;
        this.planes.forEach(function (plane) {
            plane.normalize();
            plane.updatePNVertexFlag();
        });
    };
    return Frustum;
}());

var Point = /** @class */ (function () {
    function Point(x, y) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
    Point.prototype.clone = function () {
        return new Point(this.x, this.y);
    };
    Point.prototype.copyFrom = function (p) {
        this.x = p.x;
        this.y = p.y;
    };
    return Point;
}());

var Rectangle = /** @class */ (function () {
    function Rectangle(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.left = x;
        this.right = x + width;
        this.top = y;
        this.bottom = y + height;
    }
    Rectangle.prototype.toJSON = function () { };
    return Rectangle;
}());

var ERROR_MSG_METHOD_NOT_IMPLEMENTED = 'Method not implemented.';
var ERROR_MSG_USE_DOCUMENT_ELEMENT = 'Use document.documentElement instead.';
var ERROR_MSG_APPEND_DESTROYED_ELEMENT = 'Cannot append a destroyed element.';

/**
 * Different type of cameras, eg. simple camera used in 2D scene or
 * advanced camera which can do actions & switch between landmarks.
 */
var CameraType;
(function (CameraType) {
    /**
     * Performs all the rotational operations with the focal point instead of the camera position.
     * This type of camera is useful in applications(like CAD) where 3D objects are being designed or explored.
     * Camera cannot orbits over the north & south poles.
     * @see http://voxelent.com/tutorial-cameras/
     *
     * In Three.js it's used in OrbitControls.
     * @see https://threejs.org/docs/#examples/zh/controls/OrbitControls
     */
    CameraType[CameraType["ORBITING"] = 0] = "ORBITING";
    /**
     * It's similar to the ORBITING camera, but it allows the camera to orbit over the north or south poles.
     *
     * In Three.js it's used in OrbitControls.
     * @see https://threejs.org/docs/#examples/en/controls/TrackballControls
     */
    CameraType[CameraType["EXPLORING"] = 1] = "EXPLORING";
    /**
     * Performs all the rotational operations with the camera position.
     * It's useful in first person shooting games.
     * Camera cannot orbits over the north & south poles.
     *
     * In Three.js it's used in FirstPersonControls.
     * @see https://threejs.org/docs/#examples/en/controls/FirstPersonControls
     */
    CameraType[CameraType["TRACKING"] = 2] = "TRACKING";
})(CameraType || (CameraType = {}));
/**
 * CameraType must be TRACKING
 */
var CameraTrackingMode;
(function (CameraTrackingMode) {
    CameraTrackingMode[CameraTrackingMode["DEFAULT"] = 0] = "DEFAULT";
    CameraTrackingMode[CameraTrackingMode["ROTATIONAL"] = 1] = "ROTATIONAL";
    CameraTrackingMode[CameraTrackingMode["TRANSLATIONAL"] = 2] = "TRANSLATIONAL";
    CameraTrackingMode[CameraTrackingMode["CINEMATIC"] = 3] = "CINEMATIC";
})(CameraTrackingMode || (CameraTrackingMode = {}));
var CameraProjectionMode;
(function (CameraProjectionMode) {
    CameraProjectionMode[CameraProjectionMode["ORTHOGRAPHIC"] = 0] = "ORTHOGRAPHIC";
    CameraProjectionMode[CameraProjectionMode["PERSPECTIVE"] = 1] = "PERSPECTIVE";
})(CameraProjectionMode || (CameraProjectionMode = {}));
var CameraEvent = {
    UPDATED: 'updated',
};

var MIN_DISTANCE = 0.0002;
/**
 * 参考「WebGL Insights - 23.Designing Cameras for WebGL Applications」，基于 Responsible Camera 思路设计
 * @see https://github.com/d13g0/nucleo.js/blob/master/source/camera/Camera.js
 *
 * 保存相机参数，定义相机动作：
 * 1. dolly 沿 n 轴移动
 * 2. pan 沿 u v 轴移动
 * 3. rotate 以方位角旋转
 * 4. 移动到 Landmark，具有平滑的动画效果，其间禁止其他用户交互
 */
var Camera = /** @class */ (function () {
    function Camera() {
        /**
         * Clip space near Z, default to range `[-1, 1]`
         */
        this.clipSpaceNearZ = ClipSpaceNearZ.NEGATIVE_ONE;
        this.eventEmitter = new EventEmitter();
        /**
         * Matrix of camera
         */
        this.matrix = mat4.create();
        /**
         * u axis +X is right
         * @see http://learnwebgl.brown37.net/07_cameras/camera_introduction.html#a-camera-definition
         */
        this.right = vec3.fromValues(1, 0, 0);
        /**
         * v axis +Y is up
         */
        this.up = vec3.fromValues(0, 1, 0);
        /**
         * n axis +Z is inside
         */
        this.forward = vec3.fromValues(0, 0, 1);
        /**
         * Position of camera.
         */
        this.position = vec3.fromValues(0, 0, 1);
        /**
         * Position of focal point.
         */
        this.focalPoint = vec3.fromValues(0, 0, 0);
        /**
         * vector from focalPoint to position
         */
        this.distanceVector = vec3.fromValues(0, 0, -1);
        /**
         * length(focalPoint - position)
         */
        this.distance = 1;
        /**
         * @see https://en.wikipedia.org/wiki/Azimuth
         */
        this.azimuth = 0;
        this.elevation = 0;
        this.roll = 0;
        this.relAzimuth = 0;
        this.relElevation = 0;
        this.relRoll = 0;
        /**
         * 沿 n 轴移动时，保证移动速度从快到慢
         */
        this.dollyingStep = 0;
        this.maxDistance = Infinity;
        this.minDistance = -Infinity;
        /**
         * zoom factor of the camera, default is 1
         * eg. https://threejs.org/docs/#api/en/cameras/OrthographicCamera.zoom
         */
        this.zoom = 1;
        /**
         * invert the horizontal coordinate system HCS
         */
        this.rotateWorld = false;
        /**
         * 投影矩阵参数
         */
        /**
         * field of view [0-360]
         * @see http://en.wikipedia.org/wiki/Angle_of_view
         */
        this.fov = 30;
        this.near = 0.1;
        this.far = 1000;
        this.aspect = 1;
        this.projectionMatrix = mat4.create();
        this.projectionMatrixInverse = mat4.create();
        this.jitteredProjectionMatrix = undefined;
        this.enableUpdate = true;
        // protected following = undefined;
        this.type = CameraType.EXPLORING;
        this.trackingMode = CameraTrackingMode.DEFAULT;
        this.projectionMode = CameraProjectionMode.PERSPECTIVE;
        /**
         * for culling use
         */
        this.frustum = new Frustum();
        /**
         * ortho matrix for Canvas2D & SVG
         */
        this.orthoMatrix = mat4.create();
    }
    // constructor(type = CameraType.EXPLORING, trackingMode = CameraTrackingMode.DEFAULT) {
    //   this.setType(type, trackingMode);
    // }
    Camera.prototype.isOrtho = function () {
        return this.projectionMode === CameraProjectionMode.ORTHOGRAPHIC;
    };
    Camera.prototype.getProjectionMode = function () {
        return this.projectionMode;
    };
    Camera.prototype.getPerspective = function () {
        // account for TAA
        return this.jitteredProjectionMatrix || this.projectionMatrix;
    };
    Camera.prototype.getPerspectiveInverse = function () {
        return this.projectionMatrixInverse;
    };
    Camera.prototype.getFrustum = function () {
        return this.frustum;
    };
    Camera.prototype.getPosition = function () {
        return this.position;
    };
    Camera.prototype.getFocalPoint = function () {
        return this.focalPoint;
    };
    Camera.prototype.getDollyingStep = function () {
        return this.dollyingStep;
    };
    Camera.prototype.getNear = function () {
        return this.near;
    };
    Camera.prototype.getFar = function () {
        return this.far;
    };
    Camera.prototype.getZoom = function () {
        return this.zoom;
    };
    Camera.prototype.getOrthoMatrix = function () {
        return this.orthoMatrix;
    };
    Camera.prototype.getView = function () {
        return this.view;
    };
    Camera.prototype.setEnableUpdate = function (enabled) {
        this.enableUpdate = enabled;
    };
    Camera.prototype.setType = function (type, trackingMode) {
        this.type = type;
        if (this.type === CameraType.EXPLORING) {
            this.setWorldRotation(true);
        }
        else {
            this.setWorldRotation(false);
        }
        this._getAngles();
        if (this.type === CameraType.TRACKING && trackingMode !== undefined) {
            this.setTrackingMode(trackingMode);
        }
        return this;
    };
    Camera.prototype.setProjectionMode = function (projectionMode) {
        this.projectionMode = projectionMode;
        return this;
    };
    Camera.prototype.setTrackingMode = function (trackingMode) {
        if (this.type !== CameraType.TRACKING) {
            throw new Error('Impossible to set a tracking mode if the camera is not of tracking type');
        }
        this.trackingMode = trackingMode;
        return this;
    };
    /**
     * If flag is true, it reverses the azimuth and elevation angles.
     * Subsequent calls to rotate, setAzimuth, setElevation,
     * changeAzimuth or changeElevation will cause the inverted effect.
     * setRoll or changeRoll is not affected by this method.
     *
     * This inversion is useful when one wants to simulate that the world
     * is moving, instead of the camera.
     *
     * By default the camera angles are not reversed.
     * @param {Boolean} flag the boolean flag to reverse the angles.
     */
    Camera.prototype.setWorldRotation = function (flag) {
        this.rotateWorld = flag;
        this._getAngles();
        return this;
    };
    /**
     * 计算 MV 矩阵，为相机矩阵的逆矩阵
     */
    Camera.prototype.getViewTransform = function () {
        return mat4.invert(mat4.create(), this.matrix);
    };
    Camera.prototype.getWorldTransform = function () {
        return this.matrix;
    };
    Camera.prototype.jitterProjectionMatrix = function (x, y) {
        var translation = mat4.fromTranslation(mat4.create(), [x, y, 0]);
        this.jitteredProjectionMatrix = mat4.multiply(mat4.create(), translation, this.projectionMatrix);
    };
    Camera.prototype.clearJitterProjectionMatrix = function () {
        this.jitteredProjectionMatrix = undefined;
    };
    /**
     * 设置相机矩阵
     */
    Camera.prototype.setMatrix = function (matrix) {
        this.matrix = matrix;
        this._update();
        return this;
    };
    Camera.prototype.setFov = function (fov) {
        this.setPerspective(this.near, this.far, fov, this.aspect);
        return this;
    };
    Camera.prototype.setAspect = function (aspect) {
        this.setPerspective(this.near, this.far, this.fov, aspect);
        return this;
    };
    Camera.prototype.setNear = function (near) {
        if (this.projectionMode === CameraProjectionMode.PERSPECTIVE) {
            this.setPerspective(near, this.far, this.fov, this.aspect);
        }
        else {
            this.setOrthographic(this.left, this.rright, this.top, this.bottom, near, this.far);
        }
        return this;
    };
    Camera.prototype.setFar = function (far) {
        if (this.projectionMode === CameraProjectionMode.PERSPECTIVE) {
            this.setPerspective(this.near, far, this.fov, this.aspect);
        }
        else {
            this.setOrthographic(this.left, this.rright, this.top, this.bottom, this.near, far);
        }
        return this;
    };
    /**
     * Sets an offset in a larger frustum, used in PixelPicking
     */
    Camera.prototype.setViewOffset = function (fullWidth, fullHeight, x, y, width, height) {
        this.aspect = fullWidth / fullHeight;
        if (this.view === undefined) {
            this.view = {
                enabled: true,
                fullWidth: 1,
                fullHeight: 1,
                offsetX: 0,
                offsetY: 0,
                width: 1,
                height: 1,
            };
        }
        this.view.enabled = true;
        this.view.fullWidth = fullWidth;
        this.view.fullHeight = fullHeight;
        this.view.offsetX = x;
        this.view.offsetY = y;
        this.view.width = width;
        this.view.height = height;
        if (this.projectionMode === CameraProjectionMode.PERSPECTIVE) {
            this.setPerspective(this.near, this.far, this.fov, this.aspect);
        }
        else {
            this.setOrthographic(this.left, this.rright, this.top, this.bottom, this.near, this.far);
        }
        return this;
    };
    Camera.prototype.clearViewOffset = function () {
        if (this.view !== undefined) {
            this.view.enabled = false;
        }
        if (this.projectionMode === CameraProjectionMode.PERSPECTIVE) {
            this.setPerspective(this.near, this.far, this.fov, this.aspect);
        }
        else {
            this.setOrthographic(this.left, this.rright, this.top, this.bottom, this.near, this.far);
        }
        return this;
    };
    Camera.prototype.setZoom = function (zoom) {
        this.zoom = zoom;
        if (this.projectionMode === CameraProjectionMode.ORTHOGRAPHIC) {
            this.setOrthographic(this.left, this.rright, this.top, this.bottom, this.near, this.far);
        }
        else if (this.projectionMode === CameraProjectionMode.PERSPECTIVE) {
            this.setPerspective(this.near, this.far, this.fov, this.aspect);
        }
        return this;
    };
    /**
     * Zoom by specified point in viewport coordinates.
     */
    Camera.prototype.setZoomByViewportPoint = function (zoom, viewportPoint) {
        var _a = this.canvas.viewport2Canvas({
            x: viewportPoint[0],
            y: viewportPoint[1],
        }), ox = _a.x, oy = _a.y;
        var roll = this.roll;
        this.rotate(0, 0, -roll);
        this.setPosition(ox, oy);
        this.setFocalPoint(ox, oy);
        this.setZoom(zoom);
        this.rotate(0, 0, roll);
        var _b = this.canvas.viewport2Canvas({
            x: viewportPoint[0],
            y: viewportPoint[1],
        }), cx = _b.x, cy = _b.y;
        // project to rotated axis
        var dvec = vec3.fromValues(cx - ox, cy - oy, 0);
        var dx = vec3.dot(dvec, this.right) / vec3.length(this.right);
        var dy = vec3.dot(dvec, this.up) / vec3.length(this.up);
        this.pan(-dx, -dy);
        return this;
    };
    Camera.prototype.setPerspective = function (near, far, fov, aspect) {
        var _a;
        this.projectionMode = CameraProjectionMode.PERSPECTIVE;
        this.fov = fov;
        this.near = near;
        this.far = far;
        this.aspect = aspect;
        var top = (this.near * Math.tan(deg2rad(0.5 * this.fov))) / this.zoom;
        var height = 2 * top;
        var width = this.aspect * height;
        var left = -0.5 * width;
        if ((_a = this.view) === null || _a === void 0 ? void 0 : _a.enabled) {
            var fullWidth = this.view.fullWidth;
            var fullHeight = this.view.fullHeight;
            left += (this.view.offsetX * width) / fullWidth;
            top -= (this.view.offsetY * height) / fullHeight;
            width *= this.view.width / fullWidth;
            height *= this.view.height / fullHeight;
        }
        makePerspective(this.projectionMatrix, left, left + width, top, top - height, near, this.far, this.clipSpaceNearZ === ClipSpaceNearZ.ZERO);
        // flipY since the origin of OpenGL/WebGL is bottom-left compared with top-left in Canvas2D
        mat4.scale(this.projectionMatrix, this.projectionMatrix, vec3.fromValues(1, -1, 1));
        mat4.invert(this.projectionMatrixInverse, this.projectionMatrix);
        this.triggerUpdate();
        return this;
    };
    Camera.prototype.setOrthographic = function (l, r, t, b, near, far) {
        var _a;
        this.projectionMode = CameraProjectionMode.ORTHOGRAPHIC;
        this.rright = r;
        this.left = l;
        this.top = t;
        this.bottom = b;
        this.near = near;
        this.far = far;
        var dx = (this.rright - this.left) / (2 * this.zoom);
        var dy = (this.top - this.bottom) / (2 * this.zoom);
        var cx = (this.rright + this.left) / 2;
        var cy = (this.top + this.bottom) / 2;
        var left = cx - dx;
        var right = cx + dx;
        var top = cy + dy;
        var bottom = cy - dy;
        if ((_a = this.view) === null || _a === void 0 ? void 0 : _a.enabled) {
            var scaleW = (this.rright - this.left) / this.view.fullWidth / this.zoom;
            var scaleH = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
            left += scaleW * this.view.offsetX;
            right = left + scaleW * this.view.width;
            top -= scaleH * this.view.offsetY;
            bottom = top - scaleH * this.view.height;
        }
        if (this.clipSpaceNearZ === ClipSpaceNearZ.NEGATIVE_ONE) {
            mat4.ortho(this.projectionMatrix, left, right, bottom, top, near, far);
        }
        else {
            mat4.orthoZO(this.projectionMatrix, left, right, bottom, top, near, far);
        }
        // flipY since the origin of OpenGL/WebGL is bottom-left compared with top-left in Canvas2D
        mat4.scale(this.projectionMatrix, this.projectionMatrix, vec3.fromValues(1, -1, 1));
        mat4.invert(this.projectionMatrixInverse, this.projectionMatrix);
        this._getOrthoMatrix();
        this.triggerUpdate();
        return this;
    };
    /**
     * Move the camera in world coordinates.
     * It will keep looking at the current focal point.
     *
     * support scalars or vectors.
     * @example
     * setPosition(1, 2, 3);
     * setPosition([1, 2, 3]);
     */
    Camera.prototype.setPosition = function (x, y, z) {
        if (y === void 0) { y = this.position[1]; }
        if (z === void 0) { z = this.position[2]; }
        var position = createVec3(x, y, z);
        this._setPosition(position);
        this.setFocalPoint(this.focalPoint);
        this.triggerUpdate();
        return this;
    };
    /**
     * Sets the focal point of this camera in world coordinates.
     *
     * support scalars or vectors.
     * @example
     * setFocalPoint(1, 2, 3);
     * setFocalPoint([1, 2, 3]);
     */
    Camera.prototype.setFocalPoint = function (x, y, z) {
        if (y === void 0) { y = this.focalPoint[1]; }
        if (z === void 0) { z = this.focalPoint[2]; }
        var up = vec3.fromValues(0, 1, 0);
        this.focalPoint = createVec3(x, y, z);
        if (this.trackingMode === CameraTrackingMode.CINEMATIC) {
            var d = vec3.subtract(vec3.create(), this.focalPoint, this.position);
            x = d[0];
            y = d[1];
            z = d[2];
            var r = vec3.length(d);
            var el = rad2deg(Math.asin(y / r));
            var az = 90 + rad2deg(Math.atan2(z, x));
            var m = mat4.create();
            mat4.rotateY(m, m, deg2rad(az));
            mat4.rotateX(m, m, deg2rad(el));
            up = vec3.transformMat4(vec3.create(), [0, 1, 0], m);
        }
        mat4.invert(this.matrix, mat4.lookAt(mat4.create(), this.position, this.focalPoint, up));
        this._getAxes();
        this._getDistance();
        this._getAngles();
        this.triggerUpdate();
        return this;
    };
    Camera.prototype.getDistance = function () {
        return this.distance;
    };
    Camera.prototype.getDistanceVector = function () {
        return this.distanceVector;
    };
    /**
     * Moves the camera towards/from the focal point.
     */
    Camera.prototype.setDistance = function (d) {
        if (this.distance === d || d < 0) {
            return this;
        }
        this.distance = d;
        if (this.distance < MIN_DISTANCE) {
            this.distance = MIN_DISTANCE;
        }
        this.dollyingStep = this.distance / 100;
        var pos = vec3.create();
        d = this.distance;
        var n = this.forward;
        var f = this.focalPoint;
        pos[0] = d * n[0] + f[0];
        pos[1] = d * n[1] + f[1];
        pos[2] = d * n[2] + f[2];
        this._setPosition(pos);
        this.triggerUpdate();
        return this;
    };
    Camera.prototype.setMaxDistance = function (d) {
        this.maxDistance = d;
        return this;
    };
    Camera.prototype.setMinDistance = function (d) {
        this.minDistance = d;
        return this;
    };
    /**
     * 设置相机方位角，不同相机模式下需要重新计算相机位置或者是视点位置
     * the azimuth in degrees
     */
    Camera.prototype.setAzimuth = function (az) {
        this.azimuth = getAngle(az);
        this.computeMatrix();
        this._getAxes();
        if (this.type === CameraType.ORBITING ||
            this.type === CameraType.EXPLORING) {
            this._getPosition();
        }
        else if (this.type === CameraType.TRACKING) {
            this._getFocalPoint();
        }
        this.triggerUpdate();
        return this;
    };
    Camera.prototype.getAzimuth = function () {
        return this.azimuth;
    };
    /**
     * 设置相机方位角，不同相机模式下需要重新计算相机位置或者是视点位置
     */
    Camera.prototype.setElevation = function (el) {
        this.elevation = getAngle(el);
        this.computeMatrix();
        this._getAxes();
        if (this.type === CameraType.ORBITING ||
            this.type === CameraType.EXPLORING) {
            this._getPosition();
        }
        else if (this.type === CameraType.TRACKING) {
            this._getFocalPoint();
        }
        this.triggerUpdate();
        return this;
    };
    Camera.prototype.getElevation = function () {
        return this.elevation;
    };
    /**
     * 设置相机方位角，不同相机模式下需要重新计算相机位置或者是视点位置
     */
    Camera.prototype.setRoll = function (angle) {
        this.roll = getAngle(angle);
        this.computeMatrix();
        this._getAxes();
        if (this.type === CameraType.ORBITING ||
            this.type === CameraType.EXPLORING) {
            this._getPosition();
        }
        else if (this.type === CameraType.TRACKING) {
            this._getFocalPoint();
        }
        this.triggerUpdate();
        return this;
    };
    Camera.prototype.getRoll = function () {
        return this.roll;
    };
    /**
     * 根据相机矩阵重新计算各种相机参数
     */
    Camera.prototype._update = function () {
        this._getAxes();
        this._getPosition();
        this._getDistance();
        this._getAngles();
        this._getOrthoMatrix();
        this.triggerUpdate();
    };
    /**
     * 计算相机矩阵
     */
    Camera.prototype.computeMatrix = function () {
        // 使用四元数描述 3D 旋转
        // @see https://xiaoiver.github.io/coding/2018/12/28/Camera-%E8%AE%BE%E8%AE%A1-%E4%B8%80.html
        var rotZ = quat$1.setAxisAngle(quat$1.create(), [0, 0, 1], deg2rad(this.roll));
        mat4.identity(this.matrix);
        // only consider HCS for EXPLORING and ORBITING cameras
        var rotX = quat$1.setAxisAngle(quat$1.create(), [1, 0, 0], deg2rad(((this.rotateWorld && this.type !== CameraType.TRACKING) ||
            this.type === CameraType.TRACKING
            ? 1
            : -1) * this.elevation));
        var rotY = quat$1.setAxisAngle(quat$1.create(), [0, 1, 0], deg2rad(((this.rotateWorld && this.type !== CameraType.TRACKING) ||
            this.type === CameraType.TRACKING
            ? 1
            : -1) * this.azimuth));
        var rotQ = quat$1.multiply(quat$1.create(), rotY, rotX);
        rotQ = quat$1.multiply(quat$1.create(), rotQ, rotZ);
        var rotMatrix = mat4.fromQuat(mat4.create(), rotQ);
        if (this.type === CameraType.ORBITING ||
            this.type === CameraType.EXPLORING) {
            mat4.translate(this.matrix, this.matrix, this.focalPoint);
            mat4.multiply(this.matrix, this.matrix, rotMatrix);
            mat4.translate(this.matrix, this.matrix, [0, 0, this.distance]);
        }
        else if (this.type === CameraType.TRACKING) {
            mat4.translate(this.matrix, this.matrix, this.position);
            mat4.multiply(this.matrix, this.matrix, rotMatrix);
        }
    };
    /**
     * Sets the camera position in the camera matrix
     */
    Camera.prototype._setPosition = function (x, y, z) {
        this.position = createVec3(x, y, z);
        var m = this.matrix;
        m[12] = this.position[0];
        m[13] = this.position[1];
        m[14] = this.position[2];
        m[15] = 1;
        this._getOrthoMatrix();
    };
    /**
     * Recalculates axes based on the current matrix
     */
    Camera.prototype._getAxes = function () {
        vec3.copy(this.right, createVec3(vec4.transformMat4(vec4.create(), [1, 0, 0, 0], this.matrix)));
        vec3.copy(this.up, createVec3(vec4.transformMat4(vec4.create(), [0, 1, 0, 0], this.matrix)));
        vec3.copy(this.forward, createVec3(vec4.transformMat4(vec4.create(), [0, 0, 1, 0], this.matrix)));
        vec3.normalize(this.right, this.right);
        vec3.normalize(this.up, this.up);
        vec3.normalize(this.forward, this.forward);
    };
    /**
     * Recalculates euler angles based on the current state
     */
    Camera.prototype._getAngles = function () {
        // Recalculates angles
        var x = this.distanceVector[0];
        var y = this.distanceVector[1];
        var z = this.distanceVector[2];
        var r = vec3.length(this.distanceVector);
        // FAST FAIL: If there is no distance we cannot compute angles
        if (r === 0) {
            this.elevation = 0;
            this.azimuth = 0;
            return;
        }
        if (this.type === CameraType.TRACKING) {
            this.elevation = rad2deg(Math.asin(y / r));
            this.azimuth = rad2deg(Math.atan2(-x, -z));
        }
        else {
            if (this.rotateWorld) {
                this.elevation = rad2deg(Math.asin(y / r));
                this.azimuth = rad2deg(Math.atan2(-x, -z));
            }
            else {
                this.elevation = -rad2deg(Math.asin(y / r));
                this.azimuth = -rad2deg(Math.atan2(-x, -z));
            }
        }
    };
    /**
     * 重新计算相机位置，只有 ORBITING 模式相机位置才会发生变化
     */
    Camera.prototype._getPosition = function () {
        vec3.copy(this.position, createVec3(vec4.transformMat4(vec4.create(), [0, 0, 0, 1], this.matrix)));
        // 相机位置变化，需要重新计算视距
        this._getDistance();
    };
    /**
     * 重新计算视点，只有 TRACKING 模式视点才会发生变化
     */
    Camera.prototype._getFocalPoint = function () {
        vec3.transformMat3(this.distanceVector, [0, 0, -this.distance], mat3.fromMat4(mat3.create(), this.matrix));
        vec3.add(this.focalPoint, this.position, this.distanceVector);
        // 视点变化，需要重新计算视距
        this._getDistance();
    };
    /**
     * 重新计算视距
     */
    Camera.prototype._getDistance = function () {
        this.distanceVector = vec3.subtract(vec3.create(), this.focalPoint, this.position);
        this.distance = vec3.length(this.distanceVector);
        this.dollyingStep = this.distance / 100;
    };
    Camera.prototype._getOrthoMatrix = function () {
        if (this.projectionMode !== CameraProjectionMode.ORTHOGRAPHIC) {
            return;
        }
        var position = this.position;
        var rotZ = quat$1.setAxisAngle(quat$1.create(), [0, 0, 1], (-this.roll * Math.PI) / 180);
        mat4.fromRotationTranslationScaleOrigin(this.orthoMatrix, rotZ, vec3.fromValues((this.rright - this.left) / 2 - position[0], (this.top - this.bottom) / 2 - position[1], 0), vec3.fromValues(this.zoom, this.zoom, 1), position);
    };
    Camera.prototype.triggerUpdate = function () {
        if (this.enableUpdate) {
            // update frustum
            var viewMatrix = this.getViewTransform();
            var vpMatrix = mat4.multiply(mat4.create(), this.getPerspective(), viewMatrix);
            this.getFrustum().extractFromVPMatrix(vpMatrix);
            this.eventEmitter.emit(CameraEvent.UPDATED);
        }
    };
    Camera.prototype.rotate = function (azimuth, elevation, roll) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Camera.prototype.pan = function (tx, ty) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Camera.prototype.dolly = function (value) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Camera.prototype.createLandmark = function (name, params) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Camera.prototype.gotoLandmark = function (name, options) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Camera.prototype.cancelLandmarkAnimation = function () {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    return Camera;
}());

function memoize(func, resolver) {
    return func;
    // if (
    //   typeof func !== 'function' ||
    //   (resolver != null && typeof resolver !== 'function')
    // ) {
    //   throw new TypeError('Expected a function');
    // }
    // const memoized = function (...args) {
    //   const key = resolver ? resolver.apply(this, args) : args[0];
    //   const cache = memoized.cache;
    //   if (cache.has(key)) {
    //     return cache.get(key);
    //   }
    //   const result = func.apply(this, args);
    //   memoized.cache = cache.set(key, result) || cache;
    //   return result;
    // };
    // memoized.cache = new (memoize.Cache || Map)();
    // return memoized;
}
memoize.Cache = Map;

// These units are iterated through, so be careful when adding or changing the
// order.
var UnitType;
(function (UnitType) {
    UnitType[UnitType["kUnknown"] = 0] = "kUnknown";
    UnitType[UnitType["kNumber"] = 1] = "kNumber";
    UnitType[UnitType["kPercentage"] = 2] = "kPercentage";
    // Length units
    UnitType[UnitType["kEms"] = 3] = "kEms";
    // kExs,
    UnitType[UnitType["kPixels"] = 4] = "kPixels";
    // kCentimeters,
    // kMillimeters,
    // kInches,
    // kPoints,
    // kPicas,
    // kQuarterMillimeters,
    // https://drafts.csswg.org/css-values-4/#viewport-relative-lengths
    //
    // See also IsViewportPercentageLength.
    // kViewportWidth,
    // kViewportHeight,
    // kViewportInlineSize,
    // kViewportBlockSize,
    // kViewportMin,
    // kViewportMax,
    // kSmallViewportWidth,
    // kSmallViewportHeight,
    // kSmallViewportInlineSize,
    // kSmallViewportBlockSize,
    // kSmallViewportMin,
    // kSmallViewportMax,
    // kLargeViewportWidth,
    // kLargeViewportHeight,
    // kLargeViewportInlineSize,
    // kLargeViewportBlockSize,
    // kLargeViewportMin,
    // kLargeViewportMax,
    // kDynamicViewportWidth,
    // kDynamicViewportHeight,
    // kDynamicViewportInlineSize,
    // kDynamicViewportBlockSize,
    // kDynamicViewportMin,
    // kDynamicViewportMax,
    // https://drafts.csswg.org/css-contain-3/#container-lengths
    //
    // See also IsContainerPercentageLength.
    // kContainerWidth,
    // kContainerHeight,
    // kContainerInlineSize,
    // kContainerBlockSize,
    // kContainerMin,
    // kContainerMax,
    UnitType[UnitType["kRems"] = 5] = "kRems";
    // kChs,
    // kUserUnits, // The SVG term for unitless lengths
    // Angle units
    UnitType[UnitType["kDegrees"] = 6] = "kDegrees";
    UnitType[UnitType["kRadians"] = 7] = "kRadians";
    UnitType[UnitType["kGradians"] = 8] = "kGradians";
    UnitType[UnitType["kTurns"] = 9] = "kTurns";
    // Time units
    UnitType[UnitType["kMilliseconds"] = 10] = "kMilliseconds";
    UnitType[UnitType["kSeconds"] = 11] = "kSeconds";
    // kHertz,
    // kKilohertz,
    // Resolution
    // kDotsPerPixel,
    // kDotsPerInch,
    // kDotsPerCentimeter,
    // Other units
    // kFraction,
    UnitType[UnitType["kInteger"] = 12] = "kInteger";
    // This value is used to handle quirky margins in reflow roots (body, td,
    // and th) like WinIE. The basic idea is that a stylesheet can use the value
    // __qem (for quirky em) instead of em. When the quirky value is used, if
    // you're in quirks mode, the margin will collapse away inside a table cell.
    // This quirk is specified in the HTML spec but our impl is different.
    // TODO: Remove this. crbug.com/443952
    // kQuirkyEms,
})(UnitType || (UnitType = {}));
var UnitCategory;
(function (UnitCategory) {
    UnitCategory[UnitCategory["kUNumber"] = 0] = "kUNumber";
    UnitCategory[UnitCategory["kUPercent"] = 1] = "kUPercent";
    UnitCategory[UnitCategory["kULength"] = 2] = "kULength";
    UnitCategory[UnitCategory["kUAngle"] = 3] = "kUAngle";
    UnitCategory[UnitCategory["kUTime"] = 4] = "kUTime";
    // kUFrequency,
    // kUResolution,
    UnitCategory[UnitCategory["kUOther"] = 5] = "kUOther";
})(UnitCategory || (UnitCategory = {}));
var ValueRange;
(function (ValueRange) {
    ValueRange[ValueRange["kAll"] = 0] = "kAll";
    ValueRange[ValueRange["kNonNegative"] = 1] = "kNonNegative";
    ValueRange[ValueRange["kInteger"] = 2] = "kInteger";
    ValueRange[ValueRange["kNonNegativeInteger"] = 3] = "kNonNegativeInteger";
    ValueRange[ValueRange["kPositiveInteger"] = 4] = "kPositiveInteger";
})(ValueRange || (ValueRange = {}));
var Nested;
(function (Nested) {
    Nested[Nested["kYes"] = 0] = "kYes";
    Nested[Nested["kNo"] = 1] = "kNo";
})(Nested || (Nested = {}));
var ParenLess;
(function (ParenLess) {
    ParenLess[ParenLess["kYes"] = 0] = "kYes";
    ParenLess[ParenLess["kNo"] = 1] = "kNo";
})(ParenLess || (ParenLess = {}));

// This file specifies the unit strings used in CSSPrimitiveValues.
var data = [
    {
        name: 'em',
        unit_type: UnitType.kEms,
    },
    // {
    //   name: 'ex',
    //   unit_type: UnitType.kExs,
    // },
    {
        name: 'px',
        unit_type: UnitType.kPixels,
    },
    // {
    //   name: "cm",
    //   unit_type: UnitType.kCentimeters,
    // },
    // {
    //   name: "mm",
    //   unit_type: UnitType.kMillimeters,
    // },
    // {
    //   name: "q",
    //   unit_type: UnitType.kQuarterMillimeters,
    // },
    // {
    //   name: "in",
    //   unit_type: UnitType.kInches,
    // },
    // {
    //   name: "pt",
    //   unit_type: UnitType.kPoints,
    // },
    // {
    //   name: "pc",
    //   unit_type: UnitType.kPicas,
    // },
    {
        name: 'deg',
        unit_type: UnitType.kDegrees,
    },
    {
        name: 'rad',
        unit_type: UnitType.kRadians,
    },
    {
        name: 'grad',
        unit_type: UnitType.kGradians,
    },
    {
        name: 'ms',
        unit_type: UnitType.kMilliseconds,
    },
    {
        name: 's',
        unit_type: UnitType.kSeconds,
    },
    // {
    //   name: "hz",
    //   unit_type: UnitType.kHertz,
    // },
    // {
    //   name: "khz",
    //   unit_type: UnitType.kKilohertz,
    // },
    // {
    //   name: "dpi",
    //   unit_type: "kDotsPerInch",
    // },
    // {
    //   name: "dpcm",
    //   unit_type: "kDotsPerCentimeter",
    // },
    // {
    //   name: "dppx",
    //   unit_type: "kDotsPerPixel",
    // },
    // {
    //   name: "x",
    //   unit_type: "kDotsPerPixel",
    // },
    // {
    //   name: "vw",
    //   unit_type: "kViewportWidth",
    // },
    // {
    //   name: "vh",
    //   unit_type: "kViewportHeight",
    // },
    // {
    //   name: "vi",
    //   unit_type: "kViewportInlineSize",
    // },
    // {
    //   name: "vb",
    //   unit_type: "kViewportBlockSize",
    // },
    // {
    //   name: "vmin",
    //   unit_type: UnitType.kViewportMin,
    // },
    // {
    //   name: "vmax",
    //   unit_type: UnitType.kViewportMax,
    // },
    // {
    //   name: "svw",
    //   unit_type: "kSmallViewportWidth",
    // },
    // {
    //   name: "svh",
    //   unit_type: "kSmallViewportHeight",
    // },
    // {
    //   name: "svi",
    //   unit_type: "kSmallViewportInlineSize",
    // },
    // {
    //   name: "svb",
    //   unit_type: "kSmallViewportBlockSize",
    // },
    // {
    //   name: "svmin",
    //   unit_type: "kSmallViewportMin",
    // },
    // {
    //   name: "svmax",
    //   unit_type: "kSmallViewportMax",
    // },
    // {
    //   name: "lvw",
    //   unit_type: "kLargeViewportWidth",
    // },
    // {
    //   name: "lvh",
    //   unit_type: "kLargeViewportHeight",
    // },
    // {
    //   name: "lvi",
    //   unit_type: "kLargeViewportInlineSize",
    // },
    // {
    //   name: "lvb",
    //   unit_type: "kLargeViewportBlockSize",
    // },
    // {
    //   name: "lvmin",
    //   unit_type: UnitType.kLargeViewportMin,
    // },
    // {
    //   name: "lvmax",
    //   unit_type: UnitType.kLargeViewportMax,
    // },
    // {
    //   name: "dvw",
    //   unit_type: UnitType.kDynamicViewportWidth,
    // },
    // {
    //   name: "dvh",
    //   unit_type: UnitType.kDynamicViewportHeight,
    // },
    // {
    //   name: "dvi",
    //   unit_type: UnitType.kDynamicViewportInlineSize,
    // },
    // {
    //   name: "dvb",
    //   unit_type: UnitType.kDynamicViewportBlockSize,
    // },
    // {
    //   name: "dvmin",
    //   unit_type: UnitType.kDynamicViewportMin,
    // },
    // {
    //   name: "dvmax",
    //   unit_type: UnitType.kDynamicViewportMax,
    // },
    // {
    //   name: "cqw",
    //   unit_type: UnitType.kContainerWidth,
    // },
    // {
    //   name: "cqh",
    //   unit_type: UnitType.kContainerHeight,
    // },
    // {
    //   name: "cqi",
    //   unit_type: UnitType.kContainerInlineSize,
    // },
    // {
    //   name: "cqb",
    //   unit_type: UnitType.kContainerBlockSize,
    // },
    // {
    //   name: "cqmin",
    //   unit_type: UnitType.kContainerMin,
    // },
    // {
    //   name: "cqmax",
    //   unit_type: UnitType.kContainerMax,
    // },
    {
        name: 'rem',
        unit_type: UnitType.kRems,
    },
    // {
    //   name: 'fr',
    //   unit_type: UnitType.kFraction,
    // },
    {
        name: 'turn',
        unit_type: UnitType.kTurns,
    },
    // {
    //   name: 'ch',
    //   unit_type: UnitType.kChs,
    // },
    // {
    //   name: '__qem',
    //   unit_type: UnitType.kQuirkyEms,
    // },
];
var CSSStyleValueType;
(function (CSSStyleValueType) {
    CSSStyleValueType[CSSStyleValueType["kUnknownType"] = 0] = "kUnknownType";
    CSSStyleValueType[CSSStyleValueType["kUnparsedType"] = 1] = "kUnparsedType";
    CSSStyleValueType[CSSStyleValueType["kKeywordType"] = 2] = "kKeywordType";
    // Start of CSSNumericValue subclasses
    CSSStyleValueType[CSSStyleValueType["kUnitType"] = 3] = "kUnitType";
    CSSStyleValueType[CSSStyleValueType["kSumType"] = 4] = "kSumType";
    CSSStyleValueType[CSSStyleValueType["kProductType"] = 5] = "kProductType";
    CSSStyleValueType[CSSStyleValueType["kNegateType"] = 6] = "kNegateType";
    CSSStyleValueType[CSSStyleValueType["kInvertType"] = 7] = "kInvertType";
    CSSStyleValueType[CSSStyleValueType["kMinType"] = 8] = "kMinType";
    CSSStyleValueType[CSSStyleValueType["kMaxType"] = 9] = "kMaxType";
    CSSStyleValueType[CSSStyleValueType["kClampType"] = 10] = "kClampType";
    // End of CSSNumericValue subclasses
    CSSStyleValueType[CSSStyleValueType["kTransformType"] = 11] = "kTransformType";
    CSSStyleValueType[CSSStyleValueType["kPositionType"] = 12] = "kPositionType";
    CSSStyleValueType[CSSStyleValueType["kURLImageType"] = 13] = "kURLImageType";
    CSSStyleValueType[CSSStyleValueType["kColorType"] = 14] = "kColorType";
    CSSStyleValueType[CSSStyleValueType["kUnsupportedColorType"] = 15] = "kUnsupportedColorType";
})(CSSStyleValueType || (CSSStyleValueType = {}));
// function parseCSSStyleValue(propertyName: string, value: string): CSSStyleValue[] {
//   // const propertyId = cssPropertyID(propertyName);
//   // if (propertyId === CSSPropertyID.kInvalid) {
//   //   return [];
//   // }
//   // const customPropertyName = propertyId === CSSPropertyID.kVariable ? propertyName : null;
//   // return fromString(propertyId, customPropertyName, value);
//   return [];
// }
var stringToUnitType = function (name) {
    return data.find(function (item) { return item.name === name; }).unit_type;
};
var unitFromName = function (name) {
    if (!name) {
        return UnitType.kUnknown;
    }
    if (name === 'number') {
        return UnitType.kNumber;
    }
    if (name === 'percent' || name === '%') {
        return UnitType.kPercentage;
    }
    return stringToUnitType(name);
};
var unitTypeToUnitCategory = function (type) {
    switch (type) {
        case UnitType.kNumber:
        case UnitType.kInteger:
            return UnitCategory.kUNumber;
        case UnitType.kPercentage:
            return UnitCategory.kUPercent;
        case UnitType.kPixels:
            // case UnitType.kCentimeters:
            // case UnitType.kMillimeters:
            // case UnitType.kQuarterMillimeters:
            // case UnitType.kInches:
            // case UnitType.kPoints:
            // case UnitType.kPicas:
            // case UnitType.kUserUnits:
            return UnitCategory.kULength;
        case UnitType.kMilliseconds:
        case UnitType.kSeconds:
            return UnitCategory.kUTime;
        case UnitType.kDegrees:
        case UnitType.kRadians:
        case UnitType.kGradians:
        case UnitType.kTurns:
            return UnitCategory.kUAngle;
        // case UnitType.kHertz:
        // case UnitType.kKilohertz:
        //   return UnitCategory.kUFrequency;
        // case UnitType.kDotsPerPixel:
        // case UnitType.kDotsPerInch:
        // case UnitType.kDotsPerCentimeter:
        //   return UnitCategory.kUResolution;
        default:
            return UnitCategory.kUOther;
    }
};
var canonicalUnitTypeForCategory = function (category) {
    // The canonical unit type is chosen according to the way
    // CSSPropertyParser.ValidUnit() chooses the default unit in each category
    // (based on unitflags).
    switch (category) {
        case UnitCategory.kUNumber:
            return UnitType.kNumber;
        case UnitCategory.kULength:
            return UnitType.kPixels;
        case UnitCategory.kUPercent:
            return UnitType.kPercentage;
        // return UnitType.kUnknown; // Cannot convert between numbers and percent.
        case UnitCategory.kUTime:
            return UnitType.kSeconds;
        case UnitCategory.kUAngle:
            return UnitType.kDegrees;
        // case UnitCategory.kUFrequency:
        //   return UnitType.kHertz;
        // case UnitCategory.kUResolution:
        //   return UnitType.kDotsPerPixel;
        default:
            return UnitType.kUnknown;
    }
};
/**
 * @see https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/css/css_primitive_value.cc#353
 */
var conversionToCanonicalUnitsScaleFactor = function (unit_type) {
    var factor = 1.0;
    // FIXME: the switch can be replaced by an array of scale factors.
    switch (unit_type) {
        // These are "canonical" units in their respective categories.
        case UnitType.kPixels:
        // case UnitType.kUserUnits:
        case UnitType.kDegrees:
        case UnitType.kSeconds:
            // case UnitType.kHertz:
            break;
        case UnitType.kMilliseconds:
            factor = 0.001;
            break;
        // case UnitType.kCentimeters:
        //   // factor = kCssPixelsPerCentimeter;
        //   break;
        // case UnitType.kDotsPerCentimeter:
        //   // factor = 1 / kCssPixelsPerCentimeter;
        //   break;
        // case UnitType.kMillimeters:
        //   // factor = kCssPixelsPerMillimeter;
        //   break;
        // case UnitType.kQuarterMillimeters:
        //   // factor = kCssPixelsPerQuarterMillimeter;
        //   break;
        // case UnitType.kInches:
        //   // factor = kCssPixelsPerInch;
        //   break;
        // case UnitType.kDotsPerInch:
        //   // factor = 1 / kCssPixelsPerInch;
        //   break;
        // case UnitType.kPoints:
        //   // factor = kCssPixelsPerPoint;
        //   break;
        // case UnitType.kPicas:
        //   // factor = kCssPixelsPerPica;
        //   break;
        case UnitType.kRadians:
            factor = 180 / Math.PI;
            break;
        case UnitType.kGradians:
            factor = 0.9;
            break;
        case UnitType.kTurns:
            factor = 360;
            break;
    }
    return factor;
};
var unitTypeToString = function (type) {
    switch (type) {
        case UnitType.kNumber:
        case UnitType.kInteger:
            // case UnitType.kUserUnits:
            return '';
        case UnitType.kPercentage:
            return '%';
        case UnitType.kEms:
            // case UnitType.kQuirkyEms:
            return 'em';
        // case UnitType.kExs:
        //   return 'ex';
        case UnitType.kRems:
            return 'rem';
        // case UnitType.kChs:
        //   return 'ch';
        case UnitType.kPixels:
            return 'px';
        // case UnitType.kCentimeters:
        //   return 'cm';
        // case UnitType.kDotsPerPixel:
        //   return 'dppx';
        // case UnitType.kDotsPerInch:
        //   return 'dpi';
        // case UnitType.kDotsPerCentimeter:
        //   return 'dpcm';
        // case UnitType.kMillimeters:
        //   return 'mm';
        // case UnitType.kQuarterMillimeters:
        //   return 'q';
        // case UnitType.kInches:
        //   return 'in';
        // case UnitType.kPoints:
        //   return 'pt';
        // case UnitType.kPicas:
        //   return 'pc';
        case UnitType.kDegrees:
            return 'deg';
        case UnitType.kRadians:
            return 'rad';
        case UnitType.kGradians:
            return 'grad';
        case UnitType.kMilliseconds:
            return 'ms';
        case UnitType.kSeconds:
            return 's';
        // case UnitType.kHertz:
        //   return 'hz';
        // case UnitType.kKilohertz:
        //   return 'khz';
        case UnitType.kTurns:
            return 'turn';
    }
    return '';
};
/**
 * CSSStyleValue is the base class for all CSS values accessible from Typed OM.
 * Values that are not yet supported as specific types are also returned as base CSSStyleValues.
 *
 * Spec @see https://drafts.css-houdini.org/css-typed-om/#stylevalue-objects
 * Docs @see https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleValue
 */
var CSSStyleValue = /** @class */ (function () {
    function CSSStyleValue() {
    }
    // static parse(propertyName: string, value: string): CSSStyleValue {
    //   return parseCSSStyleValue(propertyName, value)[0];
    // }
    // static parseAll(propertyName: string, value: string): CSSStyleValue[] {
    //   return parseCSSStyleValue(propertyName, value);
    // }
    CSSStyleValue.isAngle = function (unit) {
        return (unit === UnitType.kDegrees ||
            unit === UnitType.kRadians ||
            unit === UnitType.kGradians ||
            unit === UnitType.kTurns);
    };
    // static isViewportPercentageLength(type: UnitType) {
    //   return type >= UnitType.kViewportWidth && type <= UnitType.kDynamicViewportMax;
    // }
    // static isContainerPercentageLength(type: UnitType) {
    //   return type >= UnitType.kContainerWidth && type <= UnitType.kContainerMax;
    // }
    CSSStyleValue.isLength = function (type) {
        // return (type >= UnitType.kEms && type <= UnitType.kUserUnits) || type == UnitType.kQuirkyEms;
        return type >= UnitType.kEms && type < UnitType.kDegrees;
    };
    CSSStyleValue.isRelativeUnit = function (type) {
        return (type === UnitType.kPercentage ||
            type === UnitType.kEms ||
            // type === UnitType.kExs ||
            type === UnitType.kRems
        // type === UnitType.kChs ||
        // this.isViewportPercentageLength(type) ||
        // this.isContainerPercentageLength(type)
        );
    };
    CSSStyleValue.isTime = function (unit) {
        return unit === UnitType.kSeconds || unit === UnitType.kMilliseconds;
    };
    // protected abstract toCSSValue(): CSSValue;
    CSSStyleValue.prototype.toString = function () {
        return this.buildCSSText(Nested.kNo, ParenLess.kNo, '');
    };
    CSSStyleValue.prototype.isNumericValue = function () {
        return (this.getType() >= CSSStyleValueType.kUnitType &&
            this.getType() <= CSSStyleValueType.kClampType);
    };
    return CSSStyleValue;
}());

/**
 * CSSColorValue is the base class used for the various CSS color interfaces.
 *
 * @see https://drafts.css-houdini.org/css-typed-om-1/#colorvalue-objects
 */
var CSSColorValue = /** @class */ (function (_super) {
    __extends(CSSColorValue, _super);
    function CSSColorValue(colorSpace) {
        var _this = _super.call(this) || this;
        _this.colorSpace = colorSpace;
        return _this;
    }
    CSSColorValue.prototype.getType = function () {
        return CSSStyleValueType.kColorType;
    };
    // buildCSSText(n: Nested, p: ParenLess, result: string): string {
    //   let text = '';
    //   if (this.colorSpace === 'rgb') {
    //     text = `rgba(${this.channels.join(',')},${this.alpha})`;
    //   }
    //   return (result += text);
    // }
    /**
     * @see https://drafts.css-houdini.org/css-typed-om-1/#dom-csscolorvalue-to
     */
    CSSColorValue.prototype.to = function (colorSpace) {
        return this;
    };
    return CSSColorValue;
}(CSSStyleValue));

var GradientType;
(function (GradientType) {
    GradientType[GradientType["Constant"] = 0] = "Constant";
    GradientType[GradientType["LinearGradient"] = 1] = "LinearGradient";
    GradientType[GradientType["RadialGradient"] = 2] = "RadialGradient";
})(GradientType || (GradientType = {}));
var CSSGradientValue = /** @class */ (function (_super) {
    __extends(CSSGradientValue, _super);
    function CSSGradientValue(type, value) {
        var _this = _super.call(this) || this;
        _this.type = type;
        _this.value = value;
        return _this;
    }
    CSSGradientValue.prototype.clone = function () {
        return new CSSGradientValue(this.type, this.value);
    };
    CSSGradientValue.prototype.buildCSSText = function (n, p, result) {
        return result;
    };
    CSSGradientValue.prototype.getType = function () {
        return CSSStyleValueType.kColorType;
    };
    return CSSGradientValue;
}(CSSStyleValue));

/**
 * CSSKeywordValue represents CSS Values that are specified as keywords
 * eg. 'initial'
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSKeywordValue
 * @see https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/css/cssom/css_keyword_value.idl
 */
var CSSKeywordValue = /** @class */ (function (_super) {
    __extends(CSSKeywordValue, _super);
    function CSSKeywordValue(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    CSSKeywordValue.prototype.clone = function () {
        return new CSSKeywordValue(this.value);
    };
    CSSKeywordValue.prototype.getType = function () {
        return CSSStyleValueType.kKeywordType;
    };
    CSSKeywordValue.prototype.buildCSSText = function (n, p, result) {
        return result + this.value;
    };
    return CSSKeywordValue;
}(CSSStyleValue));

var camelCase = memoize(function (str) {
    if (str === void 0) { str = ''; }
    return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
});
var kebabize = function (str) {
    return str
        .split('')
        .map(function (letter, idx) {
        return letter.toUpperCase() === letter
            ? "".concat(idx !== 0 ? '-' : '').concat(letter.toLowerCase())
            : letter;
    })
        .join('');
};

function DCHECK(bool) {
    if (!bool) {
        throw new Error();
    }
}
function isFunction(func) {
    return typeof func === 'function';
}
function isSymbol(value) {
    // @see https://github.com/lodash/lodash/blob/master/isSymbol.js
    return typeof value === 'symbol';
}
var definedProps = function (obj) {
    return Object.fromEntries(Object.entries(obj).filter(function (_a) {
        var _b = __read(_a, 2), v = _b[1];
        return v !== undefined;
    }));
};
var FORMAT_ATTR_MAP = {
    d: {
        alias: 'path',
    },
    strokeDasharray: {
        alias: 'lineDash',
    },
    strokeWidth: {
        alias: 'lineWidth',
    },
    textAnchor: {
        alias: 'textAlign',
    },
    src: {
        alias: 'img',
    },
};
var formatAttributeName = memoize(function (name) {
    var attributeName = camelCase(name);
    var map = FORMAT_ATTR_MAP[attributeName];
    attributeName = (map === null || map === void 0 ? void 0 : map.alias) || attributeName;
    return attributeName;
});

// type CSSNumericBaseType =
//   | 'length'
//   | 'angle'
//   | 'time'
//   | 'frequency'
//   | 'resolution'
//   | 'flex'
//   | 'percent';
// https://drafts.css-houdini.org/css-typed-om/#dictdef-cssnumerictype
// interface CSSNumericType {
//   length: number;
//   angle: number;
//   time: number;
//   frequency: number;
//   resolution: number;
//   flex: number;
//   percent: number;
//   percentHint: CSSNumericBaseType;
// }
var formatInfinityOrNaN = function (number, suffix) {
    if (suffix === void 0) { suffix = ''; }
    var result = '';
    if (!Number.isFinite(number)) {
        if (number > 0)
            result = 'infinity';
        else
            result = '-infinity';
    }
    else {
        DCHECK(Number.isNaN(number));
        result = 'NaN';
    }
    return (result += suffix);
};
var toCanonicalUnit = function (unit) {
    return canonicalUnitTypeForCategory(unitTypeToUnitCategory(unit));
};
/**
 * CSSNumericValue is the base class for numeric and length typed CSS Values.
 * @see https://drafts.css-houdini.org/css-typed-om/#numeric-objects
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CSSNumericValue
 * @see https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/core/css/cssom/css_numeric_value.idl
 */
/**
 * Represents numeric values that can be expressed as a single number plus a
 * unit (or a naked number or percentage).
 * @see https://drafts.css-houdini.org/css-typed-om/#cssunitvalue
 */
var CSSUnitValue = /** @class */ (function (_super) {
    __extends(CSSUnitValue, _super);
    function CSSUnitValue(value, unitOrName) {
        if (unitOrName === void 0) { unitOrName = UnitType.kNumber; }
        var _this = _super.call(this) || this;
        var unit;
        if (typeof unitOrName === 'string') {
            unit = unitFromName(unitOrName);
        }
        else {
            unit = unitOrName;
        }
        _this.unit = unit;
        _this.value = value;
        return _this;
    }
    CSSUnitValue.prototype.clone = function () {
        return new CSSUnitValue(this.value, this.unit);
    };
    CSSUnitValue.prototype.equals = function (other) {
        var other_unit_value = other;
        return (this.value === other_unit_value.value &&
            this.unit === other_unit_value.unit);
    };
    CSSUnitValue.prototype.getType = function () {
        return CSSStyleValueType.kUnitType;
    };
    CSSUnitValue.prototype.convertTo = function (target_unit) {
        if (this.unit === target_unit) {
            return new CSSUnitValue(this.value, this.unit);
        }
        // Instead of defining the scale factors for every unit to every other unit,
        // we simply convert to the canonical unit and back since we already have
        // the scale factors for canonical units.
        var canonical_unit = toCanonicalUnit(this.unit);
        if (canonical_unit !== toCanonicalUnit(target_unit) ||
            canonical_unit === UnitType.kUnknown) {
            return null;
        }
        var scale_factor = conversionToCanonicalUnitsScaleFactor(this.unit) /
            conversionToCanonicalUnitsScaleFactor(target_unit);
        return new CSSUnitValue(this.value * scale_factor, target_unit);
    };
    CSSUnitValue.prototype.buildCSSText = function (n, p, result) {
        var text;
        switch (this.unit) {
            case UnitType.kUnknown:
                // FIXME
                break;
            case UnitType.kInteger:
                text = Number(this.value).toFixed(0);
                break;
            case UnitType.kNumber:
            case UnitType.kPercentage:
            case UnitType.kEms:
            // case UnitType.kQuirkyEms:
            // case UnitType.kExs:
            case UnitType.kRems:
            // case UnitType.kChs:
            case UnitType.kPixels:
            // case UnitType.kCentimeters:
            // case UnitType.kDotsPerPixel:
            // case UnitType.kDotsPerInch:
            // case UnitType.kDotsPerCentimeter:
            // case UnitType.kMillimeters:
            // case UnitType.kQuarterMillimeters:
            // case UnitType.kInches:
            // case UnitType.kPoints:
            // case UnitType.kPicas:
            // case UnitType.kUserUnits:
            case UnitType.kDegrees:
            case UnitType.kRadians:
            case UnitType.kGradians:
            case UnitType.kMilliseconds:
            case UnitType.kSeconds:
            // case UnitType.kHertz:
            // case UnitType.kKilohertz:
            case UnitType.kTurns: // case UnitType.kContainerMax: { // case UnitType.kContainerMin: // case UnitType.kContainerBlockSize: // case UnitType.kContainerInlineSize: // case UnitType.kContainerHeight: // case UnitType.kContainerWidth: // case UnitType.kDynamicViewportMax: // case UnitType.kDynamicViewportMin: // case UnitType.kDynamicViewportBlockSize: // case UnitType.kDynamicViewportInlineSize: // case UnitType.kDynamicViewportHeight: // case UnitType.kDynamicViewportWidth: // case UnitType.kLargeViewportMax: // case UnitType.kLargeViewportMin: // case UnitType.kLargeViewportBlockSize: // case UnitType.kLargeViewportInlineSize: // case UnitType.kLargeViewportHeight: // case UnitType.kLargeViewportWidth: // case UnitType.kSmallViewportMax: // case UnitType.kSmallViewportMin: // case UnitType.kSmallViewportBlockSize: // case UnitType.kSmallViewportInlineSize: // case UnitType.kSmallViewportHeight: // case UnitType.kSmallViewportWidth: // case UnitType.kViewportMax: // case UnitType.kViewportMin: // case UnitType.kViewportBlockSize: // case UnitType.kViewportInlineSize: // case UnitType.kViewportHeight: // case UnitType.kViewportWidth: // case UnitType.kFraction:
                {
                    var kMinInteger = -999999;
                    var kMaxInteger = 999999;
                    var value = this.value;
                    var unit = unitTypeToString(this.unit);
                    if (value < kMinInteger || value > kMaxInteger) {
                        var unit_1 = unitTypeToString(this.unit);
                        if (!Number.isFinite(value) || Number.isNaN(value)) {
                            text = formatInfinityOrNaN(value, unit_1);
                        }
                        else {
                            text = value + (unit_1 || '');
                        }
                    }
                    else {
                        text = "".concat(value).concat(unit);
                    }
                }
        }
        result += text;
        return result;
    };
    return CSSUnitValue;
}(CSSStyleValue));
var Opx = new CSSUnitValue(0, 'px');
new CSSUnitValue(1, 'px');
var Odeg = new CSSUnitValue(0, 'deg');

/**
 * The CSSRGB class represents the CSS rgb()/rgba() functions.
 *
 * @see https://drafts.css-houdini.org/css-typed-om-1/#cssrgb
 */
var CSSRGB = /** @class */ (function (_super) {
    __extends(CSSRGB, _super);
    function CSSRGB(r, g, b, alpha, 
    /**
     * 'transparent' & 'none' has the same rgba data
     */
    isNone) {
        if (alpha === void 0) { alpha = 1; }
        if (isNone === void 0) { isNone = false; }
        var _this = _super.call(this, 'rgb') || this;
        _this.r = r;
        _this.g = g;
        _this.b = b;
        _this.alpha = alpha;
        _this.isNone = isNone;
        return _this;
    }
    CSSRGB.prototype.clone = function () {
        return new CSSRGB(this.r, this.g, this.b, this.alpha);
    };
    CSSRGB.prototype.buildCSSText = function (n, p, result) {
        return result + "rgba(".concat(this.r, ",").concat(this.g, ",").concat(this.b, ",").concat(this.alpha, ")");
    };
    return CSSRGB;
}(CSSColorValue));

/**
 * CSSKeywordValue
 */
var unsetKeywordValue = new CSSKeywordValue('unset');
var initialKeywordValue = new CSSKeywordValue('initial');
var inheritKeywordValue = new CSSKeywordValue('inherit');
var keywordCache = {
    '': unsetKeywordValue,
    unset: unsetKeywordValue,
    initial: initialKeywordValue,
    inherit: inheritKeywordValue,
};
var getOrCreateKeyword = function (name) {
    if (!keywordCache[name]) {
        keywordCache[name] = new CSSKeywordValue(name);
    }
    return keywordCache[name];
};
/**
 * CSSColor
 */
var noneColor = new CSSRGB(0, 0, 0, 0, true);
var transparentColor = new CSSRGB(0, 0, 0, 0);
var getOrCreateRGBA = memoize(function (r, g, b, a) {
    return new CSSRGB(r, g, b, a);
});
// export const getOrCreateUnitValue = memoize(
//   (value: number, unitOrName: UnitType | string = UnitType.kNumber) => {
//     return new CSSUnitValue(value, unitOrName);
//   },
//   (value: number, unitOrName: UnitType | string = UnitType.kNumber) => {
//     return `${value}${unitOrName}`;
//   },
// );
var getOrCreateUnitValue = function (value, unitOrName) {
    if (unitOrName === void 0) { unitOrName = UnitType.kNumber; }
    return new CSSUnitValue(value, unitOrName);
};
var PECENTAGE_50 = new CSSUnitValue(50, '%');

/**
 * @see https://doc.babylonjs.com/how_to/optimizing_your_scene#changing-mesh-culling-strategy
 */
var Strategy;
(function (Strategy) {
    Strategy[Strategy["Standard"] = 0] = "Standard";
})(Strategy || (Strategy = {}));

var SortReason;
(function (SortReason) {
    SortReason[SortReason["ADDED"] = 0] = "ADDED";
    SortReason[SortReason["REMOVED"] = 1] = "REMOVED";
    SortReason[SortReason["Z_INDEX_CHANGED"] = 2] = "Z_INDEX_CHANGED";
})(SortReason || (SortReason = {}));

var EMPTY_PARSED_PATH = {
    absolutePath: [],
    hasArc: false,
    segments: [],
    polygons: [],
    polylines: [],
    curve: null,
    totalLength: 0,
    rect: new Rectangle(0, 0, 0, 0),
};

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type
 */
var PropertySyntax;
(function (PropertySyntax) {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#coordinate
     */
    PropertySyntax["COORDINATE"] = "<coordinate>";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#color
     */
    PropertySyntax["COLOR"] = "<color>";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#paint
     */
    PropertySyntax["PAINT"] = "<paint>";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#number
     */
    PropertySyntax["NUMBER"] = "<number>";
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/angle
     */
    PropertySyntax["ANGLE"] = "<angle>";
    /**
     * <number> with range 0..1
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#opacity_value
     */
    PropertySyntax["OPACITY_VALUE"] = "<opacity-value>";
    /**
     * <number> with range 0..Infinity
     */
    PropertySyntax["SHADOW_BLUR"] = "<shadow-blur>";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#length
     */
    PropertySyntax["LENGTH"] = "<length>";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage
     */
    PropertySyntax["PERCENTAGE"] = "<percentage>";
    PropertySyntax["LENGTH_PERCENTAGE"] = "<length> | <percentage>";
    PropertySyntax["LENGTH_PERCENTAGE_12"] = "[<length> | <percentage>]{1,2}";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/margin#formal_syntax
     */
    PropertySyntax["LENGTH_PERCENTAGE_14"] = "[<length> | <percentage>]{1,4}";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#list-of-ts
     */
    PropertySyntax["LIST_OF_POINTS"] = "<list-of-points>";
    PropertySyntax["PATH"] = "<path>";
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/CSS/filter#formal_syntax
     */
    PropertySyntax["FILTER"] = "<filter>";
    PropertySyntax["Z_INDEX"] = "<z-index>";
    PropertySyntax["OFFSET_DISTANCE"] = "<offset-distance>";
    PropertySyntax["DEFINED_PATH"] = "<defined-path>";
    PropertySyntax["MARKER"] = "<marker>";
    PropertySyntax["TRANSFORM"] = "<transform>";
    PropertySyntax["TRANSFORM_ORIGIN"] = "<transform-origin>";
    PropertySyntax["TEXT"] = "<text>";
    PropertySyntax["TEXT_TRANSFORM"] = "<text-transform>";
})(PropertySyntax || (PropertySyntax = {}));

/**
 * borrow from gradient-parser, but we delete some browser compatible prefix such as `-webkit-`
 * @see https://github.com/rafaelcaricio/gradient-parser
 */
function colorStopToString(colorStop) {
    var type = colorStop.type, value = colorStop.value;
    if (type === 'hex') {
        return "#".concat(value);
    }
    else if (type === 'literal') {
        return value;
    }
    else if (type === 'rgb') {
        return "rgb(".concat(value.join(','), ")");
    }
    else {
        return "rgba(".concat(value.join(','), ")");
    }
}
var parseGradient$1 = (function () {
    var tokens = {
        linearGradient: /^(linear\-gradient)/i,
        repeatingLinearGradient: /^(repeating\-linear\-gradient)/i,
        radialGradient: /^(radial\-gradient)/i,
        repeatingRadialGradient: /^(repeating\-radial\-gradient)/i,
        /**
         * @see https://projects.verou.me/conic-gradient/
         */
        conicGradient: /^(conic\-gradient)/i,
        sideOrCorner: /^to (left (top|bottom)|right (top|bottom)|top (left|right)|bottom (left|right)|left|right|top|bottom)/i,
        extentKeywords: /^(closest\-side|closest\-corner|farthest\-side|farthest\-corner|contain|cover)/,
        positionKeywords: /^(left|center|right|top|bottom)/i,
        pixelValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))px/,
        percentageValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))\%/,
        emValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))em/,
        angleValue: /^(-?(([0-9]*\.[0-9]+)|([0-9]+\.?)))deg/,
        startCall: /^\(/,
        endCall: /^\)/,
        comma: /^,/,
        hexColor: /^\#([0-9a-fA-F]+)/,
        literalColor: /^([a-zA-Z]+)/,
        rgbColor: /^rgb/i,
        rgbaColor: /^rgba/i,
        number: /^(([0-9]*\.[0-9]+)|([0-9]+\.?))/,
    };
    var input = '';
    function error(msg) {
        throw new Error(input + ': ' + msg);
    }
    function getAST() {
        var ast = matchListDefinitions();
        if (input.length > 0) {
            error('Invalid input not EOF');
        }
        return ast;
    }
    function matchListDefinitions() {
        return matchListing(matchDefinition);
    }
    function matchDefinition() {
        return (matchGradient('linear-gradient', tokens.linearGradient, matchLinearOrientation) ||
            matchGradient('repeating-linear-gradient', tokens.repeatingLinearGradient, matchLinearOrientation) ||
            matchGradient('radial-gradient', tokens.radialGradient, matchListRadialOrientations) ||
            matchGradient('repeating-radial-gradient', tokens.repeatingRadialGradient, matchListRadialOrientations) ||
            matchGradient('conic-gradient', tokens.conicGradient, matchListRadialOrientations));
    }
    function matchGradient(gradientType, pattern, orientationMatcher) {
        return matchCall(pattern, function (captures) {
            var orientation = orientationMatcher();
            if (orientation) {
                if (!scan(tokens.comma)) {
                    error('Missing comma before color stops');
                }
            }
            return {
                type: gradientType,
                orientation: orientation,
                colorStops: matchListing(matchColorStop),
            };
        });
    }
    function matchCall(pattern, callback) {
        var captures = scan(pattern);
        if (captures) {
            if (!scan(tokens.startCall)) {
                error('Missing (');
            }
            var result = callback(captures);
            if (!scan(tokens.endCall)) {
                error('Missing )');
            }
            return result;
        }
    }
    function matchLinearOrientation() {
        return matchSideOrCorner() || matchAngle();
    }
    function matchSideOrCorner() {
        return match('directional', tokens.sideOrCorner, 1);
    }
    function matchAngle() {
        return match('angular', tokens.angleValue, 1);
    }
    function matchListRadialOrientations() {
        var radialOrientations, radialOrientation = matchRadialOrientation(), lookaheadCache;
        if (radialOrientation) {
            radialOrientations = [];
            radialOrientations.push(radialOrientation);
            lookaheadCache = input;
            if (scan(tokens.comma)) {
                radialOrientation = matchRadialOrientation();
                if (radialOrientation) {
                    radialOrientations.push(radialOrientation);
                }
                else {
                    input = lookaheadCache;
                }
            }
        }
        return radialOrientations;
    }
    function matchRadialOrientation() {
        var radialType = matchCircle() || matchEllipse();
        if (radialType) {
            // @ts-ignore
            radialType.at = matchAtPosition();
        }
        else {
            var extent = matchExtentKeyword();
            if (extent) {
                radialType = extent;
                var positionAt = matchAtPosition();
                if (positionAt) {
                    // @ts-ignore
                    radialType.at = positionAt;
                }
            }
            else {
                var defaultPosition = matchPositioning();
                if (defaultPosition) {
                    radialType = {
                        type: 'default-radial',
                        // @ts-ignore
                        at: defaultPosition,
                    };
                }
            }
        }
        return radialType;
    }
    function matchCircle() {
        var circle = match('shape', /^(circle)/i, 0);
        if (circle) {
            // @ts-ignore
            circle.style = matchLength() || matchExtentKeyword();
        }
        return circle;
    }
    function matchEllipse() {
        var ellipse = match('shape', /^(ellipse)/i, 0);
        if (ellipse) {
            // @ts-ignore
            ellipse.style = matchDistance() || matchExtentKeyword();
        }
        return ellipse;
    }
    function matchExtentKeyword() {
        return match('extent-keyword', tokens.extentKeywords, 1);
    }
    function matchAtPosition() {
        if (match('position', /^at/, 0)) {
            var positioning = matchPositioning();
            if (!positioning) {
                error('Missing positioning value');
            }
            return positioning;
        }
    }
    function matchPositioning() {
        var location = matchCoordinates();
        if (location.x || location.y) {
            return {
                type: 'position',
                value: location,
            };
        }
    }
    function matchCoordinates() {
        return {
            x: matchDistance(),
            y: matchDistance(),
        };
    }
    function matchListing(matcher) {
        var captures = matcher();
        var result = [];
        if (captures) {
            result.push(captures);
            while (scan(tokens.comma)) {
                captures = matcher();
                if (captures) {
                    result.push(captures);
                }
                else {
                    error('One extra comma');
                }
            }
        }
        return result;
    }
    function matchColorStop() {
        var color = matchColor();
        if (!color) {
            error('Expected color definition');
        }
        color.length = matchDistance();
        return color;
    }
    function matchColor() {
        return (matchHexColor() ||
            matchRGBAColor() ||
            matchRGBColor() ||
            matchLiteralColor());
    }
    function matchLiteralColor() {
        return match('literal', tokens.literalColor, 0);
    }
    function matchHexColor() {
        return match('hex', tokens.hexColor, 1);
    }
    function matchRGBColor() {
        return matchCall(tokens.rgbColor, function () {
            return {
                type: 'rgb',
                value: matchListing(matchNumber),
            };
        });
    }
    function matchRGBAColor() {
        return matchCall(tokens.rgbaColor, function () {
            return {
                type: 'rgba',
                value: matchListing(matchNumber),
            };
        });
    }
    function matchNumber() {
        return scan(tokens.number)[1];
    }
    function matchDistance() {
        return (match('%', tokens.percentageValue, 1) ||
            matchPositionKeyword() ||
            matchLength());
    }
    function matchPositionKeyword() {
        return match('position-keyword', tokens.positionKeywords, 1);
    }
    function matchLength() {
        return match('px', tokens.pixelValue, 1) || match('em', tokens.emValue, 1);
    }
    function match(type, pattern, captureIndex) {
        var captures = scan(pattern);
        if (captures) {
            return {
                type: type,
                value: captures[captureIndex],
            };
        }
    }
    function scan(regexp) {
        var blankCaptures = /^[\n\r\t\s]+/.exec(input);
        if (blankCaptures) {
            consume(blankCaptures[0].length);
        }
        var captures = regexp.exec(input);
        if (captures) {
            consume(captures[0].length);
        }
        return captures;
    }
    function consume(size) {
        input = input.substring(size);
    }
    return function (code) {
        input = code;
        return getAST();
    };
})();
function computeLinearGradient(width, height, angle) {
    var rad = deg2rad(angle.value);
    var rx = 0;
    var ry = 0;
    var rcx = rx + width / 2;
    var rcy = ry + height / 2;
    // get the length of gradient line
    // @see https://observablehq.com/@danburzo/css-gradient-line
    var length = Math.abs(width * Math.cos(rad)) + Math.abs(height * Math.sin(rad));
    var x1 = rcx - (Math.cos(rad) * length) / 2;
    var y1 = rcy - (Math.sin(rad) * length) / 2;
    var x2 = rcx + (Math.cos(rad) * length) / 2;
    var y2 = rcy + (Math.sin(rad) * length) / 2;
    return { x1: x1, y1: y1, x2: x2, y2: y2 };
}
function computeRadialGradient(width, height, cx, cy, size) {
    // 'px'
    var x = cx.value;
    var y = cy.value;
    // TODO: 'em'
    // '%'
    if (cx.unit === UnitType.kPercentage) {
        x = (cx.value / 100) * width;
    }
    if (cy.unit === UnitType.kPercentage) {
        y = (cy.value / 100) * height;
    }
    // default to farthest-side
    var r = Math.max(distanceSquareRoot([0, 0], [x, y]), distanceSquareRoot([0, height], [x, y]), distanceSquareRoot([width, height], [x, y]), distanceSquareRoot([width, 0], [x, y]));
    if (size) {
        if (size instanceof CSSUnitValue) {
            r = size.value;
        }
        else if (size instanceof CSSKeywordValue) {
            // @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Images/Using_CSS_gradients#example_closest-side_for_circles
            if (size.value === 'closest-side') {
                r = Math.min(x, width - x, y, height - y);
            }
            else if (size.value === 'farthest-side') {
                r = Math.max(x, width - x, y, height - y);
            }
            else if (size.value === 'closest-corner') {
                r = Math.min(distanceSquareRoot([0, 0], [x, y]), distanceSquareRoot([0, height], [x, y]), distanceSquareRoot([width, height], [x, y]), distanceSquareRoot([width, 0], [x, y]));
            }
        }
    }
    return { x: x, y: y, r: r };
}

var regexLG = /^l\s*\(\s*([\d.]+)\s*\)\s*(.*)/i;
var regexRG = /^r\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)\s*(.*)/i;
var regexPR = /^p\s*\(\s*([axyn])\s*\)\s*(.*)/i;
var regexColorStop = /[\d.]+:(#[^\s]+|[^\)]+\))/gi;
function spaceColorStops(colorStops) {
    var _a, _b, _c;
    var length = colorStops.length;
    colorStops[length - 1].length = (_a = colorStops[length - 1].length) !== null && _a !== void 0 ? _a : {
        type: '%',
        value: '100',
    };
    if (length > 1) {
        colorStops[0].length = (_b = colorStops[0].length) !== null && _b !== void 0 ? _b : {
            type: '%',
            value: '0',
        };
    }
    var previousIndex = 0;
    var previousOffset = Number(colorStops[0].length.value);
    for (var i = 1; i < length; i++) {
        // support '%' & 'px'
        var offset = (_c = colorStops[i].length) === null || _c === void 0 ? void 0 : _c.value;
        if (!isNil(offset) && !isNil(previousOffset)) {
            for (var j = 1; j < i - previousIndex; j++)
                colorStops[previousIndex + j].length = {
                    type: '%',
                    value: "".concat(previousOffset +
                        ((Number(offset) - previousOffset) * j) / (i - previousIndex)),
                };
            previousIndex = i;
            previousOffset = Number(offset);
        }
    }
}
// The position of the gradient line's starting point.
// different from CSS side(to top) @see https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/linear-gradient#values
var SideOrCornerToDegMap = {
    left: 270 - 90,
    top: 0 - 90,
    bottom: 180 - 90,
    right: 90 - 90,
    'left top': 315 - 90,
    'top left': 315 - 90,
    'left bottom': 225 - 90,
    'bottom left': 225 - 90,
    'right top': 45 - 90,
    'top right': 45 - 90,
    'right bottom': 135 - 90,
    'bottom right': 135 - 90,
};
var angleToDeg = memoize(function (orientation) {
    var angle;
    if (orientation.type === 'angular') {
        angle = Number(orientation.value);
    }
    else {
        angle = SideOrCornerToDegMap[orientation.value] || 0;
    }
    return getOrCreateUnitValue(angle, 'deg');
});
var positonToCSSUnitValue = memoize(function (position) {
    var cx = 50;
    var cy = 50;
    var unitX = '%';
    var unitY = '%';
    if ((position === null || position === void 0 ? void 0 : position.type) === 'position') {
        var _a = position.value, x = _a.x, y = _a.y;
        if ((x === null || x === void 0 ? void 0 : x.type) === 'position-keyword') {
            if (x.value === 'left') {
                cx = 0;
            }
            else if (x.value === 'center') {
                cx = 50;
            }
            else if (x.value === 'right') {
                cx = 100;
            }
            else if (x.value === 'top') {
                cy = 0;
            }
            else if (x.value === 'bottom') {
                cy = 100;
            }
        }
        if ((y === null || y === void 0 ? void 0 : y.type) === 'position-keyword') {
            if (y.value === 'left') {
                cx = 0;
            }
            else if (y.value === 'center') {
                cy = 50;
            }
            else if (y.value === 'right') {
                cx = 100;
            }
            else if (y.value === 'top') {
                cy = 0;
            }
            else if (y.value === 'bottom') {
                cy = 100;
            }
        }
        if ((x === null || x === void 0 ? void 0 : x.type) === 'px' || (x === null || x === void 0 ? void 0 : x.type) === '%' || (x === null || x === void 0 ? void 0 : x.type) === 'em') {
            unitX = x === null || x === void 0 ? void 0 : x.type;
            cx = Number(x.value);
        }
        if ((y === null || y === void 0 ? void 0 : y.type) === 'px' || (y === null || y === void 0 ? void 0 : y.type) === '%' || (y === null || y === void 0 ? void 0 : y.type) === 'em') {
            unitY = y === null || y === void 0 ? void 0 : y.type;
            cy = Number(y.value);
        }
    }
    return {
        cx: getOrCreateUnitValue(cx, unitX),
        cy: getOrCreateUnitValue(cy, unitY),
    };
});
var parseGradient = memoize(function (colorStr) {
    var _a;
    if (colorStr.indexOf('linear') > -1 || colorStr.indexOf('radial') > -1) {
        var ast = parseGradient$1(colorStr);
        return ast.map(function (_a) {
            var type = _a.type, orientation = _a.orientation, colorStops = _a.colorStops;
            spaceColorStops(colorStops);
            var steps = colorStops.map(function (colorStop) {
                // TODO: only support % for now, should calc percentage of axis length when using px/em
                return {
                    offset: getOrCreateUnitValue(Number(colorStop.length.value), '%'),
                    color: colorStopToString(colorStop),
                };
            });
            if (type === 'linear-gradient') {
                return new CSSGradientValue(GradientType.LinearGradient, {
                    angle: orientation
                        ? angleToDeg(orientation)
                        : Odeg,
                    steps: steps,
                });
            }
            else if (type === 'radial-gradient') {
                if (!orientation) {
                    orientation = [
                        {
                            type: 'shape',
                            value: 'circle',
                        },
                    ];
                }
                if (orientation[0].type === 'shape' &&
                    orientation[0].value === 'circle') {
                    var _b = positonToCSSUnitValue(orientation[0].at), cx = _b.cx, cy = _b.cy;
                    var size = void 0;
                    if (orientation[0].style) {
                        var _c = orientation[0].style, type_1 = _c.type, value = _c.value;
                        if (type_1 === 'extent-keyword') {
                            size = getOrCreateKeyword(value);
                        }
                        else {
                            size = getOrCreateUnitValue(value, type_1);
                        }
                    }
                    return new CSSGradientValue(GradientType.RadialGradient, {
                        cx: cx,
                        cy: cy,
                        size: size,
                        steps: steps,
                    });
                }
                // TODO: support ellipse shape
                // TODO: repeating-linear-gradient & repeating-radial-gradient
                // } else if (type === 'repeating-linear-gradient') {
                // } else if (type === 'repeating-radial-gradient') {
            }
        });
    }
    // legacy format, should be deprecated later
    var type = colorStr[0];
    if (colorStr[1] === '(' || colorStr[2] === '(') {
        if (type === 'l') {
            var arr = regexLG.exec(colorStr);
            if (arr) {
                var steps = ((_a = arr[2].match(regexColorStop)) === null || _a === void 0 ? void 0 : _a.map(function (stop) { return stop.split(':'); })) || [];
                return [
                    new CSSGradientValue(GradientType.LinearGradient, {
                        angle: getOrCreateUnitValue(parseFloat(arr[1]), 'deg'),
                        steps: steps.map(function (_a) {
                            var _b = __read(_a, 2), offset = _b[0], color = _b[1];
                            return ({
                                offset: getOrCreateUnitValue(Number(offset) * 100, '%'),
                                color: color,
                            });
                        }),
                    }),
                ];
            }
        }
        else if (type === 'r') {
            var parsedRadialGradient = parseRadialGradient(colorStr);
            if (parsedRadialGradient) {
                if (isString(parsedRadialGradient)) {
                    colorStr = parsedRadialGradient;
                }
                else {
                    return [
                        new CSSGradientValue(GradientType.RadialGradient, parsedRadialGradient),
                    ];
                }
            }
        }
        else if (type === 'p') {
            return parsePattern(colorStr);
        }
    }
});
function parseRadialGradient(gradientStr) {
    var _a;
    var arr = regexRG.exec(gradientStr);
    if (arr) {
        var steps = ((_a = arr[4].match(regexColorStop)) === null || _a === void 0 ? void 0 : _a.map(function (stop) { return stop.split(':'); })) || [];
        return {
            cx: getOrCreateUnitValue(50, '%'),
            cy: getOrCreateUnitValue(50, '%'),
            steps: steps.map(function (_a) {
                var _b = __read(_a, 2), offset = _b[0], color = _b[1];
                return ({
                    offset: getOrCreateUnitValue(Number(offset) * 100, '%'),
                    color: color,
                });
            }),
        };
    }
    return null;
}
function parsePattern(patternStr) {
    var arr = regexPR.exec(patternStr);
    if (arr) {
        var repetition = arr[1];
        var src = arr[2];
        switch (repetition) {
            case 'a':
                repetition = 'repeat';
                break;
            case 'x':
                repetition = 'repeat-x';
                break;
            case 'y':
                repetition = 'repeat-y';
                break;
            case 'n':
                repetition = 'no-repeat';
                break;
            default:
                repetition = 'no-repeat';
        }
        return {
            image: src,
            // @ts-ignore
            repetition: repetition,
        };
    }
    return null;
}

function isCSSGradientValue(object) {
    return (!!object.type && !!object.value);
}
function isPattern(object) {
    return object && !!object.image;
}
function isCSSRGB(object) {
    return (object &&
        !isNil(object.r) &&
        !isNil(object.g) &&
        !isNil(object.b));
}
/**
 * @see https://github.com/WebKit/WebKit/blob/main/Source/WebCore/css/parser/CSSParser.cpp#L97
 */
var parseColor = memoize(function (colorStr) {
    if (isPattern(colorStr)) {
        return __assign({ repetition: 'repeat' }, colorStr);
    }
    if (isNil(colorStr)) {
        colorStr = '';
    }
    if (colorStr === 'transparent') {
        // transparent black
        return transparentColor;
    }
    else if (colorStr === 'currentColor') {
        // @see https://github.com/adobe-webplatform/Snap.svg/issues/526
        colorStr = 'black';
    }
    // support CSS gradient syntax
    var g = parseGradient(colorStr);
    if (g) {
        return g;
    }
    // constants
    var color = d3.color(colorStr);
    var rgba = [0, 0, 0, 0];
    if (color !== null) {
        rgba[0] = color.r || 0;
        rgba[1] = color.g || 0;
        rgba[2] = color.b || 0;
        rgba[3] = color.opacity;
    }
    // return new CSSRGB(...rgba);
    return getOrCreateRGBA.apply(void 0, __spreadArray([], __read(rgba), false));
});
function mergeColors(left, right) {
    // only support constant value, exclude gradient & pattern
    if (!isCSSRGB(left) || !isCSSRGB(right)) {
        return;
    }
    return [
        [Number(left.r), Number(left.g), Number(left.b), Number(left.alpha)],
        [Number(right.r), Number(right.g), Number(right.b), Number(right.alpha)],
        function (color) {
            var rgba = color.slice();
            if (rgba[3]) {
                for (var i = 0; i < 3; i++)
                    rgba[i] = Math.round(clamp(rgba[i], 0, 255));
            }
            rgba[3] = clamp(rgba[3], 0, 1);
            return "rgba(".concat(rgba.join(','), ")");
        },
    ];
}

function parseDimension(unitRegExp, string) {
    if (isNil(string)) {
        return getOrCreateUnitValue(0, 'px');
    }
    string = "".concat(string).trim().toLowerCase();
    if (isFinite(Number(string))) {
        if ('px'.search(unitRegExp) >= 0) {
            return getOrCreateUnitValue(Number(string), 'px');
        }
        else if ('deg'.search(unitRegExp) >= 0) {
            return getOrCreateUnitValue(Number(string), 'deg');
        }
    }
    var matchedUnits = [];
    string = string.replace(unitRegExp, function (match) {
        matchedUnits.push(match);
        return 'U' + match;
    });
    var taggedUnitRegExp = 'U(' + unitRegExp.source + ')';
    return matchedUnits.map(function (unit) {
        return getOrCreateUnitValue(Number(string
            .replace(new RegExp('U' + unit, 'g'), '')
            .replace(new RegExp(taggedUnitRegExp, 'g'), '*0')), unit);
    })[0];
}
/**
 * <length>
 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/length
 * length with only absolute unit, eg. 1px
 */
var parseLength = memoize(function (css) {
    return parseDimension(new RegExp('px', 'g'), css);
});
/**
 * length with absolute or relative unit,
 * eg. 1px, 0.7em, 50%, calc(100% - 200px);
 *
 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/length-percentage
 */
// export const parseLengthOrPercentage = memoize((css: string): CSSUnitValue => {
//   if (isNumber(css) || isFinite(Number(css))) {
//     return getOrCreateUnitValue(Number(css), 'px');
//   }
//   return parseDimension(new RegExp('px|%|em|rem', 'g'), css) as CSSUnitValue;
// });
var parseLengthOrPercentage = function (css) {
    if (isNumber(css) || isFinite(Number(css))) {
        // Number(css) is NaN
        return getOrCreateUnitValue(Number(css) || 0, 'px');
        // return Number(css);
    }
    return parseDimension(new RegExp('px|%|em|rem', 'g'), css);
};
var parseAngle = memoize(function (css) {
    return parseDimension(new RegExp('deg|rad|grad|turn', 'g'), css);
});
/**
 * merge CSSUnitValue
 *
 * @example
 * 10px + 20px = 30px
 * 10deg + 10rad
 * 10% + 20% = 30%
 */
function mergeDimensions(left, right, target, nonNegative, index) {
    if (index === void 0) { index = 0; }
    var unit = '';
    var leftValue = left.value || 0;
    var rightValue = right.value || 0;
    var canonicalUnit = toCanonicalUnit(left.unit);
    var leftCanonicalUnitValue = left.convertTo(canonicalUnit);
    var rightCanonicalUnitValue = right.convertTo(canonicalUnit);
    if (leftCanonicalUnitValue && rightCanonicalUnitValue) {
        leftValue = leftCanonicalUnitValue.value;
        rightValue = rightCanonicalUnitValue.value;
        unit = unitTypeToString(left.unit);
    }
    else {
        // format '%' to 'px'
        if (CSSUnitValue.isLength(left.unit) || CSSUnitValue.isLength(right.unit)) {
            leftValue = convertPercentUnit(left, index, target);
            rightValue = convertPercentUnit(right, index, target);
            unit = 'px';
        }
    }
    // // format 'rad' 'turn' to 'deg'
    // if (CSSUnitValue.isAngle(left.unit) || CSSUnitValue.isAngle(right.unit)) {
    //   leftValue = convertAngleUnit(left);
    //   rightValue = convertAngleUnit(right);
    //   unit = 'deg';
    // }
    return [
        leftValue,
        rightValue,
        function (value) {
            if (nonNegative) {
                value = Math.max(value, 0);
            }
            return value + unit;
        },
    ];
}
function convertAngleUnit(value) {
    var deg = 0;
    if (value.unit === UnitType.kDegrees) {
        deg = value.value;
    }
    else if (value.unit === UnitType.kRadians) {
        deg = rad2deg(Number(value.value));
    }
    else if (value.unit === UnitType.kTurns) {
        deg = turn2deg(Number(value.value));
    }
    return deg;
}
function parseDimensionArrayFormat(string, size) {
    var parsed;
    if (Array.isArray(string)) {
        // [1, '2px', 3]
        parsed = string.map(function (segment) { return Number(segment); });
    }
    else if (isString(string)) {
        parsed = string.split(' ').map(function (segment) { return Number(segment); });
    }
    else if (isNumber(string)) {
        parsed = [string];
    }
    if (size === 2) {
        if (parsed.length === 1) {
            return [parsed[0], parsed[0]];
        }
        else {
            return [parsed[0], parsed[1]];
        }
    }
    else {
        if (parsed.length === 1) {
            return [parsed[0], parsed[0], parsed[0], parsed[0]];
        }
        else if (parsed.length === 2) {
            return [parsed[0], parsed[1], parsed[0], parsed[1]];
        }
        else if (parsed.length === 3) {
            return [parsed[0], parsed[1], parsed[2], parsed[1]];
        }
        else {
            return [parsed[0], parsed[1], parsed[2], parsed[3]];
        }
    }
}
function parseDimensionArray(string) {
    if (isString(string)) {
        // "1px 2px 3px"
        return string.split(' ').map(function (segment) { return parseLengthOrPercentage(segment); });
    }
    else {
        // [1, '2px', 3]
        return string.map(function (segment) { return parseLengthOrPercentage(segment.toString()); });
    }
}
// export function mergeDimensionList(
//   left: CSSUnitValue[],
//   right: CSSUnitValue[],
//   target: IElement | null,
// ): [number[], number[], (list: number[]) => string] | undefined {
//   if (left.length !== right.length) {
//     return;
//   }
//   const unit = left[0].unit;
//   return [
//     left.map((l) => l.value),
//     right.map((l) => l.value),
//     (values: number[]) => {
//       return values.map((n) => new CSSUnitValue(n, unit)).join(' ');
//     },
//   ];
// }
function convertPercentUnit(valueWithUnit, vec3Index, target) {
    if (valueWithUnit.value === 0) {
        return 0;
    }
    if (valueWithUnit.unit === UnitType.kPixels) {
        return Number(valueWithUnit.value);
    }
    else if (valueWithUnit.unit === UnitType.kPercentage && target) {
        var bounds = target.nodeName === Shape.GROUP
            ? target.getLocalBounds()
            : // : target.getGeometryBounds();
                target.geometry.contentBounds;
        return (valueWithUnit.value / 100) * bounds.halfExtents[vec3Index] * 2;
    }
    return 0;
}

var parseParam = function (css) {
    return parseDimension(/deg|rad|grad|turn|px|%/g, css);
};
var supportedFilters = [
    'blur',
    'brightness',
    'drop-shadow',
    'contrast',
    'grayscale',
    'sepia',
    'saturate',
    'hue-rotate',
    'invert',
];
function parseFilter(filterStr) {
    if (filterStr === void 0) { filterStr = ''; }
    filterStr = filterStr.toLowerCase().trim();
    if (filterStr === 'none') {
        return [];
    }
    var filterRegExp = /\s*([\w-]+)\(([^)]*)\)/g;
    var result = [];
    var match;
    var prevLastIndex = 0;
    while ((match = filterRegExp.exec(filterStr))) {
        if (match.index !== prevLastIndex) {
            return [];
        }
        prevLastIndex = match.index + match[0].length;
        if (supportedFilters.indexOf(match[1]) > -1) {
            result.push({
                name: match[1],
                params: match[2].split(' ').map(function (p) { return parseParam(p) || parseColor(p); }),
            });
        }
        if (filterRegExp.lastIndex === filterStr.length) {
            return result;
        }
    }
    return [];
}

function numberToString(x) {
    // scale(0.00000001) -> scale(0)
    // return x.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    return x.toString();
}
/**
 * parse string or number to CSSUnitValue(numeric)
 *
 * eg.
 * * 0 -> CSSUnitValue(0)
 * * '2' -> CSSUnitValue(2)
 */
var parseNumber = memoize(function (string) {
    if (typeof string === 'number') {
        return getOrCreateUnitValue(string);
    }
    if (/^\s*[-+]?(\d*\.)?\d+\s*$/.test(string)) {
        return getOrCreateUnitValue(Number(string));
    }
    else {
        return getOrCreateUnitValue(0);
    }
});
function mergeNumbers(left, right) {
    return [left, right, numberToString];
}
function clampedMergeNumbers(min, max) {
    return function (left, right) { return [
        left,
        right,
        function (x) { return numberToString(clamp(x, min, max)); },
    ]; };
}
function mergeNumberLists(left, right) {
    if (left.length !== right.length) {
        return;
    }
    return [
        left,
        right,
        function (numberList) {
            return numberList;
        },
    ];
}

function getOrCalculatePathTotalLength(path) {
    if (path.parsedStyle.path.totalLength === 0) {
        path.parsedStyle.path.totalLength = getTotalLength(path.parsedStyle.path.absolutePath);
    }
    return path.parsedStyle.path.totalLength;
}
function removeRedundantMCommand(path) {
    for (var i = 0; i < path.length; i++) {
        var prevSegment = path[i - 1];
        var segment = path[i];
        var cmd = segment[0];
        if (cmd === 'M') {
            if (prevSegment) {
                var prevCmd = prevSegment[0];
                var srcPoint = [segment[1], segment[2]];
                var destPoint = void 0;
                if (prevCmd === 'L' || prevCmd === 'M') {
                    destPoint = [prevSegment[1], prevSegment[2]];
                }
                else if (prevCmd === 'C' || prevCmd === 'A' || prevCmd === 'Q') {
                    destPoint = [
                        prevSegment[prevSegment.length - 2],
                        prevSegment[prevSegment.length - 1],
                    ];
                }
                if (destPoint && isSamePoint(srcPoint, destPoint)) {
                    path.splice(i, 1);
                    i--;
                }
            }
        }
    }
}
function hasArcOrBezier(path) {
    var hasArc = false;
    var count = path.length;
    for (var i = 0; i < count; i++) {
        var params = path[i];
        var cmd = params[0];
        if (cmd === 'C' || cmd === 'A' || cmd === 'Q') {
            hasArc = true;
            break;
        }
    }
    return hasArc;
}
function extractPolygons(pathArray) {
    var polygons = [];
    var polylines = [];
    var points = []; // 防止第一个命令不是 'M'
    for (var i = 0; i < pathArray.length; i++) {
        var params = pathArray[i];
        var cmd = params[0];
        if (cmd === 'M') {
            // 遇到 'M' 判定是否是新数组，新数组中没有点
            if (points.length) {
                // 如果存在点，则说明没有遇到 'Z'，开始了一个新的多边形
                polylines.push(points);
                points = []; // 创建新的点
            }
            points.push([params[1], params[2]]);
        }
        else if (cmd === 'Z') {
            if (points.length) {
                // 存在点
                polygons.push(points);
                points = []; // 开始新的点集合
            }
            // 如果不存在点，同时 'Z'，则说明是错误，不处理
        }
        else {
            points.push([params[1], params[2]]);
        }
    }
    // 说明 points 未放入 polygons 或者 polyline
    // 仅当只有一个 M，没有 Z 时会发生这种情况
    if (points.length > 0) {
        polylines.push(points);
    }
    return {
        polygons: polygons,
        polylines: polylines,
    };
}
function isSamePoint(point1, point2) {
    return point1[0] === point2[0] && point1[1] === point2[1];
}
function getPathBBox(segments, lineWidth) {
    var xArr = [];
    var yArr = [];
    var segmentsWithAngle = [];
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        var currentPoint = segment.currentPoint, params = segment.params, prePoint = segment.prePoint;
        var box = void 0;
        switch (segment.command) {
            case 'Q':
                box = quadBox(prePoint[0], prePoint[1], params[1], params[2], params[3], params[4]);
                break;
            case 'C':
                box = cubicBox(prePoint[0], prePoint[1], params[1], params[2], params[3], params[4], params[5], params[6]);
                break;
            case 'A':
                var arcParams = segment.arcParams;
                box = arcBox(arcParams.cx, arcParams.cy, arcParams.rx, arcParams.ry, arcParams.xRotation, arcParams.startAngle, arcParams.endAngle);
                break;
            default:
                xArr.push(currentPoint[0]);
                yArr.push(currentPoint[1]);
                break;
        }
        if (box) {
            segment.box = box;
            xArr.push(box.x, box.x + box.width);
            yArr.push(box.y, box.y + box.height);
        }
        if (lineWidth &&
            (segment.command === 'L' || segment.command === 'M') &&
            segment.prePoint &&
            segment.nextPoint) {
            segmentsWithAngle.push(segment);
        }
    }
    // bbox calculation should ignore NaN for path attribute
    // ref: https://github.com/antvis/g/issues/210
    // ref: https://github.com/antvis/G2/issues/3109
    xArr = xArr.filter(function (item) { return !Number.isNaN(item) && item !== Infinity && item !== -Infinity; });
    yArr = yArr.filter(function (item) { return !Number.isNaN(item) && item !== Infinity && item !== -Infinity; });
    var minX = min(xArr);
    var minY = min(yArr);
    var maxX = max(xArr);
    var maxY = max(yArr);
    if (segmentsWithAngle.length === 0) {
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
    for (var i = 0; i < segmentsWithAngle.length; i++) {
        var segment = segmentsWithAngle[i];
        var currentPoint = segment.currentPoint;
        var extra = void 0;
        if (currentPoint[0] === minX) {
            extra = getExtraFromSegmentWithAngle(segment, lineWidth);
            minX = minX - extra.xExtra;
        }
        else if (currentPoint[0] === maxX) {
            extra = getExtraFromSegmentWithAngle(segment, lineWidth);
            maxX = maxX + extra.xExtra;
        }
        if (currentPoint[1] === minY) {
            extra = getExtraFromSegmentWithAngle(segment, lineWidth);
            minY = minY - extra.yExtra;
        }
        else if (currentPoint[1] === maxY) {
            extra = getExtraFromSegmentWithAngle(segment, lineWidth);
            maxY = maxY + extra.yExtra;
        }
    }
    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
function getExtraFromSegmentWithAngle(segment, lineWidth) {
    var prePoint = segment.prePoint, currentPoint = segment.currentPoint, nextPoint = segment.nextPoint;
    var currentAndPre = Math.pow(currentPoint[0] - prePoint[0], 2) +
        Math.pow(currentPoint[1] - prePoint[1], 2);
    var currentAndNext = Math.pow(currentPoint[0] - nextPoint[0], 2) +
        Math.pow(currentPoint[1] - nextPoint[1], 2);
    var preAndNext = Math.pow(prePoint[0] - nextPoint[0], 2) +
        Math.pow(prePoint[1] - nextPoint[1], 2);
    // 以 currentPoint 为顶点的夹角
    var currentAngle = Math.acos((currentAndPre + currentAndNext - preAndNext) /
        (2 * Math.sqrt(currentAndPre) * Math.sqrt(currentAndNext)));
    // 夹角为空、 0 或 PI 时，不需要计算夹角处的额外宽度
    // 注意: 由于计算精度问题，夹角为 0 的情况计算出来的角度可能是一个很小的值，还需要判断其与 0 是否近似相等
    if (!currentAngle ||
        Math.sin(currentAngle) === 0 ||
        isNumberEqual(currentAngle, 0)) {
        return {
            xExtra: 0,
            yExtra: 0,
        };
    }
    var xAngle = Math.abs(Math.atan2(nextPoint[1] - currentPoint[1], nextPoint[0] - currentPoint[0]));
    var yAngle = Math.abs(Math.atan2(nextPoint[0] - currentPoint[0], nextPoint[1] - currentPoint[1]));
    // 将夹角转为锐角
    xAngle = xAngle > Math.PI / 2 ? Math.PI - xAngle : xAngle;
    yAngle = yAngle > Math.PI / 2 ? Math.PI - yAngle : yAngle;
    // 这里不考虑在水平和垂直方向的投影，直接使用最大差值
    // 由于上层统一加减了二分之一线宽，这里需要进行弥补
    var extra = {
        // 水平方向投影
        xExtra: Math.cos(currentAngle / 2 - xAngle) *
            ((lineWidth / 2) * (1 / Math.sin(currentAngle / 2))) -
            lineWidth / 2 || 0,
        // 垂直方向投影
        yExtra: Math.cos(yAngle - currentAngle / 2) *
            ((lineWidth / 2) * (1 / Math.sin(currentAngle / 2))) -
            lineWidth / 2 || 0,
    };
    return extra;
}
// 点对称
function toSymmetry(point, center) {
    return [
        center[0] + (center[0] - point[0]),
        center[1] + (center[1] - point[1]),
    ];
}
var angleBetween = function (v0, v1) {
    var p = v0.x * v1.x + v0.y * v1.y;
    var n = Math.sqrt((Math.pow(v0.x, 2) + Math.pow(v0.y, 2)) *
        (Math.pow(v1.x, 2) + Math.pow(v1.y, 2)));
    var sign = v0.x * v1.y - v0.y * v1.x < 0 ? -1 : 1;
    var angle = sign * Math.acos(p / n);
    return angle;
};
/**
 * @see https://github.com/rveciana/svg-path-properties/blob/b6bd9a322966f6ef7a311872d80c56e3718de861/src/arc.ts#L121
 */
var pointOnEllipticalArc = function (p0, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, p1, t) {
    // In accordance to: http://www.w3.org/TR/SVG/implnote.html#ArcOutOfRangeParameters
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    xAxisRotation = mod(xAxisRotation, 360);
    var xAxisRotationRadians = deg2rad(xAxisRotation);
    // If the endpoints are identical, then this is equivalent to omitting the elliptical arc segment entirely.
    if (p0.x === p1.x && p0.y === p1.y) {
        return { x: p0.x, y: p0.y, ellipticalArcAngle: 0 }; // Check if angle is correct
    }
    // If rx = 0 or ry = 0 then this arc is treated as a straight line segment joining the endpoints.
    if (rx === 0 || ry === 0) {
        //return this.pointOnLine(p0, p1, t);
        return { x: 0, y: 0, ellipticalArcAngle: 0 }; // Check if angle is correct
    }
    // Following "Conversion from endpoint to center parameterization"
    // http://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
    // Step #1: Compute transformedPoint
    var dx = (p0.x - p1.x) / 2;
    var dy = (p0.y - p1.y) / 2;
    var transformedPoint = {
        x: Math.cos(xAxisRotationRadians) * dx + Math.sin(xAxisRotationRadians) * dy,
        y: -Math.sin(xAxisRotationRadians) * dx +
            Math.cos(xAxisRotationRadians) * dy,
    };
    // Ensure radii are large enough
    var radiiCheck = Math.pow(transformedPoint.x, 2) / Math.pow(rx, 2) +
        Math.pow(transformedPoint.y, 2) / Math.pow(ry, 2);
    if (radiiCheck > 1) {
        rx = Math.sqrt(radiiCheck) * rx;
        ry = Math.sqrt(radiiCheck) * ry;
    }
    // Step #2: Compute transformedCenter
    var cSquareNumerator = Math.pow(rx, 2) * Math.pow(ry, 2) -
        Math.pow(rx, 2) * Math.pow(transformedPoint.y, 2) -
        Math.pow(ry, 2) * Math.pow(transformedPoint.x, 2);
    var cSquareRootDenom = Math.pow(rx, 2) * Math.pow(transformedPoint.y, 2) +
        Math.pow(ry, 2) * Math.pow(transformedPoint.x, 2);
    var cRadicand = cSquareNumerator / cSquareRootDenom;
    // Make sure this never drops below zero because of precision
    cRadicand = cRadicand < 0 ? 0 : cRadicand;
    var cCoef = (largeArcFlag !== sweepFlag ? 1 : -1) * Math.sqrt(cRadicand);
    var transformedCenter = {
        x: cCoef * ((rx * transformedPoint.y) / ry),
        y: cCoef * (-(ry * transformedPoint.x) / rx),
    };
    // Step #3: Compute center
    var center = {
        x: Math.cos(xAxisRotationRadians) * transformedCenter.x -
            Math.sin(xAxisRotationRadians) * transformedCenter.y +
            (p0.x + p1.x) / 2,
        y: Math.sin(xAxisRotationRadians) * transformedCenter.x +
            Math.cos(xAxisRotationRadians) * transformedCenter.y +
            (p0.y + p1.y) / 2,
    };
    // Step #4: Compute start/sweep angles
    // Start angle of the elliptical arc prior to the stretch and rotate operations.
    // Difference between the start and end angles
    var startVector = {
        x: (transformedPoint.x - transformedCenter.x) / rx,
        y: (transformedPoint.y - transformedCenter.y) / ry,
    };
    var startAngle = angleBetween({
        x: 1,
        y: 0,
    }, startVector);
    var endVector = {
        x: (-transformedPoint.x - transformedCenter.x) / rx,
        y: (-transformedPoint.y - transformedCenter.y) / ry,
    };
    var sweepAngle = angleBetween(startVector, endVector);
    if (!sweepFlag && sweepAngle > 0) {
        sweepAngle -= 2 * Math.PI;
    }
    else if (sweepFlag && sweepAngle < 0) {
        sweepAngle += 2 * Math.PI;
    }
    // We use % instead of `mod(..)` because we want it to be -360deg to 360deg(but actually in radians)
    sweepAngle %= 2 * Math.PI;
    // From http://www.w3.org/TR/SVG/implnote.html#ArcParameterizationAlternatives
    var angle = startAngle + sweepAngle * t;
    var ellipseComponentX = rx * Math.cos(angle);
    var ellipseComponentY = ry * Math.sin(angle);
    var point = {
        x: Math.cos(xAxisRotationRadians) * ellipseComponentX -
            Math.sin(xAxisRotationRadians) * ellipseComponentY +
            center.x,
        y: Math.sin(xAxisRotationRadians) * ellipseComponentX +
            Math.cos(xAxisRotationRadians) * ellipseComponentY +
            center.y,
        ellipticalArcStartAngle: startAngle,
        ellipticalArcEndAngle: startAngle + sweepAngle,
        ellipticalArcAngle: angle,
        ellipticalArcCenter: center,
        resultantRx: rx,
        resultantRy: ry,
    };
    return point;
};
function path2Segments(path) {
    var segments = [];
    var currentPoint = null; // 当前图形
    var nextParams = null; // 下一节点的 path 参数
    var startMovePoint = null; // 开始 M 的点，可能会有多个
    var lastStartMovePointIndex = 0; // 最近一个开始点 M 的索引
    var count = path.length;
    for (var i = 0; i < count; i++) {
        var params = path[i];
        nextParams = path[i + 1];
        var command = params[0];
        // 数学定义上的参数，便于后面的计算
        var segment = {
            command: command,
            prePoint: currentPoint,
            params: params,
            startTangent: null,
            endTangent: null,
            currentPoint: null,
            nextPoint: null,
            arcParams: null,
            box: null,
            cubicParams: null,
        };
        switch (command) {
            case 'M':
                startMovePoint = [params[1], params[2]];
                lastStartMovePointIndex = i;
                break;
            case 'A':
                var arcParams = getArcParams(currentPoint, params);
                segment.arcParams = arcParams;
                break;
        }
        if (command === 'Z') {
            // 有了 Z 后，当前节点从开始 M 的点开始
            currentPoint = startMovePoint;
            // 如果当前点的命令为 Z，相当于当前点为最近一个 M 点，则下一个点直接指向最近一个 M 点的下一个点
            nextParams = path[lastStartMovePointIndex + 1];
        }
        else {
            var len = params.length;
            currentPoint = [params[len - 2], params[len - 1]];
        }
        if (nextParams && nextParams[0] === 'Z') {
            // 如果下一个点的命令为 Z，则下一个点直接指向最近一个 M 点
            nextParams = path[lastStartMovePointIndex];
            if (segments[lastStartMovePointIndex]) {
                // 如果下一个点的命令为 Z，则最近一个 M 点的前一个点为当前点
                segments[lastStartMovePointIndex].prePoint = currentPoint;
            }
        }
        segment.currentPoint = currentPoint;
        // 如果当前点与最近一个 M 点相同，则最近一个 M 点的前一个点为当前点的前一个点
        if (segments[lastStartMovePointIndex] &&
            isSamePoint(currentPoint, segments[lastStartMovePointIndex].currentPoint)) {
            segments[lastStartMovePointIndex].prePoint = segment.prePoint;
        }
        var nextPoint = nextParams
            ? [nextParams[nextParams.length - 2], nextParams[nextParams.length - 1]]
            : null;
        segment.nextPoint = nextPoint;
        // Add startTangent and endTangent
        var prePoint = segment.prePoint;
        if (['L', 'H', 'V'].includes(command)) {
            segment.startTangent = [
                prePoint[0] - currentPoint[0],
                prePoint[1] - currentPoint[1],
            ];
            segment.endTangent = [
                currentPoint[0] - prePoint[0],
                currentPoint[1] - prePoint[1],
            ];
        }
        else if (command === 'Q') {
            // 二次贝塞尔曲线只有一个控制点
            var cp = [params[1], params[2]];
            // 二次贝塞尔曲线的终点为 currentPoint
            segment.startTangent = [prePoint[0] - cp[0], prePoint[1] - cp[1]];
            segment.endTangent = [currentPoint[0] - cp[0], currentPoint[1] - cp[1]];
        }
        else if (command === 'T') {
            var preSegment = segments[i - 1];
            var cp = toSymmetry(preSegment.currentPoint, prePoint);
            if (preSegment.command === 'Q') {
                segment.command = 'Q';
                segment.startTangent = [prePoint[0] - cp[0], prePoint[1] - cp[1]];
                segment.endTangent = [currentPoint[0] - cp[0], currentPoint[1] - cp[1]];
            }
            else {
                // @ts-ignore
                segment.command = 'TL';
                segment.startTangent = [
                    prePoint[0] - currentPoint[0],
                    prePoint[1] - currentPoint[1],
                ];
                segment.endTangent = [
                    currentPoint[0] - prePoint[0],
                    currentPoint[1] - prePoint[1],
                ];
            }
        }
        else if (command === 'C') {
            // 三次贝塞尔曲线有两个控制点
            var cp1 = [params[1], params[2]];
            var cp2 = [params[3], params[4]];
            segment.startTangent = [prePoint[0] - cp1[0], prePoint[1] - cp1[1]];
            segment.endTangent = [currentPoint[0] - cp2[0], currentPoint[1] - cp2[1]];
            // horizontal line, eg. ['C', 100, 100, 100, 100, 200, 200]
            if (segment.startTangent[0] === 0 && segment.startTangent[1] === 0) {
                segment.startTangent = [cp1[0] - cp2[0], cp1[1] - cp2[1]];
            }
            if (segment.endTangent[0] === 0 && segment.endTangent[1] === 0) {
                segment.endTangent = [cp2[0] - cp1[0], cp2[1] - cp1[1]];
            }
        }
        else if (command === 'S') {
            var preSegment = segments[i - 1];
            var cp1 = toSymmetry(preSegment.currentPoint, prePoint);
            var cp2 = [params[1], params[2]];
            if (preSegment.command === 'C') {
                segment.command = 'C'; // 将 S 命令变换为 C 命令
                segment.startTangent = [prePoint[0] - cp1[0], prePoint[1] - cp1[1]];
                segment.endTangent = [
                    currentPoint[0] - cp2[0],
                    currentPoint[1] - cp2[1],
                ];
            }
            else {
                // @ts-ignore
                segment.command = 'SQ'; // 将 S 命令变换为 SQ 命令
                segment.startTangent = [prePoint[0] - cp2[0], prePoint[1] - cp2[1]];
                segment.endTangent = [
                    currentPoint[0] - cp2[0],
                    currentPoint[1] - cp2[1],
                ];
            }
        }
        else if (command === 'A') {
            var _a = getTangentAtRatio(segment, 0), dx1 = _a.x, dy1 = _a.y;
            var _b = getTangentAtRatio(segment, 1, false), dx2 = _b.x, dy2 = _b.y;
            segment.startTangent = [dx1, dy1];
            segment.endTangent = [dx2, dy2];
        }
        segments.push(segment);
    }
    return segments;
}
/**
 * Use length instead of ratio
 */
function getTangentAtRatio(segment, ratio, sign) {
    if (sign === void 0) { sign = true; }
    var _a = segment.arcParams, _b = _a.rx, rx = _b === void 0 ? 0 : _b, _c = _a.ry, ry = _c === void 0 ? 0 : _c, xRotation = _a.xRotation, arcFlag = _a.arcFlag, sweepFlag = _a.sweepFlag;
    var p1 = pointOnEllipticalArc({ x: segment.prePoint[0], y: segment.prePoint[1] }, rx, ry, xRotation, !!arcFlag, !!sweepFlag, { x: segment.currentPoint[0], y: segment.currentPoint[1] }, ratio);
    var p2 = pointOnEllipticalArc({ x: segment.prePoint[0], y: segment.prePoint[1] }, rx, ry, xRotation, !!arcFlag, !!sweepFlag, { x: segment.currentPoint[0], y: segment.currentPoint[1] }, sign ? ratio + 0.005 : ratio - 0.005);
    var xDist = p2.x - p1.x;
    var yDist = p2.y - p1.y;
    var dist = Math.sqrt(xDist * xDist + yDist * yDist);
    return { x: -xDist / dist, y: -yDist / dist };
}
// 向量长度
function vMag(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}
// u.v/|u||v|，计算夹角的余弦值
function vRatio(u, v) {
    // 当存在一个向量的长度为 0 时，夹角也为 0，即夹角的余弦值为 1
    return vMag(u) * vMag(v)
        ? (u[0] * v[0] + u[1] * v[1]) / (vMag(u) * vMag(v))
        : 1;
}
// 向量角度
function vAngle(u, v) {
    return (u[0] * v[1] < u[1] * v[0] ? -1 : 1) * Math.acos(vRatio(u, v));
}
function getArcParams(startPoint, params) {
    var rx = params[1];
    var ry = params[2];
    var xRotation = mod(deg2rad(params[3]), Math.PI * 2);
    var arcFlag = params[4];
    var sweepFlag = params[5];
    // 弧形起点坐标
    var x1 = startPoint[0];
    var y1 = startPoint[1];
    // 弧形终点坐标
    var x2 = params[6];
    var y2 = params[7];
    var xp = (Math.cos(xRotation) * (x1 - x2)) / 2.0 +
        (Math.sin(xRotation) * (y1 - y2)) / 2.0;
    var yp = (-1 * Math.sin(xRotation) * (x1 - x2)) / 2.0 +
        (Math.cos(xRotation) * (y1 - y2)) / 2.0;
    var lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
    if (lambda > 1) {
        rx *= Math.sqrt(lambda);
        ry *= Math.sqrt(lambda);
    }
    var diff = rx * rx * (yp * yp) + ry * ry * (xp * xp);
    var f = diff ? Math.sqrt((rx * rx * (ry * ry) - diff) / diff) : 1;
    if (arcFlag === sweepFlag) {
        f *= -1;
    }
    if (isNaN(f)) {
        f = 0;
    }
    // 旋转前的起点坐标，且当长半轴和短半轴的长度为 0 时，坐标按 (0, 0) 处理
    var cxp = ry ? (f * rx * yp) / ry : 0;
    var cyp = rx ? (f * -ry * xp) / rx : 0;
    // 椭圆圆心坐标
    var cx = (x1 + x2) / 2.0 + Math.cos(xRotation) * cxp - Math.sin(xRotation) * cyp;
    var cy = (y1 + y2) / 2.0 + Math.sin(xRotation) * cxp + Math.cos(xRotation) * cyp;
    // 起始点的单位向量
    var u = [(xp - cxp) / rx, (yp - cyp) / ry];
    // 终止点的单位向量
    var v = [(-1 * xp - cxp) / rx, (-1 * yp - cyp) / ry];
    // 计算起始点和圆心的连线，与 x 轴正方向的夹角
    var theta = vAngle([1, 0], u);
    // 计算圆弧起始点和终止点与椭圆圆心连线的夹角
    var dTheta = vAngle(u, v);
    if (vRatio(u, v) <= -1) {
        dTheta = Math.PI;
    }
    if (vRatio(u, v) >= 1) {
        dTheta = 0;
    }
    if (sweepFlag === 0 && dTheta > 0) {
        dTheta = dTheta - 2 * Math.PI;
    }
    if (sweepFlag === 1 && dTheta < 0) {
        dTheta = dTheta + 2 * Math.PI;
    }
    return {
        cx: cx,
        cy: cy,
        // 弧形的起点和终点相同时，长轴和短轴的长度按 0 处理
        rx: isSamePoint(startPoint, [x2, y2]) ? 0 : rx,
        ry: isSamePoint(startPoint, [x2, y2]) ? 0 : ry,
        startAngle: theta,
        endAngle: theta + dTheta,
        xRotation: xRotation,
        arcFlag: arcFlag,
        sweepFlag: sweepFlag,
    };
}
function commandsToPathString(commands, object, transform) {
    var _a = object.parsedStyle, _b = _a.defX, defX = _b === void 0 ? 0 : _b, _c = _a.defY, defY = _c === void 0 ? 0 : _c;
    return commands.reduce(function (prev, cur) {
        var path = '';
        if (cur[0] === 'M' || cur[0] === 'L') {
            var p = vec3.fromValues(cur[1] - defX, cur[2] - defY, 0);
            if (transform) {
                vec3.transformMat4(p, p, transform);
            }
            path = "".concat(cur[0]).concat(p[0], ",").concat(p[1]);
        }
        else if (cur[0] === 'Z') {
            path = cur[0];
        }
        else if (cur[0] === 'C') {
            var p1 = vec3.fromValues(cur[1] - defX, cur[2] - defY, 0);
            var p2 = vec3.fromValues(cur[3] - defX, cur[4] - defY, 0);
            var p3 = vec3.fromValues(cur[5] - defX, cur[6] - defY, 0);
            if (transform) {
                vec3.transformMat4(p1, p1, transform);
                vec3.transformMat4(p2, p2, transform);
                vec3.transformMat4(p3, p3, transform);
            }
            path = "".concat(cur[0]).concat(p1[0], ",").concat(p1[1], ",").concat(p2[0], ",").concat(p2[1], ",").concat(p3[0], ",").concat(p3[1]);
        }
        else if (cur[0] === 'A') {
            var c = vec3.fromValues(cur[6] - defX, cur[7] - defY, 0);
            if (transform) {
                vec3.transformMat4(c, c, transform);
            }
            path = "".concat(cur[0]).concat(cur[1], ",").concat(cur[2], ",").concat(cur[3], ",").concat(cur[4], ",").concat(cur[5], ",").concat(c[0], ",").concat(c[1]);
        }
        else if (cur[0] === 'Q') {
            var p1 = vec3.fromValues(cur[1] - defX, cur[2] - defY, 0);
            var p2 = vec3.fromValues(cur[3] - defX, cur[4] - defY, 0);
            if (transform) {
                vec3.transformMat4(p1, p1, transform);
                vec3.transformMat4(p2, p2, transform);
            }
            path = "".concat(cur[0]).concat(cur[1], ",").concat(cur[2], ",").concat(cur[3], ",").concat(cur[4], "}");
        }
        return (prev += path);
    }, '');
}
function lineToCommands(x1, y1, x2, y2) {
    return [
        ['M', x1, y1],
        ['L', x2, y2],
    ];
}
function ellipseToCommands(rx, ry, cx, cy) {
    var factor = ((-1 + Math.sqrt(2)) / 3) * 4;
    var dx = rx * factor;
    var dy = ry * factor;
    var left = cx - rx;
    var right = cx + rx;
    var top = cy - ry;
    var bottom = cy + ry;
    return [
        ['M', left, cy],
        ['C', left, cy - dy, cx - dx, top, cx, top],
        ['C', cx + dx, top, right, cy - dy, right, cy],
        ['C', right, cy + dy, cx + dx, bottom, cx, bottom],
        ['C', cx - dx, bottom, left, cy + dy, left, cy],
        ['Z'],
    ];
}
function polygonToCommands(points, closed) {
    var result = points.map(function (point, i) {
        return [i === 0 ? 'M' : 'L', point[0], point[1]];
    });
    if (closed) {
        result.push(['Z']);
    }
    return result;
}
function rectToCommands(width, height, x, y, radius) {
    // @see https://gist.github.com/danielpquinn/dd966af424030d47e476
    if (radius) {
        var _a = __read(radius, 4), tlr = _a[0], trr = _a[1], brr = _a[2], blr = _a[3];
        var signX = width > 0 ? 1 : -1;
        var signY = height > 0 ? 1 : -1;
        // sweep-flag @see https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial/Paths#arcs
        var sweepFlag = signX + signY !== 0 ? 1 : 0;
        return [
            ['M', signX * tlr + x, y],
            ['L', width - signX * trr + x, y],
            trr ? ['A', trr, trr, 0, 0, sweepFlag, width + x, signY * trr + y] : null,
            ['L', width + x, height - signY * brr + y],
            brr
                ? ['A', brr, brr, 0, 0, sweepFlag, width + x - signX * brr, height + y]
                : null,
            ['L', x + signX * blr, height + y],
            blr
                ? ['A', blr, blr, 0, 0, sweepFlag, x, height + y - signY * blr]
                : null,
            ['L', x, signY * tlr + y],
            tlr ? ['A', tlr, tlr, 0, 0, sweepFlag, signX * tlr + x, y] : null,
            ['Z'],
        ].filter(function (command) { return command; });
    }
    return [
        ['M', x, y],
        ['L', x + width, y],
        ['L', x + width, y + height],
        ['L', x, y + height],
        ['Z'],
    ];
}
/**
 * convert object to path, should account for:
 * * transform & origin
 * * anchor
 * * lineWidth
 */
function convertToPath(object, transform) {
    if (transform === void 0) { transform = object.getLocalTransform(); }
    var commands = [];
    switch (object.nodeName) {
        case Shape.LINE:
            var _a = object.parsedStyle, _b = _a.x1, x1 = _b === void 0 ? 0 : _b, _c = _a.y1, y1 = _c === void 0 ? 0 : _c, _d = _a.x2, x2 = _d === void 0 ? 0 : _d, _e = _a.y2, y2 = _e === void 0 ? 0 : _e;
            commands = lineToCommands(x1, y1, x2, y2);
            break;
        case Shape.CIRCLE: {
            var _f = object.parsedStyle, _g = _f.r, r = _g === void 0 ? 0 : _g, _h = _f.cx, cx = _h === void 0 ? 0 : _h, _j = _f.cy, cy = _j === void 0 ? 0 : _j;
            commands = ellipseToCommands(r, r, cx, cy);
            break;
        }
        case Shape.ELLIPSE: {
            var _k = object.parsedStyle, _l = _k.rx, rx = _l === void 0 ? 0 : _l, _m = _k.ry, ry = _m === void 0 ? 0 : _m, _o = _k.cx, cx = _o === void 0 ? 0 : _o, _p = _k.cy, cy = _p === void 0 ? 0 : _p;
            commands = ellipseToCommands(rx, ry, cx, cy);
            break;
        }
        case Shape.POLYLINE:
        case Shape.POLYGON:
            var points = object.parsedStyle.points;
            commands = polygonToCommands(points.points, object.nodeName === Shape.POLYGON);
            break;
        case Shape.RECT:
            var _q = object.parsedStyle, _r = _q.width, width_1 = _r === void 0 ? 0 : _r, _s = _q.height, height_1 = _s === void 0 ? 0 : _s, _t = _q.x, x = _t === void 0 ? 0 : _t, _u = _q.y, y = _u === void 0 ? 0 : _u, radius = _q.radius;
            var hasRadius = radius && radius.some(function (r) { return r !== 0; });
            commands = rectToCommands(width_1, height_1, x, y, hasRadius &&
                radius.map(function (r) {
                    return clamp(r, 0, Math.min(Math.abs(width_1) / 2, Math.abs(height_1) / 2));
                }));
            break;
        case Shape.PATH:
            var absolutePath = object.parsedStyle.path.absolutePath;
            commands = __spreadArray([], __read(absolutePath), false);
            break;
    }
    if (commands.length) {
        return commandsToPathString(commands, object, transform);
    }
}
function translatePathToString(absolutePath, defX, defY, startOffsetX, startOffsetY, endOffsetX, endOffsetY) {
    if (startOffsetX === void 0) { startOffsetX = 0; }
    if (startOffsetY === void 0) { startOffsetY = 0; }
    if (endOffsetX === void 0) { endOffsetX = 0; }
    if (endOffsetY === void 0) { endOffsetY = 0; }
    var newValue = absolutePath
        .map(function (params, i) {
        var command = params[0];
        var nextSegment = absolutePath[i + 1];
        var useStartOffset = i === 0 && (startOffsetX !== 0 || startOffsetY !== 0);
        var useEndOffset = (i === absolutePath.length - 1 ||
            (nextSegment &&
                (nextSegment[0] === 'M' || nextSegment[0] === 'Z'))) &&
            endOffsetX !== 0 &&
            endOffsetY !== 0;
        switch (command) {
            case 'M':
                // Use start marker offset
                if (useStartOffset) {
                    return "M ".concat(params[1] - defX + startOffsetX, ",").concat(params[2] - defY + startOffsetY, " L ").concat(params[1] - defX, ",").concat(params[2] - defY);
                }
                else {
                    return "M ".concat(params[1] - defX, ",").concat(params[2] - defY);
                }
            case 'L':
                return "L ".concat(params[1] - defX + (useEndOffset ? endOffsetX : 0), ",").concat(params[2] - defY + (useEndOffset ? endOffsetY : 0));
            case 'Q':
                return ("Q ".concat(params[1] - defX, " ").concat(params[2] - defY, ",").concat(params[3] - defX, " ").concat(params[4] - defY) +
                    (useEndOffset
                        ? " L ".concat(params[3] - defX + endOffsetX, ",").concat(params[4] - defY + endOffsetY)
                        : ''));
            case 'C':
                return ("C ".concat(params[1] - defX, " ").concat(params[2] - defY, ",").concat(params[3] - defX, " ").concat(params[4] - defY, ",").concat(params[5] - defX, " ").concat(params[6] - defY) +
                    (useEndOffset
                        ? " L ".concat(params[5] - defX + endOffsetX, ",").concat(params[6] - defY + endOffsetY)
                        : ''));
            case 'A':
                return ("A ".concat(params[1], " ").concat(params[2], " ").concat(params[3], " ").concat(params[4], " ").concat(params[5], " ").concat(params[6] - defX, " ").concat(params[7] - defY) +
                    (useEndOffset
                        ? " L ".concat(params[6] - defX + endOffsetX, ",").concat(params[7] - defY + endOffsetY)
                        : ''));
            case 'Z':
                return 'Z';
        }
    })
        .join(' ');
    if (~newValue.indexOf('NaN')) {
        return '';
    }
    return newValue;
}

var internalParsePath = function (path) {
    // empty path
    if (path === '' || (Array.isArray(path) && path.length === 0)) {
        return {
            absolutePath: [],
            hasArc: false,
            segments: [],
            polygons: [],
            polylines: [],
            curve: null,
            totalLength: 0,
            rect: {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            },
        };
    }
    var absolutePath;
    try {
        absolutePath = normalizePath(path);
    }
    catch (e) {
        absolutePath = normalizePath('');
        console.error("[g]: Invalid SVG Path definition: ".concat(path));
    }
    removeRedundantMCommand(absolutePath);
    var hasArc = hasArcOrBezier(absolutePath);
    var _a = extractPolygons(absolutePath), polygons = _a.polygons, polylines = _a.polylines;
    // for later use
    var segments = path2Segments(absolutePath);
    // Only calculate bbox here since we don't need length now.
    var _b = getPathBBox(segments, 0), x = _b.x, y = _b.y, width = _b.width, height = _b.height;
    return {
        absolutePath: absolutePath,
        hasArc: hasArc,
        segments: segments,
        polygons: polygons,
        polylines: polylines,
        // curve,
        // Delay the calculation of length.
        totalLength: 0,
        rect: {
            x: Number.isFinite(x) ? x : 0,
            y: Number.isFinite(y) ? y : 0,
            width: Number.isFinite(width) ? width : 0,
            height: Number.isFinite(height) ? height : 0,
        },
    };
};
var memoizedParsePath = memoize(internalParsePath);
function parsePath(path) {
    return (isString(path) ? memoizedParsePath(path) : internalParsePath(path));
}
function mergePaths(left, right, object) {
    var curve1 = left.curve;
    var curve2 = right.curve;
    if (!curve1 || curve1.length === 0) {
        // convert to curves to do morphing & picking later
        // @see http://thednp.github.io/kute.js/svgCubicMorph.html
        curve1 = path2Curve(left.absolutePath, false);
        left.curve = curve1;
    }
    if (!curve2 || curve2.length === 0) {
        curve2 = path2Curve(right.absolutePath, false);
        right.curve = curve2;
    }
    var curves = [curve1, curve2];
    if (curve1.length !== curve2.length) {
        curves = equalizeSegments(curve1, curve2);
    }
    var curve0 = getDrawDirection(curves[0]) !== getDrawDirection(curves[1])
        ? reverseCurve(curves[0])
        : clonePath(curves[0]);
    return [
        curve0,
        getRotatedCurve(curves[1], curve0),
        function (pathArray) {
            // need converting to path string?
            return pathArray;
        },
    ];
}

/**
 * @see https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute/points
 *
 * @example
 * points="100,10 250,150 200,110"
 */
function parsePoints(pointsOrStr, object) {
    var points;
    if (isString(pointsOrStr)) {
        points = pointsOrStr.split(' ').map(function (pointStr) {
            var _a = __read(pointStr.split(','), 2), x = _a[0], y = _a[1];
            return [Number(x), Number(y)];
        });
    }
    else {
        points = pointsOrStr;
    }
    var segments = [];
    var tempLength = 0;
    var segmentT;
    var segmentL;
    var totalLength = polylineLength(points);
    points.forEach(function (p, i) {
        if (points[i + 1]) {
            segmentT = [0, 0];
            segmentT[0] = tempLength / totalLength;
            segmentL = lineLength(p[0], p[1], points[i + 1][0], points[i + 1][1]);
            tempLength += segmentL;
            segmentT[1] = tempLength / totalLength;
            segments.push(segmentT);
        }
    });
    var minX = Math.min.apply(Math, __spreadArray([], __read(points.map(function (point) { return point[0]; })), false));
    var minY = Math.min.apply(Math, __spreadArray([], __read(points.map(function (point) { return point[1]; })), false));
    if (object) {
        object.parsedStyle.defX = minX;
        object.parsedStyle.defY = minY;
    }
    return {
        points: points,
        totalLength: totalLength,
        segments: segments,
    };
}
function mergePoints(left, right) {
    return [
        left.points,
        right.points,
        function (points) {
            return points;
        },
    ];
}

var _ = null;
function cast(pattern) {
    return function (contents) {
        var i = 0;
        return pattern.map(function (x) {
            return x === _ ? contents[i++] : x;
        });
    };
}
function id(x) {
    return x;
}
// type: [argTypes, convertTo3D, convertTo2D]
// In the argument types string, lowercase characters represent optional arguments
var transformFunctions = {
    // @ts-ignore
    matrix: ['NNNNNN', [_, _, 0, 0, _, _, 0, 0, 0, 0, 1, 0, _, _, 0, 1], id],
    matrix3d: ['NNNNNNNNNNNNNNNN', id],
    rotate: ['A'],
    rotatex: ['A'],
    rotatey: ['A'],
    rotatez: ['A'],
    rotate3d: ['NNNA'],
    perspective: ['L'],
    scale: ['Nn', cast([_, _, new CSSUnitValue(1)]), id],
    scalex: [
        'N',
        cast([_, new CSSUnitValue(1), new CSSUnitValue(1)]),
        cast([_, new CSSUnitValue(1)]),
    ],
    scaley: [
        'N',
        cast([new CSSUnitValue(1), _, new CSSUnitValue(1)]),
        cast([new CSSUnitValue(1), _]),
    ],
    scalez: ['N', cast([new CSSUnitValue(1), new CSSUnitValue(1), _])],
    scale3d: ['NNN', id],
    skew: ['Aa', null, id],
    skewx: ['A', null, cast([_, Odeg])],
    skewy: ['A', null, cast([Odeg, _])],
    translate: ['Tt', cast([_, _, Opx]), id],
    translatex: ['T', cast([_, Opx, Opx]), cast([_, Opx])],
    translatey: ['T', cast([Opx, _, Opx]), cast([Opx, _])],
    translatez: ['L', cast([Opx, Opx, _])],
    translate3d: ['TTL', id],
};
/**
 * none
 * scale(1) scale(1, 2)
 * scaleX(1)
 */
function parseTransform(string) {
    string = (string || 'none').toLowerCase().trim();
    if (string === 'none') {
        return [];
    }
    var transformRegExp = /\s*(\w+)\(([^)]*)\)/g;
    var result = [];
    var match;
    var prevLastIndex = 0;
    while ((match = transformRegExp.exec(string))) {
        if (match.index !== prevLastIndex) {
            return [];
        }
        prevLastIndex = match.index + match[0].length;
        var functionName = match[1]; // scale
        var functionData = transformFunctions[functionName]; // scale(1, 2)
        if (!functionData) {
            // invalid, eg. scale()
            return [];
        }
        var args = match[2].split(','); // 1,2
        var argTypes = functionData[0]; // Nn
        if (argTypes.length < args.length) {
            // scale(N, n)
            return [];
        }
        var parsedArgs = [];
        for (var i = 0; i < argTypes.length; i++) {
            var arg = args[i];
            var type = argTypes[i];
            var parsedArg = void 0;
            if (!arg) {
                // @ts-ignore
                parsedArg = {
                    a: Odeg,
                    n: parsedArgs[0],
                    t: Opx,
                }[type];
            }
            else {
                // @ts-ignore
                parsedArg = {
                    A: function (s) {
                        return s.trim() === '0' ? Odeg : parseAngle(s);
                    },
                    N: parseNumber,
                    T: parseLengthOrPercentage,
                    L: parseLength,
                }[type.toUpperCase()](arg);
            }
            if (parsedArg === undefined) {
                return [];
            }
            parsedArgs.push(parsedArg);
        }
        result.push({ t: functionName, d: parsedArgs }); // { t: scale, d: [1, 2] }
        if (transformRegExp.lastIndex === string.length) {
            return result;
        }
    }
    return [];
}
function convertItemToMatrix(item) {
    var x;
    var y;
    var z;
    var angle;
    switch (item.t) {
        case 'rotatex':
            angle = deg2rad(convertAngleUnit(item.d[0]));
            return [
                1,
                0,
                0,
                0,
                0,
                Math.cos(angle),
                Math.sin(angle),
                0,
                0,
                -Math.sin(angle),
                Math.cos(angle),
                0,
                0,
                0,
                0,
                1,
            ];
        case 'rotatey':
            angle = deg2rad(convertAngleUnit(item.d[0]));
            return [
                Math.cos(angle),
                0,
                -Math.sin(angle),
                0,
                0,
                1,
                0,
                0,
                Math.sin(angle),
                0,
                Math.cos(angle),
                0,
                0,
                0,
                0,
                1,
            ];
        case 'rotate':
        case 'rotatez':
            angle = deg2rad(convertAngleUnit(item.d[0]));
            return [
                Math.cos(angle),
                Math.sin(angle),
                0,
                0,
                -Math.sin(angle),
                Math.cos(angle),
                0,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                0,
                1,
            ];
        case 'rotate3d':
            x = item.d[0].value;
            y = item.d[1].value;
            z = item.d[2].value;
            angle = deg2rad(convertAngleUnit(item.d[3]));
            var sqrLength = x * x + y * y + z * z;
            if (sqrLength === 0) {
                x = 1;
                y = 0;
                z = 0;
            }
            else if (sqrLength !== 1) {
                var length_1 = Math.sqrt(sqrLength);
                x /= length_1;
                y /= length_1;
                z /= length_1;
            }
            var s = Math.sin(angle / 2);
            var sc = s * Math.cos(angle / 2);
            var sq = s * s;
            return [
                1 - 2 * (y * y + z * z) * sq,
                2 * (x * y * sq + z * sc),
                2 * (x * z * sq - y * sc),
                0,
                2 * (x * y * sq - z * sc),
                1 - 2 * (x * x + z * z) * sq,
                2 * (y * z * sq + x * sc),
                0,
                2 * (x * z * sq + y * sc),
                2 * (y * z * sq - x * sc),
                1 - 2 * (x * x + y * y) * sq,
                0,
                0,
                0,
                0,
                1,
            ];
        case 'scale':
            return [
                item.d[0].value,
                0,
                0,
                0,
                0,
                item.d[1].value,
                0,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                0,
                1,
            ];
        case 'scalex':
            return [item.d[0].value, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        case 'scaley':
            return [1, 0, 0, 0, 0, item.d[0].value, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        case 'scalez':
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, item.d[0].value, 0, 0, 0, 0, 1];
        case 'scale3d':
            return [
                item.d[0].value,
                0,
                0,
                0,
                0,
                item.d[1].value,
                0,
                0,
                0,
                0,
                item.d[2].value,
                0,
                0,
                0,
                0,
                1,
            ];
        case 'skew':
            var xAngle = deg2rad(convertAngleUnit(item.d[0]));
            var yAngle = deg2rad(convertAngleUnit(item.d[1]));
            return [
                1,
                Math.tan(yAngle),
                0,
                0,
                Math.tan(xAngle),
                1,
                0,
                0,
                0,
                0,
                1,
                0,
                0,
                0,
                0,
                1,
            ];
        case 'skewx':
            angle = deg2rad(convertAngleUnit(item.d[0]));
            return [1, 0, 0, 0, Math.tan(angle), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        case 'skewy':
            angle = deg2rad(convertAngleUnit(item.d[0]));
            return [1, Math.tan(angle), 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        case 'translate':
            // TODO: pass target
            x = convertPercentUnit(item.d[0], 0, null) || 0;
            y = convertPercentUnit(item.d[1], 0, null) || 0;
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, 0, 1];
        case 'translatex':
            x = convertPercentUnit(item.d[0], 0, null) || 0;
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, 0, 0, 1];
        case 'translatey':
            y = convertPercentUnit(item.d[0], 0, null) || 0;
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, y, 0, 1];
        case 'translatez':
            z = convertPercentUnit(item.d[0], 0, null) || 0;
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, z, 1];
        case 'translate3d':
            x = convertPercentUnit(item.d[0], 0, null) || 0;
            y = convertPercentUnit(item.d[1], 0, null) || 0;
            z = convertPercentUnit(item.d[2], 0, null) || 0;
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
        case 'perspective':
            var t = convertPercentUnit(item.d[0], 0, null) || 0;
            var p = t ? -1 / t : 0;
            return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, p, 0, 0, 0, 1];
        case 'matrix':
            return [
                item.d[0].value,
                item.d[1].value,
                0,
                0,
                item.d[2].value,
                item.d[3].value,
                0,
                0,
                0,
                0,
                1,
                0,
                item.d[4].value,
                item.d[5].value,
                0,
                1,
            ];
        case 'matrix3d':
            return item.d.map(function (d) { return d.value; });
    }
}
function multiplyMatrices(a, b) {
    return [
        a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3],
        a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3],
        a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3],
        a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3],
        a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7],
        a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7],
        a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7],
        a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7],
        a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11],
        a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11],
        a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11],
        a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11],
        a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15],
        a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15],
        a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15],
        a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15],
    ];
}
function convertToMatrix(transformList) {
    if (transformList.length === 0) {
        return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }
    return transformList.map(convertItemToMatrix).reduce(multiplyMatrices);
}
function makeMatrixDecomposition(transformList) {
    var translate = [0, 0, 0];
    var scale = [1, 1, 1];
    var skew = [0, 0, 0];
    var perspective = [0, 0, 0, 1];
    var quaternion = [0, 0, 0, 1];
    decomposeMat4(
    // @ts-ignore
    convertToMatrix(transformList), translate, scale, skew, perspective, quaternion);
    return [[translate, scale, skew, quaternion, perspective]];
}
var composeMatrix = (function () {
    function multiply(a, b) {
        var result = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                for (var k = 0; k < 4; k++) {
                    result[i][j] += b[i][k] * a[k][j];
                }
            }
        }
        return result;
    }
    function is2D(m) {
        return (m[0][2] == 0 &&
            m[0][3] == 0 &&
            m[1][2] == 0 &&
            m[1][3] == 0 &&
            m[2][0] == 0 &&
            m[2][1] == 0 &&
            m[2][2] == 1 &&
            m[2][3] == 0 &&
            m[3][2] == 0 &&
            m[3][3] == 1);
    }
    function composeMatrix(translate, scale, skew, quat, perspective) {
        var matrix = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];
        for (var i = 0; i < 4; i++) {
            matrix[i][3] = perspective[i];
        }
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                matrix[3][i] += translate[j] * matrix[j][i];
            }
        }
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
        var rotMatrix = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];
        rotMatrix[0][0] = 1 - 2 * (y * y + z * z);
        rotMatrix[0][1] = 2 * (x * y - z * w);
        rotMatrix[0][2] = 2 * (x * z + y * w);
        rotMatrix[1][0] = 2 * (x * y + z * w);
        rotMatrix[1][1] = 1 - 2 * (x * x + z * z);
        rotMatrix[1][2] = 2 * (y * z - x * w);
        rotMatrix[2][0] = 2 * (x * z - y * w);
        rotMatrix[2][1] = 2 * (y * z + x * w);
        rotMatrix[2][2] = 1 - 2 * (x * x + y * y);
        matrix = multiply(matrix, rotMatrix);
        var temp = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];
        if (skew[2]) {
            temp[2][1] = skew[2];
            matrix = multiply(matrix, temp);
        }
        if (skew[1]) {
            temp[2][1] = 0;
            temp[2][0] = skew[0];
            matrix = multiply(matrix, temp);
        }
        if (skew[0]) {
            temp[2][0] = 0;
            temp[1][0] = skew[0];
            matrix = multiply(matrix, temp);
        }
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                matrix[i][j] *= scale[i];
            }
        }
        if (is2D(matrix)) {
            return [
                matrix[0][0],
                matrix[0][1],
                matrix[1][0],
                matrix[1][1],
                matrix[3][0],
                matrix[3][1],
            ];
        }
        return matrix[0].concat(matrix[1], matrix[2], matrix[3]);
    }
    return composeMatrix;
})();
function numberToLongString(x) {
    return x.toFixed(6).replace('.000000', '');
}
function mergeMatrices(left, right) {
    var leftArgs;
    var rightArgs;
    // @ts-ignore
    if (left.decompositionPair !== right) {
        // @ts-ignore
        left.decompositionPair = right;
        // @ts-ignore
        leftArgs = makeMatrixDecomposition(left);
    }
    // @ts-ignore
    if (right.decompositionPair !== left) {
        // @ts-ignore
        right.decompositionPair = left;
        // @ts-ignore
        rightArgs = makeMatrixDecomposition(right);
    }
    if (leftArgs[0] === null || rightArgs[0] === null)
        return [
            // @ts-ignore
            [false],
            // @ts-ignore
            [true],
            // @ts-ignore
            function (x) {
                return x ? right[0].d : left[0].d;
            },
        ];
    leftArgs[0].push(0);
    rightArgs[0].push(1);
    return [
        leftArgs,
        rightArgs,
        // @ts-ignore
        function (list) {
            // @ts-ignore
            var q = quat(leftArgs[0][3], rightArgs[0][3], list[5]);
            var mat = composeMatrix(list[0], list[1], list[2], q, list[4]);
            var stringifiedArgs = mat.map(numberToLongString).join(',');
            return stringifiedArgs;
        },
    ];
}
function dot(v1, v2) {
    var result = 0;
    for (var i = 0; i < v1.length; i++) {
        result += v1[i] * v2[i];
    }
    return result;
}
function quat(fromQ, toQ, f) {
    var product = dot(fromQ, toQ);
    product = clamp(product, -1.0, 1.0);
    var quat = [];
    if (product === 1.0) {
        quat = fromQ;
    }
    else {
        var theta = Math.acos(product);
        var w = (Math.sin(f * theta) * 1) / Math.sqrt(1 - product * product);
        for (var i = 0; i < 4; i++) {
            quat.push(fromQ[i] * (Math.cos(f * theta) - product * w) + toQ[i] * w);
        }
    }
    return quat;
}
// scalex/y/z -> scale
function typeTo2D(type) {
    return type.replace(/[xy]/, '');
}
// scalex/y/z -> scale3d
function typeTo3D(type) {
    return type.replace(/(x|y|z|3d)?$/, '3d');
}
var isMatrixOrPerspective = function (lt, rt) {
    return ((lt === 'perspective' && rt === 'perspective') ||
        ((lt === 'matrix' || lt === 'matrix3d') &&
            (rt === 'matrix' || rt === 'matrix3d')));
};
function mergeTransforms(left, right, target) {
    var flipResults = false;
    // padding empty transform, eg. merge 'scale(10)' with 'none' -> scale(1)
    if (!left.length || !right.length) {
        if (!left.length) {
            flipResults = true;
            left = right;
            right = [];
        }
        var _loop_1 = function (i) {
            var _a = left[i], type = _a.t, args = _a.d;
            // none -> scale(1)/translateX(0)
            var defaultValue = type.substring(0, 5) === 'scale' ? 1 : 0;
            right.push({
                t: type,
                d: args.map(function (arg) {
                    if (typeof arg === 'number') {
                        return getOrCreateUnitValue(defaultValue);
                    }
                    return getOrCreateUnitValue(defaultValue, arg.unit);
                    //   {
                    //     unit: arg.unit,
                    //     value: defaultValue,
                    //   };
                }),
            });
        };
        for (var i = 0; i < left.length; i++) {
            _loop_1(i);
        }
    }
    var leftResult = [];
    var rightResult = [];
    var types = [];
    // merge matrix() with matrix3d()
    if (left.length !== right.length) {
        var merged = mergeMatrices(left, right);
        // @ts-ignore
        leftResult = [merged[0]];
        // @ts-ignore
        rightResult = [merged[1]];
        types = [['matrix', [merged[2]]]];
    }
    else {
        for (var i = 0; i < left.length; i++) {
            var leftType = left[i].t;
            var rightType = right[i].t;
            var leftArgs = left[i].d;
            var rightArgs = right[i].d;
            var leftFunctionData = transformFunctions[leftType];
            var rightFunctionData = transformFunctions[rightType];
            var type = void 0;
            if (isMatrixOrPerspective(leftType, rightType)) {
                var merged = mergeMatrices([left[i]], [right[i]]);
                // @ts-ignore
                leftResult.push(merged[0]);
                // @ts-ignore
                rightResult.push(merged[1]);
                types.push(['matrix', [merged[2]]]);
                continue;
            }
            else if (leftType === rightType) {
                type = leftType;
            }
            else if (leftFunctionData[2] &&
                rightFunctionData[2] &&
                typeTo2D(leftType) === typeTo2D(rightType)) {
                type = typeTo2D(leftType);
                // @ts-ignore
                leftArgs = leftFunctionData[2](leftArgs);
                // @ts-ignore
                rightArgs = rightFunctionData[2](rightArgs);
            }
            else if (leftFunctionData[1] &&
                rightFunctionData[1] &&
                typeTo3D(leftType) === typeTo3D(rightType)) {
                type = typeTo3D(leftType);
                // @ts-ignore
                leftArgs = leftFunctionData[1](leftArgs);
                // @ts-ignore
                rightArgs = rightFunctionData[1](rightArgs);
            }
            else {
                var merged = mergeMatrices(left, right);
                // @ts-ignore
                leftResult = [merged[0]];
                // @ts-ignore
                rightResult = [merged[1]];
                types = [['matrix', [merged[2]]]];
                break;
            }
            var leftArgsCopy = [];
            var rightArgsCopy = [];
            var stringConversions = [];
            for (var j = 0; j < leftArgs.length; j++) {
                // const merge = leftArgs[j].unit === UnitType.kNumber ? mergeDimensions : mergeDimensions;
                var merged = mergeDimensions(leftArgs[j], rightArgs[j], target, false, j);
                leftArgsCopy[j] = merged[0];
                rightArgsCopy[j] = merged[1];
                stringConversions.push(merged[2]);
            }
            leftResult.push(leftArgsCopy);
            rightResult.push(rightArgsCopy);
            types.push([type, stringConversions]);
        }
    }
    if (flipResults) {
        var tmp = leftResult;
        leftResult = rightResult;
        rightResult = tmp;
    }
    return [
        leftResult,
        rightResult,
        function (list) {
            return list
                .map(function (args, i) {
                var stringifiedArgs = args
                    .map(function (arg, j) {
                    return types[i][1][j](arg);
                })
                    .join(',');
                if (types[i][0] === 'matrix' &&
                    stringifiedArgs.split(',').length === 16) {
                    types[i][0] = 'matrix3d';
                }
                if (types[i][0] === 'matrix3d' &&
                    stringifiedArgs.split(',').length === 6) {
                    types[i][0] = 'matrix';
                }
                return types[i][0] + '(' + stringifiedArgs + ')';
            })
                .join(' ');
        },
    ];
}

/**
 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/transform-origin
 * eg. 'center' 'top left' '50px 50px'
 */
var parseTransformOrigin = memoize(function (value) {
    if (isString(value)) {
        if (value === 'text-anchor') {
            return [getOrCreateUnitValue(0, 'px'), getOrCreateUnitValue(0, 'px')];
        }
        var values = value.split(' ');
        if (values.length === 1) {
            if (values[0] === 'top' || values[0] === 'bottom') {
                // 'top' -> 'center top'
                values[1] = values[0];
                values[0] = 'center';
            }
            else {
                // '50px' -> '50px center'
                values[1] = 'center';
            }
        }
        if (values.length !== 2) {
            return null;
        }
        // eg. center bottom
        return [
            parseLengthOrPercentage(convertKeyword2Percent(values[0])),
            parseLengthOrPercentage(convertKeyword2Percent(values[1])),
        ];
    }
    else {
        return [
            getOrCreateUnitValue(value[0] || 0, 'px'),
            getOrCreateUnitValue(value[1] || 0, 'px'),
        ];
    }
});
function convertKeyword2Percent(keyword) {
    if (keyword === 'center') {
        return '50%';
    }
    else if (keyword === 'left' || keyword === 'top') {
        return '0';
    }
    else if (keyword === 'right' || keyword === 'bottom') {
        return '100%';
    }
    return keyword;
}

/**
 * Blink used them in code generation(css_properties.json5)
 */
var BUILT_IN_PROPERTIES = [
    {
        /**
         * used in CSS Layout API
         * eg. `display: 'flex'`
         */
        n: 'display',
        k: ['none'],
    },
    {
        /**
         * range [0.0, 1.0]
         * @see https://developer.mozilla.org/en-US/docs/Web/CSS/opacity
         */
        n: 'opacity',
        int: true,
        inh: true,
        d: '1',
        syntax: PropertySyntax.OPACITY_VALUE,
    },
    {
        /**
         * inheritable, range [0.0, 1.0]
         * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-opacity
         * @see https://svgwg.org/svg2-draft/painting.html#FillOpacity
         */
        n: 'fillOpacity',
        int: true,
        inh: true,
        d: '1',
        syntax: PropertySyntax.OPACITY_VALUE,
    },
    {
        /**
         * inheritable, range [0.0, 1.0]
         * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-opacity
         * @see https://svgwg.org/svg2-draft/painting.html#StrokeOpacity
         */
        n: 'strokeOpacity',
        int: true,
        inh: true,
        d: '1',
        syntax: PropertySyntax.OPACITY_VALUE,
    },
    {
        /**
         * background-color is not inheritable
         * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Fills_and_Strokes
         */
        n: 'fill',
        int: true,
        k: ['none'],
        d: 'none',
        syntax: PropertySyntax.PAINT,
    },
    {
        n: 'fillRule',
        k: ['nonzero', 'evenodd'],
        d: 'nonzero',
    },
    /**
     * default to none
     * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke#usage_notes
     */
    {
        n: 'stroke',
        int: true,
        k: ['none'],
        d: 'none',
        syntax: PropertySyntax.PAINT,
        /**
         * Stroke 'none' won't affect geometry but others will.
         */
        l: true,
    },
    {
        n: 'shadowType',
        k: ['inner', 'outer', 'both'],
        d: 'outer',
        l: true,
    },
    {
        n: 'shadowColor',
        int: true,
        syntax: PropertySyntax.COLOR,
    },
    {
        n: 'shadowOffsetX',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'shadowOffsetY',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'shadowBlur',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.SHADOW_BLUR,
    },
    {
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-width
         */
        n: 'lineWidth',
        int: true,
        inh: true,
        d: '1',
        l: true,
        a: ['strokeWidth'],
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'increasedLineWidthForHitTesting',
        inh: true,
        d: '0',
        l: true,
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'lineJoin',
        inh: true,
        l: true,
        a: ['strokeLinejoin'],
        k: ['miter', 'bevel', 'round'],
        d: 'miter',
    },
    {
        n: 'lineCap',
        inh: true,
        l: true,
        a: ['strokeLinecap'],
        k: ['butt', 'round', 'square'],
        d: 'butt',
    },
    {
        n: 'lineDash',
        int: true,
        inh: true,
        k: ['none'],
        a: ['strokeDasharray'],
        syntax: PropertySyntax.LENGTH_PERCENTAGE_12,
    },
    {
        n: 'lineDashOffset',
        int: true,
        inh: true,
        d: '0',
        a: ['strokeDashoffset'],
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'offsetPath',
        syntax: PropertySyntax.DEFINED_PATH,
    },
    {
        n: 'offsetDistance',
        int: true,
        syntax: PropertySyntax.OFFSET_DISTANCE,
    },
    {
        n: 'dx',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'dy',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'zIndex',
        ind: true,
        int: true,
        d: '0',
        k: ['auto'],
        syntax: PropertySyntax.Z_INDEX,
    },
    {
        n: 'visibility',
        k: ['visible', 'hidden'],
        ind: true,
        inh: true,
        /**
         * support interpolation
         * @see https://developer.mozilla.org/en-US/docs/Web/CSS/visibility#interpolation
         */
        int: true,
        d: 'visible',
    },
    {
        n: 'pointerEvents',
        inh: true,
        k: [
            'none',
            'auto',
            'stroke',
            'fill',
            'painted',
            'visible',
            'visiblestroke',
            'visiblefill',
            'visiblepainted',
            // 'bounding-box',
            'all',
        ],
        d: 'auto',
    },
    {
        n: 'filter',
        ind: true,
        l: true,
        k: ['none'],
        d: 'none',
        syntax: PropertySyntax.FILTER,
    },
    {
        n: 'clipPath',
        syntax: PropertySyntax.DEFINED_PATH,
    },
    {
        n: 'textPath',
        syntax: PropertySyntax.DEFINED_PATH,
    },
    {
        n: 'textPathSide',
        k: ['left', 'right'],
        d: 'left',
    },
    {
        n: 'textPathStartOffset',
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'transform',
        p: 100,
        int: true,
        k: ['none'],
        d: 'none',
        syntax: PropertySyntax.TRANSFORM,
    },
    {
        n: 'transformOrigin',
        p: 100,
        // int: true,
        d: function (nodeName) {
            if (nodeName === Shape.CIRCLE || nodeName === Shape.ELLIPSE) {
                return 'center';
            }
            if (nodeName === Shape.TEXT) {
                return 'text-anchor';
            }
            return 'left top';
        },
        l: true,
        syntax: PropertySyntax.TRANSFORM_ORIGIN,
    },
    {
        n: 'anchor',
        p: 99,
        d: function (nodeName) {
            if (nodeName === Shape.CIRCLE || nodeName === Shape.ELLIPSE) {
                return '0.5 0.5';
            }
            return '0 0';
        },
        l: true,
        syntax: PropertySyntax.LENGTH_PERCENTAGE_12,
    },
    // <circle> & <ellipse>
    {
        n: 'cx',
        int: true,
        d: '0',
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'cy',
        int: true,
        d: '0',
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'cz',
        int: true,
        d: '0',
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'r',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'rx',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'ry',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    // Rect Image Group
    {
        // x in local space
        n: 'x',
        int: true,
        d: '0',
        syntax: PropertySyntax.COORDINATE,
    },
    {
        // y in local space
        n: 'y',
        int: true,
        d: '0',
        syntax: PropertySyntax.COORDINATE,
    },
    {
        // z in local space
        n: 'z',
        int: true,
        d: '0',
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'width',
        int: true,
        l: true,
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/width
         */
        k: ['auto', 'fit-content', 'min-content', 'max-content'],
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'height',
        int: true,
        l: true,
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/height
         */
        k: ['auto', 'fit-content', 'min-content', 'max-content'],
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'radius',
        int: true,
        l: true,
        d: '0',
        syntax: PropertySyntax.LENGTH_PERCENTAGE_14,
    },
    // Line
    {
        n: 'x1',
        int: true,
        l: true,
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'y1',
        int: true,
        l: true,
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'z1',
        int: true,
        l: true,
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'x2',
        int: true,
        l: true,
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'y2',
        int: true,
        l: true,
        syntax: PropertySyntax.COORDINATE,
    },
    {
        n: 'z2',
        int: true,
        l: true,
        syntax: PropertySyntax.COORDINATE,
    },
    // Path
    {
        n: 'path',
        int: true,
        l: true,
        d: '',
        a: ['d'],
        syntax: PropertySyntax.PATH,
        p: 50,
    },
    // Polyline & Polygon
    {
        n: 'points',
        /**
         * support interpolation
         */
        int: true,
        l: true,
        syntax: PropertySyntax.LIST_OF_POINTS,
        p: 50,
    },
    // Text
    {
        n: 'text',
        l: true,
        d: '',
        syntax: PropertySyntax.TEXT,
        p: 50,
    },
    {
        n: 'textTransform',
        l: true,
        inh: true,
        k: ['capitalize', 'uppercase', 'lowercase', 'none'],
        d: 'none',
        syntax: PropertySyntax.TEXT_TRANSFORM,
        p: 51, // it must get parsed after text
    },
    {
        n: 'font',
        l: true,
    },
    {
        n: 'fontSize',
        int: true,
        inh: true,
        /**
         * @see https://www.w3schools.com/css/css_font_size.asp
         */
        d: '16px',
        l: true,
        syntax: PropertySyntax.LENGTH_PERCENTAGE,
    },
    {
        n: 'fontFamily',
        l: true,
        inh: true,
        d: 'sans-serif',
    },
    {
        n: 'fontStyle',
        l: true,
        inh: true,
        k: ['normal', 'italic', 'oblique'],
        d: 'normal',
    },
    {
        n: 'fontWeight',
        l: true,
        inh: true,
        k: ['normal', 'bold', 'bolder', 'lighter'],
        d: 'normal',
    },
    {
        n: 'fontVariant',
        l: true,
        inh: true,
        k: ['normal', 'small-caps'],
        d: 'normal',
    },
    {
        n: 'lineHeight',
        l: true,
        syntax: PropertySyntax.LENGTH,
        int: true,
        d: '0',
    },
    {
        n: 'letterSpacing',
        l: true,
        syntax: PropertySyntax.LENGTH,
        int: true,
        d: '0',
    },
    {
        n: 'miterLimit',
        l: true,
        syntax: PropertySyntax.NUMBER,
        d: function (nodeName) {
            if (nodeName === Shape.PATH ||
                nodeName === Shape.POLYGON ||
                nodeName === Shape.POLYLINE) {
                return '4';
            }
            return '10';
        },
    },
    {
        n: 'wordWrap',
        l: true,
    },
    {
        n: 'wordWrapWidth',
        l: true,
    },
    {
        n: 'maxLines',
        l: true,
    },
    {
        n: 'textOverflow',
        l: true,
        d: 'clip',
    },
    {
        n: 'leading',
        l: true,
    },
    {
        n: 'textBaseline',
        l: true,
        inh: true,
        k: ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'],
        d: 'alphabetic',
    },
    {
        n: 'textAlign',
        l: true,
        inh: true,
        k: ['start', 'center', 'middle', 'end', 'left', 'right'],
        d: 'start',
    },
    // {
    //   n: 'whiteSpace',
    //   l: true,
    // },
    {
        n: 'markerStart',
        syntax: PropertySyntax.MARKER,
    },
    {
        n: 'markerEnd',
        syntax: PropertySyntax.MARKER,
    },
    {
        n: 'markerMid',
        syntax: PropertySyntax.MARKER,
    },
    {
        n: 'markerStartOffset',
        syntax: PropertySyntax.LENGTH,
        l: true,
        int: true,
        d: '0',
    },
    {
        n: 'markerEndOffset',
        syntax: PropertySyntax.LENGTH,
        l: true,
        int: true,
        d: '0',
    },
];
var GEOMETRY_ATTRIBUTE_NAMES = BUILT_IN_PROPERTIES.filter(function (n) { return !!n.l; }).map(function (n) { return n.n; });
var propertyMetadataCache = {};
var unresolvedProperties = new WeakMap();
// const uniqueAttributeSet = new Set<string>();
// const tmpVec3a = vec3.create();
// const tmpVec3b = vec3.create();
// const tmpVec3c = vec3.create();
var isPropertyResolved = function (object, name) {
    var properties = unresolvedProperties.get(object);
    if (!properties || properties.length === 0) {
        return true;
    }
    return properties.includes(name);
};
var DefaultStyleValueRegistry = /** @class */ (function () {
    /**
     * need recalc later
     */
    // dirty = false;
    function DefaultStyleValueRegistry(runtime) {
        var _this = this;
        this.runtime = runtime;
        BUILT_IN_PROPERTIES.forEach(function (property) {
            _this.registerMetadata(property);
        });
    }
    DefaultStyleValueRegistry.prototype.registerMetadata = function (metadata) {
        __spreadArray([metadata.n], __read((metadata.a || [])), false).forEach(function (name) {
            propertyMetadataCache[name] = metadata;
        });
    };
    DefaultStyleValueRegistry.prototype.unregisterMetadata = function (name) {
        delete propertyMetadataCache[name];
    };
    DefaultStyleValueRegistry.prototype.getPropertySyntax = function (syntax) {
        return this.runtime.CSSPropertySyntaxFactory[syntax];
    };
    /**
     * * parse value, eg.
     * fill: 'red' => CSSRGB
     * translateX: '10px' => CSSUnitValue { unit: 'px', value: 10 }
     * fontSize: '2em' => { unit: 'px', value: 32 }
     *
     * * calculate used value
     * * post process
     */
    DefaultStyleValueRegistry.prototype.processProperties = function (object, attributes, options) {
        var _this = this;
        if (options === void 0) { options = {
            skipUpdateAttribute: false,
            skipParse: false,
            forceUpdateGeometry: false,
            usedAttributes: [],
        }; }
        if (!this.runtime.enableCSSParsing) {
            Object.assign(object.attributes, attributes);
            var attributeNames_1 = Object.keys(attributes);
            // clipPath
            var oldClipPath = object.parsedStyle.clipPath;
            var oldOffsetPath = object.parsedStyle.offsetPath;
            object.parsedStyle = Object.assign(object.parsedStyle, attributes);
            var needUpdateGeometry_1 = !!options.forceUpdateGeometry;
            if (!needUpdateGeometry_1) {
                for (var i = 0; i < GEOMETRY_ATTRIBUTE_NAMES.length; i++) {
                    if (GEOMETRY_ATTRIBUTE_NAMES[i] in attributes) {
                        needUpdateGeometry_1 = true;
                        break;
                    }
                }
            }
            if (attributes.fill) {
                object.parsedStyle.fill = parseColor(attributes.fill);
            }
            if (attributes.stroke) {
                object.parsedStyle.stroke = parseColor(attributes.stroke);
            }
            if (attributes.shadowColor) {
                object.parsedStyle.shadowColor = parseColor(attributes.shadowColor);
            }
            if (attributes.filter) {
                object.parsedStyle.filter = parseFilter(attributes.filter);
            }
            // Rect
            // @ts-ignore
            if (!isNil(attributes.radius)) {
                // @ts-ignore
                object.parsedStyle.radius = parseDimensionArrayFormat(
                // @ts-ignore
                attributes.radius, 4);
            }
            // Polyline
            if (!isNil(attributes.lineDash)) {
                object.parsedStyle.lineDash = parseDimensionArrayFormat(attributes.lineDash, 2);
            }
            // @ts-ignore
            if (attributes.points) {
                // @ts-ignore
                object.parsedStyle.points = parsePoints(attributes.points, object);
            }
            // Path
            // @ts-ignore
            if (attributes.path === '') {
                object.parsedStyle.path = __assign({}, EMPTY_PARSED_PATH);
            }
            // @ts-ignore
            if (attributes.path) {
                object.parsedStyle.path = parsePath(
                // @ts-ignore
                attributes.path);
                object.parsedStyle.defX = object.parsedStyle.path.rect.x;
                object.parsedStyle.defY = object.parsedStyle.path.rect.y;
            }
            // Text
            if (attributes.textTransform) {
                this.runtime.CSSPropertySyntaxFactory['<text-transform>'].calculator(null, null, { value: attributes.textTransform }, object, null);
            }
            if (attributes.clipPath) {
                this.runtime.CSSPropertySyntaxFactory['<defined-path>'].calculator('clipPath', oldClipPath, attributes.clipPath, object, this.runtime);
            }
            if (attributes.offsetPath) {
                this.runtime.CSSPropertySyntaxFactory['<defined-path>'].calculator('offsetPath', oldOffsetPath, attributes.offsetPath, object, this.runtime);
            }
            if (attributes.anchor) {
                object.parsedStyle.anchor = parseDimensionArrayFormat(
                // @ts-ignorex
                attributes.anchor, 2);
            }
            if (attributes.transform) {
                object.parsedStyle.transform = parseTransform(attributes.transform);
            }
            if (attributes.transformOrigin) {
                object.parsedStyle.transformOrigin = parseTransformOrigin(attributes.transformOrigin);
            }
            // Marker
            // @ts-ignore
            if (attributes.markerStart) {
                object.parsedStyle.markerStart = this.runtime.CSSPropertySyntaxFactory['<marker>'].calculator(null, 
                // @ts-ignore
                attributes.markerStart, 
                // @ts-ignore
                attributes.markerStart, null, null);
            }
            // @ts-ignore
            if (attributes.markerEnd) {
                object.parsedStyle.markerEnd = this.runtime.CSSPropertySyntaxFactory['<marker>'].calculator(null, 
                // @ts-ignore
                attributes.markerEnd, 
                // @ts-ignore
                attributes.markerEnd, null, null);
            }
            // @ts-ignore
            if (attributes.markerMid) {
                object.parsedStyle.markerMid = this.runtime.CSSPropertySyntaxFactory['<marker>'].calculator('', 
                // @ts-ignore
                attributes.markerMid, 
                // @ts-ignore
                attributes.markerMid, null, null);
            }
            if (
            // Circle & Ellipse
            ((object.nodeName === Shape.CIRCLE ||
                object.nodeName === Shape.ELLIPSE) &&
                // @ts-ignore
                (!isNil(attributes.cx) ||
                    // @ts-ignore
                    !isNil(attributes.cy))) ||
                ((object.nodeName === Shape.RECT ||
                    object.nodeName === Shape.IMAGE ||
                    object.nodeName === Shape.GROUP ||
                    object.nodeName === Shape.HTML ||
                    object.nodeName === Shape.TEXT ||
                    object.nodeName === Shape.MESH) &&
                    // @ts-ignore
                    (!isNil(attributes.x) ||
                        // @ts-ignore
                        !isNil(attributes.y) ||
                        // @ts-ignore
                        !isNil(attributes.z))) ||
                // Line
                (object.nodeName === Shape.LINE &&
                    // @ts-ignore
                    (!isNil(attributes.x1) ||
                        // @ts-ignore
                        !isNil(attributes.y1) ||
                        // @ts-ignore
                        !isNil(attributes.z1) ||
                        // @ts-ignore
                        !isNil(attributes.x2) ||
                        // @ts-ignore
                        !isNil(attributes.y2) ||
                        // @ts-ignore
                        !isNil(attributes.z2)))) {
                this.runtime.CSSPropertySyntaxFactory['<coordinate>'].postProcessor(object, attributeNames_1);
            }
            if (!isNil(attributes.zIndex)) {
                this.runtime.CSSPropertySyntaxFactory['<z-index>'].postProcessor(object, attributeNames_1);
            }
            // @ts-ignore
            if (attributes.path) {
                this.runtime.CSSPropertySyntaxFactory['<path>'].postProcessor(object, attributeNames_1);
            }
            // @ts-ignore
            if (attributes.points) {
                this.runtime.CSSPropertySyntaxFactory['<list-of-points>'].postProcessor(object, attributeNames_1);
            }
            if (!isNil(attributes.offsetDistance)) {
                this.runtime.CSSPropertySyntaxFactory['<offset-distance>'].postProcessor(object, attributeNames_1);
            }
            if (attributes.transform) {
                this.runtime.CSSPropertySyntaxFactory['<transform>'].postProcessor(object, attributeNames_1);
            }
            if (needUpdateGeometry_1) {
                this.updateGeometry(object);
            }
            return;
        }
        var skipUpdateAttribute = options.skipUpdateAttribute, skipParse = options.skipParse, forceUpdateGeometry = options.forceUpdateGeometry, usedAttributes = options.usedAttributes;
        var needUpdateGeometry = forceUpdateGeometry;
        var attributeNames = Object.keys(attributes);
        attributeNames.forEach(function (attributeName) {
            var _a;
            if (!skipUpdateAttribute) {
                object.attributes[attributeName] = attributes[attributeName];
            }
            if (!needUpdateGeometry && ((_a = propertyMetadataCache[attributeName]) === null || _a === void 0 ? void 0 : _a.l)) {
                needUpdateGeometry = true;
            }
        });
        if (!skipParse) {
            attributeNames.forEach(function (name) {
                object.computedStyle[name] = _this.parseProperty(name, object.attributes[name], object);
            });
        }
        // let hasUnresolvedProperties = false;
        // parse according to priority
        // path 50
        // points 50
        // text 50
        // textTransform 51
        // anchor 99
        // transform 100
        // transformOrigin 100
        if (usedAttributes === null || usedAttributes === void 0 ? void 0 : usedAttributes.length) {
            // uniqueAttributeSet.clear();
            attributeNames = Array.from(new Set(attributeNames.concat(usedAttributes)));
        }
        // [
        //   'path',
        //   'points',
        //   'text',
        //   'textTransform',
        //   'anchor',
        //   'transform',
        //   'transformOrigin',
        // ].forEach((name) => {
        //   const index = attributeNames.indexOf(name);
        //   if (index > -1) {
        //     attributeNames.splice(index, 1);
        //     attributeNames.push(name);
        //   }
        // });
        attributeNames.forEach(function (name) {
            // some style props maybe deleted after parsing such as `anchor` in Text
            if (name in object.computedStyle) {
                object.parsedStyle[name] = _this.computeProperty(name, object.computedStyle[name], object);
            }
        });
        // if (hasUnresolvedProperties) {
        //   this.dirty = true;
        //   return;
        // }
        // update geometry
        if (needUpdateGeometry) {
            // object.geometry.dirty = true;
            // runtime.sceneGraphService.dirtifyToRoot(object);
            this.updateGeometry(object);
        }
        attributeNames.forEach(function (name) {
            if (name in object.parsedStyle) {
                _this.postProcessProperty(name, object, attributeNames);
            }
        });
        if (this.runtime.enableCSSParsing && object.children.length) {
            attributeNames.forEach(function (name) {
                if (name in object.parsedStyle && _this.isPropertyInheritable(name)) {
                    // update children's inheritable
                    object.children.forEach(function (child) {
                        child.internalSetAttribute(name, null, {
                            skipUpdateAttribute: true,
                            skipParse: true,
                        });
                    });
                }
            });
        }
    };
    /**
     * string -> parsed value
     */
    DefaultStyleValueRegistry.prototype.parseProperty = function (name, value, object) {
        var metadata = propertyMetadataCache[name];
        var computed = value;
        if (value === '' || isNil(value)) {
            value = 'unset';
        }
        if (value === 'unset' || value === 'initial' || value === 'inherit') {
            // computed = new CSSKeywordValue(value);
            computed = getOrCreateKeyword(value);
        }
        else {
            if (metadata) {
                var keywords = metadata.k, syntax = metadata.syntax;
                var handler = syntax && this.getPropertySyntax(syntax);
                // use keywords
                if (keywords && keywords.indexOf(value) > -1) {
                    // computed = new CSSKeywordValue(value);
                    computed = getOrCreateKeyword(value);
                }
                else if (handler && handler.parser) {
                    // try to parse it to CSSStyleValue, eg. '10px' -> CSS.px(10)
                    computed = handler.parser(value, object);
                }
            }
        }
        return computed;
    };
    /**
     * computed value -> used value
     */
    DefaultStyleValueRegistry.prototype.computeProperty = function (name, computed, object) {
        var metadata = propertyMetadataCache[name];
        var isDocumentElement = object.id === 'g-root';
        // let used: CSSStyleValue = computed instanceof CSSStyleValue ? computed.clone() : computed;
        var used = computed;
        if (metadata) {
            var syntax = metadata.syntax, inherited = metadata.inh, defaultValue = metadata.d;
            if (computed instanceof CSSKeywordValue) {
                var value = computed.value;
                /**
                 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/unset
                 */
                if (value === 'unset') {
                    if (inherited && !isDocumentElement) {
                        value = 'inherit';
                    }
                    else {
                        value = 'initial';
                    }
                }
                if (value === 'initial') {
                    // @see https://developer.mozilla.org/en-US/docs/Web/CSS/initial
                    if (!isNil(defaultValue)) {
                        computed = this.parseProperty(name, isFunction(defaultValue)
                            ? defaultValue(object.nodeName)
                            : defaultValue, object);
                    }
                }
                else if (value === 'inherit') {
                    // @see https://developer.mozilla.org/en-US/docs/Web/CSS/inherit
                    // behave like `inherit`
                    var resolved = this.tryToResolveProperty(object, name, {
                        inherited: true,
                    });
                    if (!isNil(resolved)) {
                        // object.parsedStyle[name] = resolved;
                        // return false;
                        return resolved;
                    }
                    else {
                        this.addUnresolveProperty(object, name);
                        return;
                    }
                }
            }
            var handler = syntax && this.getPropertySyntax(syntax);
            if (handler && handler.calculator) {
                // convert computed value to used value
                var oldParsedValue = object.parsedStyle[name];
                used = handler.calculator(name, oldParsedValue, computed, object, this.runtime);
            }
            else if (computed instanceof CSSKeywordValue) {
                used = computed.value;
            }
            else {
                used = computed;
            }
        }
        // object.parsedStyle[name] = used;
        // return false;
        return used;
    };
    DefaultStyleValueRegistry.prototype.postProcessProperty = function (name, object, attributes) {
        var metadata = propertyMetadataCache[name];
        if (metadata && metadata.syntax) {
            var handler = metadata.syntax && this.getPropertySyntax(metadata.syntax);
            var propertyHandler = handler;
            if (propertyHandler && propertyHandler.postProcessor) {
                propertyHandler.postProcessor(object, attributes);
            }
        }
    };
    /**
     * resolve later
     */
    DefaultStyleValueRegistry.prototype.addUnresolveProperty = function (object, name) {
        var properties = unresolvedProperties.get(object);
        if (!properties) {
            unresolvedProperties.set(object, []);
            properties = unresolvedProperties.get(object);
        }
        if (properties.indexOf(name) === -1) {
            properties.push(name);
        }
    };
    DefaultStyleValueRegistry.prototype.tryToResolveProperty = function (object, name, options) {
        if (options === void 0) { options = {}; }
        var inherited = options.inherited;
        if (inherited) {
            if (object.parentElement &&
                isPropertyResolved(object.parentElement, name)) {
                // const computedValue = object.parentElement.computedStyle[name];
                var usedValue = object.parentElement.parsedStyle[name];
                if (
                // usedValue instanceof CSSKeywordValue &&
                usedValue === 'unset' ||
                    usedValue === 'initial' ||
                    usedValue === 'inherit') {
                    return;
                }
                // else if (
                //   usedValue instanceof CSSUnitValue &&
                //   CSSUnitValue.isRelativeUnit(usedValue.unit)
                // ) {
                //   return false;
                // }
                return usedValue;
            }
        }
        return;
    };
    DefaultStyleValueRegistry.prototype.recalc = function (object) {
        var properties = unresolvedProperties.get(object);
        if (properties && properties.length) {
            var attributes_1 = {};
            properties.forEach(function (property) {
                attributes_1[property] = object.attributes[property];
            });
            this.processProperties(object, attributes_1);
            unresolvedProperties.delete(object);
        }
    };
    /**
     * update geometry when relative props changed,
     * eg. r of Circle, width/height of Rect
     */
    DefaultStyleValueRegistry.prototype.updateGeometry = function (object) {
        var nodeName = object.nodeName;
        var geometryUpdater = this.runtime.geometryUpdaterFactory[nodeName];
        if (geometryUpdater) {
            var geometry_1 = object.geometry;
            if (!geometry_1.contentBounds) {
                geometry_1.contentBounds = new AABB();
            }
            if (!geometry_1.renderBounds) {
                geometry_1.renderBounds = new AABB();
            }
            var parsedStyle = object.parsedStyle;
            var _a = geometryUpdater.update(parsedStyle, object), width = _a.width, height = _a.height, _b = _a.depth, depth = _b === void 0 ? 0 : _b, _c = _a.offsetX, offsetX = _c === void 0 ? 0 : _c, _d = _a.offsetY, offsetY = _d === void 0 ? 0 : _d, _e = _a.offsetZ, offsetZ = _e === void 0 ? 0 : _e;
            // init with content box
            var halfExtents = [
                Math.abs(width) / 2,
                Math.abs(height) / 2,
                depth / 2,
            ];
            // const halfExtents = vec3.set(
            //   tmpVec3a,
            //   Math.abs(width) / 2,
            //   Math.abs(height) / 2,
            //   depth / 2,
            // );
            // anchor is center by default, don't account for lineWidth here
            var _f = parsedStyle, stroke = _f.stroke, lineWidth = _f.lineWidth, 
            // lineCap,
            // lineJoin,
            // miterLimit,
            increasedLineWidthForHitTesting = _f.increasedLineWidthForHitTesting, shadowType = _f.shadowType, shadowColor = _f.shadowColor, _g = _f.filter, filter = _g === void 0 ? [] : _g, transformOrigin = _f.transformOrigin;
            var anchor = parsedStyle.anchor;
            // <Text> use textAlign & textBaseline instead of anchor
            if (nodeName === Shape.TEXT) {
                delete parsedStyle.anchor;
            }
            else if (nodeName === Shape.MESH) {
                parsedStyle.anchor[2] = 0.5;
            }
            var center = [
                ((1 - ((anchor && anchor[0]) || 0) * 2) * width) / 2 + offsetX,
                ((1 - ((anchor && anchor[1]) || 0) * 2) * height) / 2 + offsetY,
                (1 - ((anchor && anchor[2]) || 0) * 2) * halfExtents[2] + offsetZ,
            ];
            // const center = vec3.set(
            //   tmpVec3b,
            //   ((1 - ((anchor && anchor[0]) || 0) * 2) * width) / 2 + offsetX,
            //   ((1 - ((anchor && anchor[1]) || 0) * 2) * height) / 2 + offsetY,
            //   (1 - ((anchor && anchor[2]) || 0) * 2) * halfExtents[2] + offsetZ,
            // );
            // update geometry's AABB
            geometry_1.contentBounds.update(center, halfExtents);
            // @see https://github.molgen.mpg.de/git-mirror/cairo/blob/master/src/cairo-stroke-style.c#L97..L128
            var expansion = nodeName === Shape.POLYLINE ||
                nodeName === Shape.POLYGON ||
                nodeName === Shape.PATH
                ? Math.SQRT2
                : 0.5;
            // if (lineCap?.value === 'square') {
            //   expansion = Math.SQRT1_2;
            // }
            // if (lineJoin?.value === 'miter' && expansion < Math.SQRT2 * miterLimit) {
            //   expansion = Math.SQRT1_2 * miterLimit;
            // }
            // append border only if stroke existed
            var hasStroke = stroke && !stroke.isNone;
            if (hasStroke) {
                var halfLineWidth = ((lineWidth || 0) + (increasedLineWidthForHitTesting || 0)) *
                    expansion;
                // halfExtents[0] += halfLineWidth[0];
                // halfExtents[1] += halfLineWidth[1];
                halfExtents[0] += halfLineWidth;
                halfExtents[1] += halfLineWidth;
                // vec3.add(
                //   halfExtents,
                //   halfExtents,
                //   vec3.set(tmpVec3c, halfLineWidth, halfLineWidth, 0),
                // );
            }
            geometry_1.renderBounds.update(center, halfExtents);
            // account for shadow, only support constant value now
            if (shadowColor && shadowType && shadowType !== 'inner') {
                var _h = geometry_1.renderBounds, min = _h.min, max = _h.max;
                var _j = parsedStyle, shadowBlur = _j.shadowBlur, shadowOffsetX = _j.shadowOffsetX, shadowOffsetY = _j.shadowOffsetY;
                var shadowBlurInPixels = shadowBlur || 0;
                var shadowOffsetXInPixels = shadowOffsetX || 0;
                var shadowOffsetYInPixels = shadowOffsetY || 0;
                var shadowLeft = min[0] - shadowBlurInPixels + shadowOffsetXInPixels;
                var shadowRight = max[0] + shadowBlurInPixels + shadowOffsetXInPixels;
                var shadowTop = min[1] - shadowBlurInPixels + shadowOffsetYInPixels;
                var shadowBottom = max[1] + shadowBlurInPixels + shadowOffsetYInPixels;
                min[0] = Math.min(min[0], shadowLeft);
                max[0] = Math.max(max[0], shadowRight);
                min[1] = Math.min(min[1], shadowTop);
                max[1] = Math.max(max[1], shadowBottom);
                geometry_1.renderBounds.setMinMax(min, max);
            }
            // account for filter, eg. blur(5px), drop-shadow()
            filter.forEach(function (_a) {
                var name = _a.name, params = _a.params;
                if (name === 'blur') {
                    var blurRadius = params[0].value;
                    geometry_1.renderBounds.update(geometry_1.renderBounds.center, addVec3(geometry_1.renderBounds.halfExtents, geometry_1.renderBounds.halfExtents, [blurRadius, blurRadius, 0]));
                }
                else if (name === 'drop-shadow') {
                    var shadowOffsetX = params[0].value;
                    var shadowOffsetY = params[1].value;
                    var shadowBlur = params[2].value;
                    var _b = geometry_1.renderBounds, min = _b.min, max = _b.max;
                    var shadowLeft = min[0] - shadowBlur + shadowOffsetX;
                    var shadowRight = max[0] + shadowBlur + shadowOffsetX;
                    var shadowTop = min[1] - shadowBlur + shadowOffsetY;
                    var shadowBottom = max[1] + shadowBlur + shadowOffsetY;
                    min[0] = Math.min(min[0], shadowLeft);
                    max[0] = Math.max(max[0], shadowRight);
                    min[1] = Math.min(min[1], shadowTop);
                    max[1] = Math.max(max[1], shadowBottom);
                    geometry_1.renderBounds.setMinMax(min, max);
                }
            });
            anchor = parsedStyle.anchor;
            // if (nodeName === Shape.RECT) {
            // account for negative width / height of Rect
            // @see https://github.com/antvis/g/issues/957
            var flipY = width < 0;
            var flipX = height < 0;
            // } else {
            // }
            // set transform origin
            var usedOriginXValue = (flipY ? -1 : 1) *
                (transformOrigin
                    ? convertPercentUnit(transformOrigin[0], 0, object)
                    : 0);
            var usedOriginYValue = (flipX ? -1 : 1) *
                (transformOrigin
                    ? convertPercentUnit(transformOrigin[1], 1, object)
                    : 0);
            usedOriginXValue =
                usedOriginXValue -
                    (flipY ? -1 : 1) *
                        ((anchor && anchor[0]) || 0) *
                        geometry_1.contentBounds.halfExtents[0] *
                        2;
            usedOriginYValue =
                usedOriginYValue -
                    (flipX ? -1 : 1) *
                        ((anchor && anchor[1]) || 0) *
                        geometry_1.contentBounds.halfExtents[1] *
                        2;
            object.setOrigin(usedOriginXValue, usedOriginYValue);
            // FIXME setOrigin may have already dirtified to root.
            this.runtime.sceneGraphService.dirtifyToRoot(object);
        }
    };
    DefaultStyleValueRegistry.prototype.isPropertyInheritable = function (name) {
        var metadata = propertyMetadataCache[name];
        if (!metadata) {
            return false;
        }
        return metadata.inh;
    };
    return DefaultStyleValueRegistry;
}());

var CSSPropertyAngle = /** @class */ (function () {
    function CSSPropertyAngle() {
        this.parser = parseAngle;
        this.parserWithCSSDisabled = null;
        this.mixer = mergeNumbers;
    }
    CSSPropertyAngle.prototype.calculator = function (name, oldParsed, parsed, object) {
        return convertAngleUnit(parsed);
    };
    return CSSPropertyAngle;
}());

/**
 * clipPath / textPath / offsetPath
 */
var CSSPropertyClipPath = /** @class */ (function () {
    function CSSPropertyClipPath() {
    }
    CSSPropertyClipPath.prototype.calculator = function (name, oldPath, newPath, object, runtime) {
        // unset
        if (newPath instanceof CSSKeywordValue) {
            newPath = null;
        }
        runtime.sceneGraphService.updateDisplayObjectDependency(name, oldPath, newPath, object);
        if (name === 'clipPath') {
            // should affect children
            object.forEach(function (leaf) {
                if (leaf.childNodes.length === 0) {
                    runtime.sceneGraphService.dirtifyToRoot(leaf);
                }
            });
        }
        return newPath;
    };
    return CSSPropertyClipPath;
}());

var CSSPropertyColor = /** @class */ (function () {
    function CSSPropertyColor() {
        this.parser = parseColor;
        this.parserWithCSSDisabled = parseColor;
        this.mixer = mergeColors;
    }
    CSSPropertyColor.prototype.calculator = function (name, oldParsed, parsed, object) {
        if (parsed instanceof CSSKeywordValue) {
            // 'unset' 'none'
            return parsed.value === 'none' ? noneColor : transparentColor;
        }
        return parsed;
    };
    return CSSPropertyColor;
}());

var CSSPropertyFilter = /** @class */ (function () {
    function CSSPropertyFilter() {
        this.parser = parseFilter;
    }
    CSSPropertyFilter.prototype.calculator = function (name, oldParsed, parsed) {
        // unset or none
        if (parsed instanceof CSSKeywordValue) {
            return [];
        }
        return parsed;
    };
    return CSSPropertyFilter;
}());

function getFontSize(object) {
    var fontSize = object.parsedStyle.fontSize;
    return isNil(fontSize) ? null : fontSize;
}
/**
 * <length> & <percentage>
 */
var CSSPropertyLengthOrPercentage = /** @class */ (function () {
    function CSSPropertyLengthOrPercentage() {
        this.parser = parseLengthOrPercentage;
        this.parserWithCSSDisabled = null;
        this.mixer = mergeNumbers;
    }
    /**
     * according to parent's bounds
     *
     * @example
     * CSS.percent(50) -> CSS.px(0.5 * parent.width)
     */
    CSSPropertyLengthOrPercentage.prototype.calculator = function (name, oldParsed, computed, object, runtime) {
        var _a;
        if (isNumber(computed)) {
            return computed;
        }
        if (CSSUnitValue.isRelativeUnit(computed.unit)) {
            var registry = runtime.styleValueRegistry;
            if (computed.unit === UnitType.kPercentage) {
                // TODO: merge dimensions
                return 0;
            }
            else if (computed.unit === UnitType.kEms) {
                if (object.parentNode) {
                    var fontSize = getFontSize(object.parentNode);
                    if (fontSize) {
                        fontSize *= computed.value;
                        return fontSize;
                    }
                    else {
                        registry.addUnresolveProperty(object, name);
                    }
                }
                else {
                    registry.addUnresolveProperty(object, name);
                }
                return 0;
            }
            else if (computed.unit === UnitType.kRems) {
                if ((_a = object === null || object === void 0 ? void 0 : object.ownerDocument) === null || _a === void 0 ? void 0 : _a.documentElement) {
                    var fontSize = getFontSize(object.ownerDocument.documentElement);
                    if (fontSize) {
                        fontSize *= computed.value;
                        return fontSize;
                    }
                    else {
                        registry.addUnresolveProperty(object, name);
                    }
                }
                else {
                    registry.addUnresolveProperty(object, name);
                }
                return 0;
            }
        }
        else {
            // remove listener if exists
            // registry.unregisterParentGeometryBoundsChangedHandler(object, name);
            // return absolute value
            return computed.value;
        }
    };
    return CSSPropertyLengthOrPercentage;
}());

/**
 * format to Tuple2<CSSUnitValue>
 *
 * @example
 * rect.style.lineDash = 10;
 * rect.style.lineDash = [10, 10];
 * rect.style.lineDash = '10 10';
 */
var CSSPropertyLengthOrPercentage12 = /** @class */ (function () {
    function CSSPropertyLengthOrPercentage12() {
        this.mixer = mergeNumberLists;
    }
    CSSPropertyLengthOrPercentage12.prototype.parser = function (radius) {
        var parsed = parseDimensionArray(isNumber(radius) ? [radius] : radius);
        var formatted;
        if (parsed.length === 1) {
            formatted = [parsed[0], parsed[0]];
        }
        else {
            formatted = [parsed[0], parsed[1]];
        }
        return formatted;
    };
    CSSPropertyLengthOrPercentage12.prototype.calculator = function (name, oldParsed, computed) {
        return computed.map(function (c) { return c.value; });
    };
    return CSSPropertyLengthOrPercentage12;
}());

/**
 * used in rounded rect
 *
 * @example
 * rect.style.radius = 10;
 * rect.style.radius = '10 10';
 * rect.style.radius = '10 10 10 10';
 */
var CSSPropertyLengthOrPercentage14 = /** @class */ (function () {
    function CSSPropertyLengthOrPercentage14() {
        this.mixer = mergeNumberLists;
    }
    CSSPropertyLengthOrPercentage14.prototype.parser = function (radius) {
        var parsed = parseDimensionArray(isNumber(radius) ? [radius] : radius);
        var formatted;
        // format to Tuple<CSSUnitValue>
        if (parsed.length === 1) {
            formatted = [parsed[0], parsed[0], parsed[0], parsed[0]];
        }
        else if (parsed.length === 2) {
            formatted = [parsed[0], parsed[1], parsed[0], parsed[1]];
        }
        else if (parsed.length === 3) {
            formatted = [parsed[0], parsed[1], parsed[2], parsed[1]];
        }
        else {
            formatted = [parsed[0], parsed[1], parsed[2], parsed[3]];
        }
        return formatted;
    };
    CSSPropertyLengthOrPercentage14.prototype.calculator = function (name, oldParsed, computed) {
        return computed.map(function (c) { return c.value; });
    };
    return CSSPropertyLengthOrPercentage14;
}());

var tmpMat4 = mat4.create();
function parsedTransformToMat4(transform, object) {
    var defX = object.parsedStyle.defX || 0;
    var defY = object.parsedStyle.defY || 0;
    // reset transform
    object.resetLocalTransform();
    object.setLocalPosition(defX, defY);
    transform.forEach(function (parsed) {
        var t = parsed.t, d = parsed.d;
        if (t === 'scale') {
            // scale(1) scale(1, 1)
            var newScale = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [1, 1];
            object.scaleLocal(newScale[0], newScale[1], 1);
        }
        else if (t === 'scalex') {
            var newScale = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [1];
            object.scaleLocal(newScale[0], 1, 1);
        }
        else if (t === 'scaley') {
            var newScale = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [1];
            object.scaleLocal(1, newScale[0], 1);
        }
        else if (t === 'scalez') {
            var newScale = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [1];
            object.scaleLocal(1, 1, newScale[0]);
        }
        else if (t === 'scale3d') {
            var newScale = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [1, 1, 1];
            object.scaleLocal(newScale[0], newScale[1], newScale[2]);
        }
        else if (t === 'translate') {
            var newTranslation = d || [Opx, Opx];
            object.translateLocal(newTranslation[0].value, newTranslation[1].value, 0);
        }
        else if (t === 'translatex') {
            var newTranslation = d || [Opx];
            object.translateLocal(newTranslation[0].value, 0, 0);
        }
        else if (t === 'translatey') {
            var newTranslation = d || [Opx];
            object.translateLocal(0, newTranslation[0].value, 0);
        }
        else if (t === 'translatez') {
            var newTranslation = d || [Opx];
            object.translateLocal(0, 0, newTranslation[0].value);
        }
        else if (t === 'translate3d') {
            var newTranslation = d || [Opx, Opx, Opx];
            object.translateLocal(newTranslation[0].value, newTranslation[1].value, newTranslation[2].value);
        }
        else if (t === 'rotate') {
            var newAngles = d || [Odeg];
            object.rotateLocal(0, 0, convertAngleUnit(newAngles[0]));
        }
        else if (t === 'rotatex') {
            var newAngles = d || [Odeg];
            object.rotateLocal(convertAngleUnit(newAngles[0]), 0, 0);
        }
        else if (t === 'rotatey') {
            var newAngles = d || [Odeg];
            object.rotateLocal(0, convertAngleUnit(newAngles[0]), 0);
        }
        else if (t === 'rotatez') {
            var newAngles = d || [Odeg];
            object.rotateLocal(0, 0, convertAngleUnit(newAngles[0]));
        }
        else if (t === 'rotate3d') ;
        else if (t === 'skew') {
            var newSkew = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [0, 0];
            object.setLocalSkew(deg2rad(newSkew[0]), deg2rad(newSkew[1]));
        }
        else if (t === 'skewx') {
            var newSkew = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [0];
            object.setLocalSkew(deg2rad(newSkew[0]), object.getLocalSkew()[1]);
        }
        else if (t === 'skewy') {
            var newSkew = (d === null || d === void 0 ? void 0 : d.map(function (s) { return s.value; })) || [0];
            object.setLocalSkew(object.getLocalSkew()[0], deg2rad(newSkew[0]));
        }
        else if (t === 'matrix') {
            var _a = __read(d.map(function (s) { return s.value; }), 6), a = _a[0], b = _a[1], c = _a[2], dd = _a[3], tx = _a[4], ty = _a[5];
            object.setLocalTransform(mat4.set(tmpMat4, a, b, 0, 0, c, dd, 0, 0, 0, 0, 1, 0, tx + defX, ty + defY, 0, 1));
        }
        else if (t === 'matrix3d') {
            // @ts-ignore
            mat4.set.apply(mat4, __spreadArray([tmpMat4], __read(d.map(function (s) { return s.value; })), false));
            tmpMat4[12] += defX;
            tmpMat4[13] += defY;
            object.setLocalTransform(tmpMat4);
        }
    });
    return object.getLocalTransform();
}

/**
 * local position
 */
var CSSPropertyLocalPosition = /** @class */ (function (_super) {
    __extends(CSSPropertyLocalPosition, _super);
    function CSSPropertyLocalPosition() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * update local position
     */
    CSSPropertyLocalPosition.prototype.postProcessor = function (object, attributes) {
        var x;
        var y;
        var z;
        switch (object.nodeName) {
            case Shape.CIRCLE:
            case Shape.ELLIPSE:
                var _a = object.parsedStyle, cx = _a.cx, cy = _a.cy, cz = _a.cz;
                if (!isNil(cx)) {
                    x = cx;
                }
                if (!isNil(cy)) {
                    y = cy;
                }
                if (!isNil(cz)) {
                    z = cz;
                }
                break;
            case Shape.LINE:
                var _b = object.parsedStyle, x1 = _b.x1, x2 = _b.x2, y1 = _b.y1, y2 = _b.y2;
                var minX = Math.min(x1, x2);
                var minY = Math.min(y1, y2);
                x = minX;
                y = minY;
                z = 0;
                break;
            case Shape.RECT:
            case Shape.IMAGE:
            case Shape.GROUP:
            case Shape.HTML:
            case Shape.TEXT:
            case Shape.MESH:
                if (!isNil(object.parsedStyle.x)) {
                    x = object.parsedStyle.x;
                }
                if (!isNil(object.parsedStyle.y)) {
                    y = object.parsedStyle.y;
                }
                if (!isNil(object.parsedStyle.z)) {
                    z = object.parsedStyle.z;
                }
                break;
        }
        if (object.nodeName !== Shape.PATH &&
            object.nodeName !== Shape.POLYLINE &&
            object.nodeName !== Shape.POLYGON) {
            object.parsedStyle.defX = x || 0;
            object.parsedStyle.defY = y || 0;
        }
        var needResetLocalPosition = !isNil(x) || !isNil(y) || !isNil(z);
        // only if `transform` won't be processed later
        if (needResetLocalPosition && attributes.indexOf('transform') === -1) {
            // account for current transform if needed
            var transform = object.parsedStyle.transform;
            if (transform && transform.length) {
                parsedTransformToMat4(transform, object);
            }
            else {
                var _c = __read(object.getLocalPosition(), 3), ox = _c[0], oy = _c[1], oz = _c[2];
                object.setLocalPosition(isNil(x) ? ox : x, isNil(y) ? oy : y, isNil(z) ? oz : z);
            }
        }
    };
    return CSSPropertyLocalPosition;
}(CSSPropertyLengthOrPercentage));

var CSSPropertyMarker = /** @class */ (function () {
    function CSSPropertyMarker() {
    }
    CSSPropertyMarker.prototype.calculator = function (name, oldMarker, newMarker, object) {
        // unset
        if (newMarker instanceof CSSKeywordValue) {
            newMarker = null;
        }
        var cloned = newMarker === null || newMarker === void 0 ? void 0 : newMarker.cloneNode(true);
        if (cloned) {
            // FIXME: SVG should not inherit parent's style, add a flag here
            cloned.style.isMarker = true;
        }
        return cloned;
    };
    return CSSPropertyMarker;
}());

var CSSPropertyNumber = /** @class */ (function () {
    function CSSPropertyNumber() {
        this.mixer = mergeNumbers;
        this.parser = parseNumber;
        this.parserWithCSSDisabled = null;
    }
    CSSPropertyNumber.prototype.calculator = function (name, oldParsed, computed) {
        return computed.value;
    };
    return CSSPropertyNumber;
}());

var CSSPropertyOffsetDistance = /** @class */ (function () {
    function CSSPropertyOffsetDistance() {
        this.parser = parseNumber;
        this.parserWithCSSDisabled = null;
        this.mixer = clampedMergeNumbers(0, 1);
    }
    CSSPropertyOffsetDistance.prototype.calculator = function (name, oldParsed, computed) {
        return computed.value;
    };
    CSSPropertyOffsetDistance.prototype.postProcessor = function (object) {
        var _a = object.parsedStyle, offsetPath = _a.offsetPath, offsetDistance = _a.offsetDistance;
        if (!offsetPath) {
            return;
        }
        var nodeName = offsetPath.nodeName;
        if (nodeName === Shape.LINE ||
            nodeName === Shape.PATH ||
            nodeName === Shape.POLYLINE) {
            // set position in world space
            var point = offsetPath.getPoint(offsetDistance);
            if (point) {
                object.parsedStyle.defX = point.x;
                object.parsedStyle.defY = point.y;
                object.setLocalPosition(point.x, point.y);
            }
        }
    };
    return CSSPropertyOffsetDistance;
}());

/**
 * opacity
 */
var CSSPropertyOpacity = /** @class */ (function () {
    function CSSPropertyOpacity() {
        this.parser = parseNumber;
        this.parserWithCSSDisabled = null;
        this.mixer = clampedMergeNumbers(0, 1);
    }
    CSSPropertyOpacity.prototype.calculator = function (name, oldParsed, computed) {
        return computed.value;
    };
    return CSSPropertyOpacity;
}());

var CSSPropertyPath = /** @class */ (function () {
    function CSSPropertyPath() {
        /**
         * path2Curve
         */
        this.parser = parsePath;
        this.parserWithCSSDisabled = parsePath;
        this.mixer = mergePaths;
    }
    CSSPropertyPath.prototype.calculator = function (name, oldParsed, parsed) {
        // unset
        if (parsed instanceof CSSKeywordValue && parsed.value === 'unset') {
            return {
                absolutePath: [],
                hasArc: false,
                segments: [],
                polygons: [],
                polylines: [],
                curve: null,
                totalLength: 0,
                rect: new Rectangle(0, 0, 0, 0),
            };
        }
        return parsed;
    };
    /**
     * update local position
     */
    CSSPropertyPath.prototype.postProcessor = function (object, attributes) {
        object.parsedStyle.defX = object.parsedStyle.path.rect.x;
        object.parsedStyle.defY = object.parsedStyle.path.rect.y;
        if (object.nodeName === Shape.PATH &&
            attributes.indexOf('transform') === -1) {
            var _a = object.parsedStyle, _b = _a.defX, defX = _b === void 0 ? 0 : _b, _c = _a.defY, defY = _c === void 0 ? 0 : _c;
            object.setLocalPosition(defX, defY);
        }
    };
    return CSSPropertyPath;
}());

var CSSPropertyPoints = /** @class */ (function () {
    function CSSPropertyPoints() {
        this.parser = parsePoints;
        this.mixer = mergePoints;
    }
    /**
     * update local position
     */
    CSSPropertyPoints.prototype.postProcessor = function (object, attributes) {
        if ((object.nodeName === Shape.POLYGON ||
            object.nodeName === Shape.POLYLINE) &&
            attributes.indexOf('transform') === -1) {
            var _a = object.parsedStyle, defX = _a.defX, defY = _a.defY;
            object.setLocalPosition(defX, defY);
        }
    };
    return CSSPropertyPoints;
}());

var CSSPropertyShadowBlur = /** @class */ (function (_super) {
    __extends(CSSPropertyShadowBlur, _super);
    function CSSPropertyShadowBlur() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.mixer = clampedMergeNumbers(0, Infinity);
        return _this;
    }
    return CSSPropertyShadowBlur;
}(CSSPropertyLengthOrPercentage));

var CSSPropertyText = /** @class */ (function () {
    function CSSPropertyText() {
    }
    CSSPropertyText.prototype.calculator = function (name, oldParsed, parsed, object) {
        if (parsed instanceof CSSKeywordValue) {
            if (parsed.value === 'unset') {
                return '';
            }
            else {
                return parsed.value;
            }
        }
        // allow number as valid text content
        return "".concat(parsed);
    };
    CSSPropertyText.prototype.postProcessor = function (object) {
        object.nodeValue = "".concat(object.parsedStyle.text) || '';
    };
    return CSSPropertyText;
}());

/**
 * it must transform after text get parsed
 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/text-transform
 */
var CSSPropertyTextTransform = /** @class */ (function () {
    function CSSPropertyTextTransform() {
    }
    CSSPropertyTextTransform.prototype.calculator = function (name, oldParsed, parsed, object) {
        var rawText = object.getAttribute('text');
        if (rawText) {
            var transformedText = rawText;
            if (parsed.value === 'capitalize') {
                transformedText = rawText.charAt(0).toUpperCase() + rawText.slice(1);
            }
            else if (parsed.value === 'lowercase') {
                transformedText = rawText.toLowerCase();
            }
            else if (parsed.value === 'uppercase') {
                transformedText = rawText.toUpperCase();
            }
            object.parsedStyle.text = transformedText;
        }
        return parsed.value;
    };
    return CSSPropertyTextTransform;
}());

var canvasMap = {};
var defaultCanvasIdCounter = 0;
/**
 * destroy existed canvas with the same id
 */
function cleanExistedCanvas(container, canvas) {
    if (container) {
        var id = typeof container === 'string'
            ? container
            : container.id || defaultCanvasIdCounter++;
        if (canvasMap[id]) {
            canvasMap[id].destroy();
        }
        canvasMap[id] = canvas;
    }
}
var isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

function isElement(target) {
    return !!target.getAttribute;
}
function sortedIndex(array, value) {
    var low = 0;
    var high = array.length;
    while (low < high) {
        var mid = (low + high) >>> 1;
        if (sortByZIndex(array[mid], value) < 0) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    return low;
}
function sortByZIndex(o1, o2) {
    var zIndex1 = Number(o1.parsedStyle.zIndex);
    var zIndex2 = Number(o2.parsedStyle.zIndex);
    if (zIndex1 === zIndex2) {
        var parent_1 = o1.parentNode;
        if (parent_1) {
            var children = parent_1.childNodes || [];
            return children.indexOf(o1) - children.indexOf(o2);
        }
    }
    return zIndex1 - zIndex2;
}
function findClosestClipPathTarget(object) {
    var _a;
    var el = object;
    do {
        var clipPath = (_a = el.parsedStyle) === null || _a === void 0 ? void 0 : _a.clipPath;
        if (clipPath)
            return el;
        el = el.parentElement;
    } while (el !== null);
    return null;
}
var PX_SUFFIX = 'px';
function setDOMSize($el, width, height) {
    if (isBrowser && $el.style) {
        $el.style.width = width + PX_SUFFIX;
        $el.style.height = height + PX_SUFFIX;
    }
}
function getStyle($el, property) {
    if (isBrowser) {
        return document.defaultView
            .getComputedStyle($el, null)
            .getPropertyValue(property);
    }
}
function getWidth($el) {
    var width = getStyle($el, 'width');
    if (width === 'auto') {
        return $el.offsetWidth;
    }
    return parseFloat(width);
}
function getHeight($el) {
    var height = getStyle($el, 'height');
    if (height === 'auto') {
        return $el.offsetHeight;
    }
    return parseFloat(height);
}

// borrow from hammer.js
var MOUSE_POINTER_ID = 1;
var TOUCH_TO_POINTER = {
    touchstart: 'pointerdown',
    touchend: 'pointerup',
    touchendoutside: 'pointerupoutside',
    touchmove: 'pointermove',
    touchcancel: 'pointercancel',
};
var clock = typeof performance === 'object' && performance.now ? performance : Date;

function isFillOrStrokeAffected(pointerEvents, fill, stroke) {
    // account for pointerEvents
    // @see https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
    var hasFill = false;
    var hasStroke = false;
    var isFillOtherThanNone = !!fill && !fill.isNone;
    var isStrokeOtherThanNone = !!stroke && !stroke.isNone;
    if (pointerEvents === 'visiblepainted' ||
        pointerEvents === 'painted' ||
        pointerEvents === 'auto') {
        hasFill = isFillOtherThanNone;
        hasStroke = isStrokeOtherThanNone;
    }
    else if (pointerEvents === 'visiblefill' || pointerEvents === 'fill') {
        hasFill = true;
    }
    else if (pointerEvents === 'visiblestroke' || pointerEvents === 'stroke') {
        hasStroke = true;
    }
    else if (pointerEvents === 'visible' || pointerEvents === 'all') {
        // The values of the fill and stroke do not affect event processing.
        hasFill = true;
        hasStroke = true;
    }
    return [hasFill, hasStroke];
}

/**
 * Thanks for following contributor of codes
 * https://gist.github.com/1866474
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 * http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 * https://github.com/Financial-Times/polyfill-library/blob/master/polyfills/requestAnimationFrame/polyfill.js
 **/
var uId = 1;
var uniqueId = function () { return uId++; };
// We use `self` instead of `window` for `WebWorker` support.
var root = typeof self === 'object' && self.self == self
    ? self
    : // @ts-ignore
        typeof global === 'object' && global.global == global
            ? // @ts-ignore
                global
            : {};
var nowOffset = Date.now();
// use performance api if exist, otherwise use Date.now.
// Date.now polyfill required.
var pnow = function () {
    if (root.performance && typeof root.performance.now === 'function') {
        return root.performance.now();
    }
    // fallback
    return Date.now() - nowOffset;
};
var reservedCBs = {};
var lastTime = Date.now();
var polyfillRaf = function (callback) {
    if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
    }
    var currentTime = Date.now();
    var gap = currentTime - lastTime;
    var delay = gap > 16 ? 0 : 16 - gap;
    var id = uniqueId();
    reservedCBs[id] = callback;
    // keys(reservedCBs).length > 1 의미는 이미 setTimeout 이 걸려있는 경우.
    // 함께 callback 이 실행될 수 있게 reservedCBs 에만 추가해주고 return
    if (Object.keys(reservedCBs).length > 1)
        return id;
    setTimeout(function () {
        lastTime = currentTime;
        var copied = reservedCBs;
        reservedCBs = {};
        Object.keys(copied).forEach(function (key) { return copied[key](pnow()); });
    }, delay);
    return id;
};
var polyfillCaf = function (id) {
    delete reservedCBs[id];
};
var vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o'];
var getRequestAnimationFrame = function (vp) {
    if (typeof vp !== 'string')
        return polyfillRaf;
    if (vp === '')
        return root['requestAnimationFrame'];
    return root[vp + 'RequestAnimationFrame'];
};
var getCancelAnimationFrame = function (vp) {
    if (typeof vp !== 'string')
        return polyfillCaf;
    if (vp === '')
        return root['cancelAnimationFrame'];
    return (root[vp + 'CancelAnimationFrame'] ||
        root[vp + 'CancelRequestAnimationFrame']);
};
var find = function (arr, predicate) {
    var i = 0;
    while (arr[i] !== void 0) {
        if (predicate(arr[i]))
            return arr[i];
        i = i + 1;
    }
};
var vp = find(vendorPrefixes, function (vp) { return !!getRequestAnimationFrame(vp); });
var raf = getRequestAnimationFrame(vp);
var caf = getCancelAnimationFrame(vp);
root.requestAnimationFrame = raf;
root.cancelAnimationFrame = caf;

var AsyncParallelHook = /** @class */ (function () {
    function AsyncParallelHook() {
        this.callbacks = [];
    }
    AsyncParallelHook.prototype.getCallbacksNum = function () {
        return this.callbacks.length;
    };
    AsyncParallelHook.prototype.tapPromise = function (options, fn) {
        this.callbacks.push(fn);
    };
    AsyncParallelHook.prototype.promise = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return Promise.all(this.callbacks.map(function (callback) {
            return callback.apply(void 0, __spreadArray([], __read(args), false));
        }));
    };
    return AsyncParallelHook;
}());

var AsyncSeriesWaterfallHook = /** @class */ (function () {
    function AsyncSeriesWaterfallHook() {
        this.callbacks = [];
    }
    AsyncSeriesWaterfallHook.prototype.tapPromise = function (options, fn) {
        this.callbacks.push(fn);
    };
    AsyncSeriesWaterfallHook.prototype.promise = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var result, i, callback;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.callbacks.length) return [3 /*break*/, 6];
                        return [4 /*yield*/, (_a = this.callbacks)[0].apply(_a, __spreadArray([], __read(args), false))];
                    case 1:
                        result = _b.sent();
                        i = 0;
                        _b.label = 2;
                    case 2:
                        if (!(i < this.callbacks.length - 1)) return [3 /*break*/, 5];
                        callback = this.callbacks[i];
                        return [4 /*yield*/, callback(result)];
                    case 3:
                        // @ts-ignore
                        result = _b.sent();
                        _b.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, result];
                    case 6: return [2 /*return*/, null];
                }
            });
        });
    };
    return AsyncSeriesWaterfallHook;
}());

var SyncHook = /** @class */ (function () {
    function SyncHook() {
        this.callbacks = [];
    }
    SyncHook.prototype.tap = function (options, fn) {
        this.callbacks.push(fn);
    };
    SyncHook.prototype.call = function () {
        /* eslint-disable-next-line prefer-rest-params */
        var argsArr = arguments;
        this.callbacks.forEach(function (callback) {
            /* eslint-disable-next-line prefer-spread */
            callback.apply(void 0, argsArr);
        });
    };
    return SyncHook;
}());

var SyncWaterfallHook = /** @class */ (function () {
    function SyncWaterfallHook() {
        this.callbacks = [];
    }
    SyncWaterfallHook.prototype.tap = function (options, fn) {
        this.callbacks.push(fn);
    };
    SyncWaterfallHook.prototype.call = function () {
        if (this.callbacks.length) {
            /* eslint-disable-next-line prefer-rest-params */
            var argsArr = arguments;
            /* eslint-disable-next-line prefer-spread */
            var result = this.callbacks[0].apply(void 0, argsArr);
            for (var i = 0; i < this.callbacks.length - 1; i++) {
                var callback = this.callbacks[i];
                // @ts-ignore
                result = callback(result);
            }
            return result;
        }
        return null;
    };
    return SyncWaterfallHook;
}());

var genericFontFamilies = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
];
var stringRegExp = /([\"\'])[^\'\"]+\1/;
function toFontString(attributes) {
    var fontSize = attributes.fontSize, fontFamily = attributes.fontFamily, fontStyle = attributes.fontStyle, fontVariant = attributes.fontVariant, fontWeight = attributes.fontWeight;
    // build canvas api font setting from individual components. Convert a numeric this.fontSize to px
    // const fontSizeString: string = isNumber(fontSize) ? `${fontSize}px` : fontSize.toString();
    var fontSizeString = (isNumber(fontSize) && "".concat(fontSize, "px")) || '16px';
    // Clean-up fontFamily property by quoting each font name
    // this will support font names with spaces
    var fontFamilies = fontFamily.split(',');
    for (var i = fontFamilies.length - 1; i >= 0; i--) {
        // Trim any extra white-space
        var fontFamily_1 = fontFamilies[i].trim();
        // Check if font already contains strings
        if (!stringRegExp.test(fontFamily_1) &&
            genericFontFamilies.indexOf(fontFamily_1) < 0) {
            fontFamily_1 = "\"".concat(fontFamily_1, "\"");
        }
        fontFamilies[i] = fontFamily_1;
    }
    return "".concat(fontStyle, " ").concat(fontVariant, " ").concat(fontWeight, " ").concat(fontSizeString, " ").concat(fontFamilies.join(','));
}

/**
 * @see /zh/docs/api/animation#支持变换的属性
 *
 * support the following formats like CSS Transform:
 *
 * scale
 * * scale(x, y)
 * * scaleX(x)
 * * scaleY(x)
 * * scaleZ(z)
 * * scale3d(x, y, z)
 *
 * translate (unit: none, px, %(relative to its bounds))
 * * translate(x, y) eg. translate(0, 0) translate(0, 30px) translate(100%, 100%)
 * * translateX(0)
 * * translateY(0)
 * * translateZ(0)
 * * translate3d(0, 0, 0)
 *
 * rotate (unit: deg rad turn)
 * * rotate(0.5turn) rotate(30deg) rotate(1rad)
 *
 * none
 *
 * unsupported for now:
 * * calc() eg. translate(calc(100% + 10px))
 * * matrix/matrix3d()
 * * skew/skewX/skewY
 * * perspective
 */
var CSSPropertyTransform = /** @class */ (function () {
    function CSSPropertyTransform() {
        this.parser = parseTransform;
        this.parserWithCSSDisabled = parseTransform;
        this.mixer = mergeTransforms;
    }
    CSSPropertyTransform.prototype.calculator = function (name, oldParsed, parsed, object) {
        // 'none'
        if (parsed instanceof CSSKeywordValue) {
            return [];
        }
        return parsed;
    };
    CSSPropertyTransform.prototype.postProcessor = function (object) {
        var transform = object.parsedStyle.transform;
        parsedTransformToMat4(transform, object);
    };
    return CSSPropertyTransform;
}());

/**
 * @see https://developer.mozilla.org/zh-CN/docs/Web/CSS/transform-origin
 * @example
 * [10px, 10px] [10%, 10%]
 */
var CSSPropertyTransformOrigin = /** @class */ (function () {
    function CSSPropertyTransformOrigin() {
        this.parser = parseTransformOrigin;
        // calculator(
        //   name: string,
        //   oldParsed: [CSSUnitValue, CSSUnitValue],
        //   parsed: [CSSUnitValue, CSSUnitValue],
        //   object: DisplayObject,
        // ): [number, number] {
        //   console.log(object, parsed);
        //   return [parsed[0].value, parsed[1].value];
        //   // return [convertPercentUnit(parsed[0], 0, object), convertPercentUnit(parsed[1], 1, object)];
        // }
    }
    return CSSPropertyTransformOrigin;
}());

var CSSPropertyZIndex = /** @class */ (function () {
    function CSSPropertyZIndex() {
        this.parser = parseNumber;
    }
    CSSPropertyZIndex.prototype.calculator = function (name, oldParsed, computed, object) {
        return computed.value;
    };
    CSSPropertyZIndex.prototype.postProcessor = function (object) {
        if (object.parentNode) {
            var parentEntity = object.parentNode;
            var parentRenderable = parentEntity.renderable;
            var parentSortable = parentEntity.sortable;
            if (parentRenderable) {
                parentRenderable.dirty = true;
            }
            // need re-sort on parent
            if (parentSortable) {
                parentSortable.dirty = true;
                parentSortable.dirtyReason = SortReason.Z_INDEX_CHANGED;
            }
        }
    };
    return CSSPropertyZIndex;
}());

var CircleUpdater = /** @class */ (function () {
    function CircleUpdater() {
    }
    CircleUpdater.prototype.update = function (parsedStyle, object) {
        var r = parsedStyle.r;
        var width = r * 2;
        var height = r * 2;
        return {
            width: width,
            height: height,
        };
    };
    return CircleUpdater;
}());

var EllipseUpdater = /** @class */ (function () {
    function EllipseUpdater() {
    }
    EllipseUpdater.prototype.update = function (parsedStyle, object) {
        var rx = parsedStyle.rx, ry = parsedStyle.ry;
        var width = rx * 2;
        var height = ry * 2;
        return {
            width: width,
            height: height,
        };
    };
    return EllipseUpdater;
}());

var LineUpdater = /** @class */ (function () {
    function LineUpdater() {
    }
    LineUpdater.prototype.update = function (parsedStyle) {
        var x1 = parsedStyle.x1, y1 = parsedStyle.y1, x2 = parsedStyle.x2, y2 = parsedStyle.y2;
        var minX = Math.min(x1, x2);
        var maxX = Math.max(x1, x2);
        var minY = Math.min(y1, y2);
        var maxY = Math.max(y1, y2);
        var width = maxX - minX;
        var height = maxY - minY;
        return {
            width: width,
            height: height,
        };
    };
    return LineUpdater;
}());

var PathUpdater = /** @class */ (function () {
    function PathUpdater() {
    }
    PathUpdater.prototype.update = function (parsedStyle) {
        var path = parsedStyle.path;
        var _a = path.rect, width = _a.width, height = _a.height;
        return {
            width: width,
            height: height,
        };
    };
    return PathUpdater;
}());

var PolylineUpdater = /** @class */ (function () {
    function PolylineUpdater() {
    }
    PolylineUpdater.prototype.update = function (parsedStyle) {
        if (parsedStyle.points && isArray(parsedStyle.points.points)) {
            var points = parsedStyle.points.points;
            // FIXME: account for miter lineJoin
            var minX = Math.min.apply(Math, __spreadArray([], __read(points.map(function (point) { return point[0]; })), false));
            var maxX = Math.max.apply(Math, __spreadArray([], __read(points.map(function (point) { return point[0]; })), false));
            var minY = Math.min.apply(Math, __spreadArray([], __read(points.map(function (point) { return point[1]; })), false));
            var maxY = Math.max.apply(Math, __spreadArray([], __read(points.map(function (point) { return point[1]; })), false));
            var width = maxX - minX;
            var height = maxY - minY;
            return {
                width: width,
                height: height,
            };
        }
        return {
            width: 0,
            height: 0,
        };
    };
    return PolylineUpdater;
}());

var RectUpdater = /** @class */ (function () {
    function RectUpdater() {
    }
    RectUpdater.prototype.update = function (parsedStyle, object) {
        var img = parsedStyle.img, _a = parsedStyle.width, width = _a === void 0 ? 0 : _a, _b = parsedStyle.height, height = _b === void 0 ? 0 : _b;
        var contentWidth = width;
        var contentHeight = height;
        // resize with HTMLImageElement's size
        if (img && !isString(img)) {
            if (!contentWidth) {
                contentWidth = img.width;
                parsedStyle.width = contentWidth;
            }
            if (!contentHeight) {
                contentHeight = img.height;
                parsedStyle.height = contentHeight;
            }
        }
        return {
            width: contentWidth,
            height: contentHeight,
        };
    };
    return RectUpdater;
}());

var TextUpdater = /** @class */ (function () {
    function TextUpdater(globalRuntime) {
        this.globalRuntime = globalRuntime;
    }
    TextUpdater.prototype.isReadyToMeasure = function (parsedStyle, object) {
        var text = parsedStyle.text, textAlign = parsedStyle.textAlign, textBaseline = parsedStyle.textBaseline, fontSize = parsedStyle.fontSize, fontStyle = parsedStyle.fontStyle, fontWeight = parsedStyle.fontWeight, fontVariant = parsedStyle.fontVariant, lineWidth = parsedStyle.lineWidth;
        return (text &&
            fontSize &&
            fontStyle &&
            fontWeight &&
            fontVariant &&
            textAlign &&
            textBaseline &&
            !isNil(lineWidth));
    };
    TextUpdater.prototype.update = function (parsedStyle, object) {
        var _a, _b;
        var text = parsedStyle.text, textAlign = parsedStyle.textAlign, lineWidth = parsedStyle.lineWidth, textBaseline = parsedStyle.textBaseline, dx = parsedStyle.dx, dy = parsedStyle.dy;
        if (!this.isReadyToMeasure(parsedStyle, object)) {
            parsedStyle.metrics = {
                font: '',
                width: 0,
                height: 0,
                lines: [],
                lineWidths: [],
                lineHeight: 0,
                maxLineWidth: 0,
                fontProperties: {
                    ascent: 0,
                    descent: 0,
                    fontSize: 0,
                },
                lineMetrics: [],
            };
            return {
                width: 0,
                height: 0,
                x: 0,
                y: 0,
                offsetX: 0,
                offsetY: 0,
            };
        }
        var offscreenCanvas = (((_b = (_a = object === null || object === void 0 ? void 0 : object.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView) === null || _b === void 0 ? void 0 : _b.getConfig()) || {}).offscreenCanvas;
        var metrics = this.globalRuntime.textService.measureText(text, parsedStyle, offscreenCanvas);
        parsedStyle.metrics = metrics;
        var width = metrics.width, height = metrics.height, lineHeight = metrics.lineHeight, fontProperties = metrics.fontProperties;
        // anchor is left-top by default
        var halfExtents = [width / 2, height / 2, 0];
        // default 'left'
        var anchor = [0, 1];
        var lineXOffset = 0;
        if (textAlign === 'center' || textAlign === 'middle') {
            lineXOffset = lineWidth / 2;
            anchor = [0.5, 1];
        }
        else if (textAlign === 'right' || textAlign === 'end') {
            lineXOffset = lineWidth;
            anchor = [1, 1];
        }
        var lineYOffset = 0;
        if (textBaseline === 'middle') {
            // eslint-disable-next-line prefer-destructuring
            lineYOffset = halfExtents[1];
        }
        else if (textBaseline === 'top' || textBaseline === 'hanging') {
            lineYOffset = halfExtents[1] * 2;
        }
        else if (textBaseline === 'alphabetic') {
            // prevent calling getImageData for ascent metrics
            lineYOffset = this.globalRuntime.enableCSSParsing
                ? lineHeight - fontProperties.ascent
                : 0;
        }
        else if (textBaseline === 'bottom' || textBaseline === 'ideographic') {
            lineYOffset = 0;
        }
        // TODO: ideographic & bottom
        if (dx) {
            lineXOffset += dx;
        }
        if (dy) {
            lineYOffset += dy;
        }
        // update anchor
        parsedStyle.anchor = [anchor[0], anchor[1], 0];
        return {
            width: halfExtents[0] * 2,
            height: halfExtents[1] * 2,
            offsetX: lineXOffset,
            offsetY: lineYOffset,
        };
    };
    return TextUpdater;
}());

function isFederatedEvent(value) {
    return !!value.type;
}
/**
 * An DOM-compatible synthetic event implementation that is "forwarded" on behalf of an original
 * FederatedEvent or native Event.
 */
var FederatedEvent = /** @class */ (function () {
    /**
     * The event boundary which manages this event. Propagation can only occur
     *  within the boundary's jurisdiction.
     */
    function FederatedEvent(manager) {
        /**
         * The propagation phase.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
         */
        this.eventPhase = FederatedEvent.prototype.NONE;
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Event/bubbles
         */
        this.bubbles = true;
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Event/cancelBubble
         */
        this.cancelBubble = true;
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Event/cancelable
         */
        this.cancelable = false;
        /** Flags whether the default response of the user agent was prevent through this event. */
        this.defaultPrevented = false;
        /** Flags whether propagation was stopped. */
        this.propagationStopped = false;
        /** Flags whether propagation was immediately stopped. */
        this.propagationImmediatelyStopped = false;
        /**
         * The coordinates of the evnet relative to the nearest DOM layer.
         * This is a non-standard property.
         */
        this.layer = new Point();
        /**
         * The coordinates of the event relative to the DOM document.
         * This is a non-standard property.
         * relative to the DOM document.
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/pageX
         */
        this.page = new Point();
        /**
         * relative to Canvas, origin is left-top
         */
        this.canvas = new Point();
        /**
         * relative to Viewport, account for Camera
         */
        this.viewport = new Point();
        this.composed = false;
        this.NONE = 0;
        this.CAPTURING_PHASE = 1;
        this.AT_TARGET = 2;
        this.BUBBLING_PHASE = 3;
        this.manager = manager;
    }
    Object.defineProperty(FederatedEvent.prototype, "name", {
        /**
         * @deprecated
         */
        get: function () {
            return this.type;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "layerX", {
        get: function () {
            return this.layer.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "layerY", {
        get: function () {
            return this.layer.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "pageX", {
        get: function () {
            return this.page.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "pageY", {
        get: function () {
            return this.page.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "x", {
        get: function () {
            return this.canvas.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "y", {
        get: function () {
            return this.canvas.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "canvasX", {
        get: function () {
            return this.canvas.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "canvasY", {
        get: function () {
            return this.canvas.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "viewportX", {
        get: function () {
            return this.viewport.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedEvent.prototype, "viewportY", {
        get: function () {
            return this.viewport.y;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * The propagation path for this event
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Event/composedPath
     *
     * So composedPath()[0] represents the original target.
     * @see https://polymer-library.polymer-project.org/3.0/docs/devguide/events#retargeting
     */
    FederatedEvent.prototype.composedPath = function () {
        if (this.manager && (!this.path || this.path[0] !== this.target)) {
            this.path = this.target ? this.manager.propagationPath(this.target) : [];
        }
        return this.path;
    };
    Object.defineProperty(FederatedEvent.prototype, "propagationPath", {
        /**
         * @deprecated
         */
        get: function () {
            return this.composedPath();
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Event/preventDefault
     */
    FederatedEvent.prototype.preventDefault = function () {
        if (this.nativeEvent instanceof Event && this.nativeEvent.cancelable) {
            this.nativeEvent.preventDefault();
        }
        this.defaultPrevented = true;
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopImmediatePropagation
     */
    FederatedEvent.prototype.stopImmediatePropagation = function () {
        this.propagationImmediatelyStopped = true;
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopPropagation
     */
    FederatedEvent.prototype.stopPropagation = function () {
        this.propagationStopped = true;
    };
    /**
     * added for compatibility with DOM Event,
     * deprecated props and methods
     */
    FederatedEvent.prototype.initEvent = function () { };
    FederatedEvent.prototype.initUIEvent = function () { };
    FederatedEvent.prototype.clone = function () {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    return FederatedEvent;
}());

var FederatedMouseEvent = /** @class */ (function (_super) {
    __extends(FederatedMouseEvent, _super);
    function FederatedMouseEvent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**
         * The coordinates of the mouse event relative to the canvas.
         */
        _this.client = new Point();
        /**
         * The movement in this pointer relative to the last `mousemove` event.
         */
        _this.movement = new Point();
        /**
         * The offset of the pointer coordinates w.r.t. target DisplayObject in world space. This is
         * not supported at the moment.
         */
        _this.offset = new Point();
        /**
         * The pointer coordinates in world space.
         */
        _this.global = new Point();
        /**
         * The pointer coordinates in sceen space.
         */
        _this.screen = new Point();
        return _this;
    }
    Object.defineProperty(FederatedMouseEvent.prototype, "clientX", {
        get: function () {
            return this.client.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "clientY", {
        get: function () {
            return this.client.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "movementX", {
        get: function () {
            return this.movement.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "movementY", {
        get: function () {
            return this.movement.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "offsetX", {
        get: function () {
            return this.offset.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "offsetY", {
        get: function () {
            return this.offset.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "globalX", {
        get: function () {
            return this.global.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "globalY", {
        get: function () {
            return this.global.y;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "screenX", {
        get: function () {
            return this.screen.x;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FederatedMouseEvent.prototype, "screenY", {
        get: function () {
            return this.screen.y;
        },
        enumerable: false,
        configurable: true
    });
    FederatedMouseEvent.prototype.getModifierState = function (key) {
        return ('getModifierState' in this.nativeEvent &&
            this.nativeEvent.getModifierState(key));
    };
    FederatedMouseEvent.prototype.initMouseEvent = function () {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    return FederatedMouseEvent;
}(FederatedEvent));

// @ts-ignore
var FederatedPointerEvent = /** @class */ (function (_super) {
    __extends(FederatedPointerEvent, _super);
    function FederatedPointerEvent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**
         * The width of the pointer's contact along the x-axis, measured in CSS pixels.
         * radiusX of TouchEvents will be represented by this value.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/width
         */
        _this.width = 0;
        /**
         * The height of the pointer's contact along the y-axis, measured in CSS pixels.
         * radiusY of TouchEvents will be represented by this value.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/height
         */
        _this.height = 0;
        /**
         * Indicates whether or not the pointer device that created the event is the primary pointer.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/isPrimary
         */
        _this.isPrimary = false;
        return _this;
    }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents
     */
    FederatedPointerEvent.prototype.getCoalescedEvents = function () {
        if (this.type === 'pointermove' ||
            this.type === 'mousemove' ||
            this.type === 'touchmove') {
            // @ts-ignore
            return [this];
        }
        return [];
    };
    /**
     * @see https://chromestatus.com/feature/5765569655603200
     */
    FederatedPointerEvent.prototype.getPredictedEvents = function () {
        throw new Error('getPredictedEvents is not supported!');
    };
    /**
     * @see https://github.com/antvis/G/issues/1115
     * We currently reuses event objects in the event system,
     * avoiding the creation of a large number of event objects.
     * Reused objects are only used to carry different data,
     * such as coordinate information, native event objects,
     * and therefore the lifecycle is limited to the event handler,
     * which can lead to unintended consequences if an attempt is made to cache the entire event object.
     *
     * Therefore, while keeping the above performance considerations in mind, it is possible to provide a clone method that creates a new object when the user really wants to cache it, e.g.
     */
    FederatedPointerEvent.prototype.clone = function () {
        return this.manager.clonePointerEvent(this);
    };
    return FederatedPointerEvent;
}(FederatedMouseEvent));

// @ts-ignore
var FederatedWheelEvent = /** @class */ (function (_super) {
    __extends(FederatedWheelEvent, _super);
    function FederatedWheelEvent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FederatedWheelEvent.prototype.clone = function () {
        return this.manager.cloneWheelEvent(this);
    };
    return FederatedWheelEvent;
}(FederatedMouseEvent));

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events
 *
 * @example
  const event = new CustomEvent('build', { detail: { prop1: 'xx' } });
  circle.addEventListener('build', (e) => {
    e.target; // circle
    e.detail; // { prop1: 'xx' }
  });

  circle.dispatchEvent(event);
 */
var CustomEvent = /** @class */ (function (_super) {
    __extends(CustomEvent, _super);
    // eslint-disable-next-line @typescript-eslint/ban-types
    function CustomEvent(eventName, object) {
        var _this = _super.call(this, null) || this;
        _this.type = eventName;
        _this.detail = object;
        // compatible with G 3.0
        Object.assign(_this, object);
        return _this;
    }
    return CustomEvent;
}(FederatedEvent));

var DELEGATION_SPLITTER = ':';
/**
 * Objects that can receive events and may have listeners for them.
 * eg. Element, Canvas, DisplayObject
 * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
 */
var EventTarget = /** @class */ (function () {
    function EventTarget() {
        /**
         * event emitter
         */
        this.emitter = new EventEmitter();
    }
    /**
     * @deprecated
     * @alias addEventListener
     */
    EventTarget.prototype.on = function (type, listener, options) {
        this.addEventListener(type, listener, options);
        return this;
    };
    /**
     * support `capture` & `once` in options
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener
     */
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        var capture = (isBoolean(options) && options) || (isObject(options) && options.capture);
        var once = isObject(options) && options.once;
        var context = isFunction(listener) ? undefined : listener;
        // compatible with G 3.0
        // support using delegate name in event type, eg. 'node:click'
        var useDelegatedName = false;
        var delegatedName = '';
        if (type.indexOf(DELEGATION_SPLITTER) > -1) {
            var _a = __read(type.split(DELEGATION_SPLITTER), 2), name_1 = _a[0], eventType = _a[1];
            type = eventType;
            delegatedName = name_1;
            useDelegatedName = true;
        }
        type = capture ? "".concat(type, "capture") : type;
        listener = isFunction(listener) ? listener : listener.handleEvent;
        // compatible with G 3.0
        if (useDelegatedName) {
            var originListener_1 = listener;
            listener = function () {
                var _a;
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (((_a = args[0].target) === null || _a === void 0 ? void 0 : _a.name) !== delegatedName) {
                    return;
                }
                // @ts-ignore
                originListener_1.apply(void 0, __spreadArray([], __read(args), false));
            };
        }
        if (once) {
            this.emitter.once(type, listener, context);
        }
        else {
            this.emitter.on(type, listener, context);
        }
        return this;
    };
    /**
     * @deprecated
     * @alias removeEventListener
     */
    EventTarget.prototype.off = function (type, listener, options) {
        if (type) {
            this.removeEventListener(type, listener, options);
        }
        else {
            // remove all listeners
            this.removeAllEventListeners();
        }
        return this;
    };
    EventTarget.prototype.removeAllEventListeners = function () {
        this.emitter.removeAllListeners();
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
        var capture = (isBoolean(options) && options) || (isObject(options) && options.capture);
        var context = isFunction(listener) ? undefined : listener;
        type = capture ? "".concat(type, "capture") : type;
        listener = isFunction(listener) ? listener : listener === null || listener === void 0 ? void 0 : listener.handleEvent;
        this.emitter.off(type, listener, context);
        return this;
    };
    /**
     * @deprecated
     * @alias dispatchEvent
     */
    // eslint-disable-next-line @typescript-eslint/ban-types
    EventTarget.prototype.emit = function (eventName, object) {
        this.dispatchEvent(new CustomEvent(eventName, object));
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent
     */
    EventTarget.prototype.dispatchEvent = function (e, skipPropagate) {
        var _a, _b;
        if (skipPropagate === void 0) { skipPropagate = false; }
        if (!isFederatedEvent(e)) {
            throw new Error('DisplayObject cannot propagate events outside of the Federated Events API');
        }
        // should account for Element / Document / Canvas
        var canvas;
        // @ts-ignore
        if (this.document) {
            canvas = this;
            // @ts-ignore
        }
        else if (this.defaultView) {
            canvas = this.defaultView;
        }
        else {
            canvas = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView;
        }
        // assign event manager
        if (canvas) {
            e.manager = canvas.getEventService() || null;
            if (!e.manager) {
                return false;
            }
            e.defaultPrevented = false;
            e.path = [];
            if (!skipPropagate) {
                e.target = this;
            }
            (_b = e.manager) === null || _b === void 0 ? void 0 : _b.dispatchEvent(e, e.type, skipPropagate);
        }
        return !e.defaultPrevented;
    };
    return EventTarget;
}());

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Node
 */
var Node = /** @class */ (function (_super) {
    __extends(Node, _super);
    function Node() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.shadow = false;
        /**
         * points to canvas.document
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument
         */
        _this.ownerDocument = null;
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/isConnected
         * @example
            circle.isConnected; // false
            canvas.appendChild(circle);
            circle.isConnected; // true
         */
        _this.isConnected = false;
        /**
         * Returns node's node document's document base URL.
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node
         */
        _this.baseURI = '';
        /**
         * Returns the children.
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/childNodes
         */
        _this.childNodes = [];
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeType
         */
        _this.nodeType = 0;
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeName
         */
        _this.nodeName = '';
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/nodeValue
         */
        _this.nodeValue = null;
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/ParentNode
         */
        _this.parentNode = null;
        return _this;
    }
    Node.isNode = function (target) {
        return !!target.childNodes;
    };
    Object.defineProperty(Node.prototype, "textContent", {
        /**
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/textContent
         */
        get: function () {
            var e_1, _a;
            var out = '';
            if (this.nodeName === Shape.TEXT) {
                // @ts-ignore
                out += this.style.text;
            }
            try {
                for (var _b = __values(this.childNodes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var child = _c.value;
                    if (child.nodeName === Shape.TEXT) {
                        out += child.nodeValue;
                    }
                    else {
                        out += child.textContent;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return out;
        },
        set: function (content) {
            var _this = this;
            // remove all children
            this.childNodes.slice().forEach(function (child) {
                _this.removeChild(child);
            });
            if (this.nodeName === Shape.TEXT) {
                // @ts-ignore
                this.style.text = "".concat(content);
            }
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/getRootNode
     */
    Node.prototype.getRootNode = function (opts) {
        if (opts === void 0) { opts = {}; }
        if (this.parentNode) {
            return this.parentNode.getRootNode(opts);
        }
        if (opts.composed && this.host) {
            return this.host.getRootNode(opts);
        }
        return this;
    };
    Node.prototype.hasChildNodes = function () {
        return this.childNodes.length > 0;
    };
    Node.prototype.isDefaultNamespace = function (namespace) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Node.prototype.lookupNamespaceURI = function (prefix) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Node.prototype.lookupPrefix = function (namespace) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Node.prototype.normalize = function () {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Node/isEqualNode
     */
    Node.prototype.isEqualNode = function (otherNode) {
        // TODO: compare 2 nodes, not sameness
        return this === otherNode;
    };
    Node.prototype.isSameNode = function (otherNode) {
        return this.isEqualNode(otherNode);
    };
    Object.defineProperty(Node.prototype, "parent", {
        /**
         * @deprecated
         * @alias parentNode
         */
        get: function () {
            return this.parentNode;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "parentElement", {
        get: function () {
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "nextSibling", {
        get: function () {
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "previousSibling", {
        get: function () {
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "firstChild", {
        get: function () {
            return this.childNodes.length > 0 ? this.childNodes[0] : null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Node.prototype, "lastChild", {
        get: function () {
            return this.childNodes.length > 0
                ? this.childNodes[this.childNodes.length - 1]
                : null;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/compareDocumentPosition
     * @see https://github.com/b-fuze/deno-dom/blob/master/src/dom/node.ts#L338
     */
    Node.prototype.compareDocumentPosition = function (other) {
        var _a;
        if (other === this) {
            // same node
            return 0;
        }
        // if (!(other instanceof Node)) {
        //   throw new TypeError(
        //     'Node.compareDocumentPosition: Argument 1 does not implement interface Node.',
        //   );
        // }
        var node1Root = other;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var node2Root = this;
        var node1Hierarchy = [node1Root];
        var node2Hierarchy = [node2Root];
        while ((_a = node1Root.parentNode) !== null && _a !== void 0 ? _a : node2Root.parentNode) {
            node1Root = node1Root.parentNode
                ? (node1Hierarchy.push(node1Root.parentNode), node1Root.parentNode)
                : node1Root;
            node2Root = node2Root.parentNode
                ? (node2Hierarchy.push(node2Root.parentNode), node2Root.parentNode)
                : node2Root;
        }
        // Check if they don't share the same root node
        if (node1Root !== node2Root) {
            return (Node.DOCUMENT_POSITION_DISCONNECTED |
                Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC |
                Node.DOCUMENT_POSITION_PRECEDING);
        }
        var longerHierarchy = node1Hierarchy.length > node2Hierarchy.length
            ? node1Hierarchy
            : node2Hierarchy;
        var shorterHierarchy = longerHierarchy === node1Hierarchy ? node2Hierarchy : node1Hierarchy;
        // Check if either is a container of the other
        if (longerHierarchy[longerHierarchy.length - shorterHierarchy.length] ===
            shorterHierarchy[0]) {
            return longerHierarchy === node1Hierarchy
                ? // other is a child of this
                    Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING
                : // this is a child of other
                    Node.DOCUMENT_POSITION_CONTAINS | Node.DOCUMENT_POSITION_PRECEDING;
        }
        // Find their first common ancestor and see whether they
        // are preceding or following
        var longerStart = longerHierarchy.length - shorterHierarchy.length;
        for (var i = shorterHierarchy.length - 1; i >= 0; i--) {
            var shorterHierarchyNode = shorterHierarchy[i];
            var longerHierarchyNode = longerHierarchy[longerStart + i];
            // We found the first common ancestor
            if (longerHierarchyNode !== shorterHierarchyNode) {
                var siblings = shorterHierarchyNode.parentNode.childNodes;
                if (siblings.indexOf(shorterHierarchyNode) <
                    siblings.indexOf(longerHierarchyNode)) {
                    // Shorter is before longer
                    if (shorterHierarchy === node1Hierarchy) {
                        // Other is before this
                        return Node.DOCUMENT_POSITION_PRECEDING;
                    }
                    else {
                        // This is before other
                        return Node.DOCUMENT_POSITION_FOLLOWING;
                    }
                }
                else {
                    // Longer is before shorter
                    if (longerHierarchy === node1Hierarchy) {
                        // Other is before this
                        return Node.DOCUMENT_POSITION_PRECEDING;
                    }
                    else {
                        // Other is after this
                        return Node.DOCUMENT_POSITION_FOLLOWING;
                    }
                }
            }
        }
        return Node.DOCUMENT_POSITION_FOLLOWING;
    };
    /**
     * @deprecated
     * @alias contains
     */
    Node.prototype.contain = function (other) {
        return this.contains(other);
    };
    Node.prototype.contains = function (other) {
        // the node itself, one of its direct children
        var tmp = other;
        // @see https://developer.mozilla.org/en-US/docs/Web/API/Node/contains
        while (tmp && this !== tmp) {
            tmp = tmp.parentNode;
        }
        return !!tmp;
    };
    Node.prototype.getAncestor = function (n) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var temp = this;
        while (n > 0 && temp) {
            temp = temp.parentNode;
            n--;
        }
        return temp;
    };
    Node.prototype.forEach = function (callback, assigned) {
        if (assigned === void 0) { assigned = false; }
        if (!callback(this)) {
            (assigned ? this.childNodes.slice() : this.childNodes).forEach(function (child) {
                child.forEach(callback);
            });
        }
    };
    /**
     * Both nodes are in different documents or different trees in the same document.
     */
    Node.DOCUMENT_POSITION_DISCONNECTED = 1;
    /**
     * otherNode precedes the node in either a pre-order depth-first traversal
     * of a tree containing both (e.g., as an ancestor or previous sibling or a descendant of a previous sibling or previous sibling of an ancestor) or (if they are disconnected) in an arbitrary but consistent ordering.
     */
    Node.DOCUMENT_POSITION_PRECEDING = 2;
    /**
     * otherNode follows the node in either a pre-order depth-first traversal of a tree containing both (e.g., as a descendant or following sibling or a descendant of a following sibling or following sibling of an ancestor) or (if they are disconnected) in an arbitrary but consistent ordering.
     */
    Node.DOCUMENT_POSITION_FOLLOWING = 4;
    /**
     * otherNode is an ancestor of the node.
     */
    Node.DOCUMENT_POSITION_CONTAINS = 8;
    /**
     * otherNode is a descendant of the node.
     */
    Node.DOCUMENT_POSITION_CONTAINED_BY = 16;
    /**
     * The result relies upon arbitrary and/or implementation-specific behavior and is not guaranteed to be portable.
     */
    Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32;
    return Node;
}(EventTarget));

var PROPAGATION_LIMIT = 2048;
var EventService = /** @class */ (function () {
    function EventService(globalRuntime, context) {
        var _this = this;
        this.globalRuntime = globalRuntime;
        this.context = context;
        this.emitter = new EventEmitter();
        this.cursor = 'default';
        this.mappingTable = {};
        this.mappingState = {
            trackingData: {},
        };
        this.eventPool = new Map();
        this.tmpMatrix = mat4.create();
        this.tmpVec3 = vec3.create();
        this.onPointerDown = function (from) {
            var e = _this.createPointerEvent(from);
            _this.dispatchEvent(e, 'pointerdown');
            if (e.pointerType === 'touch') {
                _this.dispatchEvent(e, 'touchstart');
            }
            else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
                var isRightButton = e.button === 2;
                _this.dispatchEvent(e, isRightButton ? 'rightdown' : 'mousedown');
            }
            var trackingData = _this.trackingData(from.pointerId);
            trackingData.pressTargetsByButton[from.button] = e.composedPath();
            _this.freeEvent(e);
        };
        this.onPointerUp = function (from) {
            var _a;
            var now = clock.now();
            var e = _this.createPointerEvent(from, undefined, undefined, _this.context.config.alwaysTriggerPointerEventOnCanvas
                ? _this.rootTarget
                : undefined);
            _this.dispatchEvent(e, 'pointerup');
            if (e.pointerType === 'touch') {
                _this.dispatchEvent(e, 'touchend');
            }
            else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
                var isRightButton = e.button === 2;
                _this.dispatchEvent(e, isRightButton ? 'rightup' : 'mouseup');
            }
            var trackingData = _this.trackingData(from.pointerId);
            var pressTarget = _this.findMountedTarget(trackingData.pressTargetsByButton[from.button]);
            var clickTarget = pressTarget;
            // pointerupoutside only bubbles. It only bubbles upto the parent that doesn't contain
            // the pointerup location.
            if (pressTarget && !e.composedPath().includes(pressTarget)) {
                var currentTarget = pressTarget;
                while (currentTarget && !e.composedPath().includes(currentTarget)) {
                    e.currentTarget = currentTarget;
                    _this.notifyTarget(e, 'pointerupoutside');
                    if (e.pointerType === 'touch') {
                        _this.notifyTarget(e, 'touchendoutside');
                    }
                    else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
                        var isRightButton = e.button === 2;
                        _this.notifyTarget(e, isRightButton ? 'rightupoutside' : 'mouseupoutside');
                    }
                    if (Node.isNode(currentTarget)) {
                        currentTarget = currentTarget.parentNode;
                    }
                }
                delete trackingData.pressTargetsByButton[from.button];
                // currentTarget is the most specific ancestor holding both the pointerdown and pointerup
                // targets. That is - it's our click target!
                clickTarget = currentTarget;
            }
            if (clickTarget) {
                var clickEvent = _this.clonePointerEvent(e, 'click');
                clickEvent.target = clickTarget;
                clickEvent.path = [];
                if (!trackingData.clicksByButton[from.button]) {
                    trackingData.clicksByButton[from.button] = {
                        clickCount: 0,
                        target: clickEvent.target,
                        timeStamp: now,
                    };
                }
                var clickHistory = trackingData.clicksByButton[from.button];
                if (clickHistory.target === clickEvent.target &&
                    now - clickHistory.timeStamp < 200) {
                    ++clickHistory.clickCount;
                }
                else {
                    clickHistory.clickCount = 1;
                }
                clickHistory.target = clickEvent.target;
                clickHistory.timeStamp = now;
                clickEvent.detail = clickHistory.clickCount;
                // @see https://github.com/antvis/G/issues/1091
                if (!((_a = e.detail) === null || _a === void 0 ? void 0 : _a.preventClick)) {
                    if (!_this.context.config.useNativeClickEvent &&
                        (clickEvent.pointerType === 'mouse' ||
                            clickEvent.pointerType === 'touch')) {
                        _this.dispatchEvent(clickEvent, 'click');
                    }
                    _this.dispatchEvent(clickEvent, 'pointertap');
                }
                _this.freeEvent(clickEvent);
            }
            _this.freeEvent(e);
        };
        this.onPointerMove = function (from) {
            var e = _this.createPointerEvent(from, undefined, undefined, _this.context.config.alwaysTriggerPointerEventOnCanvas
                ? _this.rootTarget
                : undefined);
            var isMouse = e.pointerType === 'mouse' || e.pointerType === 'pen';
            var trackingData = _this.trackingData(from.pointerId);
            var outTarget = _this.findMountedTarget(trackingData.overTargets);
            // First pointerout/pointerleave
            if (trackingData.overTargets && outTarget !== e.target) {
                // pointerout always occurs on the overTarget when the pointer hovers over another element.
                var outType = from.type === 'mousemove' ? 'mouseout' : 'pointerout';
                var outEvent = _this.createPointerEvent(from, outType, outTarget || undefined);
                _this.dispatchEvent(outEvent, 'pointerout');
                if (isMouse)
                    _this.dispatchEvent(outEvent, 'mouseout');
                // If the pointer exits overTarget and its descendants, then a pointerleave event is also fired. This event
                // is dispatched to all ancestors that no longer capture the pointer.
                if (!e.composedPath().includes(outTarget)) {
                    var leaveEvent = _this.createPointerEvent(from, 'pointerleave', outTarget || undefined);
                    leaveEvent.eventPhase = leaveEvent.AT_TARGET;
                    while (leaveEvent.target &&
                        !e.composedPath().includes(leaveEvent.target)) {
                        leaveEvent.currentTarget = leaveEvent.target;
                        _this.notifyTarget(leaveEvent);
                        if (isMouse) {
                            _this.notifyTarget(leaveEvent, 'mouseleave');
                        }
                        if (Node.isNode(leaveEvent.target)) {
                            leaveEvent.target = leaveEvent.target.parentNode;
                        }
                    }
                    _this.freeEvent(leaveEvent);
                }
                _this.freeEvent(outEvent);
            }
            // Then pointerover
            if (outTarget !== e.target) {
                // pointerover always occurs on the new overTarget
                var overType = from.type === 'mousemove' ? 'mouseover' : 'pointerover';
                var overEvent = _this.clonePointerEvent(e, overType); // clone faster
                _this.dispatchEvent(overEvent, 'pointerover');
                if (isMouse)
                    _this.dispatchEvent(overEvent, 'mouseover');
                // Probe whether the newly hovered Node is an ancestor of the original overTarget.
                var overTargetAncestor = outTarget && Node.isNode(outTarget) && outTarget.parentNode;
                while (overTargetAncestor &&
                    overTargetAncestor !==
                        (Node.isNode(_this.rootTarget) && _this.rootTarget.parentNode)) {
                    if (overTargetAncestor === e.target)
                        break;
                    overTargetAncestor = overTargetAncestor.parentNode;
                }
                // The pointer has entered a non-ancestor of the original overTarget. This means we need a pointerentered
                // event.
                var didPointerEnter = !overTargetAncestor ||
                    overTargetAncestor ===
                        (Node.isNode(_this.rootTarget) && _this.rootTarget.parentNode);
                if (didPointerEnter) {
                    var enterEvent = _this.clonePointerEvent(e, 'pointerenter');
                    enterEvent.eventPhase = enterEvent.AT_TARGET;
                    while (enterEvent.target &&
                        enterEvent.target !== outTarget &&
                        enterEvent.target !==
                            (Node.isNode(_this.rootTarget) && _this.rootTarget.parentNode)) {
                        enterEvent.currentTarget = enterEvent.target;
                        _this.notifyTarget(enterEvent);
                        if (isMouse)
                            _this.notifyTarget(enterEvent, 'mouseenter');
                        if (Node.isNode(enterEvent.target)) {
                            enterEvent.target = enterEvent.target.parentNode;
                        }
                    }
                    _this.freeEvent(enterEvent);
                }
                _this.freeEvent(overEvent);
            }
            // Then pointermove
            _this.dispatchEvent(e, 'pointermove');
            if (e.pointerType === 'touch')
                _this.dispatchEvent(e, 'touchmove');
            if (isMouse) {
                _this.dispatchEvent(e, 'mousemove');
                _this.cursor = _this.getCursor(e.target);
            }
            trackingData.overTargets = e.composedPath();
            _this.freeEvent(e);
        };
        this.onPointerOut = function (from) {
            var trackingData = _this.trackingData(from.pointerId);
            if (trackingData.overTargets) {
                var isMouse = from.pointerType === 'mouse' || from.pointerType === 'pen';
                var outTarget = _this.findMountedTarget(trackingData.overTargets);
                // pointerout first
                var outEvent = _this.createPointerEvent(from, 'pointerout', outTarget || undefined);
                _this.dispatchEvent(outEvent);
                if (isMouse)
                    _this.dispatchEvent(outEvent, 'mouseout');
                // pointerleave(s) are also dispatched b/c the pointer must've left rootTarget and its descendants to
                // get an upstream pointerout event (upstream events do not know rootTarget has descendants).
                var leaveEvent = _this.createPointerEvent(from, 'pointerleave', outTarget || undefined);
                leaveEvent.eventPhase = leaveEvent.AT_TARGET;
                while (leaveEvent.target &&
                    leaveEvent.target !==
                        (Node.isNode(_this.rootTarget) && _this.rootTarget.parentNode)) {
                    leaveEvent.currentTarget = leaveEvent.target;
                    _this.notifyTarget(leaveEvent);
                    if (isMouse) {
                        _this.notifyTarget(leaveEvent, 'mouseleave');
                    }
                    if (Node.isNode(leaveEvent.target)) {
                        leaveEvent.target = leaveEvent.target.parentNode;
                    }
                }
                trackingData.overTargets = null;
                _this.freeEvent(outEvent);
                _this.freeEvent(leaveEvent);
            }
            _this.cursor = null;
        };
        this.onPointerOver = function (from) {
            var trackingData = _this.trackingData(from.pointerId);
            var e = _this.createPointerEvent(from);
            var isMouse = e.pointerType === 'mouse' || e.pointerType === 'pen';
            _this.dispatchEvent(e, 'pointerover');
            if (isMouse)
                _this.dispatchEvent(e, 'mouseover');
            if (e.pointerType === 'mouse')
                _this.cursor = _this.getCursor(e.target);
            // pointerenter events must be fired since the pointer entered from upstream.
            var enterEvent = _this.clonePointerEvent(e, 'pointerenter');
            enterEvent.eventPhase = enterEvent.AT_TARGET;
            while (enterEvent.target &&
                enterEvent.target !==
                    (Node.isNode(_this.rootTarget) && _this.rootTarget.parentNode)) {
                enterEvent.currentTarget = enterEvent.target;
                _this.notifyTarget(enterEvent);
                if (isMouse) {
                    // mouseenter should not bubble
                    // @see https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseenter_event#usage_notes
                    _this.notifyTarget(enterEvent, 'mouseenter');
                }
                if (Node.isNode(enterEvent.target)) {
                    enterEvent.target = enterEvent.target.parentNode;
                }
            }
            trackingData.overTargets = e.composedPath();
            _this.freeEvent(e);
            _this.freeEvent(enterEvent);
        };
        this.onPointerUpOutside = function (from) {
            var trackingData = _this.trackingData(from.pointerId);
            var pressTarget = _this.findMountedTarget(trackingData.pressTargetsByButton[from.button]);
            var e = _this.createPointerEvent(from);
            if (pressTarget) {
                var currentTarget = pressTarget;
                while (currentTarget) {
                    e.currentTarget = currentTarget;
                    _this.notifyTarget(e, 'pointerupoutside');
                    if (e.pointerType === 'touch') ;
                    else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
                        _this.notifyTarget(e, e.button === 2 ? 'rightupoutside' : 'mouseupoutside');
                    }
                    if (Node.isNode(currentTarget)) {
                        currentTarget = currentTarget.parentNode;
                    }
                }
                delete trackingData.pressTargetsByButton[from.button];
            }
            _this.freeEvent(e);
        };
        this.onWheel = function (from) {
            var wheelEvent = _this.createWheelEvent(from);
            _this.dispatchEvent(wheelEvent);
            _this.freeEvent(wheelEvent);
        };
        this.onClick = function (from) {
            if (_this.context.config.useNativeClickEvent) {
                var e = _this.createPointerEvent(from);
                _this.dispatchEvent(e);
                _this.freeEvent(e);
            }
        };
        this.onPointerCancel = function (from) {
            var e = _this.createPointerEvent(from, undefined, undefined, _this.context.config.alwaysTriggerPointerEventOnCanvas
                ? _this.rootTarget
                : undefined);
            _this.dispatchEvent(e);
            _this.freeEvent(e);
        };
    }
    EventService.prototype.init = function () {
        this.rootTarget = this.context.renderingContext.root.parentNode; // document
        this.addEventMapping('pointerdown', this.onPointerDown);
        this.addEventMapping('pointerup', this.onPointerUp);
        this.addEventMapping('pointermove', this.onPointerMove);
        this.addEventMapping('pointerout', this.onPointerOut);
        this.addEventMapping('pointerleave', this.onPointerOut);
        this.addEventMapping('pointercancel', this.onPointerCancel);
        this.addEventMapping('pointerover', this.onPointerOver);
        this.addEventMapping('pointerupoutside', this.onPointerUpOutside);
        this.addEventMapping('wheel', this.onWheel);
        this.addEventMapping('click', this.onClick);
    };
    EventService.prototype.destroy = function () {
        this.emitter.removeAllListeners();
        this.mappingTable = {};
        this.mappingState = {};
        this.eventPool.clear();
    };
    EventService.prototype.client2Viewport = function (client) {
        var bbox = this.context.contextService.getBoundingClientRect();
        return new Point(client.x - ((bbox === null || bbox === void 0 ? void 0 : bbox.left) || 0), client.y - ((bbox === null || bbox === void 0 ? void 0 : bbox.top) || 0));
    };
    EventService.prototype.viewport2Client = function (canvas) {
        var bbox = this.context.contextService.getBoundingClientRect();
        return new Point(canvas.x + ((bbox === null || bbox === void 0 ? void 0 : bbox.left) || 0), canvas.y + ((bbox === null || bbox === void 0 ? void 0 : bbox.top) || 0));
    };
    EventService.prototype.viewport2Canvas = function (_a) {
        var x = _a.x, y = _a.y;
        var canvas = this.rootTarget.defaultView;
        var camera = canvas.getCamera();
        var _b = this.context.config, width = _b.width, height = _b.height;
        var projectionMatrixInverse = camera.getPerspectiveInverse();
        var worldMatrix = camera.getWorldTransform();
        var vpMatrix = mat4.multiply(this.tmpMatrix, worldMatrix, projectionMatrixInverse);
        var viewport = vec3.set(this.tmpVec3, (x / width) * 2 - 1, (1 - y / height) * 2 - 1, 0);
        vec3.transformMat4(viewport, viewport, vpMatrix);
        return new Point(viewport[0], viewport[1]);
    };
    EventService.prototype.canvas2Viewport = function (canvasP) {
        var canvas = this.rootTarget.defaultView;
        var camera = canvas.getCamera();
        // World -> Clip
        var projectionMatrix = camera.getPerspective();
        var viewMatrix = camera.getViewTransform();
        var vpMatrix = mat4.multiply(this.tmpMatrix, projectionMatrix, viewMatrix);
        var clip = vec3.set(this.tmpVec3, canvasP.x, canvasP.y, 0);
        vec3.transformMat4(this.tmpVec3, this.tmpVec3, vpMatrix);
        // Clip -> NDC -> Viewport, flip Y
        var _a = this.context.config, width = _a.width, height = _a.height;
        return new Point(((clip[0] + 1) / 2) * width, (1 - (clip[1] + 1) / 2) * height);
    };
    EventService.prototype.setPickHandler = function (pickHandler) {
        this.pickHandler = pickHandler;
    };
    EventService.prototype.addEventMapping = function (type, fn) {
        if (!this.mappingTable[type]) {
            this.mappingTable[type] = [];
        }
        this.mappingTable[type].push({
            fn: fn,
            priority: 0,
        });
        this.mappingTable[type].sort(function (a, b) { return a.priority - b.priority; });
    };
    EventService.prototype.mapEvent = function (e) {
        if (!this.rootTarget) {
            return;
        }
        var mappers = this.mappingTable[e.type];
        if (mappers) {
            for (var i = 0, j = mappers.length; i < j; i++) {
                mappers[i].fn(e);
            }
        }
        else {
            console.warn("[EventService]: Event mapping not defined for ".concat(e.type));
        }
    };
    EventService.prototype.dispatchEvent = function (e, type, skipPropagate) {
        // Canvas should skip
        if (!skipPropagate) {
            e.propagationStopped = false;
            e.propagationImmediatelyStopped = false;
            this.propagate(e, type);
        }
        else {
            // target phase
            e.eventPhase = e.AT_TARGET;
            var canvas = this.rootTarget.defaultView || null;
            e.currentTarget = canvas;
            this.notifyListeners(e, type);
        }
        this.emitter.emit(type || e.type, e);
    };
    EventService.prototype.propagate = function (e, type) {
        if (!e.target) {
            return;
        }
        // [target, parent, root, Canvas]
        var composedPath = e.composedPath();
        // event flow: capture -> target -> bubbling
        // capture phase
        e.eventPhase = e.CAPTURING_PHASE;
        for (var i = composedPath.length - 1; i >= 1; i--) {
            e.currentTarget = composedPath[i];
            this.notifyTarget(e, type);
            if (e.propagationStopped || e.propagationImmediatelyStopped)
                return;
        }
        // target phase
        e.eventPhase = e.AT_TARGET;
        e.currentTarget = e.target;
        this.notifyTarget(e, type);
        if (e.propagationStopped || e.propagationImmediatelyStopped)
            return;
        // find current target in composed path
        var index = composedPath.indexOf(e.currentTarget);
        // bubbling phase
        e.eventPhase = e.BUBBLING_PHASE;
        for (var i = index + 1; i < composedPath.length; i++) {
            e.currentTarget = composedPath[i];
            this.notifyTarget(e, type);
            if (e.propagationStopped || e.propagationImmediatelyStopped)
                return;
        }
    };
    EventService.prototype.propagationPath = function (target) {
        var propagationPath = [target];
        var canvas = this.rootTarget.defaultView || null;
        if (canvas && canvas === target) {
            propagationPath.unshift(canvas.document);
            return propagationPath;
        }
        for (var i = 0; i < PROPAGATION_LIMIT && target !== this.rootTarget; i++) {
            // if (Node.isNode(target) && !target.parentNode) {
            //   throw new Error('Cannot find propagation path to disconnected target');
            // }
            if (Node.isNode(target) && target.parentNode) {
                // [target, parent, parent, root]
                propagationPath.push(target.parentNode);
                target = target.parentNode;
            }
        }
        if (canvas) {
            // @ts-ignore
            propagationPath.push(canvas);
        }
        return propagationPath;
    };
    EventService.prototype.hitTest = function (position) {
        var viewportX = position.viewportX, viewportY = position.viewportY;
        var _a = this.context.config, width = _a.width, height = _a.height, disableHitTesting = _a.disableHitTesting;
        // outside canvas
        if (viewportX < 0 ||
            viewportY < 0 ||
            viewportX > width ||
            viewportY > height) {
            return null;
        }
        return ((!disableHitTesting && this.pickHandler(position)) ||
            this.rootTarget || // return Document
            null);
    };
    /**
     * whether the native event trigger came from Canvas,
     * should account for HTML shape
     */
    EventService.prototype.isNativeEventFromCanvas = function (event) {
        var _a;
        var $el = this.context.contextService.getDomElement();
        var target = (_a = event.nativeEvent) === null || _a === void 0 ? void 0 : _a.target;
        if (target) {
            // from <canvas>
            if (target === $el) {
                return true;
            }
            // from <svg>
            if ($el && $el.contains) {
                return $el.contains(target);
            }
        }
        if (event.nativeEvent.composedPath) {
            return event.nativeEvent.composedPath().indexOf($el) > -1;
        }
        // account for Touch
        return false;
    };
    /**
     * Find HTML from composed path in native UI event.
     */
    EventService.prototype.getExistedHTML = function (event) {
        var e_1, _a;
        if (event.nativeEvent.composedPath) {
            try {
                for (var _b = __values(event.nativeEvent.composedPath()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var eventTarget = _c.value;
                    var existed = this.globalRuntime.nativeHTMLMap.get(eventTarget);
                    if (existed) {
                        return existed;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        return null;
    };
    EventService.prototype.pickTarget = function (event) {
        return this.hitTest({
            clientX: event.clientX,
            clientY: event.clientY,
            viewportX: event.viewportX,
            viewportY: event.viewportY,
            x: event.canvasX,
            y: event.canvasY,
        });
    };
    EventService.prototype.createPointerEvent = function (from, type, target, fallbackTarget) {
        var event = this.allocateEvent(FederatedPointerEvent);
        this.copyPointerData(from, event);
        this.copyMouseData(from, event);
        this.copyData(from, event);
        event.nativeEvent = from.nativeEvent;
        event.originalEvent = from;
        var existedHTML = this.getExistedHTML(event);
        event.target =
            target !== null && target !== void 0 ? target : (existedHTML ||
                (this.isNativeEventFromCanvas(event) && this.pickTarget(event)) ||
                fallbackTarget);
        if (typeof type === 'string') {
            event.type = type;
        }
        return event;
    };
    EventService.prototype.createWheelEvent = function (from) {
        var event = this.allocateEvent(FederatedWheelEvent);
        this.copyWheelData(from, event);
        this.copyMouseData(from, event);
        this.copyData(from, event);
        event.nativeEvent = from.nativeEvent;
        event.originalEvent = from;
        var existedHTML = this.getExistedHTML(event);
        event.target =
            existedHTML ||
                (this.isNativeEventFromCanvas(event) && this.pickTarget(event));
        return event;
    };
    EventService.prototype.trackingData = function (id) {
        if (!this.mappingState.trackingData[id]) {
            this.mappingState.trackingData[id] = {
                pressTargetsByButton: {},
                clicksByButton: {},
                overTarget: null,
            };
        }
        return this.mappingState.trackingData[id];
    };
    EventService.prototype.cloneWheelEvent = function (from) {
        var event = this.allocateEvent(FederatedWheelEvent);
        event.nativeEvent = from.nativeEvent;
        event.originalEvent = from.originalEvent;
        this.copyWheelData(from, event);
        this.copyMouseData(from, event);
        this.copyData(from, event);
        event.target = from.target;
        event.path = from.composedPath().slice();
        event.type = from.type;
        return event;
    };
    EventService.prototype.clonePointerEvent = function (from, type) {
        var event = this.allocateEvent(FederatedPointerEvent);
        event.nativeEvent = from.nativeEvent;
        event.originalEvent = from.originalEvent;
        this.copyPointerData(from, event);
        this.copyMouseData(from, event);
        this.copyData(from, event);
        event.target = from.target;
        event.path = from.composedPath().slice();
        event.type = type !== null && type !== void 0 ? type : event.type;
        return event;
    };
    EventService.prototype.copyPointerData = function (from, to) {
        // if (
        //   !(
        //     from instanceof FederatedPointerEvent &&
        //     to instanceof FederatedPointerEvent
        //   )
        // )
        //   return;
        to.pointerId = from.pointerId;
        to.width = from.width;
        to.height = from.height;
        to.isPrimary = from.isPrimary;
        to.pointerType = from.pointerType;
        to.pressure = from.pressure;
        to.tangentialPressure = from.tangentialPressure;
        to.tiltX = from.tiltX;
        to.tiltY = from.tiltY;
        to.twist = from.twist;
    };
    EventService.prototype.copyMouseData = function (from, to) {
        // if (
        //   !(
        //     from instanceof FederatedMouseEvent && to instanceof FederatedMouseEvent
        //   )
        // )
        //   return;
        to.altKey = from.altKey;
        to.button = from.button;
        to.buttons = from.buttons;
        to.ctrlKey = from.ctrlKey;
        to.metaKey = from.metaKey;
        to.shiftKey = from.shiftKey;
        to.client.copyFrom(from.client);
        to.movement.copyFrom(from.movement);
        to.canvas.copyFrom(from.canvas);
        to.screen.copyFrom(from.screen);
        to.global.copyFrom(from.global);
        to.offset.copyFrom(from.offset);
    };
    EventService.prototype.copyWheelData = function (from, to) {
        to.deltaMode = from.deltaMode;
        to.deltaX = from.deltaX;
        to.deltaY = from.deltaY;
        to.deltaZ = from.deltaZ;
    };
    EventService.prototype.copyData = function (from, to) {
        to.isTrusted = from.isTrusted;
        to.timeStamp = clock.now();
        to.type = from.type;
        to.detail = from.detail;
        to.view = from.view;
        to.page.copyFrom(from.page);
        to.viewport.copyFrom(from.viewport);
    };
    EventService.prototype.allocateEvent = function (constructor) {
        if (!this.eventPool.has(constructor)) {
            this.eventPool.set(constructor, []);
        }
        // @ts-ignore
        var event = this.eventPool.get(constructor).pop() ||
            new constructor(this);
        event.eventPhase = event.NONE;
        event.currentTarget = null;
        event.path = [];
        event.target = null;
        return event;
    };
    EventService.prototype.freeEvent = function (event) {
        if (event.manager !== this)
            throw new Error('It is illegal to free an event not managed by this EventBoundary!');
        var constructor = event.constructor;
        if (!this.eventPool.has(constructor)) {
            this.eventPool.set(constructor, []);
        }
        // @ts-ignore
        this.eventPool.get(constructor).push(event);
    };
    EventService.prototype.notifyTarget = function (e, type) {
        type = type !== null && type !== void 0 ? type : e.type;
        var key = e.eventPhase === e.CAPTURING_PHASE || e.eventPhase === e.AT_TARGET
            ? "".concat(type, "capture")
            : type;
        this.notifyListeners(e, key);
        if (e.eventPhase === e.AT_TARGET) {
            this.notifyListeners(e, type);
        }
    };
    EventService.prototype.notifyListeners = function (e, type) {
        // hack EventEmitter, stops if the `propagationImmediatelyStopped` flag is set
        // @ts-ignore
        var emitter = e.currentTarget.emitter;
        // @ts-ignore
        var listeners = emitter._events[type];
        if (!listeners)
            return;
        if ('fn' in listeners) {
            if (listeners.once) {
                emitter.removeListener(type, listeners.fn, undefined, true);
            }
            listeners.fn.call(e.currentTarget || listeners.context, e);
            // listeners.fn.call(listeners.context, e);
        }
        else {
            for (var i = 0; i < listeners.length && !e.propagationImmediatelyStopped; i++) {
                if (listeners[i].once) {
                    emitter.removeListener(type, listeners[i].fn, undefined, true);
                }
                listeners[i].fn.call(e.currentTarget || listeners[i].context, e);
                // listeners[i].fn.call(listeners[i].context, e);
            }
        }
    };
    /**
     * some detached nodes may exist in propagation path, need to skip them
     */
    EventService.prototype.findMountedTarget = function (propagationPath) {
        if (!propagationPath) {
            return null;
        }
        var currentTarget = propagationPath[propagationPath.length - 1];
        for (var i = propagationPath.length - 2; i >= 0; i--) {
            var target = propagationPath[i];
            if (target === this.rootTarget ||
                (Node.isNode(target) && target.parentNode === currentTarget)) {
                currentTarget = propagationPath[i];
            }
            else {
                break;
            }
        }
        return currentTarget;
    };
    EventService.prototype.getCursor = function (target) {
        var tmp = target;
        while (tmp) {
            var cursor = isElement(tmp) && tmp.getAttribute('cursor');
            if (cursor) {
                return cursor;
            }
            tmp = Node.isNode(tmp) && tmp.parentNode;
        }
    };
    return EventService;
}());

/**
 * used in following scenes:
 * - g `ctx.measureText`
 * - g-plugin-canvas-picker `ctx.isPointInPath`
 * - g-plugin-device-renderer `ctx.createLinearGradient` and generate texture
 *
 * @see https://blog.scottlogic.com/2020/03/19/offscreen-canvas.html
 */
var OffscreenCanvasCreator = /** @class */ (function () {
    function OffscreenCanvasCreator() {
    }
    OffscreenCanvasCreator.prototype.getOrCreateCanvas = function (offscreenCanvas, contextAttributes) {
        if (this.canvas) {
            return this.canvas;
        }
        // user-defined offscreen canvas
        if (offscreenCanvas || runtime.offscreenCanvas) {
            this.canvas = offscreenCanvas || runtime.offscreenCanvas;
            this.context = this.canvas.getContext('2d', contextAttributes);
        }
        else {
            try {
                // OffscreenCanvas2D measureText can be up to 40% faster.
                this.canvas = new window.OffscreenCanvas(0, 0);
                this.context = this.canvas.getContext('2d', contextAttributes);
                if (!this.context || !this.context.measureText) {
                    this.canvas = document.createElement('canvas');
                    this.context = this.canvas.getContext('2d');
                }
            }
            catch (ex) {
                this.canvas = document.createElement('canvas');
                this.context = this.canvas.getContext('2d', contextAttributes);
            }
        }
        this.canvas.width = 10;
        this.canvas.height = 10;
        return this.canvas;
    };
    OffscreenCanvasCreator.prototype.getOrCreateContext = function (offscreenCanvas, contextAttributes) {
        if (this.context) {
            return this.context;
        }
        this.getOrCreateCanvas(offscreenCanvas, contextAttributes);
        return this.context;
    };
    return OffscreenCanvasCreator;
}());

/**
 * why we need re-render
 */
var RenderReason;
(function (RenderReason) {
    RenderReason[RenderReason["CAMERA_CHANGED"] = 0] = "CAMERA_CHANGED";
    RenderReason[RenderReason["DISPLAY_OBJECT_CHANGED"] = 1] = "DISPLAY_OBJECT_CHANGED";
    RenderReason[RenderReason["NONE"] = 2] = "NONE";
})(RenderReason || (RenderReason = {}));

/**
 * Use frame renderer implemented by `g-canvas/svg/webgl`, in every frame we do followings:
 * * update & merge dirty rectangles
 * * begin frame
 * * filter by visible
 * * sort by z-index in scene graph
 * * culling with strategies registered in `g-canvas/webgl`
 * * end frame
 */
var RenderingService = /** @class */ (function () {
    function RenderingService(globalRuntime, context) {
        this.globalRuntime = globalRuntime;
        this.context = context;
        this.inited = false;
        this.stats = {
            /**
             * total display objects in scenegraph
             */
            total: 0,
            /**
             * number of display objects need to render in current frame
             */
            rendered: 0,
        };
        this.zIndexCounter = 0;
        this.hooks = {
            /**
             * called before any frame rendered
             */
            init: new SyncHook(),
            initAsync: new AsyncParallelHook(),
            /**
             * only dirty object which has sth changed will be rendered
             */
            dirtycheck: new SyncWaterfallHook(),
            /**
             * do culling
             */
            cull: new SyncWaterfallHook(),
            /**
             * called at beginning of each frame, won't get called if nothing to re-render
             */
            beginFrame: new SyncHook(),
            /**
             * called before every dirty object get rendered
             */
            beforeRender: new SyncHook(),
            /**
             * called when every dirty object rendering even it's culled
             */
            render: new SyncHook(),
            /**
             * called after every dirty object get rendered
             */
            afterRender: new SyncHook(),
            endFrame: new SyncHook(),
            destroy: new SyncHook(),
            /**
             * use async but faster method such as GPU-based picking in `g-plugin-device-renderer`
             */
            pick: new AsyncSeriesWaterfallHook(),
            /**
             * Unsafe but sync version of pick.
             */
            pickSync: new SyncWaterfallHook(),
            /**
             * used in event system
             */
            pointerDown: new SyncHook(),
            pointerUp: new SyncHook(),
            pointerMove: new SyncHook(),
            pointerOut: new SyncHook(),
            pointerOver: new SyncHook(),
            pointerWheel: new SyncHook(),
            pointerCancel: new SyncHook(),
            click: new SyncHook(),
        };
    }
    RenderingService.prototype.init = function (callback) {
        var _this = this;
        var context = __assign(__assign({}, this.globalRuntime), this.context);
        // register rendering plugins
        this.context.renderingPlugins.forEach(function (plugin) {
            plugin.apply(context, _this.globalRuntime);
        });
        this.hooks.init.call();
        if (this.hooks.initAsync.getCallbacksNum() === 0) {
            this.inited = true;
            callback();
        }
        else {
            this.hooks.initAsync.promise().then(function () {
                _this.inited = true;
                callback();
            });
        }
    };
    RenderingService.prototype.getStats = function () {
        return this.stats;
    };
    /**
     * Meet the following conditions:
     * * disable DirtyRectangleRendering
     * * camera changed
     */
    RenderingService.prototype.disableDirtyRectangleRendering = function () {
        var renderer = this.context.config.renderer;
        var enableDirtyRectangleRendering = renderer.getConfig().enableDirtyRectangleRendering;
        return (!enableDirtyRectangleRendering ||
            this.context.renderingContext.renderReasons.has(RenderReason.CAMERA_CHANGED));
    };
    RenderingService.prototype.render = function (canvasConfig, rerenderCallback) {
        var _this = this;
        this.stats.total = 0;
        this.stats.rendered = 0;
        this.zIndexCounter = 0;
        var renderingContext = this.context.renderingContext;
        this.globalRuntime.sceneGraphService.syncHierarchy(renderingContext.root);
        this.globalRuntime.sceneGraphService.triggerPendingEvents();
        if (renderingContext.renderReasons.size && this.inited) {
            // @ts-ignore
            renderingContext.dirtyRectangleRenderingDisabled =
                this.disableDirtyRectangleRendering();
            var onlyCameraChanged = renderingContext.renderReasons.size === 1 &&
                renderingContext.renderReasons.has(RenderReason.CAMERA_CHANGED);
            var shouldTriggerRenderHooks = !canvasConfig.disableRenderHooks ||
                !(canvasConfig.disableRenderHooks && onlyCameraChanged);
            if (shouldTriggerRenderHooks) {
                this.renderDisplayObject(renderingContext.root, canvasConfig, renderingContext);
            }
            this.hooks.beginFrame.call();
            if (shouldTriggerRenderHooks) {
                renderingContext.renderListCurrentFrame.forEach(function (object) {
                    _this.hooks.beforeRender.call(object);
                    _this.hooks.render.call(object);
                    _this.hooks.afterRender.call(object);
                });
            }
            this.hooks.endFrame.call();
            renderingContext.renderListCurrentFrame = [];
            renderingContext.renderReasons.clear();
            rerenderCallback();
        }
        // console.log('stats', this.stats);
    };
    RenderingService.prototype.renderDisplayObject = function (displayObject, canvasConfig, renderingContext) {
        var _this = this;
        var _a = canvasConfig.renderer.getConfig(), enableDirtyCheck = _a.enableDirtyCheck, enableCulling = _a.enableCulling;
        // recalc style values
        if (this.globalRuntime.enableCSSParsing) {
            this.globalRuntime.styleValueRegistry.recalc(displayObject);
        }
        // TODO: relayout
        // dirtycheck first
        var renderable = displayObject.renderable;
        var objectChanged = enableDirtyCheck
            ? // @ts-ignore
                renderable.dirty || renderingContext.dirtyRectangleRenderingDisabled
                    ? displayObject
                    : null
            : displayObject;
        if (objectChanged) {
            var objectToRender = enableCulling
                ? this.hooks.cull.call(objectChanged, this.context.camera)
                : objectChanged;
            if (objectToRender) {
                this.stats.rendered++;
                renderingContext.renderListCurrentFrame.push(objectToRender);
            }
        }
        displayObject.renderable.dirty = false;
        displayObject.sortable.renderOrder = this.zIndexCounter++;
        this.stats.total++;
        // sort is very expensive, use cached result if possible
        var sortable = displayObject.sortable;
        if (sortable.dirty) {
            this.sort(displayObject, sortable);
            sortable.dirty = false;
            sortable.dirtyChildren = [];
            sortable.dirtyReason = undefined;
        }
        // recursive rendering its children
        (sortable.sorted || displayObject.childNodes).forEach(function (child) {
            _this.renderDisplayObject(child, canvasConfig, renderingContext);
        });
    };
    RenderingService.prototype.sort = function (displayObject, sortable) {
        if (sortable.sorted &&
            sortable.dirtyReason !== SortReason.Z_INDEX_CHANGED) {
            // avoid re-sorting the whole children list
            sortable.dirtyChildren.forEach(function (child) {
                var index = displayObject.childNodes.indexOf(child);
                if (index === -1) {
                    // remove from sorted list
                    var index_1 = sortable.sorted.indexOf(child);
                    if (index_1 >= 0) {
                        sortable.sorted.splice(index_1, 1);
                    }
                }
                else {
                    if (sortable.sorted.length === 0) {
                        sortable.sorted.push(child);
                    }
                    else {
                        var index_2 = sortedIndex(sortable.sorted, child);
                        sortable.sorted.splice(index_2, 0, child);
                    }
                }
            });
        }
        else {
            sortable.sorted = displayObject.childNodes.slice().sort(sortByZIndex);
        }
    };
    RenderingService.prototype.destroy = function () {
        this.inited = false;
        this.hooks.destroy.call();
        this.globalRuntime.sceneGraphService.clearPendingEvents();
    };
    RenderingService.prototype.dirtify = function () {
        // need re-render
        this.context.renderingContext.renderReasons.add(RenderReason.DISPLAY_OBJECT_CHANGED);
    };
    return RenderingService;
}());

var ATTRIBUTE_REGEXP = /\[\s*(.*)=(.*)\s*\]/;
/**
 * support the following DOM API:
 * * getElementById
 * * getElementsByClassName
 * * getElementsByName
 * * getElementsByTag
 * * querySelector
 * * querySelectorAll
 */
var DefaultSceneGraphSelector = /** @class */ (function () {
    function DefaultSceneGraphSelector() {
    }
    DefaultSceneGraphSelector.prototype.selectOne = function (query, root) {
        var _this = this;
        if (query.startsWith('.')) {
            return root.find(function (node) {
                // return !node.shadow && node.id === query.substring(1);
                return (((node === null || node === void 0 ? void 0 : node.classList) || []).indexOf(_this.getIdOrClassname(query)) > -1);
            });
        }
        else if (query.startsWith('#')) {
            // getElementById('id')
            return root.find(function (node) {
                // return !node.shadow && node.id === query.substring(1);
                return node.id === _this.getIdOrClassname(query);
            });
        }
        else if (query.startsWith('[')) {
            var _a = this.getAttribute(query), name_1 = _a.name, value_1 = _a.value;
            if (name_1) {
                // getElementByName();
                return root.find(function (node) {
                    return root !== node &&
                        (name_1 === 'name'
                            ? node.name === value_1
                            : _this.attributeToString(node, name_1) === value_1);
                });
            }
            else {
                return null;
            }
        }
        else {
            // getElementsByTag('circle');
            return root.find(function (node) { return root !== node && node.nodeName === query; });
        }
    };
    DefaultSceneGraphSelector.prototype.selectAll = function (query, root) {
        var _this = this;
        // only support `[name="${name}"]` `.className` `#id`
        if (query.startsWith('.')) {
            // getElementsByClassName('className');
            // should not include itself
            return root.findAll(function (node) {
                return root !== node &&
                    ((node === null || node === void 0 ? void 0 : node.classList) || []).indexOf(_this.getIdOrClassname(query)) > -1;
            });
        }
        else if (query.startsWith('#')) {
            return root.findAll(function (node) {
                return root !== node &&
                    node.id === _this.getIdOrClassname(query);
            });
        }
        else if (query.startsWith('[')) {
            var _a = this.getAttribute(query), name_2 = _a.name, value_2 = _a.value;
            if (name_2) {
                // getElementsByName();
                return root.findAll(function (node) {
                    return root !== node &&
                        (name_2 === 'name'
                            ? node.name === value_2
                            : _this.attributeToString(node, name_2) === value_2);
                });
            }
            else {
                return [];
            }
        }
        else {
            // getElementsByTag('circle');
            return root.findAll(function (node) { return root !== node && node.nodeName === query; });
        }
    };
    DefaultSceneGraphSelector.prototype.is = function (query, node) {
        // a simple `matches` implementation
        if (query.startsWith('.')) {
            return node.className === this.getIdOrClassname(query);
        }
        else if (query.startsWith('#')) {
            return node.id === this.getIdOrClassname(query);
        }
        else if (query.startsWith('[')) {
            var _a = this.getAttribute(query), name_3 = _a.name, value = _a.value;
            return name_3 === 'name'
                ? node.name === value
                : this.attributeToString(node, name_3) === value;
        }
        else {
            return node.nodeName === query;
        }
    };
    DefaultSceneGraphSelector.prototype.getIdOrClassname = function (query) {
        return query.substring(1);
    };
    DefaultSceneGraphSelector.prototype.getAttribute = function (query) {
        var matches = query.match(ATTRIBUTE_REGEXP);
        var name = '';
        var value = '';
        if (matches && matches.length > 2) {
            name = matches[1].replace(/"/g, '');
            value = matches[2].replace(/"/g, '');
        }
        return { name: name, value: value };
    };
    DefaultSceneGraphSelector.prototype.attributeToString = function (node, name) {
        if (!node.getAttribute) {
            return '';
        }
        var value = node.getAttribute(name);
        if (isNil(value)) {
            return '';
        }
        if (value.toString) {
            return value.toString();
        }
        return '';
    };
    return DefaultSceneGraphSelector;
}());

var MutationEvent = /** @class */ (function (_super) {
    __extends(MutationEvent, _super);
    function MutationEvent(typeArg, relatedNode, prevValue, newValue, attrName, attrChange, prevParsedValue, newParsedValue) {
        var _this = _super.call(this, null) || this;
        _this.relatedNode = relatedNode;
        _this.prevValue = prevValue;
        _this.newValue = newValue;
        _this.attrName = attrName;
        _this.attrChange = attrChange;
        _this.prevParsedValue = prevParsedValue;
        _this.newParsedValue = newParsedValue;
        _this.type = typeArg;
        return _this;
    }
    MutationEvent.ADDITION = 2;
    MutationEvent.MODIFICATION = 1;
    MutationEvent.REMOVAL = 3;
    return MutationEvent;
}(FederatedEvent));

/**
 * built-in events for element
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MutationEvent
 *
 * TODO: use MutationObserver instead
 * @see https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
 */
var ElementEvent;
(function (ElementEvent) {
    ElementEvent["REPARENT"] = "reparent";
    ElementEvent["DESTROY"] = "destroy";
    /**
     * @see https://www.w3.org/TR/DOM-Level-3-Events/#event-type-DOMAttrModified
     */
    ElementEvent["ATTR_MODIFIED"] = "DOMAttrModified";
    /**
     * it has been inserted
     * @see https://www.w3.org/TR/DOM-Level-3-Events/#event-type-DOMNodeInserted
     */
    ElementEvent["INSERTED"] = "DOMNodeInserted";
    /**
     * it is being removed
     * @see https://www.w3.org/TR/DOM-Level-3-Events/#event-type-DOMNodeRemoved
     */
    ElementEvent["REMOVED"] = "removed";
    /**
     * @see https://www.w3.org/TR/DOM-Level-3-Events/#domnodeinsertedintodocument
     */
    ElementEvent["MOUNTED"] = "DOMNodeInsertedIntoDocument";
    /**
     * @see https://www.w3.org/TR/DOM-Level-3-Events/#domnoderemovedfromdocument
     */
    ElementEvent["UNMOUNTED"] = "DOMNodeRemovedFromDocument";
    ElementEvent["BOUNDS_CHANGED"] = "bounds-changed";
    ElementEvent["CULLED"] = "culled";
})(ElementEvent || (ElementEvent = {}));

function markRenderableDirty(e) {
    var renderable = e.renderable;
    if (renderable) {
        renderable.renderBoundsDirty = true;
        renderable.boundsDirty = true;
    }
}
var reparentEvent = new MutationEvent(ElementEvent.REPARENT, null, '', '', '', 0, '', '');
/**
 * update transform in scene graph
 *
 * @see https://community.khronos.org/t/scene-graphs/50542/7
 */
var DefaultSceneGraphService = /** @class */ (function () {
    function DefaultSceneGraphService(runtime) {
        var _this = this;
        this.runtime = runtime;
        this.pendingEvents = [];
        this.boundsChangedEvent = new CustomEvent(ElementEvent.BOUNDS_CHANGED);
        /**
         * rotate in world space
         */
        this.rotate = (function () {
            var parentInvertRotation = quat$1.create();
            return function (element, degrees, y, z) {
                if (y === void 0) { y = 0; }
                if (z === void 0) { z = 0; }
                if (typeof degrees === 'number') {
                    degrees = vec3.fromValues(degrees, y, z);
                }
                var transform = element.transformable;
                if (element.parentNode === null ||
                    !element.parentNode.transformable) {
                    _this.rotateLocal(element, degrees);
                }
                else {
                    var rotation = quat$1.create();
                    quat$1.fromEuler(rotation, degrees[0], degrees[1], degrees[2]);
                    var rot = _this.getRotation(element);
                    var parentRot = _this.getRotation(element.parentNode);
                    quat$1.copy(parentInvertRotation, parentRot);
                    quat$1.invert(parentInvertRotation, parentInvertRotation);
                    quat$1.multiply(rotation, parentInvertRotation, rotation);
                    quat$1.multiply(transform.localRotation, rotation, rot);
                    quat$1.normalize(transform.localRotation, transform.localRotation);
                    _this.dirtifyLocal(element, transform);
                }
            };
        })();
        /**
         * rotate in local space
         * @see @see https://docs.microsoft.com/en-us/windows/win32/api/directxmath/nf-directxmath-xmquaternionrotationrollpitchyaw
         */
        this.rotateLocal = (function () {
            var rotation = quat$1.create();
            return function (element, degrees, y, z) {
                if (y === void 0) { y = 0; }
                if (z === void 0) { z = 0; }
                if (typeof degrees === 'number') {
                    degrees = vec3.fromValues(degrees, y, z);
                }
                var transform = element.transformable;
                quat$1.fromEuler(rotation, degrees[0], degrees[1], degrees[2]);
                quat$1.mul(transform.localRotation, transform.localRotation, rotation);
                _this.dirtifyLocal(element, transform);
            };
        })();
        /**
         * set euler angles(degrees) in world space
         */
        this.setEulerAngles = (function () {
            var invParentRot = quat$1.create();
            return function (element, degrees, y, z) {
                if (y === void 0) { y = 0; }
                if (z === void 0) { z = 0; }
                if (typeof degrees === 'number') {
                    degrees = vec3.fromValues(degrees, y, z);
                }
                var transform = element.transformable;
                if (element.parentNode === null ||
                    !element.parentNode.transformable) {
                    _this.setLocalEulerAngles(element, degrees);
                }
                else {
                    quat$1.fromEuler(transform.localRotation, degrees[0], degrees[1], degrees[2]);
                    var parentRotation = _this.getRotation(element.parentNode);
                    quat$1.copy(invParentRot, quat$1.invert(quat$1.create(), parentRotation));
                    quat$1.mul(transform.localRotation, transform.localRotation, invParentRot);
                    _this.dirtifyLocal(element, transform);
                }
            };
        })();
        /**
         * translate in local space
         *
         * @example
         * ```
         * translateLocal(x, y, z)
         * translateLocal(vec3(x, y, z))
         * ```
         */
        this.translateLocal = (function () {
            return function (element, translation, y, z) {
                if (y === void 0) { y = 0; }
                if (z === void 0) { z = 0; }
                if (typeof translation === 'number') {
                    translation = vec3.fromValues(translation, y, z);
                }
                var transform = element.transformable;
                if (vec3.equals(translation, vec3.create())) {
                    return;
                }
                vec3.transformQuat(translation, translation, transform.localRotation);
                vec3.add(transform.localPosition, transform.localPosition, translation);
                _this.dirtifyLocal(element, transform);
            };
        })();
        /**
         * move to position in world space
         *
         * 对应 g 原版的 move/moveTo
         * @see https://github.com/antvis/g/blob/master/packages/g-base/src/abstract/element.ts#L684-L689
         */
        this.setPosition = (function () {
            var parentInvertMatrix = mat4.create();
            var tmpPosition = vec3.create();
            return function (element, position) {
                var transform = element.transformable;
                tmpPosition[0] = position[0];
                tmpPosition[1] = position[1];
                tmpPosition[2] = position[2] || 0;
                if (vec3.equals(_this.getPosition(element), tmpPosition)) {
                    return;
                }
                vec3.copy(transform.position, tmpPosition);
                if (element.parentNode === null ||
                    !element.parentNode.transformable) {
                    vec3.copy(transform.localPosition, tmpPosition);
                }
                else {
                    var parentTransform = element.parentNode.transformable;
                    mat4.copy(parentInvertMatrix, parentTransform.worldTransform);
                    mat4.invert(parentInvertMatrix, parentInvertMatrix);
                    vec3.transformMat4(transform.localPosition, tmpPosition, parentInvertMatrix);
                }
                _this.dirtifyLocal(element, transform);
            };
        })();
        /**
         * move to position in local space
         */
        this.setLocalPosition = (function () {
            var tmpPosition = vec3.create();
            return function (element, position) {
                var transform = element.transformable;
                tmpPosition[0] = position[0];
                tmpPosition[1] = position[1];
                tmpPosition[2] = position[2] || 0;
                if (vec3.equals(transform.localPosition, tmpPosition)) {
                    return;
                }
                vec3.copy(transform.localPosition, tmpPosition);
                _this.dirtifyLocal(element, transform);
            };
        })();
        /**
         * translate in world space
         *
         * @example
         * ```
         * translate(x, y, z)
         * translate(vec3(x, y, z))
         * ```
         *
         * 对应 g 原版的 translate 2D
         * @see https://github.com/antvis/g/blob/master/packages/g-base/src/abstract/element.ts#L665-L676
         */
        this.translate = (function () {
            var zeroVec3 = vec3.create();
            var tmpVec3 = vec3.create();
            var tr = vec3.create();
            return function (element, translation, y, z) {
                if (y === void 0) { y = 0; }
                if (z === void 0) { z = 0; }
                if (typeof translation === 'number') {
                    translation = vec3.set(tmpVec3, translation, y, z);
                }
                if (vec3.equals(translation, zeroVec3)) {
                    return;
                }
                vec3.add(tr, _this.getPosition(element), translation);
                _this.setPosition(element, tr);
            };
        })();
        this.setRotation = function () {
            var parentInvertRotation = quat$1.create();
            return function (element, rotation, y, z, w) {
                var transform = element.transformable;
                if (typeof rotation === 'number') {
                    rotation = quat$1.fromValues(rotation, y, z, w);
                }
                if (element.parentNode === null ||
                    !element.parentNode.transformable) {
                    _this.setLocalRotation(element, rotation);
                }
                else {
                    var parentRot = _this.getRotation(element.parentNode);
                    quat$1.copy(parentInvertRotation, parentRot);
                    quat$1.invert(parentInvertRotation, parentInvertRotation);
                    quat$1.multiply(transform.localRotation, parentInvertRotation, rotation);
                    quat$1.normalize(transform.localRotation, transform.localRotation);
                    _this.dirtifyLocal(element, transform);
                }
            };
        };
        this.displayObjectDependencyMap = new WeakMap();
        this.calcLocalTransform = (function () {
            var tmpMat = mat4.create();
            var tmpPosition = vec3.create();
            var tmpQuat = quat$1.fromValues(0, 0, 0, 1);
            return function (transform) {
                var hasSkew = transform.localSkew[0] !== 0 || transform.localSkew[1] !== 0;
                if (hasSkew) {
                    mat4.fromRotationTranslationScaleOrigin(transform.localTransform, transform.localRotation, transform.localPosition, vec3.fromValues(1, 1, 1), transform.origin);
                    // apply skew2D
                    if (transform.localSkew[0] !== 0 || transform.localSkew[1] !== 0) {
                        var tmpMat4 = mat4.identity(tmpMat);
                        tmpMat4[4] = Math.tan(transform.localSkew[0]);
                        tmpMat4[1] = Math.tan(transform.localSkew[1]);
                        mat4.multiply(transform.localTransform, transform.localTransform, tmpMat4);
                    }
                    var scaling = mat4.fromRotationTranslationScaleOrigin(tmpMat, tmpQuat, tmpPosition, transform.localScale, transform.origin);
                    mat4.multiply(transform.localTransform, transform.localTransform, scaling);
                }
                else {
                    // @see https://github.com/mattdesl/css-mat4/blob/master/index.js
                    mat4.fromRotationTranslationScaleOrigin(transform.localTransform, transform.localRotation, transform.localPosition, transform.localScale, transform.origin);
                }
            };
        })();
    }
    DefaultSceneGraphService.prototype.matches = function (query, root) {
        return this.runtime.sceneGraphSelector.is(query, root);
    };
    DefaultSceneGraphService.prototype.querySelector = function (query, root) {
        return this.runtime.sceneGraphSelector.selectOne(query, root);
    };
    DefaultSceneGraphService.prototype.querySelectorAll = function (query, root) {
        return this.runtime.sceneGraphSelector.selectAll(query, root);
        // .filter((node) => !node.shadow);
    };
    DefaultSceneGraphService.prototype.attach = function (child, parent, index) {
        var _a, _b;
        var detached = false;
        if (child.parentNode) {
            detached = child.parentNode !== parent;
            this.detach(child);
        }
        child.parentNode = parent;
        if (!isNil(index)) {
            child.parentNode.childNodes.splice(index, 0, child);
        }
        else {
            child.parentNode.childNodes.push(child);
        }
        // parent needs re-sort
        var sortable = parent.sortable;
        if (((_a = sortable === null || sortable === void 0 ? void 0 : sortable.sorted) === null || _a === void 0 ? void 0 : _a.length) ||
            ((_b = child.style) === null || _b === void 0 ? void 0 : _b.zIndex)) {
            if (sortable.dirtyChildren.indexOf(child) === -1) {
                sortable.dirtyChildren.push(child);
            }
            // if (sortable) {
            // only child has z-Index
            sortable.dirty = true;
            sortable.dirtyReason = SortReason.ADDED;
        }
        // this.updateGraphDepth(child);
        var transform = child.transformable;
        if (transform) {
            this.dirtifyWorld(child, transform);
        }
        if (transform.frozen) {
            this.unfreezeParentToRoot(child);
        }
        if (detached) {
            child.dispatchEvent(reparentEvent);
        }
    };
    DefaultSceneGraphService.prototype.detach = function (child) {
        var _a, _b;
        if (child.parentNode) {
            var transform = child.transformable;
            // if (transform) {
            //   const worldTransform = this.getWorldTransform(child, transform);
            //   mat4.getScaling(transform.localScale, worldTransform);
            //   mat4.getTranslation(transform.localPosition, worldTransform);
            //   mat4.getRotation(transform.localRotation, worldTransform);
            //   transform.localDirtyFlag = true;
            // }
            // parent needs re-sort
            var sortable = child.parentNode.sortable;
            // if (sortable) {
            if (((_a = sortable === null || sortable === void 0 ? void 0 : sortable.sorted) === null || _a === void 0 ? void 0 : _a.length) ||
                ((_b = child.style) === null || _b === void 0 ? void 0 : _b.zIndex)) {
                if (sortable.dirtyChildren.indexOf(child) === -1) {
                    sortable.dirtyChildren.push(child);
                }
                sortable.dirty = true;
                sortable.dirtyReason = SortReason.REMOVED;
            }
            var index = child.parentNode.childNodes.indexOf(child);
            if (index > -1) {
                child.parentNode.childNodes.splice(index, 1);
            }
            if (transform) {
                this.dirtifyWorld(child, transform);
            }
            child.parentNode = null;
        }
    };
    DefaultSceneGraphService.prototype.getOrigin = function (element) {
        return element.transformable.origin;
    };
    /**
     * same as pivot in Pixi.js
     *
     * @see https://stackoverflow.com/questions/40748452/how-to-change-css-transform-origin-but-preserve-transformation
     */
    DefaultSceneGraphService.prototype.setOrigin = function (element, origin, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        if (typeof origin === 'number') {
            origin = [origin, y, z];
        }
        var transform = element.transformable;
        if (origin[0] === transform.origin[0] &&
            origin[1] === transform.origin[1] &&
            origin[2] === transform.origin[2]) {
            return;
        }
        var originVec = transform.origin;
        // const delta = vec3.subtract(vec3.create(), origin, originVec);
        // vec3.add(transform.localPosition, transform.localPosition, delta);
        // update origin
        originVec[0] = origin[0];
        originVec[1] = origin[1];
        originVec[2] = origin[2] || 0;
        this.dirtifyLocal(element, transform);
    };
    /**
     * set euler angles(degrees) in local space
     */
    DefaultSceneGraphService.prototype.setLocalEulerAngles = function (element, degrees, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        if (typeof degrees === 'number') {
            degrees = vec3.fromValues(degrees, y, z);
        }
        var transform = element.transformable;
        quat$1.fromEuler(transform.localRotation, degrees[0], degrees[1], degrees[2]);
        this.dirtifyLocal(element, transform);
    };
    /**
     * scale in local space
     */
    DefaultSceneGraphService.prototype.scaleLocal = function (element, scaling) {
        var transform = element.transformable;
        vec3.multiply(transform.localScale, transform.localScale, vec3.fromValues(scaling[0], scaling[1], scaling[2] || 1));
        this.dirtifyLocal(element, transform);
    };
    DefaultSceneGraphService.prototype.setLocalScale = function (element, scaling) {
        var transform = element.transformable;
        var updatedScaling = vec3.fromValues(scaling[0], scaling[1], scaling[2] || transform.localScale[2]);
        if (vec3.equals(updatedScaling, transform.localScale)) {
            return;
        }
        vec3.copy(transform.localScale, updatedScaling);
        this.dirtifyLocal(element, transform);
    };
    DefaultSceneGraphService.prototype.setLocalRotation = function (element, rotation, y, z, w) {
        if (typeof rotation === 'number') {
            rotation = quat$1.fromValues(rotation, y, z, w);
        }
        var transform = element.transformable;
        quat$1.copy(transform.localRotation, rotation);
        this.dirtifyLocal(element, transform);
    };
    DefaultSceneGraphService.prototype.setLocalSkew = function (element, skew, y) {
        if (typeof skew === 'number') {
            skew = vec2.fromValues(skew, y);
        }
        var transform = element.transformable;
        vec2.copy(transform.localSkew, skew);
        this.dirtifyLocal(element, transform);
    };
    DefaultSceneGraphService.prototype.dirtifyLocal = function (element, transform) {
        if (!transform.localDirtyFlag) {
            transform.localDirtyFlag = true;
            if (!transform.dirtyFlag) {
                this.dirtifyWorld(element, transform);
            }
        }
    };
    DefaultSceneGraphService.prototype.dirtifyWorld = function (element, transform) {
        if (!transform.dirtyFlag) {
            this.unfreezeParentToRoot(element);
        }
        this.dirtifyWorldInternal(element, transform);
        this.dirtifyToRoot(element, true);
    };
    DefaultSceneGraphService.prototype.triggerPendingEvents = function () {
        var _this = this;
        var set = new Set();
        var trigger = function (element, detail) {
            if (element.isConnected && !set.has(element.entity)) {
                _this.boundsChangedEvent.detail = detail;
                _this.boundsChangedEvent.target = element;
                if (element.isMutationObserved) {
                    element.dispatchEvent(_this.boundsChangedEvent);
                }
                else {
                    element.ownerDocument.defaultView.dispatchEvent(_this.boundsChangedEvent, true);
                }
                set.add(element.entity);
            }
        };
        this.pendingEvents.forEach(function (_a) {
            var _b = __read(_a, 2), element = _b[0], detail = _b[1];
            if (detail.affectChildren) {
                element.forEach(function (e) {
                    trigger(e, detail);
                });
            }
            else {
                trigger(element, detail);
            }
        });
        this.clearPendingEvents();
        set.clear();
    };
    DefaultSceneGraphService.prototype.clearPendingEvents = function () {
        this.pendingEvents = [];
    };
    DefaultSceneGraphService.prototype.dirtifyToRoot = function (element, affectChildren) {
        if (affectChildren === void 0) { affectChildren = false; }
        var p = element;
        // only need to re-render itself
        if (p.renderable) {
            p.renderable.dirty = true;
        }
        while (p) {
            markRenderableDirty(p);
            p = p.parentNode;
        }
        if (affectChildren) {
            element.forEach(function (e) {
                markRenderableDirty(e);
            });
        }
        // inform dependencies
        this.informDependentDisplayObjects(element);
        // reuse the same custom event
        this.pendingEvents.push([element, { affectChildren: affectChildren }]);
    };
    DefaultSceneGraphService.prototype.updateDisplayObjectDependency = function (name, oldPath, newPath, object) {
        // clear ref to old clip path
        if (oldPath && oldPath !== newPath) {
            var oldDependencyMap = this.displayObjectDependencyMap.get(oldPath);
            if (oldDependencyMap && oldDependencyMap[name]) {
                var index = oldDependencyMap[name].indexOf(object);
                oldDependencyMap[name].splice(index, 1);
            }
        }
        if (newPath) {
            var newDependencyMap = this.displayObjectDependencyMap.get(newPath);
            if (!newDependencyMap) {
                this.displayObjectDependencyMap.set(newPath, {});
                newDependencyMap = this.displayObjectDependencyMap.get(newPath);
            }
            if (!newDependencyMap[name]) {
                newDependencyMap[name] = [];
            }
            newDependencyMap[name].push(object);
        }
    };
    DefaultSceneGraphService.prototype.informDependentDisplayObjects = function (object) {
        var _this = this;
        var dependencyMap = this.displayObjectDependencyMap.get(object);
        if (dependencyMap) {
            Object.keys(dependencyMap).forEach(function (name) {
                dependencyMap[name].forEach(function (target) {
                    _this.dirtifyToRoot(target, true);
                    target.dispatchEvent(new MutationEvent(ElementEvent.ATTR_MODIFIED, target, _this, _this, name, MutationEvent.MODIFICATION, _this, _this));
                    if (target.isCustomElement && target.isConnected) {
                        if (target.attributeChangedCallback) {
                            target.attributeChangedCallback(name, _this, _this);
                        }
                    }
                });
            });
        }
    };
    DefaultSceneGraphService.prototype.getPosition = function (element) {
        var transform = element.transformable;
        return mat4.getTranslation(transform.position, this.getWorldTransform(element, transform));
    };
    DefaultSceneGraphService.prototype.getRotation = function (element) {
        var transform = element.transformable;
        return mat4.getRotation(transform.rotation, this.getWorldTransform(element, transform));
    };
    DefaultSceneGraphService.prototype.getScale = function (element) {
        var transform = element.transformable;
        return mat4.getScaling(transform.scaling, this.getWorldTransform(element, transform));
    };
    DefaultSceneGraphService.prototype.getWorldTransform = function (element, transform) {
        if (transform === void 0) { transform = element.transformable; }
        if (!transform.localDirtyFlag && !transform.dirtyFlag) {
            return transform.worldTransform;
        }
        if (element.parentNode && element.parentNode.transformable) {
            this.getWorldTransform(element.parentNode);
        }
        this.sync(element, transform);
        return transform.worldTransform;
    };
    DefaultSceneGraphService.prototype.getLocalPosition = function (element) {
        return element.transformable.localPosition;
    };
    DefaultSceneGraphService.prototype.getLocalRotation = function (element) {
        return element.transformable.localRotation;
    };
    DefaultSceneGraphService.prototype.getLocalScale = function (element) {
        return element.transformable.localScale;
    };
    DefaultSceneGraphService.prototype.getLocalSkew = function (element) {
        return element.transformable.localSkew;
    };
    DefaultSceneGraphService.prototype.getLocalTransform = function (element) {
        var transform = element.transformable;
        if (transform.localDirtyFlag) {
            this.calcLocalTransform(transform);
            transform.localDirtyFlag = false;
        }
        return transform.localTransform;
    };
    DefaultSceneGraphService.prototype.setLocalTransform = function (element, transform) {
        var t = mat4.getTranslation(vec3.create(), transform);
        var r = mat4.getRotation(quat$1.create(), transform);
        var s = mat4.getScaling(vec3.create(), transform);
        this.setLocalScale(element, s);
        this.setLocalPosition(element, t);
        this.setLocalRotation(element, r);
    };
    DefaultSceneGraphService.prototype.resetLocalTransform = function (element) {
        this.setLocalScale(element, [1, 1, 1]);
        this.setLocalPosition(element, [0, 0, 0]);
        this.setLocalEulerAngles(element, [0, 0, 0]);
        this.setLocalSkew(element, [0, 0]);
    };
    DefaultSceneGraphService.prototype.getTransformedGeometryBounds = function (element, render, existedAABB) {
        if (render === void 0) { render = false; }
        var bounds = this.getGeometryBounds(element, render);
        if (!AABB.isEmpty(bounds)) {
            var aabb = existedAABB || new AABB();
            aabb.setFromTransformedAABB(bounds, this.getWorldTransform(element));
            return aabb;
        }
        else {
            return null;
        }
    };
    /**
     * won't account for children
     */
    DefaultSceneGraphService.prototype.getGeometryBounds = function (element, render) {
        if (render === void 0) { render = false; }
        var geometry = element.geometry;
        var bounds = render
            ? geometry.renderBounds
            : geometry.contentBounds || null;
        // return (bounds && new AABB(bounds.center, bounds.halfExtents)) || new AABB();
        return bounds || new AABB();
    };
    /**
     * account for children in world space
     */
    DefaultSceneGraphService.prototype.getBounds = function (element, render) {
        var _this = this;
        if (render === void 0) { render = false; }
        var renderable = element.renderable;
        if (!renderable.boundsDirty && !render && renderable.bounds) {
            return renderable.bounds;
        }
        if (!renderable.renderBoundsDirty && render && renderable.renderBounds) {
            return renderable.renderBounds;
        }
        // reuse existed if possible
        var existedAABB = render ? renderable.renderBounds : renderable.bounds;
        // reset with geometry's aabb
        var aabb = this.getTransformedGeometryBounds(element, render, existedAABB);
        // merge children's aabbs
        var children = element.childNodes;
        children.forEach(function (child) {
            var childBounds = _this.getBounds(child, render);
            if (childBounds) {
                if (!aabb) {
                    aabb = existedAABB || new AABB();
                    aabb.update(childBounds.center, childBounds.halfExtents);
                }
                else {
                    aabb.add(childBounds);
                }
            }
        });
        if (render) {
            // FIXME: account for clip path
            var clipped = findClosestClipPathTarget(element);
            if (clipped) {
                // use bounds under world space
                var clipPathBounds = clipped.parsedStyle.clipPath.getBounds(render);
                if (!aabb) {
                    aabb = clipPathBounds;
                }
                else if (clipPathBounds) {
                    aabb = clipPathBounds.intersection(aabb);
                }
            }
        }
        if (!aabb) {
            aabb = new AABB();
        }
        if (aabb) {
            if (render) {
                renderable.renderBounds = aabb;
            }
            else {
                renderable.bounds = aabb;
            }
        }
        if (render) {
            renderable.renderBoundsDirty = false;
        }
        else {
            renderable.boundsDirty = false;
        }
        return aabb;
    };
    /**
     * account for children in local space
     */
    DefaultSceneGraphService.prototype.getLocalBounds = function (element) {
        if (element.parentNode) {
            var parentInvert = mat4.create();
            if (element.parentNode.transformable) {
                parentInvert = mat4.invert(mat4.create(), this.getWorldTransform(element.parentNode));
            }
            var bounds = this.getBounds(element);
            if (!AABB.isEmpty(bounds)) {
                var localBounds = new AABB();
                localBounds.setFromTransformedAABB(bounds, parentInvert);
                return localBounds;
            }
        }
        return this.getBounds(element);
    };
    DefaultSceneGraphService.prototype.getBoundingClientRect = function (element) {
        var _a, _b;
        var aabb;
        var bounds = this.getGeometryBounds(element);
        if (!AABB.isEmpty(bounds)) {
            aabb = new AABB();
            // apply transformation to aabb
            aabb.setFromTransformedAABB(bounds, this.getWorldTransform(element));
        }
        // calc context's offset
        var bbox = (_b = (_a = element.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView) === null || _b === void 0 ? void 0 : _b.getContextService().getBoundingClientRect();
        if (aabb) {
            var _c = __read(aabb.getMin(), 2), left = _c[0], top_1 = _c[1];
            var _d = __read(aabb.getMax(), 2), right = _d[0], bottom = _d[1];
            return new Rectangle(left + ((bbox === null || bbox === void 0 ? void 0 : bbox.left) || 0), top_1 + ((bbox === null || bbox === void 0 ? void 0 : bbox.top) || 0), right - left, bottom - top_1);
        }
        return new Rectangle((bbox === null || bbox === void 0 ? void 0 : bbox.left) || 0, (bbox === null || bbox === void 0 ? void 0 : bbox.top) || 0, 0, 0);
    };
    DefaultSceneGraphService.prototype.dirtifyWorldInternal = function (element, transform) {
        var _this = this;
        if (!transform.dirtyFlag) {
            transform.dirtyFlag = true;
            transform.frozen = false;
            element.childNodes.forEach(function (child) {
                var childTransform = child.transformable;
                if (!childTransform.dirtyFlag) {
                    _this.dirtifyWorldInternal(child, childTransform);
                }
            });
            var renderable = element.renderable;
            if (renderable) {
                renderable.renderBoundsDirty = true;
                renderable.boundsDirty = true;
                renderable.dirty = true;
            }
        }
    };
    DefaultSceneGraphService.prototype.syncHierarchy = function (element) {
        var transform = element.transformable;
        if (transform.frozen) {
            return;
        }
        transform.frozen = true;
        if (transform.localDirtyFlag || transform.dirtyFlag) {
            this.sync(element, transform);
        }
        var children = element.childNodes;
        for (var i = 0; i < children.length; i++) {
            this.syncHierarchy(children[i]);
        }
    };
    DefaultSceneGraphService.prototype.sync = function (element, transform) {
        if (transform.localDirtyFlag) {
            this.calcLocalTransform(transform);
            transform.localDirtyFlag = false;
        }
        if (transform.dirtyFlag) {
            var parent_1 = element.parentNode;
            var parentTransform = parent_1 && parent_1.transformable;
            if (parent_1 === null || !parentTransform) {
                mat4.copy(transform.worldTransform, transform.localTransform);
            }
            else {
                // TODO: should we support scale compensation?
                // @see https://github.com/playcanvas/engine/issues/1077#issuecomment-359765557
                mat4.multiply(transform.worldTransform, parentTransform.worldTransform, transform.localTransform);
            }
            transform.dirtyFlag = false;
        }
    };
    DefaultSceneGraphService.prototype.unfreezeParentToRoot = function (child) {
        var p = child.parentNode;
        while (p) {
            var transform = p.transformable;
            if (transform) {
                transform.frozen = false;
            }
            p = p.parentNode;
        }
    };
    return DefaultSceneGraphService;
}());

var TEXT_METRICS = {
    MetricsString: '|ÉqÅ',
    BaselineSymbol: 'M',
    BaselineMultiplier: 1.4,
    HeightMultiplier: 2,
    Newlines: [
        0x000a,
        0x000d, // carriage return
    ],
    BreakingSpaces: [
        0x0009,
        0x0020,
        0x2000,
        0x2001,
        0x2002,
        0x2003,
        0x2004,
        0x2005,
        0x2006,
        0x2008,
        0x2009,
        0x200a,
        0x205f,
        0x3000, // ideographic space
    ],
};
var LATIN_REGEX = /[a-zA-Z0-9\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff!"#$%&'()*+,-./:;]/;
// Line breaking rules in CJK (Kinsoku Shori)
// Refer from https://en.wikipedia.org/wiki/Line_breaking_rules_in_East_Asian_languages
var regexCannotStartZhCn = /[!%),.:;?\]}¢°·'""†‡›℃∶、。〃〆〕〗〞﹚﹜！＂％＇），．：；？！］｝～]/;
var regexCannotEndZhCn = /[$(£¥·'"〈《「『【〔〖〝﹙﹛＄（．［｛￡￥]/;
var regexCannotStartZhTw = /[!),.:;?\]}¢·–—'"•"、。〆〞〕〉》」︰︱︲︳﹐﹑﹒﹓﹔﹕﹖﹘﹚﹜！），．：；？︶︸︺︼︾﹀﹂﹗］｜｝､]/;
var regexCannotEndZhTw = /[([{£¥'"‵〈《「『〔〝︴﹙﹛（｛︵︷︹︻︽︿﹁﹃﹏]/;
var regexCannotStartJaJp = /[)\]｝〕〉》」』】〙〗〟'"｠»ヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻‐゠–〜?!‼⁇⁈⁉・、:;,。.]/;
var regexCannotEndJaJp = /[([｛〔〈《「『【〘〖〝'"｟«—...‥〳〴〵]/;
var regexCannotStartKoKr = /[!%),.:;?\]}¢°'"†‡℃〆〈《「『〕！％），．：；？］｝]/;
var regexCannotEndKoKr = /[$([{£¥'"々〇〉》」〔＄（［｛｠￥￦#]/;
var regexCannotStart = new RegExp("".concat(regexCannotStartZhCn.source, "|").concat(regexCannotStartZhTw.source, "|").concat(regexCannotStartJaJp.source, "|").concat(regexCannotStartKoKr.source));
var regexCannotEnd = new RegExp("".concat(regexCannotEndZhCn.source, "|").concat(regexCannotEndZhTw.source, "|").concat(regexCannotEndJaJp.source, "|").concat(regexCannotEndKoKr.source));
/**
 * Borrow from pixi/packages/text/src/TextMetrics.ts
 */
var TextService = /** @class */ (function () {
    function TextService(runtime) {
        var _this = this;
        this.runtime = runtime;
        /**
         * font metrics cache
         */
        this.fontMetricsCache = {};
        this.shouldBreakByKinsokuShorui = function (char, nextChar) {
            if (_this.isBreakingSpace(nextChar))
                return false;
            if (char) {
                // Line breaking rules in CJK (Kinsoku Shori)
                if (regexCannotEnd.exec(nextChar) || regexCannotStart.exec(char)) {
                    return true;
                }
            }
            return false;
        };
        this.trimByKinsokuShorui = function (prev) {
            var next = __spreadArray([], __read(prev), false);
            var prevLine = next[next.length - 2];
            if (!prevLine) {
                return prev;
            }
            var lastChar = prevLine[prevLine.length - 1];
            next[next.length - 2] = prevLine.slice(0, -1);
            next[next.length - 1] = lastChar + next[next.length - 1];
            return next;
        };
    }
    /**
     * Calculates the ascent, descent and fontSize of a given font-style.
     */
    TextService.prototype.measureFont = function (font, offscreenCanvas) {
        // as this method is used for preparing assets, don't recalculate things if we don't need to
        if (this.fontMetricsCache[font]) {
            return this.fontMetricsCache[font];
        }
        var properties = {
            ascent: 0,
            descent: 0,
            fontSize: 0,
        };
        var canvas = this.runtime.offscreenCanvasCreator.getOrCreateCanvas(offscreenCanvas);
        var context = this.runtime.offscreenCanvasCreator.getOrCreateContext(offscreenCanvas, {
            willReadFrequently: true,
        });
        context.font = font;
        var metricsString = TEXT_METRICS.MetricsString + TEXT_METRICS.BaselineSymbol;
        var width = Math.ceil(context.measureText(metricsString).width);
        var baseline = Math.ceil(context.measureText(TEXT_METRICS.BaselineSymbol).width);
        var height = TEXT_METRICS.HeightMultiplier * baseline;
        baseline = (baseline * TEXT_METRICS.BaselineMultiplier) | 0;
        // @ts-ignore
        canvas.width = width;
        // @ts-ignore
        canvas.height = height;
        context.fillStyle = '#f00';
        context.fillRect(0, 0, width, height);
        context.font = font;
        context.textBaseline = 'alphabetic';
        context.fillStyle = '#000';
        context.fillText(metricsString, 0, baseline);
        var imagedata = context.getImageData(0, 0, width || 1, height || 1).data;
        var pixels = imagedata.length;
        var line = width * 4;
        var i = 0;
        var idx = 0;
        var stop = false;
        // ascent. scan from top to bottom until we find a non red pixel
        for (i = 0; i < baseline; ++i) {
            for (var j = 0; j < line; j += 4) {
                if (imagedata[idx + j] !== 255) {
                    stop = true;
                    break;
                }
            }
            if (!stop) {
                idx += line;
            }
            else {
                break;
            }
        }
        properties.ascent = baseline - i;
        idx = pixels - line;
        stop = false;
        // descent. scan from bottom to top until we find a non red pixel
        for (i = height; i > baseline; --i) {
            for (var j = 0; j < line; j += 4) {
                if (imagedata[idx + j] !== 255) {
                    stop = true;
                    break;
                }
            }
            if (!stop) {
                idx -= line;
            }
            else {
                break;
            }
        }
        properties.descent = i - baseline;
        properties.fontSize = properties.ascent + properties.descent;
        this.fontMetricsCache[font] = properties;
        return properties;
    };
    TextService.prototype.measureText = function (text, parsedStyle, offscreenCanvas) {
        var fontSize = parsedStyle.fontSize, wordWrap = parsedStyle.wordWrap, strokeHeight = parsedStyle.lineHeight, lineWidth = parsedStyle.lineWidth, textBaseline = parsedStyle.textBaseline, textAlign = parsedStyle.textAlign, letterSpacing = parsedStyle.letterSpacing, textPath = parsedStyle.textPath; parsedStyle.textPathSide; parsedStyle.textPathStartOffset; 
        var // dropShadow = 0,
        // dropShadowDistance = 0,
        _a = parsedStyle.leading, 
        // dropShadow = 0,
        // dropShadowDistance = 0,
        leading = _a === void 0 ? 0 : _a;
        var font = toFontString(parsedStyle);
        // if (runtime.enableCSSParsing) {
        var fontProperties = this.measureFont(font, offscreenCanvas);
        // fallback in case UA disallow canvas data extraction
        // (toDataURI, getImageData functions)
        if (fontProperties.fontSize === 0) {
            fontProperties.fontSize = fontSize;
            fontProperties.ascent = fontSize;
        }
        // } else {
        //   fontProperties = {
        //     fontSize,
        //   };
        // }
        var context = this.runtime.offscreenCanvasCreator.getOrCreateContext(offscreenCanvas);
        context.font = font;
        // no overflowing by default
        parsedStyle.isOverflowing = false;
        var outputText = wordWrap
            ? this.wordWrap(text, parsedStyle, offscreenCanvas)
            : text;
        var lines = outputText.split(/(?:\r\n|\r|\n)/);
        var lineWidths = new Array(lines.length);
        var maxLineWidth = 0;
        // account for textPath
        if (textPath) {
            textPath.getTotalLength();
            // const startingPoint = textPath.getPoint(0);
            for (var i = 0; i < lines.length; i++) {
                var width = context.measureText(lines[i]).width +
                    (lines[i].length - 1) * letterSpacing;
                // for (
                //   let i = reverse ? lines[0].length - 1 : 0;
                //   reverse ? i >= 0 : i < lines[0].length;
                //   reverse ? i-- : i++
                // ) {
                //   graphemeInfo = lineBounds[i];
                //   if (positionInPath > totalPathLength) {
                //     positionInPath %= totalPathLength;
                //   } else if (positionInPath < 0) {
                //     positionInPath += totalPathLength;
                //   }
                //   // it would probably much faster to send all the grapheme position for a line
                //   // and calculate path position/angle at once.
                //   this.setGraphemeOnPath(
                //     positionInPath,
                //     graphemeInfo,
                //     startingPoint
                //   );
                //   positionInPath += graphemeInfo.kernedWidth;
                // }
            }
        }
        else {
            for (var i = 0; i < lines.length; i++) {
                // char width + letterSpacing
                var lineWidth_1 = context.measureText(lines[i]).width +
                    (lines[i].length - 1) * letterSpacing;
                lineWidths[i] = lineWidth_1;
                maxLineWidth = Math.max(maxLineWidth, lineWidth_1);
            }
            var width = maxLineWidth + lineWidth;
            // if (dropShadow) {
            //   width += dropShadowDistance;
            // }
            var lineHeight_1 = strokeHeight || fontProperties.fontSize + lineWidth;
            var height = Math.max(lineHeight_1, fontProperties.fontSize + lineWidth) +
                (lines.length - 1) * (lineHeight_1 + leading);
            // if (dropShadow) {
            //   height += dropShadowDistance;
            // }
            lineHeight_1 += leading;
            // handle vertical text baseline
            var offsetY_1 = 0;
            if (textBaseline === 'middle') {
                offsetY_1 = -height / 2;
            }
            else if (textBaseline === 'bottom' ||
                textBaseline === 'alphabetic' ||
                textBaseline === 'ideographic') {
                offsetY_1 = -height;
            }
            else if (textBaseline === 'top' || textBaseline === 'hanging') {
                offsetY_1 = 0;
            }
            return {
                font: font,
                width: width,
                height: height,
                lines: lines,
                lineWidths: lineWidths,
                lineHeight: lineHeight_1,
                maxLineWidth: maxLineWidth,
                fontProperties: fontProperties,
                lineMetrics: lineWidths.map(function (width, i) {
                    var offsetX = 0;
                    // handle horizontal text align
                    if (textAlign === 'center' || textAlign === 'middle') {
                        offsetX -= width / 2;
                    }
                    else if (textAlign === 'right' || textAlign === 'end') {
                        offsetX -= width;
                    }
                    return new Rectangle(offsetX - lineWidth / 2, offsetY_1 + i * lineHeight_1, width + lineWidth, lineHeight_1);
                }),
            };
        }
    };
    TextService.prototype.setGraphemeOnPath = function () { };
    TextService.prototype.wordWrap = function (text, parsedStyle, offscreenCanvas) {
        var _this = this;
        var _a = parsedStyle.wordWrapWidth, wordWrapWidth = _a === void 0 ? 0 : _a, letterSpacing = parsedStyle.letterSpacing, _b = parsedStyle.maxLines, maxLines = _b === void 0 ? Infinity : _b, textOverflow = parsedStyle.textOverflow;
        var context = this.runtime.offscreenCanvasCreator.getOrCreateContext(offscreenCanvas);
        var maxWidth = wordWrapWidth + letterSpacing;
        var ellipsis = '';
        if (textOverflow === 'ellipsis') {
            ellipsis = '...';
        }
        else if (textOverflow && textOverflow !== 'clip') {
            ellipsis = textOverflow;
        }
        var lines = [];
        var currentIndex = 0;
        var currentWidth = 0;
        var cache = {};
        var calcWidth = function (char) {
            return _this.getFromCache(char, letterSpacing, cache, context);
        };
        var ellipsisWidth = Array.from(ellipsis).reduce(function (prev, cur) {
            return prev + calcWidth(cur);
        }, 0);
        var chars = Array.from(text);
        for (var i = 0; i < chars.length; i++) {
            var char = chars[i];
            var prevChar = text[i - 1];
            var nextChar = text[i + 1];
            var charWidth = calcWidth(char);
            if (this.isNewline(char)) {
                currentIndex++;
                // exceed maxLines, break immediately
                if (currentIndex >= maxLines) {
                    parsedStyle.isOverflowing = true;
                    break;
                }
                currentWidth = 0;
                lines[currentIndex] = '';
                continue;
            }
            if (currentWidth > 0 && currentWidth + charWidth > maxWidth) {
                if (currentIndex + 1 >= maxLines) {
                    parsedStyle.isOverflowing = true;
                    // If there is not enough space to display the string itself, it is clipped.
                    // @see https://developer.mozilla.org/en-US/docs/Web/CSS/text-overflow#values
                    if (ellipsisWidth > 0 && ellipsisWidth <= maxWidth) {
                        // Backspace from line's end.
                        var currentLineLength = lines[currentIndex].length;
                        var lastLineWidth = 0;
                        var lastLineIndex = currentLineLength;
                        for (var i_1 = 0; i_1 < currentLineLength; i_1++) {
                            var width = calcWidth(lines[currentIndex][i_1]);
                            if (lastLineWidth + width + ellipsisWidth > maxWidth) {
                                lastLineIndex = i_1;
                                break;
                            }
                            lastLineWidth += width;
                        }
                        lines[currentIndex] =
                            (lines[currentIndex] || '').slice(0, lastLineIndex) + ellipsis;
                    }
                    break;
                }
                currentIndex++;
                currentWidth = 0;
                lines[currentIndex] = '';
                if (this.isBreakingSpace(char)) {
                    continue;
                }
                if (!this.canBreakInLastChar(char)) {
                    lines = this.trimToBreakable(lines);
                    currentWidth = this.sumTextWidthByCache(lines[currentIndex] || '', cache);
                }
                if (this.shouldBreakByKinsokuShorui(char, nextChar)) {
                    lines = this.trimByKinsokuShorui(lines);
                    currentWidth += calcWidth(prevChar || '');
                }
            }
            currentWidth += charWidth;
            lines[currentIndex] = (lines[currentIndex] || '') + char;
        }
        return lines.join('\n');
    };
    TextService.prototype.isBreakingSpace = function (char) {
        if (typeof char !== 'string') {
            return false;
        }
        return TEXT_METRICS.BreakingSpaces.indexOf(char.charCodeAt(0)) >= 0;
    };
    TextService.prototype.isNewline = function (char) {
        if (typeof char !== 'string') {
            return false;
        }
        return TEXT_METRICS.Newlines.indexOf(char.charCodeAt(0)) >= 0;
    };
    TextService.prototype.trimToBreakable = function (prev) {
        var next = __spreadArray([], __read(prev), false);
        var prevLine = next[next.length - 2];
        var index = this.findBreakableIndex(prevLine);
        if (index === -1 || !prevLine)
            return next;
        var trimmedChar = prevLine.slice(index, index + 1);
        var isTrimmedWithSpace = this.isBreakingSpace(trimmedChar);
        var trimFrom = index + 1;
        var trimTo = index + (isTrimmedWithSpace ? 0 : 1);
        next[next.length - 1] += prevLine.slice(trimFrom, prevLine.length);
        next[next.length - 2] = prevLine.slice(0, trimTo);
        return next;
    };
    TextService.prototype.canBreakInLastChar = function (char) {
        if (char && LATIN_REGEX.test(char))
            return false;
        return true;
    };
    TextService.prototype.sumTextWidthByCache = function (text, cache) {
        return text.split('').reduce(function (sum, c) {
            if (!cache[c])
                throw Error('cannot count the word without cache');
            return sum + cache[c];
        }, 0);
    };
    TextService.prototype.findBreakableIndex = function (line) {
        for (var i = line.length - 1; i >= 0; i--) {
            if (!LATIN_REGEX.test(line[i]))
                return i;
        }
        return -1;
    };
    TextService.prototype.getFromCache = function (key, letterSpacing, cache, context) {
        var width = cache[key];
        if (typeof width !== 'number') {
            var spacing = key.length * letterSpacing;
            width = context.measureText(key).width + spacing;
            cache[key] = width;
        }
        return width;
    };
    return TextService;
}());

var runtime = {};
/**
 * Replace with IoC container
 */
var geometryUpdaterFactory = (function () {
    var _a;
    var rectUpdater = new RectUpdater();
    var polylineUpdater = new PolylineUpdater();
    return _a = {},
        _a[Shape.CIRCLE] = new CircleUpdater(),
        _a[Shape.ELLIPSE] = new EllipseUpdater(),
        _a[Shape.RECT] = rectUpdater,
        _a[Shape.IMAGE] = rectUpdater,
        _a[Shape.GROUP] = rectUpdater,
        _a[Shape.LINE] = new LineUpdater(),
        _a[Shape.TEXT] = new TextUpdater(runtime),
        _a[Shape.POLYLINE] = polylineUpdater,
        _a[Shape.POLYGON] = polylineUpdater,
        _a[Shape.PATH] = new PathUpdater(),
        _a[Shape.HTML] = null,
        _a[Shape.MESH] = null,
        _a;
})();
var CSSPropertySyntaxFactory = (function () {
    var _a;
    var color = new CSSPropertyColor();
    var length = new CSSPropertyLengthOrPercentage();
    return _a = {},
        _a[PropertySyntax.PERCENTAGE] = null,
        _a[PropertySyntax.NUMBER] = new CSSPropertyNumber(),
        _a[PropertySyntax.ANGLE] = new CSSPropertyAngle(),
        _a[PropertySyntax.DEFINED_PATH] = new CSSPropertyClipPath(),
        _a[PropertySyntax.PAINT] = color,
        _a[PropertySyntax.COLOR] = color,
        _a[PropertySyntax.FILTER] = new CSSPropertyFilter(),
        _a[PropertySyntax.LENGTH] = length,
        _a[PropertySyntax.LENGTH_PERCENTAGE] = length,
        _a[PropertySyntax.LENGTH_PERCENTAGE_12] = new CSSPropertyLengthOrPercentage12(),
        _a[PropertySyntax.LENGTH_PERCENTAGE_14] = new CSSPropertyLengthOrPercentage14(),
        _a[PropertySyntax.COORDINATE] = new CSSPropertyLocalPosition(),
        _a[PropertySyntax.OFFSET_DISTANCE] = new CSSPropertyOffsetDistance(),
        _a[PropertySyntax.OPACITY_VALUE] = new CSSPropertyOpacity(),
        _a[PropertySyntax.PATH] = new CSSPropertyPath(),
        _a[PropertySyntax.LIST_OF_POINTS] = new CSSPropertyPoints(),
        _a[PropertySyntax.SHADOW_BLUR] = new CSSPropertyShadowBlur(),
        _a[PropertySyntax.TEXT] = new CSSPropertyText(),
        _a[PropertySyntax.TEXT_TRANSFORM] = new CSSPropertyTextTransform(),
        _a[PropertySyntax.TRANSFORM] = new CSSPropertyTransform(),
        _a[PropertySyntax.TRANSFORM_ORIGIN] = new CSSPropertyTransformOrigin(),
        _a[PropertySyntax.Z_INDEX] = new CSSPropertyZIndex(),
        _a[PropertySyntax.MARKER] = new CSSPropertyMarker(),
        _a;
})();
var getGlobalThis = function () {
    if (typeof globalThis !== 'undefined')
        return globalThis;
    if (typeof self !== 'undefined')
        return self;
    if (typeof window !== 'undefined')
        return window;
    // @ts-ignore
    if (typeof global !== 'undefined')
        return global;
    return {};
    // [!] Error: The 'this' keyword is equivalent to 'undefined' at the top level of an ES module, and has been rewritten
    // @see https://rollupjs.org/troubleshooting/#error-this-is-undefined
    // if (typeof this !== 'undefined') return this;
};
/**
 * Camera
 * `g-camera-api` will provide an advanced implementation
 */
runtime.CameraContribution = Camera;
/**
 * `g-web-animations-api` will provide an AnimationTimeline
 */
runtime.AnimationTimeline = null;
runtime.EasingFunction = null;
runtime.offscreenCanvasCreator = new OffscreenCanvasCreator();
runtime.nativeHTMLMap = new WeakMap();
runtime.sceneGraphSelector = new DefaultSceneGraphSelector();
runtime.sceneGraphService = new DefaultSceneGraphService(runtime);
runtime.textService = new TextService(runtime);
runtime.geometryUpdaterFactory = geometryUpdaterFactory;
runtime.CSSPropertySyntaxFactory = CSSPropertySyntaxFactory;
runtime.styleValueRegistry = new DefaultStyleValueRegistry(runtime);
runtime.layoutRegistry = null;
runtime.globalThis = getGlobalThis();
runtime.enableCSSParsing = true;
runtime.enableDataset = false;
runtime.enableStyleSyntax = true;

var entityCounter = 0;
function resetEntityCounter() {
    entityCounter = 0;
}
var insertedEvent = new MutationEvent(ElementEvent.INSERTED, null, '', '', '', 0, '', '');
var removedEvent = new MutationEvent(ElementEvent.REMOVED, null, '', '', '', 0, '', '');
var destroyEvent = new CustomEvent(ElementEvent.DESTROY);
/**
 * Has following capabilities:
 * * Node insert/remove, eg. appendChild, removeChild, remove...
 * * Query eg. querySelector getElementById...
 * * Animation
 */
var Element = /** @class */ (function (_super) {
    __extends(Element, _super);
    function Element() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        /**
         * Unique id.
         */
        _this.entity = entityCounter++;
        _this.renderable = {
            bounds: undefined,
            boundsDirty: true,
            renderBounds: undefined,
            renderBoundsDirty: true,
            dirtyRenderBounds: undefined,
            dirty: false,
        };
        _this.cullable = {
            strategy: Strategy.Standard,
            visibilityPlaneMask: -1,
            visible: true,
            enable: true,
        };
        _this.transformable = {
            dirtyFlag: false,
            localDirtyFlag: false,
            frozen: false,
            localPosition: [0, 0, 0],
            localRotation: [0, 0, 0, 1],
            localScale: [1, 1, 1],
            localTransform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            localSkew: [0, 0],
            position: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scaling: [1, 1, 1],
            worldTransform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            origin: [0, 0, 0],
        };
        _this.sortable = {
            dirty: false,
            sorted: undefined,
            renderOrder: 0,
            dirtyChildren: [],
            dirtyReason: undefined,
        };
        _this.geometry = {
            contentBounds: undefined,
            renderBounds: undefined,
        };
        _this.rBushNode = {
            aabb: undefined,
        };
        /**
         * https://developer.mozilla.org/zh-CN/docs/Web/API/Element/namespaceURI
         */
        _this.namespaceURI = 'g';
        _this.scrollLeft = 0;
        _this.scrollTop = 0;
        /**
         * We don't support border now
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/clientTop
         */
        _this.clientTop = 0;
        _this.clientLeft = 0;
        /**
         * is destroyed or not
         */
        _this.destroyed = false;
        /**
         * compatible with `style`
         * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style
         */
        _this.style = {};
        _this.computedStyle = runtime.enableCSSParsing
            ? {
                anchor: unsetKeywordValue,
                opacity: unsetKeywordValue,
                fillOpacity: unsetKeywordValue,
                strokeOpacity: unsetKeywordValue,
                fill: unsetKeywordValue,
                stroke: unsetKeywordValue,
                transform: unsetKeywordValue,
                transformOrigin: unsetKeywordValue,
                visibility: unsetKeywordValue,
                pointerEvents: unsetKeywordValue,
                lineWidth: unsetKeywordValue,
                lineCap: unsetKeywordValue,
                lineJoin: unsetKeywordValue,
                increasedLineWidthForHitTesting: unsetKeywordValue,
                fontSize: unsetKeywordValue,
                fontFamily: unsetKeywordValue,
                fontStyle: unsetKeywordValue,
                fontWeight: unsetKeywordValue,
                fontVariant: unsetKeywordValue,
                textAlign: unsetKeywordValue,
                textBaseline: unsetKeywordValue,
                textTransform: unsetKeywordValue,
                zIndex: unsetKeywordValue,
                filter: unsetKeywordValue,
                shadowType: unsetKeywordValue,
            }
            : null;
        /**
         * Renderers will use these used values.
         */
        _this.parsedStyle = {
        // opacity: '',
        // fillOpacity: '',
        // strokeOpacity: '',
        // transformOrigin: '',
        // visibility: '',
        // pointerEvents: '',
        // lineWidth: '',
        // lineCap: '',
        // lineJoin: '',
        // increasedLineWidthForHitTesting: '',
        // fontSize: '',
        // fontFamily: '',
        // fontStyle: '',
        // fontWeight: '',
        // fontVariant: '',
        // textAlign: '',
        // textBaseline: '',
        // textTransform: '',
        };
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes
         */
        _this.attributes = {};
        return _this;
    }
    Object.defineProperty(Element.prototype, "className", {
        /**
         * used in `getElementsByClassName`
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementsByClassName
         */
        get: function () {
            // @ts-ignore
            return this.getAttribute('class') || '';
        },
        set: function (className) {
            this.setAttribute('class', className);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "classList", {
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
         */
        get: function () {
            return this.className.split(' ').filter(function (c) { return c !== ''; });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "tagName", {
        get: function () {
            return this.nodeName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "children", {
        get: function () {
            return this.childNodes;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "childElementCount", {
        get: function () {
            return this.childNodes.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "firstElementChild", {
        get: function () {
            return this.firstChild;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "lastElementChild", {
        get: function () {
            return this.lastChild;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "parentElement", {
        get: function () {
            return this.parentNode;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "nextSibling", {
        get: function () {
            if (this.parentNode) {
                var index = this.parentNode.childNodes.indexOf(this);
                return this.parentNode.childNodes[index + 1] || null;
            }
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Element.prototype, "previousSibling", {
        get: function () {
            if (this.parentNode) {
                var index = this.parentNode.childNodes.indexOf(this);
                return this.parentNode.childNodes[index - 1] || null;
            }
            return null;
        },
        enumerable: false,
        configurable: true
    });
    Element.prototype.cloneNode = function (deep) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.appendChild = function (child, index) {
        var _a;
        if (child.destroyed) {
            throw new Error(ERROR_MSG_APPEND_DESTROYED_ELEMENT);
        }
        runtime.sceneGraphService.attach(child, this, index);
        if ((_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView) {
            this.ownerDocument.defaultView.mountChildren(child);
        }
        insertedEvent.relatedNode = this;
        child.dispatchEvent(insertedEvent);
        return child;
    };
    Element.prototype.insertBefore = function (newChild, refChild) {
        if (!refChild) {
            this.appendChild(newChild);
        }
        else {
            if (newChild.parentElement) {
                newChild.parentElement.removeChild(newChild);
            }
            var index = this.childNodes.indexOf(refChild);
            if (index === -1) {
                this.appendChild(newChild);
            }
            else {
                this.appendChild(newChild, index);
            }
        }
        return newChild;
    };
    Element.prototype.replaceChild = function (newChild, oldChild) {
        var index = this.childNodes.indexOf(oldChild);
        this.removeChild(oldChild);
        this.appendChild(newChild, index);
        return oldChild;
    };
    Element.prototype.removeChild = function (child) {
        var _a;
        // should emit on itself before detach
        removedEvent.relatedNode = this;
        child.dispatchEvent(removedEvent);
        if ((_a = child.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView) {
            child.ownerDocument.defaultView.unmountChildren(child);
        }
        // remove from scene graph
        runtime.sceneGraphService.detach(child);
        return child;
    };
    /**
     * Remove all children which can be appended to its original parent later again.
     */
    Element.prototype.removeChildren = function () {
        for (var i = this.childNodes.length - 1; i >= 0; i--) {
            var child = this.childNodes[i];
            this.removeChild(child);
        }
    };
    /**
     * Recursively destroy all children which can not be appended to its original parent later again.
     */
    Element.prototype.destroyChildren = function () {
        for (var i = this.childNodes.length - 1; i >= 0; i--) {
            var child = this.childNodes[i];
            if (child.childNodes.length) {
                child.destroyChildren();
            }
            child.destroy();
        }
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/matches
     */
    Element.prototype.matches = function (selector) {
        return runtime.sceneGraphService.matches(selector, this);
    };
    Element.prototype.getElementById = function (id) {
        return runtime.sceneGraphService.querySelector("#".concat(id), this);
    };
    Element.prototype.getElementsByName = function (name) {
        return runtime.sceneGraphService.querySelectorAll("[name=\"".concat(name, "\"]"), this);
    };
    Element.prototype.getElementsByClassName = function (className) {
        return runtime.sceneGraphService.querySelectorAll(".".concat(className), this);
    };
    Element.prototype.getElementsByTagName = function (tagName) {
        return runtime.sceneGraphService.querySelectorAll(tagName, this);
    };
    Element.prototype.querySelector = function (selectors) {
        return runtime.sceneGraphService.querySelector(selectors, this);
    };
    Element.prototype.querySelectorAll = function (selectors) {
        return runtime.sceneGraphService.querySelectorAll(selectors, this);
    };
    /**
     * should traverses the element and its parents (heading toward the document root)
     * until it finds a node that matches the specified CSS selector.
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/closest
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/closest#polyfill
     */
    Element.prototype.closest = function (selectors) {
        var el = this;
        do {
            if (runtime.sceneGraphService.matches(selectors, el))
                return el;
            el = el.parentElement;
        } while (el !== null);
        return null;
    };
    /**
     * search in scene group, but should not include itself
     */
    Element.prototype.find = function (filter) {
        var _this = this;
        var target = null;
        this.forEach(function (object) {
            if (object !== _this && filter(object)) {
                target = object;
                return true;
            }
            return false;
        });
        return target;
    };
    Element.prototype.findAll = function (filter) {
        var _this = this;
        var objects = [];
        this.forEach(function (object) {
            if (object !== _this && filter(object)) {
                objects.push(object);
            }
        });
        return objects;
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/after
     */
    Element.prototype.after = function () {
        var _this = this;
        var nodes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            nodes[_i] = arguments[_i];
        }
        if (this.parentNode) {
            var index_1 = this.parentNode.childNodes.indexOf(this);
            nodes.forEach(function (node, i) { var _a; return (_a = _this.parentNode) === null || _a === void 0 ? void 0 : _a.appendChild(node, index_1 + i + 1); });
        }
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/before
     */
    Element.prototype.before = function () {
        var _a;
        var nodes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            nodes[_i] = arguments[_i];
        }
        if (this.parentNode) {
            var index = this.parentNode.childNodes.indexOf(this);
            var _b = __read(nodes), first = _b[0], rest = _b.slice(1);
            this.parentNode.appendChild(first, index);
            (_a = first).after.apply(_a, __spreadArray([], __read(rest), false));
        }
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/replaceWith
     */
    Element.prototype.replaceWith = function () {
        var nodes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            nodes[_i] = arguments[_i];
        }
        this.after.apply(this, __spreadArray([], __read(nodes), false));
        this.remove();
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/append
     */
    Element.prototype.append = function () {
        var _this = this;
        var nodes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            nodes[_i] = arguments[_i];
        }
        nodes.forEach(function (node) { return _this.appendChild(node); });
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/prepend
     */
    Element.prototype.prepend = function () {
        var _this = this;
        var nodes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            nodes[_i] = arguments[_i];
        }
        nodes.forEach(function (node, i) { return _this.appendChild(node, i); });
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/replaceChildren
     */
    Element.prototype.replaceChildren = function () {
        var nodes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            nodes[_i] = arguments[_i];
        }
        while (this.childNodes.length && this.firstChild) {
            this.removeChild(this.firstChild);
        }
        this.append.apply(this, __spreadArray([], __read(nodes), false));
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/remove
     */
    Element.prototype.remove = function () {
        if (this.parentNode) {
            return this.parentNode.removeChild(this);
        }
        return this;
    };
    Element.prototype.destroy = function () {
        // destroy itself before remove
        this.dispatchEvent(destroyEvent);
        // remove from scenegraph first
        this.remove();
        // remove event listeners
        this.emitter.removeAllListeners();
        this.destroyed = true;
    };
    Element.prototype.getGeometryBounds = function () {
        return runtime.sceneGraphService.getGeometryBounds(this);
    };
    Element.prototype.getRenderBounds = function () {
        return runtime.sceneGraphService.getBounds(this, true);
    };
    /**
     * get bounds in world space, account for children
     */
    Element.prototype.getBounds = function () {
        return runtime.sceneGraphService.getBounds(this);
    };
    /**
     * get bounds in local space, account for children
     */
    Element.prototype.getLocalBounds = function () {
        return runtime.sceneGraphService.getLocalBounds(this);
    };
    /**
     * account for context's bounds in client space,
     * but not accounting for children
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
     */
    Element.prototype.getBoundingClientRect = function () {
        return runtime.sceneGraphService.getBoundingClientRect(this);
    };
    /**
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getClientRects
     */
    Element.prototype.getClientRects = function () {
        return [this.getBoundingClientRect()];
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/computedStyleMap
     * eg. circle.computedStyleMap().get('fill');
     */
    Element.prototype.computedStyleMap = function () {
        return new Map(Object.entries(this.computedStyle));
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttributeNames
     */
    Element.prototype.getAttributeNames = function () {
        return Object.keys(this.attributes);
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute
     */
    Element.prototype.getAttribute = function (name) {
        // @see https://github.com/antvis/G/issues/1267
        if (isSymbol(name)) {
            return runtime.enableCSSParsing ? null : undefined;
        }
        var value = this.attributes[name];
        if (value === undefined) {
            var attributeName = formatAttributeName(name);
            value = this.attributes[attributeName];
            // if the given attribute does not exist, the value returned will either be null or ""
            return runtime.enableCSSParsing ? (isNil(value) ? null : value) : value;
        }
        else {
            return value;
        }
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/hasAttribute
     */
    Element.prototype.hasAttribute = function (qualifiedName) {
        return this.getAttributeNames().includes(qualifiedName);
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/hasAttributes
     */
    Element.prototype.hasAttributes = function () {
        return !!this.getAttributeNames().length;
    };
    /**
     * should use removeAttribute() instead of setting the attribute value to null either directly or using setAttribute(). Many attributes will not behave as expected if you set them to null.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/removeAttribute
     */
    Element.prototype.removeAttribute = function (attributeName) {
        this.setAttribute(attributeName, null);
        delete this.attributes[attributeName];
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
     */
    Element.prototype.setAttribute = function (attributeName, value, force) {
        this.attributes[attributeName] = value;
    };
    Element.prototype.getAttributeNS = function (namespace, localName) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.getAttributeNode = function (qualifiedName) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.getAttributeNodeNS = function (namespace, localName) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.hasAttributeNS = function (namespace, localName) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.removeAttributeNS = function (namespace, localName) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.removeAttributeNode = function (attr) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.setAttributeNS = function (namespace, qualifiedName, value) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.setAttributeNode = function (attr) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.setAttributeNodeNS = function (attr) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Element.prototype.toggleAttribute = function (qualifiedName, force) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    return Element;
}(Node));

function isDisplayObject(value) {
    return !!(value === null || value === void 0 ? void 0 : value.nodeName);
}
var mutationEvent = new MutationEvent(ElementEvent.ATTR_MODIFIED, null, null, null, null, MutationEvent.MODIFICATION, null, null);
var DEFAULT_STYLE_PROPS = {
    anchor: '',
    opacity: '',
    fillOpacity: '',
    strokeOpacity: '',
    fill: '',
    stroke: '',
    transform: '',
    transformOrigin: '',
    visibility: '',
    pointerEvents: '',
    lineWidth: '',
    lineCap: '',
    lineJoin: '',
    increasedLineWidthForHitTesting: '',
    fontSize: '',
    fontFamily: '',
    fontStyle: '',
    fontWeight: '',
    fontVariant: '',
    textAlign: '',
    textBaseline: '',
    textTransform: '',
    zIndex: '',
    filter: '',
    shadowType: '',
};
var DEFAULT_PARSED_STYLE_PROPS = {
    anchor: [0, 0],
    fill: noneColor,
    stroke: noneColor,
    transform: [],
    zIndex: 0,
    filter: [],
    shadowType: 'outer',
    miterLimit: 10,
};
var DEFAULT_PARSED_STYLE_PROPS_CSS_DISABLED = __assign(__assign({}, DEFAULT_PARSED_STYLE_PROPS), { opacity: 1, fillOpacity: 1, strokeOpacity: 1, visibility: 'visible', pointerEvents: 'auto', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter', increasedLineWidthForHitTesting: 0, fillRule: 'nonzero' });
var INHERITABLE_BASE_STYLE_PROPS = [
    'opacity',
    'fillOpacity',
    'strokeOpacity',
    'transformOrigin',
    'visibility',
    'pointerEvents',
    'lineWidth',
    'lineCap',
    'lineJoin',
    'increasedLineWidthForHitTesting',
];
var INHERITABLE_STYLE_PROPS = __spreadArray(__spreadArray([], __read(INHERITABLE_BASE_STYLE_PROPS), false), [
    'fontSize',
    'fontFamily',
    'fontStyle',
    'fontWeight',
    'fontVariant',
    'textAlign',
    'textBaseline',
    'textTransform',
], false);
var DATASET_PREFIX = 'data-';
/**
 * prototype chains: DisplayObject -> Element -> Node -> EventTarget
 *
 * mixins: Animatable, Transformable, Visible
 * @see https://github.com/tannerntannern/ts-mixer/blob/master/README.md#mixing-generic-classes
 *
 * Provide abilities in scene graph, such as:
 * * transform `translate/rotate/scale`
 * * add/remove child
 * * visibility and z-index
 *
 * Those abilities are implemented with those components: `Transform/Sortable/Visible`.
 *
 * Emit following events:
 * * init
 * * destroy
 * * attributeChanged
 */
var DisplayObject = /** @class */ (function (_super) {
    __extends(DisplayObject, _super);
    function DisplayObject(config) {
        var _a;
        var _this = _super.call(this) || this;
        _this.isCustomElement = false;
        _this.isMutationObserved = false;
        /**
         * push to active animations after calling `animate()`
         */
        _this.activeAnimations = [];
        /**
         * Use `this.style.clipPath` instead.
         * @deprecated
         */
        _this.getClip = function () {
            return this.style.clipPath || null;
        };
        // assign name, id to config
        // eg. group.get('name')
        _this.config = config;
        // compatible with G 3.0
        _this.config.interactive = (_a = _this.config.capture) !== null && _a !== void 0 ? _a : _this.config.interactive;
        // init scene graph node
        _this.id = _this.config.id || '';
        _this.name = _this.config.name || '';
        if (_this.config.className || _this.config.class) {
            _this.className = _this.config.className || _this.config.class;
        }
        _this.nodeName = _this.config.type || Shape.GROUP;
        // compatible with G 3.0
        _this.config.style =
            _this.config.style || _this.config.attrs || {};
        Object.assign(_this.config.style, _this.config.attrs);
        // this.config.style = {
        //   // ...DEFAULT_STYLE_PROPS,
        //   ...this.config.style,
        //   ...this.config.attrs,
        // };
        if (_this.config.visible != null) {
            _this.config.style.visibility =
                _this.config.visible === false ? 'hidden' : 'visible';
        }
        if (_this.config.interactive != null) {
            _this.config.style.pointerEvents =
                _this.config.interactive === false ? 'none' : 'auto';
        }
        // merge parsed value
        Object.assign(_this.parsedStyle, runtime.enableCSSParsing
            ? DEFAULT_PARSED_STYLE_PROPS
            : DEFAULT_PARSED_STYLE_PROPS_CSS_DISABLED, _this.config.initialParsedStyle);
        if (runtime.enableCSSParsing) {
            Object.assign(_this.attributes, DEFAULT_STYLE_PROPS);
        }
        // start to process attributes
        _this.initAttributes(_this.config.style);
        var Proxy = runtime.globalThis.Proxy
            ? runtime.globalThis.Proxy
            : function () { };
        if (runtime.enableDataset) {
            _this.dataset = new Proxy({}, {
                get: function (target, name) {
                    var formattedName = "".concat(DATASET_PREFIX).concat(kebabize(name));
                    if (target[formattedName] !== undefined) {
                        return target[formattedName];
                    }
                    return _this.getAttribute(formattedName);
                },
                set: function (_, prop, value) {
                    _this.setAttribute("".concat(DATASET_PREFIX).concat(kebabize(prop)), value);
                    return true;
                },
            });
        }
        if (runtime.enableStyleSyntax) {
            _this.style = new Proxy(
            // @ts-ignore
            {
                // ...this.attributes,
                setProperty: function (propertyName, value) {
                    _this.setAttribute(propertyName, value);
                },
                getPropertyValue: function (propertyName) {
                    return _this.getAttribute(propertyName);
                },
                removeProperty: function (propertyName) {
                    _this.removeAttribute(propertyName);
                },
                item: function () {
                    return '';
                },
            }, {
                get: function (target, name) {
                    if (target[name] !== undefined) {
                        // if (name in target) {
                        return target[name];
                    }
                    return _this.getAttribute(name);
                },
                set: function (_, prop, value) {
                    _this.setAttribute(prop, value);
                    return true;
                },
            });
        }
        return _this;
    }
    DisplayObject.prototype.destroy = function () {
        _super.prototype.destroy.call(this);
        // stop all active animations
        this.getAnimations().forEach(function (animation) {
            animation.cancel();
        });
        // FIXME
        // this.renderable = null;
        // this.cullable = null;
        // this.transformable = null;
        // this.rBushNode = null;
        // this.geometry = null;
        // this.sortable = null;
    };
    DisplayObject.prototype.cloneNode = function (deep, customCloneFunc) {
        var clonedStyle = __assign({}, this.attributes);
        for (var attributeName in clonedStyle) {
            var attribute = clonedStyle[attributeName];
            // @see https://github.com/antvis/G/issues/1095
            if (isDisplayObject(attribute) &&
                // share the same clipPath if possible
                attributeName !== 'clipPath' &&
                attributeName !== 'offsetPath' &&
                attributeName !== 'textPath') {
                clonedStyle[attributeName] = attribute.cloneNode(deep);
            }
            // TODO: clone other type
            if (customCloneFunc) {
                clonedStyle[attributeName] = customCloneFunc(attributeName, attribute);
            }
        }
        var cloned = new this.constructor({
            // copy id & name
            // @see https://developer.mozilla.org/en-US/docs/Web/API/Node/cloneNode#notes
            id: this.id,
            name: this.name,
            className: this.name,
            interactive: this.interactive,
            style: clonedStyle,
        });
        // apply transform
        cloned.setLocalTransform(this.getLocalTransform());
        if (deep) {
            this.children.forEach(function (child) {
                // skip marker
                if (!child.style.isMarker) {
                    var clonedChild = child.cloneNode(deep);
                    cloned.appendChild(clonedChild);
                }
            });
        }
        return cloned;
    };
    DisplayObject.prototype.initAttributes = function (attributes) {
        if (attributes === void 0) { attributes = {}; }
        var renderable = this.renderable;
        var options = {
            forceUpdateGeometry: true,
            // usedAttributes:
            //   // only Group / Text should account for text relative props
            //   this.tagName === Shape.GROUP || this.tagName === Shape.TEXT
            //     ? INHERITABLE_STYLE_PROPS
            //     : INHERITABLE_BASE_STYLE_PROPS,
        };
        if (runtime.enableCSSParsing) {
            // @ts-ignore
            options.usedAttributes = INHERITABLE_STYLE_PROPS;
        }
        // account for FCP, process properties as less as possible
        var formattedAttributes = {};
        for (var name_1 in attributes) {
            var attributeName = formatAttributeName(name_1);
            formattedAttributes[attributeName] = attributes[name_1];
        }
        runtime.styleValueRegistry.processProperties(this, formattedAttributes, options);
        // redraw at next frame
        renderable.dirty = true;
    };
    DisplayObject.prototype.setAttribute = function (name, value, force) {
        if (force === void 0) { force = false; }
        var attributeName = formatAttributeName(name);
        // ignore undefined value
        if (isUndefined(value)) {
            return;
        }
        if (force || value !== this.attributes[attributeName]) {
            this.internalSetAttribute(attributeName, value);
            _super.prototype.setAttribute.call(this, attributeName, value);
        }
    };
    /**
     * called when attributes get changed or initialized
     */
    DisplayObject.prototype.internalSetAttribute = function (name, value, parseOptions) {
        var _a;
        if (parseOptions === void 0) { parseOptions = {}; }
        var renderable = this.renderable;
        var oldValue = this.attributes[name];
        var oldParsedValue = this.parsedStyle[name];
        runtime.styleValueRegistry.processProperties(this, (_a = {},
            _a[name] = value,
            _a), parseOptions);
        // redraw at next frame
        renderable.dirty = true;
        var newParsedValue = this.parsedStyle[name];
        if (this.isConnected) {
            mutationEvent.relatedNode = this;
            mutationEvent.prevValue = oldValue;
            mutationEvent.newValue = value;
            mutationEvent.attrName = name;
            mutationEvent.prevParsedValue = oldParsedValue;
            mutationEvent.newParsedValue = newParsedValue;
            if (this.isMutationObserved) {
                this.dispatchEvent(mutationEvent);
            }
            else {
                mutationEvent.target = this;
                this.ownerDocument.defaultView.dispatchEvent(mutationEvent, true);
            }
        }
        if (((this.isCustomElement && this.isConnected) || !this.isCustomElement) &&
            this.attributeChangedCallback) {
            this.attributeChangedCallback(name, oldValue, value, oldParsedValue, newParsedValue);
        }
    };
    // #region transformable
    /**
     * returns different values than getBoundingClientRect(), as the latter returns value relative to the viewport
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox
     *
     * FIXME: It is worth noting that getBBox responds to original untransformed values of a drawn object.
     * @see https://www.w3.org/Graphics/SVG/IG/resources/svgprimer.html#getBBox
     */
    DisplayObject.prototype.getBBox = function () {
        var aabb = this.getBounds();
        var _a = __read(aabb.getMin(), 2), left = _a[0], top = _a[1];
        var _b = __read(aabb.getMax(), 2), right = _b[0], bottom = _b[1];
        return new Rectangle(left, top, right - left, bottom - top);
    };
    DisplayObject.prototype.setOrigin = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        runtime.sceneGraphService.setOrigin(this, createVec3(position, y, z));
        return this;
    };
    DisplayObject.prototype.getOrigin = function () {
        return runtime.sceneGraphService.getOrigin(this);
    };
    /**
     * set position in world space
     */
    DisplayObject.prototype.setPosition = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        runtime.sceneGraphService.setPosition(this, createVec3(position, y, z));
        return this;
    };
    /**
     * set position in local space
     */
    DisplayObject.prototype.setLocalPosition = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        runtime.sceneGraphService.setLocalPosition(this, createVec3(position, y, z));
        return this;
    };
    /**
     * translate in world space
     */
    DisplayObject.prototype.translate = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        runtime.sceneGraphService.translate(this, createVec3(position, y, z));
        return this;
    };
    /**
     * translate in local space
     */
    DisplayObject.prototype.translateLocal = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        runtime.sceneGraphService.translateLocal(this, createVec3(position, y, z));
        return this;
    };
    DisplayObject.prototype.getPosition = function () {
        return runtime.sceneGraphService.getPosition(this);
    };
    DisplayObject.prototype.getLocalPosition = function () {
        return runtime.sceneGraphService.getLocalPosition(this);
    };
    /**
     * compatible with G 3.0
     *
     * scaling in local space
     * scale(10) = scale(10, 10, 10)
     *
     * we can't set scale in world space
     */
    DisplayObject.prototype.scale = function (scaling, y, z) {
        return this.scaleLocal(scaling, y, z);
    };
    DisplayObject.prototype.scaleLocal = function (scaling, y, z) {
        if (typeof scaling === 'number') {
            y = y || scaling;
            z = z || scaling;
            scaling = createVec3(scaling, y, z);
        }
        runtime.sceneGraphService.scaleLocal(this, scaling);
        return this;
    };
    /**
     * set scaling in local space
     */
    DisplayObject.prototype.setLocalScale = function (scaling, y, z) {
        if (typeof scaling === 'number') {
            y = y || scaling;
            z = z || scaling;
            scaling = createVec3(scaling, y, z);
        }
        runtime.sceneGraphService.setLocalScale(this, scaling);
        return this;
    };
    /**
     * get scaling in local space
     */
    DisplayObject.prototype.getLocalScale = function () {
        return runtime.sceneGraphService.getLocalScale(this);
    };
    /**
     * get scaling in world space
     */
    DisplayObject.prototype.getScale = function () {
        return runtime.sceneGraphService.getScale(this);
    };
    /**
     * only return degrees of Z axis in world space
     */
    DisplayObject.prototype.getEulerAngles = function () {
        var _a = __read(getEuler(vec3.create(), runtime.sceneGraphService.getWorldTransform(this)), 3), ez = _a[2];
        return rad2deg(ez);
    };
    /**
     * only return degrees of Z axis in local space
     */
    DisplayObject.prototype.getLocalEulerAngles = function () {
        var _a = __read(getEuler(vec3.create(), runtime.sceneGraphService.getLocalRotation(this)), 3), ez = _a[2];
        return rad2deg(ez);
    };
    /**
     * set euler angles(degrees) in world space
     */
    DisplayObject.prototype.setEulerAngles = function (z) {
        runtime.sceneGraphService.setEulerAngles(this, 0, 0, z);
        return this;
    };
    /**
     * set euler angles(degrees) in local space
     */
    DisplayObject.prototype.setLocalEulerAngles = function (z) {
        runtime.sceneGraphService.setLocalEulerAngles(this, 0, 0, z);
        return this;
    };
    DisplayObject.prototype.rotateLocal = function (x, y, z) {
        if (isNil(y) && isNil(z)) {
            runtime.sceneGraphService.rotateLocal(this, 0, 0, x);
        }
        else {
            runtime.sceneGraphService.rotateLocal(this, x, y, z);
        }
        return this;
    };
    DisplayObject.prototype.rotate = function (x, y, z) {
        if (isNil(y) && isNil(z)) {
            runtime.sceneGraphService.rotate(this, 0, 0, x);
        }
        else {
            runtime.sceneGraphService.rotate(this, x, y, z);
        }
        return this;
    };
    DisplayObject.prototype.setRotation = function (rotation, y, z, w) {
        runtime.sceneGraphService.setRotation(this, rotation, y, z, w);
        return this;
    };
    DisplayObject.prototype.setLocalRotation = function (rotation, y, z, w) {
        runtime.sceneGraphService.setLocalRotation(this, rotation, y, z, w);
        return this;
    };
    DisplayObject.prototype.setLocalSkew = function (skew, y) {
        runtime.sceneGraphService.setLocalSkew(this, skew, y);
        return this;
    };
    DisplayObject.prototype.getRotation = function () {
        return runtime.sceneGraphService.getRotation(this);
    };
    DisplayObject.prototype.getLocalRotation = function () {
        return runtime.sceneGraphService.getLocalRotation(this);
    };
    DisplayObject.prototype.getLocalSkew = function () {
        return runtime.sceneGraphService.getLocalSkew(this);
    };
    DisplayObject.prototype.getLocalTransform = function () {
        return runtime.sceneGraphService.getLocalTransform(this);
    };
    DisplayObject.prototype.getWorldTransform = function () {
        return runtime.sceneGraphService.getWorldTransform(this);
    };
    DisplayObject.prototype.setLocalTransform = function (transform) {
        runtime.sceneGraphService.setLocalTransform(this, transform);
        return this;
    };
    DisplayObject.prototype.resetLocalTransform = function () {
        runtime.sceneGraphService.resetLocalTransform(this);
    };
    // #endregion transformable
    // #region animatable
    /**
     * returns an array of all Animation objects affecting this element
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations
     */
    DisplayObject.prototype.getAnimations = function () {
        return this.activeAnimations;
    };
    /**
     * create an animation with WAAPI
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/animate
     */
    DisplayObject.prototype.animate = function (keyframes, options) {
        var _a;
        var timeline = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.timeline;
        if (timeline) {
            return timeline.play(this, keyframes, options);
        }
        return null;
    };
    // #endregion animatable
    // #region visible
    /**
     * shortcut for Used value of `visibility`
     */
    DisplayObject.prototype.isVisible = function () {
        var _a;
        return ((_a = this.parsedStyle) === null || _a === void 0 ? void 0 : _a.visibility) === 'visible';
    };
    Object.defineProperty(DisplayObject.prototype, "interactive", {
        get: function () {
            return this.isInteractive();
        },
        set: function (b) {
            this.style.pointerEvents = b ? 'auto' : 'none';
        },
        enumerable: false,
        configurable: true
    });
    DisplayObject.prototype.isInteractive = function () {
        var _a;
        return ((_a = this.parsedStyle) === null || _a === void 0 ? void 0 : _a.pointerEvents) !== 'none';
    };
    DisplayObject.prototype.isCulled = function () {
        return !!(this.cullable && this.cullable.enable && !this.cullable.visible);
    };
    /**
     * bring to front in current group
     */
    DisplayObject.prototype.toFront = function () {
        if (this.parentNode) {
            this.style.zIndex =
                Math.max.apply(Math, __spreadArray([], __read(this.parentNode.children.map(function (child) {
                    return Number(child.style.zIndex);
                })), false)) + 1;
        }
        return this;
    };
    /**
     * send to back in current group
     */
    DisplayObject.prototype.toBack = function () {
        if (this.parentNode) {
            this.style.zIndex =
                Math.min.apply(Math, __spreadArray([], __read(this.parentNode.children.map(function (child) {
                    return Number(child.style.zIndex);
                })), false)) - 1;
        }
        return this;
    };
    // #endregion visible
    // #region deprecated
    /**
     * compatible with G 3.0
     * @alias object.config
     * @deprecated
     */
    DisplayObject.prototype.getConfig = function () {
        return this.config;
    };
    DisplayObject.prototype.attr = function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _a = __read(args, 2), name = _a[0], value = _a[1];
        if (!name) {
            return this.attributes;
        }
        if (isObject(name)) {
            Object.keys(name).forEach(function (key) {
                _this.setAttribute(key, name[key]);
            });
            return this;
        }
        if (args.length === 2) {
            this.setAttribute(name, value);
            return this;
        }
        return this.attributes[name];
    };
    /**
     * return 3x3 matrix in world space
     * @deprecated
     */
    DisplayObject.prototype.getMatrix = function (transformMat4) {
        var transform = transformMat4 || this.getWorldTransform();
        var _a = __read(mat4.getTranslation(vec3.create(), transform), 2), tx = _a[0], ty = _a[1];
        var _b = __read(mat4.getScaling(vec3.create(), transform), 2), sx = _b[0], sy = _b[1];
        var rotation = mat4.getRotation(quat$1.create(), transform);
        var _c = __read(getEuler(vec3.create(), rotation), 3), eux = _c[0], euz = _c[2];
        // gimbal lock at 90 degrees
        return fromRotationTranslationScale(eux || euz, tx, ty, sx, sy);
    };
    /**
     * return 3x3 matrix in local space
     * @deprecated
     */
    DisplayObject.prototype.getLocalMatrix = function () {
        return this.getMatrix(this.getLocalTransform());
    };
    /**
     * set 3x3 matrix in world space
     * @deprecated
     */
    DisplayObject.prototype.setMatrix = function (mat) {
        var _a = __read(decompose(mat), 5), tx = _a[0], ty = _a[1], scalingX = _a[2], scalingY = _a[3], angle = _a[4];
        this.setEulerAngles(angle)
            .setPosition(tx, ty)
            .setLocalScale(scalingX, scalingY);
    };
    /**
     * set 3x3 matrix in local space
     * @deprecated
     */
    DisplayObject.prototype.setLocalMatrix = function (mat) {
        var _a = __read(decompose(mat), 5), tx = _a[0], ty = _a[1], scalingX = _a[2], scalingY = _a[3], angle = _a[4];
        this.setLocalEulerAngles(angle)
            .setLocalPosition(tx, ty)
            .setLocalScale(scalingX, scalingY);
    };
    /**
     * Use `visibility: visible` instead.
     * @deprecated
     */
    DisplayObject.prototype.show = function () {
        if (runtime.enableCSSParsing) {
            this.style.visibility = 'visible';
        }
        else {
            this.forEach(function (object) {
                object.style.visibility = 'visible';
            });
        }
    };
    /**
     * Use `visibility: hidden` instead.
     * @deprecated
     */
    DisplayObject.prototype.hide = function () {
        if (runtime.enableCSSParsing) {
            this.style.visibility = 'hidden';
        }
        else {
            this.forEach(function (object) {
                object.style.visibility = 'hidden';
            });
        }
    };
    /**
     * Use `childElementCount` instead.
     * @deprecated
     */
    DisplayObject.prototype.getCount = function () {
        return this.childElementCount;
    };
    /**
     * Use `parentElement` instead.
     * @deprecated
     */
    DisplayObject.prototype.getParent = function () {
        return this.parentElement;
    };
    /**
     * Use `children` instead.
     * @deprecated
     */
    DisplayObject.prototype.getChildren = function () {
        return this.children;
    };
    /**
     * Use `firstElementChild` instead.
     * @deprecated
     */
    DisplayObject.prototype.getFirst = function () {
        return this.firstElementChild;
    };
    /**
     * Use `lastElementChild` instead.
     * @deprecated
     */
    DisplayObject.prototype.getLast = function () {
        return this.lastElementChild;
    };
    /**
     * Use `this.children[index]` instead.
     * @deprecated
     */
    DisplayObject.prototype.getChildByIndex = function (index) {
        return this.children[index] || null;
    };
    /**
     * Use `appendChild` instead.
     * @deprecated
     */
    DisplayObject.prototype.add = function (child, index) {
        return this.appendChild(child, index);
    };
    /**
     * Use `this.style.clipPath` instead.
     * @deprecated
     */
    DisplayObject.prototype.setClip = function (clipPath) {
        this.style.clipPath = clipPath;
    };
    /**
     * @deprecated
     */
    DisplayObject.prototype.set = function (name, value) {
        // @ts-ignore
        this.config[name] = value;
    };
    /**
     * @deprecated
     */
    DisplayObject.prototype.get = function (name) {
        return this.config[name];
    };
    /**
     * Use `setPosition` instead.
     * @deprecated
     */
    DisplayObject.prototype.moveTo = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        this.setPosition(position, y, z);
        return this;
    };
    /**
     * Use `setPosition` instead.
     * @deprecated
     */
    DisplayObject.prototype.move = function (position, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        this.setPosition(position, y, z);
        return this;
    };
    /**
     * Use `this.style.zIndex` instead.
     * @deprecated
     */
    DisplayObject.prototype.setZIndex = function (zIndex) {
        this.style.zIndex = zIndex;
        return this;
    };
    return DisplayObject;
}(Element));

/**
 * holds useful CSS-related methods.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CSS
 *
 * * CSS Typed OM @see https://developer.mozilla.org/en-US/docs/Web/API/CSS/factory_functions
 * * register property @see https://developer.mozilla.org/en-US/docs/Web/API/CSS/RegisterProperty
 * * CSS Layout API
 */
var CSS = {
    /**
     * <number>
     * @see https://drafts.csswg.org/css-values-4/#number-value
     */
    number: function (n) {
        return new CSSUnitValue(n);
    },
    /**
     * <percentage>
     * @see https://drafts.csswg.org/css-values-4/#percentage-value
     */
    percent: function (n) {
        return new CSSUnitValue(n, '%');
    },
    /**
     * <length>
     */
    px: function (n) {
        return new CSSUnitValue(n, 'px');
    },
    /**
     * <length>
     */
    em: function (n) {
        return new CSSUnitValue(n, 'em');
    },
    rem: function (n) {
        return new CSSUnitValue(n, 'rem');
    },
    /**
     * <angle>
     */
    deg: function (n) {
        return new CSSUnitValue(n, 'deg');
    },
    /**
     * <angle>
     */
    grad: function (n) {
        return new CSSUnitValue(n, 'grad');
    },
    /**
     * <angle>
     */
    rad: function (n) {
        return new CSSUnitValue(n, 'rad');
    },
    /**
     * <angle>
     */
    turn: function (n) {
        return new CSSUnitValue(n, 'turn');
    },
    /**
     * <time>
     */
    s: function (n) {
        return new CSSUnitValue(n, 's');
    },
    /**
     * <time>
     */
    ms: function (n) {
        return new CSSUnitValue(n, 'ms');
    },
    /**
     * CSS Properties & Values API
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CSS_Properties_and_Values_API
     * @see https://drafts.css-houdini.org/css-properties-values-api/#registering-custom-properties
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CSS/RegisterProperty
     */
    registerProperty: function (definition) {
        var name = definition.name, inherits = definition.inherits, interpolable = definition.interpolable, initialValue = definition.initialValue, syntax = definition.syntax;
        runtime.styleValueRegistry.registerMetadata({
            n: name,
            inh: inherits,
            int: interpolable,
            d: initialValue,
            syntax: syntax,
        });
    },
    /**
     * CSS Layout API
     * register layout
     *
     * @see https://github.com/w3c/css-houdini-drafts/blob/main/css-layout-api/EXPLAINER.md
     * @see https://developer.mozilla.org/en-US/docs/Web/Guide/Houdini#css_layout_api
     */
    registerLayout: function (name, clazz) {
        runtime.layoutRegistry.registerLayout(name, clazz);
    },
};

var Circle = /** @class */ (function (_super) {
    __extends(Circle, _super);
    function Circle(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.CIRCLE, style: runtime.enableCSSParsing
                ? __assign({ cx: '', cy: '', r: '' }, style) : __assign({}, style), initialParsedStyle: {
                anchor: [0.5, 0.5],
                transformOrigin: runtime.enableCSSParsing
                    ? null
                    : [PECENTAGE_50, PECENTAGE_50],
            } }, rest)) || this;
    }
    return Circle;
}(DisplayObject));

/**
 * shadow root
 * @see https://yuque.antfin-inc.com/antv/czqvg5/pgqipg
 */
var CustomElement = /** @class */ (function (_super) {
    __extends(CustomElement, _super);
    // private shadowNodes: DisplayObject[] = [];
    function CustomElement(_a) {
        var _this = this;
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        _this = _super.call(this, __assign({ style: runtime.enableCSSParsing
                ? __assign({ x: '', y: '' }, style) : __assign({}, style) }, rest)) || this;
        // static get observedAttributes(): string[] {
        //   return [];
        // }
        _this.isCustomElement = true;
        return _this;
    }
    return CustomElement;
}(DisplayObject));

var Ellipse = /** @class */ (function (_super) {
    __extends(Ellipse, _super);
    function Ellipse(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.ELLIPSE, style: runtime.enableCSSParsing
                ? __assign({ cx: '', cy: '', rx: '', ry: '' }, style) : __assign({}, style), initialParsedStyle: {
                anchor: [0.5, 0.5],
                transformOrigin: runtime.enableCSSParsing
                    ? null
                    : [PECENTAGE_50, PECENTAGE_50],
            } }, rest)) || this;
    }
    return Ellipse;
}(DisplayObject));

/**
 * its attributes are inherited by its children.
 * @see https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/g
 *
 * @example
 * <g fill="white" stroke="green" stroke-width="5">
    <circle cx="40" cy="40" r="25" />
    <circle cx="60" cy="60" r="25" />
  </g>
 */
var Group = /** @class */ (function (_super) {
    __extends(Group, _super);
    function Group(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.GROUP, style: runtime.enableCSSParsing
                ? __assign({ x: '', y: '', width: '', height: '' }, style) : __assign({}, style) }, rest)) || this;
    }
    return Group;
}(DisplayObject));

/**
 * HTML container
 * @see https://github.com/pmndrs/drei#html
 */
var HTML = /** @class */ (function (_super) {
    __extends(HTML, _super);
    function HTML(_a) {
        var _this = this;
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        _this = _super.call(this, __assign({ type: Shape.HTML, style: runtime.enableCSSParsing
                ? __assign({ x: '', y: '', width: 'auto', height: 'auto', innerHTML: '' }, style) : __assign({}, style) }, rest)) || this;
        _this.cullable.enable = false;
        return _this;
    }
    /**
     * return wrapper HTMLElement
     * * <div> in g-webgl/canvas
     * * <foreignObject> in g-svg
     */
    HTML.prototype.getDomElement = function () {
        return this.parsedStyle.$el;
    };
    /**
     * override with $el.getBoundingClientRect
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getBoundingClientRect
     */
    HTML.prototype.getBoundingClientRect = function () {
        if (this.parsedStyle.$el) {
            return this.parsedStyle.$el.getBoundingClientRect();
        }
        else {
            var _a = this.parsedStyle, x = _a.x, y = _a.y, width = _a.width, height = _a.height;
            return new Rectangle(x, y, width, height);
        }
    };
    HTML.prototype.getClientRects = function () {
        return [this.getBoundingClientRect()];
    };
    HTML.prototype.getBounds = function () {
        var _a, _b;
        var clientRect = this.getBoundingClientRect();
        // calc context's offset
        // @ts-ignore
        var canvasRect = (_b = (_a = this.ownerDocument) === null || _a === void 0 ? void 0 : _a.defaultView) === null || _b === void 0 ? void 0 : _b.getContextService().getBoundingClientRect();
        var aabb = new AABB();
        var minX = clientRect.left - ((canvasRect === null || canvasRect === void 0 ? void 0 : canvasRect.left) || 0);
        var minY = clientRect.top - ((canvasRect === null || canvasRect === void 0 ? void 0 : canvasRect.top) || 0);
        aabb.setMinMax([minX, minY, 0], [minX + clientRect.width, minY + clientRect.height, 0]);
        return aabb;
    };
    HTML.prototype.getLocalBounds = function () {
        if (this.parentNode) {
            var parentInvert = mat4.invert(mat4.create(), this.parentNode.getWorldTransform());
            var bounds = this.getBounds();
            if (!AABB.isEmpty(bounds)) {
                var localBounds = new AABB();
                localBounds.setFromTransformedAABB(bounds, parentInvert);
                return localBounds;
            }
        }
        return this.getBounds();
    };
    return HTML;
}(DisplayObject));

var Image = /** @class */ (function (_super) {
    __extends(Image, _super);
    function Image(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.IMAGE, style: runtime.enableCSSParsing
                ? __assign({ x: '', y: '', img: '', width: '', height: '' }, style) : __assign({}, style) }, rest)) || this;
    }
    return Image;
}(DisplayObject));

/**
 * Create a line connecting two points.
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line
 *
 * Also support for using marker.
 */
var Line = /** @class */ (function (_super) {
    __extends(Line, _super);
    function Line(_a) {
        var _this = this;
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        _this = _super.call(this, __assign({ type: Shape.LINE, style: __assign({ x1: 0, y1: 0, x2: 0, y2: 0, z1: 0, z2: 0, isBillboard: false }, style) }, rest)) || this;
        _this.markerStartAngle = 0;
        _this.markerEndAngle = 0;
        var _b = _this.parsedStyle, markerStart = _b.markerStart, markerEnd = _b.markerEnd;
        if (markerStart && isDisplayObject(markerStart)) {
            _this.markerStartAngle = markerStart.getLocalEulerAngles();
            _this.appendChild(markerStart);
        }
        if (markerEnd && isDisplayObject(markerEnd)) {
            _this.markerEndAngle = markerEnd.getLocalEulerAngles();
            _this.appendChild(markerEnd);
        }
        _this.transformMarker(true);
        _this.transformMarker(false);
        return _this;
    }
    Line.prototype.attributeChangedCallback = function (attrName, oldValue, newValue, prevParsedValue, newParsedValue) {
        if (attrName === 'x1' ||
            attrName === 'y1' ||
            attrName === 'x2' ||
            attrName === 'y2' ||
            attrName === 'markerStartOffset' ||
            attrName === 'markerEndOffset') {
            this.transformMarker(true);
            this.transformMarker(false);
        }
        else if (attrName === 'markerStart') {
            if (prevParsedValue && isDisplayObject(prevParsedValue)) {
                this.markerStartAngle = 0;
                prevParsedValue.remove();
            }
            // CSSKeyword 'unset'
            if (newParsedValue && isDisplayObject(newParsedValue)) {
                this.markerStartAngle = newParsedValue.getLocalEulerAngles();
                this.appendChild(newParsedValue);
                this.transformMarker(true);
            }
        }
        else if (attrName === 'markerEnd') {
            if (prevParsedValue && isDisplayObject(prevParsedValue)) {
                this.markerEndAngle = 0;
                prevParsedValue.remove();
            }
            if (newParsedValue && isDisplayObject(newParsedValue)) {
                this.markerEndAngle = newParsedValue.getLocalEulerAngles();
                this.appendChild(newParsedValue);
                this.transformMarker(false);
            }
        }
    };
    Line.prototype.transformMarker = function (isStart) {
        var _a = this.parsedStyle, markerStart = _a.markerStart, markerEnd = _a.markerEnd, markerStartOffset = _a.markerStartOffset, markerEndOffset = _a.markerEndOffset, x1 = _a.x1, x2 = _a.x2, y1 = _a.y1, y2 = _a.y2, defX = _a.defX, defY = _a.defY;
        var marker = isStart ? markerStart : markerEnd;
        if (!marker || !isDisplayObject(marker)) {
            return;
        }
        var rad = 0;
        var x;
        var y;
        var ox;
        var oy;
        var offset;
        var originalAngle;
        if (isStart) {
            ox = x1 - defX;
            oy = y1 - defY;
            x = x2 - x1;
            y = y2 - y1;
            offset = markerStartOffset || 0;
            originalAngle = this.markerStartAngle;
        }
        else {
            ox = x2 - defX;
            oy = y2 - defY;
            x = x1 - x2;
            y = y1 - y2;
            offset = markerEndOffset || 0;
            originalAngle = this.markerEndAngle;
        }
        rad = Math.atan2(y, x);
        // account for markerOffset
        marker.setLocalEulerAngles((rad * 180) / Math.PI + originalAngle);
        marker.setLocalPosition(ox + Math.cos(rad) * offset, oy + Math.sin(rad) * offset);
    };
    Line.prototype.getPoint = function (ratio, inWorldSpace) {
        if (inWorldSpace === void 0) { inWorldSpace = false; }
        // TODO: account for z1/z2 in 3D line
        var _a = this.parsedStyle, x1 = _a.x1, y1 = _a.y1, x2 = _a.x2, y2 = _a.y2, defX = _a.defX, defY = _a.defY;
        var _b = linePointAt(x1, y1, x2, y2, ratio), x = _b.x, y = _b.y;
        var transformed = vec3.transformMat4(vec3.create(), vec3.fromValues(x - defX, y - defY, 0), inWorldSpace ? this.getWorldTransform() : this.getLocalTransform());
        // apply local transformation
        return new Point(transformed[0], transformed[1]);
    };
    Line.prototype.getPointAtLength = function (distance, inWorldSpace) {
        if (inWorldSpace === void 0) { inWorldSpace = false; }
        return this.getPoint(distance / this.getTotalLength(), inWorldSpace);
    };
    Line.prototype.getTotalLength = function () {
        // TODO: account for z1/z2 in 3D line
        var _a = this.parsedStyle, x1 = _a.x1, y1 = _a.y1, x2 = _a.x2, y2 = _a.y2;
        return lineLength(x1, y1, x2, y2);
    };
    return Line;
}(DisplayObject));

var Path = /** @class */ (function (_super) {
    __extends(Path, _super);
    function Path(_a) {
        var _this = this;
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        _this = _super.call(this, __assign({ type: Shape.PATH, style: runtime.enableCSSParsing
                ? __assign({ path: '', miterLimit: '' }, style) : __assign({}, style), initialParsedStyle: runtime.enableCSSParsing
                ? null
                : {
                    miterLimit: 4,
                    path: __assign({}, EMPTY_PARSED_PATH),
                } }, rest)) || this;
        _this.markerStartAngle = 0;
        _this.markerEndAngle = 0;
        /**
         * markers placed at the mid
         */
        _this.markerMidList = [];
        var _b = _this.parsedStyle, markerStart = _b.markerStart, markerEnd = _b.markerEnd, markerMid = _b.markerMid;
        if (markerStart && isDisplayObject(markerStart)) {
            _this.markerStartAngle = markerStart.getLocalEulerAngles();
            _this.appendChild(markerStart);
        }
        if (markerMid && isDisplayObject(markerMid)) {
            _this.placeMarkerMid(markerMid);
        }
        if (markerEnd && isDisplayObject(markerEnd)) {
            _this.markerEndAngle = markerEnd.getLocalEulerAngles();
            _this.appendChild(markerEnd);
        }
        _this.transformMarker(true);
        _this.transformMarker(false);
        return _this;
    }
    Path.prototype.attributeChangedCallback = function (attrName, oldValue, newValue, prevParsedValue, newParsedValue) {
        if (attrName === 'path') {
            // recalc markers
            this.transformMarker(true);
            this.transformMarker(false);
            this.placeMarkerMid(this.parsedStyle.markerMid);
        }
        else if (attrName === 'markerStartOffset' ||
            attrName === 'markerEndOffset') {
            this.transformMarker(true);
            this.transformMarker(false);
        }
        else if (attrName === 'markerStart') {
            if (prevParsedValue && isDisplayObject(prevParsedValue)) {
                this.markerStartAngle = 0;
                prevParsedValue.remove();
            }
            // CSSKeyword 'unset'
            if (newParsedValue && isDisplayObject(newParsedValue)) {
                this.markerStartAngle = newParsedValue.getLocalEulerAngles();
                this.appendChild(newParsedValue);
                this.transformMarker(true);
            }
        }
        else if (attrName === 'markerEnd') {
            if (prevParsedValue && isDisplayObject(prevParsedValue)) {
                this.markerEndAngle = 0;
                prevParsedValue.remove();
            }
            if (newParsedValue && isDisplayObject(newParsedValue)) {
                this.markerEndAngle = newParsedValue.getLocalEulerAngles();
                this.appendChild(newParsedValue);
                this.transformMarker(false);
            }
        }
        else if (attrName === 'markerMid') {
            this.placeMarkerMid(newParsedValue);
        }
    };
    Path.prototype.transformMarker = function (isStart) {
        var _a = this.parsedStyle, markerStart = _a.markerStart, markerEnd = _a.markerEnd, markerStartOffset = _a.markerStartOffset, markerEndOffset = _a.markerEndOffset, defX = _a.defX, defY = _a.defY;
        var marker = isStart ? markerStart : markerEnd;
        if (!marker || !isDisplayObject(marker)) {
            return;
        }
        var rad = 0;
        var x;
        var y;
        var ox;
        var oy;
        var offset;
        var originalAngle;
        if (isStart) {
            var _b = __read(this.getStartTangent(), 2), p1 = _b[0], p2 = _b[1];
            ox = p2[0] - defX;
            oy = p2[1] - defY;
            x = p1[0] - p2[0];
            y = p1[1] - p2[1];
            offset = markerStartOffset || 0;
            originalAngle = this.markerStartAngle;
        }
        else {
            var _c = __read(this.getEndTangent(), 2), p1 = _c[0], p2 = _c[1];
            ox = p2[0] - defX;
            oy = p2[1] - defY;
            x = p1[0] - p2[0];
            y = p1[1] - p2[1];
            offset = markerEndOffset || 0;
            originalAngle = this.markerEndAngle;
        }
        rad = Math.atan2(y, x);
        // account for markerOffset
        marker.setLocalEulerAngles((rad * 180) / Math.PI + originalAngle);
        marker.setLocalPosition(ox + Math.cos(rad) * offset, oy + Math.sin(rad) * offset);
    };
    Path.prototype.placeMarkerMid = function (marker) {
        var _a = this.parsedStyle, segments = _a.path.segments, defX = _a.defX, defY = _a.defY;
        // clear all existed markers
        this.markerMidList.forEach(function (marker) {
            marker.remove();
        });
        if (marker && isDisplayObject(marker)) {
            for (var i = 1; i < segments.length - 1; i++) {
                var _b = __read(segments[i].currentPoint, 2), ox = _b[0], oy = _b[1];
                var cloned = i === 1 ? marker : marker.cloneNode(true);
                this.markerMidList.push(cloned);
                this.appendChild(cloned);
                cloned.setLocalPosition(ox - defX, oy - defY);
                // TODO: orient of marker
            }
        }
    };
    /**
     * Returns the total length of the path.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getTotalLength
     */
    Path.prototype.getTotalLength = function () {
        return getOrCalculatePathTotalLength(this);
    };
    /**
     * Returns the point at a given distance along the path.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getPointAtLength
     */
    Path.prototype.getPointAtLength = function (distance, inWorldSpace) {
        if (inWorldSpace === void 0) { inWorldSpace = false; }
        var _a = this.parsedStyle, defX = _a.defX, defY = _a.defY, absolutePath = _a.path.absolutePath;
        var _b = getPointAtLength(absolutePath, distance), x = _b.x, y = _b.y;
        var transformed = vec3.transformMat4(vec3.create(), vec3.fromValues(x - defX, y - defY, 0), inWorldSpace ? this.getWorldTransform() : this.getLocalTransform());
        // apply local transformation
        return new Point(transformed[0], transformed[1]);
    };
    /**
     * Returns the point at a given ratio of the total length in path.
     */
    Path.prototype.getPoint = function (ratio, inWorldSpace) {
        if (inWorldSpace === void 0) { inWorldSpace = false; }
        return this.getPointAtLength(ratio * getOrCalculatePathTotalLength(this), inWorldSpace);
    };
    /**
     * Get start tangent vector
     */
    Path.prototype.getStartTangent = function () {
        var segments = this.parsedStyle.path.segments;
        var result = [];
        if (segments.length > 1) {
            var startPoint = segments[0].currentPoint;
            var endPoint = segments[1].currentPoint;
            var tangent = segments[1].startTangent;
            result = [];
            if (tangent) {
                result.push([startPoint[0] - tangent[0], startPoint[1] - tangent[1]]);
                result.push([startPoint[0], startPoint[1]]);
            }
            else {
                result.push([endPoint[0], endPoint[1]]);
                result.push([startPoint[0], startPoint[1]]);
            }
        }
        return result;
    };
    /**
     * Get end tangent vector
     */
    Path.prototype.getEndTangent = function () {
        var segments = this.parsedStyle.path.segments;
        var length = segments.length;
        var result = [];
        if (length > 1) {
            var startPoint = segments[length - 2].currentPoint;
            var endPoint = segments[length - 1].currentPoint;
            var tangent = segments[length - 1].endTangent;
            result = [];
            if (tangent) {
                result.push([endPoint[0] - tangent[0], endPoint[1] - tangent[1]]);
                result.push([endPoint[0], endPoint[1]]);
            }
            else {
                result.push([startPoint[0], startPoint[1]]);
                result.push([endPoint[0], endPoint[1]]);
            }
        }
        return result;
    };
    return Path;
}(DisplayObject));

var Polygon = /** @class */ (function (_super) {
    __extends(Polygon, _super);
    function Polygon(_a) {
        var _this = this;
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        _this = _super.call(this, __assign({ type: Shape.POLYGON, style: runtime.enableCSSParsing
                ? __assign({ points: '', miterLimit: '', isClosed: true }, style) : __assign({}, style), initialParsedStyle: runtime.enableCSSParsing
                ? null
                : {
                    points: {
                        points: [],
                        totalLength: 0,
                        segments: [],
                    },
                    miterLimit: 4,
                    isClosed: true,
                } }, rest)) || this;
        _this.markerStartAngle = 0;
        _this.markerEndAngle = 0;
        /**
         * markers placed at the mid
         */
        _this.markerMidList = [];
        var _b = _this.parsedStyle, markerStart = _b.markerStart, markerEnd = _b.markerEnd, markerMid = _b.markerMid;
        if (markerStart && isDisplayObject(markerStart)) {
            _this.markerStartAngle = markerStart.getLocalEulerAngles();
            _this.appendChild(markerStart);
        }
        if (markerMid && isDisplayObject(markerMid)) {
            _this.placeMarkerMid(markerMid);
        }
        if (markerEnd && isDisplayObject(markerEnd)) {
            _this.markerEndAngle = markerEnd.getLocalEulerAngles();
            _this.appendChild(markerEnd);
        }
        _this.transformMarker(true);
        _this.transformMarker(false);
        return _this;
    }
    Polygon.prototype.attributeChangedCallback = function (attrName, oldValue, newValue, prevParsedValue, newParsedValue) {
        if (attrName === 'points') {
            // recalc markers
            this.transformMarker(true);
            this.transformMarker(false);
            this.placeMarkerMid(this.parsedStyle.markerMid);
        }
        else if (attrName === 'markerStartOffset' ||
            attrName === 'markerEndOffset') {
            this.transformMarker(true);
            this.transformMarker(false);
        }
        else if (attrName === 'markerStart') {
            if (prevParsedValue && isDisplayObject(prevParsedValue)) {
                this.markerStartAngle = 0;
                prevParsedValue.remove();
            }
            // CSSKeyword 'unset'
            if (newParsedValue && isDisplayObject(newParsedValue)) {
                this.markerStartAngle = newParsedValue.getLocalEulerAngles();
                this.appendChild(newParsedValue);
                this.transformMarker(true);
            }
        }
        else if (attrName === 'markerEnd') {
            if (prevParsedValue && isDisplayObject(prevParsedValue)) {
                this.markerEndAngle = 0;
                prevParsedValue.remove();
            }
            if (newParsedValue && isDisplayObject(newParsedValue)) {
                this.markerEndAngle = newParsedValue.getLocalEulerAngles();
                this.appendChild(newParsedValue);
                this.transformMarker(false);
            }
        }
        else if (attrName === 'markerMid') {
            this.placeMarkerMid(newParsedValue);
        }
    };
    Polygon.prototype.transformMarker = function (isStart) {
        var _a = this.parsedStyle, markerStart = _a.markerStart, markerEnd = _a.markerEnd, markerStartOffset = _a.markerStartOffset, markerEndOffset = _a.markerEndOffset, P = _a.points, defX = _a.defX, defY = _a.defY;
        var points = (P || {}).points;
        var marker = isStart ? markerStart : markerEnd;
        if (!marker || !isDisplayObject(marker) || !points) {
            return;
        }
        var rad = 0;
        var x;
        var y;
        var ox;
        var oy;
        var offset;
        var originalAngle;
        ox = points[0][0] - defX;
        oy = points[0][1] - defY;
        if (isStart) {
            x = points[1][0] - points[0][0];
            y = points[1][1] - points[0][1];
            offset = markerStartOffset || 0;
            originalAngle = this.markerStartAngle;
        }
        else {
            var length_1 = points.length;
            if (!this.parsedStyle.isClosed) {
                ox = points[length_1 - 1][0] - defX;
                oy = points[length_1 - 1][1] - defY;
                x = points[length_1 - 2][0] - points[length_1 - 1][0];
                y = points[length_1 - 2][1] - points[length_1 - 1][1];
            }
            else {
                x = points[length_1 - 1][0] - points[0][0];
                y = points[length_1 - 1][1] - points[0][1];
            }
            offset = markerEndOffset || 0;
            originalAngle = this.markerEndAngle;
        }
        rad = Math.atan2(y, x);
        // account for markerOffset
        marker.setLocalEulerAngles((rad * 180) / Math.PI + originalAngle);
        marker.setLocalPosition(ox + Math.cos(rad) * offset, oy + Math.sin(rad) * offset);
    };
    Polygon.prototype.placeMarkerMid = function (marker) {
        var _a = this.parsedStyle, P = _a.points, defX = _a.defX, defY = _a.defY;
        var points = (P || {}).points;
        // clear all existed markers
        this.markerMidList.forEach(function (marker) {
            marker.remove();
        });
        this.markerMidList = [];
        if (marker && isDisplayObject(marker) && points) {
            for (var i = 1; i < (this.parsedStyle.isClosed ? points.length : points.length - 1); i++) {
                var ox = points[i][0] - defX;
                var oy = points[i][1] - defY;
                var cloned = i === 1 ? marker : marker.cloneNode(true);
                this.markerMidList.push(cloned);
                this.appendChild(cloned);
                cloned.setLocalPosition(ox, oy);
                // TODO: orient of marker
            }
        }
    };
    return Polygon;
}(DisplayObject));

/**
 * Polyline inherits the marker-related capabilities of Polygon.
 */
var Polyline = /** @class */ (function (_super) {
    __extends(Polyline, _super);
    function Polyline(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.POLYLINE, style: runtime.enableCSSParsing
                ? __assign({ points: '', miterLimit: '', isClosed: false }, style) : __assign({}, style), initialParsedStyle: runtime.enableCSSParsing
                ? null
                : {
                    points: {
                        points: [],
                        totalLength: 0,
                        segments: [],
                    },
                    miterLimit: 4,
                    isClosed: false,
                } }, rest)) || this;
    }
    Polyline.prototype.getTotalLength = function () {
        return this.parsedStyle.points.totalLength;
    };
    Polyline.prototype.getPointAtLength = function (distance, inWorldSpace) {
        if (inWorldSpace === void 0) { inWorldSpace = false; }
        return this.getPoint(distance / this.getTotalLength(), inWorldSpace);
    };
    Polyline.prototype.getPoint = function (ratio, inWorldSpace) {
        if (inWorldSpace === void 0) { inWorldSpace = false; }
        var _a = this.parsedStyle, defX = _a.defX, defY = _a.defY, _b = _a.points, points = _b.points, segments = _b.segments;
        var subt = 0;
        var index = 0;
        segments.forEach(function (v, i) {
            if (ratio >= v[0] && ratio <= v[1]) {
                subt = (ratio - v[0]) / (v[1] - v[0]);
                index = i;
            }
        });
        var _c = linePointAt(points[index][0], points[index][1], points[index + 1][0], points[index + 1][1], subt), x = _c.x, y = _c.y;
        var transformed = vec3.transformMat4(vec3.create(), vec3.fromValues(x - defX, y - defY, 0), inWorldSpace ? this.getWorldTransform() : this.getLocalTransform());
        // apply local transformation
        return new Point(transformed[0], transformed[1]);
    };
    Polyline.prototype.getStartTangent = function () {
        var points = this.parsedStyle.points.points;
        var result = [];
        result.push([points[1][0], points[1][1]]);
        result.push([points[0][0], points[0][1]]);
        return result;
    };
    Polyline.prototype.getEndTangent = function () {
        var points = this.parsedStyle.points.points;
        var l = points.length - 1;
        var result = [];
        result.push([points[l - 1][0], points[l - 1][1]]);
        result.push([points[l][0], points[l][1]]);
        return result;
    };
    return Polyline;
}(Polygon));

var Rect = /** @class */ (function (_super) {
    __extends(Rect, _super);
    function Rect(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.RECT, style: runtime.enableCSSParsing
                ? __assign({ x: '', y: '', width: '', height: '', radius: '' }, style) : __assign({}, style) }, rest)) || this;
    }
    return Rect;
}(DisplayObject));

/**
 * <text> @see https://developer.mozilla.org/en-US/docs/Web/API/SVGTextElement
 */
var Text = /** @class */ (function (_super) {
    __extends(Text, _super);
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SVGTextContentElement#constants
     */
    // LENGTHADJUST_SPACING: number = 1;
    // LENGTHADJUST_SPACINGANDGLYPHS: number = 2;
    // LENGTHADJUST_UNKNOWN: number = 0;
    function Text(_a) {
        if (_a === void 0) { _a = {}; }
        var style = _a.style, rest = __rest(_a, ["style"]);
        return _super.call(this, __assign({ type: Shape.TEXT, style: runtime.enableCSSParsing
                ? __assign({ x: '', y: '', text: '', fontSize: '', fontFamily: '', fontStyle: '', fontWeight: '', fontVariant: '', textAlign: '', textBaseline: '', textTransform: '', fill: 'black', letterSpacing: '', lineHeight: '', miterLimit: '', 
                    // whiteSpace: 'pre',
                    wordWrap: false, wordWrapWidth: 0, leading: 0, dx: '', dy: '' }, style) : __assign({ fill: 'black' }, style), initialParsedStyle: runtime.enableCSSParsing
                ? {}
                : {
                    x: 0,
                    y: 0,
                    fontSize: 16,
                    fontFamily: 'sans-serif',
                    fontStyle: 'normal',
                    fontWeight: 'normal',
                    fontVariant: 'normal',
                    lineHeight: 0,
                    letterSpacing: 0,
                    textBaseline: 'alphabetic',
                    textAlign: 'start',
                    wordWrap: false,
                    wordWrapWidth: 0,
                    leading: 0,
                    dx: 0,
                    dy: 0,
                } }, rest)) || this;
    }
    // lengthAdjust: SVGAnimatedEnumeration;
    // textLength: SVGAnimatedLength;
    // getCharNumAtPosition(point?: DOMPointInit): number {
    //   throw new Error('Method not implemented.');
    // }
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/SVGTextContentElement
     */
    Text.prototype.getComputedTextLength = function () {
        var _a;
        return ((_a = this.parsedStyle.metrics) === null || _a === void 0 ? void 0 : _a.maxLineWidth) || 0;
    };
    // getEndPositionOfChar(charnum: number): DOMPoint {
    //   throw new Error('Method not implemented.');
    // }
    // getExtentOfChar(charnum: number): DOMRect {
    //   throw new Error('Method not implemented.');
    // }
    // getNumberOfChars(): number {
    //   throw new Error('Method not implemented.');
    // }
    // getRotationOfChar(charnum: number): number {
    //   throw new Error('Method not implemented.');
    // }
    // getStartPositionOfChar(charnum: number): DOMPoint {
    //   throw new Error('Method not implemented.');
    // }
    // getSubStringLength(charnum: number, nchars: number): number {
    //   throw new Error('Method not implemented.');
    // }
    // selectSubString(charnum: number, nchars: number): void {
    //   throw new Error('Method not implemented.');
    // }
    Text.prototype.getLineBoundingRects = function () {
        var _a;
        return ((_a = this.parsedStyle.metrics) === null || _a === void 0 ? void 0 : _a.lineMetrics) || [];
    };
    Text.prototype.isOverflowing = function () {
        return !!this.parsedStyle.isOverflowing;
    };
    return Text;
}(DisplayObject));

/**
 * canvas.customElements
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry
 */
var CustomElementRegistry = /** @class */ (function () {
    function CustomElementRegistry() {
        this.registry = {};
        this.define(Shape.CIRCLE, Circle);
        this.define(Shape.ELLIPSE, Ellipse);
        this.define(Shape.RECT, Rect);
        this.define(Shape.IMAGE, Image);
        this.define(Shape.LINE, Line);
        this.define(Shape.GROUP, Group);
        this.define(Shape.PATH, Path);
        this.define(Shape.POLYGON, Polygon);
        this.define(Shape.POLYLINE, Polyline);
        this.define(Shape.TEXT, Text);
        this.define(Shape.HTML, HTML);
    }
    CustomElementRegistry.prototype.define = function (name, constructor) {
        this.registry[name] = constructor;
    };
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/get
     */
    CustomElementRegistry.prototype.get = function (name) {
        return this.registry[name];
    };
    return CustomElementRegistry;
}());

/**
 * the entry of DOM tree
 * Document -> Node -> EventTarget
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Document
 */
var Document = /** @class */ (function (_super) {
    __extends(Document, _super);
    function Document() {
        var _this = _super.call(this) || this;
        /**
         * only document has defaultView, points to canvas,
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Document/defaultView
         */
        _this.defaultView = null;
        _this.ownerDocument = null;
        _this.nodeName = 'document';
        // create timeline
        try {
            _this.timeline = new runtime.AnimationTimeline(_this);
        }
        catch (e) { }
        /**
         * for inherited properties, the initial value is used on the root element only,
         * as long as no specified value is supplied.
         * @see https://developer.mozilla.org/en-US/docs/Web/CSS/initial_value
         */
        var initialStyle = {};
        BUILT_IN_PROPERTIES.forEach(function (_a) {
            var n = _a.n, inh = _a.inh, d = _a.d;
            if (inh && d) {
                initialStyle[n] = isFunction(d) ? d(Shape.GROUP) : d;
            }
        });
        // like <html> in DOM tree
        _this.documentElement = new Group({
            id: 'g-root',
            style: initialStyle,
        });
        _this.documentElement.ownerDocument = _this;
        _this.documentElement.parentNode = _this;
        _this.childNodes = [_this.documentElement];
        return _this;
    }
    Object.defineProperty(Document.prototype, "children", {
        get: function () {
            return this.childNodes;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Document.prototype, "childElementCount", {
        get: function () {
            return this.childNodes.length;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Document.prototype, "firstElementChild", {
        get: function () {
            return this.firstChild;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Document.prototype, "lastElementChild", {
        get: function () {
            return this.lastChild;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @example const circle = document.createElement('circle', { style: { r: 10 } });
     */
    Document.prototype.createElement = function (tagName, options) {
        // @observablehq/plot will create <svg>
        if (tagName === 'svg') {
            return this.documentElement;
        }
        // d3 will use <tspan>
        var clazz = this.defaultView.customElements.get(tagName);
        if (!clazz) {
            console.warn('Unsupported tagName: ', tagName);
            clazz = tagName === 'tspan' ? Text : Group;
        }
        var shape = new clazz(options);
        shape.ownerDocument = this;
        return shape;
    };
    Document.prototype.createElementNS = function (namespaceURI, tagName, options) {
        return this.createElement(tagName, options);
    };
    Document.prototype.cloneNode = function (deep) {
        throw new Error(ERROR_MSG_METHOD_NOT_IMPLEMENTED);
    };
    Document.prototype.destroy = function () {
        try {
            this.documentElement.destroyChildren();
            this.timeline.destroy();
        }
        catch (e) { }
    };
    /**
     * Picking 2D graphics with RBush based on BBox, fast but inaccurate.
     */
    Document.prototype.elementsFromBBox = function (minX, minY, maxX, maxY) {
        var rBush = this.defaultView.context.rBushRoot;
        var rBushNodes = rBush.search({ minX: minX, minY: minY, maxX: maxX, maxY: maxY });
        var hitTestList = [];
        rBushNodes.forEach(function (_a) {
            var displayObject = _a.displayObject;
            var pointerEvents = displayObject.parsedStyle.pointerEvents;
            // account for `visibility`
            // @see https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
            var isVisibilityAffected = [
                'auto',
                'visiblepainted',
                'visiblefill',
                'visiblestroke',
                'visible',
            ].includes(pointerEvents);
            if ((!isVisibilityAffected ||
                (isVisibilityAffected && displayObject.isVisible())) &&
                !displayObject.isCulled() &&
                displayObject.isInteractive()) {
                hitTestList.push(displayObject);
            }
        });
        // find group with max z-index
        hitTestList.sort(function (a, b) { return b.sortable.renderOrder - a.sortable.renderOrder; });
        return hitTestList;
    };
    Document.prototype.elementFromPointSync = function (x, y) {
        var _a = this.defaultView.canvas2Viewport({
            x: x,
            y: y,
        }), viewportX = _a.x, viewportY = _a.y;
        var _b = this.defaultView.getConfig(), width = _b.width, height = _b.height;
        // outside canvas' viewport
        if (viewportX < 0 ||
            viewportY < 0 ||
            viewportX > width ||
            viewportY > height) {
            return null;
        }
        var _c = this.defaultView.viewport2Client({
            x: viewportX,
            y: viewportY,
        }), clientX = _c.x, clientY = _c.y;
        var picked = this.defaultView
            .getRenderingService()
            .hooks.pickSync.call({
            topmost: true,
            position: {
                x: x,
                y: y,
                viewportX: viewportX,
                viewportY: viewportY,
                clientX: clientX,
                clientY: clientY,
            },
            picked: [],
        }).picked;
        return (picked && picked[0]) || this.documentElement;
    };
    /**
     * Do picking with API instead of triggering interactive events.
     *
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Document/elementFromPoint
     */
    Document.prototype.elementFromPoint = function (x, y) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, viewportX, viewportY, _b, width, height, _c, clientX, clientY, picked;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = this.defaultView.canvas2Viewport({
                            x: x,
                            y: y,
                        }), viewportX = _a.x, viewportY = _a.y;
                        _b = this.defaultView.getConfig(), width = _b.width, height = _b.height;
                        // outside canvas' viewport
                        if (viewportX < 0 ||
                            viewportY < 0 ||
                            viewportX > width ||
                            viewportY > height) {
                            return [2 /*return*/, null];
                        }
                        _c = this.defaultView.viewport2Client({
                            x: viewportX,
                            y: viewportY,
                        }), clientX = _c.x, clientY = _c.y;
                        return [4 /*yield*/, this.defaultView
                                .getRenderingService()
                                .hooks.pick.promise({
                                topmost: true,
                                position: {
                                    x: x,
                                    y: y,
                                    viewportX: viewportX,
                                    viewportY: viewportY,
                                    clientX: clientX,
                                    clientY: clientY,
                                },
                                picked: [],
                            })];
                    case 1:
                        picked = (_d.sent()).picked;
                        return [2 /*return*/, (picked && picked[0]) || this.documentElement];
                }
            });
        });
    };
    Document.prototype.elementsFromPointSync = function (x, y) {
        var _a = this.defaultView.canvas2Viewport({
            x: x,
            y: y,
        }), viewportX = _a.x, viewportY = _a.y;
        var _b = this.defaultView.getConfig(), width = _b.width, height = _b.height;
        // outside canvas' viewport
        if (viewportX < 0 ||
            viewportY < 0 ||
            viewportX > width ||
            viewportY > height) {
            return [];
        }
        var _c = this.defaultView.viewport2Client({
            x: viewportX,
            y: viewportY,
        }), clientX = _c.x, clientY = _c.y;
        var picked = this.defaultView
            .getRenderingService()
            .hooks.pickSync.call({
            topmost: false,
            position: {
                x: x,
                y: y,
                viewportX: viewportX,
                viewportY: viewportY,
                clientX: clientX,
                clientY: clientY,
            },
            picked: [],
        }).picked;
        if (picked[picked.length - 1] !== this.documentElement) {
            picked.push(this.documentElement);
        }
        return picked;
    };
    /**
     * Do picking with API instead of triggering interactive events.
     *
     * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Document/elementsFromPoint
     */
    Document.prototype.elementsFromPoint = function (x, y) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, viewportX, viewportY, _b, width, height, _c, clientX, clientY, picked;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = this.defaultView.canvas2Viewport({
                            x: x,
                            y: y,
                        }), viewportX = _a.x, viewportY = _a.y;
                        _b = this.defaultView.getConfig(), width = _b.width, height = _b.height;
                        // outside canvas' viewport
                        if (viewportX < 0 ||
                            viewportY < 0 ||
                            viewportX > width ||
                            viewportY > height) {
                            return [2 /*return*/, []];
                        }
                        _c = this.defaultView.viewport2Client({
                            x: viewportX,
                            y: viewportY,
                        }), clientX = _c.x, clientY = _c.y;
                        return [4 /*yield*/, this.defaultView
                                .getRenderingService()
                                .hooks.pick.promise({
                                topmost: false,
                                position: {
                                    x: x,
                                    y: y,
                                    viewportX: viewportX,
                                    viewportY: viewportY,
                                    clientX: clientX,
                                    clientY: clientY,
                                },
                                picked: [],
                            })];
                    case 1:
                        picked = (_d.sent()).picked;
                        if (picked[picked.length - 1] !== this.documentElement) {
                            picked.push(this.documentElement);
                        }
                        return [2 /*return*/, picked];
                }
            });
        });
    };
    /**
     * eg. Uncaught DOMException: Failed to execute 'appendChild' on 'Node': Only one element on document allowed.
     */
    Document.prototype.appendChild = function (newChild, index) {
        throw new Error(ERROR_MSG_USE_DOCUMENT_ELEMENT);
    };
    Document.prototype.insertBefore = function (newChild, refChild) {
        throw new Error(ERROR_MSG_USE_DOCUMENT_ELEMENT);
    };
    Document.prototype.removeChild = function (oldChild, destroy) {
        throw new Error(ERROR_MSG_USE_DOCUMENT_ELEMENT);
    };
    Document.prototype.replaceChild = function (newChild, oldChild, destroy) {
        throw new Error(ERROR_MSG_USE_DOCUMENT_ELEMENT);
    };
    Document.prototype.append = function () {
        throw new Error(ERROR_MSG_USE_DOCUMENT_ELEMENT);
    };
    Document.prototype.prepend = function () {
        throw new Error(ERROR_MSG_USE_DOCUMENT_ELEMENT);
    };
    /**
     * Execute query on documentElement.
     */
    Document.prototype.getElementById = function (id) {
        return this.documentElement.getElementById(id);
    };
    Document.prototype.getElementsByName = function (name) {
        return this.documentElement.getElementsByName(name);
    };
    Document.prototype.getElementsByTagName = function (tagName) {
        return this.documentElement.getElementsByTagName(tagName);
    };
    Document.prototype.getElementsByClassName = function (className) {
        return this.documentElement.getElementsByClassName(className);
    };
    Document.prototype.querySelector = function (selectors) {
        return this.documentElement.querySelector(selectors);
    };
    Document.prototype.querySelectorAll = function (selectors) {
        return this.documentElement.querySelectorAll(selectors);
    };
    Document.prototype.find = function (filter) {
        return this.documentElement.find(filter);
    };
    Document.prototype.findAll = function (filter) {
        return this.documentElement.findAll(filter);
    };
    return Document;
}(Node));

/**
 * apply following rules:
 * 1. `visibility` in scenegraph node
 * 2. other custom culling strategies, eg. frustum culling
 */
var CullingPlugin = /** @class */ (function () {
    function CullingPlugin(strategies) {
        this.strategies = strategies;
    }
    CullingPlugin.prototype.apply = function (context) {
        var camera = context.camera, renderingService = context.renderingService, renderingContext = context.renderingContext;
        var strategies = this.strategies;
        renderingService.hooks.cull.tap(CullingPlugin.tag, function (object) {
            if (object) {
                var cullable = object.cullable;
                // cullable.visible = true;
                // const renderBounds = object.getRenderBounds();
                // if (AABB.isEmpty(renderBounds)) {
                //   cullable.visible = false;
                // } else {
                //   const isShape2D = shape2D.indexOf(object.nodeName as Shape) > -1;
                //   const [p0, p1, p2, p3] = camera.getFrustum().planes;
                //   tmpAABB.setMinMax([-p1.distance, -p3.distance, 0], [p0.distance, p2.distance, 0]);
                //   cullable.visible = isShape2D ? renderBounds.intersects(tmpAABB) : true;
                // }
                if (strategies.length === 0) {
                    cullable.visible = renderingContext.unculledEntities.indexOf(object.entity) > -1;
                }
                else {
                    // eg. implemented by g-webgl(frustum culling)
                    cullable.visible = strategies.every(function (strategy) { return strategy.isVisible(camera, object); });
                }
                if (!object.isCulled() && object.isVisible()) {
                    return object;
                }
                else {
                    // if (this.renderingContext.renderListLastFrame.indexOf(object) > -1) {
                    object.dispatchEvent(new CustomEvent(ElementEvent.CULLED));
                    // }
                }
                return null;
            }
            return object;
        });
        renderingService.hooks.afterRender.tap(CullingPlugin.tag, function (object) {
            object.cullable.visibilityPlaneMask = -1;
        });
    };
    CullingPlugin.tag = 'Culling';
    return CullingPlugin;
}());

/**
 * support mouse & touch events
 * @see https://github.com/pixijs/pixi.js/blob/dev/packages/interaction/README.md
 *
 * also provide some extra events such as `drag`
 */
var EventPlugin = /** @class */ (function () {
    function EventPlugin() {
        var _this = this;
        this.autoPreventDefault = false;
        this.rootPointerEvent = new FederatedPointerEvent(null);
        this.rootWheelEvent = new FederatedWheelEvent(null);
        this.onPointerMove = function (nativeEvent) {
            var e_1, _a;
            var _b, _c;
            var canvas = (_c = (_b = _this.context.renderingContext.root) === null || _b === void 0 ? void 0 : _b.ownerDocument) === null || _c === void 0 ? void 0 : _c.defaultView;
            if (canvas.supportsTouchEvents &&
                nativeEvent.pointerType === 'touch')
                return;
            var normalizedEvents = _this.normalizeToPointerEvent(nativeEvent, canvas);
            try {
                for (var normalizedEvents_1 = __values(normalizedEvents), normalizedEvents_1_1 = normalizedEvents_1.next(); !normalizedEvents_1_1.done; normalizedEvents_1_1 = normalizedEvents_1.next()) {
                    var normalizedEvent = normalizedEvents_1_1.value;
                    var event_1 = _this.bootstrapEvent(_this.rootPointerEvent, normalizedEvent, canvas, nativeEvent);
                    _this.context.eventService.mapEvent(event_1);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (normalizedEvents_1_1 && !normalizedEvents_1_1.done && (_a = normalizedEvents_1.return)) _a.call(normalizedEvents_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            _this.setCursor(_this.context.eventService.cursor);
        };
        this.onClick = function (nativeEvent) {
            var e_2, _a;
            var _b, _c;
            var canvas = (_c = (_b = _this.context.renderingContext.root) === null || _b === void 0 ? void 0 : _b.ownerDocument) === null || _c === void 0 ? void 0 : _c.defaultView;
            var normalizedEvents = _this.normalizeToPointerEvent(nativeEvent, canvas);
            try {
                for (var normalizedEvents_2 = __values(normalizedEvents), normalizedEvents_2_1 = normalizedEvents_2.next(); !normalizedEvents_2_1.done; normalizedEvents_2_1 = normalizedEvents_2.next()) {
                    var normalizedEvent = normalizedEvents_2_1.value;
                    var event_2 = _this.bootstrapEvent(_this.rootPointerEvent, normalizedEvent, canvas, nativeEvent);
                    _this.context.eventService.mapEvent(event_2);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (normalizedEvents_2_1 && !normalizedEvents_2_1.done && (_a = normalizedEvents_2.return)) _a.call(normalizedEvents_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            _this.setCursor(_this.context.eventService.cursor);
        };
    }
    EventPlugin.prototype.apply = function (context) {
        var _this = this;
        this.context = context;
        var renderingService = context.renderingService;
        var canvas = this.context.renderingContext.root.ownerDocument.defaultView;
        this.context.eventService.setPickHandler(function (position) {
            var picked = _this.context.renderingService.hooks.pickSync.call({
                position: position,
                picked: [],
                topmost: true, // we only concern the topmost element
            }).picked;
            return picked[0] || null;
        });
        renderingService.hooks.pointerWheel.tap(EventPlugin.tag, function (nativeEvent) {
            var wheelEvent = _this.normalizeWheelEvent(nativeEvent);
            _this.context.eventService.mapEvent(wheelEvent);
        });
        renderingService.hooks.pointerDown.tap(EventPlugin.tag, function (nativeEvent) {
            var e_3, _a;
            if (canvas.supportsTouchEvents &&
                nativeEvent.pointerType === 'touch')
                return;
            var events = _this.normalizeToPointerEvent(nativeEvent, canvas);
            if (_this.autoPreventDefault && events[0].isNormalized) {
                var cancelable = nativeEvent.cancelable || !('cancelable' in nativeEvent);
                if (cancelable) {
                    nativeEvent.preventDefault();
                }
            }
            try {
                for (var events_1 = __values(events), events_1_1 = events_1.next(); !events_1_1.done; events_1_1 = events_1.next()) {
                    var event_3 = events_1_1.value;
                    var federatedEvent = _this.bootstrapEvent(_this.rootPointerEvent, event_3, canvas, nativeEvent);
                    _this.context.eventService.mapEvent(federatedEvent);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (events_1_1 && !events_1_1.done && (_a = events_1.return)) _a.call(events_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            _this.setCursor(_this.context.eventService.cursor);
        });
        renderingService.hooks.pointerUp.tap(EventPlugin.tag, function (nativeEvent) {
            var e_4, _a;
            if (canvas.supportsTouchEvents &&
                nativeEvent.pointerType === 'touch')
                return;
            // account for element in SVG
            var $element = _this.context.contextService.getDomElement();
            var outside = 'outside';
            try {
                outside =
                    $element &&
                        nativeEvent.target &&
                        nativeEvent.target !== $element &&
                        $element.contains &&
                        !$element.contains(nativeEvent.target)
                        ? 'outside'
                        : '';
            }
            catch (e) {
                // nativeEvent.target maybe not Node, such as Window
                // @see https://github.com/antvis/G/issues/1235
            }
            var normalizedEvents = _this.normalizeToPointerEvent(nativeEvent, canvas);
            try {
                for (var normalizedEvents_3 = __values(normalizedEvents), normalizedEvents_3_1 = normalizedEvents_3.next(); !normalizedEvents_3_1.done; normalizedEvents_3_1 = normalizedEvents_3.next()) {
                    var normalizedEvent = normalizedEvents_3_1.value;
                    var event_4 = _this.bootstrapEvent(_this.rootPointerEvent, normalizedEvent, canvas, nativeEvent);
                    event_4.type += outside;
                    _this.context.eventService.mapEvent(event_4);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (normalizedEvents_3_1 && !normalizedEvents_3_1.done && (_a = normalizedEvents_3.return)) _a.call(normalizedEvents_3);
                }
                finally { if (e_4) throw e_4.error; }
            }
            _this.setCursor(_this.context.eventService.cursor);
        });
        renderingService.hooks.pointerMove.tap(EventPlugin.tag, this.onPointerMove);
        renderingService.hooks.pointerOver.tap(EventPlugin.tag, this.onPointerMove);
        renderingService.hooks.pointerOut.tap(EventPlugin.tag, this.onPointerMove);
        renderingService.hooks.click.tap(EventPlugin.tag, this.onClick);
        renderingService.hooks.pointerCancel.tap(EventPlugin.tag, function (nativeEvent) {
            var e_5, _a;
            var normalizedEvents = _this.normalizeToPointerEvent(nativeEvent, canvas);
            try {
                for (var normalizedEvents_4 = __values(normalizedEvents), normalizedEvents_4_1 = normalizedEvents_4.next(); !normalizedEvents_4_1.done; normalizedEvents_4_1 = normalizedEvents_4.next()) {
                    var normalizedEvent = normalizedEvents_4_1.value;
                    var event_5 = _this.bootstrapEvent(_this.rootPointerEvent, normalizedEvent, canvas, nativeEvent);
                    _this.context.eventService.mapEvent(event_5);
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (normalizedEvents_4_1 && !normalizedEvents_4_1.done && (_a = normalizedEvents_4.return)) _a.call(normalizedEvents_4);
                }
                finally { if (e_5) throw e_5.error; }
            }
            _this.setCursor(_this.context.eventService.cursor);
        });
    };
    EventPlugin.prototype.getViewportXY = function (nativeEvent) {
        var x;
        var y;
        /**
         * Should account for CSS Transform applied on container.
         * @see https://github.com/antvis/G/issues/1161
         * @see https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent/offsetX
         */
        var offsetX = nativeEvent.offsetX, offsetY = nativeEvent.offsetY, clientX = nativeEvent.clientX, clientY = nativeEvent.clientY;
        if (this.context.config.supportsCSSTransform &&
            !isNil(offsetX) &&
            !isNil(offsetY)) {
            x = offsetX;
            y = offsetY;
        }
        else {
            var point = this.context.eventService.client2Viewport(new Point(clientX, clientY));
            x = point.x;
            y = point.y;
        }
        return { x: x, y: y };
    };
    EventPlugin.prototype.bootstrapEvent = function (event, normalizedEvent, view, nativeEvent) {
        event.view = view;
        event.originalEvent = null;
        event.nativeEvent = nativeEvent;
        event.pointerId = normalizedEvent.pointerId;
        event.width = normalizedEvent.width;
        event.height = normalizedEvent.height;
        event.isPrimary = normalizedEvent.isPrimary;
        event.pointerType = normalizedEvent.pointerType;
        event.pressure = normalizedEvent.pressure;
        event.tangentialPressure = normalizedEvent.tangentialPressure;
        event.tiltX = normalizedEvent.tiltX;
        event.tiltY = normalizedEvent.tiltY;
        event.twist = normalizedEvent.twist;
        this.transferMouseData(event, normalizedEvent);
        var _a = this.getViewportXY(normalizedEvent), x = _a.x, y = _a.y;
        event.viewport.x = x;
        event.viewport.y = y;
        var _b = this.context.eventService.viewport2Canvas(event.viewport), canvasX = _b.x, canvasY = _b.y;
        event.canvas.x = canvasX;
        event.canvas.y = canvasY;
        event.global.copyFrom(event.canvas);
        event.offset.copyFrom(event.canvas);
        event.isTrusted = nativeEvent.isTrusted;
        if (event.type === 'pointerleave') {
            event.type = 'pointerout';
        }
        if (event.type.startsWith('mouse')) {
            event.type = event.type.replace('mouse', 'pointer');
        }
        if (event.type.startsWith('touch')) {
            event.type = TOUCH_TO_POINTER[event.type] || event.type;
        }
        return event;
    };
    EventPlugin.prototype.normalizeWheelEvent = function (nativeEvent) {
        var event = this.rootWheelEvent;
        this.transferMouseData(event, nativeEvent);
        event.deltaMode = nativeEvent.deltaMode;
        event.deltaX = nativeEvent.deltaX;
        event.deltaY = nativeEvent.deltaY;
        event.deltaZ = nativeEvent.deltaZ;
        var _a = this.getViewportXY(nativeEvent), x = _a.x, y = _a.y;
        event.viewport.x = x;
        event.viewport.y = y;
        var _b = this.context.eventService.viewport2Canvas(event.viewport), canvasX = _b.x, canvasY = _b.y;
        event.canvas.x = canvasX;
        event.canvas.y = canvasY;
        event.global.copyFrom(event.canvas);
        event.offset.copyFrom(event.canvas);
        event.nativeEvent = nativeEvent;
        event.type = nativeEvent.type;
        return event;
    };
    /**
     * Transfers base & mouse event data from the nativeEvent to the federated event.
     */
    EventPlugin.prototype.transferMouseData = function (event, nativeEvent) {
        event.isTrusted = nativeEvent.isTrusted;
        event.srcElement = nativeEvent.srcElement;
        event.timeStamp = clock.now();
        event.type = nativeEvent.type;
        event.altKey = nativeEvent.altKey;
        event.metaKey = nativeEvent.metaKey;
        event.shiftKey = nativeEvent.shiftKey;
        event.ctrlKey = nativeEvent.ctrlKey;
        event.button = nativeEvent.button;
        event.buttons = nativeEvent.buttons;
        event.client.x = nativeEvent.clientX;
        event.client.y = nativeEvent.clientY;
        event.movement.x = nativeEvent.movementX;
        event.movement.y = nativeEvent.movementY;
        event.page.x = nativeEvent.pageX;
        event.page.y = nativeEvent.pageY;
        event.screen.x = nativeEvent.screenX;
        event.screen.y = nativeEvent.screenY;
        event.relatedTarget = null;
    };
    EventPlugin.prototype.setCursor = function (cursor) {
        this.context.contextService.applyCursorStyle(cursor || this.context.config.cursor || 'default');
    };
    EventPlugin.prototype.normalizeToPointerEvent = function (event, canvas) {
        var normalizedEvents = [];
        if (canvas.isTouchEvent(event)) {
            for (var i = 0; i < event.changedTouches.length; i++) {
                var touch = event.changedTouches[i];
                // use changedTouches instead of touches since touchend has no touches
                // @see https://stackoverflow.com/a/10079076
                if (isUndefined(touch.button))
                    touch.button = 0;
                if (isUndefined(touch.buttons))
                    touch.buttons = 1;
                if (isUndefined(touch.isPrimary)) {
                    touch.isPrimary =
                        event.touches.length === 1 && event.type === 'touchstart';
                }
                if (isUndefined(touch.width))
                    touch.width = touch.radiusX || 1;
                if (isUndefined(touch.height))
                    touch.height = touch.radiusY || 1;
                if (isUndefined(touch.tiltX))
                    touch.tiltX = 0;
                if (isUndefined(touch.tiltY))
                    touch.tiltY = 0;
                if (isUndefined(touch.pointerType))
                    touch.pointerType = 'touch';
                // @see https://developer.mozilla.org/zh-CN/docs/Web/API/Touch/identifier
                if (isUndefined(touch.pointerId))
                    touch.pointerId = touch.identifier || 0;
                if (isUndefined(touch.pressure))
                    touch.pressure = touch.force || 0.5;
                if (isUndefined(touch.twist))
                    touch.twist = 0;
                if (isUndefined(touch.tangentialPressure))
                    touch.tangentialPressure = 0;
                touch.isNormalized = true;
                touch.type = event.type;
                normalizedEvents.push(touch);
            }
        }
        else if (canvas.isMouseEvent(event)) {
            var tempEvent = event;
            if (isUndefined(tempEvent.isPrimary))
                tempEvent.isPrimary = true;
            if (isUndefined(tempEvent.width))
                tempEvent.width = 1;
            if (isUndefined(tempEvent.height))
                tempEvent.height = 1;
            if (isUndefined(tempEvent.tiltX))
                tempEvent.tiltX = 0;
            if (isUndefined(tempEvent.tiltY))
                tempEvent.tiltY = 0;
            if (isUndefined(tempEvent.pointerType))
                tempEvent.pointerType = 'mouse';
            if (isUndefined(tempEvent.pointerId))
                tempEvent.pointerId = MOUSE_POINTER_ID;
            if (isUndefined(tempEvent.pressure))
                tempEvent.pressure = 0.5;
            if (isUndefined(tempEvent.twist))
                tempEvent.twist = 0;
            if (isUndefined(tempEvent.tangentialPressure))
                tempEvent.tangentialPressure = 0;
            tempEvent.isNormalized = true;
            normalizedEvents.push(tempEvent);
        }
        else {
            normalizedEvents.push(event);
        }
        return normalizedEvents;
    };
    EventPlugin.tag = 'Event';
    return EventPlugin;
}());

// group is not a 2d shape
var shape2D = [
    Shape.CIRCLE,
    Shape.ELLIPSE,
    Shape.IMAGE,
    Shape.RECT,
    Shape.LINE,
    Shape.POLYLINE,
    Shape.POLYGON,
    Shape.TEXT,
    Shape.PATH,
    Shape.HTML,
];
var FrustumCullingStrategy = /** @class */ (function () {
    function FrustumCullingStrategy() {
    }
    FrustumCullingStrategy.prototype.isVisible = function (camera, object) {
        // return true;
        var _a, _b;
        var cullable = object.cullable;
        if (!cullable.enable) {
            return true;
        }
        var renderBounds = object.getRenderBounds();
        if (AABB.isEmpty(renderBounds)) {
            return false;
        }
        // get VP matrix from camera
        var frustum = camera.getFrustum();
        var parentVisibilityPlaneMask = (_b = (_a = object.parentNode) === null || _a === void 0 ? void 0 : _a.cullable) === null || _b === void 0 ? void 0 : _b.visibilityPlaneMask;
        cullable.visibilityPlaneMask = this.computeVisibilityWithPlaneMask(object, renderBounds, parentVisibilityPlaneMask || Mask.INDETERMINATE, frustum.planes);
        cullable.visible = cullable.visibilityPlaneMask !== Mask.OUTSIDE;
        return cullable.visible;
    };
    /**
     *
     * @see「Optimized View Frustum Culling Algorithms for Bounding Boxes」
     * @see https://github.com/antvis/GWebGPUEngine/issues/3
     *
     * * 基础相交测试 the basic intersection test
     * * 标记 masking @see https://cesium.com/blog/2015/08/04/fast-hierarchical-culling/
     * * TODO: 平面一致性测试 the plane-coherency test
     * * TODO: 支持 mesh 指定自身的剔除策略，参考 Babylon.js @see https://doc.babylonjs.com/how_to/optimizing_your_scene#changing-mesh-culling-strategy
     *
     * @param aabb aabb
     * @param parentPlaneMask mask of parent
     * @param planes planes of frustum
     */
    FrustumCullingStrategy.prototype.computeVisibilityWithPlaneMask = function (object, aabb, parentPlaneMask, planes) {
        if (parentPlaneMask === Mask.OUTSIDE || parentPlaneMask === Mask.INSIDE) {
            // 父节点完全位于视锥内或者外部，直接返回
            return parentPlaneMask;
        }
        // Start with MASK_INSIDE (all zeros) so that after the loop, the return value can be compared with MASK_INSIDE.
        // (Because if there are fewer than 31 planes, the upper bits wont be changed.)
        var mask = Mask.INSIDE;
        var isShape2D = shape2D.indexOf(object.nodeName) > -1;
        // Use viewport culling for 2D shapes
        // @see https://github.com/antvis/g/issues/914
        for (var k = 0, len = planes.length; k < len; ++k) {
            // For k greater than 31 (since 31 is the maximum number of INSIDE/INTERSECTING bits we can store), skip the optimization.
            var flag = 1 << k;
            if ((parentPlaneMask & flag) === 0) {
                // 父节点处于当前面内部，可以跳过
                continue;
            }
            // skip near & far planes when testing 2D shapes
            if (isShape2D && (k === 4 || k === 5)) {
                continue;
            }
            // p-vertex n-vertex <-|plane p-vertex n-vertex
            // 使用 p-vertex 和 n-vertex 加速，避免进行平面和 aabb 全部顶点的相交检测
            var _a = planes[k], normal = _a.normal, distance = _a.distance;
            if (vec3.dot(normal, aabb.getPositiveFarPoint(planes[k])) + distance <
                0) {
                return Mask.OUTSIDE;
            }
            if (vec3.dot(normal, aabb.getNegativeFarPoint(planes[k])) + distance <
                0) {
                // 和当前面相交，对应位置为1，继续检测下一个面
                mask |= flag;
            }
        }
        return mask;
    };
    return FrustumCullingStrategy;
}());

var PrepareRendererPlugin = /** @class */ (function () {
    function PrepareRendererPlugin() {
        /**
         * sync to RBush later
         */
        this.toSync = new Set();
    }
    // private isFirstTimeRendering = true;
    // private syncing = false;
    PrepareRendererPlugin.prototype.apply = function (context) {
        var _this = this;
        var renderingService = context.renderingService, renderingContext = context.renderingContext, rBushRoot = context.rBushRoot;
        var canvas = renderingContext.root.ownerDocument.defaultView;
        this.rBush = rBushRoot;
        var handleAttributeChanged = function (e) {
            var object = e.target;
            object.renderable.dirty = true;
            renderingService.dirtify();
        };
        var handleBoundsChanged = function (e) {
            var affectChildren = e.detail.affectChildren;
            var object = e.target;
            if (affectChildren) {
                object.forEach(function (node) {
                    _this.toSync.add(node);
                });
            }
            var p = object;
            while (p) {
                if (p.renderable) {
                    _this.toSync.add(p);
                }
                p = p.parentElement;
            }
            // this.pushToSync(e.composedPath().slice(0, -2) as DisplayObject[]);
            renderingService.dirtify();
        };
        var handleMounted = function (e) {
            var object = e.target;
            if (runtime.enableCSSParsing) {
                // recalc style values
                runtime.styleValueRegistry.recalc(object);
            }
            runtime.sceneGraphService.dirtifyToRoot(object);
            renderingService.dirtify();
        };
        var handleUnmounted = function (e) {
            var object = e.target;
            var rBushNode = object.rBushNode;
            if (rBushNode.aabb) {
                _this.rBush.remove(rBushNode.aabb);
            }
            _this.toSync.delete(object);
            runtime.sceneGraphService.dirtifyToRoot(object);
            renderingService.dirtify();
        };
        renderingService.hooks.init.tap(PrepareRendererPlugin.tag, function () {
            canvas.addEventListener(ElementEvent.MOUNTED, handleMounted);
            canvas.addEventListener(ElementEvent.UNMOUNTED, handleUnmounted);
            canvas.addEventListener(ElementEvent.ATTR_MODIFIED, handleAttributeChanged);
            canvas.addEventListener(ElementEvent.BOUNDS_CHANGED, handleBoundsChanged);
        });
        renderingService.hooks.destroy.tap(PrepareRendererPlugin.tag, function () {
            canvas.removeEventListener(ElementEvent.MOUNTED, handleMounted);
            canvas.removeEventListener(ElementEvent.UNMOUNTED, handleUnmounted);
            canvas.removeEventListener(ElementEvent.ATTR_MODIFIED, handleAttributeChanged);
            canvas.removeEventListener(ElementEvent.BOUNDS_CHANGED, handleBoundsChanged);
            _this.toSync.clear();
        });
        renderingService.hooks.endFrame.tap(PrepareRendererPlugin.tag, function () {
            // if (this.isFirstTimeRendering) {
            //   this.isFirstTimeRendering = false;
            //   this.syncing = true;
            //   // @see https://github.com/antvis/G/issues/1117
            //   setTimeout(() => {
            //     this.syncRTree();
            //     console.log('fcp...');
            //   });
            // } else {
            //   console.log('next...');
            _this.syncRTree();
            // }
        });
    };
    PrepareRendererPlugin.prototype.syncRTree = function () {
        // if (this.syncing) {
        //   return;
        // }
        var _this = this;
        // bounds changed, need re-inserting its children
        var bulk = [];
        Array.from(this.toSync)
            // some objects may be removed since last frame
            .filter(function (object) { return object.isConnected; })
            .forEach(function (node) {
            var rBushNode = node.rBushNode;
            // clear dirty node
            if (rBushNode && rBushNode.aabb) {
                _this.rBush.remove(rBushNode.aabb);
            }
            var renderBounds = node.getRenderBounds();
            if (renderBounds) {
                var _a = __read(renderBounds.getMin(), 2), minX = _a[0], minY = _a[1];
                var _b = __read(renderBounds.getMax(), 2), maxX = _b[0], maxY = _b[1];
                if (!rBushNode.aabb) {
                    rBushNode.aabb = {};
                }
                rBushNode.aabb.displayObject = node;
                rBushNode.aabb.minX = minX;
                rBushNode.aabb.minY = minY;
                rBushNode.aabb.maxX = maxX;
                rBushNode.aabb.maxY = maxY;
            }
            if (rBushNode.aabb) {
                // TODO: NaN occurs when width/height of Rect is 0
                if (!isNaN(rBushNode.aabb.maxX) &&
                    !isNaN(rBushNode.aabb.maxX) &&
                    !isNaN(rBushNode.aabb.minX) &&
                    !isNaN(rBushNode.aabb.minY)) {
                    bulk.push(rBushNode.aabb);
                }
            }
        });
        // use bulk inserting, which is ~2-3 times faster
        // @see https://github.com/mourner/rbush#bulk-inserting-data
        this.rBush.load(bulk);
        bulk.length = 0;
        this.toSync.clear();
        // this.syncing = false;
    };
    PrepareRendererPlugin.tag = 'Prepare';
    return PrepareRendererPlugin;
}());

function isCanvas(value) {
    return !!value.document;
}
var CanvasEvent;
(function (CanvasEvent) {
    CanvasEvent["READY"] = "ready";
    CanvasEvent["BEFORE_RENDER"] = "beforerender";
    CanvasEvent["RERENDER"] = "rerender";
    CanvasEvent["AFTER_RENDER"] = "afterrender";
    CanvasEvent["BEFORE_DESTROY"] = "beforedestroy";
    CanvasEvent["AFTER_DESTROY"] = "afterdestroy";
    CanvasEvent["RESIZE"] = "resize";
    CanvasEvent["DIRTY_RECTANGLE"] = "dirtyrectangle";
    CanvasEvent["RENDERER_CHANGED"] = "rendererchanged";
})(CanvasEvent || (CanvasEvent = {}));
var DEFAULT_CAMERA_Z = 500;
var DEFAULT_CAMERA_NEAR = 0.1;
var DEFAULT_CAMERA_FAR = 1000;
/**
 * reuse custom event preventing from re-create them in every frame
 */
var mountedEvent = new CustomEvent(ElementEvent.MOUNTED);
var unmountedEvent = new CustomEvent(ElementEvent.UNMOUNTED);
var beforeRenderEvent = new CustomEvent(CanvasEvent.BEFORE_RENDER);
var rerenderEvent = new CustomEvent(CanvasEvent.RERENDER);
var afterRenderEvent = new CustomEvent(CanvasEvent.AFTER_RENDER);
/**
 * can be treated like Window in DOM
 * provide some extra methods like `window`, such as:
 * * `window.requestAnimationFrame`
 * * `window.devicePixelRatio`
 *
 * prototype chains: Canvas(Window) -> EventTarget
 */
var Canvas = /** @class */ (function (_super) {
    __extends(Canvas, _super);
    function Canvas(config) {
        var _this = _super.call(this) || this;
        /**
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Element
         */
        _this.Element = DisplayObject;
        _this.inited = false;
        _this.context = {};
        // create document
        _this.document = new Document();
        _this.document.defaultView = _this;
        // create registry of custom elements
        _this.customElements = new CustomElementRegistry();
        var container = config.container, canvas = config.canvas, offscreenCanvas = config.offscreenCanvas, width = config.width, height = config.height, devicePixelRatio = config.devicePixelRatio, renderer = config.renderer, background = config.background, cursor = config.cursor, document = config.document, requestAnimationFrame = config.requestAnimationFrame, cancelAnimationFrame = config.cancelAnimationFrame, createImage = config.createImage, supportsPointerEvents = config.supportsPointerEvents, supportsTouchEvents = config.supportsTouchEvents, supportsCSSTransform = config.supportsCSSTransform, supportsMutipleCanvasesInOneContainer = config.supportsMutipleCanvasesInOneContainer, useNativeClickEvent = config.useNativeClickEvent, alwaysTriggerPointerEventOnCanvas = config.alwaysTriggerPointerEventOnCanvas, isTouchEvent = config.isTouchEvent, isMouseEvent = config.isMouseEvent;
        if (!supportsMutipleCanvasesInOneContainer) {
            cleanExistedCanvas(container, _this);
        }
        var canvasWidth = width;
        var canvasHeight = height;
        var dpr = devicePixelRatio;
        // use user-defined <canvas> or OffscreenCanvas
        if (canvas) {
            // infer width & height with dpr
            dpr = devicePixelRatio || (isBrowser && window.devicePixelRatio) || 1;
            dpr = dpr >= 1 ? Math.ceil(dpr) : 1;
            canvasWidth = width || getWidth(canvas) || canvas.width / dpr;
            canvasHeight = height || getHeight(canvas) || canvas.height / dpr;
        }
        // override it in runtime
        if (offscreenCanvas) {
            runtime.offscreenCanvas = offscreenCanvas;
        }
        /**
         * implements `Window` interface
         */
        _this.devicePixelRatio = dpr;
        _this.requestAnimationFrame =
            requestAnimationFrame !== null && requestAnimationFrame !== void 0 ? requestAnimationFrame : raf.bind(runtime.globalThis);
        _this.cancelAnimationFrame =
            cancelAnimationFrame !== null && cancelAnimationFrame !== void 0 ? cancelAnimationFrame : caf.bind(runtime.globalThis);
        /**
         * limits query
         */
        // the following feature-detect from hammer.js
        // @see https://github.com/hammerjs/hammer.js/blob/master/src/inputjs/input-consts.js#L5
        _this.supportsTouchEvents =
            supportsTouchEvents !== null && supportsTouchEvents !== void 0 ? supportsTouchEvents : 'ontouchstart' in runtime.globalThis;
        _this.supportsPointerEvents =
            supportsPointerEvents !== null && supportsPointerEvents !== void 0 ? supportsPointerEvents : !!runtime.globalThis.PointerEvent;
        _this.isTouchEvent =
            isTouchEvent !== null && isTouchEvent !== void 0 ? isTouchEvent : (function (event) {
                return _this.supportsTouchEvents &&
                    event instanceof runtime.globalThis.TouchEvent;
            });
        _this.isMouseEvent =
            isMouseEvent !== null && isMouseEvent !== void 0 ? isMouseEvent : (function (event) {
                return !runtime.globalThis.MouseEvent ||
                    (event instanceof runtime.globalThis.MouseEvent &&
                        (!_this.supportsPointerEvents ||
                            !(event instanceof runtime.globalThis.PointerEvent)));
            });
        _this.initRenderingContext({
            container: container,
            canvas: canvas,
            width: canvasWidth,
            height: canvasHeight,
            renderer: renderer,
            offscreenCanvas: offscreenCanvas,
            devicePixelRatio: dpr,
            cursor: cursor || 'default',
            background: background || 'transparent',
            createImage: createImage,
            document: document,
            supportsCSSTransform: supportsCSSTransform,
            useNativeClickEvent: useNativeClickEvent,
            alwaysTriggerPointerEventOnCanvas: alwaysTriggerPointerEventOnCanvas,
        });
        _this.initDefaultCamera(canvasWidth, canvasHeight, renderer.clipSpaceNearZ);
        _this.initRenderer(renderer, true);
        return _this;
    }
    Canvas.prototype.initRenderingContext = function (mergedConfig) {
        this.context.config = mergedConfig;
        // bind rendering context, shared by all renderers
        this.context.renderingContext = {
            /**
             * the root node in scene graph
             */
            root: this.document.documentElement,
            renderListCurrentFrame: [],
            unculledEntities: [],
            renderReasons: new Set(),
            force: false,
            dirty: false,
        };
    };
    Canvas.prototype.initDefaultCamera = function (width, height, clipSpaceNearZ) {
        var _this = this;
        // set a default ortho camera
        var camera = new runtime.CameraContribution();
        camera.clipSpaceNearZ = clipSpaceNearZ;
        camera
            .setType(CameraType.EXPLORING, CameraTrackingMode.DEFAULT)
            .setPosition(width / 2, height / 2, DEFAULT_CAMERA_Z)
            .setFocalPoint(width / 2, height / 2, 0)
            .setOrthographic(width / -2, width / 2, height / 2, height / -2, DEFAULT_CAMERA_NEAR, DEFAULT_CAMERA_FAR);
        // keep ref since it will use raf in camera animation
        camera.canvas = this;
        // redraw when camera changed
        camera.eventEmitter.on(CameraEvent.UPDATED, function () {
            _this.context.renderingContext.renderReasons.add(RenderReason.CAMERA_CHANGED);
        });
        // bind camera
        this.context.camera = camera;
    };
    Canvas.prototype.getConfig = function () {
        return this.context.config;
    };
    /**
     * get the root displayObject in scenegraph
     * @alias this.document.documentElement
     */
    Canvas.prototype.getRoot = function () {
        return this.document.documentElement;
    };
    /**
     * get the camera of canvas
     */
    Canvas.prototype.getCamera = function () {
        return this.context.camera;
    };
    Canvas.prototype.getContextService = function () {
        return this.context.contextService;
    };
    Canvas.prototype.getEventService = function () {
        return this.context.eventService;
    };
    Canvas.prototype.getRenderingService = function () {
        return this.context.renderingService;
    };
    Canvas.prototype.getRenderingContext = function () {
        return this.context.renderingContext;
    };
    Canvas.prototype.getStats = function () {
        return this.getRenderingService().getStats();
    };
    Object.defineProperty(Canvas.prototype, "ready", {
        // /**
        //  * @see https://developer.mozilla.org/zh-CN/docs/Web/API/Window/getComputedStyle
        //  */
        // getComputedStyle(node: DisplayObject) {
        //   return node.computedStyle;
        // }
        get: function () {
            var _this = this;
            if (!this.readyPromise) {
                this.readyPromise = new Promise(function (resolve) {
                    _this.resolveReadyPromise = function () {
                        resolve(_this);
                    };
                });
                if (this.inited) {
                    this.resolveReadyPromise();
                }
            }
            return this.readyPromise;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * `cleanUp` means clean all the internal services of Canvas which happens when calling `canvas.destroy()`.
     */
    Canvas.prototype.destroy = function (cleanUp, skipTriggerEvent) {
        if (cleanUp === void 0) { cleanUp = true; }
        if (skipTriggerEvent === void 0) { skipTriggerEvent = false; }
        if (!skipTriggerEvent) {
            this.dispatchEvent(new CustomEvent(CanvasEvent.BEFORE_DESTROY));
        }
        if (this.frameId) {
            var cancelRAF = this.getConfig().cancelAnimationFrame || cancelAnimationFrame;
            cancelRAF(this.frameId);
        }
        // unmount all children
        var root = this.getRoot();
        this.unmountChildren(root);
        if (cleanUp) {
            // destroy Document
            this.document.destroy();
            this.getEventService().destroy();
        }
        // destroy services
        this.getRenderingService().destroy();
        this.getContextService().destroy();
        // clear root after renderservice destroyed
        if (cleanUp && this.context.rBushRoot) {
            // clear rbush
            this.context.rBushRoot.clear();
            this.context.rBushRoot = null;
            this.context.renderingContext.root = null;
        }
        if (!skipTriggerEvent) {
            this.dispatchEvent(new CustomEvent(CanvasEvent.AFTER_DESTROY));
        }
    };
    /**
     * compatible with G 3.0
     * @deprecated
     * @alias resize
     */
    Canvas.prototype.changeSize = function (width, height) {
        this.resize(width, height);
    };
    Canvas.prototype.resize = function (width, height) {
        // update canvas' config
        var canvasConfig = this.context.config;
        canvasConfig.width = width;
        canvasConfig.height = height;
        // resize context
        this.getContextService().resize(width, height);
        // resize camera
        var camera = this.context.camera;
        var projectionMode = camera.getProjectionMode();
        camera
            .setPosition(width / 2, height / 2, DEFAULT_CAMERA_Z)
            .setFocalPoint(width / 2, height / 2, 0);
        if (projectionMode === CameraProjectionMode.ORTHOGRAPHIC) {
            camera.setOrthographic(width / -2, width / 2, height / 2, height / -2, camera.getNear(), camera.getFar());
        }
        else {
            camera.setAspect(width / height);
        }
        this.dispatchEvent(new CustomEvent(CanvasEvent.RESIZE, { width: width, height: height }));
    };
    // proxy to document.documentElement
    Canvas.prototype.appendChild = function (child, index) {
        return this.document.documentElement.appendChild(child, index);
    };
    Canvas.prototype.insertBefore = function (newChild, refChild) {
        return this.document.documentElement.insertBefore(newChild, refChild);
    };
    Canvas.prototype.removeChild = function (child) {
        return this.document.documentElement.removeChild(child);
    };
    /**
     * Remove all children which can be appended to its original parent later again.
     */
    Canvas.prototype.removeChildren = function () {
        this.document.documentElement.removeChildren();
    };
    /**
     * Recursively destroy all children which can not be appended to its original parent later again.
     * But the canvas remains running which means display objects can be appended later.
     */
    Canvas.prototype.destroyChildren = function () {
        this.document.documentElement.destroyChildren();
    };
    Canvas.prototype.render = function () {
        var _this = this;
        this.dispatchEvent(beforeRenderEvent);
        var renderingService = this.getRenderingService();
        renderingService.render(this.getConfig(), function () {
            // trigger actual rerender event
            // @see https://github.com/antvis/G/issues/1268
            _this.dispatchEvent(rerenderEvent);
        });
        this.dispatchEvent(afterRenderEvent);
    };
    Canvas.prototype.run = function () {
        var _this = this;
        var tick = function () {
            _this.render();
            _this.frameId = _this.requestAnimationFrame(tick);
        };
        tick();
    };
    Canvas.prototype.initRenderer = function (renderer, firstContentfullPaint) {
        var _this = this;
        if (firstContentfullPaint === void 0) { firstContentfullPaint = false; }
        if (!renderer) {
            throw new Error('Renderer is required.');
        }
        // reset
        this.inited = false;
        this.readyPromise = undefined;
        // FIXME: should re-create here?
        this.context.rBushRoot = new RBush();
        // reset rendering plugins
        this.context.renderingPlugins = [];
        this.context.renderingPlugins.push(new EventPlugin(), new PrepareRendererPlugin(), 
        // new DirtyCheckPlugin(),
        new CullingPlugin([new FrustumCullingStrategy()]));
        //
        this.loadRendererContainerModule(renderer);
        // init context service
        this.context.contextService = new this.context.ContextService(__assign(__assign({}, runtime), this.context));
        // init rendering service
        this.context.renderingService = new RenderingService(runtime, this.context);
        // init event service
        this.context.eventService = new EventService(runtime, this.context);
        this.context.eventService.init();
        if (this.context.contextService.init) {
            this.context.contextService.init();
            this.initRenderingService(renderer, firstContentfullPaint, true);
        }
        else {
            this.context.contextService.initAsync().then(function () {
                _this.initRenderingService(renderer, firstContentfullPaint);
            });
        }
    };
    Canvas.prototype.initRenderingService = function (renderer, firstContentfullPaint, async) {
        var _this = this;
        if (firstContentfullPaint === void 0) { firstContentfullPaint = false; }
        if (async === void 0) { async = false; }
        this.context.renderingService.init(function () {
            _this.inited = true;
            if (firstContentfullPaint) {
                if (async) {
                    _this.requestAnimationFrame(function () {
                        _this.dispatchEvent(new CustomEvent(CanvasEvent.READY));
                    });
                }
                else {
                    _this.dispatchEvent(new CustomEvent(CanvasEvent.READY));
                }
                if (_this.readyPromise) {
                    _this.resolveReadyPromise();
                }
            }
            else {
                _this.dispatchEvent(new CustomEvent(CanvasEvent.RENDERER_CHANGED));
            }
            if (!firstContentfullPaint) {
                _this.getRoot().forEach(function (node) {
                    var renderable = node.renderable;
                    if (renderable) {
                        renderable.renderBoundsDirty = true;
                        renderable.boundsDirty = true;
                        renderable.dirty = true;
                    }
                });
            }
            // keep current scenegraph unchanged, just trigger mounted event
            _this.mountChildren(_this.getRoot());
            if (renderer.getConfig().enableAutoRendering) {
                _this.run();
            }
        });
    };
    Canvas.prototype.loadRendererContainerModule = function (renderer) {
        var _this = this;
        // load other container modules provided by g-canvas/g-svg/g-webgl
        var plugins = renderer.getPlugins();
        plugins.forEach(function (plugin) {
            plugin.context = _this.context;
            plugin.init(runtime);
        });
    };
    Canvas.prototype.setRenderer = function (renderer) {
        // update canvas' config
        var canvasConfig = this.getConfig();
        if (canvasConfig.renderer === renderer) {
            return;
        }
        var oldRenderer = canvasConfig.renderer;
        canvasConfig.renderer = renderer;
        // keep all children undestroyed
        this.destroy(false, true);
        // destroy all plugins, reverse will mutate origin array
        __spreadArray([], __read(oldRenderer === null || oldRenderer === void 0 ? void 0 : oldRenderer.getPlugins()), false).reverse().forEach(function (plugin) {
            plugin.destroy(runtime);
        });
        this.initRenderer(renderer);
    };
    Canvas.prototype.setCursor = function (cursor) {
        var canvasConfig = this.getConfig();
        canvasConfig.cursor = cursor;
        this.getContextService().applyCursorStyle(cursor);
    };
    Canvas.prototype.unmountChildren = function (parent) {
        var _this = this;
        // unmountChildren recursively
        parent.childNodes.forEach(function (child) {
            _this.unmountChildren(child);
        });
        if (this.inited) {
            if (parent.isMutationObserved) {
                parent.dispatchEvent(unmountedEvent);
            }
            else {
                unmountedEvent.target = parent;
                this.dispatchEvent(unmountedEvent, true);
            }
            // skip document.documentElement
            if (parent !== this.document.documentElement) {
                parent.ownerDocument = null;
            }
            parent.isConnected = false;
        }
        // trigger after unmounted
        if (parent.isCustomElement) {
            if (parent.disconnectedCallback) {
                parent.disconnectedCallback();
            }
        }
    };
    Canvas.prototype.mountChildren = function (parent) {
        var _this = this;
        if (this.inited) {
            if (!parent.isConnected) {
                parent.ownerDocument = this.document;
                parent.isConnected = true;
                if (parent.isMutationObserved) {
                    parent.dispatchEvent(mountedEvent);
                }
                else {
                    mountedEvent.target = parent;
                    this.dispatchEvent(mountedEvent, true);
                }
            }
        }
        else {
            console.warn("[g]: You are trying to call `canvas.appendChild` before canvas' initialization finished. You can either await `canvas.ready` or listen to `CanvasEvent.READY` manually.", 'appended child: ', parent.nodeName);
        }
        // recursively mount children
        parent.childNodes.forEach(function (child) {
            _this.mountChildren(child);
        });
        // trigger after mounted
        if (parent.isCustomElement) {
            if (parent.connectedCallback) {
                parent.connectedCallback();
            }
        }
    };
    Canvas.prototype.client2Viewport = function (client) {
        return this.getEventService().client2Viewport(client);
    };
    Canvas.prototype.viewport2Client = function (canvas) {
        return this.getEventService().viewport2Client(canvas);
    };
    Canvas.prototype.viewport2Canvas = function (viewport) {
        return this.getEventService().viewport2Canvas(viewport);
    };
    Canvas.prototype.canvas2Viewport = function (canvas) {
        return this.getEventService().canvas2Viewport(canvas);
    };
    /**
     * @deprecated
     * @alias client2Viewport
     */
    Canvas.prototype.getPointByClient = function (clientX, clientY) {
        return this.client2Viewport({ x: clientX, y: clientY });
    };
    /**
     * @deprecated
     * @alias viewport2Client
     */
    Canvas.prototype.getClientByPoint = function (x, y) {
        return this.viewport2Client({ x: x, y: y });
    };
    return Canvas;
}(EventTarget));

export { AABB, AbstractRenderer, AbstractRendererPlugin, BUILT_IN_PROPERTIES, CSS, CSSGradientValue, CSSKeywordValue, CSSRGB, CSSStyleValue, CSSUnitValue, Camera, CameraEvent, CameraProjectionMode, CameraTrackingMode, CameraType, Canvas, CanvasEvent, Circle, CircleUpdater, ClipSpaceNearZ, CustomElement, CustomElementRegistry, CustomEvent, DefaultSceneGraphSelector, DefaultSceneGraphService, DisplayObject, Document, ERROR_MSG_METHOD_NOT_IMPLEMENTED, Element, ElementEvent, Ellipse, EllipseUpdater, EventService, EventTarget, FederatedEvent, FederatedMouseEvent, FederatedPointerEvent, FederatedWheelEvent, Frustum, GradientType, Group, HTML, Image, Line, LineUpdater, Mask, MutationEvent, Node, OffscreenCanvasCreator, Path, PathUpdater, Plane, Point, Polygon, Polyline, PolylineUpdater, PropertySyntax, RBush, Rect, RectUpdater, Rectangle, RenderReason, RenderingService, Shape, SortReason, Strategy, Text, TextService, TextUpdater, UnitType, computeLinearGradient, computeRadialGradient, convertToPath, createVec3, decompose, definedProps, deg2rad, deg2turn, findClosestClipPathTarget, fromRotationTranslationScale, getAngle, getEuler, getOrCalculatePathTotalLength, grad2deg, isBrowser, isCSSGradientValue, isCSSRGB, isCanvas, isDisplayObject, isFederatedEvent, isFillOrStrokeAffected, isPattern, memoize, mergeColors, parseColor, parseLength, parsePath, parseTransform, parsedTransformToMat4, propertyMetadataCache, rad2deg, resetEntityCounter, runtime, setDOMSize, translatePathToString, turn2deg };
//# sourceMappingURL=index.esm.js.map
