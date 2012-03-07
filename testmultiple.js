// A sample plugin for IRC Node.
// API documentation: https://github.com/totallymike/ircnode/wiki/PluginAPI

/* First we get the irc object from global. Inside this object, all
 * all the api calls are made. In this example only privmsg is used. */
// TODO Look if there is a better way to get the irc object
var irc = global.irc;

/* Then the command handler function is created. This handler function
 * is called when the command is triggered. The developer can choose
 * the structure of the plugin as he/she wishes but a main handler
 * function always needs to be created. */
var tester_handler = function (act) {

  /* If no parameters are added to the command, we just send 'test'
   * back to the source. */
  if (act.params.length === 0) {
    irc.privmsg(act.source, 'tester');
  }

  /* If there are parameters, then they are joined into one string
   * and then sent back to the source. */
  else {
    irc.privmsg(act.source, 'tester: ' + act.params.join(' '));
  }

};
var tester2_handler = function (act) {

  /* If no parameters are added to the command, we just send 'test'
   * back to the source. */
  if (act.params.length === 0) {
    irc.privmsg(act.source, 'tester2');
  }

  /* If there are parameters, then they are joined into one string
   * and then sent back to the source. */
  else {
    irc.privmsg(act.source, 'tester2: ' + act.params.join(' '));
  }

};

/* Afterwards the plugin needs to be exported back to the "main" module.
 *
 * The 'name' property is how the plugin is referred to. That means that
 * if the plugin is named 'test', then '!test' will trigger it and the
 * '!enable test' and '!disable test' commands by admins would enable
 * and disable them, respectively. Disabling a plugin includes deataching
 * it from the event emitter. These must be in an array for it to work
 * properly with multiple commands. The first name should match with the
 * first handler, and so on.
 *
 * The 'handler' property is the function that is called when the plugin
 * is triggered. In this example, '!test [PARAMS]' would call the
 * 'test_handler (act)' function. */
exports.name = ['tester', 'tester2'];
exports.handler = [tester_handler, tester2_handler];
