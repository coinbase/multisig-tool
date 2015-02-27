"use strict";

var Bitcoin = require('bitcoinjs-lib');
var Address = require('./address');
var Transaction = require('./transaction');
var Bip38Worker = require('./bip38worker');
var constants = require('./constants');
var utils = require('./utils');

var Vault = function(options) {
  // Settings.
  this.balance = 0;
  this.xpubkeys = options.xpubkeys;
  this.lastAddressIndex = options.lastAddressIndex;
  this.view = options.view;
  this.addresses = [];

  this.initialize();
}
Vault.prototype = {
  initialize: function() {
    if ( this.initializing ) return this.initializing.promise();

    this.initializing = new $.Deferred();

    // Build addresses.
    this.createAddresses();

    // Get the initializing promises for all addresses.
    var initializingAddresses = this.addresses.map(function(address) { return address.initialize() });

    // When all of the addresses are initialized, resolve our promise.
    $.when.apply($, initializingAddresses).
    then(this.initializing.resolve);

    return this.initializing.promise();
  },
  updateBalance: function() {
    this.balance = this.addresses.reduce(function(total, address) {
      return total += address.balance;
    }, 0.0);

    this.view.updateBalance('unspent', this.balance);
  },
  getMinimumFee: function() { return utils.satoshisToBtc(constants.MINIMUM_MINER_FEE) },
  createAddresses: function() {
    // Generate the master HD nodes with the xpubkeys.
    var masterNodes = this.xpubkeys.map(function(xpubkey) {
      return Bitcoin.HDNode.fromBase58(xpubkey);
    });

    // Create an address for each index.
    for (var index = 0; index <= this.lastAddressIndex; index++ ) {
      var address = new Address(index, masterNodes);
      address.view = this.view.createAddressView(address);
      this.addresses.push(address);

      // Add balance update hook.
      address.getUnspentOutputs().done(this.updateBalance.bind(this));
    }
  },
  buildTransaction: function(options) {
    this.tx = new Transaction({
      addresses: this.addresses,
      minerFee: options.minerFee,
      destinationAddress: options.destinationAddress,
      seeds: {
        user: options.seeds.user
      }
    });

    this.tx.onReady = options.onReady;

    // Build transaction.
    this.tx.addInputs();
    this.tx.addOutput();

    // Decrypt shared key.
    var worker = new Bip38Worker({
      decrypt_done: this.finishBuildTransaction.bind(this),
      decrypt_working: options.onProgress
    });
    worker.decrypt(options.seeds.shared, options.seeds.shared_password);
  },
  finishBuildTransaction: function(shared_seed) {
    // Use the just decrypted seed.
    this.tx.seeds.shared = shared_seed;

    // Sign transaction.
    this.tx.signInputs();

    // Build.
    this.tx.build();

    // Call ready callback.
    this.tx.onReady();
  }
}

module.exports = Vault;
