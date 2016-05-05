"use strict";

var Bitcoin = require('bitcoinjs-lib');

var Address = require('./address');
var Transaction = require('./transaction');
var Bip38Worker = require('./bip38worker');
var generateHdWallet = require('./generateHdWallet');
var constants = require('./constants');
var utils = require('./utils');

var Vault = function(options) {
  // Settings.
  this.balance = 0;
  this.xpubkeys = options.xpubkeys;
  this.lastAddressIndex = options.lastAddressIndex;
  this.view = options.view;
  this.addresses = [];

  if (constants.DEBUG) console.log('Initializing vault', options);

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

    // Over time, we have changed how addresses are generated
    var compressionCombinations = [
      [false, false, false],  // All uncompressed
      [true, false, false],  // Only Coinbase-key compressed
      [true, true, true],  // All compressed
    ];

    // Create an address for each index.
    for (var index = 0; index <= this.lastAddressIndex; index++ ) {
      for (var comboIdx = 0; comboIdx < compressionCombinations.length; comboIdx++) {
        var compression = compressionCombinations[comboIdx];
        var metaNodes = [];
        for (var i = 0; i < compression.length; i++) {
          metaNodes.push({
            hd_node: masterNodes[i],
            compressed: compression[i]
          });
        }

        var address = new Address(index, metaNodes);
        address.view = this.view.createAddressView(address);
        this.addresses.push(address);

        // Add balance update hook.
        address.getUnspentOutputs().done(this.updateBalance.bind(this));
      }
    }
  },
  xpubkeysIncludeSeed: function(seed) {
    var node = generateHdWallet(seed);
    if (!node) {
      return false;
    }

    var xpub = node.neutered().toBase58();
    if (!xpub) {
      return false;
    }

    if (!this.xpubkeys.length) {
      return false;
    }

    return this.xpubkeys.filter(function(xpk) { return xpk == xpub; }).length > 0;
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

    // Validate user key.
    if (!this.xpubkeysIncludeSeed(this.tx.seeds.user)) {
      var err = new Error('The user seed does not correspond to a xpubkey.');
      this.tx.onReady(err);
    }

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

    // Validate decrypted shared key.
    if (!this.xpubkeysIncludeSeed(shared_seed)) {
      var err = new Error('The shared encrypted seed password is incorrect.');
      this.tx.onReady(err);
    }

    // Sign transaction.
    this.tx.signInputs();

    // Build.
    this.tx.build();

    // Call ready callback.
    this.tx.onReady();
  }
};

module.exports = Vault;
