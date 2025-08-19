const { Youtrack } = require('youtrack-rest-client');

const youtrack = new Youtrack({
    baseUrl: process.env.YT_URI,
    token: process.env.YT_TOKEN
});

module.exports = { youtrack }
