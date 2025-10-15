const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "welcome",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "SHAHADAT SAHU",
  description: "Sends a random welcome or info message with a random picture",
  commandCategory: "system",
  usages: "/",
  cooldowns: 5,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: ""
  }
};

module.exports.run = async function({ api, event }) {
  const prefix = global.config.PREFIX || "/";
  const requestLib = global.nodemodule["request"];
  const fsExtra = global.nodemodule["fs-extra"];

  // ✨ Message text
  const messageList = [
    `🌸 Assalamu Alaikum, dear member! 🌸
✨ Welcome to the bot! 🎉

📜 help ➤ View all commands
🤖 baby ➤ Automatic Chat
ℹ️ info ➤ About the bot

💡 Pro Tip: Use "${prefix}" before all commands!
🎊 Have fun and enjoy using my bot! 💝`,

    `🌼 Assalamu Alaikum! 🌺
Welcome to my bot.
You can explore, learn, and have fun! 🎉

💡 Type "${prefix}help" to see all commands.
✨ Enjoy your stay!`
  ];

  // Random image links
  const imageLinks = [
    "https://i.imgur.com/X1OPkox.jpg",
    "https://i.imgur.com/fQZhwWg.jpg",
    "https://i.imgur.com/ETDkFyf.jpg",
    "https://i.imgur.com/vr59gnp.jpg",
    "https://i.imgur.com/Ui9PHoY.jpg",
    "https://i.imgur.com/tl6Lt8Y.jpg",
    "https://i.imgur.com/7wZ1Ael.jpg",
    "https://i.imgur.com/CQTzXUN.jpg",
    "https://i.imgur.com/ObLm7Df.jpg",
    "https://i.imgur.com/inxiATH.jpg"
  ];

  // Random select
  const randomText = messageList[Math.floor(Math.random() * messageList.length)];
  const randomImg = imageLinks[Math.floor(Math.random() * imageLinks.length)];

  // Save image temporarily
  const imgPath = path.join(__dirname, "/cpt.jpg");
  requestLib(randomImg)
    .pipe(fsExtra.createWriteStream(imgPath))
    .on("close", () => {
      api.sendMessage(
        {
          body: randomText,
          attachment: fsExtra.createReadStream(imgPath)
        },
        event.threadID,
        () => fsExtra.unlinkSync(imgPath)
      );
    });
};
