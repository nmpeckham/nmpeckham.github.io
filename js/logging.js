AWS.config.region = 'ca-central-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ca-central-1:1453e5ba-641c-4717-a93b-0d7434d591f3',
});

var docClient = new AWS.DynamoDB.DocumentClient();
var nowPlayingData;
var checkInterval;
var secondsSinceTempUpdate;
var defaultFetchTime = 1;
var paused = false;

const nowPlayingBaseText = "Now Playing: ";
var nowPlayingSongText = "Nothing";
var nowPlayingTimeText = "0:00";

var latestSong = "";
var latestArtist = "";
var latestSongDuration = 0;
var latestStatus = "";
var latestStatusTime;

var completedTimeText = "0:00"
var totalTimeText = "0:00"

var secondsPaused = 0;

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
        document.getElementById("title").innerHTML = "Most Recent Temperature and Humidity Reading: " + Math.floor(timeSinceLastUpdate) + " seconds ago";
        secondsSinceTempUpdate = timeSinceLastUpdate;

        document.getElementById("charts").innerHTML = 
        `<div><canvas id="tempChart"></canvas></div>
         <div><canvas id="humChart"></canvas></div>`
        drawChart("tempChart", data.Items.map(a=> a.temp.toFixed(2)).reverse(), data.Items.map(a=> getFormattedTime(a.timestamp).substr(0, 8)).reverse())
        drawChart("humChart", data.Items.map(a=> a.hum.toFixed(2)).reverse(), data.Items.map(a=> getFormattedTime(a.timestamp).substr(0, 8)).reverse())
    });
}

async function getLastSong(maxTime = null) {
    if(maxTime == null) maxTime = new Date().getTime() / 1000;
    var params = {
        TableName : "nowPlayingSong",
        KeyConditionExpression: '#id = :n',
        ExpressionAttributeValues: {
            ':n': "Nathan",
        },
        ExpressionAttributeNames: {
            '#id': "id",
        },
        ScanIndexForward: false,
        Limit: 1
    };

    await docClient.query(params, function(err, data) {
        console.log("Song");
        console.log(data);
        if(err) console.log(err);
        if(data.Items.length > 0 && data.Items[0].s != latestSong) {
            songProgress = 0;
            latestSong = data.Items[0].s;
            latestArtist = data.Items[0].a
            latestSongDuration = data.Items[0].d
        }
    });
}

async function getLastStatus() {    var params = {
        TableName : "nowPlayingStatus",
        KeyConditionExpression: '#id = :n',
        ExpressionAttributeValues: {
            ':n': "Nathan",
        },
        ExpressionAttributeNames: {
            '#id': "id",
        },
        ScanIndexForward: false,
        Limit: 1
    };

    await docClient.query(params, function(err, data) {
        console.log("Status");
        console.log(data)
        if(err) console.log(err);
        else if(data.Items.length > 0) {
            if(latestStatusTime != null) {     
                if(latestStatusTime != data.Items[0].t && data.Items[0].z == "Play") {
                    getLastSong(); // song changed
                }
                latestStatus = data.Items[0].z
                latestStatusTime = data.Items[0].t
                progress = data.Items[0].p;
                if(latestStatus == "Unpaused" || latestStatus == "Play") secondsPaused = 0;
            }
            else {
                latestStatus = data.Items[0].z
                latestStatusTime = data.Items[0].t
                progress = data.Items[0].p;
                if(latestStatus == "Unpaused" || latestStatus == "Play") secondsPaused = 0;
            }

        }
    });
}

function updatePlayback() {
    console.log(latestArtist);
    console.log(latestSong);

    var duration = latestSongDuration;
    var progress =  Date.now() / 1000 - latestStatusTime;
    //Hasn't changed song when it should have
    if(latestStatusTime + latestSongDuration < new Date().getTime() / 1000) nowPlayingSongText = "Nothing";
    if(latestStatus == "Paused") {

    }
    else {
         nowPlayingSongText = latestArtist + " - " + latestSong;
         if(!latestArtist) nowPlayingSongText = " - " + latestSong;

        var percentDone = progress / parseInt(latestSongDuration)
        updatePlaybackBar(percentDone);
    }
    // else if(latestStatus == "Paused" && latestStatusTime > latestSongTime) {
    //     nowPlayingSongText = latestArtist + " - " + latestSong;
    //     if(latestArtist == "") nowPlayingSongText += " - " + latestArtist;
    //     latestSongTime -= 0.25
    //     updateSecondsPaused();
    // }
    // else if(latestStatus == "Paused") {
    //     document.getElementById("nowPlaying").innerHTML += " - " + latestStatus;    //paused or stopped
    // }
    // else {
    //     console.log(latestSongTime)
    //     console.log(secondsPaused)
    //     var progress = Date.now() / 1000 - latestSongTime + secondsPaused;
    //     var percentDone = progress / parseInt(latestSongDuration)

    //     if(latestSongDuration + latestSongTime < (new Date() / 1000)) {
    //         nowPlayingSongText = "Nothing"
    //         document.getElementById("playbackBar").style.background = "#000000";
    //     }
    //     else {
    //         if(latestArtist == "") {
    //             nowPlayingSongText = latestSong;
    //         }
    //         else {
    //             nowPlayingSongText = latestSong + " - " + latestArtist;
    //         }
    //         completedTimeText = Math.floor(progress / 60).toString().padStart(2, '0') + ":" + Math.floor(progress % 60).toString().padStart(2, '0')
    //         var duration = latestSongDuration;
    //         var durationString = Math.floor(duration / 60).toString().padStart(2, '0') + ":" + Math.floor(duration % 60).toString().padStart(2, '0')
    //         nowPlayingTimeText = completedTimeText + "/" + durationString;
        
    //         var cssString = "linear-gradient(90deg, #f1f1f1 ".concat(percentDone * 100, "%, #000000 ", 1 - percentDone,  "%)");
    //         document.getElementById("playbackBar").style.background = cssString;
    //         if(percentDone > 1) {
    //             getLastSong();
    //         }
    //     }
    // }
    var timeText = getCurrentPlaybackTime(progress, duration);
    var nowPlayingText = nowPlayingBaseText + nowPlayingSongText + " - " + timeText;
    if(latestStatus != "Play") nowPlayingText += latestStatus;
    document.getElementById("nowPlaying").innerHTML = nowPlayingText;

    console.log(latestStatus);

}

function getCurrentPlaybackTime(progress, duration) {
    console.log(progress);
    var completedTimeText = Math.floor(progress / 60).toString().padStart(2, '0') + ":" + Math.floor(progress % 60).toString().padStart(2, '0');
    var totalTimeText = Math.floor(duration / 60).toString().padStart(2, '0') + ":" + Math.floor(duration % 60).toString().padStart(2, '0')
    return completedTimeText + "/" + totalTimeText;
}

function updatePlaybackBar(percentDone) {
    var cssString = "linear-gradient(90deg, #f1f1f1 ".concat(percentDone * 100, "%, #000000 ", 1 - percentDone,  "%)");
    document.getElementById("playbackBar").style.background = cssString;
}

function updateSecondsPaused() {
    secondsPaused = new Date().getTime() / 1000 - latestStatusTime
    console.log(secondsPaused);
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
    document.getElementById("title").innerHTML = "Most Recent Temperature and Humidity Reading: " + Math.floor(secondsSinceTempUpdate) + " seconds ago";
}

window.addEventListener("resize", resized);
loadChartsOneHour();
getLastSong();
getLastStatus();
setInterval(getLastStatus, 2000);
setInterval(updatePlayback, 250);
setInterval(refreshTimeSinceLastUpdate, 1000);