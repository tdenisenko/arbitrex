(function () {
    'use strict';
 
    angular
        .module('homepage', [])
        .controller('homepageCtrl', homepageCtrl);
 
    homepageCtrl.$inject = ['$scope', '$timeout', '$http'];
 
    function homepageCtrl($scope, $timeout, $http) {
        $scope.world = 'World';
    }
})();