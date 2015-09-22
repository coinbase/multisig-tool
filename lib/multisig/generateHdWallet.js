"use strict";

// Dependencies.
var Bitcoin = require('bitcoinjs-lib');

module.exports = function(seed_or_xprvkey) {
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
};
