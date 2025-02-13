Coinbase Multisig Vault recovery tool (DEPRECATED)
============================

THIS TOOL HAS BEEN DEPRECATED, IT IS UNMAINTAINED AND IS PROVIDED AS-IS, SOLELY FOR INFORMATIONAL AND HISTORICAL PURPOSES.

This open source tool was created to assist Coinbase Multisig Vault users with recovery of their self-custodial backup keys. The following is a historical description of how the tool worked. If you modify, compile, or otherwise use the tool or its underlying code, you agree that you are doing so solely at your own risk. Coinbase has no access to any Multisig keys associated with Multisig Vault, and cannot assist with key or asset recovery.

---------------------------------------

## Usage

### Required input

To complete the recovery process, you will need the following information:

* 3 extended public keys (xpubkeys)
* User seed
* Shared encrypted seed
* Your vault password (it is strongly recommended that you never share your password with a third-party controlled or online instance).

### Online/Offline

Internet connection is only required in **Step 1**, where you input the public keys, so the tool can fetch the unspent outputs from your vault addresses.

Before inputting your keys in **Step 2** and signing the transaction you can safely go _offline_.

In **Step 3** you will get a signed transaction in raw hex form.

You can then copy this transaction and verify it with [Bitcoin Core](https://bitcoin.org/en/download) and `decoderawtransaction` or using an online tool like [Coinb.in](https://coinb.in/multisig/#verify).

After verifying you then broadcast it using [Bitcoin Core](https://bitcoin.org/en/download) and `sendrawtransaction` or any other API or client that supports broadcasting transactions into the Bitcoin network.

### Running

Download this tool and run it locally. You will need to do it through a local web server. The easiest way to do that is by running:

    make run

The tool uses Web Workers for decrypting your BIP38 encrypted shared key seed, and Web Workers are not permitted to run through the `file:///` protocol.

Another alternative is to run Chrome with the `--allow-access-from-files` parameter.

## Development

This tool was designed to have a minimal code foot print so it could be easily auditable.

All the domain specific crypto is done in the various files in [`lib/multisig`](https://github.com/coinbase/multisig-tool/tree/master/lib/multisig).

These files are compiled using [Browserify](http://browserify.org/) into [`multisig.js`](https://github.com/coinbase/multisig-tool/blob/master/multisig.js) with:

    make compile

Everything else is either [UI code](https://github.com/coinbase/multisig-tool/blob/master/lib/tool.js) or dependency libraries.

## Dependencies

### BitcoinJS

The [BitcoinJS](https://github.com/bitcoinjs/bitcoinjs-lib) library is used to handle HD wallets, Bitcoin keys, addresses and transactions.

### BIP38

The [BIP38](https://github.com/cryptocoinjs/bip38) library is used to decrypt the encrypted shared key seeds.

To build the [`multisig/bip38.js`](https://github.com/coinbase/multisig-tool/blob/master/lib/multisig/bip38.js), the following are used:

1. Install packages with `npm`:

    `npm install bip38 crypto-browserify --save`

2. Use `browserify` to resolve dependencies:

    `browserify -r bip38 -s Bip38 > lib/multisig/bip38.js`

Then [amend](https://github.com/coinbase/multisig-tool/commit/f8bbcb87ec50dc9414ca10e18c9fc0a8f4737322) is used on `lib/multisig/bip38.js` to support progress callbacks and Web Worker messages handling.

This must be a separate file, as it is used with with Web Workers.

## Caveats

1. There is no error checking whatsoever. That means the tool won't let you know if something is wrong with your input or with anything else. It will just silently stop working.

2. There is also no support for **group vaults**.
