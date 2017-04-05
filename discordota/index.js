'use strict';

(function(){
    const util = require('util');
    const Discord = require("discord.js");
    const jsonfile = require('jsonfile');
    const DotaBot = require('../dota').DotaHandler;
    
    let DiscorDota = function DiscorDota(prefix, discord_token, dota_credentials) {
        this.prefix = prefix;
        this.discord_token = discord_token;
        this.dota_credentials = dota_credentials;
        
        this._players = jsonfile.readFileSync('players.json');
        this._handlers = {};
        
        require('./discordota.register.js')(this);
        require('./discordota.dota.js')(this);
        
        // Create discord client
        this._discord = new Discord.Client();
        
        this._discord.on("message", msg => {
            let re = this.handleMessage(msg);
            if(re) re.then(response => msg.channel.sendMessage(response))
                     .catch(reason => console.log(reason));
        });
        
        this._discord.on("ready", () => {
            util.log("Discord ready");
        });
        this._discord.login(discord_token);
        
        this._dota = this.dota_credentials.map(credential => new DotaBot(prefix, credential, true, false));
    };
    
    DiscorDota.prototype.save = function() {
        jsonfile.writeFileSync('players.json', this._players);
    }
    
    DiscorDota.prototype.registerHandler = function (command, handler) {
        this._handlers[command] = handler;
    }
    
    // Returns a Promise with an answer
    DiscorDota.prototype.handleMessage = function(msg) {
        // Only consider prefix
        if(!msg.content.startsWith(this.prefix)) return;
        // Prevent bot explosion 
        if(msg.author.bot) return;
        
        // Parse command and arguments
        let [command, ...args] = msg.content.split(" ");
        command = command.slice(this.prefix.length);
        
        if(this._handlers[command]) {
            // Let the handler treat the command
            return this._handlers[command].handle(msg, args);
        } else {
            // Unknown command
            return Promise.resolve("Unknown command " + command);
        }
    }
    
    
    exports = module.exports = DiscorDota;
})();