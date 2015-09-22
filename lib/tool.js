"use strict";

$(function() {
  var cleanInput = function(str) {
    return str.replace(/\W/g, '');
  }
  var proceed = function(button, next_step_id) {
    $(button).parents('footer').hide();
    $(next_step_id).show();
  }

  // Load modules.
  var AddressesView = require('./views/addresses_view');
  var Vault = require('./vault');

  // Replace the addresses table body with the addresses view.
  var addressesView = new AddressesView();
  $('#addresses').find('tbody').replaceWith(addressesView.render().$el);

  // Parse query string and prepopulate.
  var query = window.location.search.substring(1);
  if (query.length != 0) {
    var key_to_element = {
      'xpubkey1':            '#xpubkey1',
      'xpubkey2':            '#xpubkey2',
      'xpubkey3':            '#xpubkey3',
      'max_index':           '#max_index',
      'shared_seed':         '#shared_seed',
      'user_seed':           '#user_seed',
      'destination_address': '#destination_address'
    };
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split('=');
      var key = decodeURIComponent(pair[0]);
      var value = decodeURIComponent(pair[1]);
      if (!value) continue;

      // Special case for handling which xpubkey's descendents should be compressed.
      if (key == 'compressed[]') {
        $("#xpubkey" + value + "_compressed").prop('checked', true);
      }

      // Look up the element from the key_to_element table and prefill it with the value.
      $(key_to_element[key]).val(value);
    }
  } else { // no query string, assume Coinbase key is compressed
    $("#xpubkey1_compressed").prop('checked', true);
  }

  // Hide all the steps, then only show step 1.
  $('.step').hide();
  $('#step_1').show();

  $('.step button').on('click', function() {
    $(this).attr('disabled', true).text('Please wait ...')
  });

  // Define the vault variable outside of the click handler functions.
  var vault;

  // Step 1, collect the xpubkeys, construct child addresses and fetch their unspent outputs.
  $('#step_1 button').on('click', function() {
    var lastAddressIndex = $('.max_index input').val();
    var xpubkeys = [];
    $('.xpubkey').each(function(i, xpub) {
      xpubkeys.push([
        cleanInput($(xpub).val()),
        $("#"+$(xpub).attr('id')+'_compressed').is(':checked')
      ]);
    });

    // Build up the main Vault object.
    vault = new Vault({
      xpubkeys: xpubkeys,
      lastAddressIndex: parseInt(lastAddressIndex),
      view: addressesView
    });
    vault.initialize().done(function() {
      proceed(this, '#step_2');
    }.bind(this));

    // Set the default fees.
    $('.miner_fee').val(vault.getMinimumFee());
  })

  // Step 2, collect the shared and user key, decrypt shared key, build transaction and sign it.
  $('#step_2 button').on('click', function() {
    var button = this;
    var percent = 0;

    vault.buildTransaction({
      minerFee: $('.miner_fee').val(),
      destinationAddress: $('.destination_address input').val(),
      seeds: {
        shared: cleanInput($('.shared .key').val()),
        shared_password: $('.shared .password').val(),
        user: cleanInput($('.user .key').val())
      },
      // BIP38 decryption progress method.
      onProgress: function(percent) {
        var cur_percent = Math.ceil(percent);
        if (cur_percent == percent) return;
        if (cur_percent > 0) $('.decrypt_progress').show();
        else if (cur_percent == 100) $('.decrypt_progress').hide();
        percent = cur_percent;
        $('#decrypt_percent').text(percent);
      },
      onReady: function() {
        $('.fees_btc').text(vault.tx.getMinerFee());
        $('.total_btc').text(vault.tx.getDestinationAmount());
        $('.raw code').text(vault.tx.transaction.toHex());
        proceed(button, '#step_3');
      }
    })
  })
})
