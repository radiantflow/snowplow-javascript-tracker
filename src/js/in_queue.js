/*
 * JavaScript tracker for Snowplow: queue.js
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

;(function() {

	var
		lodash = require('./lib/lodash'),
		tracker = require('./tracker'),
		object = typeof exports !== 'undefined' ? exports : this; // For eventual node.js environment support

	/************************************************************
	 * Proxy object
	 * - this allows the caller to continue push()'ing to _snaq
	 *   after the Tracker has been initialized and loaded
	 ************************************************************/

	object.AsyncQueueProxy = function(version, mutSnowplowState, asyncQueue) {

		var trackerDictionary = {};

		function getNamedTrackers(names) {
			var namedTrackers = [];
			if (!names || names.length === 0) {
				namedTrackers = lodash.values(trackerDictionary);
			} else {
				for (var i = 0; i < names.length; i++) {
					if (trackerDictionary.hasOwnProperty(names[i])) {
						namedTrackers.push(trackerDictionary[names[i]]);
					}
				}
			}
			
			return namedTrackers;
		}

		function legacyHandleNewCollector(f, endpoint, namespace) {
			var name;

			if (lodash.isUndefined(namespace)) {
				name = 'default'    // TODO: make default names work properly
			} else {
				name = namespace;
			}

			handleNewCollector(name);
			trackerDictionary[name][f](endpoint);
		}

		function handleNewCollector(namespace) {
			trackerDictionary[namespace] = new tracker.Tracker(version, mutSnowplowState) // TODO: what of argmap?
		}

		// Currently using Grunt argument syntax e.g. trackStructEvent:main;rt
		function extractNames(string) {
			var concatenatedNames = string.split(':')[1];

			if (concatenatedNames) {
				return concatenatedNames.split(';');
			}
			else {
				return null;
			}
		}

		function extractFunction(string) {
			return string.split(':')[0];
		}

		/*
		 * apply wrapper
		 *
		 * @param array parameterArray An array comprising either:
		 *      [ 'methodName', optional_parameters ]
		 * or:
		 *      [ functionObject, optional_parameters ]
		 */
		function applyAsyncFunction() {
			var i, f, parameterArray, inputString, names, namedTrackers;

			// Outer loop in case someone push'es in zarg of arrays
			for (i = 0; i < arguments.length; i += 1) {
				parameterArray = arguments[i];
				inputString = parameterArray.shift();
				f = extractFunction(inputString);
				names = extractNames(inputString);

				if (f === 'newTracker') {
					handleNewCollector(parameterArray[0]);
					continue;
				}

				if (f === 'setCollectorCf' || f === 'setCollectorUrl') {
					legacyHandleNewCollector(f, parameterArray[0], parameterArray[1]);
					if (!lodash.isUndefined(console)) {
						console.log(f, 'is deprecated.'); //TODO: more instructions for switching
					}
					continue;
				}

				namedTrackers = getNamedTrackers(names);

				if (lodash.isString(f)) {
					for (var j = 0; j < namedTrackers.length; j++) {
						namedTrackers[j][f].apply(namedTrackers[j], parameterArray);
					}
				} else {
					for (var j = 0; j < namedTrackers.length; j++) {
						f.apply(namedTrackers[j], parameterArray);
					}
				}
			}
		}

		// We need to manually apply any events collected before this initialization
		for (var i = 0; i < asyncQueue.length; i++) {
			applyAsyncFunction(asyncQueue[i]);
		}

		return {
			push: applyAsyncFunction
		};
	}

}());
