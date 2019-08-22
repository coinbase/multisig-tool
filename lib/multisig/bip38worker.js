"use strict";

fetch("lib/multisig/bip38.js");

/***
BIP38 worker */
var Bip38Worker = function(options) {
  this.worker = new Worker('lib/multisig/bip38.js');
  this.worker.addEventListener('message', function(e) {
    var data = e.data;

    // If status reported done, try calling the method if specified through options as a callback.
    if (data.status == 'done' && options[data.cmd + "_done"]) {
      options[data.cmd + "_done"](data.result);
    }
    if (data.status == 'working' && options[data.cmd + "_working"]) {
      options[data.cmd + "_working"](data.percent);
    }
  }, false);
}
Bip38Worker.prototype = {
  encrypt: function(wif, password, address) {
    this.worker.postMessage({
      cmd: 'encrypt',
      wif: wif,
      password: password,
      address: address
    });
  },
  decrypt: function(cipher, password) {
    this.worker.postMessage({
      cmd: 'decrypt',
      cipher: cipher,
      password: password
    });
  }
}

module.exports = Bip38Worker;
