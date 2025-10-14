const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "help",
    version: "5.0.0",
    hasPermssion: 0,
    credits: "SHAHADAT SAHU (Re-Enhanced by Rahat Islam)",
    description: "Show command list with animated progress and modern design",
    commandCategory: "system",
    usages: "[command name/category/page]",
    cooldowns: 5,
    envConfig: {
        autoUnsend: false,
        delayUnsend: 180
    }
};

module.exports.languages = {
    "en": {
        "moduleInfo": `╭──────────◊
│ ✨ 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎 ✨
│━━━━━━━━━━━━━━━━
│ 🔖 Name: %1
│ 📄 Usage: %2
│ 📜 Description: %3
│ 🔑 Permission: %4
│ 👨‍💻 Credit: %5
│ 📂 Category: %6
│ ⏳ Cooldown: %7s
│━━━━━━━━━━━━━━━━
│ ⚙ Prefix: %8
│ 🤖 Bot Name: %9
│👑 Owner👉 m.me/61561511477968
╰──────────◊`,
        "helpList": "[ There are %1 commands. Use: \"%2help commandName\" to view more. ]"
    }
};

// ✅ help.gif path
const videoPath = path.resolve("help.gif");
function getVideoAttachment() {
    return fs.existsSync(videoPath) ? [fs.createReadStream(videoPath)] : [];
}

// ============================
// 🔹 handleEvent (help command reply shortcut)
// ============================
module.exports.handleEvent = function ({ api, event, getText }) {
    const { commands } = global.client;
    const { threadID, messageID, body } = event;

    if (!body || !body.startsWith("help")) return;
    const args = body.trim().split(/\s+/);
    if (args.length < 2 || !commands.has(args[1].toLowerCase())) return;

    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const command = commands.get(args[1].toLowerCase());
    const prefix = threadSetting.PREFIX || global.config.PREFIX;

    const detail = getText("moduleInfo",
        command.config.name,
        command.config.usages || "Not Provided",
        command.config.description || "Not Provided",
        command.config.hasPermssion,
        command.config.credits || "Unknown",
        command.config.commandCategory || "Unknown",
        command.config.cooldowns || 0,
        prefix,
        global.config.BOTNAME || "🔰𝗥𝗮𝗵𝗮𝘁_𝗕𝗼𝘁🔰"
    );

    api.sendMessage({ body: detail, attachment: getVideoAttachment() }, threadID, messageID);
};

// ============================
// 🔹 run (animated loading + main help)
// ============================
module.exports.run = async function({ api, event, args, getText }) {
    const { commands } = global.client;
    const { threadID, messageID } = event;
    const threadSetting = global.data.threadData.get(parseInt(threadID)) || {};
    const prefix = threadSetting.PREFIX || global.config.PREFIX;

    // ⏳ Smooth Loading Effect
    api.sendMessage("▒▒▒▒▒▒▒▒▒▒ 0% ✨", threadID, async (err, info) => {
        if (err) return console.error(err);
        const progressMsgID = info.messageID;

        let step = 0;
        const interval = 150;
        const progressBarLength = 10;

        const progressInterval = setInterval(() => {
            step += 1;
            if (step > 10) {
                clearInterval(progressInterval);
                setTimeout(() => {
                    api.unsendMessage(progressMsgID);
                    sendHelpInfo(api, threadID, messageID, args, getText, prefix, commands);
                }, 800);
                return;
            }

            const filled = "█".repeat(step);
            const empty = "▒".repeat(progressBarLength - step);
            const spark = step % 2 === 0 ? "✨" : "💎";
            const percent = step * 10;

            api.editMessage(`${filled}${empty} ${percent}% ${spark}`, progressMsgID, threadID);
        }, interval);
    });
};

// ============================
// 🔹 Core Help Message Builder
// ============================
function sendHelpInfo(api, threadID, messageID, args, getText, prefix, commands) {
    // যদি কোনো নির্দিষ্ট কমান্ড চাওয়া হয়
    if (args[0] && commands.has(args[0].toLowerCase())) {
        const command = commands.get(args[0].toLowerCase());
        const detailText = getText("moduleInfo",
            command.config.name,
            command.config.usages || "Not Provided",
            command.config.description || "Not Provided",
            command.config.hasPermssion,
            command.config.credits || "Unknown",
            command.config.commandCategory || "Unknown",
            command.config.cooldowns || 0,
            prefix,
            global.config.BOTNAME || "🔰𝗥𝗮𝗵𝗮𝘁_𝗕𝗼𝘁🔰"
        );

        return api.sendMessage({ body: detailText, attachment: getVideoAttachment() }, threadID, messageID);
    }

    // ✅ সব কমান্ড নাও
    const allCommands = Array.from(commands.values());
    const grouped = {};

    for (const cmd of allCommands) {
        const cat = (cmd.config.commandCategory || "Others").toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(cmd.config.name);
    }

    // 🧩 Modern Design Message
    let text = `┃━━━━━━━━━━━━━━━━┫
┃  🔰 ${global.config.BOTNAME || "𝗥𝗮𝗵𝗮𝘁_𝗕𝗼𝘁"} 🔰
┃📜 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐋𝐈𝐒𝐓 📜
┣━━━━━━━━━━━━━━━━┫\n`;

    for (const [category, cmds] of Object.entries(grouped)) {
        text += `\n╭─ ${category} (${cmds.length})\n`;
        text += `│ ✦ ${cmds.join(" ✦ ")}\n`;
        text += `╰───────────────────◊\n`;
    }

    text += `
╭─────────────◊
│⚙ Prefix:👉🏻${prefix}
│👑 Owner👉 m.me/61581900625860
│「 🔰𝗥𝗮𝗵𝗮𝘁_𝗕𝗼𝘁🔰 」
╰─────────────◊ `;

    api.sendMessage({ body: text, attachment: getVideoAttachment() }, threadID, (err, info) => {
        if (err) return console.error(err);
        const { autoUnsend, delayUnsend } = module.exports.config.envConfig;
        if (autoUnsend) setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000);
    }, messageID);
}
