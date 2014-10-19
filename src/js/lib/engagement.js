/*!
 * JavaScript tracker for Snowplow: engagement.js
 *
 * Significant portions copyright 2014 Rob Flaherty (@robflaherty).
 *
 * Licensed under the MIT license
 */

;(function() {

	var
		helpers = require('./helpers'),
		object = typeof exports !== 'undefined' ? exports : this;

	object.Timer = function Timer() {

		var
			// Aliases
			documentAlias = document,

			started = false,
			stopped = false,
			turnedOff = false,
			clockTime = 0,
			startTime = new Date(),
			clockTimer = null,
			idleTimer = null,
			updateTimeHandler = null,
			idleTimeout;


		function setTimeout( idle) {
			// Set up options and defaults
			idleTimeout = parseInt(idle, 10) || 30;
		}

		function init(updateTime) {
			updateTimeHandler = updateTime;
			// Page visibility listeners
			helpers.addEventListener(documentAlias, 'visibilitychange', visibilityChange);
			helpers.addEventListener(documentAlias, 'webkitvisibilitychange', visibilityChange);

			startTracking();
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
				if (updateTimeHandler) {
					updateTimeHandler();
				}
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

		function startTracking() {

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
				startTracking();
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
			setTimeout: setTimeout,
			init: init,
			start: startTracking,
			trigger: trigger,
			setIdle: setIdle,
			on: turnOn,
			off: turnOff,
			time: time
		};


	}


})();

