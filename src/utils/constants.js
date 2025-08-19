exports.state_color = {
    'Minor': '⚪️',
    'Normal': '🟢',
    'Major': '🟡',
    'Critical': '🟣',
    'Show-stopper': '🔴'
};

exports.projects = {
    'CC': '{Call Center}',
    'MM': 'MedMarket '
}

exports.html_for_img = function (summary, ticket, ticketInfo = {}) {

    const {status = ''} = ticketInfo;

    return `<html lang="ru">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="img.css">
    <style>
        body {
            font-family: Tahoma, Geneva, sans-serif;
            padding: 10px;
        }
        table {
            border-collapse: collapse;
        }
        table td {
            padding: 5px;
        }
        table thead td {
            background-color: #54585d;
            color: #ffffff;
            font-weight: bold;
            border: 1px solid #54585d;
        }
        table tbody td {
            border: 1px solid #dddfe1;
        }
        table tbody tr {
            background-color: #f9fafb;
        }
        table tbody tr:nth-child(odd) {
            background-color: #ffffff;
        }
        code {
            background: #f7f9fa;
        }
        .status::before {
            background-color: #8c9bfd;
            border-radius: 100%;
            content: '';
            display: inline-block;
            height: 0.5em;
            margin: 0 0.5em;
            position: relative;
            top: -0.125em;
            width: 0.5em;
        }
        .status-open.status::before {
            background-color: #61D395;
        }
        .status-fixed.status::before {
            background-color: #F5A623;
        }
    </style>
</head>
<body>
<h3>${summary}</h3>
${(status !== '') ? `<div>Статус: <span class="status status-${status.toLowerCase()}">${status}</span></div>` : ''}
<hr class="solid">
${ticket}
</body>
</html>`;
}
