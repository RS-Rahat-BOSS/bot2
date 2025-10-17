/**
 * =====================================
 * 🔰 RAHAT_ISLAM Bot Main File (Render Fix)
 * Compatible with Render, Replit, Railway, etc.
 * =====================================
 */

const express = require('express');
const http = require('http');
const chalk = require('chalk');
const moment = require('moment-timezone');
const axios = require('axios');
const { 
  readdirSync, readFileSync, writeFileSync, 
  existsSync, mkdirSync 
} = require('fs-extra');
const { join, resolve } = require('path');
const { execSync } = require('child_process');
const logger = require('./utils/log');
const login = require('cyber-fca');
const builtinModules = require('module').builtinModules || [];

// ==================== STARTUP LOG ====================
const BOT_BANNER = `
██████████████████████████████████████████████████
⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
     🔰 𝙍𝘼𝙃𝘼𝙏_𝙄𝙎𝙇𝘼𝙈 🔰
⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡
██████████████████████████████████████████████████
==> Bot system initialized successfully!
`;

console.log(chalk.bold.hex('#00ffff')(BOT_BANNER));
logger('🚀 System Starting...', 'INIT');

// ==================== GLOBAL VARIABLES ====================
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
global.language = {};
global.moduleData = [];

// ==================== LOAD CONFIG ====================
try {
  global.client.configPath = join(global.client.mainPath, 'config.json');
  const configValue = require(global.client.configPath);
  global.config = configValue;
  logger('✅ Config file loaded successfully!', 'CONFIG');
} catch (err) {
  logger('❌ config.json missing or invalid: ' + err.message, 'ERROR');
  process.exit(1);
}

// ==================== EXPRESS SERVER ====================
const app = express();
app.get('/', (req, res) => {
  res.send('🔰 Bot Server Active — Powered by RAHAT_ISLAM');
});

// ⚙️ FIXED: Render auto PORT support
const PORT = process.env.PORT || global.config.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
  logger(`🌍 Express server running on PORT: ${PORT}`, 'SERVER');
});

// ==================== APPSTATE LOGIN ====================
let appStateFile, appState;
try {
  appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || 'appstate.json'));
  appState = require(appStateFile);
  logger('✅ appstate.json found successfully!', 'LOGIN');
} catch {
  logger('⚠️ appstate.json not found — please upload it.', 'ERROR');
}

// ==================== MODULE INSTALLER ====================
function tryRequireOrInstall(name) {
  try {
    if (builtinModules.includes(name)) return require(name);
    return require(name);
  } catch {
    logger(`📦 Installing missing module: ${name}`, 'INSTALL');
    execSync(`npm install ${name} --force`, { stdio: 'inherit' });
    return require(name);
  }
}

// ==================== BOT START FUNCTION ====================
function onBot({ models }) {
  login({ appState }, async (err, api) => {
    if (err) return logger('❌ Login failed: ' + JSON.stringify(err), 'LOGIN');

    global.client.api = api;
    global.client.timeStart = Date.now();
    api.setOptions(global.config.FCAOption || {});

    writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, 2));

    // 🧠 Load Commands
    const cmdPath = join(global.client.mainPath, 'Script', 'commands');
    const files = existsSync(cmdPath) ? readdirSync(cmdPath).filter(f => f.endsWith('.js')) : [];
    for (const file of files) {
      try {
        const mod = require(join(cmdPath, file));
        global.client.commands.set(mod.config.name, mod);
        logger(`⚙️ Command Loaded: ${mod.config.name}`, 'COMMAND');
      } catch (e) {
        logger(`❌ Failed to load ${file}: ${e.message}`, 'ERROR');
      }
    }

    // 🛰️ Start Listener
    try {
      const listen = require('./includes/listen')({ api, models });
      global.handleListen = api.listenMqtt((err, msg) => {
        if (err) return logger('⚠️ Listen error: ' + err, 'LISTENER');
        if (!['presence', 'typ', 'read_receipt'].includes(msg.type)) listen(msg);
      });
    } catch (e) {
      logger('❌ Listener failed: ' + e.message, 'LISTENER');
    }

    logger(`✅ Bot Ready | Total Commands: ${global.client.commands.size}`, 'READY');
  });
}

// ==================== DATABASE CONNECTION ====================
(async () => {
  try {
    const { Sequelize, sequelize } = require('./includes/database');
    await sequelize.authenticate();
    const models = require('./includes/database/model')({ Sequelize, sequelize });
    logger('💾 Database connected successfully!', 'DATABASE');
    onBot({ models });
  } catch {
    logger('⚠️ Database unavailable, starting bot without DB...', 'DATABASE');
    onBot({ models: {} });
  }
})();

// ==================== ERROR HANDLERS ====================
process.on('unhandledRejection', (reason) => logger('🚨 Unhandled: ' + reason, 'ERROR'));
process.on('uncaughtException', (err) => logger('🔥 Uncaught Exception: ' + err.message, 'ERROR'));
