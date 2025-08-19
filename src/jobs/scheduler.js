const cron = require("node-cron");

const { check_ticket, check_jira, checkComment } = require("../utils/schedule");
let issues_MM = require("../jsons/issues_MM.json");
let issues_CC = require("../jsons/issues_CC.json");
let issues_JIRA = require("../jsons/issues_JIRA.json");
let comment_JIRA = require("../jsons/comment_JIRA.json");

module.exports = function(bot) {
    let chatId, topic;

    cron.schedule("*/5 * * * *", async () => {
        await check_ticket(bot, chatId, topic, issues_MM, "MM");
    });

    cron.schedule("*/1 * * * *", async () => {
        await check_ticket(bot, chatId, topic, issues_CC, "CC");
    });

    cron.schedule("*/5 * * * *", async () => {
        [issues_JIRA, comment_JIRA] = await check_jira(bot, chatId, topic, issues_JIRA, comment_JIRA);
        if (comment_JIRA.length !== 0) {
            await checkComment(bot, comment_JIRA);
        }
    });

    cron.schedule("0 8 * * *", async () => {
        await bot.sendMessage(676414751, "Доброе утро! Я работаю 🫡");
    });
};
