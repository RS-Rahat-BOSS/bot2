const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "welcome",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "SHAHADAT SAHU",
  description: "Sends a random welcome/info message when user types the bot prefix alone",
  commandCategory: "system",
  usages: "/ (or any prefix)",
  cooldowns: 5,
  dependencies: {
    request: "",
    "fs-extra": "",
    axios: ""
  }
};

module.exports.run = async function({ api, event }) {
  try {
    // get user message
    const body = (event && event.body) ? String(event.body) : "";
    const trimmed = body.trim();

    // Accept prefix from global.config.PREFIX (string or array).
    // Fallback to ['/'] if not set.
    let prefixes = ['/'];
    if (global && global.config && typeof global.config.PREFIX !== "undefined") {
      if (Array.isArray(global.config.PREFIX)) prefixes = global.config.PREFIX.map(String);
      else prefixes = [String(global.config.PREFIX)];
    }

    // Helper: does the message equal ANY prefix (or prefix + spaces)?
    const isPrefixMessage = prefixes.some(pfx => {
      if (!pfx) return false;
      // exact match
      if (trimmed === pfx) return true;
      // prefix + spaces (e.g. "+ " or "/   ")
      if (trimmed.replace(new RegExp(`^${escapeRegExp(pfx)}`), "").trim() === "") return true;
      return false;
    });

    if (!isPrefixMessage) {
      // not a plain-prefix message -> do nothing here
      return;
    }

    // --- If here: user typed the prefix alone -> send random welcome/info with image ---

    // texts (you can add or edit)
    const messageList = [
      `🌸 Assalamu Alaikum! 🌸\n\n✨ Welcome to the bot! 🎉\n\n📜 help ➤ View all commands\n🤖 baby ➤ Auto Chat\nℹ️ info ➤ About the bot\n\n💡 Pro Tip: Use the bot prefix before commands!\n🎊 Have fun and enjoy using my bot! 💝`,
      `🌼 আসসালামু আলাইকুম!\n\nবট-এ স্বাগতম।\n\n"${prefixes.join('" বা "')} " যেটাই পিফিক্স ব্যবহার করো, সেটার পরে কমান্ড টাইপ করো।\n\n💡 সাহায্যের জন্য টাইপ করো: ${prefixes[0]}help\n`
    ];

    // image links (update as you like)
    const imageLinks = [
      "https://i.imgur.com/pB7HjPS.jpeg",
      "https://i.imgur.com/J5AT5tH.jpeg"
    ];

    const randomText = messageList[Math.floor(Math.random() * messageList.length)];
    const randomImg = imageLinks[Math.floor(Math.random() * imageLinks.length)];

    const imgPath = path.join(__dirname, "/cpt.jpg");
    const req = request(randomImg);
    const writeStream = fs.createWriteStream(imgPath);

    req.pipe(writeStream).on("close", () => {
      api.sendMessage(
        {
          body: randomText,
          attachment: fs.createReadStream(imgPath)
        },
        event.threadID,
        () => {
          // cleanup
          try { fs.unlinkSync(imgPath); } catch (e) {}
        }
      );
    }).on("error", err => {
      // If image download fails, still send text
      api.sendMessage({ body: randomText }, event.threadID);
    });

  } catch (err) {
    // avoid crashing the bot
    console.error("welcome command error:", err);
  }
};

// small util to escape RegExp special chars
function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
