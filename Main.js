// ==================== DEPENDENCIES ====================
const moment = require('moment-timezone');
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, rm } = require('fs-extra');
const { join, resolve } = require('path');
const { execSync } = require('child_process');
const logger = require('./utils/logger');
const login = require('./utils/login');
const axios = require('axios');

const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listBuiltinModules = require('module').builtinModules;

// ASCII Banner of the Bot
const BOT_ART =
`𝐓 𝐁𝐎𝐓  
𝐎𝐖𝐍𝐄𝐑 𝐒𝐇𝐀𝐇𝐀𝐃𝐀𝐓 𝐂𝐇𝐀𝐇𝐔 
╔═══╗██╗░░██╗██╗███████╗
║╔══╝██║░░██║██║██╔════╝
║╚══╗██║░░██║██║█████╗░░
╚═══╝██║░░██║██║██╔══╝░░
░░░░░╚██████╔╝██║██║░░░░░
░░░░░░╚═════╝░╚═╝╚═╝░░░░░`;

// =========== GLOBALS ===========
global.bot = {
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleSchedule: [],
    handleReaction: [],
    handleReply: [],
    mainPath: process.cwd(),
    configPath: "",
    getTime: function(type) {
        // For convenience, handles time strings like 'seconds', 'minutes', etc
        switch (type) {
            case 'seconds': return moment.tz('Asia/Dhaka').format('ss');
            case 'minutes': return moment.tz('Asia/Dhaka').format('mm');
            case 'hours':   return moment.tz('Asia/Dhaka').format('HH');
            case 'days':    return moment.tz('Asia/Dhaka').format('DD');
            case 'months':  return moment.tz('Asia/Dhaka').format('MM');
            case 'fullYear':return moment.tz('Asia/Dhaka').format('YYYY');
            case 'fullTime':return moment.tz('Asia/Dhaka').format('HH:mm:ss');
            case 'fullDate':return moment.tz('Asia/Dhaka').format('DD/MM/YYYY');
            case 'dateTime':return moment.tz('Asia/Dhaka').format('HH:mm:ss DD/MM/YYYY');
        }
    }
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

global.models = require('./includes/models/index.js');
global.cache = {};
global.config = {};
global.language = {};
global.events = [];
global.languages = {};

// ============= LOAD CONFIG =============
let configValue;
try {
    global.bot.configPath = join(global.bot.mainPath, 'config.json');
    configValue = require(global.bot.configPath);
    logger.info('Config loaded successfully!');
} catch {
    if (existsSync(global.bot.configPath.replace(/\.json/g, '') + ".json")) {
        configValue = readFileSync(global.bot.configPath.replace(/\.json/g, '') + ".json");
        configValue = JSON.parse(configValue);
        logger.info('Loaded config: ' + (global.bot.configPath.replace(/\.json/g, '') + ".json"));
    } else {
        logger.error('config.json not found!', 'ERROR');
        return;
    }
}
try {
    for (const key in configValue) global.config[key] = configValue[key];
    logger.info('Loaded all config keys!');
} catch {
    logger.error('Failed to load config keys!', 'ERROR');
    return;
}

// ============= SETUP DATABASE =============
const { Sequelize, sequelize } = require('./includes/database');

writeFileSync(
    global.bot.configPath + ".json",
    JSON.stringify(global.config, null, 4),
    'utf-8'
);

// ============= LOAD LANGUAGE =============
const langFile = readFileSync(
    __dirname + '/languages/' + (global.config.language || 'en') + '.lang',
    { encoding: 'utf-8' }
).split(/\r?\n|\r/);

const langData = langFile.filter(line =>
    line.indexOf('#') !== 0 && line !== ''
);
for (const item of langData) {
    const eqIdx = item.indexOf('=');
    let itemKey = item.slice(0, eqIdx);
    let itemValue = item.slice(eqIdx + 1, item.length);

    const dotIdx = itemKey.indexOf('.');
    let head = itemKey.slice(0, dotIdx);
    let key = itemKey.replace(head + '.', '');
    let value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.languages[head] == "undefined") global.languages[head] = {};
    global.languages[head][key] = value;
}

// ============= LANGUAGE GET FUNCTION =============
global.getText = function (section, key, ...params) {
    if (!global.languages.hasOwnProperty(section))
        throw __filename + ': Cannot find language section: ' + section;
    let resultString = global.languages[section][key];
    for (let i = params.length - 1; i >= 0; i--) {
        const regex = new RegExp('%' + i, 'g');
        resultString = resultString.replace(regex, params[i]);
    }
    return resultString;
};

// ============= LOAD APPSTATE (Facebook) =============
let appStateFile, appState;
try {
    appStateFile = resolve(join(
        global.bot.mainPath,
        global.config.APPSTATEPATH || 'appstate.json'
    ));
    appState = require(appStateFile);
    logger.info(global.getText('login', 'successAppState'));
} catch {
    logger.error(global.getText('login', 'notFoundAppState'), 'ERROR');
    return;
}


// ============= BOT STARTUP FUNCTION =============
async function onBot({ models }) {
    // Handles loading and registering plugin commands, events, etc
    await login({ appState }, async (loginErr, api) => {
        if (loginErr) {
            logger.error(JSON.stringify(loginErr), 'ERROR');
            return;
        }
        api.setOptions(global.config.FCAOption);
        writeFileSync(appStateFile, JSON.stringify(api.getAppState(), null, '\t'));

        // Store current api
        global.bot.client = api;
        global.config.fullTime = moment.tz('Asia/Dhaka').format('HH:mm:ss DD/MM/YYYY');
        global.bot.timeStart = new Date().getTime();

        // Load Commands
        const commandFiles = readdirSync(join(global.bot.mainPath, 'commands'))
            .filter(filename => filename.endsWith('.js')
                && !filename.startsWith('_')
                && !global.config.commandDisabled.includes(filename));
        for (const filename of commandFiles) {
            try {
                const commandModule = require(join(global.bot.mainPath, 'commands', filename));
                // Validate module
                if (
                    !commandModule.config ||
                    !commandModule.run ||
                    !commandModule.config.name
                ) throw new Error(global.getText('plugins', 'cantOnloadModule'));

                if (global.bot.commands.has(commandModule.config.name || '')) throw new Error(global.getText('plugins', 'nameExist'));

                // Validate properties
                if (
                    !commandModule.onLoad ||
                    typeof commandModule.onLoad !== 'function' ||
                    Object.keys(commandModule.onLoad).length == 0
                ) logger.warn(global.getText('plugins', 'cantOnload', commandModule.config.name), 'WARNING');

                // Load dependencies
                if (
                    commandModule.config.dependencies &&
                    typeof commandModule.config.dependencies === 'object'
                ) {
                    for (const dep in commandModule.config.dependencies) {
                        const depPath = join(__dirname, 'includes', 'nodemodules', dep);
                        try {
                            if (!global.cache.hasOwnProperty(dep)) {
                                if (listPackage.hasOwnProperty(dep) || listBuiltinModules.includes(dep)) {
                                    global.cache[dep] = require(dep);
                                } else {
                                    global.cache[dep] = require(depPath);
                                }
                            }
                        } catch {
                            let loaded = false, depErr;
                            logger.warn(
                                global.getText('plugins', 'cantInstal', dep, commandModule.config.name),
                                'WARNING'
                            );
                            execSync('npm install ' + dep +
                                (commandModule.config.dependencies[dep] === '*' ||
                                 commandModule.config.dependencies[dep] === '' ? '' :
                                  '@' + commandModule.config.dependencies[dep]
                                ), { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'includes') }
                            );

                            for (let i = 0; i < 5; i++) {
                                try {
                                    require.cache = {};
                                    if (listPackage.hasOwnProperty(dep) || listBuiltinModules.includes(dep)) {
                                        global.cache[dep] = require(dep);
                                    } else {
                                        global.cache[dep] = require(depPath);
                                    }
                                    loaded = true;
                                    break;
                                } catch (err) {
                                    depErr = err;
                                }
                                if (loaded && !depErr) break;
                            }
                            if (!loaded && depErr)
                                throw global.getText('plugins', 'failLoadModule', dep, commandModule.config.name, depErr);
                        }
                    }
                    logger.info(global.getText('plugins', 'successLoadModule', commandModule.config.name));
                }

                if (commandModule.config.eventRegistered)
                    global.bot.eventRegistered.push(commandModule.config.name);

                global.bot.commands.set(commandModule.config.name, commandModule);
                logger.info(global.getText('plugins', 'finishLoadModule', commandModule.config.name));
            } catch (err) {
                logger.error(
                    global.getText('plugins', 'cantOnloadModule', err, filename),
                    'ERROR'
                );
            }
        }

        // Load Events
        const eventFiles = readdirSync(join(global.bot.mainPath, 'events'))
            .filter(filename => filename.endsWith('.js') && !global.config.eventDisabled.includes(filename));
        for (const filename of eventFiles) {
            try {
                const eventModule = require(join(global.bot.mainPath, 'events', filename));
                if (!eventModule.config || !eventModule.run)
                    throw new Error(global.getText('plugins', 'cantOnloadModule'));
                if (global.bot.events.has(eventModule.config.name || ''))
                    throw new Error(global.getText('plugins', 'nameExist'));
                if (
                    eventModule.config.dependencies &&
                    typeof eventModule.config.dependencies === 'object'
                ) {
                    for (const dep in eventModule.config.dependencies) {
                        const depPath = join(__dirname, 'includes', 'nodemodules', dep);
                        try {
                            if (!global.cache.hasOwnProperty(dep)) {
                                if (listPackage.hasOwnProperty(dep) || listBuiltinModules.includes(dep)) {
                                    global.cache[dep] = require(dep);
                                } else {
                                    global.cache[dep] = require(depPath);
                                }
                            }
                        } catch {
                            let loaded = false, depErr;
                            logger.warn(
                                global.getText('plugins', 'cantInstal', dep, eventModule.config.name),
                                'WARNING'
                            );
                            execSync('npm install ' + dep +
                                (eventModule.config.dependencies[dep] === '*' ||
                                 eventModule.config.dependencies[dep] === '' ? '' :
                                  '@' + eventModule.config.dependencies[dep]
                                ), { stdio: 'inherit', env: process.env, shell: true, cwd: join(__dirname, 'includes') });
                            for (let i = 0; i < 5; i++) {
                                try {
                                    require.cache = {};
                                    if (listPackage.hasOwnProperty(dep) || listBuiltinModules.includes(dep)) {
                                        global.cache[dep] = require(dep);
                                    } else {
                                        global.cache[dep] = require(depPath);
                                    }
                                    loaded = true;
                                    break;
                                } catch (err) {
                                    depErr = err;
                                }
                                if (loaded && !depErr) break;
                            }
                            if (!loaded && depErr)
                                throw global.getText('plugins', 'failLoadModule', dep, eventModule.config.name, depErr);
                        }
                    }
                    logger.info(global.getText('plugins', 'successLoadModule', eventModule.config.name));
                }
                global.bot.events.set(eventModule.config.name, eventModule);
                logger.info(global.getText('plugins', 'finishLoadModule', eventModule.config.name));
            } catch (err) {
                logger.error(global.getText('plugins', 'failLoadModule', err, filename), 'ERROR');
            }
        }

        // SHOW ASCII ART AND BOOT TIMINGS
        console.log(BOT_ART);
        logger.info(
            global.getText('startup', 'Found', global.bot.commands.size, global.bot.events.size)
        );
        logger.info(
            "Startup time: " +
            ((Date.now() - global.bot.timeStart) / 1000).toFixed(2) +
            "s"
        );

        writeFileSync(global.bot.configPath, JSON.stringify(global.config, null, 4), 'utf-8');
        unlinkSync(global.bot.configPath + '.temp');

        // Handle listen handler
        const listenHandler = require('./includes/listen.js')({
            client: api,
            models: models
        });

        // Event Dispatcher
        function eventDispatcher(err, event) {
            if (err) {
                logger.error(global.getText('plugins', 'errorFormat', JSON.stringify(err)), 'ERROR');
                return;
            }
            // Optionally filter system events or logs
            if (["presence", "read_receipt", "typ"].includes(event.type))
                return;
            if (global.config.showLogs)
                console.log(event);
            return listenHandler(event);
        }
        global.listenHandler = api.listen(eventDispatcher);

        // Ban checks
        try {
            await checkBan(api);
        } catch (e) { }

        // Fallback if database is missing
        if (!global.models) {
            logger.error(global.getText('startup', 'notFoundDatabase'), 'ERROR');
        }
    });
}

// ============= INIT DATABASE & START BOT =============
(async () => {
    try {
        await sequelize.authenticate();
        const models = { Sequelize, sequelize };
        const dbInit = require('./includes/models/index.js')(models);
        logger.info(global.getText('startup', 'successConnectDB'), 'SUCCESS');
        await onBot({ models: dbInit });
    } catch (err) {
        logger.error(global.getText('startup', 'notFoundDatabase', JSON.stringify(err)), 'ERROR');
    }
})();

// Handle unhandled rejections
process.on('unhandledRejection', (_err, _promise) => {});
