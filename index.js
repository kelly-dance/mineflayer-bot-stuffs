const mineflayer = require('mineflayer')
const pathfinderModule = require('mineflayer-pathfinder');
const pathfinder = pathfinderModule.pathfinder;
const Movements = pathfinderModule.Movements;
const { GoalNear } = pathfinderModule.goals;
const { noop, getHeldItem, milliseconds, Logger } = require('./utils');

const fishing = require('./tasks/fishing');
const { Item } = require('prismarine-item');
const { postNettyVersionsByProtocolVersion } = require('minecraft-data');

/** @type {Record<string, (context: Context) => Task>} */
const tasks = {
  fishing,
};

const config = require('./config.json')

const { owners, accounts } = config;

/**
 * @typedef {{
 * mcdata: any,
 * defaultMove: pathfinderModule.Movements,
 * bot: mineflayer.Bot,
 * logger: Logger
 * }} Context
 */
/**
 * @typedef {{
 *  name: string,
 *  exec: () => () => void,
 *  stop?: () => void,
 * }} Task
 */

(async() => {
  for(const [email, pass] of accounts){
    console.log(`attempting to log in with ${email}`)
    const bot = mineflayer.createBot({
      ...config.server,
      username: email,
      password: pass,
      version: '1.16.4'
    })
    
    bot.loadPlugin(pathfinder);
    
    bot.on('spawn', () => {
      console.log(`${bot.username} logged in! (${email})`)
      const mcdata = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcdata);
      const logger = new Logger(bot);

      const context = {
        mcdata,
        defaultMove,
        bot,
        logger,
      }

      /**
       * @type {null | Task}
       */
      let task = null;

      bot.on('chat', (username, message) => {
        if(!owners.includes(username)) return;
        const args = message.split(' ');
        if(args.length && args.shift().toLowerCase() !== bot.username.toLowerCase()) return;
        const commands = {
          come: () => {
            if(task) return bot.chat(`I\'m busy: ${task.name}`)
            const target = bot.players[username]?.entity;
            if(!target) return bot.chat('I can\'t see you!');
            const p = target.position;
            bot.pathfinder.setMovements(defaultMove)
            bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
          },
          ping: () => {
            bot.chat('pong');
          },
          goto: () => {
            if(task) return bot.chat(`I\'m busy: ${task.name}`)
            bot.pathfinder.setMovements(defaultMove)
            if(args.length === 1){
              const target = bot.players[args[0]]?.entity;
              if(!target) return bot.chat('I can\'t see them?');
              const p = target.position;
              bot.pathfinder.setMovements(defaultMove)
              bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
            }else{
              bot.pathfinder.setGoal(new GoalNear(...args.map(Number), 1))
            }
          },
          hit: () => {
            if(task) return bot.chat(`I\'m busy: ${task.name}`)
            const target = bot.players[args[0]]?.entity;
            if(!target) return bot.chat('I can\'t see them!');
            bot.attack(target)
          },
          stop: () => {
            if(!task) return bot.chat('I\'m not even doing anything bruh.');
            bot.chat(`I will stop ${task.name} now.`)
            task.stop();
            task = null;
          },
          start: () => {
            if(task) return bot.chat(`I\'m already busy with ${task.name}`)
            const taskName = args[0].toLowerCase();
            task = tasks[taskName]?.(context);
            if(!task) return bot.chat('I don\'t recognize that task!');
            task.stop = task.exec();
            bot.chat(`I am now ${task.name}.`)
          },
          look: () => {
            let who = args[1];
            if(who === 'me') who = username;
            const target = bot.players[who]?.entity;
            if(!target) return bot.chat('I can\'t see that player!');
            const p = target.position;
            bot.lookAt(p);
          },
          logout: () => {
            bot.chat('ok bye!');
            bot.end();
          },
          status: () => {
            bot.chat(`My hunger is at ${(bot.food/2).toPrecision(2)} and my health is at ${(bot.health/2).toPrecision(2)}`);
            if(task) bot.chat(`And I am ${task.name}`)
          },
          equip: () => {
            if(task) return bot.chat(`I\'m busy: ${task.name}`)
            const slot = Number(args[0]) - 1;
            if(slot < 0 || slot > 8) return bot.chat('Invalid slot!')
            bot.setQuickBarSlot(slot)
          },
          drop: async () => {
            if(task) return bot.chat(`I\'m busy: ${task.name}`)
            if(args[0]?.toLowerCase() === 'all'){
              const dropItem = () => {
                if(!bot.inventory.items().length) return;
                bot.tossStack(bot.inventory.items()[0], dropItem);
              }
              dropItem();
            }else{
              const item = getHeldItem(bot);
              if(!item) return bot.chat('I am not holding anything?');
              bot.tossStack(item);
            }
          },
          eat: () => {
            if(task) return bot.chat(`I\'m busy: ${task.name}`)
            const item = getHeldItem(bot);
            if(!item) return bot.chat('I am not holding anything?');
            bot.consume(noop);
          },
          logger: () => {
            const commands = {
              level: () => {
                const newLevel = args.shift();
                if(!newLevel) return bot.chat(`The logger is currently set to level ${logger.level}.`);
                if(Logger.levels[newLevel] === undefined) return bot.chat(`Valid levels are ${Object.keys(Logger.levels).join(', ')}!`);
                bot.chat(`Setting the logger to ${newLevel} (${Logger.levels[newLevel]})`)
                logger.level = Logger.levels[newLevel];
              },
            }
            const arg = args.shift()?.toLowerCase();
            if(!arg || !commands[arg]) return bot.chat(`Commands are: ${Object.keys(commands).join(', ')}`);
            commands[arg]();
          },
        }
        commands[args.shift().toLowerCase()]?.();
      });
    });
    
    // Log errors and kick reasons:
    bot.on('kicked', (reason, loggedIn) => console.log(reason, loggedIn))
    bot.on('error', err => console.log(err))
    await new Promise(r => setTimeout(r, 5e3))
  }
})();

accounts.forEach(([email, pass]) => {
  
})
