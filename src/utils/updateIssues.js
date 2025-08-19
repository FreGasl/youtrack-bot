const fs = require('fs').promises;

const updateIssues = async function (issue, project) {
    await fs.writeFile(`../jsons/issues_${project}.json`, JSON.stringify(issue)).catch(e => {
        console.log(e)
    });
    console.log(`Файл обновлён: ./jsons/issues_${project}.json`);
}

const updateCommentFile = async function (value) {
    await fs.writeFile(`../jsons/comment_JIRA.json`, JSON.stringify(value)).catch(e => {
        console.log(e)
    });
}

module.exports = { updateIssues, updateCommentFile }
