// A last.fm nowplaying plugin.
// Author: thevdude (rb.cubed@gmail.com)
//
// `npm install lastfm && npm install inflection` in the plugins folder before using this.

var mongoose = require('mongoose'),
  db = mongoose.connect('mongodb://localhost/lastfm'),
  Schema = mongoose.Schema,
  User = new Schema({
    nick: String,
    hmask: String,
    lastfm: String
  }),
  Love = new Schema({
    nick: String,
    hmask: String,
    lastfm: String,
    token: String
  });
var LoveModel = mongoose.model('Love', Love);
var UserModel = mongoose.model('User', User);
var LastFmNode = require('lastfm').LastFmNode;
var inflection = require('inflection');
var Bitly = require('bitly');
var bitly = new Bitly('bitly username', 'bitly api_key');
var lastfm = new LastFmNode({
  api_key: 'lastfm api_key',
  secret: 'lastfm secret',
  useragent: 'thebotdudenp/0.1 NP',
});
var irc = global.irc;

function unlove(lfm, tkn, act) {
  var authreq = lastfm.request('auth.getmobilesession', {
    username: lfm,
    authToken: tkn,
    handlers: {
      success: function (sesskey) {
        var trckreq = lastfm.request('user.getRecentTracks', {
          user: lfm,
          handlers: {
            success: function (trck) {
              var loveit = lastfm.request('track.unlove', {
                track: trck.recenttracks.track[0].name,
                artist: trck.recenttracks.track[0].artist['#text'],
                sk: sesskey.session.key,
                handlers: {
                  success: function (a) {
                    irc.privmsg(act.nick, 'unloved "' + trck.recenttracks.track[0].name + '" by ' + trck.recenttracks.track[0].artist['#text']);
                  },
                  error: function (e) {
                    irc.privmsg(act.nick, 'ERROR: ' + e.message);
                  }
                }
              });
            },
            error: function (e) {
              console.log(e);
            }
          }
        });
      },
      error: function (e) {
        console.log(e);
      }
    }
  });
}

var unlove_handler = function (act) {
  LoveModel.findOne({$or: [{ hmask: act.host }, { nick: act.nick.toLowerCase}] }, function (err, luv) {
    if (!luv) {
      irc.privmsg(act.source, 'Not registered for love/unlove, .lovereg [lastfmuser] [token], .token for more help with token.');
    } else {
      unlove(luv.lastfm, luv.token, act);
    }
  });
};

function love(lfm, tkn, act) {
  var authreq = lastfm.request('auth.getmobilesession', {
    username: lfm,
    authToken: tkn,
    handlers: {
      success: function (sesskey) {
        var trckreq = lastfm.request('user.getRecentTracks', {
          user: lfm,
          handlers: {
            success: function (trck) {
              var loveit = lastfm.request('track.love', {
                track: trck.recenttracks.track[0].name,
                artist: trck.recenttracks.track[0].artist['#text'],
                sk: sesskey.session.key,
                handlers: {
                  success: function (a) {
                    irc.privmsg(act.nick, 'loved "' + trck.recenttracks.track[0].name + '" by ' + trck.recenttracks.track[0].artist['#text']);
                  },
                  error: function (e) {
                    irc.privmsg(act.nick, 'ERROR: ' + e.message);
                  }
                }
              });
            },
            error: function (e) {
              console.log(e);
            }
          }
        });
      },
      error: function (e) {
        console.log(e);
      }
    }
  });
}

var love_handler = function (act) {
  LoveModel.findOne({$or: [{ hmask: act.host }, { nick: act.nick.toLowerCase}] }, function (err, luv) {
    if (!luv) {
      irc.privmsg(act.source, 'Not registered for love/unlove, .lovereg [lastfmuser] [token], .token for more help with token.');
    } else {
      love(luv.lastfm, luv.token, act);
    }
  });
};

function np(lfm, nck, act) {
  var lfmuser = lfm;
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
                  msg = nck + ' is now playing';
                }
              }
              //Otherwise, last played
              else {
                msg = nck + ' last played';
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
              if (act.source.indexOf('#') === -1) {
                irc.privmsg(act.params[0], msg);
              } else {
                irc.privmsg(act.source, msg);
              }

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
                if (tags.length > 1) {
                  msg = msg + tags.join(', ');
                } else {
                  msg = msg + trckinfo.toptags.tag.name;
                }
              }
              if (trck.streamable === '1') {
                bitly.shorten(trck.url, function (err, response) {
                  if (err) throw err;
                  msg = msg + ' :: Stream it at ' + response.data.url;
                  if (act.source.indexOf('#') === -1) {
                    irc.privmsg(act.params[0], msg);
                  } else {
                    irc.privmsg(act.source, msg);
                  }
                });
              } else {
                if (act.source.indexOf('#') === -1) {
                  irc.privmsg(act.params[0], msg);
                } else {
                  irc.privmsg(act.source, msg);
                }
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
}

var np_handler = function (act) {
  if (act.params.length === 0 || act.source.indexOf('#') === -1) {
    UserModel.findOne({$or: [{ nick: act.nick.toLowerCase() }, { hmask: act.host }] }, function (err, user) {
      if (!user) {
        np(act.nick, act.nick, act);
      } else {
        np(user.lastfm, act.nick, act);
      }
    });
  } else {
    UserModel.findOne({ nick: act.params[0].toLowerCase() }, function (err, user) {
      if (!user) {
        np(act.params[0], act.params[0], act);
      } else {
        np(user.lastfm, act.params[0], act);
      }
    });
  }
};

function topten(lfm, nck, act) {
  var lfmuser = lfm;
  var periods = ['overall', '7day', '3month', '6month', '12month'];
  if (act.params.length === 2) {
    if (periods.indexOf(act.params[1]) > -1) {
      var inforeq = lastfm.request("user.getTopArtists", {
        user: lfmuser,
        period: act.params[1],
        handlers: {
          success: function (usrinfo) {
            var toparts = [];
            for (var i in usrinfo.topartists.artist) {
              if (i < 10) {
                toparts[i] = usrinfo.topartists.artist[i].name + '(' + usrinfo.topartists.artist[i].playcount + ')';
              }
            }
            irc.privmsg(act.source, nck + '\'s top artists: ' + toparts.join(', '));
          },
          error: function (err) {
            console.log(err);
          }
        }
      });
    } else {
      irc.privmsg(act.source, 'Valid periods are overall, 7day, 3month, 6month, or 12month.');
    }
  } else {
    var inforeq = lastfm.request("user.getTopArtists", {
      user: lfmuser,
      period: act.params[1],
      handlers: {
        success: function (usrinfo) {
          var toparts = [];
          for (var i in usrinfo.topartists.artist) {
            if (i < 10) {
              toparts[i] = usrinfo.topartists.artist[i].name + '(' + usrinfo.topartists.artist[i].playcount + ')';
            }
          }
          irc.privmsg(act.source, nck + '\'s top artists: ' + toparts.join(', '));
        },
        error: function (err) {
          console.log(err);
        }
      }
    });
  }
}

var topten_handler = function (act) {
  if (act.params.length === 0) {
    UserModel.findOne({$or: [{ nick: act.nick.toLowerCase() }, { hmask: act.host }] }, function (err, user) {
      if (!user) {
        topten(act.nick, act.nick, act);
      } else {
        topten(user.lastfm, act.nick, act);
      }
    });
  } else if (act.params[0] === 'help') {
    irc.privmsg(act.source, 'topten <user> <period>: Shows the top ten artists and playcounts for a user for a given time period. If left blank, user is self and time period is overall. :: Valid time periods - overall | 7day | 3month | 6month | 12month');
  } else {
    UserModel.findOne({ nick: act.params[0].toLowerCase() }, function (err, user) {
      if (!user) {
        topten(act.params[0], act.params[0], act);
      } else {
        topten(user.lastfm, act.params[0], act);
      }
    });
  }
};

function cp(lfm2, nck2, lfm1, nck1, act) {
  var cpreq = lastfm.request('tasteometer.compare', {
    type1: 'user',
    type2: 'user',
    value1: lfm1,
    value2: lfm2,
    handlers: {
      success: function (cpinfo) {
        var matches = '';
        var artists = [];
        var percent = Math.round(cpinfo.comparison.result.score * 100);
        var bar = '';
        for (var e in cpinfo.comparison.result.artists.artist) {
          artists[e] = cpinfo.comparison.result.artists.artist[e].name;
        }
        for (var i = 0; i < Math.round(percent / 10); i += 1) {
          bar = bar + '|';
        }
        while (bar.length < 10) {
          bar = bar + '.';
        }
        if (!cpinfo.comparison.result.artists['@attr']) {
          matches = 'No matches!';
        } else if (cpinfo.comparison.result.artists['@attr'].matches === '10') {
          matches = '10 or more matching artists, including ' + artists.join(', ');
        } else {
          matches = cpinfo.comparison.result.artists['@attr'].matches + ' matching artists, including ' + artists.join(', ');
        }
        irc.privmsg(act.source, nck1 + ' and ' + nck2 + ' [' + bar + '] ' + percent + '% :: ' + matches);
      },
      error: function (err) {
        console.log(err);
      }
    }
  });
}

var cp_handler = function (act) {
  if (act.params.length === 0) {
    irc.privmsg(act.source, 'cp <user1> [user2]: Compare user1 and user2. If no user2 given, defaults to self.');
  } else if (act.params[0] === 'help') {
    irc.privmsg(act.source, 'cp <user1> [user2]: Compare user1 and user2. If no user2 given, defaults to self.');
  } else if (act.params.length === 1 || act.params[1] === '') {
    UserModel.findOne({$or: [{ nick: act.nick.toLowerCase() }, {hmask: act.host }] }, function (err, user) {
      if (!user) {
        UserModel.findOne({ nick: act.params[0].toLowerCase() }, function (err, user2) {
          if (!user2) {
            cp(act.params[0], act.params[0], act.nick, act.nick, act);
          } else {
            cp(user2.lastfm, act.params[0], act.nick, act.nick, act);
          }
        });
      } else {
        UserModel.findOne({ nick: act.params[0].toLowerCase() }, function (err, user2) {
          if (!user2) {
            cp(act.params[0], act.params[0], user.lastfm, act.nick, act);
          } else {
            cp(user2.lastfm, act.params[0], user.lastfm, act.nick, act);
          }
        });
      }
    });
  } else {
    UserModel.findOne({ nick: act.params[0].toLowerCase() }, function (err, user) {
      if (!user) {
        UserModel.findOne({ nick: act.params[1].toLowerCase() }, function (err, user2) {
          if (!user2) {
            cp(act.params[1], act.params[1], act.params[0], act.params[0], act);
          } else {
            cp(user2.lastfm, act.params[1], act.params[0], act.params[0], act);
          }
        });
      } else {
        UserModel.findOne({ nick: act.params[1].toLowerCase() }, function (err, user2) {
          if (!user2) {
            cp(act.params[1], act.params[1], user.lastfm, act.params[0], act);
          } else {
            cp(user2.lastfm, act.params[1], user.lastfm, act.params[0], act);
          }
        });
      }
    });
  }
};

var reg_handler = function (act) {
  if (act.params.length === 2) {
    UserModel.update({ nick: act.params[0].toLowerCase() }, { lastfm: act.params[1] }, { upsert: true}, function () {});
    irc.privmsg(act.source, 'I have remembered ' + act.params[0] + ' by nick to be "' + act.params[1] + '" on last.fm');
  } else if (act.params.length === 1) {
    UserModel.update({ nick: act.nick.toLowerCase() }, { nick: act.nick.toLowerCase(), hmask: act.host, lastfm: act.params[0] }, { upsert: true }, function () {});
    irc.privmsg(act.source, 'I have remembered you by nick and host to be "' + act.params[0] + '" on last.fm');
  } else {
    irc.privmsg(act.source, ".reg LASTFMUSER to register with me!");
  }
};

var lovereg_handler = function (act) {
  if (act.params.length < 2) {
    irc.privmsg(act.source, '.lovereg [lastfmuser] [token] to register for love/unlove. For help with the token, do .token. This command should be given in private.');
  } else {
    LoveModel.update({ nick: act.nick.toLowerCase() }, { nick: act.nick.toLowerCase(), hmask: act.host, lastfm: act.params[0], token: act.params[1] }, { upsert: true }, function (err) { console.log(err); });
    irc.privmsg(act.source, 'I\'ve got you down and you\'re ready to .love and .unlove tracks, ' + act.nick);
  }
};

var token_handler = function (act) {
  irc.privmsg(act.nick, 'To get the token, you have to md5 hash some things. You can do that here: http://bit.ly/FONcEO :: You have to hash your password, then copy and paste it back up top and stick your username (all lowercase) infront of it. An example with user: theVDude and password: password');
  irc.privmsg(act.nick, 'The md5 of password is: 5f4dcc3b5aa765d61d8327deb882cf99 so next we get the md5 of thevdude5f4dcc3b5aa765d61d8327deb882cf99, which is 91e09fa81529ea6fe0d966356b08f87e, which would be the token to give to .lovereg. This command should be given in private.');
};

var url_handler = function (act) {
  if (act.params.length === 0) {
    UserModel.findOne({$or: [{ nick: act.nick.toLowerCase() }, { hmask: act.host }] }, function (err, user) {
      if (!user) {
        irc.privmsg(act.source, 'URL for ' + act.nick + ': http://last.fm/user/' + act.nick);
      } else {
        irc.privmsg(act.source, 'URL for ' + act.nick + ': http://last.fm/user/' + user.lastfm);
      }
    });
  } else {
    UserModel.findOne({ nick: act.params[0].toLowerCase() }, function (err, user) {
      if (!user) {
        irc.privmsg(act.source, 'URL for ' + act.params[0] + ': http://last.fm/user/' + act.params[0]);
      } else {
        irc.privmsg(act.source, 'URL for ' + act.params[0] + ': http://last.fm/user/' + user.lastfm);
      }
    });
  }
};

exports.name = ['np', 'topten', 'cp', 'reg', 'url', 'lovereg', 'love', 'unlove', 'token'];
exports.handler = [np_handler, topten_handler, cp_handler, reg_handler, url_handler, lovereg_handler, love_handler, unlove_handler, token_handler];
