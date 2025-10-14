const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

module.exports.config = {
    name: "edit",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "rX Abdullah",
    description: "Reply photo & enhance/edit with name/position",
    commandCategory: "Image",
    usages: "!edit 4k | !edit draw right | !edit text Abdullah",
    cooldowns: 5
};

module.exports.run = async ({ api, event, args }) => {
    try {
        if (!event.messageReply || !event.messageReply.attachments) 
            return api.sendMessage("Reply to a photo!", event.threadID);

        const attachment = event.messageReply.attachments[0];
        if (attachment.type !== "photo")
            return api.sendMessage("Reply must be a photo!", event.threadID);

        // Download photo
        const photoURL = attachment.url;
        const tempPath = path.join(__dirname, "temp", `${Date.now()}.jpg`);
        await fs.ensureDir(path.join(__dirname, "temp"));
        const photoData = await axios.get(photoURL, { responseType: "arraybuffer" });
        await fs.writeFile(tempPath, photoData.data);

        // Parse command
        const option = args[0]?.toLowerCase();
        let body = {};

        if (option === "4k") {
            body = { type: "4k", name: args[1] || "User" };
        } else if (option === "draw") {
            const position = args[1] || "middle"; // left, right, middle
            body = { type: "draw", position, name: args[2] || "User" };
        } else if (option === "text") {
            const nameText = args.slice(1).join(" ") || "User";
            body = { type: "text", name: nameText, position: "middle" };
        } else {
            return api.sendMessage("Invalid command option!", event.threadID);
        }

        // Send to API
        const form = new FormData();
        form.append("photo", fs.createReadStream(tempPath));
        for (let key in body) form.append(key, body[key]);

        const apiResp = await axios.post("https://rx-editing-api.onrender.com/api/process-image", form, {
            headers: form.getHeaders()
        });

        if (apiResp.data.success) {
            const outPath = apiResp.data.path;
            await api.sendMessage({ attachment: fs.createReadStream(outPath) }, event.threadID, () => {
                fs.removeSync(tempPath);
                fs.removeSync(outPath);
            });
        } else {
            api.sendMessage("Processing failed!", event.threadID);
        }

    } catch (err) {
        console.error(err);
        api.sendMessage("An error occurred!", event.threadID);
    }
};
