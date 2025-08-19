const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const queue = require('fastq').promise(worker, 1);

const chatInfo = require('./jsons/chatInfo.json');

const { start, stopAlert, my_tickets, open_tickets, get_users, alertUsers } = require("./utils/botFunc");
const { is_user, is_nuser, ticket_user, ticket_status } = require("./utils/botCallback");
const { addComment, deleteComment } = require("./utils/schedule");
const { handleYoutrackTicket, handleJiraTicket } = require("./services/worker");

process.env.NTBA_FIX_350 = true;
const bot = new TelegramBot(process.env.TG_KEY, {
    polling: true, 
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    } 
});

let comment_JIRA = JSON.parse(fs.readFileSync('./src/jsons/comment_JIRA.json', 'utf8'));
let chatId = chatInfo.chats[0]?.id, topic = chatInfo.chats[0]?.topic;

/**
 * @param {any} opt
 */
async function worker(opt) {
    const { msg, type } = opt;
    if (type === 'YT') {
        await handleYoutrackTicket(bot, msg);
    } else {
        await handleJiraTicket(bot, msg);
    }
}

bot.onText(/^\/alert/, async (msg) => {
    await alertUsers(bot, msg);
})

bot.onText(/^\/start/, async (msg) => {
    await start(bot, msg);
});

bot.onText(/^\/stop_alert/, async (msg) => {
    await stopAlert(bot, msg);
});

bot.on('callback_query', async ctx => {
    switch(true) {
        case /^is_user$/.test(ctx.data):
            await is_user(bot, ctx);
            break;
        case /^is_nuser$/.test(ctx.data):
            await is_nuser(bot, ctx);
            break;
        case /^test/.test(ctx.data):
            await ticket_user(bot, ctx);
            break;
        case /^see/.test(ctx.data):
            await ticket_status(bot, ctx, 'CC')
            break;
        case /^jira_com/.test(ctx.data):
            await addComment(bot, ctx, comment_JIRA);
            break;
        case /^stop_jira_com/.test(ctx.data):
            comment_JIRA = await deleteComment(bot, ctx, comment_JIRA);
            break;
    }
});

bot.onText(/^\/upd_chat/, (msg) => {
    topic = msg['is_topic_message'] ? msg.message_thread_id : undefined;
    chatId = msg['chat'].id;
    chatInfo.chats.push({"id": msg['chat'].id, topic: topic});
    fs.writeFileSync('./src/jsons/chatInfo.json', JSON.stringify(chatInfo));
});

bot.onText(/^\/my_tickets_cc/, async (msg) => {
    await my_tickets(bot, msg, 'CC');
});

bot.onText(/^\/my_tickets_mm/, async (msg) => {
    await my_tickets(bot, msg, 'MM');
});

bot.onText(/^\/open_tickets_cc/, async (msg) => {
    await open_tickets(bot, msg, 'CC');
});

bot.onText(/^\/open_tickets_mm/, async (msg) => {
    await open_tickets(bot, msg, 'MM');
});

bot.onText(/^\/see_tickets_cc/, async (msg) => {
    await bot.sendMessage(msg['chat'].id, `Выбери статус тикета:`, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'In progress', callback_data: 'see_in_progress' }],
                [{ text: 'Fixed', callback_data: 'see_fixed' }],
                [{ text: 'Test running', callback_data: 'see_test_running' }]
            ]
        }
    });
});

bot.onText(/^\/get_img/, async (msg) => {
    await queue.push(msg);
});

bot.onText(new RegExp(process.env.YT_IMAGE_URI), async (msg) => {
    await queue.push({ msg, type: "YT" });
});

bot.onText(new RegExp(process.env.JIRA_IMAGE_URI), async (msg) => {
    await queue.push({ msg, type: "JIRA" });
});

bot.onText(/^\/get_users$/, async (msg) => {
    await get_users(bot, msg);
});

require("./jobs/scheduler")(bot);