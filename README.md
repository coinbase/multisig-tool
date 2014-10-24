Coinbase Vault recovery tool
============================

You can use this open source tool to send all the coins from your Coinbase Multisig Vault to any bitcoin address you choose.

In order to do this you will need the data from your vault backup that you either printed out or saved somewhere.

http://coinbase.github.io/multisig-tool

## Usage

### Required input

To complete this recovery process, you will need the following information:

* 3 extended public keys (xpubkeys)
* User key's seed or xprvkey
* Shared key's encrypted seed
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

Protip: If you use Ruby, you can spin up a web server in the current directory with this one-liner:

    gem install thin; ruby -rrack -e "include Rack; Handler::Thin.run Builder.new { run Directory.new '' }"

One alternative is to run Chrome with the `--allow-access-from-files` parameter.

## Development

This tool was designed to have a minimal code foot print so it could be easily auditable by the security consicous.

All the domain specific crypto is done in [`multisig.js`](https://github.com/coinbase/multisig-tool/blob/master/multisig/multisig.js).

Everything else is either UI code or dependency libraries.

## Dependencies

We use the [BitcoinJS](https://github.com/bitcoinjs/bitcoinjs-lib) library to handle HD wallets, Bitcoin keys, addresses and transactions.

We used this command to build the [`lib/bitcoinjs.js`](https://github.com/coinbase/multisig-tool/blob/master/lib/bitcoinjs.js):

1. Install packages with `npm`:

    `npm install bitcoinjs-lib --save`

2. Use `browserify` to resolve dependencies:

    `browserify -r bitcoinjs-lib -r buffer > lib/bitcoinjs.js`

We use the [BIP38](https://github.com/cryptocoinjs/bip38) library to decrypt the encrypted shared key seeds.

To build the [`multisig/bip38.js`](https://github.com/coinbase/multisig-tool/blob/master/multisig/bip38.js) we used:

1. Install packages with `npm`:

    `npm install bip38 crypto-browserify --save`

2. Use `browserify` to resolve dependencies:

    `browserify -r bip38 -s Bip38 > multisig/bip38.js`

Then we [amend](https://github.com/coinbase/multisig-tool/commit/f8bbcb87ec50dc9414ca10e18c9fc0a8f4737322) the `multisig/bip38.js` to support progress callbacks and Web Worker messages handling.
