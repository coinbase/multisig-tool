"use strict";

// Dependencies.
var Bitcoin = require('bitcoinjs-lib');
var Toshi = require('./toshi');
var constants = require('./constants');
var utils = require('./utils');


/***
Address */
var Address = function(index, masterNodes) {
  this.balance = 0;
  this.index = index;
  this.unspentOutputs = [];
  this.masterNodes = masterNodes;

  // Fetch unspent outputs.
  this.initialize();
}
Address.prototype = {
  initialize: function() {
    if ( this.initializing ) return this.initializing.promise();

    this.initializing = new $.Deferred();

    // Things that need to happen before we declare we're initialized.
    $.when(
      this.generate(),
      this.getUnspentOutputs()
    ).
    then(this.initializing.resolve);

    return this.initializing.promise();
  },
  generate: function() {
    if ( this.generating ) return this.generating.promise();

    this.generating = new $.Deferred();

    // Do this async, to not block rendering.
    setTimeout(function() {
      // Derive the child pubkey for each master node.
      var pubkeys = this.masterNodes.map(function(node) { return node.derive(this.index).pubKey; }.bind(this));

      // Uncompress the pubkeys.
      this.pubkeys = pubkeys.map(function(pubKey) {
        return new Bitcoin.ECPubKey(pubKey.Q, false);
      }).sort(this.comparePubKeys); // And sort them by their hex values.

      // Generate the redeemScript.
      this.redeemScript = Bitcoin.scripts.multisigOutput(constants.M, this.pubkeys); // M of N;

      // Generate the multisig address for this redeem script.
      var scriptPubKey = Bitcoin.scripts.scriptHashOutput(this.redeemScript.getHash());
      this.address = Bitcoin.Address.fromOutputScript(scriptPubKey).toString();

      this.generating.resolve(this.address);
    }.bind(this), 0);

    return this.generating.promise();
  },
  getUnspentOutputs: function() {
    if ( this.getting ) return this.getting.promise();

    this.getting = new $.Deferred();

    // Wait for address to be generated before attempting to fetch it's outputs.
    var that = this;
    this.generate().done(function() {
      // Call Toshi.
      Toshi.getUnspentOutputs(that.address).
        done(that.setUnspentOutputs.bind(that)). // If done successfully set unspent outputs.
        always(that.getting.resolve);           // In any case, resolve this promise.
    });

    return this.getting.promise();
  },
  setUnspentOutputs: function(response) {
    if (!response) return;
    if (response.length < 1) return;

    this.unspentOutputs = response.map(function(output) {
      return {
        hash: output.transaction_hash,
        index: output.output_index,
        amount: output.amount,
        script: Bitcoin.Script.fromHex(output.script_hex)
      }
    });

    this.updateBalance();
  },
  updateBalance: function() {
    this.balance = this.unspentOutputs.reduce(function(total, output) {
      return total += output.amount;
    }, 0.0);
  },
  getPrvKey: function(node) {
    return node.derive(this.index).privKey;
  },
  comparePubKeys: function(a, b) {
    if (a.toHex() < b.toHex()) return -1;
    if (b.toHex() < a.toHex()) return 1;
    return 0;
  }
}

module.exports = Address;
