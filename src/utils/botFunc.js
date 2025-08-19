const fs = require("fs");
const users = require("../jsons/users.json");
const { check_user, sliceMsg } = require("./utils");
const { get_tickets } = require("./utils");

const start = async function (bot, msg) {
    if (users[check_user(msg['chat'])]) {
        await bot.sendMessage(msg['chat'].id, `👋 Привет, твой логин в youtrack: ${users[check_user(msg['chat'])]['youtrack_name']}?`, {
            reply_markup: {
                inline_keyboard:[[{text: 'Да', callback_data: 'is_user'}], [{text: 'Нет', callback_data: 'is_nuser'}]]
            }
        });

    } else
        await bot.sendMessage(msg['chat'].id, `😓 Увы, я тебя не знаю\nНапиши @nomore_miracle по этому поводу`);
}

const stopAlert = async function (bot, msg) {
    if (users[check_user(msg['chat'])]) {

        users[check_user(msg['chat'])]['chatId'] = null;
        fs.writeFile(`./jsons/users.json`, JSON.stringify(users), (err) => {
            if (err) console.log(err);
        });
        await bot.sendMessage(msg['chat'].id, `🫡 Больше не буду тебя беспокоить\n\nЕсли захочешь снова получать уведомления — /start`);

    }
}

const my_tickets = async function (bot, msg, id_project) {
    const youtrack_name_user = users[check_user(msg['chat'])]?.['youtrack_name'];
    if (youtrack_name_user) {

        const text = await get_tickets(youtrack_name_user, id_project);
        if (text.length > 4096) {
            const msgArray = sliceMsg(text);
            for (let msgText of msgArray) {
                await bot.sendMessage(msg['chat'].id, msgText);
            }
        } else await bot.sendMessage(msg['chat'].id, text, { "parse_mode" : "markdown" });

    }
}

const open_tickets = async  function (bot, msg, id_project) {
    let i = 0;
    const test = Object.keys(users).reduce((arr, cur) => {
        if (!Array.isArray(arr[i]))
            arr.push([]);
        else if (arr[i].length === 3) {
            arr.push([]);
            i++;
        }
        arr[i].push({
            text: users[cur]['youtrack_name'],
            callback_data: `test-${id_project}:${users[cur]['youtrack_name']}`
        });
        return arr;
    }, []);
    await bot.sendMessage(msg['chat'].id, `Выбери, чьи тикеты ты хочешь посмотреть:`, {
        reply_markup: {
            inline_keyboard: test
        }
    });
}

const get_users = async function(bot, msg) {
    const us = Object.keys(users).reduce((res, cur) => {
        if (users[cur]['chatId'] !== null) res += `@${cur}\n`;
        return res
    }, '');
    await bot.sendMessage(msg['chat'].id, us);
}

const alertUsers = async function (bot, msg) {
    const ids = Object.keys(users).reduce((res, cur) => {
        if (users[cur]['chatId'] !== null) res.push(users[cur]['chatId']);
        return res
    }, []);
    const alertMessage = msg.text.replace('/alert', '').trim();
    if (alertMessage.length !== 0) {
        for (let id of ids) {
            await bot.sendMessage(id, alertMessage);
            console.log('Отправил рассылку:', id);
        }
    } else {
        await bot.sendMessage(msg['chat'].id, '🤖 А что отправлять то? Введи текст после /alert');
    }
}

module.exports = {
    start, stopAlert, my_tickets, open_tickets, get_users, alertUsers
}
