/*!
 * js-wheel v1.0.0
 * (c) 2017-2017 penyuying
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Wheel = {})));
}(this, (function (exports) { 'use strict';

/**
 * 调试消息
 *
 * @export
 * @param {any} msg 消息内容
 */
function warn(msg) {
  console.error("[Wheel warn]: " + msg);
}

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

/**
 * 自定义事件处理模块
 *
 * @export
 * @param {Function} Fn 构造函数
 */
function eventModule(Fn) {
    Fn.prototype.on = function (type, fn) {
        var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this;

        var _that = this;
        _that._events = _that._events || {};
        _that._events[type] = _that._events[type] || [];

        _that._events[type].push([fn, context]);
    };

    Fn.prototype.once = function (type, fn) {
        var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this;
        // 绑定后执行一次就移除
        var _that = this;
        var fired = false;
        /**
         * 魔法函`
         *
         */
        function magic() {
            _that.off(type, magic);

            if (!fired) {
                fired = true;
                fn.apply(context, arguments);
            }
        }
        // 将参数中的回调函数挂载在magic对象的fn属性上,为了执行off方法的时候，暴露对应的函数方法
        magic.fn = fn;

        _that.on(type, magic);
    };

    Fn.prototype.off = function (type, fn) {
        // 移除
        var _that = this;
        var _events = _that._events[type];
        if (!_events) {
            return;
        }

        var count = _events.length;
        while (count--) {
            // 移除通过on或者once绑定的回调函数
            if (_events[count][0] === fn || _events[count][0] && _events[count][0].fn === fn) {
                _events[count][0] = undefined;
            }
        }
    };

    Fn.prototype.trigger = function (type) {
        // 执行事件
        var _that = this;
        var events = _that._events && _that._events[type];
        if (!events) {
            return;
        }

        var len = events.length;
        var eventsCopy = [].concat(toConsumableArray(events));
        for (var i = 0; i < len; i++) {
            var event = eventsCopy[i];

            var _event = slicedToArray(event, 2),
                fn = _event[0],
                context = _event[1];

            if (fn) {
                fn.apply(context, [].slice.call(arguments, 1));
            }
        }
    };
}

var MAX_EXCEED = 30; // 最大超过角度
var VISIBLE_RANGE = 90; // 可视角度(高亮)
var DEFAULT_ITEM_HEIGHT = 40; // 列表项默认高度
var BLUR_WIDTH = 10; // 模糊度(blur滤镜)

var elementStyle = document.createElement('div').style;

var vendor = function () {
  var transformNames = {
    webkit: 'webkitTransform',
    Moz: 'MozTransform',
    O: 'OTransform',
    ms: 'msTransform',
    standard: 'transform'
  };

  for (var key in transformNames) {
    if (elementStyle[transformNames[key]] !== undefined) {
      return key;
    }
  }

  return false;
}();
/**
 * 获取
 *
 * @export
 * @param {any} style 样式名称
 * @returns {String} 加过前缀的样式
 */
function prefixStyle(style) {
  if (vendor === false) {
    return false;
  }

  if (vendor === 'standard') {
    return style;
  }

  return vendor + style.charAt(0).toUpperCase() + style.substr(1);
}

// import { MAX_EXCEED, VISIBLE_RANGE, DEFAULT_ITEM_HEIGHT, BLUR_WIDTH } from './constant';
/**
 * 初始化模块
 *
 * @export
 * @param {Function} Wheel 构造函数
 */
function domModule(Wheel) {
    Wheel.prototype._initEl = function (el) {
        var _that = this;
        var _options = _that._options;
        _that._el = el;
        var _wheelEl = _that._wheelEl = _that._getElements(_options.wheelEl, el)[0];
        if (_wheelEl) {
            var _elItems = _that._getElements(_options.wheelItemEl, _wheelEl);
            if (_elItems && _elItems.length > 0) {
                _that._elItems = _elItems;
                _that.refresh();
                _that._bindEvent();
            } else {
                warn('can not resolve the wheelItem dom');
            }
        } else {
            warn('can not resolve the wheel dom');
        }
    };
    /**
     * 获取元素列表
     *
     * @param {any} el 元素列表、元素标签名称、class名称或空
     * @param {any} [pEl=document] 父节点
     * @returns {Elements} 元素列表
     */
    Wheel.prototype._getElements = function (el) {
        var pEl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;

        var _el = void 0;
        if (el) {
            _el = typeof el === 'string' ? pEl.querySelectorAll(el) : el;
        } else if (pEl && pEl !== document && pEl.children && pEl.children.length > 0) {
            _el = pEl.children;
        }
        if (_el && _el.length === 0) {
            _el = undefined;
        }
        if (_el && !(_el instanceof Array) && _el.length < 1) {
            _el = [_el];
        }
        return _el || [];
    };

    Wheel.prototype._calcElementItemPostion = function (andGenerateItms) {
        // 设置列表项的角度
        var _that = this;
        // if (andGenerateItms) {
        //     _that.items = [];
        // }
        _that._elItems.forEach(function (item, index) {
            // let index = _that._elItems.indexOf(item);
            _that.endAngle = _that.itemAngle * index;
            item._index = index;
            item.angle = _that.endAngle;
            item.style[prefixStyle('transformOrigin')] = 'center center -' + _that.r + 'px';
            item.style[prefixStyle('transform')] = 'translateZ(' + _that.r + 'px) rotateX(' + -_that.endAngle + 'deg)';
            // if (andGenerateItms) {
            //     let dataItem = {};
            //     dataItem.text = item.innerHTML || '';
            //     dataItem.value = item.getAttribute('data-value') || dataItem.text;
            //     _that.items.push(dataItem);
            // }
        });
        _that.endExceed = _that.endAngle + MAX_EXCEED;
        _that._setItemVisibility(_that.beginAngle);
    };
}

var EVENT_TYPE = function () {
    var res = {};
    if ('ontouchstart' in window) {
        res.isTouchable = true;
        res.EVENT_START = 'touchstart';
        res.EVENT_MOVE = 'touchmove';
        res.EVENT_END = 'touchend';
    } else {
        res.isTouchable = false;
        res.EVENT_START = 'mousedown';
        res.EVENT_MOVE = 'mousemove';
        res.EVENT_END = 'mouseup';
    }
    res.EVENT_CANCEL = 'touchcancel';
    res.EVENT_CLICK = 'click';
    return res;
}();

/**
 * 弧度转成角度
 *
 * @export
 * @param {Number} rad 弧度
 * @returns {Number} 角度
 */
function rad2deg(rad) {
  return rad / (Math.PI / 180);
}

/**
 * 减速度运动,结束速度为0,动画缓函数
 *
 * @export
 * @param {Number} t current time（当前时间）当前时间,即动画已经进行了多长时间,开始时间为0；
 * @param {Number} b beginning value（初始值）开始值；
 * @param {Number} c value（变化量）总的变化量；
 * @param {Number} d （持续时间）动画持续多长时间。
 * @returns {Number}
 */
function easing(t, b, c, d) {
  // quartEaseOut
  return -c * ((t = t / d - 1) * t * t * t - 1) + b;
}

/**
 * 初始化模块
 *
 * @export
 * @param {Function} Wheel 构造函数
 */
function coreModule(Wheel) {
    /**
     * 获取选中的索引
     *
     * @returns {Number}
     */
    Wheel.prototype.getSelectedIndex = function () {
        var _that = this;
        var index = parseInt((_that._angle / _that.itemAngle).toFixed(0));
        if (index > _that._elItems.length - 1) {
            index = _that._elItems.length - 1;
        }
        if (index < 0) {
            index = 0;
        }
        return Math.abs(index);
    };
    /**
     * 转到指定的索引
     *
     * @param {any} index 索引号
     * @param {any} duration （持续时间）动画持续多长时间。
     * @param {any} callback 结束后的回调
     */
    Wheel.prototype.wheelTo = function (index, duration, callback) {
        var _that = this;
        _that._wheelEl.style[prefixStyle('transition')] = '';
        var angle = _that._correctAngle(_that.itemAngle * index);
        if (duration && duration > 0) {
            var distAngle = angle - _that._angle;
            _that._scrollDistAngle(Date.now(), _that._angle, distAngle, duration, callback);
        } else {
            _that._setAngle(angle);
            _that._triggerEnd(callback);
        }
    };
    /**
     * 当前所在的角度
     *
     * @param {any} angle 角度
     * @returns {Number}
     */
    Wheel.prototype._correctAngle = function (angle) {
        var _that = this;
        if (angle < _that.beginAngle) {
            return _that.beginAngle;
        } else if (angle > _that.endAngle) {
            return _that.endAngle;
        } else {
            return angle;
        }
    };
    /**
     * 手指移动结束后转为自动滚动
     *
     * @param {any} event 事件对象
     */
    Wheel.prototype._startInertiaScroll = function (event) {
        var _that = this;
        var point = event.changedTouches ? event.changedTouches[0] : event;
        /**
         * 缓动代码
         */
        var nowTime = event.timeStamp || Date.now();
        var v = (point.pageY - _that.lastMoveStart) / (nowTime - _that.lastMoveTime); // 最后一段时间手指划动速度
        var dir = v > 0 ? -1 : 1; // 加速度方向
        var deceleration = dir * 0.0006 * -1;
        var duration = Math.abs(v / deceleration); // 速度消减至0所需时间
        var dist = v * duration / 2; // 最终移动多少
        var startAngle = _that._angle;
        var distAngle = _that._calcAngle(dist) * dir;

        var srcDistAngle = distAngle;
        if (startAngle + distAngle < _that.beginExceed) {
            distAngle = _that.beginExceed - startAngle;
            duration = duration * (distAngle / srcDistAngle) * 0.6;
        }
        if (startAngle + distAngle > _that.endExceed) {
            distAngle = _that.endExceed - startAngle;
            duration = duration * (distAngle / srcDistAngle) * 0.6;
        }

        if (distAngle == 0) {
            _that._endScroll();
            return;
        }
        _that._scrollDistAngle(nowTime, startAngle, distAngle, duration);
    };
    /**
     * 自动滚动
     *
     * @param {Number} nowTime 当前时间
     * @param {Number} startAngle 开始角度
     * @param {Number} distAngle 结束角度
     * @param {Number} duration （持续时间）动画持续多长时间。
     * @param {Function} callback 滚动结束后的回调
     */
    Wheel.prototype._scrollDistAngle = function (nowTime, startAngle, distAngle, duration, callback) {
        var _that = this;
        _that.stopInertiaMove = false;
        (function (nowTime, startAngle, distAngle, duration) {
            var frameInterval = 13;
            var stepCount = duration / frameInterval;
            var stepIndex = 0;
            (function inertiaMove() {
                if (_that.stopInertiaMove) return;
                var newAngle = easing(stepIndex, startAngle, distAngle, stepCount);
                _that._setAngle(newAngle);
                stepIndex++;
                if (stepIndex > stepCount - 1 || newAngle < _that.beginExceed || newAngle > _that.endExceed) {
                    _that._endScroll(callback);
                    return;
                }
                _that.trigger('scroll', {
                    index: _that.getSelectedIndex()
                });
                setTimeout(inertiaMove, frameInterval);
            })();
        })(nowTime, startAngle, distAngle, duration);
    };
    /**
     * 结束滚动
     * @param {Function} callback 滚动结束后的回调
     */
    Wheel.prototype._endScroll = function (callback) {
        var _that = this;
        var _wheelEl = _that._wheelEl;
        if (_that._angle < _that.beginAngle) {
            _wheelEl.style[prefixStyle('transition')] = '150ms ease-out';
            _that._setAngle(_that.beginAngle);
        } else if (_that._angle > _that.endAngle) {
            _wheelEl.style[prefixStyle('transition')] = '150ms ease-out';
            _that._setAngle(_that.endAngle);
        } else {
            var index = parseInt((_that._angle / _that.itemAngle).toFixed(0));
            _wheelEl.style[prefixStyle('transition')] = '100ms ease-out';
            _that._setAngle(_that.itemAngle * index);
        }
        _that._triggerEnd(callback);
    };
    /**
     * 滚动结束
     *
     * @param {any} force 回调或者true:为true时候触发scrollEnd事件
     */
    Wheel.prototype._triggerEnd = function (force) {
        var _that = this;
        setTimeout(function () {
            var index = _that.getSelectedIndex();
            // let item = _that.items[index];
            if (_that.trigger && (index != _that.lastIndex || force === true)) {
                _that.trigger('scrollEnd', {
                    'index': index
                });
            }
            _that.lastIndex = index;
            typeof force === 'function' && force();
        }, 0);
    };
    Wheel.prototype._setItemVisibility = function (angle) {
        var _that = this;
        var _options = _that._options;
        _that._elItems.forEach(function (item) {
            var difference = Math.abs(item.angle - angle);
            if (difference < _that.hightlightRange) {
                item.classList.add(_options.activeCls);
            } else if (difference < _that.visibleRange) {
                item.classList.add(_options.visibleCls);
                item.classList.remove(_options.activeCls);
            } else {
                item.classList.remove(_options.activeCls);
                item.classList.remove(_options.visibleCls);
            }
        });
    };
    Wheel.prototype._setAngle = function (angle) {
        var _that = this;
        var _options = _that._options;
        _that._angle = angle;
        _that._wheelEl.style[prefixStyle('transform')] = 'perspective(' + _options.perspective + ') rotateY(0deg) rotateX(' + angle + 'deg)';
        _that._setItemVisibility(angle);
    };
    Wheel.prototype._calcAngle = function (c) {
        // 计算角度
        var _that = this;
        var b = parseFloat(_that.r);
        var a = b;
        // 直径的整倍数部分直接乘以 180
        c = Math.abs(c); // 只算角度不关心正否值
        var intDeg = parseInt(c / _that.d) * 180;
        c = c % _that.d;
        // 余弦
        var cosC = (a * a + b * b - c * c) / (2 * a * b);
        var angleC = intDeg + rad2deg(Math.acos(cosC));
        return angleC;
    };
    /**
     * 设置移动前的数据
     *
     */
    Wheel.prototype._initInertiaParams = function () {
        var _that = this;
        _that.lastMoveTime = 0;
        _that.lastMoveStart = 0;
        _that.stopInertiaMove = false;
    };
    /**
     * 设置移动时的数据
     *
     * @param {any} event 事件对象
     * @param {any} isStart 是否为开始
     */
    Wheel.prototype._updateInertiaParams = function (event, isStart) {
        var _that = this;
        var point = event.changedTouches ? event.changedTouches[0] : event;
        if (isStart) {
            _that.lastMoveStart = point.pageY;
            _that.lastMoveTime = event.timeStamp || Date.now();
            _that.startAngle = _that._angle;
        } else {
            var nowTime = event.timeStamp || Date.now();
            if (nowTime - _that.lastMoveTime > 300) {
                _that.lastMoveTime = nowTime;
                _that.lastMoveStart = point.pageY;
            }
        }
        _that.stopInertiaMove = true;
    };

    Wheel.prototype._bindEvent = function () {
        var _that = this;
        var _el = _that._el;
        var lastAngle = 0;
        var startY = null;
        var isPicking = false;
        _el.addEventListener(EVENT_TYPE.EVENT_START, function (event) {
            isPicking = true;
            event.preventDefault();
            _that.trigger('scrollStart', {
                index: _that.getSelectedIndex()
            });
            _that._wheelEl.style[prefixStyle('transition')] = '';
            startY = (event.changedTouches ? event.changedTouches[0] : event).pageY;
            lastAngle = _that._angle;
            _that._updateInertiaParams(event, true);
        }, false);
        _el.addEventListener(EVENT_TYPE.EVENT_END, function (event) {
            isPicking = false;
            event.preventDefault();
            _that._startInertiaScroll(event);
        }, false);
        _el.addEventListener(EVENT_TYPE.EVENT_CANCEL, function (event) {
            isPicking = false;
            event.preventDefault();
            _that._startInertiaScroll(event);
        }, false);
        _el.addEventListener(EVENT_TYPE.EVENT_MOVE, function (event) {
            if (!isPicking) {
                return;
            }
            event.preventDefault();
            var endY = (event.changedTouches ? event.changedTouches[0] : event).pageY;
            var dragRange = endY - startY;
            var dragAngle = _that._calcAngle(dragRange);
            var newAngle = dragRange > 0 ? lastAngle - dragAngle : lastAngle + dragAngle;
            if (newAngle > _that.endExceed) {
                newAngle = _that.endExceed;
            }
            if (newAngle < _that.beginExceed) {
                newAngle = _that.beginExceed;
            }
            _that._setAngle(newAngle);
            _that._updateInertiaParams(event);
            _that.trigger('scroll', {
                index: _that.getSelectedIndex()
            });
        }, false);

        // _that._wheelEl.addEventListener('tap', function (event) {
        //     let elementItem = event.target;
        //     if (elementItem.tagName == 'LI') {
        //         _that.setSelectedIndex(_that.elementItems.indexOf(elementItem), 200);
        //     }
        // }, false);
    };
}

/**
 * 获取当前时间
 *
 * @export
 * @returns {Number} 时间戳
 */


/**
 * 拷贝对象
 *
 * @export
 * @param {Object} target 默认对象
 * @param {Object} rest 被拷贝的对象
 * @returns {Object} target
 */
function extend(target) {
    for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        rest[_key - 1] = arguments[_key];
    }

    for (var i = 0; i < rest.length; i++) {
        var source = rest[i];
        if (source instanceof Object) {
            for (var key in source) {
                if (source[key] instanceof Object) {
                    target[key] = extend(source[key] instanceof Array ? [] : {}, source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
    }
    return target;
}

var DEFAULT_OPTIONS = {
    wheelEl: '', // 滚轮列表：元素列表、元素标签名称、class名称或空（空的时候取初始化时el的第一个子元素）
    wheelItemEl: '', // 滚轮列表项（wheelEl的子元素）:元素列表、元素标签名称、class名称或空（空的时候取子元素列表）
    activeCls: 'active', // 活动项的Class名
    visibleCls: 'visible', // 显示项的Class名
    perspective: '1000px' // 视角
};

var platform = navigator.platform.toLowerCase();
var userAgent = navigator.userAgent.toLowerCase();
var isIos = (userAgent.indexOf('iphone') > -1 || userAgent.indexOf('ipad') > -1 || userAgent.indexOf('ipod') > -1) && (platform.indexOf('iphone') > -1 || platform.indexOf('ipad') > -1 || platform.indexOf('ipod') > -1);

/**
 * 初始化模块
 *
 * @export
 * @param {Function} Wheel 构造函数
 */
function initModule(Wheel) {
    Wheel.prototype.refresh = function () {
        var _that = this;
        _that.height = _that._el.offsetHeight;
        _that.r = _that.height / 2 - BLUR_WIDTH;
        _that.d = _that.r * 2;
        _that.itemHeight = _that._elItems.length > 0 ? _that._elItems[0].offsetHeight : DEFAULT_ITEM_HEIGHT;
        _that.itemAngle = parseInt(_that._calcAngle(_that.itemHeight * 0.8));
        _that.hightlightRange = _that.itemAngle / 2;
        _that.visibleRange = VISIBLE_RANGE;
        _that.beginAngle = 0;
        _that.beginExceed = _that.beginAngle - MAX_EXCEED;
        _that._angle = _that.beginAngle;
        if (isIos) {
            _that._wheelEl.style[prefixStyle('transformOrigin')] = 'center center ' + _that.r + 'px';
        }
        _that._calcElementItemPostion(true);
    };

    /**
     * 初始化
     *
     * @param {HTMLElement} el 元素节点
     * @param {Object} options 选项
     */
    Wheel.prototype._init = function (el, options) {
        var _that = this;
        _that._initOptions(options);
        _that._initEl(el);
        _that.refresh();
    };

    Wheel.prototype._initOptions = function (options) {
        var _that = this;
        _that._options = extend({}, DEFAULT_OPTIONS, options);
        return _that._options;
    };
}

// import { easing } from './utils/easing';
// import { rad2deg } from './utils/rad2deg';

// import { EVENT_TYPE } from './utils/eventType';

/**
 * picker滚轮
 *
 * @param {HTMLElement|String} el 元素
 * @param {Object|undefined} options 选项
 */
function Wheel(el, options) {
    var _that = this;
    // let _el = typeof el === 'string' ? document.querySelector(el) : el;
    el = _that._getElements(el)[0];
    if (!el) {
        warn('can not resolve the wrapper dom');
    } else {
        _that._init(el, options);
    }
}

Wheel.use = function (Fn, options) {
    if (Fn instanceof Function) {
        Fn(Wheel, options);
    } else if (Fn && Fn.default instanceof Function) {
        Fn.default(Wheel, options);
    } else {
        warn('can not resolve the use module');
    }
};

Wheel.use(eventModule);
Wheel.use(domModule);
Wheel.use(coreModule);
Wheel.use(initModule);

Wheel.Version = '1.0.0';

exports['default'] = Wheel;
exports.Wheel = Wheel;

Object.defineProperty(exports, '__esModule', { value: true });

})));