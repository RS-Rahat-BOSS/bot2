/**
 * main.js
 * Combined launcher + core (decoded & improved)
 *
 * Required packages (install if missing):
 * npm install fs-extra chalk express axios moment-timezone child_process sequelize chalk node-cron cyber-fca
 *
 * Adjust paths: ./includes, ./Script/commands, ./Script/events, ./includes/database, ./utils/log.js etc.
 */

const express = require('express');
const http = require('http');
const chalk = require('chalk');
const moment = require('moment-timezone');
const axios = require('axios');

const {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  rm,
  mkdirSync
} = require('fs-extra');

const { join, resolve } = require('path');
const { execSync } = require('child_process');

// user-provided utilities (logger) - adjust path if needed
const logger = require('./utils/log'); // function (message [, tag]) expected
const login = require('cyber-fca'); // third-party login wrapper used by original project

// read package dependencies list (to attempt auto install if module missing)
let listPackage = {};
try {
  listPackage = JSON.parse(readFileSync(join(__dirname, 'package.json'))).dependencies || {};
} catch (e) {
  // not fatal — just keep empty
  listPackage = {};
}

const listbuiltinModules = require('module').builtinModules || [];

/* ---------------------------
   Branding and quick logs
   --------------------------- */
const BOT_ART = [
  '██████████████████████████████████████████████████',
  '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
   '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
  '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
   '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
  '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
   '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
  '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
   '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
  '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
   '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
  '⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡\n     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰\n⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡',
  '██████████████████████████████████████████████████',
 '==> Your service is live 🎉',
  '[ DATABASE ] Database connection established successfully'
].join('\n');

console.log(chalk.bold.hex('#00ffff')(BOT_ART));
logger('∞∞🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰 LOADED∞∞ Found appstate.json path successfully');
logger('[ DATABASE ] Database connection established successfully');
logger('==> Your service is live 🎉');

/* ---------------------------
   Global objects (similar to decoded code)
   --------------------------- */
global.client = {
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: [],
  handleSchedule: [],
  handleReaction: [],
  handleReply: [],
  mainPath: process.cwd(),
  configPath: new String(),
  timeStart: null,
  api: null
};

global.data = {
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: [],
  allUserID: [],
  allCurrenciesID: [],
  allThreadID: []
};

global.nodemodule = {};
global.config = {};
global.configModule = {};
global.moduleData = [];
global.language = {};

/* ---------------------------
   Helper: getText (i18n)
   --------------------------- */
global.getText = function (...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
  let text = langText[args[0]][args[1]];
  // replace placeholders %1, %2, ...
  for (let i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, 'g');
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

/* ---------------------------
   Load config (config.json or .temp fallback)
   --------------------------- */
try {
  global.client.configPath = join(global.client.mainPath, 'config.json');
  let configValue;
  try {
    configValue = require(global.client.configPath);
    logger('Found file config: config.json', '🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰');
  } catch (err) {
    // try .temp
    if (existsSync(global.client.configPath.replace(/\.json/g, '') + '.temp')) {
      configValue = JSON.parse(readFileSync(global.client.configPath.replace(/\.json/g, '') + '.temp', 'utf8'));
      logger(`Found: ${global.client.configPath.replace(/\.json/g, '') + '.temp'}`, '🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰');
    } else {
      logger('config.json not found!', 'error');
      throw new Error('Missing config.json');
    }
  }
  // copy into global.config
  for (const key in configValue) global.config[key] = configValue[key];
  logger('Config Loaded!', '🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰');
} catch (err) {
  logger('Can\'t load file config! ' + (err && err.message ? err.message : ''), 'error');
  process.exit(1);
}

/* Write a .temp copy (like original does) */
try {
  writeFileSync(global.client.configPath + '.temp', JSON.stringify(global.config, null, 4), 'utf8');
} catch (e) {
  // ignore
}

/* ---------------------------
   Load language file
   --------------------------- */
try {
  const langName = global.config.language || 'en';
  const langFile = readFileSync(join(__dirname, 'languages', `${langName}.lang`), { encoding: 'utf-8' }).split(/\r?\n|\r/);
  const langData = langFile.filter(item => item.indexOf('#') !== 0 && item !== '');
  for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1);
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] === 'undefined') global.language[head] = {};
    global.language[head][key] = value;
  }
} catch (err) {
  // If no language file, keep empty - only critical if getText is used.
  logger('Language file load failed: ' + (err.message || err), 'warn');
}

/* ---------------------------
   appstate (login state) load
   --------------------------- */
let appStateFile, appState;
try {
  appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || 'appstate.json'));
  appState = require(appStateFile);
  logger('Found appstate.json path successfully', '🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰');
} catch (err) {
  logger('appstate.json not found or invalid - please put your appstate.json in project root', 'error');
  // don't exit, maybe user will login interactively; but many flows depend on it.
}

/* ---------------------------
   Database include (Sequelize)
   --------------------------- */
let Sequelize, sequelize;
try {
  ({ Sequelize, sequelize } = require('./includes/database'));
} catch (e) {
  logger('Database module not found or failed to load: ' + (e.message || e), 'warn');
}

/* ---------------------------
   Basic express uptime server
   --------------------------- */
const app = express();
app.get('/', (req, res) => {
  res.send('Service is alive — ' + BOT_ART.split('\n')[0]);
});

const server = http.createServer(app);
const PORT = process.env.PORT || (global.config.PORT || 3000);
server.listen(PORT, () => {
  logger(`Express server listening on port ${PORT}`, 'server');
});

/* ---------------------------
   checkBan function (simplified)
   - mirrors the logic in decoded code:
     fetch listban.json from remote, mark banned users/threads
   --------------------------- */
async function checkBan(api) {
  try {
    logger('Checking global ban list...', '[ GLOBAL BAN ]');
    const resp = await axios.get('https://raw.githubusercontent.com/rummmmna21/facebook-bot/main/listban.json');
    const data = resp.data || {};
    if (!data) return logger('No ban data found', '[ GLOBAL BAN ]');

    // mark users
    for (const uid of global.data.allUserID) {
      if (data.hasOwnProperty(uid) && !global.data.userBanned.has(uid)) {
        global.data.userBanned.set(uid, {
          reason: data[uid].reason,
          dateAdded: data[uid].dateAdded
        });
      }
    }
    // mark threads
    for (const tid of global.data.allThreadID) {
      if (data.hasOwnProperty(tid) && !global.data.threadBanned.has(tid)) {
        global.data.threadBanned.set(tid, {
          reason: data[tid].reason,
          dateAdded: data[tid].dateAdded
        });
      }
    }

    // If any admin is banned (by id), create a sentinel file and exit
    try {
      delete require.cache[require.resolve(global.client.configPath)];
      const adminList = require(global.client.configPath).ADMINBOT || [];
      for (const adminId of adminList) {
        if (!isNaN(adminId) && data.hasOwnProperty(adminId)) {
          logger(`Admin ${adminId} is globally banned. Exiting.`, '[ GLOBAL BAN ]');
          const home = require('os').homedir();
          mkdirSync(join(home, '.rxabdullahgban'), { recursive: true });
          if (process.platform === 'win32') execSync('attrib +H +S ' + join(home, '.rxabdullahgban'));
          process.exit(0);
        }
      }
    } catch (e) {
      // ignore config read errors
    }

    // If current account is banned
    if (api && typeof api.getCurrentUserID === 'function') {
      const myId = api.getCurrentUserID();
      if (data.hasOwnProperty(myId)) {
        logger('This account is globally banned. Exiting.', '[ GLOBAL BAN ]');
        const home = require('os').homedir();
        mkdirSync(join(home, '.rxabdullahgban'), { recursive: true });
        if (process.platform === 'win32') execSync('attrib +H +S ' + join(home, '.rxabdullahgban'));
        process.exit(0);
      }
    }

    logger('Finish checking global ban list', '[ GLOBAL BAN ]');
    return true;
  } catch (error) {
    logger('Failed to load global ban list: ' + (error && error.message ? error.message : error), '[ GLOBAL BAN ]');
    throw error;
  }
}

/* ---------------------------
   Auto-install helper for module dependencies used by commands/events
   When a required module isn't present, tries to install into ./nodemodules
   (mimics the original attempt but simpler)
   --------------------------- */
function tryRequireOrInstall(name, parentName = '') {
  const localPath = join(__dirname, 'nodemodules', 'node_modules', name);
  try {
    if (listPackage.hasOwnProperty(name) || listbuiltinModules.includes(name)) {
      return require(name);
    } else {
      if (existsSync(localPath)) return require(localPath);
      // attempt install
      logger(`Installing dependency ${name} for ${parentName || 'module'}`, 'installer');
      execSync(`npm --package-lock false --save install ${name}`, {
        stdio: 'inherit',
        env: process.env,
        shell: true,
        cwd: join(__dirname, 'nodemodules')
      });
      try {
        // try require after install
        return require(name);
      } catch (err) {
        // try local path require
        return require(localPath);
      }
    }
  } catch (err) {
    throw new Error(`Can't load dependency ${name} for ${parentName}: ${err.message || err}`);
  }
}

/* ---------------------------
   Function onBot: login + load commands & events + start listener
   --------------------------- */
function onBot({ models }) {
  const loginData = { appState };

  login(loginData, async (loginError, loginApiData) => {
    if (loginError) {
      logger(JSON.stringify(loginError), 'ERROR');
      return;
    }

    // set options if provided in config (mirrors original)
    if (global.config && global.config.FCAOption) {
      try {
        loginApiData.setOptions(global.config.FCAOption);
      } catch (_) { /* ignore */ }
    }

    // persist new appstate if login returns one
    try {
      writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, '\t'));
    } catch (e) {
      // ignore write errors
    }

    global.client.api = loginApiData;
    global.client.timeStart = Date.now();
    global.config.version = global.config.version || '1.2.14';

    // --- load commands ---
    (function loadCommands() {
      const commandsPath = join(global.client.mainPath, 'Script', 'commands');
      let listCommand = [];
      try {
        listCommand = readdirSync(commandsPath).filter(cmd => cmd.endsWith('.js') && !cmd.includes('example') && !global.config.commandDisabled?.includes(cmd));
      } catch (e) {
        logger('Commands folder not found or unreadable', 'warn');
        return;
      }

      for (const file of listCommand) {
        try {
          const modulePath = join(commandsPath, file);
          const module = require(modulePath);
          if (!module.config || !module.run || !module.config.commandCategory) throw new Error('Invalid command format');
          if (global.client.commands.has(module.config.name || '')) throw new Error('command name duplicate');

          // dependencies
          if (module.config.dependencies && typeof module.config.dependencies === 'object') {
            for (const dep in module.config.dependencies) {
              try {
                if (!global.nodemodule.hasOwnProperty(dep)) {
                  global.nodemodule[dep] = tryRequireOrInstall(dep, module.config.name);
                }
              } catch (errDep) {
                // give up on this command if dependency fails
                throw new Error(`Failed to load dependency ${dep}: ${errDep.message || errDep}`);
              }
            }
            logger(`Dependencies loaded for ${module.config.name}`, 'loader');
          }

          // env config for module
          if (module.config.envConfig) {
            for (const envConfig in module.config.envConfig) {
              if (typeof global.configModule[module.config.name] === 'undefined') global.configModule[module.config.name] = {};
              if (typeof global.config[module.config.name] === 'undefined') global.config[module.config.name] = {};
              if (typeof global.config[module.config.name][envConfig] !== 'undefined') {
                global.configModule[module.config.name][envConfig] = global.config[module.config.name][envConfig];
              } else {
                global.configModule[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
                if (typeof global.config[module.config.name][envConfig] === 'undefined') global.config[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
              }
            }
            logger(`Loaded config for ${module.config.name}`, 'loader');
          }

          // onLoad
          if (module.onLoad) {
            try {
              module.onLoad({ api: loginApiData, models });
            } catch (errOnLoad) {
              throw new Error(`onLoad failed: ${errOnLoad.message || errOnLoad}`);
            }
          }

          if (module.handleEvent) global.client.eventRegistered.push(module.config.name);
          global.client.commands.set(module.config.name, module);
          logger(`Loaded command: ${module.config.name}`, 'loader');
        } catch (err) {
          logger(`Failed to load command ${file}: ${err && err.message ? err.message : err}`, 'error');
        }
      }
    })();

    // --- load events ---
    (function loadEvents() {
      const eventsPath = join(global.client.mainPath, 'Script', 'events');
      let eventFiles = [];
      try {
        eventFiles = readdirSync(eventsPath).filter(ev => ev.endsWith('.js') && !global.config.eventDisabled?.includes(ev));
      } catch (e) {
        logger('Events folder not found or unreadable', 'warn');
        return;
      }

      for (const file of eventFiles) {
        try {
          const modulePath = join(eventsPath, file);
          const evModule = require(modulePath);
          if (!evModule.config || !evModule.run) throw new Error('Invalid event format');
          if (global.client.events.has(evModule.config.name)) throw new Error('event name duplicate');

          if (evModule.config.dependencies && typeof evModule.config.dependencies === 'object') {
            for (const dep in evModule.config.dependencies) {
              try {
                if (!global.nodemodule.hasOwnProperty(dep)) {
                  global.nodemodule[dep] = tryRequireOrInstall(dep, evModule.config.name);
                }
              } catch (errDep) {
                throw new Error(`Failed to load dependency ${dep}: ${errDep.message || errDep}`);
              }
            }
            logger(`Dependencies loaded for event ${evModule.config.name}`, 'loader');
          }

          if (evModule.config.envConfig) {
            for (const envConfig in evModule.config.envConfig) {
              if (typeof global.configModule[evModule.config.name] === 'undefined') global.configModule[evModule.config.name] = {};
              if (typeof global.config[evModule.config.name] === 'undefined') global.config[evModule.config.name] = {};
              if (typeof global.config[evModule.config.name][envConfig] !== 'undefined') {
                global.configModule[evModule.config.name][envConfig] = global.config[evModule.config.name][envConfig];
              } else {
                global.configModule[evModule.config.name][envConfig] = evModule.config.envConfig[envConfig] || '';
                if (typeof global.config[evModule.config.name][envConfig] === 'undefined') global.config[evModule.config.name][envConfig] = evModule.config.envConfig[envConfig] || '';
              }
            }
            logger(`Loaded config for event ${evModule.config.name}`, 'loader');
          }

          if (evModule.onLoad) {
            try {
              evModule.onLoad({ api: loginApiData, models });
            } catch (errOnLoad) {
              throw new Error(`onLoad failed for event ${evModule.config.name}: ${errOnLoad.message || errOnLoad}`);
            }
          }

          global.client.events.set(evModule.config.name, evModule);
          logger(`Loaded event: ${evModule.config.name}`, 'loader');
        } catch (err) {
          logger(`Failed to load event ${file}: ${err && err.message ? err.message : err}`, 'error');
        }
      }
    })();

    // finish loading
    logger(`Finish load modules: Commands=${global.client.commands.size}, Events=${global.client.events.size}`, 'loader');
    logger(`Startup time: ${Date.now() - global.client.timeStart}ms`, 'loader');

    // persist final config and cleanup .temp
    try {
      writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');
      if (existsSync(global.client.configPath + '.temp')) unlinkSync(global.client.configPath + '.temp');
    } catch (e) {
      // ignore
    }

    // includes listener (watcher for messages). original: ./includes/listen
    let listener;
    try {
      const listenerData = { api: loginApiData, models };
      listener = require('./includes/listen')(listenerData);
      // wrapper callback
      const listenerCallback = (error, message) => {
        if (error) return logger(global.getText ? global.getText('rxabdullah', 'handleListenError', JSON.stringify(error)) : ('Listen error: ' + JSON.stringify(error)), 'error');
        if (['presence', 'typ', 'read_receipt'].some(x => x === message.type)) return;
        if (global.config.DeveloperMode === true) console.log('INCOMING MESSAGE:', message);
        return listener(message);
      };
      global.handleListen = loginApiData.listenMqtt(listenerCallback);
    } catch (e) {
      logger('Listen module not loaded: ' + (e.message || e), 'warn');
    }

    // check global ban
    try {
      await checkBan(loginApiData);
    } catch (e) {
      logger('checkBan failed: ' + (e.message || e), 'warn');
      // do not exit — continue
    }

    if (!global.checkBan) logger('Warning: source code check not enabled', '[ GLOBAL BAN ]');

    // final logs
    logger('RX', '[ ABDULLAH (MARIA) ]');
    logger('Hey, thank you for using this Bot', '[ RX (ABDULLAH) ]');
    logger('Fixed by rX', '[ MARIA (RANI) ]');
  });
}

/* ---------------------------
   Connect to DB then start onBot
   --------------------------- */
(async () => {
  try {
    if (sequelize && typeof sequelize.authenticate === 'function') {
      await sequelize.authenticate();
      const authentication = { Sequelize, sequelize };
      const models = require('./includes/database/model')(authentication);
      logger('Database connected successfully', '[ DATABASE ]');
      onBot({ models });
    } else {
      // If no DB, still attempt to run onBot but without models
      logger('No DB connection available — starting without DB', '[ DATABASE ]');
      onBot({ models: {} });
    }
  } catch (err) {
    logger('Database connection failed: ' + (err && err.message ? err.message : err), '[ DATABASE ]');
    // attempt onBot anyway
    onBot({ models: {} });
  }

  console.log(chalk.bold.hex('#eff1f0')('================== SUCCESFULLY ====================='));
})();

/* ---------------------------
   last: unhandled handlers (safe)
   --------------------------- */
process.on('unhandledRejection', (reason, p) => {
  logger('Unhandled Rejection: ' + (reason && reason.stack ? reason.stack : reason), 'error');
});
process.on('uncaughtException', err => {
  logger('Uncaught Exception: ' + (err && err.stack ? err.stack : err), 'error');
  // optionally exit or restart
});
