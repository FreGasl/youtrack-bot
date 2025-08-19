const markdownit = require("markdown-it");
const nodeHtmlToImage = require("node-html-to-image");

const { youtrack } = require("../utils/youtrack");
const { jira } = require("../utils/jira");
const { html_for_img } = require("../utils/constants");

async function handleYoutrackTicket(bot, msg) {
    let ticket;
    const urlText = msg['reply_to_message']?.text || msg.text;
    const id = urlText.match(/[CM]+-\d+/)?.[0];
    if (!id) {
        await bot.sendMessage(msg['chat'].id, "🤷‍♂️ В этом сообщении нет тикета");
        return;
    }

    try {
        ticket = await youtrack.issues.byId(id);
    } catch (e) {
        await bot.sendMessage(msg['chat'].id, 'Не могу найти такой тикет 🫥');
        return;
    }

    try {
        console.log('---\nЗапросили изображение в ', new Date());
        const md = markdownit({ breaks: true });
        if (!ticket.description) {
            await bot.sendMessage(msg['chat'].id, 'В тикете нет описания');
            return;
        }

        const ticket_html = md.render(ticket.description);
        const image = await nodeHtmlToImage({
            html: html_for_img(ticket.summary, ticket_html, {
                status: ticket.fields.find(obj => obj.name === "State")?.value.name
            }),
        });
        await bot.sendDocument(msg['chat'].id, image, {}, {
            filename: `${id}.png`,
            contentType: 'application/octet-stream'
        });
        console.log('Изображение получено в ', new Date(), '\n---');
    } catch (e) {
        console.log(e);
        await bot.sendMessage(msg['chat'].id, 'Что-то пошло не так, напишите @nomore_miracle');
    }
}

async function handleJiraTicket(bot, msg) {
    try {
        const urlText = msg['reply_to_message']?.text || msg.text;
        const id = urlText.match(/[DOACM]+-\d+/)?.[0];
        if (!id) {
            await bot.sendMessage(msg['chat'].id, "Не нашёл такой запрос 🤔");
            return;
        }

        const issue = await jira.findIssue(id);
        const md = markdownit({ breaks: true });
        const ticket_html = md.render(issue.fields.description || issue.fields['customfield_10702']);

        const image = await nodeHtmlToImage({
            html: html_for_img(issue.fields.summary, ticket_html),
        });

        await bot.sendDocument(msg['chat'].id, image, {}, {
            filename: `${id}.png`,
            contentType: "application/octet-stream"
        });
    } catch (e) {
        console.error(e);
        await bot.sendMessage(msg['chat'].id, "Что-то пошло не так, напишите @nomore_miracle");
    }
}

module.exports = { handleJiraTicket, handleYoutrackTicket };
