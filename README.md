Coinbase Multisig Vault recovery tool
============================

You can use this open source tool to send all the coins from your Coinbase Multisig Vault to any bitcoin address you choose.

In order to do this you will need the data from your vault backup that you either printed out or saved somewhere.

http://coinbase.github.io/multisig-tool

## Usage

### Required input

To complete this recovery process, you will need the following information:

* 3 extended public keys (xpubkeys)
* User seed
* Shared encrypted seed
* Your vault password

### Online/Offline

Internet connection is only required in **Step 1**, where you input the public keys, so that we can fetch the unspent outputs from your vault addresses.

Before inputting your keys in **Step 2** and signing the transaction you can safely go _offline_.

In **Step 3** you will get a signed transaction in raw hex form.

You can then copy this transaction and verify it with [Bitcoin Core](https://bitcoin.org/en/download) and `decoderawtransaction` or using an online tool like [Coinb.in](http://coinb.in/multisig/#verify).

After verifying you then broadcast it using [Bitcoin Core](https://bitcoin.org/en/download) and `sendrawtransaction` or any other API or client that supports broadcasting transactions into the Bitcoin network.

### Running

You can download this tool and run it locally or use our hosted version at http://coinbase.github.io/multisig-tool.

#### Running locally

If you wish to run the tool locally, you need to do it through a local web server. This is because we use Web Workers for decrypting your BIP38 encrypted shared key seed, and Web Workers are not permitted to run through the `file:///` protocol.

_Protip™_: If you use Ruby, you can spin up a web server in the current directory with this one-liner:

    gem install thin; ruby -rrack -e "include Rack; Handler::Thin.run Builder.new { run Directory.new '' }"

One alternative is to run Chrome with the `--allow-access-from-files` parameter.

## Development

This tool was designed to have a minimal code foot print so it could be easily auditable.

All the domain specific crypto is done in the various files in [`lib/multisig`](https://github.com/coinbase/multisig-tool/tree/master/lib/multisig).

These files are compiled using [Browserify](http://browserify.org/) into [`multisig.js`](https://github.com/coinbase/multisig-tool/blob/master/multisig.js) with:

    cd lib/multisig; browserify -r ./vault -r ./views/addresses_view > ../../multisig.js

Everything else is either UI code or dependency libraries.

## Dependencies

### BitcoinJS

We use the [BitcoinJS](https://github.com/bitcoinjs/bitcoinjs-lib) library to handle HD wallets, Bitcoin keys, addresses and transactions.

### BIP38

We use the [BIP38](https://github.com/cryptocoinjs/bip38) library to decrypt the encrypted shared key seeds.

To build the [`multisig/bip38.js`](https://github.com/coinbase/multisig-tool/blob/master/lib/multisig/bip38.js) we used:

1. Install packages with `npm`:

    `npm install bip38 crypto-browserify --save`

2. Use `browserify` to resolve dependencies:

    `browserify -r bip38 -s Bip38 > lib/multisig/bip38.js`

Then we [amend](https://github.com/coinbase/multisig-tool/commit/f8bbcb87ec50dc9414ca10e18c9fc0a8f4737322) the `lib/multisig/bip38.js` to support progress callbacks and Web Worker messages handling.

We need this as a separate file, because we're using it with web workers.

## Improvements missing

1. There is currently no error checking whatsoever. That means the tool won't let you know if something is wrong with your input or with anything else. It will just silently stop working.

2. There is also currently no support for **group vaults**.

We plan to tackle those issues soon, but we do accept community contributions as well. So if you have a solution for some of these, please submit a pull request!
