function addChatPatterns(bot, config) {
    let patterns = config.whisperRegexPatterns;
    for (let i in patterns) {
        console.log(RegExp(patterns[i]));
        bot.addChatPattern('whisper', RegExp(patterns[i]), {parse: true, deprecated: true} );
    }
}

function addChatControl(bot, config) {
    function isOwner(username) {
        for (let i in config.owners) {
            if (username === config.owners[i]) return true;
        }
        return false;
    }
    addChatPatterns(bot, config);
    // Wrapper of 'whisper' event
    // See https://github.com/PrismarineJS/mineflayer/issues/2478
    bot.on('whisper', async (username, message) => {
        console.log("(Whisper)", username, message);
        if (username === bot.username) return;
        if (config.allowOwnersOnly && !isOwner(username)) {
            return;
        }
        switch (true) {
            case /^(say|chat) (.*)$/.test(message):
                let match = /^(say|chat) (.*)$/.exec(message);
                bot.chat(match[2]);
                break;
            case /^quit$/.test(message):
                bot.quit();
                break;
            case /^start$/.test(message):
                bot.printer.working = true;
                bot.chat("Starting...");
                await bot.waitForTicks(60);
                bot.printer.workloop();
                break;
            case /^stop$/.test(message):
                bot.printer.working = false;
                bot.chat("Stopping...");
                break;
        }
    });
}



module.exports = {
    addChatControl
};
