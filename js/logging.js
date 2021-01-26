


AWS.config.region = 'ca-central-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'ca-central-1:1453e5ba-641c-4717-a93b-0d7434d591f3',
});
document.getElementById("temp").innerHTML = "35.2"

var docClient = new AWS.DynamoDB.DocumentClient();

function queryData() {
    var params = {
        TableName : "tempLogs",
        IndexName: "device-index",
        KeyConditionExpression: "#T = :t",
        ScanIndexForward: false,
        Limit: 1,
        // FilterExpression: "#T > :t",
        ExpressionAttributeNames: {"#T": "device"},
        ExpressionAttributeValues: {":t": "0"}
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error: " + "\n" + JSON.stringify(err, undefined, 2));
        } else {
            console.log("Querying for movies from 1985: " + "\n" + JSON.stringify(data, undefined, 2));
        }
        console.log(data.Items[0].hum)
        document.getElementById("temp").innerHTML = "Temperature" + "<br>" + data.Items[0].temp.toFixed(1) + "&degC"
        document.getElementById("hum").innerHTML = "Humidity" + "<br>" + data.Items[0].hum.toFixed(1) + "%"
    });
}

queryData()


