const { expectIssues } = require("./utils");
const { updateIssues } = require("./updateIssues");
const { jira } = require("./jira");
const users = require("../jsons/users.json");
const { updateCommentFile } = require("./updateIssues");

exports.check_ticket = async function (bot, chatId, topic, issues, project_id) {
    let upd = false;
    const res = await expectIssues(issues, project_id);
    console.log('test', res);
    if (res['group'] && res['group'] !== '') {
        try {
            await bot.sendMessage(chatId, res['group'].replace(/\n$/, ''), { "parse_mode" : "markdown", message_thread_id: topic });
            upd = true;
        } catch (e) {
            console.log('\n***\nОшибка при отправке в группу:\n', e, '\n***\n')
        }
    }
    const res_key = Object.keys(res);
    if (res_key.length > 1) {
        for (let key of res_key) {
            if (key !== 'group' && res[key] !== '') {
                if (key !== null || key !== 'null') {
                    try {
                        await bot.sendMessage(key, res[key]?.replace(/\n$/, ''), { "parse_mode" : "markdown" });
                    } catch (e) {
                        console.log(`\n***\nОшибка при отправке челику ${key}:\n`, e, '\n***\n')
                    }
                }
                upd = true;
            }
        }
    }
    console.log('update:', upd);
    if (upd) {
        await updateIssues(issues, project_id);
    }
}

exports.check_jira = async function(bot, chatId, topic, issues, comment_JIRA) {
    console.log('check JIRA');
    const search = await jira.searchJira('assignee = currentUser() AND resolution = unresolved ORDER BY priority DESC, created ASC');
    const romaSearch = await jira.searchJira('assignee = romas AND resolution = unresolved ORDER BY priority DESC, created ASC');
    const searchIssues = search['issues'].concat(romaSearch['issues']).map(el => {
        return {key: el.key, assignee: el.fields.assignee.name}
    });
    const updIssues = searchIssues.filter(elm => !issues.map(elm => JSON.stringify(elm)).includes(JSON.stringify(elm)));
    if (updIssues.length !== 0) {
        console.log(updIssues);
        for (let updIssue of updIssues) {
            const user_info = Object.values(users).find(o => o['jira_name'] === updIssue.assignee);
            const findIssue = issues.find(obj => obj.key === updIssue.key);
            console.log(findIssue);
            const issue = await jira.findIssue(updIssue.key);
            if (!findIssue) {
                await bot.sendMessage(chatId,
                    `🆕 Новый запрос JIRA 🆕\n [${issue.fields.summary}](${process.env.JIRA_HOST}/browse/${updIssue.key})`,
                    { parse_mode: "markdown", message_thread_id: topic }
                );
                if (user_info) {
                    await bot.sendMessage(user_info['chatId'],
                        `🆕 Новый запрос JIRA 🆕\n [${issue.fields.summary}](${process.env.JIRA_HOST}/browse/${updIssue.key})`,
                        { parse_mode : "markdown" }
                    );
                }
            } else {
                if ((updIssue.assignee !== findIssue.assignee) && user_info) {
                    await bot.sendMessage(user_info['chatId'],
                        `🔄 На вас переназначили JIRA-тикет 🔄\n[${issue.fields.summary}](${process.env.JIRA_HOST}/browse/${updIssue.key})`,
                        { parse_mode : "markdown", reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'Следить за комментариями', callback_data: `jira_com:${updIssue.key}` }],
                                ]
                            }
                        }
                    );
                }
            }
        }
        await updateIssues(searchIssues, 'JIRA');
    }
    const closeIssues = issues.filter(elm => !searchIssues.map(elm => JSON.stringify(elm)).includes(JSON.stringify(elm)));
    if (closeIssues.length !== 0) {
        console.log('Закрытые тикеты JIRA:', closeIssues);
        for (let closeIssue of closeIssues) {
            comment_JIRA = comment_JIRA.filter(obj => obj.key !== closeIssue.key);
            await updateCommentFile(comment_JIRA);
        }
        await updateIssues(searchIssues, 'JIRA');
    }

    return [searchIssues, comment_JIRA];

}

exports.addComment = async function(bot, ctx, comment_JIRA) {
    try {
        const jira_issue = ctx.data.replace('jira_com:', '');
        const infoIssue = await jira.findIssue(jira_issue);
        console.log(infoIssue);
        comment_JIRA.push({ key: jira_issue, comments: infoIssue.fields.comment.total, user: ctx.from.id });
        await updateCommentFile(comment_JIRA);
        await bot.editMessageReplyMarkup({
            inline_keyboard: [
                [{text: 'Не следить за комментариями', callback_data: `stop_jira_com:${jira_issue}`}],
            ]
        }, {
            chat_id: ctx.from.id,
            message_id: ctx.message.message_id
        });
    } catch (e) {
        console.log(e);
        await bot.sendMessage(676414751, 'Возникла ошибка');
    }
}

exports.deleteComment = async function(bot, ctx, comment_JIRA) {
    try {
        const jira_issue_stop = ctx.data.replace('stop_jira_com:', '');
        comment_JIRA = comment_JIRA.filter(obj => obj.key !== jira_issue_stop);
        await updateCommentFile(comment_JIRA);
        await bot.editMessageReplyMarkup({
            inline_keyboard: [
                [{text: 'Следить за комментариями', callback_data: `jira_com:${jira_issue_stop}`}],
            ]
        }, {
            chat_id: ctx.from.id,
            message_id: ctx.message.message_id
        });
    
        return comment_JIRA
    } catch (e) {
        console.log(e);
        await bot.sendMessage(676414751, 'Возникла ошибка');
        return comment_JIRA
    }

}

exports.checkComment = async function(bot, comment_JIRA) {
    for (let i in comment_JIRA) {
        const info = comment_JIRA[i];
        console.log('Проверяю комментарии', info);
        const issue = await jira.findIssue(info.key);
        if (issue.fields.comment.total !== info.comments) {
            comment_JIRA[i].comments = issue.fields.comment.total;
            await bot.sendMessage(info.user,
                `🕵️‍♂️ Новый комментарий у JIRA-тикета [${issue.fields.summary}](${process.env.JIRA_HOST}/browse/${info.key})`, {
                    parse_mode: "markdown", reply_markup: {
                        inline_keyboard: [
                            [{text: 'Не следить за комментариями', callback_data: `stop_jira_com:${info.key}`}],
                        ]
                    }
                }
            );
            await updateCommentFile(comment_JIRA);
        }
    }
}
