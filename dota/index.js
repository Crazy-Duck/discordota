'use strict'

const   dotaBot = require('dota2-bot'),
        util    = require('util');
        
var exports = module.exports;

var State = {
        IDLE: 0,
        LOBBY: 1,
        MATCH: 2
};
exports.State = State;

var Commands = {
    FP: "fp",
    SHUFFLE : "shuffle",
    START : "start",
    SWAP: "swap"
}

exports.DotaHandler = class DotaHandler {
        
    constructor(prefix, logonDetails, debug, debugMore) {
        this.prefix = prefix;
        this.logonDetails = logonDetails;
        this.bot = new dotaBot(logonDetails, debug, debugMore);
        this._state = State.IDLE;
        
        this.bot.Dota2.on("chatMessage", (channel, sender, txt, msg) => {
            if (!txt.startsWith(this.prefix)) return;
            if(msg.account_id == this.bot.AccountID) return;
            
            let [command, ...args] = txt.substring(1).split(" ");
            let reply = this.handleCommand(command, args);
            reply
                .then(response => this.bot.schedule(()=>this.bot.Dota2.sendMessage(channel, response)))
                .catch(reason  => this.bot.schedule(()=>this.bot.Dota2.sendMessage(channel, "Error executing command: "+reason)));
        });
        
        this.bot.Dota2.on("practiceLobbyUpdate", lobby => this.handleLobby);
        this.bot.connect();
    }
    
    /**
     * Get the current state of the bot
     **/
    get state() {
        return this._state;
    }
    
    handleLobby(lobby) {
        if (this.bot.Dota2.Lobby) {
            // Check if game is done
            if (lobby.state == this.bot.Dota2.lookupEnum("LobbyType").POSTGAME) {
                this.bot.schedule(() => {
                    this.bot.Dota2.leavePracticeLobby((err, result) => {
                        if (err) console.log(err);
                        this.bot.schedule(() => {
                            this.bot.Dota2.leaveChat("Lobby_"+lobby.lobby_id, 
                                                     this.bot.Dota2.schema.lookupEnum("DOTAChatChannelType_t").DOTAChannelType_Lobby);
                        });
                        this.state = State.IDLE;
                   });
                });
                util.log("Game "+ lobby.match_id +" has finished! Outcome is " + lobby.match_outcome);
            }
        } else {
            // Join lobby chat channel
            this.bot.schedule(() => {
                this.bot.Dota2.joinChatChannel( "Lobby_"+lobby.lobby_id, 
                                                this.bot.Dota2.schema.lookupEnum("DOTAChatChannelType_t").DOTAChannelType_Lobby);
            });
        }
    }
    
    handleCommand(command, args) {
        let reply = "";
        switch(command) {
            case Commands.START: {
                reply = this.startLobby();
                break;
            }
            case Commands.SHUFFLE: {
                reply = this.shuffleLobby();
                break;
            }
            case Commands.FP: {
                reply = this.setFirstPick(args[0]);
                break;
            }
            case Commands.SWAP: {
                reply = this.swap();
                break;
            }
            default : reply = Promise.resolve("Unknown command "+command);
        }
        return reply;
    }
    
    createLobby() {
        return new Promise((resolve, reject) => {
            if (this.state !== State.IDLE) return reject("I'm busy");
            this._state = State.LOBBY;
            this.bot.schedule(()=>{
                let options = {
                    game_name: "Test tournament",
                    server_region: this.bot.Dota2.ServerRegion.EUROPE,
                    game_mode: this.bot.Dota2.schema.lookupEnum("DOTA_GameMode").DOTA_GAMEMODE_CM
                };
                this.bot.Dota2.createPracticeLobby("password", options, (err, result) => {
                    if (err) {
                        this._state = State.IDLE;
                        return reject("Error creating lobby: " + err);
                    } else {
                        this.bot.schedule(() => this.bot.Dota2.practiceLobbyKickFromTeam(this.bot.Dota2.AccountID, (err, response) => {
                            if(err) return reject("Could not leave radiant team");
                            else return resolve("Lobby created:");
                        }));
                    }
                });
            });
        });
    }
    
    shuffleLobby() {
        return new Promise((resolve, reject) => {
            if (this.state !== State.LOBBY) return reject("Can't shuffle now");
            this.bot.schedule(() => {
                this.bot.Dota2.balancedShuffleLobby((err, response) => {
                    if(err) return reject(err);
                    else resolve("Shuffled");
                });
                
            });
        });
    }
    
    setFirstPick(team) {
        return new Promise((resolve, reject) => {
            if (this.state !== State.LOBBY || !this.bot.Dota2.Lobby) return reject("Can't set first pick now");
            if (team !== "radiant" && team !== "dire") return reject("Unknown team, can only set to radiant or dire");
            this.bot.schedule(() => {
                let pick = this.bot.Dota2.schema.lookupEnum("DOTA_CM_PICK");
                this.bot.Dota2.configPracticeLobby(
                    this.bot.Dota2.Lobby.lobby_id, 
                    {cm_pick: team == "radiant" ? pick.DOTA_CM_GOOD_GUYS : pick.DOTA_CM_BAD_GUYS}, 
                    (err, response) => {
                        if(err) return reject(err);
                        else resolve("First pick set to " + team);
                    }
                );
            });
        });
    }
    
    swap() {
        return new Promise((resolve, reject) => {
            if (this.state !== State.LOBBY) return reject("Can't swap now");
            this.bot.schedule(() => {
                this.bot.Dota2.flipLobbyTeams((err, response) => {
                    if(err) return reject(err);
                    else resolve("Swapped");
                });
            });
        });
    }
    
    startLobby() {
        return new Promise((resolve, reject) => {
            if (this.state !== State.LOBBY) return reject("Can't start now");
            this._state = State.MATCH;
            this.bot.schedule(() => {
                this.bot.Dota2.launchPracticeLobby((err, response) => {
                    if(err) return reject(err);
                    else resolve(response);
                });
            });
        });
    }
    
    leaveLobby() {
        return new Promise((resolve, reject) => {
           if (this.state == State.MATCH) return resolve(this.logonDetails.account_name + " done");
           this._state = State.IDLE;
           this.bot.schedule(() => {
               this.bot.Dota2.leavePracticeLobby((err, result) => {
                   if (err) console.log(err);
                   resolve(this.logonDetails.account_name + " done");
               });
           });
        });
    }
}