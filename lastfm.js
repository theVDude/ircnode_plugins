// A last.fm nowplaying plugin.
// Author: thevdude (rb.cubed@gmail.com)
//
// `npm install lastfm && npm install inflection` in the plugins folder before using this.

var LastFmNode = require('lastfm').LastFmNode;
var inflection = require('inflection');
var Bitly = require('bitly');
var bitly = new Bitly('your bitly username', 'your bitly apikey');
var lastfm = new LastFmNode({
  api_key: 'your last.fm API key',
  secret: 'your last.fm secret',
  useragent: 'appname/#.# MyApp',
});
var irc = global.irc;

var np_handler = function (act) {
  var lfmuser = '';
  if (act.params.length === 0) {
    lfmuser = act.nick;
  } else {
    lfmuser = act.params;
  }

  var trckreq = lastfm.request("user.getRecentTracks", {
    user: lfmuser,
    handlers: {
      success: function (npdata) {
        var trck = npdata.recenttracks.track[0];
        var trckinforeq = lastfm.request("track.getInfo", {
          username: lfmuser,
          track: trck.name,
          artist: trck.artist['#text'],
          handlers: {
            success: function (moredata) {
              var trckinfo = moredata.track;
              var msg = '';
              // Checks if track is Now Playing
              if ('@attr' in trck) {
                if ('nowplaying' in trck['@attr'] && trck['@attr'].nowplaying === 'true') {
                  msg = lfmuser + ' is now playing';
                }
              }
              //Otherwise, last played
              else {
                msg = lfmuser + ' last played';
              }
              //Check if it's a loved track
              if (trckinfo.userloved === '1') {
                msg = msg + ' a loved track,';
              }
              msg = msg + ' "' + trck.name + '" by ' + trck.artist['#text'];
              //If album name is there, add that in too
              if (trck.album['#text'] !== '') {
                msg = msg + ' -- from the album "' + trck.album['#text'] + '" --';
              }
              var usrcnt = trckinfo.userplaycount;
              if (usrcnt !== undefined) {
                usrcnt = parseInt(usrcnt, 10) + 1;
              } else {
                usrcnt = 1;
              }
              msg = msg + ' for the ' + inflection.ordinalize(usrcnt.toString()) + ' time.';
              //Have the bot say it.
              irc.privmsg(act.source, msg);
              
              msg = '';
              //Get `listener`s and `playcount`, calculate `ratio`, and add it to `msg`
              var listeners = parseInt(trckinfo.listeners, 10);
              var playcount = parseInt(trckinfo.playcount, 10);
              var ratio = playcount / listeners;
              msg = playcount + ' plays by ' + listeners + ' listeners (' + ratio.toFixed(2) + ':1) ::';
              //If there are no tags, add that to `msg`
              if (trckinfo.toptags === '\n      ') {
                msg = msg + ' No Tags.';
              }
              //If there ARE tags, add the first 4 to `tags[]` and join them with ', ' and add them to `msg`
              else {
                var tags = [];
                msg = msg + ' Top Tags - ';
                for (var e in trckinfo.toptags.tag) {
                  if (e < 4) {
                    tags[e] = trckinfo.toptags.tag[e].name;
                  }
                }
                msg = msg + tags.join(', ');
              }
              if (trck.streamable === '1') {
                bitly.shorten(trck.url, function (err, response) {
                  if (err) throw err;
                  msg = msg + ' :: Stream it at ' + response.data.url;
                  irc.privmsg(act.source, msg);
                });
              } else {
                irc.privmsg(act.source, msg);
              }
            },
            error: function (error) {
              console.log(error);
            }
          }
        });
      },
      error: function (error) {
        console.log(error);
      }
    }
  });
};
var topten_handler = function (act) {
  var lfmuser = '';
  if (act.params.length === 0) {
    lfmuser = act.nick;
  } else {
    lfmuser = act.params;
  }
  var inforeq = lastfm.request("user.getTopArtists", {
    user: lfmuser,
    handlers: {
      success: function (usrinfo) {
        var toparts = [];
        for (var i in usrinfo.topartists.artist) {
          if (i < 10) {
            toparts[i] = usrinfo.topartists.artist[i].name + '(' + usrinfo.topartists.artist[i].playcount + ')';
          }
        }
        irc.privmsg(act.source, lfmuser + '\'s top artists: ' + toparts.join(', '));
      }
    }
  });
};

exports.name = ['np', 'topten'];
exports.handler = [np_handler, topten_handler];
