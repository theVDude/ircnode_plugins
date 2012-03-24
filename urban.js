// A little website checking plugin for IRC Node.
// Author: thevdude (rb.cubed@gmail.com)
//
// Hits isup.me to check if a website is down or not.

var http = require('http');
var Bitly = require('bitly');
var bitly = new Bitly('thevdude', 'R_b2b2c9abaa53f8affbf10a061671f101');
var irc = global.irc;

var ud_handler = function (act) {
  if (act.params.length === 0) {
    irc.privmsg(act.source, 'Gimme a URL to check');
  }

  else {
    var num = 0;
    var page = 0;
    var listnum = 0;
    var search = '';
    var n = parseInt(act.params[act.params.length - 1], 10);
    if (isNaN(n)) {
      num = 1;
      search = act.params.join(' ');
    } else {
      num = n;
      search = act.params.slice(0, -1).join(' ');
    }
    page = (Math.floor((num - 1) / 10)) + 1;
    listnum = (num - 1) % 10;
    var options = {
      host: 'www.urbandictionary.com',
      port: 80,
      path: '/iphone/search/define?term=' + encodeURIComponent(search) + '&page=' + page
    };

    var req = http.request(options, function (res) {
      var json = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        json += chunk;
      });
      res.on('end', function () {
        var obj = JSON.parse(json.replace(/\\r\\n/g , ' '));
        if (obj.result_type === 'exact'){
          var def = obj.list[listnum].definition;
          var exm = obj.list[listnum].example;
          if (def.length > 274) { def = def.substr(0, 275) + '...'; }
          if (exm.length > 99) { exm = exm.substr(0, 100) + '...'; }
          console.log(obj);
          bitly.shorten(obj.list[listnum].permalink, function (err, response) {
            if (err) { console.log(err); }
            if (response.data.url !== undefined) {
              irc.privmsg(act.source, '\u0002' + search + '(' + num + '/' + obj.total + ')\u000F: ' + def + ' \u001F' + exm + '\u000F :: ' + response.data.url);
            }
          });
        } else {
          irc.privmsg(act.source, '\u0002' + search + '\u000F not found.');
        }
      });
    });

    req.on('error', function (e) {
      console.log('error: ' + e.message);
    });

    req.end();
  }

};

exports.name = ['ud'];
exports.handler = [ud_handler];
