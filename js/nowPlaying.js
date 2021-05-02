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

var songProgress = 0;

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

    const data = await docClient.query(params).promise();
    if(data.Items.length > 0 && data.Items[0].s != latestSong) {
        songProgress = 0;
        latestSong = data.Items[0].s;
        latestArtist = data.Items[0].a
        latestSongDuration = data.Items[0].d
    }
}

async function getLastStatus() { var params = {
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

    const data = await docClient.query(params).promise();

    if(data.Items.length > 0) {
        if(latestStatusTime != null) {     
            if(latestStatusTime != data.Items[0].t && data.Items[0].z == "Play") {
                getLastSong(); // song changed
            }
        }
        latestStatus = data.Items[0].z
        latestStatusTime = data.Items[0].t
        songProgress = 0;
        if("p" in data.Items[0]) songProgress = data.Items[0].p;
    }
}

function updatePlayback() {
    if(latestStatus == "Stopped") {
        nowPlayingText = nothingPlaying()
    }
    else if(latestSongDuration + latestStatusTime + 60 < Date.now() / 1000) {
        nowPlayingText = nothingPlaying()
    }
    else {
        var duration = latestSongDuration;
        var progress =  Date.now() / 1000 - latestStatusTime + songProgress;

        if(latestStatusTime + latestSongDuration < new Date().getTime() / 1000) nowPlayingSongText = "Nothing";
    
        nowPlayingSongText = latestArtist + " - " + latestSong;
        if(!latestArtist) nowPlayingSongText = " - " + latestSong;
    
        var percentDone = progress / parseInt(latestSongDuration)
        updatePlaybackBar(percentDone);
    
        var timeText = getCurrentPlaybackTime(progress, duration);
        var nowPlayingText = nowPlayingBaseText + nowPlayingSongText + " - " + timeText;
        nowPlayingText += (latestStatus == "Paused" ? " - " + latestStatus : "");
    }

    document.getElementById("nowPlaying").innerHTML = nowPlayingText;
}

function nothingPlaying() {

    var cssString = "linear-gradient(90deg, #f1f1f1 0%, #000000 0%"
    document.getElementById("playbackBar").style.background = cssString;
    return nowPlayingBaseText + "Nothing"
}

function getCurrentPlaybackTime(progress, duration) {
    var completedTimeText;
    if(latestStatus == "Paused") {
        completedTimeText = Math.floor(songProgress / 60).toString().padStart(2, '0') + ":" + Math.floor(songProgress % 60).toString().padStart(2, '0');
    }
    else {
        completedTimeText = Math.floor(progress / 60).toString().padStart(2, '0') + ":" + Math.floor(progress % 60).toString().padStart(2, '0');
    }
    var totalTimeText = Math.floor(duration / 60).toString().padStart(2, '0') + ":" + Math.floor(duration % 60).toString().padStart(2, '0')
    return completedTimeText + "/" + totalTimeText;
}

function updatePlaybackBar(percentDone) {
    if(latestStatus == "Paused") {
        percentDone = (songProgress / latestSongDuration);
    }
    var cssString = "linear-gradient(90deg, #f1f1f1 ".concat(percentDone * 100, "%, #000000 ", 1 - percentDone,  "%)");
    document.getElementById("playbackBar").style.background = cssString;
}

async function main() {
    
    await getLastSong();
    await getLastStatus();
    updatePlayback();

    setInterval(getLastStatus, 2000);
    setInterval(updatePlayback, 250);
}

main()