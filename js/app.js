(function () {
    'use strict';
 
    angular.module('arbitrex', [
        'ui.bootstrap',
        'homepage'])
        .config(config);
 
    config.$inject = ['$compileProvider', '$httpProvider'];
    function config($compileProvider, $httpProvider) {
            
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|file|ms-appx):/);
 
        initializeHttpProvider();
 
        function initializeHttpProvider() {
            //initialize get if not there
            if (!$httpProvider.defaults.headers.get) {
                $httpProvider.defaults.headers.get = {};
            }
 
            // Answer edited to include suggestions from comments
            // because previous version of code introduced browser-related errors
 
            //disable IE ajax request caching
            $httpProvider.defaults.headers.get['If-Modified-Since'] = 'Mon, 01 Jul 1990 05:00:00 GMT';
            // extra
            $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
            $httpProvider.defaults.headers.get.Pragma = 'no-cache';
 
            $httpProvider.defaults.withCredentials = true;
 
 
            document.addEventListener('deviceready', onDeviceReady, false);
            function onDeviceReady() {
                //console.log(device.cordova);
                console.log(new Date().toLocaleTimeString());
            }
 
        }
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(|local)/);
 
    }
 
})();