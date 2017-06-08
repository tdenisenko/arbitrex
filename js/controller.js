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
            bitstampAsk: 1000,
            bitstampBid: 1000,
            bxAsk: 35000,
            bxBid: 35000
        };
        $scope.input = {
            amount: 600000,
            traded: 200000,
            type: 'THB',
            tradedType: 'THB',
            bitstampfee: '0.15',
            scbRate: 34.2,
            scbGetLatestRate: false
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
                        //console.log(fx(1).from('USD').to($scope.input.type));
                    } else {
                        var fxSetup = {
                            rates : response.data.rates,
                            base : response.data.base
                        }
                    }
                    rates = response.data;
                }
            });
        };

        var serverUpdate = function() {
            $http.jsonp(getRatesUrl).then(function(response) {
                var tempRates = response.data;
                if(tempRates == null) { 
                    $timeout(checkRates, 100);
                } else {
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
                        rates = angular.copy(tempRates);
                        if ( typeof fx !== "undefined" && fx.rates ) {
                            fx.rates = tempRates.rates;
                            fx.base = tempRates.base;
                            console.log('Actual THB Rate: ' + fx(1).from('USD').to('THB'));
                        } else {
                            var fxSetup = {
                                rates : tempRates.rates,
                                base : tempRates.base
                            }
                        }
                        $http.post(writeRatesUrl, { rates: tempRates }).then(function(response) {
                            var updateTime = new Date().toLocaleTimeString('en-US', { hour12: false, 
                                             hour: "numeric", 
                                             minute: "numeric"});
                            console.log('Last updated at: ' + updateTime);
                            $timeout(checkRates, 1200000);
                        });
                    });
                }
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
                            var updateTime = new Date().toLocaleTimeString('en-US', { hour12: false, 
                                             hour: "numeric", 
                                             minute: "numeric"});
                            console.log('Last updated at: ' + updateTime);
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
                    exchanges.bitstampAsk = Number(response.data.ask);
                    exchanges.bitstampBid = Number(response.data.bid);
                });
                $http.post(proxy, getBxRateUrl).then(function(response) {
                    exchanges.bxBid = response.data.highbid[0].rate;
                    exchanges.bxAsk = response.data.lowask[0].rate;
                });
                $timeout(checkExchanges, 10000);
            }
        };

        $scope.bx2bs = {
            calcTotalExchangeRateFee: function() {
                if ( rates != null ) {
                    return fx(fx($scope.input.amount).from($scope.input.type).to('THB') - fx($scope.input.amount).from($scope.input.type).to('USD') * rates.rates.scbBuy).from('THB').to($scope.input.type);
                } else {
                    return 0;
                }
            },
            calcTotalBitstampTransferFee: function() {
                var fee = fx($scope.input.amount).from($scope.input.type).to('USD') * 0.0009;
                return fee > 15 ? fx(fee).from('USD').to($scope.input.type) : fx(15).from('USD').to($scope.input.type);
            },

        };

        $scope.bs2bx = {
            calcTotalExchangeRateFee: function() {
                if ( rates != null ) {
                    return fx(fx($scope.input.amount).from($scope.input.type).to('USD') - fx($scope.input.amount).from($scope.input.type).to('THB') / rates.rates.scbSell).from('USD').to($scope.input.type);
                } else {
                    return 0;
                }
            },
            calcTotalScbSwiftTransferFee: function() {
                if ( rates != null ) {
                    return fx(1350).from('THB').to($scope.input.type);
                } else {
                    return 0;
                }
            },

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
                var bs2bx = fx((fx($scope.input.amount).from($scope.input.type).to('USD') / exchanges.bitstampAsk) * exchanges.bxBid).from('THB').to($scope.input.type) - $scope.input.amount;
                var bx2bs = fx((fx($scope.input.amount).from($scope.input.type).to('THB') / exchanges.bxAsk) * exchanges.bitstampBid).from('USD').to($scope.input.type) - $scope.input.amount;
                $scope.isBs2Bx = bx2bs > bs2bx;
                return Math.max(bx2bs, bs2bx);
            } else {
                return 0;
            }
        };

        $scope.calcTotalNetProfit = function() {
            return $scope.calcTotalDiffBetweenExchanges() 
                    - $scope.calcTotalExchangeRateFee()
                    - ($scope.isBs2Bx ? $scope.calcTotalScbSwiftTransferFee() : $scope.calcTotalBitstampTransferFee())
                    - ($scope.isBs2Bx ? $scope.calcTotalBitstampDepositFee() : 0)
                    - $scope.calcTotalBitstampCommissionFee()
                    - $scope.calcTotalBxCommissionFee()
                    - ($scope.isBs2Bx ? $scope.calcTotalBxWithdrawFee() : $scope.calcTotalScbLocalTransferFee());
        };

        $scope.calcTotalScbLocalTransferFee = function() {
            return fx((parseInt(($scope.input.amount / fx(50000).from('THB').to($scope.input.type)), 10) + 1) * 35).from('THB').to($scope.input.type);
        };

        $scope.calcTraded = function(total) {
            if (rates != null) {
                return total * (fx($scope.input.traded).from($scope.input.tradedType).to($scope.input.type) / $scope.input.amount);
            } else {
                return 0;
            }
        };

        $scope.updateScbRate = function() {
            if ( rates != null ) {
                if($scope.input.scbGetLatestRate) {
                    console.log('Getting latest SCB rate...');
                    $scope.input.scbRate = $scope.isBs2Bx ? rates.rates.scbSell : rates.rates.scbBuy;
                }
            }
        };

        $scope.getPercentage = function(divided, divisor) {
            return ((divided / divisor) * 100).toFixed(2) + '%';
        };

        checkRates();
        checkExchanges();
        
    }
})();