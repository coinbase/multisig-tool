"use strict";

var constants = require('./constants');

/***
Toshi API wrapper */
var Toshi = {
  getUnspentOutputs: function(address) {
    return Toshi.get("addresses/" + address + "/unspent_outputs");
  },
  get: function(url) {
    return $.ajax({
      method: 'GET',
      url: constants.TOSHI_API_URL_ROOT + url
    })
  }
}

module.exports = Toshi;
