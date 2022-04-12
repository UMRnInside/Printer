const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { Schematic } = require('prismarine-schematic');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalBlock, GoalPlaceBlock } = require('mineflayer-pathfinder').goals;
const GoalNearXYZ = require('./utils/GoalNearXYZ');
const fs = require('fs').promises;
const { addChatControl } = require('./chatcontrol');
const maUtil = require('./utils/materialUtil.js');

function makePrinter(host, port, username, password, config, task) {
    const bot = mineflayer.createBot({
        host: host,
        port: port,
        username: username,
        password: password,
        version: config.version,
        viewDistance: config.viewDistance ?? 6,
        defaultChatPatterns: config.defaultChatPatterns,
    });
    addChatControl(bot, config.chatControl);
    bot.loadPlugin(pathfinder);
    bot.printer = {
        task: task,
        workloop: async () => { await printerWorkloop(bot) },
        config: config,
        autosave: async () => undefined
    };

    bot.once('spawn', async () => {
        console.log("first spawn");
        const mcData = require("minecraft-data")(bot.version);
        const defaultMove = new Movements(bot, mcData);
        defaultMove.allow1by1towers = false;
        defaultMove.canDig = false;
        defaultMove.allowParkour = true;
        defaultMove.allowSprinting = true;
        defaultMove.scafoldingBlocks = [];
        bot.pathfinder.setMovements(defaultMove);
        bot.mcData = mcData;

        bot.printer.schematic = await Schematic.read(await fs.readFile(task.schematicFile)); 

        await bot.waitForTicks(10);
        for (let i in config.login.sequence) {
            bot.chat(config.login.sequence[i]);
            await bot.waitForTicks(config.login.gapTicks);
        }
        if (config.autostart) {
            bot.printer.working = true;
            printerWorkloop(bot);
        }
    });
    return bot;
}

async function printerWorkloop(bot) {
    const taskConf = bot.printer.task;
    const schematic = bot.printer.schematic;
    const startVec = schematic.start();
    const stopVec = schematic.end();

    const storageStart = new Vec3(taskConf.storage.min);
    const storageEnd = new Vec3(taskConf.storage.max);

    for (let z=taskConf.build.startZ;z<=stopVec.z;z++) {
        if (!bot.printer.working) break;
        let materialList = maUtil.perSchematicTopZRow(schematic, z);
        maUtil.subtraceBotInventory(bot, materialList);
        if (!maUtil.materialListComplete(materialList)) {
            for (let i in taskConf.storage.sequence) {
                bot.chat(taskConf.storage.sequence[i]);
                await bot.waitForTicks(taskConf.storage.gapTicks);
            }
            console.log("Taking materials...");
            if (!maUtil.materialListComplete(materialList)) {
                if (!bot.printer.working) break;
                await maUtil.searchForMaterials(bot, materialList, storageStart, storageEnd);
                await bot.waitForTicks(100);
            }
        }
        console.log("Going back...");
        if (!bot.printer.working) break;
        for (let i in taskConf.build.sequence) {
            bot.chat(taskConf.build.sequence[i]);
            await bot.waitForTicks(taskConf.build.gapTicks);
        }
        console.log("Placing Z Row " + z);
        let success = false;
        try {
            success = await placeBlockForZRow(bot, z);
        } catch (e) {
            console.log("Error on z row!", e);
            console.log(bot.heldItem);
            success = false;
        }
        if (!success) {
            console.log("Z Row " + z + " met rubber-banding!");
            z -= 1;
            continue;
        }
        console.log("Z Row " + z + " complete!");
        taskConf.build.startZ = z+1;
        await bot.printer.autosave();
    }
}

async function placeBlockForZRow(bot, z) {
    const standingOffset = new Vec3(0, 1, -1);
    const faceVector = new Vec3(0, 0, 1);

    const buildConf = bot.printer.task.build;
    const schematic = bot.printer.schematic;
    const worldStartPos = new Vec3(buildConf.startFrom);
    // always 0, 0, 0
    const startVec = schematic.start();
    const stopVec = schematic.end();
    let y = stopVec.y;
    for (let x=startVec.x;x<=stopVec.x;x++) {
        if (!bot.printer.working) break;

        let schematicPos = new Vec3(x, y, z);
        let schematicBlock = schematic.getBlock(schematicPos);
        let worldPos = schematicPos.minus(startVec).plus(worldStartPos);
        let standingPos = worldPos.plus(standingOffset);
        let goal = new GoalNearXYZ(worldPos.x, worldPos.y, worldPos.z, 1.0, 1.0, 1.0);
        //let goal = new GoalBlock(standingPos.x, standingPos.y, standingPos.z);
        await bot.pathfinder.goto(goal);
        let block = bot.blockAt(worldPos);
        if (block.name.endsWith("air")) {
            // TODO: remove block.name === item.name assumption
            let success = await equipLeast(bot, schematicBlock.name);
            if (!success) return false;
            for (let i=0;i<50 && bot.blockAt(worldPos).name !== schematicBlock.name; i++) {
                try {
                    await bot.waitForTicks(4);
                    await bot.placeBlock(bot.blockAt(worldPos.minus(faceVector)), faceVector);
                } catch (e) {
                    console.log(e);
                }
            }
            if (bot.blockAt(worldPos).name.endsWith("air")) {
                await bot.placeBlock(bot.blockAt(worldPos.minus(faceVector)), faceVector);
            }
        }
    }
    return true;
}

async function equipLeast(bot, itemName) {
    let items = bot.inventory.items();
    let target = null;
    for (let i in items) {
        if (items[i].name !== itemName) continue;
        if ((!target) || (items[i].count < target.count && items[i].count > 0)) {
            target = items[i];
        }
    }
    if (target) {
        await bot.equip(target, "hand");
        return true;
    }
    return false;
}

module.exports = {
    makePrinter
}
