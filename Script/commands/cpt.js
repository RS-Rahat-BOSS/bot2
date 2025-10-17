const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const request = require('request');

module.exports.config = {
    name: '\n',
    version: '1.0.0',
    hasPermssion: 0,
    credits: 'Mohammad Akash',
    description: 'This command is for using my bot in your group.',
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

    // একবারে পুরো লেখা
    const messageBody = `🌸 Assalamualaikum 🌸  
🌺 Thanks you so much for using my bot your group ❤️‍🩹  
😻 I will you are members enjoy!🤗  

🔰 To view any command 📌  
/Help  
/Bot  
/Info  

𝐁𝐨𝐭 𝐎𝐰𝐧𝐞𝐫➢ 🔰 𝗥𝗮𝗵𝗮𝘁_𝗜𝘀𝗹𝗮𝗺 🔰`;

    // লোকাল ফাইল path
    const filePath = path.join(__dirname, 'cyber.gif');

    // নতুন ইমেজ লিংকগুলো
    const images = [
        'https://i.imgur.com/e6vXz91.gif'
    ];

    // র্যান্ডম ইমেজ বেছে নেওয়া
    const gifUrl = gifs[Math.floor(Math.random() * gifss.length)];
    const gifStream = request.get(encodeURI(gifUrl)).pipe(Stream.createWriteStream(filePath));

    // ইমেজ ডাউনলোড শেষ হলে মেসেজ পাঠানো
    imageStream.on('close', () => {
        api.sendMessage(
            {
                body: messageBody,
                attachment: Stream.createReadStream(filePath)
            },
            event.threadID,
            () => Stream.unlinkSync(filePath) // পাঠানোর পরে ফাইল ডিলিট
        );
    });
};
