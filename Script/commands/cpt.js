const fs = require("fs-extra");
const request = require("request");
const path = require("path");

module.exports.config = {
  name: "welcome",
  version: "1.0.2",
  hasPermssion: 0,
  credits: "SHAHADAT SAHU + Rahat Islam Edit",
  description: "Auto welcome when only prefix is typed",
  commandCategory: "system",
  usages: "prefix only",
  cooldowns: 5
};

module.exports.handleEvent = async function ({ api, event }) {
  if (!event.body) return;

  const body = event.body.trim();
  let prefixes = ['/'];

  // 🔹 বটের prefix কনফিগ পড়ে
  if (global.config && global.config.PREFIX) {
    prefixes = Array.isArray(global.config.PREFIX)
      ? global.config.PREFIX
      : [global.config.PREFIX];
  }

  // 🔹 শুধুমাত্র prefix বা prefix+space হলে
  const isPrefixOnly = prefixes.some(pfx =>
    body === pfx || body.replace(new RegExp(`^${escapeRegExp(pfx)}`), "").trim() === ""
  );

  if (!isPrefixOnly) return; // অন্য কিছু টাইপ করলে কিছু না

  // ✅ র‍্যান্ডম টেক্সট ও ইমেজ পাঠানো
  const messages = [
    `🌸 Assalamu Alaikum, dear member! 🌸\n\n✨ Welcome to the bot! 🎉\n\n📜 ${prefixes[0]}help ➤ View all commands\n🤖 ${prefixes[0]}baby ➤ Auto Chat\nℹ️ ${prefixes[0]}info ➤ Bot Info\n\n💝 Have fun and enjoy!`,
    `🌼 আসসালামু আলাইকুম 🌼\n\n"${prefixes.join('" বা "')}" পিফিক্স দিয়ে কমান্ড লিখলে বট কাজ করবে!\n\n💡 ${prefixes[0]}help ➤ কমান্ড লিস্ট\n✨ ${prefixes[0]}info ➤ বট তথ্য`
  ];

  const images = [
    "https://i.imgur.com/pB7HjPS.jpeg",
    "https://i.imgur.com/J5AT5tH.jpeg"
  ];

  const text = messages[Math.floor(Math.random() * messages.length)];
  const img = images[Math.floor(Math.random() * images.length)];

  const imgPath = path.join(__dirname, "prefix_welcome.jpg");

  request(img)
    .pipe(fs.createWriteStream(imgPath))
    .on("close", () => {
      api.sendMessage(
        { body: text, attachment: fs.createReadStream(imgPath) },
        event.threadID,
        () => fs.unlinkSync(imgPath)
      );
    });
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
