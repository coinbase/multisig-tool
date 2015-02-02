"use strict";

var utils = require('../utils');

var AddressView = function(address) {
  this.address = address;
  this.$el = $('<tr id="' + this.domId() + '">');
  this.address.generate().done(function() { this.render() }.bind(this));
  this.address.getUnspentOutputs().done(function() { this.render() }.bind(this));
}
AddressView.prototype = {
  balance: function() { return utils.satoshisToBtc(this.address.balance) },
  domId: function() { return "address_balance_" + this.address.index },
  render: function() {
    var klass = ""
    if ( this.address.balance == 0 ) klass = "empty";
    this.$el.attr('class', klass);

    this.$el.html(
      "<td>"                                        +
        "<code>m/" + this.address.index + "</code>" +
      "</td>"                                       +
      "<td>"                                        +
        "<code>" + this.address.address + "</code>" +
      "</td>"                                       +
      "<td>" + this.balance() + "</td>"
    );

    return this;
  }
}

module.exports = AddressView;
