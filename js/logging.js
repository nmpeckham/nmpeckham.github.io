AWS.config.region = 'ca-central-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ca-central-1:1453e5ba-641c-4717-a93b-0d7434d591f3',
});

var docClient = new AWS.DynamoDB.DocumentClient();
var nowPlayingData;
var checkInterval;
var secondsSinceTempUpdate;
var defaultFetchTime = 1

function queryData(hoursToGet) {
    if(hoursToGet != defaultFetchTime) hoursToGet = defaultFetchTime;
    var currentDate = new Date()
    var minTime = currentDate.setHours(currentDate.getHours() - hoursToGet) / 1000;

    var params = {
        TableName : "tempLogs",
        IndexName: "device-index",
        KeyConditionExpression: "#D = :d AND #T > :t",
        ScanIndexForward: false,
        //Limit: numSamples,
        //FilterExpression: "#T < :t",
        ExpressionAttributeNames: {"#D": "device", "#T": "timestamp"},
        ExpressionAttributeValues: {":d": "0", ":t":  minTime}
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2));
        }
        document.getElementById("temp").innerHTML = "Temperature" + "<br>" + data.Items[0].temp.toFixed(1) + "&degC"
        document.getElementById("hum").innerHTML = "Humidity" + "<br>" + data.Items[0].hum.toFixed(1) + "%"
        var timeSinceLastUpdate = Date.now() / 1000 - data.Items[0].timestamp;
        document.getElementById("title").innerHTML = "Most Recent Reading: " + Math.floor(timeSinceLastUpdate) + " seconds ago";
        secondsSinceTempUpdate = timeSinceLastUpdate;

        document.getElementById("charts").innerHTML = 
        `<div><canvas id="tempChart"></canvas></div>
         <div><canvas id="humChart"></canvas></div>`
        drawChart("tempChart", data.Items.map(a=> a.temp.toFixed(2)).reverse(), data.Items.map(a=> getFormattedTime(a.timestamp).substr(0, 8)).reverse())
        drawChart("humChart", data.Items.map(a=> a.hum.toFixed(2)).reverse(), data.Items.map(a=> getFormattedTime(a.timestamp).substr(0, 8)).reverse())
    });
}

function checkNowPlaying() {
    var params = {
        TableName : "nowPlaying",
        Limit: 1,
        KeyConditionExpression: '#id = :n and t > :a',
        ExpressionAttributeValues: {
            ':n': "Nathan",
            ":a": 0
        },
        ExpressionAttributeNames: {
            '#id': "id"
        },
        ScanIndexForward: false,
    };

    docClient.query(params, function(err, data) {
        if(nowPlayingData == undefined || data.Items[0].t != nowPlayingData.Items[0].t) {
            nowPlayingData = data;
            clearInterval(checkInterval);
            checkInterval = window.setInterval(updatePlayback, 500);
            updatePlayback();
        }

    });
}

function updatePlayback() {
    let startTime = (nowPlayingData.Items[0].t)
    var percentDone = (Date.now() / 1000 - startTime ) / parseInt(nowPlayingData.Items[0].d)

    var progress = Date.now() / 1000 - nowPlayingData.Items[0].t
    if(nowPlayingData.Items[0].t + nowPlayingData.Items[0].d < (new Date() / 1000) + 10) {
        document.getElementById("nowPlaying").innerHTML = "Now Listening To: Nothing";
    }
    else {
        if(nowPlayingData.Items[0].a == undefined) {
            document.getElementById("nowPlaying").innerHTML = "Now Listening To: " + nowPlayingData.Items[0].l
        }
        else {
            document.getElementById("nowPlaying").innerHTML = "Now Listening To: " + nowPlayingData.Items[0].a + " - " + nowPlayingData.Items[0].l
        }
        if(percentDone <= 1) {
            var progressString = Math.floor(progress / 60).toString().padStart(2, '0') + ":" + Math.floor(progress % 60).toString().padStart(2, '0')
            var duration = nowPlayingData.Items[0].d;
            var durationString = Math.floor(duration / 60).toString().padStart(2, '0') + ":" + Math.floor(duration % 60).toString().padStart(2, '0')
            document.getElementById("nowPlaying").innerHTML += " - " + progressString + "/" + durationString;
        
            var cssString = "linear-gradient(90deg, #f1f1f1 ".concat(percentDone * 100, "%, #000000 ", 1 - percentDone,  "%)");
            document.getElementById("playbackBar").style.background = cssString;
        }
        if(percentDone > 1) {
            clearInterval(checkInterval)
            checkNowPlaying();
        }
    }
}

function getFormattedTime(timestamp) {
    var currentDate = new Date(timestamp * 1000)
    return currentDate.getHours() + ":" + ("0" + currentDate.getMinutes()).substr(-2) + ":" + ("0" + currentDate.getSeconds()).substr(-2) + " " + currentDate.getDate() + "/" + ("0" + (currentDate.getMonth() + 1)).substr(-2) + "/" + currentDate.getFullYear()
}

function drawChart(type, readingData, timestamps) {
    var minY = (Math.min(...readingData)).toFixed() - 1;
    var maxY = parseFloat((Math.max(...readingData)).toFixed()) + 1;

    var canvas = document.getElementById(type)
    var ctx = canvas.getContext('2d');
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
            animation: {
                duration: 0
            },
            scales: {
                yAxes: [{
                    ticks: {
                        min: minY,
                        max: Math.min(maxY, 100)
                    }
                }]
            }
        }
    });
}

function resized() {
    //Keep charts proper size when window changes
    document.getElementById("tempChart").style.width = '100%';
    document.getElementById("humChart").style.width = '100%';
}

function loadChartsOneDay() {
    defaultFetchTime = 24;
    queryData(24);

}

function loadChartsOneHour() {
    defaultFetchTime = 1;
    queryData(1);

}

// function showLoginBox() {
//     //console.log("Login clicked");
//     AWS.CognitoCachingCredentialsProvider credentialsProvider = new AWS.CognitoCachingCredentialsProvider(
//         getApplicationContext(),
//         "ca-central-1:86d62bd7-4b19-4291-bb34-7e1296ba63e6", // Identity pool ID
//         Regions.CA_CENTRAL_1 // Region
//     );
//     AWS.
// }

function refreshTimeSinceLastUpdate() {
    secondsSinceTempUpdate++;
    if(secondsSinceTempUpdate > 31) queryData();
    document.getElementById("title").innerHTML = "Most Recent Reading: " + Math.floor(secondsSinceTempUpdate) + " seconds ago";
}

window.addEventListener("resize", resized);
loadChartsOneHour();
checkNowPlaying();
setInterval(checkNowPlaying, 2000)
setInterval(refreshTimeSinceLastUpdate, 1000)