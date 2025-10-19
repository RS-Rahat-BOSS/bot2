module.exports.config = {
	name: "kick",
	version: "1.1.0", 
	hasPermssion: 0,
	credits: "𝐂𝐘𝐁𝐄𝐑 ☢️_𖣘 -𝐁𝐎𝐓 ⚠️ 𝑻𝑬𝑨𝑴_ ☢️ + Fixed by GPT",
	description: "Remove a tagged person from the group",
	commandCategory: "System", 
	usages: "[tag]", 
	cooldowns: 0,
};

module.exports.languages = {
	"vi": {
		"error": "Đã có lỗi xảy ra, vui lòng thử lại sau",
		"needPermssion": "Cần quyền quản trị viên nhóm\nVui lòng thêm và thử lại!",
		"missingTag": "Bạn phải tag người cần kick"
	},
	"en": {
		"error": "Error! An error occurred. Please try again later!",
		"needPermssion": "Need group admin\nPlease add and try again!",
		"missingTag": "You need to tag someone to kick"
	}
};

module.exports.run = async function({ api, event, getText, Threads }) {
	try {
		// Check if Threads exists
		if (!Threads || typeof Threads.getData !== "function") {
			return api.sendMessage("⚠️ Internal error: Threads module not found!", event.threadID);
		}

		// Get thread info (compatible with new + old versions)
		let threadData = await Threads.getData(event.threadID);
		let dataThread = threadData.threadInfo || threadData;

		if (!dataThread || !dataThread.adminIDs) {
			return api.sendMessage("⚠️ Could not get group admin list!", event.threadID);
		}

		// Check if bot is admin
		if (!dataThread.adminIDs.some(item => item.id == api.getCurrentUserID())) {
			return api.sendMessage(getText("needPermssion"), event.threadID, event.messageID);
		}

		// Get mentioned users
		let mention = Object.keys(event.mentions);
		if (!mention[0]) {
			return api.sendMessage(getText("missingTag"), event.threadID, event.messageID);
		}

		// Check if sender is admin
		if (!dataThread.adminIDs.some(item => item.id == event.senderID)) {
			return api.sendMessage("⚠️ You must be an admin to use this command!", event.threadID, event.messageID);
		}

		// Kick mentioned users
		for (const id of mention) {
			setTimeout(() => {
				api.removeUserFromGroup(id, event.threadID, (err) => {
					if (err) api.sendMessage(`❌ Failed to remove user: ${event.mentions[id]}`, event.threadID);
				});
			}, 3000);
		}

	} catch (e) {
		console.error("Kick command error:", e);
		return api.sendMessage(`❌ Error: ${e.message || getText("error")}`, event.threadID);
	}
};
