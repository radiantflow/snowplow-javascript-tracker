/*
 * JavaScript tracker for Snowplow: pings.js
 * 
 * Significant portions copyright 2010 Anthon Pang. Remainder copyright 
 * 2012-2014 Snowplow Analytics Ltd. All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor Snowplow Analytics Ltd nor the
 *   names of their contributors may be used to endorse or promote products
 *   derived from this software without specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var lodash = require('./lib_managed/lodash'),
	helpers = require('./lib/helpers'),
	object = typeof exports !== 'undefined' ? exports : this;

/**
 * Object for handling page ping tracking
 *
 * @param object core The tracker core
 * @param string trackerId Unique identifier for the tracker instance
 * @return object PingTrackingManager instance
 */
object.getPingTrackingManager = function (core, trackerId) {

	var
		// Aliases
		documentAlias = document,
		windowAlias = window,

		// Determine if the activity tracker is enabled.
		enabled = false,

		// Guard against installing the activity tracker more than once per Tracker instance
		installed = false,


		// Minimum visit time after initial page view (in milliseconds)
		configMinimumVisitTime,

		// Recurring heart beat after initial ping (in milliseconds)
		configHeartBeatTimer,

		// Last activity timestamp
		lastActivityTime,

		// How are we scrolling?
		minXOffset,
		maxXOffset,
		minYOffset,
		maxYOffset;

	/*
	 * Initialize the activity tracker.
	 */
	function enable(minimumVisitLength, heartBeatDelay) {
		configMinimumVisitTime = new Date().getTime() + minimumVisitLength * 1000;
		configHeartBeatTimer = heartBeatDelay * 1000;
		enabled = true;
	}

	/*
	 * Install the activity tracker.
	 */
	function install(pageUrl, pageTitle, referrerUrl, context, pageView) {

		if (enabled && !installed) {
			installed = true;

			// Capture our initial scroll points
			resetMaxScrolls();

			// Add event listeners
			addListeners();

			// Update last activity time.
			lastActivityTime = updateLastActivityTime();

			// Set up activity timer.
			setTimer(pageUrl, pageTitle, referrerUrl, context);
		}
	}

	/*
	 * Set up the timer at heartbeat interval.
	 */
	function setTimer(pageUrl,pageTitle, referrerUrl, context) {
		// Periodic check for activity.
		setInterval(function heartBeat() {
			var now = new Date();

			// There was activity during the heart beat period;
			// on average, this is going to overstate the visitDuration by configHeartBeatTimer/2
			if ((lastActivityTime + configHeartBeatTimer) > now.getTime()) {
				// Send ping if minimum visit time has elapsed
				if (configMinimumVisitTime < now.getTime()) {
					logPagePing(pageUrl, pageTitle, referrerUrl, context); // Grab the min/max globals
				}
			}
		}, configHeartBeatTimer);
	}

	/*
	 * Process all "activity" events.
	 * For performance, this function must have low overhead.
	 */
	function activityHandler() {
		var now = new Date();
		lastActivityTime = now.getTime();
	}

	/*
	 * Process all "scroll" events.
	 */
	function scrollHandler() {
		updateMaxScrolls();
		activityHandler();
	}

	/*
	 * Returns [pageXOffset, pageYOffset].
	 * Adapts code taken from: http://www.javascriptkit.com/javatutors/static2.shtml
	 */
	function getPageOffsets() {
		var iebody = (documentAlias.compatMode && documentAlias.compatMode != "BackCompat") ?
			documentAlias.documentElement :
			documentAlias.body;
		return [iebody.scrollLeft || windowAlias.pageXOffset, iebody.scrollTop || windowAlias.pageYOffset];
	}

	/*
	 * Quick initialization/reset of max scroll levels
	 */
	function resetMaxScrolls() {
		var offsets = getPageOffsets();

		var x = offsets[0];
		minXOffset = x;
		maxXOffset = x;

		var y = offsets[1];
		minYOffset = y;
		maxYOffset = y;
	}

	/*
	 * Check the max scroll levels, updating as necessary
	 */
	function updateMaxScrolls() {
		var offsets = getPageOffsets();

		var x = offsets[0];
		if (x < minXOffset) {
			minXOffset = x;
		} else if (x > maxXOffset) {
			maxXOffset = x;
		}

		var y = offsets[1];
		if (y < minYOffset) {
			minYOffset = y;
		} else if (y > maxYOffset) {
			maxYOffset = y;
		}
	}

	/*
	 * Update last activity time
	 */
	function updateLastActivityTime() {
		var now = new Date();
		lastActivityTime = now.getTime();
	}

	/*
	 * Add event listeners for activity tracking
	 */
	function addListeners() {
		// Add event handlers; cross-browser compatibility here varies significantly
		// @see http://quirksmode.org/dom/events
		helpers.addEventListener(documentAlias, 'click', activityHandler);
		helpers.addEventListener(documentAlias, 'mouseup', activityHandler);
		helpers.addEventListener(documentAlias, 'mousedown', activityHandler);
		helpers.addThrottledEventListener(documentAlias, 'mousemove', activityHandler);
		helpers.addThrottledEventListener(documentAlias, 'mousewheel', activityHandler);
		helpers.addThrottledEventListener(windowAlias, 'DOMMouseScroll', activityHandler);
		helpers.addThrottledEventListener(windowAlias, 'scroll', scrollHandler); // Will updateMaxScrolls() for us
		helpers.addEventListener(documentAlias, 'keypress', activityHandler);
		helpers.addEventListener(documentAlias, 'keydown', activityHandler);
		helpers.addEventListener(documentAlias, 'keyup', activityHandler);
		helpers.addThrottledEventListener(windowAlias, 'resize', activityHandler);
		helpers.addEventListener(windowAlias, 'focus', activityHandler);
		helpers.addEventListener(windowAlias, 'blur', activityHandler);
	}

	/**
	 * Log that a user is still viewing a given page
	 * by sending a page ping.
	 *
	 * @param string pageUrl The page url to attach to this page ping
	 * @param string pageTitle The page title to attach to this page ping
	 * @param string referrerUrl The referrer url to attach to this page ping
	 * @param object context Custom context relating to the event
	 */
	function logPagePing(pageUrl, pageTitle, referrerUrl, context) {
		resetMaxScrolls();
		core.trackPagePing(pageUrl, pageTitle, referrerUrl,
			minXOffset, maxXOffset, minYOffset, maxYOffset, context);
	}

	return {
		enable: enable,
		install: install
	};
};
