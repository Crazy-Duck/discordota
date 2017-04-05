'use strict';

(function(){
    const State = require('../dota').State;
    
    exports = module.exports = function(DiscorDota) {
        
        let command = "lobby";
        let handler = {
            "help": command + ": creates a Dota 2 lobby",
            "handle":  function(msg, args) {
                console.log("Creating lobby");
                let bot = DiscorDota._dota.filter(bot => bot.state === State.IDLE)[0];
                if (bot) {
                    return bot.createLobby();
                } else {
                    return Promise.reject("All bots are busy");
                }
            }
        };
        DiscorDota.registerHandler(command, handler);
        
        command = "reset";
        handler = {
            "help": command + ": deletes all lobbies that aren't ongoing",
            "handle": function(msg, args) {
                console.log("Purging lobbies");
                return Promise.all(DiscorDota._dota.map(bot => bot.leaveLobby()));
            }
        }
        DiscorDota.registerHandler(command, handler);
    };
})();