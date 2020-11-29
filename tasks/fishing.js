const { Bot } = require("mineflayer");
const { resolve } = require("path");
const { Entity } = require("prismarine-entity");
const { Vec3 } = require("vec3");
const { noop, wrap, Logger } = require("../utils");

/** @type {(context: import("..").Context) => import("..").Task} */
const fishing = context => {
  const mcdata = context.mcdata;
  const bot = context.bot;
  let nowFishing = false;
  let active = false;;

  const onCollect = (player, entity) => {
    if (entity.kind === 'Drops' && player === bot.entity) {
      bot.removeListener('playerCollect', onCollect)
      
    }
  }

  const startFishing = async () => {
    if(bot.food < 10) await eat();
    bot.equip(bot.inventory.findInventoryItem(mcdata.itemsByName.fishing_rod.id), 'hand', err => {
      nowFishing = true;
      bot.fish(() => {
        nowFishing = false;
        if(active) startFishing();
      })
    });
  }

  const eat = () => 
    new Promise(
      resolve => 
        bot.equip(
          bot.inventory.findInventoryItem(mcdata.itemsByName.fish.id),
          'hand',
          err => bot.consume(resolve)
        )
  )

  return {
    name: 'fishing',
    exec: () => {
      active = true;
      startFishing();
      return () => {
        if(nowFishing) bot.activateItem();
        active = false;
      }
    },
  };
}

/** @type {(context: import("..").Context) => import("..").Task} */
const fishing2 = context => {
  const bot = context.bot;
  const mcdata = context.mcdata;
  const logger = context.logger;
  return {
    name: 'fishing',
    exec: () => {
      let running = true;
      (async()=>{
        while(running){
          logger.log('I am about to cast', Logger.levels.verbose);
          await wrap(res => bot.equip(
            bot.inventory.findInventoryItem(mcdata.itemsByName.fishing_rod.id),
            'hand',
            res
          ));
          const bobber = await wrap(res => {
            /** @param {Entity} entity */
            const onSpawn = entity => {
              if(entity.entityType !== 107) return bot.once('entitySpawn', onSpawn);
              res(entity);
            }
            bot.once('entitySpawn', onSpawn);
            bot.activateItem();
          });
          logger.log('I found the bobber', Logger.levels.verbose);
          if(!running) {
            bot.activateItem();
            break;
          }
          await wrap(res => {
            const onParticles = packet => {
              const pos = bobber.position
              if (packet.particleId === 4 && packet.particles === 6 && pos.distanceTo(new Vec3(packet.x, pos.y, packet.z)) <= 0.3) res();
              else bot._client.once('world_particles', onParticles);
            }
            bot._client.once('world_particles', onParticles)
          });
          logger.log('I detected the fish', Logger.levels.verbose);
          bot.activateItem();
        }
      })();
      return () => {
        running = false;
      }
    }
  }
}

module.exports = fishing2;
