/*!
 * JavaScript tracker for Snowplow: riveted.js
 *
 * Significant portions copyright 2014 Rob Flaherty (@robflaherty).
 *
 * Licensed under the MIT license
 */

;(function() {

	var
		helpers = require('./helpers'),

		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	object.Timer = function Timer() {

		var
			// Aliases
			documentAlias = document,
			windowAlias = window,

			started = false,
			stopped = false,
			turnedOff = false,
			clockTime = 0,
			startTime = new Date(),
			clockTimer = null,
			idleTimer = null,
			sendActivity = null,
			reportInterval,
			idleTimeout;


		function init(activityHandler, options) {

			// Set up options and defaults
			options = options || {};
			reportInterval = parseInt(options.reportInterval, 10) || 5;
			idleTimeout = parseInt(options.idleTimeout, 10) || 30;

			if (typeof activityHandler == 'function') {
				sendActivity = activityHandler;
			}

			// Basic activity event listeners
			helpers.addEventListener(documentAlias, 'keydown', trigger);
			helpers.addEventListener(documentAlias, 'click', trigger);
			helpers.addEventListener(windowAlias, 'mousemove', throttle(trigger, 500));
			helpers.addEventListener(windowAlias, 'scroll', throttle(trigger, 500));

			// Page visibility listeners
			helpers.addEventListener(documentAlias, 'visibilitychange', visibilityChange);
			helpers.addEventListener(documentAlias, 'webkitvisibilitychange', visibilityChange);
		}


		/*
		 * Throttle function borrowed from:
		 * Underscore.js 1.5.2
		 * http://underscorejs.org
		 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
		 * Underscore may be freely distributed under the MIT license.
		 */

		function throttle(func, wait) {
			var context, args, result;
			var timeout = null;
			var previous = 0;
			var later = function () {
				previous = new Date;
				timeout = null;
				result = func.apply(context, args);
			};
			return function () {
				var now = new Date;
				if (!previous) previous = now;
				var remaining = wait - (now - previous);
				context = this;
				args = arguments;
				if (remaining <= 0) {
					clearTimeout(timeout);
					timeout = null;
					previous = now;
					result = func.apply(context, args);
				} else if (!timeout) {
					timeout = setTimeout(later, remaining);
				}
				return result;
			};
		}



		function setIdle() {
			clearTimeout(idleTimer);
			stopClock();
		}

		function visibilityChange() {
			if (document.hidden || document.webkitHidden) {
				setIdle();
			}
		}

		function clock() {
			clockTime += 1;
			if (clockTime > 0) {
				sendActivity();
			}
		}

		function stopClock() {
			stopped = true;
			clearTimeout(clockTimer);
		}

		function turnOff() {
			setIdle();
			turnedOff = true;
		}

		function turnOn() {
			turnedOff = false;
		}

		function restartClock() {
			stopped = false;
			clearTimeout(clockTimer);
			clockTimer = setInterval(clock, 1000);
		}

		function startRiveted() {

			// Calculate seconds from start to first interaction
			var currentTime = new Date();
			var diff = currentTime - startTime;

			// Set global
			started = true;

			// Start clock
			clockTimer = setInterval(clock, 1000);
		}

		function trigger() {

			if (turnedOff) {
				return;
			}

			if (!started) {
				startRiveted();
			}

			if (stopped) {
				restartClock();
			}

			clearTimeout(idleTimer);
			idleTimer = setTimeout(setIdle, idleTimeout * 1000 + 100);
		}

		function time() {
			return clockTime;
		}


		/************************************************************
		 * Public data and methods
		 ************************************************************/

		return {
			init: init,
			trigger: trigger,
			setIdle: setIdle,
			on: turnOn,
			off: turnOff,
			time: time
		};


	}


})();

