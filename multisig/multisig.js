"use strict";

(function() {
  // Dependencies.
  var Bitcoin = require('bitcoinjs-lib');
  var Buffer = require('buffer');

  // Namespace.
  var Multisig = {
    // Defaults.
    M: 2,
    MINIMUM_MINER_FEE: 20000,
    BITCOIN_SATOSHIS: 100000000
  };

  Multisig.btcToSatoshis = function(btc) { return Math.floor(parseFloat(btc) * Multisig.BITCOIN_SATOSHIS); }
  Multisig.satoshisToBtc = function(satoshis) { return (parseInt(satoshis) / Multisig.BITCOIN_SATOSHIS).toFixed(8); }

  /***
  Address view renderer */
  Multisig.AddressView = function(options) {
    this.container = options.container;
    this.$container = $(options.container);
  }
  Multisig.AddressView.prototype = {
    addressDomId: function(index) {
      return "address_balance_" + index;
    },
    addressRow: function(address) {
      var balance = Multisig.satoshisToBtc(address.balance);
      var klass = ""
      if (address.balance == 0) { klass = "empty" }
      return "<tr id='"+ this.addressDomId(address.index) +"' class='"+ klass +"'><td><code>m/"+ address.index +"</code></td><td><code>"+ address.address +"</code></td><td>"+ balance +"</td></tr>";
    },
    renderAddress: function(address) {
      var that = this;
      this.$container.find('tbody').append(this.addressRow(address));
    },
    render: function(multisig) {
      var that = this;
      this.$container.find('.balance_btc').text(Multisig.satoshisToBtc(multisig.totalBalance));
      $.each(multisig.addresses, function(i, a) { that.renderAddress(a) });
    }
  }

  /***
  BIP38 worker */
  Multisig.Bip38Worker = function(options) {
    this.worker = new Worker('multisig/bip38.js');
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
  Multisig.Bip38Worker.prototype = {
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

  /***
  Address */
  Multisig.Address = function(index, pubkeys) {
    this.balance = 0;
    this.index = index;
    this.unspentOutputs = [];

    // Uncompress the pubkeys.
    this.pubkeys = pubkeys.map(function(pubKey) {
      return new Bitcoin.ECPubKey(pubKey.Q, false);
    }).sort(this.comparePubKeys); // And sort them by their hex values.

    // Generate the redeemScript.
    this.redeemScript = Bitcoin.scripts.multisigOutput(Multisig.M, this.pubkeys); // M of N;

    // Generate the multisig address for this redeem script.
    var scriptPubKey = Bitcoin.scripts.scriptHashOutput(this.redeemScript.getHash());
    this.address = Bitcoin.Address.fromOutputScript(scriptPubKey).toString();
  }
  Multisig.Address.prototype = {
    getPrvKey: function(node) {
      return node.derive(this.index).privKey;
    },
    comparePubKeys: function(a, b) {
      if (a.toHex() < b.toHex()) return -1;
      if (b.toHex() < a.toHex()) return 1;
      return 0;
    },
    setUnspentOutputs: function(unspent) {
      this.unspentOutputs = unspent.map(function(output) {
        return {
          hash: output.tx,
          index: output.n,
          amount: Multisig.btcToSatoshis(output.amount),
          script: Bitcoin.Script.fromHex(output.script)
        }
      });
      this.balance = this.unspentOutputs.reduce(function(total, output) {
        return total += output.amount;
      }, 0.0);
    }
  }

  /***
  Transaction builder */
  Multisig.Transaction = function(options) {
    // Set the miner fee.
    if (options.minerFee) {
      this.minerFee = Multisig.btcToSatoshis(options.minerFee);
    }
    if (!this.minerFee || isNaN(this.minerFee)) {
      this.minerFee = Multisig.MINIMUM_MINER_FEE;
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
  Multisig.Transaction.prototype = {
    getMinerFee: function() {
      return Multisig.satoshisToBtc(this.minerFee);
    },
    getDestinationAmount: function() {
      return Multisig.satoshisToBtc(this.destinationAmount);
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

  /***
  Main app */
  Multisig.App = function(options) {
    // Settings.
    this.xpubkeys = options.xpubkeys;
    this.lastAddressIndex = options.lastAddressIndex;
    this.onReady = options.onReady;

    this.addresses = this.getAddresses();
    this.getUnspentOutputs();
  }
  Multisig.App.prototype = {
    getMinimumFee: function() { return Multisig.satoshisToBtc(Multisig.MINIMUM_MINER_FEE); },
    setUnspentOutputsForAddress: function(address, unspent) {
      for (var x = 0; x < this.addresses.length; x++) {
        if (this.addresses[x].address == address) {
          this.addresses[x].setUnspentOutputs(unspent);
        }
      }
    },
    getAddresses: function() {
      var addresses = [];

      // Generate the master HD nodes with the xpubkeys.
      var masterNodes = this.xpubkeys.map(function(xpubkey) {
        return Bitcoin.HDNode.fromBase58(xpubkey);
      })

      // Generate the multisig addresses up to the last index specified.
      for (var index = 0; index <= this.lastAddressIndex; index++) {
        var pubkeysForIndex = masterNodes.map(function(node) { return node.derive(index).pubKey; });
        addresses.push(new Multisig.Address(index, pubkeysForIndex));
      }

      return addresses;
    },
    getUnspentOutputs: function(callback) {
      var that = this;
      var addresses = this.addresses.map(function(address) { return address.address} ).join(",");
      var url = "http://btc.blockr.io/api/v1/address/unspent/";
      url += addresses;
      url += "?multisigs=1";

      $.ajax({
        type: "GET",
        url: url,
        dataType: "json",
        success: function(response) {
          if (response.data.length < 1) return -1;

          $.each(response.data, function(i, address) {
            if (address.unspent.length == 0) return;
            that.setUnspentOutputsForAddress(address.address, address.unspent);
          })

          // Set total balance.
          that.totalBalance = that.addresses.reduce(function(total, address) { return total += address.balance; }, 0.0);

          // We're ready now, so call the callback.
          that.onReady();
        },
        error: function() {
          console.log("Failed to fetch unspents outputs for " + this.address);
        }
      });
    },
    buildTransaction: function(options) {
      this.tx = new Multisig.Transaction({
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
      var worker = new Multisig.Bip38Worker({
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

  // Export just the app and the view.
  window.Multisig = {
    AddressView: Multisig.AddressView,
    App: Multisig.App
  };
})()
