const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow, GoalBreakBlock, GoalPlaceBlock } = require("mineflayer-pathfinder").goals;
var config = require("./config.json");
const bot = mineflayer.createBot({ 
	host: config.host,
	port: config.port,
    username: config.username
});

function lookAtNearestPlayer(){
    const playerFilter = (entity) => entity.type === "player";
    const playerEntity = bot.nearestEntity(playerFilter);
    if(!playerEntity) return;
    const pos = playerEntity.position.offset(0, playerEntity.height, 0);
    bot.lookAt(pos);
}

bot.once("spawn", () => {
    const mcData = require("minecraft-data")(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.on("chat", (username, message) => {
        if(username === bot.username) return;
        const target = bot.players[username] ? bot.players[username].entity : null;
        switch(message){
        	case "come":
                if(!target){
                	bot.chat("I can't see you :(");
                    return;
                }
                const pt = target.position;
                bot.pathfinder.setMovements(defaultMove);
                bot.pathfinder.setGoal(new GoalNear(pt.x, pt.y, pt.z, 1));
            break;
            case "follow":
                if(!target){
                    bot.chat("I can't see you :(");
                    return;
                }
                bot.pathfinder.setMovements(defaultMove);
                bot.pathfinder.setGoal(new GoalFollow(target, 3), true);
            break;
            case "avoid":
                if(!target){
                    bot.chat("I can't see you :(");
                    return;
                }
                bot.pathfinder.setMovements(defaultMove);
                bot.pathfinder.setGoal(new GoalInvert(new GoalFollow(target, 5)), true);
            break;
            case "stop":
                bot.pathfinder.stop();
            break;
            case "hit":
                const mobFilter = e => e.type === "mob" && e.mobType === "Zombie";
                const mob = bot.nearestEntity(mobFilter);
                if(!mob) return;
                bot.lookAt(mob.position, true, () => {
                    bot.attack(mob);
                });
            break;
            case "break":
                if(!target){
                    bot.chat("I can't see you :(");
                    return;
                }
                const p = target.position.offset(0, -1, 0);
                const goal = new GoalBreakBlock(p.x, p.y, p.z, bot)
                bot.pathfinder.goto(goal).then(() => {
                    bot.dig(bot.blockAt(p), "raycast").catch(err => console.error("digging error", err))
                }, (err) => {
                    console.error("Pathfing error", err);
                });
            break;
            case "place":
                const [itemName] = message.split(" ");
                if(!target){
                    bot.chat("I can't see you :(");
                    return;
                }
                const itemsInInventory = bot.inventory.items().filter(item => item.name.includes(itemName));
                if(itemsInInventory.length === 0){
                    bot.chat("I dont have " + itemName);
                    return;
                }try{
                    const rayBlock = rayTraceEntitySight(target);
                    const face = directionToVector(rayBlock.face);
                    bot.pathfinder.goto(new GoalPlaceBlock(rayBlock.position.offset(face.x, face.y, face.z), bot.world, {
                        range: 4
                    }));
                    bot.equip(itemsInInventory[0], "hand");
                    bot.lookAt(rayBlock.position.offset(face.x * 0.5 + 0.5, face.y * 0.5 + 0.5, face.z * 0.5 + 0.5));
                    bot.placeBlock(rayBlock, face);
               }catch(e){
                   console.error(e);
               }
           break;
        }
    });
});

bot.once("spawn", () => {
    setInterval(() => {
        const mobFilter = e => e.type === "mob" && e.mobType === "Zombie";
        const mob = bot.nearestEntity(mobFilter);
        if(!mob) return;
        const pos = mob.position;
        bot.lookAt(pos, true, () => {
            bot.attack(mob);
        });
    }, 1000);
});

bot.loadPlugin(pathfinder);