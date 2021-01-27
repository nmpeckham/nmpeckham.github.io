AWS.config.region = 'ca-central-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ca-central-1:1453e5ba-641c-4717-a93b-0d7434d591f3',
});

var docClient = new AWS.DynamoDB.DocumentClient();

function queryData() {
    var params = {
        TableName : "tempLogs",
        IndexName: "device-index",
        KeyConditionExpression: "#T = :t",
        ScanIndexForward: false,
        Limit: 120,
        // FilterExpression: "#T > :t",
        ExpressionAttributeNames: {"#T": "device"},
        ExpressionAttributeValues: {":t": "0"}
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2));
        } else {
            console.log("dynamo data fetched");
        }
        document.getElementById("temp").innerHTML = "Temperature" + "<br>" + data.Items[0].temp.toFixed(1) + "&degC"
        document.getElementById("hum").innerHTML = "Humidity" + "<br>" + data.Items[0].hum.toFixed(1) + "%"
        document.getElementById("title").innerHTML = "Most Recent Reading: " + getFormattedTime(data.Items[0].timestamp)
        drawChart("tempChart", data.Items.map(a=> a.temp.toFixed(2)).reverse(), data.Items.map(a=> getFormattedTime(a.timestamp).substr(0, 8)).reverse())
        drawChart("humChart", data.Items.map(a=> a.hum.toFixed(2)).reverse(), data.Items.map(a=> getFormattedTime(a.timestamp).substr(0, 8)).reverse())
    });
    
}

function getFormattedTime(timestamp) {
    var currentDate = new Date(timestamp * 1000)
    return currentDate.getHours() + ":" + ("0" + currentDate.getMinutes()).substr(-2) + ":" + ("0" + currentDate.getSeconds()).substr(-2) + " " + currentDate.getDate() + "/" + ("0" + (currentDate.getMonth() + 1)).substr(-2) + "/" + currentDate.getFullYear()
}

function drawChart(type, readingData, timestamps) {
    var minY = (Math.min(...readingData)).toFixed() - 1;
    var maxY = parseFloat((Math.max(...readingData)).toFixed()) + 1;

    var ctx = document.getElementById(type).getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: type == "tempChart" ? "Temperature" : "Humidity",
                data: readingData,
                backgroundColor: [
                    type == "tempChart" ? 'rgba(255, 99, 132, 0.4)' : 'rgba(128, 50, 255, 0.4)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        min: minY,
                        max: maxY
                    }
                }]
            }
        }
    });
}

function resized() {
    //Keep charts proper size when window changes
    document.getElementById("tempChart").style.width = '100%'
    document.getElementById("humChart").style.width = '100%'
}

window.addEventListener("resize", resized)
queryData()