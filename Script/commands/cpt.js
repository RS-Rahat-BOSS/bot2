const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');

module.exports.config = {
    name: '\n',
    version: '1.0.1',
    hasPermssion: 0,
    credits: 'Mohammad Akash (Modified by Rahat)',
    description: 'Thanks message with random GIF from Imgur.',
    commandCategory: 'Info',
    usages: '/',
    cooldowns: 11,
    dependencies: {
        'request': '',
        'fs-extra': '',
        'axios': ''
    }
};

module.exports.run = async function({ api, event }) {
    const Stream = require('fs-extra');

    const messageBody = `🌸 Assalamualaikum 🌸  
🌺 Thank you so much for using my bot in your group ❤️‍🩹  
😻 I hope all members enjoy! 🤗  

🔰To view commands 📌  
-Help  
-Bot  
-Info  

𝐁𝐨𝐭 𝐎𝐰𝐧𝐞𝐫 ➢ 🔰 𝗥𝗮𝗵𝗮𝘁_𝗜𝘀𝗹𝗮𝗺 🔰`;

    // লোকাল GIF path
    const gifPath = path.join(__dirname, 'cyber.gif');

    // GIF লিংকগুলো (Imgur থেকে)
    const gifs = [
        'https://i.imgur.com/61Elnha.gif',
        'https://i.imgur.com/kSxNraO.gif',
        'https://i.imgur.com/sW3Gtb4.gif'
    ];

    // র‍্যান্ডম GIF নির্বাচন
    const gifUrl = gifs[Math.floor(Math.random() * gifs.length)];

    // GIF ডাউনলোড করা
    const gifStream = request.get(encodeURI(gifUrl)).pipe(Stream.createWriteStream(gifPath));

    // GIF ডাউনলোড শেষ হলে মেসেজ পাঠানো
    gifStream.on('close', () => {
        api.sendMessage(
            {
                body: messageBody,
                attachment: Stream.createReadStream(gifPath)
            },
            event.threadID,
            () => Stream.unlinkSync(gifPath) // পাঠানোর পরে ফাইল ডিলিট
        );
    });
};
