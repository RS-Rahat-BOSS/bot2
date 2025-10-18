const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

module.exports.config = {
  name: "juta",
  version: "1.0.5",
  hasPermssion: 0,
  credits: "🔰𝗥𝗮𝗵𝗮𝘁_𝗜𝘀𝗹𝗮𝗺🔰",
  description: "Generate a JUTA frame with the mentioned user's profile photo",
  commandCategory: "🤣Funny🤣",
  usages: "[@mention]",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": "",
    "path": "",
    "canvas": ""
  }
};

module.exports.run = async function ({ api, event }) {
  try {
    const mention = Object.keys(event.mentions || {})[0];
    if (!mention)
      return api.sendMessage("❌ কাকে পায়ের নিচে রাখতে চাও তাকে mention করো😸", event.threadID, event.messageID);

    const mentionName = event.mentions[mention];

    // প্রথমে "Please wait..." পাঠাও
    const wait = await api.sendMessage("⏳Please wait....", event.threadID);

    // Google Drive frame link
    const FILE_ID = "1BZgJHAdFbYZZO5QZim-bbret9HRrDONG";
    const frameUrl = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;

    // Mentioned user's profile
    const mentionUrl = `https://graph.facebook.com/${mention}/picture?width=1024&height=1024&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;

    // Load images
    const [frameImg, mentionImg] = await Promise.all([
      loadImage(frameUrl),
      loadImage(mentionUrl)
    ]);

    // Canvas setup
    const W = 768, H = 1128;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // Draw frame background
    ctx.drawImage(frameImg, 0, 0, W, H);

    // Mentioned profile position & size
    const size = 105;
    const r = size / 2;
    const pos = { x: 409, y: 710 };

    // Circular crop & draw
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x + r, pos.y + r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(mentionImg, pos.x, pos.y, size, size);
    ctx.restore();

    // Save output
    const outPath = path.join(__dirname, "juta_result.png");
    fs.writeFileSync(outPath, canvas.toBuffer("image/png"));

    // Wait message delete
    api.unsendMessage(wait.messageID);

    // Send result
    await api.sendMessage({
      body: `${mentionName} বেশি লাফালাফির কারণে তোকে পায়ের নিচে রাখা হলো👻`,
      mentions: [{ tag: mentionName, id: mention }],
      attachment: fs.createReadStream(outPath)
    }, event.threadID, event.messageID);

    // Delete temp file
    fs.unlinkSync(outPath);

  } catch (err) {
    console.error(err);
    api.sendMessage("⚠️সমস্যা হচ্ছে", event.threadID, event.messageID);
  }
};
