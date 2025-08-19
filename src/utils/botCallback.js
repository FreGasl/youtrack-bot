const fs = require("fs");
const users = require("../jsons/users.json");
const { youtrack } = require("./youtrack");
const { check_user, sliceMsg } = require("./utils");
const { get_tickets, mapIssues } = require("./utils");
const { projects, state_color } = require("./constants");

const is_user = async function (bot, ctx) {
    await bot.sendMessage(ctx.message['chat'].id,
        '✅ Уведомления о новых тикетах и об изменении приоритета будут приходить автоматически!\n\nТакже можешь воспользоваться списком команд:\n' +
        '/my_tickets_cc — все твои открытые тикеты CallCenterBoard;\n/my_tickets_mm — все твои открытые тикеты MedMarketBoard;\n/stop_alert — больше не слать уведомления;'
    );
    users[check_user(ctx.message['chat'])]['chatId'] = ctx.message['chat'].id;
    fs.writeFile(`./jsons/users.json`, JSON.stringify(users), (err) => {
        if (err) console.log(err);
    });
    await bot.deleteMessage(ctx.message['chat'].id, ctx.message.message_id);
}

const is_nuser = async function (bot, ctx) {
    await bot.sendMessage(ctx.message['chat'].id, '🤔 Напиши об этом @nomore_miracle');
    await bot.deleteMessage(ctx.message['chat'].id, ctx.message.message_id);
}

const ticket_user = async function (bot, ctx) {
    try {
        const info = ctx.data.replace('test-', '').split(':');
        const text = await get_tickets(info[1], info[0]);
        if (text.length > 4096) {
            const msgArray = sliceMsg(text);
            for (let msgText of msgArray) {
                await bot.sendMessage(ctx.message['chat'].id, msgText);
            }
        } else await bot.sendMessage(ctx.message['chat'].id, text, { "parse_mode" : "markdown" });
    } catch (e) {
        console.log(e);
        await bot.sendMessage(ctx.message['chat'].id, '📛 Произошла ошибка, напиши об этом @nomore_miracle', { "parse_mode" : "markdown" });
    }
    
    await bot.deleteMessage(ctx.message['chat'].id, ctx.message.message_id);
}

const ticket_status = async function (bot, ctx, id_project) {
    let state = ctx.data.replace('see_', '');
    if (state.includes('_')) {
        state = `{${state.replace('_', ' ')}}`
    }
    let issues = (await mapIssues(await youtrack.issues.search(
        `State: ${state} project: ${projects[id_project]} created: ${new Date().getFullYear()}-01 .. ${new Date().getFullYear()}-12`
        ), { withHeader: true, infoForAlert: true }
    )).sort((a, b) => {
        const keys = Object.keys(state_color);
        return keys.indexOf(b.priority) - keys.indexOf(a.priority)
    });

    let text;
    if (issues.length !== 0)
        text = issues.reduce((str, cur) => {
            str += `${state_color[cur.priority]} *${cur.priority} ${cur.type}* [${id_project}-${cur.numberInProject} ${cur.header}](${cur.url})\n`;
            return str
        }, '').replace(/\n$/, '');
    else
        return `👍 Не обнаружено открытых тикетов`;

    await bot.sendMessage(ctx.message['chat'].id, text, { "parse_mode" : "markdown" });
    await bot.deleteMessage(ctx.message['chat'].id, ctx.message.message_id);
}

module.exports = {
    is_user, is_nuser, ticket_user, ticket_status
}
