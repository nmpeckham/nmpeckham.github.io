AWS.config.region = 'ca-central-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ca-central-1:1453e5ba-641c-4717-a93b-0d7434d591f3',
});

var docClient = new AWS.DynamoDB.DocumentClient();

var secondsSinceTempUpdate = 0;
var defaultFetchTime = 1;

var tempReadings;
var humReadings;
var timeReadings;

var tempChart;
var humChart;


function queryData(hoursToGet = null) {

    if(hoursToGet == null) {
        hoursToGet = defaultFetchTime
    }
    else {
        defaultFetchTime = hoursToGet;
    }
    //console.log(hoursToGet)
    var currentDate = new Date()
    var minTime = currentDate.setHours(currentDate.getHours() - hoursToGet) / 1000;
    console.log(minTime)

    var params = {
        TableName : "tempLogs",
        IndexName: "device-index",
        KeyConditionExpression: "#D = :d AND #T > :t",
        ScanIndexForward: false,
        ExpressionAttributeNames: {"#D": "device", "#T": "timestamp"},
        ExpressionAttributeValues: {":d": "0", ":t":  minTime}
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2));
        }
        else if(data != undefined) {
            //console.log(data)
            if(data.Items[0] != undefined) {
                document.getElementById("temp").innerHTML = "Temperature" + "<br>" + data.Items[0].temp.toFixed(1) + "&degC"
                document.getElementById("hum").innerHTML = "Humidity" + "<br>" + data.Items[0].hum.toFixed(1) + "%"
                var timeSinceLastUpdate = Date.now() / 1000 - data.Items[0].timestamp;
                document.getElementById("title").innerHTML = "Most Recent Temperature and Humidity Reading: " + Math.floor(timeSinceLastUpdate) + " seconds ago";
                secondsSinceTempUpdate = timeSinceLastUpdate;

                document.getElementById("charts").innerHTML = 
                `<div><canvas id="tempChart"></canvas></div>
                    <div><canvas id="humChart"></canvas></div>`
                timeReadings = data.Items.map(a=> a.timestamp).reverse()//getFormattedTime(a.timestamp).substr(0, 8)).reverse()
                tempReadings = data.Items.map(a=> a.temp.toFixed(2)).reverse();
                humReadings = data.Items.map(a=> a.hum.toFixed(2)).reverse();

                //console.log(tempReadings);
                drawCharts();
            }
            
        }
    });
}

//Get a single latest reading and update charts
function updateChart() {
    secondsSinceTempUpdate = 0;
    var minTime = Date.now() / 1000;
    var params = {
        TableName : "tempLogs",
        IndexName: "device-index",
        KeyConditionExpression: "#D = :d AND #T < :t",
        ScanIndexForward: false,
        //Limit: numSamples,
        //FilterExpression: "#T < :t",
        ExpressionAttributeNames: {"#D": "device", "#T": "timestamp"},
        ExpressionAttributeValues: {":d": "0", ":t":  minTime},
        Limit: 1
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2));
        }

        else {
            if(tempReadings != undefined) {
                var newItem = {x: 0, y: 0}
                newItem.x = getFormattedTime(data.Items[0].timestamp);
                newItem.y = data.Items[0].temp.toFixed(2);
                tempChart.data.datasets[0].data.push(newItem);
                tempChart.update();

                var newItem = {x: 0, y: 0}
                newItem.x = getFormattedTime(data.Items[0].timestamp)
                newItem.y = data.Items[0].hum.toFixed(2);
                humChart.data.datasets[0].data.push(newItem);
                humChart.update();
            }
            else {
                tempReadings = [data.Items[0].temp.toFixed(2)]
                humReadings = [data.Items[0].hum.toFixed(2)]
                timeReadings = [data.Items[0].timestamp]//[getFormattedTime(data.Items[0].timestamp).substr(0, 8)]
            }
        }
    });
}

function getFormattedTime(timestamp) {
    var currentDate = new Date(timestamp * 1000)
    return  currentDate.getDate() + "/" + ("0" + (currentDate.getMonth() + 1)).substr(-2) + "/" + currentDate.getFullYear() + " " + currentDate.getHours() + ":" + ("0" + currentDate.getMinutes()).substr(-2) + ":" + ("0" + currentDate.getSeconds()).substr(-2)
}

function drawCharts() {
    var dataPoints = []

    for(var i = 0 ; i < timeReadings.length ; i++) {
        var newItem = {x: 0, y: 0}
        newItem.x = getFormattedTime(timeReadings[i])//timeReadings[i];
        newItem.y = tempReadings[i]
        dataPoints.push(newItem)
    }
    tempChart = drawIndividualChart("tempChart", dataPoints)
    
    dataPoints = []
    for(var i = 0 ; i < timeReadings.length ; i++) {
        var newItem = {x: 0, y: 0}
        newItem.x = getFormattedTime(timeReadings[i])//timeReadings[i];
        newItem.y = humReadings[i]
        dataPoints.push(newItem)
    }
    humChart = drawIndividualChart("humChart", dataPoints)
}

//draw a chart with a given type and data
function drawIndividualChart(chartType, readingData) {
    
    var minY = Math.min(...readingData.map(a => a.y)).toFixed() - 1
    var maxY = parseFloat(Math.max(...readingData.map(a => a.y)).toFixed()) + 1;

    var chart = document.getElementById(chartType)
    var ctx = chart.getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],//timestamps,
            datasets: [{
                label: chartType == "tempChart" ? "Temperature" : "Humidity",
                data: readingData ,
                backgroundColor: [
                    chartType == "tempChart" ? 'rgba(255, 99, 132, 0.4)' : 'rgba(128, 50, 255, 0.4)',
                ],
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            animation: {
                duration: 0
            },
            scales: {
                xAxes: [{
                    type: 'time',
                }],
                yAxes: {
                        min: minY,
                        max: Math.min(maxY, 100)
                }
            }
        }
    });
    return myChart
}

function resized() {
    //Keep charts proper size when window changes
    tempChart.style.width = '100%';
    humChart.style.width = '100%';
}

function loadChartsOneDay() {
    queryData(24);

}

function loadChartsOneHour() {
    queryData(1);

}

// function showLoginBox() {
//     //console.log("Login clicked");
//     AWS.CognitoCachingCredentialsProvider. credentialsProvider = new AWS.CognitoCachingCredentialsProvider(
//         getApplicationContext(),
//         "ca-central-1:86d62bd7-4b19-4291-bb34-7e1296ba63e6", // Identity pool ID
//         Regions.CA_CENTRAL_1 // Region
//     );
// }

function refreshTimeSinceLastUpdate() {
    secondsSinceTempUpdate++;
    if(secondsSinceTempUpdate > 31) updateChart();
    document.getElementById("title").innerHTML = "Most Recent Temperature and Humidity Reading: " + Math.floor(secondsSinceTempUpdate) + " seconds ago";
}

function main() {
    window.addEventListener("resize", resized);
    loadChartsOneHour();
    setInterval(refreshTimeSinceLastUpdate, 1000);
}

main()
