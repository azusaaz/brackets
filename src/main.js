/*
 * Copyright (c) 2013 - present Adobe Systems Incorporated. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * The bootstrapping module for brackets. This module sets up the require
 * configuration and loads the brackets module.
 */
require.config({
    // Disable module loading timeouts, due to the size of what we load
    waitSeconds: 0,
    paths: {
        "text"              : "thirdparty/text/text",
        "i18n"              : "thirdparty/i18n/i18n",
        "react"             : "thirdparty/react",

        // The file system implementation. Change this value to use different
        // implementations (e.g. cloud-based storage).
        "fileSystemImpl"    : "filesystem/impls/filer/FilerFileSystem"
    },
    map: {
        "*": {
            "thirdparty/CodeMirror2": "thirdparty/CodeMirror",
            "thirdparty/react":       "react"
        }
    }
});

if (window.location.search.indexOf("testEnvironment") > -1) {
    require.config({
        paths: {
            "preferences/PreferencesImpl": "../test/TestPreferencesImpl"
        },
        locale: "en" // force English (US)
    });
} else {
    /**
     * hack for r.js optimization, move locale to another config call
     *
     * Use custom brackets property until CEF sets the correct navigator.language
     * NOTE: When we change to navigator.language here, we also should change to
     * navigator.language in ExtensionLoader (when making require contexts for each
     * extension).
     */
    var urlLocale = window.location.search && /locale=([^&]+)&?/.exec(window.location.search);
    urlLocale = urlLocale && urlLocale[1] && urlLocale[1].toLowerCase();

    require.config({
        locale: urlLocale || (typeof (brackets) !== "undefined" ? brackets.app.language : navigator.language)
    });
}

/**
 * Service Worker offline cache registration. The bramble-sw.js file
 * is generated by Grunt as part of a dist/ build, and will not do anything
 * in dev builds.
 */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('bramble-sw.js').then(function(reg) {
        "use strict";

        reg.onupdatefound = function() {
            var installingWorker = reg.installing;

            installingWorker.onstatechange = function() {
                switch (installingWorker.state) {
                case 'installed':
                    if (navigator.serviceWorker.controller) {
                        // At this point, the old content will have been purged and the fresh content will
                        // have been added to the cache.
                        // It's the perfect time to display a "New content is available; please refresh."
                        // message in the page's interface.
                        console.log('[Bramble] New or updated content is available.');
                    } else {
                        // At this point, everything has been precached.
                        // It's the perfect time to display a "Content is cached for offline use." message.
                        console.log('[Bramble] Content is now available offline!');
                    }
                    break;
                case 'redundant':
                    console.error('[Bramble] The installing service worker became redundant.');
                    break;
                }
            };
        };
    }).catch(function(e) {
        "use strict";
        console.error('[Bramble] Error during service worker registration:', e);
    });
}

define(function (require) {
    "use strict";

    // Load compatibility shims--these need to load early, be careful moving this
    require([
        "utils/Compatibility",
        // XXXBramble: temporary MessageChannel shim for Firefox, see:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=952139
        "bramble/thirdparty/MessageChannel/message_channel"
    ],
    function () {
        // XXXBramble: get the filesystem loading ASAP for connection with parent window
        require(["filesystem/impls/filer/RemoteFiler"], function(RemoteFiler) {
            RemoteFiler.init();
            // Load the brackets module. This is a self-running module that loads and
            // runs the entire application.
            require(["brackets"]);
        });
    });
});
