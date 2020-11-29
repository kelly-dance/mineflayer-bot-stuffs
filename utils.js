const { Bot } = require("mineflayer");
const { Item } = require("prismarine-item");

module.exports.noop = () => {};

/** 
 * @param {Bot} bot
 * @returns {Item | null}
 */
module.exports.getHeldItem = bot => bot.inventory.slots[bot.quickBarSlot + 36] || null;

module.exports.milliseconds = ms => new Promise(r => setTimeout(r), ms);

/**
 * @template T
 * @param {(resolve: (value: T) => void) => void} cb
 * @returns {Promise<T>} 
 */
module.exports.wrap = cb => new Promise(resolve => cb(resolve));

module.exports.Logger = class Logger{
  static levels = {
    disabled: -1,
    default: 0,
    verbose: 1,
  }

  /**
   * @param {Bot} bot 
   * @param {number} level 
   * @param {'ingame' | 'console'} channel 
   */
  constructor(bot, level = Logger.levels.default, channel = 'ingame'){
    this.bot = bot;
    this.level = level;
    this.channel = channel;
  }

  log(str, level = 0){
    if(level <= this.level){
      if(level > 0) str = `[${Object.entries(Logger.levels).find((_, v) => v === level)?.[0] || `Level ${level}`}] ${str}`
      switch(this.channel){
        case 'ingame':
          return this.bot.chat(str);
        case 'console':
        default:
          return console.log(str);
      }
    }
  }
}
