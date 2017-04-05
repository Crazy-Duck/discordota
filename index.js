const DiscorDota = require("./discordota");

global.config = require("./config");

let dotaCredentials = global.config.credentials;
let discordToken = global.config.token;

let bot = new DiscorDota("!", discordToken, dotaCredentials);