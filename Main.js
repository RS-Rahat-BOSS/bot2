/**
 * main.js (fixed)
 *
 * Usage:
 *  - put this file in project root
 *  - ensure ./utils/log.js exists and exports a function (msg, tag)
 *  - ensure ./utils/index.js exists (optional utilities)
 *  - ensure ./Script/commands and ./Script/events exist or adjust paths
 *  - if you have cyber-fca or fca-unofficial, install it; otherwise this will fallback to a dummy API
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
const os = require('os');

// user-provided utilities - adjust path if needed
let logger;
try {
  // expects utils/log.js to export a function like: module.exports = (msg, tag) => { ... }
  logger = require('./utils/log');
  if (typeof logger !== 'function') {
    // if it's an object with methods, normalize to function
    const l = logger;
    logger = function(msg, tag) {
      if (tag && l[tag]) return l[tag](msg);
      if (l.info) return l.info(msg);
      console.log(msg);
    };
  }
} catch (e) {
  // fallback simple logger
  logger = function (msg, tag) {
    const ts = moment().tz('Asia/Dhaka').format('HH:mm:ss DD/MM/YYYY');
    if (tag) console.log(`[${ts}] [${tag}] ${msg}`);
    else console.log(`[${ts}] ${msg}`);
  };
  logger('utils/log not found — using fallback logger', 'warn');
}

// attempt to load utils/index if present (you showed index.js earlier)
let utilsIndex = {};
try {
  utilsIndex = require('./utils/index');
} catch (e) {
  logger('utils/index.js not found or failed to load (may be fine).', 'warn');
}

// Attempt to use a real FCA login module if available; fallback to utilsIndex.login if present; otherwise create a dummy login
let loginModule = null;
try {
  // prefer cyber-fca if installed
  loginModule = require('cyber-fca');
  logger('Using login module: cyber-fca', 'login');
} catch (e1) {
  try {
    // try fca-unofficial common package
    loginModule = require('fca-unofficial');
    logger('Using login module: fca-unofficial', 'login');
  } catch (e2) {
    // if user-provided utilsIndex has a login function, use that
    if (utilsIndex && typeof utilsIndex.login === 'function') {
      loginModule = utilsIndex.login;
      logger('Using login function from ./utils/index.js', 'login');
    } else {
      // create a fallback dummy login function
      loginModule = function ({ appState }, cb) {
        logger('No real login module found — starting fallback dummy API (for testing only)', 'login');
        // Minimal fake API that exposes required methods used across code:
        const fakeApi = {
          setOptions: () => {},
          getAppState: () => appState || {},
          getCurrentUserID: () => (appState && appState.userID) ? appState.userID : 0,
          // provide a listenMqtt method similar to some FCA wrappers
          listenMqtt: (handler) => {
            // This is a dummy; in real usage, this should connect to FB and call handler on messages
            logger('listenMqtt called on dummy API — no real messages will arrive', 'warn');
            return () => {}; // return a noop unsubscribe
          },
          // provide a generic "listen" fallback (some wrappers use different names)
          listen: (fn) => {
            logger('listen called on dummy API', 'warn');
            return () => {};
          }
        };
        // async simulate success
        setImmediate(() => cb(null, fakeApi));
      };
    }
  }
}

// read package.json dependencies if available (to support tryRequireOrInstall)
let listPackage = {};
try {
  listPackage = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).dependencies || {};
} catch (e) {
  listPackage = {};
}

// builtin modules
const listbuiltinModules = require('module').builtinModules || [];

/* ---------------------------
   Branding
   --------------------------- */
const BOT_ART = [
  '██████████████████████████████████████████████████',
  '     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰',
  '██████████████████████████████████████████████████',
  '==> Your service is live 🎉'
].join('\n');

console.log(chalk.bold.hex('#00ffff')(BOT_ART));
logger('Loaded main launcher', 'info');

/* ---------------------------
   Global objects
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
  configPath: '',
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
   getText (i18n helper)
   --------------------------- */
global.getText = function (...args) {
  if (!global.language.hasOwnProperty(args[0])) throw `${__filename} - Not found key language: ${args[0]}`;
  let text = global.language[args[0]][args[1]];
  for (let i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, 'g');
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

/* ---------------------------
   Load config
   --------------------------- */
try {
  global.client.configPath = join(global.client.mainPath, 'config.json');
  let configValue;
  try {
    configValue = require(global.client.configPath);
    logger('Found file config: config.json', 'config');
  } catch (err) {
    // try .temp
    const alt = global.client.configPath.replace(/\.json/g, '') + '.temp';
    if (existsSync(alt)) {
      configValue = JSON.parse(readFileSync(alt, 'utf8'));
      logger(`Found: ${alt}`, 'config');
    } else {
      logger('config.json not found!', 'error');
      throw new Error('Missing config.json');
    }
  }
  for (const key in configValue) global.config[key] = configValue[key];
  logger('Config Loaded!', 'config');
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
  const filePath = join(__dirname, 'languages', `${langName}.lang`);
  if (existsSync(filePath)) {
    const langFile = readFileSync(filePath, { encoding: 'utf-8' }).split(/\r?\n|\r/);
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
  } else {
    logger('Language file not found; continuing without language data', 'warn');
  }
} catch (err) {
  logger('Language file load failed: ' + (err.message || err), 'warn');
}

/* ---------------------------
   appstate (login state) load
   --------------------------- */
let appStateFile, appState;
try {
  appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || 'appstate.json'));
  if (existsSync(appStateFile)) {
    appState = require(appStateFile);
    logger('Found appstate.json path successfully', 'login');
  } else {
    logger('appstate.json not found in project root', 'warn');
  }
} catch (err) {
  logger('appstate.json not found or invalid - please put your appstate.json in project root', 'error');
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
   Express uptime server
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
   checkBan (simplified)
   --------------------------- */
async function checkBan(api) {
  try {
    logger('Checking global ban list...', '[ GLOBAL BAN ]');
    const resp = await axios.get('https://raw.githubusercontent.com/rummmmna21/facebook-bot/main/listban.json', { timeout: 15000 });
    const data = resp.data || {};
    if (!data) {
      logger('No ban data found', '[ GLOBAL BAN ]');
      return false;
    }

    for (const uid of global.data.allUserID) {
      if (data.hasOwnProperty(uid) && !global.data.userBanned.has(uid)) {
        global.data.userBanned.set(uid, {
          reason: data[uid].reason,
          dateAdded: data[uid].dateAdded
        });
      }
    }
    for (const tid of global.data.allThreadID) {
      if (data.hasOwnProperty(tid) && !global.data.threadBanned.has(tid)) {
        global.data.threadBanned.set(tid, {
          reason: data[tid].reason,
          dateAdded: data[tid].dateAdded
        });
      }
    }

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
      // ignore
    }

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
   tryRequireOrInstall helper
   --------------------------- */
function tryRequireOrInstall(name, parentName = '') {
  const localPath = join(__dirname, 'nodemodules', 'node_modules', name);
  try {
    if (listPackage.hasOwnProperty(name) || listbuiltinModules.includes(name)) {
      return require(name);
    } else {
      if (existsSync(localPath)) return require(localPath);
      logger(`Installing dependency ${name} for ${parentName || 'module'}`, 'installer');
      try {
        execSync(`npm --package-lock false --save install ${name}`, {
          stdio: 'inherit',
          env: process.env,
          shell: true,
          cwd: join(__dirname, 'nodemodules')
        });
      } catch (e) {
        // if install failed, try global require as last resort
        logger(`Failed to install ${name} into nodemodules: ${e.message || e}`, 'installer');
      }

      // attempt require
      try {
        return require(name);
      } catch (err) {
        try {
          return require(localPath);
        } catch (err2) {
          throw new Error(`Can't load dependency ${name} for ${parentName}: ${err2.message || err2}`);
        }
      }
    }
  } catch (err) {
    throw new Error(`Can't load dependency ${name} for ${parentName}: ${err.message || err}`);
  }
}

/* ---------------------------
   onBot: login + load commands/events + listener
   --------------------------- */
function onBot({ models = {} } = {}) {
  const loginData = { appState };

  // loginModule is either a function (callback style) or a module exposing a function
  const loginFn = (typeof loginModule === 'function' && loginModule.length >= 2) ? loginModule
                : (typeof loginModule === 'function') ? loginModule
                : null;

  if (!loginFn) {
    logger('Login module does not export a function; aborting startup', 'error');
    return;
  }

  // call login (supports callback style: (opts, cb) )
  try {
    loginFn(loginData, async (loginError, loginApiData) => {
      if (loginError) {
        logger('Login failed: ' + JSON.stringify(loginError), 'ERROR');
        return;
      }

      // set options if present
      try {
        if (global.config && global.config.FCAOption && typeof loginApiData.setOptions === 'function') {
          loginApiData.setOptions(global.config.FCAOption);
        }
      } catch (_) {}

      // persist appstate if returned
      try { if (typeof loginApiData.getAppState === 'function' && appStateFile) writeFileSync(appStateFile, JSON.stringify(loginApiData.getAppState(), null, '\t')); } catch(e){}

      global.client.api = loginApiData;
      global.client.timeStart = Date.now();
      global.config.version = global.config.version || '1.0.0';

      /* ---- load commands ---- */
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
            delete require.cache[require.resolve(modulePath)];
            const module = require(modulePath);
            if (!module.config || !module.run || !module.config.name) throw new Error('Invalid command format');

            if (global.client.commands.has(module.config.name || '')) throw new Error('command name duplicate');

            if (module.config.dependencies && typeof module.config.dependencies === 'object') {
              for (const dep in module.config.dependencies) {
                try {
                  if (!global.nodemodule.hasOwnProperty(dep)) {
                    global.nodemodule[dep] = tryRequireOrInstall(dep, module.config.name);
                  }
                } catch (errDep) {
                  throw new Error(`Failed to load dependency ${dep}: ${errDep.message || errDep}`);
                }
              }
              logger(`Dependencies loaded for ${module.config.name}`, 'loader');
            }

            if (module.config.envConfig) {
              for (const envConfig in module.config.envConfig) {
                if (typeof global.configModule[module.config.name] === 'undefined') global.configModule[module.config.name] = {};
                if (typeof global.config[module.config.name] === 'undefined') global.config[module.config.name] = {};
                if (typeof global.config[module.config.name][envConfig] !== 'undefined') {
                  global.configModule[module.config.name][envConfig] = global.config[module.config.name][envConfig];
                } else {
                  global.configModule[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
                }
              }
              logger(`Loaded config for ${module.config.name}`, 'loader');
            }

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

      /* ---- load events ---- */
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
            delete require.cache[require.resolve(modulePath)];
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

      /* finish */
      logger(`Finish load modules: Commands=${global.client.commands.size}, Events=${global.client.events.size}`, 'loader');
      logger(`Startup time: ${Date.now() - global.client.timeStart}ms`, 'loader');

      /* persist final config and cleanup .temp */
      try {
        writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');
        if (existsSync(global.client.configPath + '.temp')) unlinkSync(global.client.configPath + '.temp');
      } catch (e) {}

      /* includes listener (if available) */
      try {
        const listenerData = { api: loginApiData, models };
        const listenModule = require('./includes/listen');
        if (typeof listenModule === 'function') {
          const listener = listenModule(listenerData);
          const listenerCallback = (error, message) => {
            if (error) return logger(global.getText ? global.getText('rxabdullah', 'handleListenError', JSON.stringify(error)) : ('Listen error: ' + JSON.stringify(error)), 'error');
            if (['presence', 'typ', 'read_receipt'].some(x => x === message.type)) return;
            if (global.config.DeveloperMode === true) console.log('INCOMING MESSAGE:', message);
            return listener(message);
          };

          if (typeof loginApiData.listenMqtt === 'function') {
            global.handleListen = loginApiData.listenMqtt(listenerCallback);
          } else if (typeof loginApiData.listen === 'function') {
            global.handleListen = loginApiData.listen(listenerCallback);
          } else {
            logger('API does not provide a listen method; listener not attached', 'warn');
          }
        } else {
          logger('includes/listen did not export a function; skipping listener', 'warn');
        }
      } catch (e) {
        logger('Listen module not loaded: ' + (e.message || e), 'warn');
      }

      /* check global ban */
      try {
        await checkBan(loginApiData);
      } catch (e) {
        logger('checkBan failed: ' + (e.message || e), 'warn');
      }

      // final logs
      logger('Bot started successfully', 'success');
    });
  } catch (e) {
    logger('Fatal error during login: ' + (e && e.message ? e.message : e), 'error');
  }
}

/* ---------------------------
   Connect to DB then start onBot
   --------------------------- */
(async () => {
  try {
    if (sequelize && typeof sequelize.authenticate === 'function') {
      await sequelize.authenticate();
      const authentication = { Sequelize, sequelize };
      let models = {};
      try {
        models = require('./includes/database/model')(authentication);
      } catch (e) {
        logger('DB models loader failed: ' + (e.message || e), 'warn');
      }
      logger('Database connected successfully', '[ DATABASE ]');
      onBot({ models });
    } else {
      logger('No DB connection available — starting without DB', '[ DATABASE ]');
      onBot({ models: {} });
    }
  } catch (err) {
    logger('Database connection failed: ' + (err && err.message ? err.message : err), '[ DATABASE ]');
    onBot({ models: {} });
  }

  console.log(chalk.bold.hex('#eff1f0')('================== SUCCESFULLY ====================='));
})();

/* ---------------------------
   unhandled handlers
   --------------------------- */
process.on('unhandledRejection', (reason, p) => {
  logger('Unhandled Rejection: ' + (reason && reason.stack ? reason.stack : reason), 'error');
});
process.on('uncaughtException', err => {
  logger('Uncaught Exception: ' + (err && err.stack ? err.stack : err), 'error');
  // optionally process.exit(1) or restarting logic could be added here
});
