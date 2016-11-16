"use strict";

var constants = require('./constants');

/***
  Bitpay Insignt API wrapper
***/
var Insight = {
  getUnspentOutputs: function(address) {
    return Insight.get("addr/" + address + "/utxo");
  },
  get: function(url) {
    return $.ajax({
      method: 'GET',
      url: constants.INSIGHT_API_URL_ROOT + url
    })
  }
}

module.exports = Insight;
