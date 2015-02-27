"use strict";

// Dependencies.
var Bitcoin = require('bitcoinjs-lib');
var Buffer = require('buffer');
var constants = require('./constants');
var utils = require('./utils')

/***
Transaction builder */
var Transaction = function(options) {
  // Set the miner fee.
  if (options.minerFee) {
    this.minerFee = utils.btcToSatoshis(options.minerFee);
  }
  if (!this.minerFee || isNaN(this.minerFee)) {
    this.minerFee = constants.MINIMUM_MINER_FEE;
  }

  // Set configuration.
  this.destinationAddress = options.destinationAddress;
  this.destinationAmount = -this.minerFee; // Start off with the miner fee already deducted.
  this.addresses = options.addresses; // All the addresses that we'll sweep.
  this.seeds = options.seeds; // Seeds for the user/shared HD wallet that will enable signing.

  // Prepare the transaction builder.
  this.tb = new Bitcoin.TransactionBuilder();
  this.inputAddresses = [];
}
Transaction.prototype = {
  getMinerFee: function() {
    return utils.satoshisToBtc(this.minerFee);
  },
  getDestinationAmount: function() {
    return utils.satoshisToBtc(this.destinationAmount);
  },
  build: function() {
    this.transaction = this.tb.build();
  },
  addInputs: function() {
    var that = this;
    $.each(this.addresses, function(i, address) {
      if (address.unspentOutputs.length == 0) return;
      $.each(address.unspentOutputs, function(i, output) {
        that.tb.addInput(output.hash, output.index, 0, output.script);
        that.inputAddresses.push(address);
        that.destinationAmount += output.amount;
      })
    })
  },
  addOutput: function() {
    this.tb.addOutput(this.destinationAddress, this.destinationAmount);
  },
  generateHdWallet: function(seed_or_xprvkey) {
    // Dealing with a seed.
    if (seed_or_xprvkey.match(/^(L|K)[a-zA-Z0-9]*$/)) {
      var key = Bitcoin.ECKey.fromWIF(seed_or_xprvkey);
      return Bitcoin.HDNode.fromSeedBuffer(key.d.toBuffer());
    }

    // Dealing with a extended private key.
    if (seed_or_xprvkey.match(/^xprv[a-zA-Z0-9]*$/)) {
      return Bitcoin.HDNode.fromBase58(seed_or_xprvkey);
    }

    return false;
  },
  signInputs: function() {
    var that = this;

    // Generate the HD wallets.
    this.hdWallets = [
      this.generateHdWallet(this.seeds.shared),
      this.generateHdWallet(this.seeds.user)
    ];

    // Generate a random thing to sign.
    var hash = new Buffer.Buffer(32);
    window.crypto.getRandomValues(hash);

    $.each(this.inputAddresses, function(address_index, address) {
      // The signatures need to be in the same order as the
      // public keys were when creating the P2SH address.
      $.each(address.pubkeys, function(pubkey_index, pubkey) {
        $.each(that.hdWallets, function(hd_index, hd) {
          // Get the private key for this address.
          var prvkey = address.getPrvKey(hd);

          // Sign the random hash to see if the current private key corresponds to the current public key.
          var sig = prvkey.sign(hash);
          if (!pubkey.verify(hash, sig)) return;

          // If it does, to the actual signing.
          that.tb.sign(address_index, prvkey, address.redeemScript);
        })
      })
    })
  }
}


module.exports = Transaction;
