const Vec3 = require('vec3');
const { GoalGetToBlock } = require('mineflayer-pathfinder').goals;

function sleep(ms) {
    return new Promise((resolve, reject) => setTimeout(resolve, ms));
}

// require prismarine-schematic
function perSchematicTopZRow(schematic, z) {
    let materialList = {};

    let startVec = schematic.start();
    let endVec = schematic.end();
    let topY = endVec.y;
    for (let x=startVec.x;x<=endVec.x;x++) {
        let blockName = schematic.getBlock(Vec3(x, topY, z)).name;
        let newCount = (materialList[blockName] ?? 0) + 1;
        materialList[blockName] = newCount;
    }
    console.log(`Materials for row ${z}:`, materialList);
    return materialList;
}

// materialList: is a reference, intended for 1.13+
// does not close container
async function withdrawMaterials(bot, materialList, container, withdrawBySlot) {
    let slots = container.slots;
    let emptyInvPos = container.inventoryStart;
    for (let i=0;i<container.inventoryStart;i++) {
        let itemName = slots[i]?.name;
        if (!itemName) continue;
        if ((materialList[itemName] ?? 0) <= 0) continue;
        let takingCount = slots[i].count;
        // NOTE: for 1.13+ only, as metadata is always null
        if (withdrawBySlot) {
            while (slots[emptyInvPos]) emptyInvPos++;
            await bot.moveSlotItem(i, emptyInvPos);
            console.log(`Withdrew ${takingCount} x ${itemName} (${i} -> ${emptyInvPos})`);
        } else {
            takingCount = Math.min(slots[i].count, materialList[itemName]);
            await container.withdraw(slots[i].type, null, takingCount, null);
            console.log(`Withdrew ${takingCount} x ${itemName}`);
        }
        await sleep(500);
        materialList[itemName] -= takingCount;
    }
}

function materialListComplete(materialList) {
    let maxCount = 0;
    for (let x in materialList) {
        // TODO: Node.js _events
        maxCount = Math.max(maxCount, materialList[x]);
    }
    return maxCount <= 0;
}

async function searchForMaterials(bot, materialList, startVec, stopVec) {
    subtraceBotInventory(bot, materialList);
    console.log("After subtract:", materialList);
    for (let y=startVec.y; y<=stopVec.y; y++) {
        for (let x=startVec.x; x<=stopVec.x; x++) {
            for (let z=startVec.z; z<=stopVec.z; z++) {
                let block = bot.blockAt(new Vec3(x, y, z));
                let blockName = block?.name ?? "";
                if (!blockName.endsWith("chest") && !blockName.endsWith("shulker_box")) {
                    continue;
                }
                let goal = new GoalGetToBlock(x, y, z);
                await bot.pathfinder.goto(goal);
                await sleep(250);
                let withdrawOption = bot.printer?.config?.withdrawBySlot;
                let container = null;
                setTimeout(() => {
                    if (!container) {
                        bot.activateBlock(block)
                    }
                }, 5000);
                container = await bot.openContainer(block);
                await withdrawMaterials(bot, materialList, container, withdrawOption);
                await sleep(250);
                container.close();
                if (materialListComplete(materialList)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function subtraceBotInventory(bot, materialList) {
    let items = bot.inventory.items();
    //console.log(materialList, items);
    for (let i in items) {
        let itemName = items[i].name;
        if (!materialList[itemName]) continue;
        let doneCount = Math.min(materialList[itemName], items[i].count);
        materialList[itemName] -= doneCount;
    }
    //console.log(materialList);
}

module.exports = {
    perSchematicTopZRow,
    withdrawMaterials,
    materialListComplete,
    searchForMaterials,
    subtraceBotInventory,
}
