// A last.fm nowplaying plugin.
// Author: thevdude (rb.cubed@gmail.com)
//
// npm install lastfm in the plugins folder before using this.

var LastFmNode = require('lastfm').LastFmNode;
var lastfm = new LastFmNode({
  api_key: 'your API key',
  secret: 'your secret',
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

  var request = lastfm.request("user.getRecentTracks", {
    user: lfmuser,
    handlers: {
      success: function(data) {
        var trck = data.recenttracks.track[0];
        var msg = '';
        // Checks if track is Now Playing
        if('@attr' in trck){
          if('nowplaying' in trck['@attr'] && trck['@attr'].nowplaying == 'true'){
            msg = lfmuser + ' is now playing: ' + trck.artist['#text'] + ' - ' + trck.name;
          } 
        }
        //Otherwise, last played
        else {
            msg = lfmuser + ' last played: ' + trck.artist['#text'] + ' - ' + trck.name;
        }
        //If album name is there, add that in too
        if(trck.album['#text'] != ''){
          msg = msg + ' from the album ' + trck.album['#text'];
        }
        //Have the bot say it.
        irc.privmsg(act.source, msg);        
      },
      error: function(error) {
        console.log(error);
      }
    }
  });
};

exports.name = 'np';
exports.handler = np_handler;
