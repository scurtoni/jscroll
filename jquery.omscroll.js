/*!
 * omScroll - jQuery Plugin for Infinite Scrolling / Auto-Paging
 * @see @link{http://omscroll.com}
 *
 * @copyright 2011-2017, Philip Klauzinski
 * @license Dual licensed under the MIT and GPL Version 2 licenses.
 * @author Philip Klauzinski (http://webtopian.com)
 * @version 2.3.7
 * @requires jQuery v1.4.3+
 * @preserve
 */
(function($) {

    'use strict';

    // Define the omscroll namespace and default settings
    $.omscroll = {
        defaults: {
            debug: false,
            autoTrigger: true,
            autoTriggerUntil: false,
            loadingHtml: '<small>Loading...</small>',
            loadingFunction: false,
            padding: 0,
            nextSelector: 'a:last',
            contentSelector: '',
            pagingSelector: '',
            callback: false,
            wrapperClass: 'clearfix'
        }
    };

    // Constructor
    var omScroll = function($e, options) {

        // Private vars and methods
        var _data = $e.data('omscroll'),
            _userOptions = (typeof options === 'function') ? { callback: options } : options,
            _options = $.extend({}, $.omscroll.defaults, _userOptions, _data || {}),
            _isWindow = ($e.css('overflow-y') === 'visible'),
            _$next = $e.find(_options.nextSelector).first(),
            _$window = $(window),
            _$body = $('body'),
            _$scroll = _isWindow ? _$window : $e,
            _nextHref = $.trim(_$next.attr('href') + ' ' + _options.contentSelector),

            // Check if a loading image is defined and preload
            _preloadImage = function() {
                var src = $(_options.loadingHtml).filter('img').attr('src');
                if (src) {
                    var image = new Image();
                    image.src = src;
                }
            },

            // Wrap inner content, if it isn't already
            _wrapInnerContent = function() {
                if (!$e.find('.omscroll-inner').length) {
                    $e.contents().wrapAll('<div class="omscroll-inner ' + _options.wrapperClass + '" />');
                }
            },

            // Find the next link's parent, or add one, and hide it
            _nextWrap = function($next) {
                var $parent;
                if (_options.pagingSelector) {
                    $next.closest(_options.pagingSelector).hide();
                } else {
                    $parent = $next.parent().not('.omscroll-inner,.omscroll-added').addClass('omscroll-next-parent').hide();
                    if (!$parent.length) {
                        $next.wrap('<div class="omscroll-next-parent" />').parent().hide();
                    }
                }
            },

            // Remove the omscroll behavior and data from an element
            _destroy = function() {
                return _$scroll.unbind('.omscroll')
                    .removeData('omscroll')
                    .find('.omscroll-inner').children().unwrap()
                    .filter('.omscroll-added').children().unwrap();
            },

            // Observe the scroll event for when to trigger the next load
            _observe = function() {
                if ($e.is(':visible')) {
                    _wrapInnerContent();
                    var $inner = $e.find('div.omscroll-inner').first(),
                        data = $e.data('omscroll'),
                        borderTopWidth = parseInt($e.css('borderTopWidth'), 10),
                        borderTopWidthInt = isNaN(borderTopWidth) ? 0 : borderTopWidth,
                        iContainerTop = parseInt($e.css('paddingTop'), 10) + borderTopWidthInt,
                        iTopHeight = _isWindow ? _$scroll.scrollTop() : $e.offset().top,
                        innerTop = $inner.length ? $inner.offset().top : 0,
                        iTotalHeight = Math.ceil(iTopHeight - innerTop + _$scroll.height() + iContainerTop);

                    if (!data.waiting && iTotalHeight + _options.padding >= $inner.outerHeight()) {
                        //data.nextHref = $.trim(data.nextHref + ' ' + _options.contentSelector);
                        _debug('info', 'omscroll:', $inner.outerHeight() - iTotalHeight, 'from bottom. Loading next request...');
                        return _load();
                    }
                }
            },

            // Check if the href for the next set of content has been set
            _checkNextHref = function(data) {
                data = data || $e.data('omscroll');
                if (!data || !data.nextHref) {
                    _debug('warn', 'omscroll: nextSelector not found - destroying');
                    _destroy();
                    return false;
                } else {
                    _setBindings();
                    return true;
                }
            },

            _setBindings = function() {
                var $next = $e.find(_options.nextSelector).first();
                if (!$next.length) {
                    return;
                }
                if (_options.autoTrigger && (_options.autoTriggerUntil === false || _options.autoTriggerUntil > 0)) {
                    _nextWrap($next);
                     var scrollingBodyHeight = _$body.height() - $e.offset().top,
                    	scrollingHeight = ($e.height() < scrollingBodyHeight) ? $e.height() : scrollingBodyHeight,
                    	windowHeight = ($e.offset().top - _$window.scrollTop() > 0) ? _$window.height() - ($e.offset().top - $(window).scrollTop()) : _$window.height();
                    if (scrollingHeight <= windowHeight) {
                        _observe();
                    }
                    _$scroll.unbind('.omscroll').bind('scroll.omscroll', function() {
                        return _observe();
                    });
                    if (_options.autoTriggerUntil > 0) {
                        _options.autoTriggerUntil--;
                    }
                } else {
                    _$scroll.unbind('.omscroll');
                    $next.bind('click.omscroll', function() {
                        _nextWrap($next);
                        _load();
                        return false;
                    });
                }
            },

            // Load the next set of content, if available
            _load = function() {
                var $inner = $e.find('div.omscroll-inner').first(),
                    data = $e.data('omscroll');

                data.waiting = true;
                $inner.append('<div class="omscroll-added" />')
                    .children('.omscroll-added').last()
                    .html('<div class="omscroll-loading" id="omscroll-loading">' + _options.loadingHtml + '</div>')
                    .promise()
                    .done(function(){
                        if (_options.loadingFunction) {
                            _options.loadingFunction();
                        }
                    });

                return $e.animate({scrollTop: $inner.outerHeight()}, 0, function() {
                    var nextHref = data.nextHref;
                    $inner.find('div.omscroll-added').last().load(nextHref, function(r, status) {
                        if (status === 'error') {
                            return _destroy();
                        }
                        var $next = $(this).find(_options.nextSelector).first();
                        data.waiting = false;
                        data.nextHref = $next.attr('href') ? $.trim($next.attr('href') + ' ' + _options.contentSelector) : false;
                        $('.omscroll-next-parent', $e).remove(); // Remove the previous next link now that we have a new one
                        _checkNextHref();
                        if (_options.callback) {
                            _options.callback.call(this, nextHref);
                        }
                        _debug('dir', data);
                    });
                });
            },

            // Safe console debug - http://klauzinski.com/javascript/safe-firebug-console-in-javascript
            _debug = function(m) {
                if (_options.debug && typeof console === 'object' && (typeof m === 'object' || typeof console[m] === 'function')) {
                    if (typeof m === 'object') {
                        var args = [];
                        for (var sMethod in m) {
                            if (typeof console[sMethod] === 'function') {
                                args = (m[sMethod].length) ? m[sMethod] : [m[sMethod]];
                                console[sMethod].apply(console, args);
                            } else {
                                console.log.apply(console, args);
                            }
                        }
                    } else {
                        console[m].apply(console, Array.prototype.slice.call(arguments, 1));
                    }
                }
            };

        // Initialization
        $e.data('omscroll', $.extend({}, _data, {initialized: true, waiting: false, nextHref: _nextHref}));
        _wrapInnerContent();
        _preloadImage();
        _setBindings();

        // Expose API methods via the jQuery.omscroll namespace, e.g. $('sel').omscroll.method()
        $.extend($e.omscroll, {
            destroy: _destroy
        });
        return $e;
    };

    // Define the omscroll plugin method and loop
    $.fn.omscroll = function(m) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data('omscroll'), omscroll;

            // Instantiate omscroll on this element if it hasn't been already
            if (data && data.initialized) {
                return;
            }
            omscroll = new omScroll($this, m);
        });
    };

})(jQuery);