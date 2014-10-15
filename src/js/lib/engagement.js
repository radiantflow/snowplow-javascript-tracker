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
			idleTimeout;


		function init(activityHandler, idle) {

			// Set up options and defaults
			idleTimeout = parseInt(idle, 10) || 30;

			if (typeof activityHandler == 'function') {
				sendActivity = activityHandler;
			}

			// Basic activity event listeners
			helpers.addEventListener(documentAlias, 'keydown', trigger);
			helpers.addEventListener(documentAlias, 'click', trigger);
			helpers.addThrottledEventListener(windowAlias, 'mousemove', trigger);
			helpers.addThrottledEventListener(windowAlias, 'scroll', trigger);

			// Page visibility listeners
			helpers.addEventListener(documentAlias, 'visibilitychange', visibilityChange);
			helpers.addEventListener(documentAlias, 'webkitvisibilitychange', visibilityChange);
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

