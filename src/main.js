const fs = require('fs')
const printer = require('./printer');

if (process.argv.length < 7 || process.argv.length > 8) {
    console.log('Usage : node main.js <config.json> <task.json> <host> <port> <name> [<password>]');
    process.exit(1);
}
let host = process.argv[4];
let port = parseInt(process.argv[5]);
let name = process.argv[6];
let password = process.argv[7];
let config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let task = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
// console.log(host, port, name, password, config);

let bot = printer.makePrinter(host, port, name, password, config, task);
if (!bot) {
    process.exit(1);
}
bot.on('kicked', (reason, loggedIn) => {
    console.log("Kicked:", reason);
    process.exit(0);
});
bot.on("end", (reason) => {
    console.log("Disconnected:", reason);
    process.exit(0);
});

if (config.logChats) {
    bot.on('message', (msg) => {
        const ChatMessage = require('prismarine-chat')(bot.version)
        console.log(new ChatMessage(msg).toString())
    });
}
