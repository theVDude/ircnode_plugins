// A last.fm nowplaying plugin.
// Author: thevdude (rb.cubed@gmail.com)
//
// `npm install lastfm && npm install inflection` in the plugins folder before using this.

var LastFmNode = require('lastfm').LastFmNode;
var inflection = require('inflection');
var lastfm = new LastFmNode({
  api_key: 'your API key',
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
              console.log(trck);
              console.log(moredata);
              var msg = '';
              // Checks if track is Now Playing
              if ('@attr' in trck) {
                if ('nowplaying' in trck['@attr'] && trck['@attr'].nowplaying === 'true') {
                  msg = lfmuser + ' is now playing "' + trck.name + '" by ' + trck.artist['#text'];
                }
              }
              //Otherwise, last played
              else {
                msg = lfmuser + ' last played "' + trck.name + '" by ' + trck.artist['#text'];
              }
              //If album name is there, add that in too
              if (trck.album['#text'] !== '') {
                msg = msg + ' -- from the album ' + trck.album['#text'] + ' -- ';
              }
              var usrcnt = parseInt(trckinfo.userplaycount, 10) + 1;
              msg = msg + 'for the ' + inflection.ordinalize(usrcnt.toString()) + ' time.';
              //Have the bot say it.
              irc.privmsg(act.source, msg);
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

exports.name = 'np';
exports.handler = np_handler;
