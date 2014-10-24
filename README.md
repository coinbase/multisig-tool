Coinbase Vault recovery tool
============================

You can use this open source tool to send all the coins from your Coinbase Multisig Vault to any address you choose, contingent upon having the shared and user keys and password.

All the data you need for this process is on the paper backup that you printed out or in the data that was offered for copy pasting when you created the vault.

The gist of what you need:

* 3 extended public keys (xpubkeys)
* the shared key
* the password for the shared key (your vault password)
* the user key

You can run this file locally or use our hosted version at http://coinbase.github.io/multisig-tool.

If you run the file locally, it should be either through a local web server, otherwise the Web Worker for BIP38 decryption won't work.

The alternative is to run Chrome with the `--allow-access-from-files` parameter.

## Dependencies used

We use the `bitcoinjs-lib` library to handle HD wallets, keys, addresses and transactions.

We used this command to build the `bitcoinjs-lib`:

1. Install packages with `npm`:

    `npm install bitcoinjs-lib --save`

2. Use `browserify` to resolve dependencies:

    `browserify -r bitcoinjs-lib -r buffer > lib/bitcoinjs.js`

We use the BIP38 library to decrypt the encrypted shared key seeds.

1. Install packages with `npm`:

    `npm install bip38 crypto-browserify --save`

2. Use `browserify` to resolve dependencies:

    `browserify -r bip38 -s Bip38 > multisig/bip38.js`

Then we [amend](https://github.com/coinbase/multisig-tool/commit/f8bbcb87ec50dc9414ca10e18c9fc0a8f4737322) the BIP38 library with progress callbacks and Web Worker messages handling.

## Offline use

This tool can run completely offline, after you've completed Step 1 (fetching addresses and unspent outputs).
