"use strict";

var constants = require('../constants');
var utils = require('../utils');
var AddressView = require('./address_view');

var AddressesView = function(options) {
  this.$el = $('<tbody>');
  this.addresses = [];
}
AddressesView.prototype = {
  createAddressView: function(address) {
    address.view = new AddressView(address);
    this.addresses.push(address.view);
    this.renderAddress(address.view);

    if (constants.DEBUG) console.log('Creating address view', address);

    return address.view;
  },
  renderAddress: function(addressView) {
    this.$el.append(addressView.render().$el);
    return this;
  },
  updateBalance: function(which, amount) {
    if (constants.DEBUG) console.log('Updating address view balance', which, 'amount', amount);
    var $balance = $('#addresses .' + which + ' .balance_btc');
    $balance.text(utils.satoshisToBtc(amount));
  },
  render: function(multisig) {
    this.$el.html();

    $.each(this.addresses, function(i, a) {
      this.renderAddress(a);
    }.bind(this));

    return this;
  }
}

module.exports = AddressesView;
