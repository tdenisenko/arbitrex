(function () {
    'use strict';
 
    angular
        .module('homepage', [])
        .controller('homepageCtrl', homepageCtrl);
 
    homepageCtrl.$inject = ['$scope', '$timeout', '$http', '$sce'];
 
    function homepageCtrl($scope, $timeout, $http, $sce) {
        var lastUpdateUrl = 'php/lastupdate.php';
        var readRatesUrl = 'php/readrates.php';
        var writeRatesUrl = 'php/writerates.php';
        var proxy = 'php/proxy.php';
        var getRatesUrl = $sce.trustAsResourceUrl('https://openexchangerates.org/api/latest.json?app_id=a2746f4bc0104ce5a9d2365825e416a7&base=USD');
        var getScbRatesUrl = 'http://www.scb.co.th/scb_api/index.jsp';
        var getBitstampRateUrl = 'https://www.bitstamp.net/api/v2/ticker/btcusd/';
        var getBxRateUrl = 'https://bx.in.th/api/trade/?pairing=1';

        var exchanges = {
            bitstamp: 1000,
            bx: 35000
        };
        $scope.input = {
            amount: 600000,
            traded: 200000,
            type: 'THB',
            tradedType: 'THB',
            bitstampfee: '0.24'
        };
        var rates = null;

        window.onblur = function() {window.blurred = true;};
        window.onfocus = function() {window.blurred = false;};

        $scope.formatMoney = function(amount) {
            return accounting.formatMoney(amount, { symbol: $scope.input.type,  format: "%v %s" })
        };

        var localUpdate = function() {
            $http.get(readRatesUrl).then(function(response) {
                if(response.data == null || response.data.rates == null || response.data.rates.scbSell == null) {
                    serverUpdate();
                } else {
                    if ( typeof fx !== "undefined" && fx.rates ) {
                        fx.rates = response.data.rates;
                        fx.base = response.data.base;
                        console.log(fx(1).from('USD').to($scope.input.type));
                    } else {
                        var fxSetup = {
                            rates : response.data.rates,
                            base : response.data.base
                        }
                    }
                    rates = response.data;
                    console.log(rates);
                }
            });
        };

        var serverUpdate = function() {
            $http.jsonp(getRatesUrl).then(function(response) {
                var tempRates = response.data;
                $http.post(proxy, getScbRatesUrl).then(function(response) {
                    var input = response.data;
                    var regex = /<td width="\d+" align="right" class="TextMainBorderGlay">(.+)<\/td>/g;
                    var matches, output = [];
                    while ((matches = regex.exec(input)) && output.length < 3) {
                        output.push(matches[1]);
                    }
                    var ttSell = output[0];
                    var ttBuy = output[2];
                    console.log('SCB Selling Rate: ' + ttSell);
                    console.log('SCB Buying Rate: ' + ttBuy);
                    tempRates.rates.scbSell = Number(ttSell);
                    tempRates.rates.scbBuy = Number(ttBuy);
                    angular.copy(tempRates, rates);
                    if ( typeof fx !== "undefined" && fx.rates ) {
                        fx.rates = tempRates.rates;
                        fx.base = tempRates.base;
                        console.log(fx(1).from('USD').to($scope.input.type));
                    } else {
                        var fxSetup = {
                            rates : tempRates.rates,
                            base : tempRates.base
                        }
                    }
                    $http.post(writeRatesUrl, { rates: tempRates }).then(function(response) {
                        console.log('writing rates: ' + response.data);
                        console.log(rates);
                        console.log('Will check again in 20 minutes.')
                        $timeout(checkRates, 1200000);
                    });
                });
            });
        };

        var checkRates = function() {
            if(window.blurred) {
                $timeout(checkRates, 100);
            } else {
                $http.get(lastUpdateUrl).then(function(response) {
                    var updateNeeded = response.data;
                    if(updateNeeded != 'true') {
                        if(isNaN(updateNeeded)) {
                            console.log('Server Failure: ' + updateNeeded);
                        } else {
                            if(rates == null) {
                                localUpdate();
                            }
                            var delay = Number(updateNeeded);
                            console.log('Will check again in: ' + delay + ' seconds.')
                            $timeout(checkRates, delay * 1000);
                        }
                    } else if(updateNeeded == 'true') {
                        serverUpdate();
                    }
                });
            }
        };

        var checkExchanges = function () {
            if(window.blurred) {
                $timeout(checkExchanges, 100);
            } else {
                $http.post(proxy, getBitstampRateUrl).then(function(response) {
                    exchanges.bitstamp = Number(response.data.ask);
                });
                $http.post(proxy, getBxRateUrl).then(function(response) {
                    exchanges.bx = response.data.highbid[0].rate;
                });
                $timeout(checkExchanges, 10000);
            }
        };

        $scope.calcTotalExchangeRateFee = function() {
            if ( rates != null ) {
                return fx(fx($scope.input.amount).from($scope.input.type).to('THB') / fx(1).from('USD').to('THB') - fx($scope.input.amount).from($scope.input.type).to('THB') / fx(1).from('USD').to('scbSell')).from('USD').to($scope.input.type);
            } else {
                return 0;
            }
        };

        $scope.calcTotalTransferFee = function() {
            if ( rates != null ) {
                return fx(1350).from('THB').to($scope.input.type);
            } else {
                return 0;
            }
        };

        $scope.calcTotalBitstampDepositFee = function() {
            if (rates != null) {
                return fx($scope.input.amount).from($scope.input.type).to('USD') * 0.0005 < 7.5 ? fx(7.5).from('USD').to($scope.input.type) : $scope.input.amount * 0.0005;
            } else {
                return 0;
            }
        };

        $scope.calcTotalBitstampCommissionFee = function() {
            return $scope.input.amount * ($scope.input.bitstampfee / 100);
        };

        $scope.calcTotalBxCommissionFee = function() {
            return $scope.input.amount * (0.25 / 100);
        };

        $scope.calcTotalBxWithdrawFee = function() {
            if (rates != null) {
                return fx(30 + fx($scope.input.amount).from($scope.input.type).to('THB') / 1000).from('THB').to($scope.input.type);
            } else {
                return 0;
            }
        };

        $scope.calcTotalDiffBetweenExchanges = function() {
            if (rates != null) {
                return fx((fx($scope.input.amount).from($scope.input.type).to('USD') / exchanges.bitstamp) * exchanges.bx).from('THB').to($scope.input.type) - $scope.input.amount;
            } else {
                return 0;
            }
        };

        $scope.calcTotalNetProfit = function() {
            return $scope.calcTotalDiffBetweenExchanges() 
                    - $scope.calcTotalExchangeRateFee()
                    - $scope.calcTotalTransferFee()
                    - $scope.calcTotalBitstampDepositFee()
                    - $scope.calcTotalBitstampCommissionFee()
                    - $scope.calcTotalBxCommissionFee()
                    - $scope.calcTotalBxWithdrawFee();
        };

        $scope.calcTraded = function(total) {
            if (rates != null) {
                return total * (fx($scope.input.traded).from($scope.input.tradedType).to($scope.input.type) / $scope.input.amount);
            } else {
                return 0;
            }
        };
        

        checkRates();
        checkExchanges();
        
    }
})();