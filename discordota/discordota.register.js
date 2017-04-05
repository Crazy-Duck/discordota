'use strict';

(function(){
    
    exports = module.exports = function(DiscorDota) {
        let command = "register";
        let handler = {
            "help": command + " [steam64ID] [MMR]: Associates your steam account with your discord persona",
            "handle" : function(msg, args) {
                if (!DiscorDota._players) DiscorDota._players = [];
                let response = "";
                if (args && args[0] && args[1]) {
                    let steam64ID = args[0];
                    let dota2ID = DiscorDota._dota[0].bot.Dota2.ToAccountID(steam64ID);
                    let p = {
                        "id" : msg.author.id,
                        "name": msg.author.username,
                        "steam64ID" : steam64ID,
                        "dota2ID" : dota2ID,
                        "mmr" : parseInt(args[1], 10),
                    };
                    DiscorDota._players = DiscorDota._players.filter(player => player.id != p.id);
                    DiscorDota._players.push(p);
                    DiscorDota.save();
                    response = "Welcome "+msg.author.username + "!";
                } else {
                    response = handler.help;
                }
                return new Promise(resolve => resolve(response));
            }
        };
        DiscorDota.registerHandler(command, handler);
        
        command = "list";
        handler = {
            "help": command + ": Lists all players and their MMR",
            "handle": (msg, args) => {
                let response = "";
                if (DiscorDota._players) {
                    DiscorDota._players.map(player => response += (player.name + "                    ").slice(0, 21) + ": " + player.mmr + "\n");
                }
                return new Promise(resolve => resolve(response));
            }
        };
        DiscorDota.registerHandler(command, handler);
    };
})();