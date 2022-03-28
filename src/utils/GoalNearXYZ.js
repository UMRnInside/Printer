const goals = require('mineflayer-pathfinder').goals;

class GoalNearXYZ extends goals.Goal {
    constructor(x, y, z, xRange, yRange, zRange) {
        super();
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        this.z = Math.floor(z);
        this.xRange = xRange;
        this.yRange = yRange;
        this.zRange = zRange;
    }

    heuristic(node) {
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        const dz = this.z - node.z;
        return Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
    }

    isEnd(node) {
        const dx = this.x - node.x;
        const dy = this.y - node.y;
        const dz = this.z - node.z;
        return Math.abs(dx) <= this.xRange &&
            Math.abs(dy) <= this.yRange &&
            Math.abs(dz) <= this.zRange;
    }
}

module.exports = GoalNearXYZ;
