const { youtrack } = require("./youtrack");
const date = require("date-and-time");
const users = require('../jsons/users.json')

const mapIssues = async function(issues, options = { withHeader: false, infoForAlert: false }) {
    return await Promise.all(issues.map(async (obj) => {
        const idIssue = `${obj.project.shortName}-${obj.numberInProject}`;
        const issue = await youtrack.issues.byId(idIssue);
        const stateIssue = issue.fields.filter(obj => obj.name === 'State')[0].value.name;
        const result = {
            url: `${process.env.YT_URI}/issue/${idIssue}`,
            numberInProject: obj.numberInProject,
            stateIssue: stateIssue
        };
        if (options.withHeader) result['header'] = issue.summary;
        if (options.infoForAlert) {
            result['assignee'] = issue.fields.find(obj => obj.name === 'Assignee').value?.login;
            result['priority'] = issue.fields.find(obj => obj.name === 'Priority').value?.name;
            result['type'] = issue.fields.find(obj => obj.name === 'Type').value?.name;
        }
        return result
    }));
}

const expectIssues = async function(issue, project) {
    const now = new Date();
    const ten_minAgo = date.addMinutes(now, -10);
    console.log(`updated: ${date.format(ten_minAgo, 'YYYY-MM-DDTHH:mm')} .. ${date.format(now, 'YYYY-MM-DDTHH:mm')} project: ${project}`)
    const issues = await mapIssues(await youtrack.issues.search(`updated: ${date.format(ten_minAgo, 'YYYY-MM-DDTHH:mm')} .. ${date.format(now, 'YYYY-MM-DDTHH:mm')} project: ${project}`),
        { withHeader: true, infoForAlert: true }
    );

    return issues.reduce((result, cur) => {
        const objIndex = issue[project].findIndex(obj => obj.numberInProject === cur.numberInProject);
        const user_info = Object.values(users).find(o => o['youtrack_name'] === cur.assignee);
        if (result['group'] === undefined) result['group'] = '';
        if (result[user_info['chatId']] === undefined) result[user_info['chatId']] = '';
        if (objIndex !== -1) {
            if (issue[project][objIndex].stateIssue !== cur.stateIssue) {
                if (cur.stateIssue === 'Fixed') {
                    issue[project][objIndex].stateIssue = 'Fixed';
                    result['group'] += `🛠 Тикет [${project}-${cur.numberInProject} "${cur.header}"](${cur.url}) перевели в статус "Fixed"\n`;
                } else if (cur.stateIssue === 'Open' && ['Fixed', 'Verified', 'Test Running'].includes(issue[project][objIndex].stateIssue)) {
                    issue[project][objIndex].stateIssue = 'Open';
                    result['group'] += `🤔 Тикет [${project}-${cur.numberInProject} "${cur.header}"](${cur.url}) переоткрыли\n`;
                    result[user_info['chatId']] += `🤔 _${cur.priority} ${cur.type}_ [${project}-${cur.numberInProject} "${cur.header}"](${cur.url}) переоткрыли\n`;
                }
            }
            if (issue[project][objIndex].assignee !== cur.assignee) {
                issue[project][objIndex].assignee = cur.assignee;
                result[user_info['chatId']] += `⚠️ На вас перевели _${cur.priority} ${cur.type}_ [${project}-${cur.numberInProject} "${cur.header}"](${cur.url})\n`;
            }
            if (issue[project][objIndex].priority !== cur.priority) {
                issue[project][objIndex].priority = cur.priority;
                result[user_info['chatId']] += `⚠️ У тикета [${project}-${cur.numberInProject} "${cur.header}"](${cur.url}) изменили приоритет на ${cur.priority}\n`;
            }
        } else {
            if (cur.stateIssue === 'Open') {
                issue[project].push(cur);
                if (cur.priority === 'Normal' || cur.priority === 'Minor') {
                    result['group'] += `👾 Создали новый тикет: [${project}-${cur.numberInProject} "${cur.header}"](${cur.url})\n`;
                    result[user_info['chatId']] += `👾 Создали _${cur.priority} ${cur.type}_: [${project}-${cur.numberInProject} "${cur.header}"](${cur.url})\n`;
                } else {
                    result['group'] += `👾 Создали новый тикет: [${project}-${cur.numberInProject} "${cur.header}"](${cur.url})${(users[cur.assignee]) ? `\n⚠️ ${users[cur.assignee]} _${cur.priority} ${cur.type}_ ⚠️`: ''}\n`;
                    result[user_info['chatId']] += `👾 Создали _${cur.priority} ${cur.type}_: [${project}-${cur.numberInProject} "${cur.header}"](${cur.url})\n`;
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

module.exports = { mapIssues, expectIssues, check_user }