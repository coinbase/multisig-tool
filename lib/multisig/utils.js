"use strict";

var constants = require('./constants');

var utils = {
  btcToSatoshis: function(btc) { return Math.floor(parseFloat(btc) * constants.BITCOIN_SATOSHIS); },
  satoshisToBtc: function(satoshis) { return (parseInt(satoshis) / constants.BITCOIN_SATOSHIS).toFixed(8); }
}

module.exports = utils;
