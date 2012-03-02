// A little website checking plugin for IRC Node.
// Author: thevdude (rb.cubed@gmail.com)
//
// Hits isup.me to check if a website is down or not.

var http = require('http');
var irc = global.irc;

var isup_handler = function (act) {

  if (act.params.length === 0) {
    irc.privmsg(act.source, 'Gimme a URL to check');
  }

  else {
    var options = {
      host: 'www.isup.me',
      port: 80,
      path: '/' + act.params
    };

    var req = http.request(options, function (res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        if (chunk.indexOf('It\'s just you') !== -1) {
          irc.privmsg(act.source, 'It\'s up! http://' + act.params);
        } else {
          irc.privmsg(act.source, 'It\'s down!');
        }
      });
    });

    req.on('error', function (e) {
      console.log('error: ' + e.message);
    });

    req.end();
  }

};

exports.name = 'isup';
exports.handler = isup_handler;
