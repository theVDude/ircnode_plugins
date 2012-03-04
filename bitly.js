// A url shortening plugin.
// Author: thevdude (rb.cubed@gmail.com)
//
// `npm install bitly` in the plugins folder before using this.

var Bitly = require('bitly');
var bitly = new Bitly('bitly username', 'bitly api key');
var irc = global.irc;

var bitly_handler = function (act) {
  if (act.params.length === 0) {
    irc.privmsg(act.source, 'no url to shorten');
  } else {
    bitly.shorten(act.params, function (err, response) {
      if (err) throw err;
      irc.privmsg(act.source, 'Shortened url: ' + response.data.url);
    });
  }
};

exports.name = 'bitly';
exports.handler = bitly_handler;
