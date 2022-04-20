const fs = require('fs').promises;
const { Schematic } = require('prismarine-schematic');
const repl = require('repl');
const Vec3 = require('vec3');

async function main () {
    let schematic = await Schematic.read(await fs.readFile('Penguin_Logistics_mcpixel.schematic'));
    const r = repl.start('> ')
    r.context.painting = schematic;
    r.context.Schematic = Schematic;
    r.context.Vec3 = Vec3;
    r.context.mautil = require('./src/utils/materialUtil');
}

main()
