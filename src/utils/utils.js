const { youtrack } = require("./youtrack");
const date = require("date-and-time");
const users = require('../jsons/users.json');
const { projects, state_color } = require("./constants");

const mapIssues = async function(
    issues,
    options = {
        withHeader: false,
        infoForAlert: false
    }) {

    const processIssue = async (issue) => {
        const idIssue = `${issue.project.shortName}-${issue.numberInProject}`;
        const issueData = await youtrack.issues.byId(idIssue);

        const stateField = issueData.fields.find(f => f.name === 'State');
        const stateIssue = stateField?.value?.name || 'Unknown';

        const result = {
            url: `${process.env.YT_URI}/issue/${idIssue}`,
            numberInProject: issue.numberInProject,
            stateIssue: stateIssue
        };

        if (options.withHeader) {
            result.header = issueData.summary;
        }

        if (options.infoForAlert) {
            const assigneeField = issueData.fields.find(f => f.name === 'Assignee');
            const assignee = assigneeField?.value?.login || null;

            result.assignee = assignee;
            result.priority = issueData.fields.find(f => f.name === 'Priority')?.value?.name;
            result.type = issueData.fields.find(f => f.name === 'Type')?.value?.name;

            result.comments = issueData.comments.filter(c =>
                c.author.login !== assignee && !c.deleted
            ).length;
        }

        return result;
    }

    const MAX_CONCURRENT = 5; // Максимальное количество одновременных запросов
    const results = [];

    for (let i = 0; i < issues.length; i += MAX_CONCURRENT) {
        const chunk = issues.slice(i, i + MAX_CONCURRENT);
        const chunkResults = await Promise.all(chunk.map(processIssue));
        results.push(...chunkResults);
    }

    return results;
}

const expectIssues = async function (issue, project) {
    const now = new Date();
    const ten_minAgo = date.addMinutes(now, -20);
    console.log(`updated: ${date.format(ten_minAgo, 'YYYY-MM-DDTHH:mm')} .. ${date.format(now, 'YYYY-MM-DDTHH:mm')} project: ${project}`)
    const issues = await mapIssues(await youtrack.issues.search(`updated: ${date.format(ten_minAgo, 'YYYY-MM-DDTHH:mm')} .. ${date.format(now, 'YYYY-MM-DDTHH:mm')} project: ${project}`),
        { withHeader: true, infoForAlert: true }
    );
    console.log(issues)

    return issues.reduce((result, cur) => {
        const objIndex = issue[project].findIndex(obj => obj.numberInProject === cur.numberInProject);
        if (cur.assignee !== undefined) {
            const user_info = Object.values(users).find(o => o['youtrack_name'] === cur.assignee);
            if (result['group'] === undefined) result['group'] = '';
            if (result[user_info['chatId']] === undefined) result[user_info['chatId']] = '';
            if (objIndex !== -1) {
                if (issue[project][objIndex].stateIssue !== cur.stateIssue) {
                    if (cur.stateIssue === 'Fixed') {
                        issue[project][objIndex].stateIssue = 'Fixed';
                        result['group'] += `🛠 Тикет [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url}) перевели в статус "Fixed"\n`;
                    } else if (cur.stateIssue === 'Open' && ['Fixed', 'Verified', 'Test Running'].includes(issue[project][objIndex].stateIssue)) {
                        issue[project][objIndex].stateIssue = 'Open';
                        result['group'] += `🤔 Тикет [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url}) переоткрыли\n`;
                        result[user_info['chatId']] += `🤔 _${cur.priority} ${cur.type}_ [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url}) переоткрыли\n`;
                    } else if (cur.stateIssue === "Won't fix") {
                        issue[project][objIndex].stateIssue = cur.stateIssue;
                        result['group'] += `👀 Тикет [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url}) перевели в статус "Won't fix"\n`;
                    }
                }
                if (issue[project][objIndex].assignee !== cur.assignee) {
                    issue[project][objIndex].comments = cur.comments;
                    issue[project][objIndex].assignee = cur.assignee;
                    result[user_info['chatId']] += `⚠️ На вас перевели _${cur.priority} ${cur.type}_ [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url})\n`;
                }
                if (issue[project][objIndex].priority !== cur.priority) {
                    issue[project][objIndex].priority = cur.priority;
                    result[user_info['chatId']] += `⚠️ У тикета [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url}) изменили приоритет на ${cur.priority}\n`;
                }
                if (issue[project][objIndex].comments < cur.comments) {
                    issue[project][objIndex].comments = cur.comments;
                    result[user_info['chatId']] += `💬 У тикета [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url}) новые комментарии\n`;
                }
            } else {
                if (cur.stateIssue === 'Open') {
                    issue[project].push(cur);
                    if (cur.priority === 'Normal' || cur.priority === 'Minor') {
                        if (cur.numberInProject !== 'CC-7404') result['group'] += `👾 Создали новый тикет: [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url})\n`;
                        result[user_info['chatId']] += `👾 Создали _${cur.priority} ${cur.type}_: [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url})\n`;
                    } else {
                        result['group'] += `👾 Создали новый тикет: [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url})${(users[cur.assignee]) ? `\n⚠️ ${users[cur.assignee]} _${cur.priority} ${cur.type}_ ⚠️` : ''}\n`;
                        result[user_info['chatId']] += `👾 Создали _${cur.priority} ${cur.type}_: [${project}-${cur.numberInProject} "${cur.header.replace(/[\[\]]/g, '|')}"](${cur.url})\n`;
                    }
                }
            }
        }
        
        return result;
    }, {});
}

const check_user = function (chat) {

    if (chat.username) {
        return chat.username
    } else {
        return chat.first_name
    }

}

const get_tickets = async function (youtrack_name_user, id_project) {

    let issues = (await mapIssues(await youtrack.issues.search(`Assignee: ${youtrack_name_user} State: Open project: ${projects[id_project]} created: ${new Date().getFullYear()}-01 .. ${new Date().getFullYear()}-12`),
        { withHeader: true, infoForAlert: true }
    )).sort((a, b) => {
        const keys = Object.keys(state_color);
        return keys.indexOf(b.priority) - keys.indexOf(a.priority)
    });

    if (issues.length !== 0)
        return issues.reduce((str, cur) => {
            str += `${state_color[cur.priority]} *${cur.priority} ${cur.type}* [${id_project}-${cur.numberInProject} ${cur.header.replace(/[\[\]]/g, '|')}](${cur.url})\n`;
            return str
        }, '').replace(/\n$/, '');
    else
        return `👍 Не обнаружено открытых тикетов`;

}

const sliceMsg = function (messageString) {
    const max_size = 4096;
    const amount_sliced = messageString.length / max_size;
    let start = 0, end = max_size;
    let message;
    let messagesArray = []
    for (let i = 0; i < amount_sliced; i++) {
        message = messageString.slice(start, end)
        messagesArray.push(message)
        start = start + max_size
        end = end + max_size
    }
    return messagesArray;
}

module.exports = { mapIssues, expectIssues, check_user, get_tickets, sliceMsg }
