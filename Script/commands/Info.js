const fs = require("fs-extra");
const moment = require("moment-timezone");
const path = require("path");

module.exports.config = {
 name: "info",
 version: "1.0.1",
 hasPermssion: 0,
 credits: "𝐒𝐡𝐚𝐡𝐚𝐝𝐚𝐭 𝐈𝐬𝐥𝐚𝐦 + GPT-5",
 description: "Show Owner Info",
 commandCategory: "info",
 usages: "info",
 cooldowns: 2
};

module.exports.run = async function({ api, event }) {
  const time = moment().tz("Asia/Dhaka").format("DD/MM/YYYY hh:mm:ss A");

  // লোকাল GIF ফাইলের অবস্থান (index.js, main.js যেখানে আছে)
  const gifPath = path.join(__dirname, "../../Info.gif"); 
  // ↑ প্রয়োজনে এক ধাপ কম বা বেশি দাও (যেমন "../Info.gif" বা "../../../Info.gif") 
  // নির্ভর করছে info.js ফাইলটা কোন ফোল্ডারে আছে তার উপর।

  // ফাইল আছে কিনা চেক
  if (!fs.existsSync(gifPath)) {
    return api.sendMessage("⚠️ Info.gif ফাইল খুঁজে পাওয়া যায়নি! দয়া করে মূল ফোল্ডারে রাখো।", event.threadID);
  }

  const message = {
    body: `
┏━━━━━━━━━━━━━━━┓
┃   🌟 𝗢𝗪𝗡𝗘𝗥 𝗜𝗡𝗙𝗢 🌟    
┣━━━━━━━━━━━━━━━┫
┃👤 𝗡𝗔𝗠𝗘      : 🔰𝗥𝗔𝗛𝗔𝗧🔰
┃🚹 𝗚𝗘𝗡𝗗𝗘𝗥    : 𝗠𝗔𝗟𝗘
┃🎂 𝗔𝗚𝗘       : 16
┃🕌 𝗥𝗘𝗟𝗜𝗚𝗜𝗢𝗡 : 𝗜𝗦𝗟𝗔𝗠
┃🏫 𝗘𝗗𝗨𝗖𝗔𝗧𝗜𝗢𝗡 : বয়ড়া ইসরাইল 
┃🏡 𝗔𝗗𝗗𝗥𝗘𝗦𝗦 : জামালপুর, বাংলাদেশ 
┣━━━━━━━━━━━━━━━┫
┃𝗧𝗜𝗞𝗧𝗢𝗞 : @where.is.she15
┃📢 𝗧𝗘𝗟𝗘𝗚𝗥𝗔𝗠 : আছে 🥴🤪
┃🌐 𝗙𝗔𝗖𝗘𝗕𝗢𝗢𝗞 : বায়ো-তে আছে
┣━━━━━━━━━━━━━━━┫
┃ 🕒 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 𝗧𝗜𝗠𝗘: ${time}
┗━━━━━━━━━━━━━━━┛ `,
    attachment: fs.createReadStream(gifPath)
  };

  api.sendMessage(message, event.threadID);
};
