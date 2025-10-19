const cfg = require("../../../config/spamConfig");

module.exports.config = {
  name: "spam",
  version: "2.2.0",
  hasPermssion: 0,
  credits: "GPT Modified by SHAHADAT SAHU",
  description: "গ্রুপে স্প্যাম বা গ্রুপ লিংক পাঠালে স্বয়ংক্রিয়ভাবে কিক বা ব্যান করে।",
  commandCategory: "system",
  eventType: ["message"]
};

module.exports.handleEvent = async function ({ api, event, Users }) {
  try {
    if (!event?.body) return;
    const { threadID, senderID, body } = event;
    const message = body.trim();
    const botID = api.getCurrentUserID();

    if (senderID == botID) return;

    if (!global.data) global.data = {};
    if (!global.data.spamTracker) global.data.spamTracker = new Map();
    if (!global.data.userBanned) global.data.userBanned = new Map();

    let threadInfo;
    try { threadInfo = await api.getThreadInfo(threadID); } catch { return; }

    const botIsAdmin = threadInfo.adminIDs.some(i => i.id == botID);
    const isSenderAdmin = threadInfo.adminIDs.some(i => i.id == senderID);

    if (cfg.ADMIN_BYPASS && isSenderAdmin) return;

    // 🧷 Facebook group link detector
    const linkRegex = /(https?:\/\/)?(www\.)?(m\.)?facebook\.com\/groups\/\d+|facebook\.com\/groups\/[A-Za-z0-9\-\_]+|fb\.watch\/[A-Za-z0-9\-\_]+/i;
    if (linkRegex.test(message)) {
      if (!botIsAdmin)
        return api.sendMessage("⚠️ আমি অ্যাডমিন না, তাই গ্রুপ লিংক শেয়ার করা ইউজারকে রিমুভ করতে পারছি না।", threadID);

      await api.removeUserFromGroup(senderID, threadID);
      return api.sendMessage("🚫 গ্রুপ লিংক শেয়ার করার জন্য ইউজারকে গ্রুপ থেকে বের করে দেওয়া হয়েছে।", threadID);
    }

    const normalized = message.replace(/\s+/g, " ").trim();
    let threadMap = global.data.spamTracker.get(threadID);
    if (!threadMap) {
      threadMap = new Map();
      global.data.spamTracker.set(threadID, threadMap);
    }

    const now = Date.now();
    let record = threadMap.get(senderID) || { lastMessage: "", count: 0, firstTime: now };

    if (record.lastMessage === normalized && now - record.firstTime <= cfg.WINDOW_MINUTES * 60 * 1000) {
      record.count++;
    } else {
      record.lastMessage = normalized;
      record.count = 1;
      record.firstTime = now;
    }

    threadMap.set(senderID, record);

    // ⚠️ Warning
    if (record.count === cfg.WARN_AT) {
      const remaining = cfg.MAX_REPEAT - cfg.WARN_AT;
      return api.sendMessage(
        `⚠️ তুমি একই মেসেজ ${cfg.WARN_AT} বার পাঠিয়েছো!\nআর ${remaining} বার পাঠালে তোমাকে গ্রুপ থেকে বের করে দেওয়া হবে।`,
        threadID
      );
    }

    // 🚨 Ban
    if (record.count >= cfg.MAX_REPEAT && now - record.firstTime <= cfg.WINDOW_MINUTES * 60 * 1000) {
      if (!botIsAdmin)
        return api.sendMessage("⚠️ আমি অ্যাডমিন না, তাই স্প্যামারকে রিমুভ করতে পারছি না।", threadID);

      let data = (await Users.getData(senderID))?.data || {};
      data.banned = true;
      await Users.setData(senderID, { data });

      global.data.userBanned.set(senderID, {
        reason: "Repeated spam",
        dateAdded: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })
      });

      await api.removeUserFromGroup(senderID, threadID);
      threadMap.delete(senderID);

      return api.sendMessage(
        `🚫 ${record.count} বার একই মেসেজ পাঠানোর জন্য তোমাকে গ্রুপ থেকে বের করে দেওয়া হলো।\n📩 যদি আবার যোগ দিতে চাও, তাহলে গ্রুপ অ্যাডমিনের সাথে যোগাযোগ করো।`,
        threadID
      );
    }

    // 🧹 পুরোনো ডেটা রিমুভ
    for (const [uid, rec] of threadMap) {
      if (Date.now() - rec.firstTime > cfg.CLEANUP_AFTER_MS) threadMap.delete(uid);
    }

  } catch (err) {
    console.error("Spam module error:", err);
  }
};

module.exports.run = async function () {};
