"use strict";

var utils = require('../utils');

var AddressView = function(address) {
  this.address = address;
  this.$el = $('<tr id="' + this.domId() + '">');
  this.address.generate().done(function() { this.render() }.bind(this));
  this.address.getUnspentOutputs().done(function() { this.render() }.bind(this));
}
AddressView.prototype = {
  balance: function() {
    if (this.address.failed) {
      return 'Failed!';
    }

    if (!this.address.fetched) {
      return 'Loading...';
    }

    return utils.satoshisToBtc(this.address.balance)
  },
  bitcoin_address: function() {
    if (!this.address.address) {
      return 'Generating...';
    }

    return this.address.address;
  },
  domId: function() { return "address_balance_" + this.address.index },
  render: function() {
    var klass = ""
    if ( this.address.balance == 0 ) klass = "empty";
    if ( this.address.failed ) klass = "error";
    this.$el.attr('class', klass);

    this.$el.html(
      "<td>"                                        +
        "<code>m/" + this.address.index + "</code>" +
      "</td>"                                       +
      "<td>"                                        +
        "<code>" + this.bitcoin_address() + "</code>" +
      "</td>"                                       +
      "<td><code>" + this.balance() + "</code></td>"
    );

    return this;
  }
}

module.exports = AddressView;
