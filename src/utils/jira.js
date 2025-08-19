const JiraApi = require('jira-client');

const jira = new JiraApi({
    protocol: 'http',
    host: process.env.JIRA_HOST,
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD,
    apiVersion: '2',
    strictSSL: true
});

module.exports = { jira }