var csv = require('csvtojson');
let fs = require("fs");
let path = require("path");
const https = require("https");
const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv';

module.exports.handler = (event, context, callback) => {
        let response;
        // To debug your problem

        https.get(url, function(res) {
            var body = '';
        
            res.on('data', function(chunk) {
              body += chunk;
            });
        
            res.on('end', function() {
              var data = body;

                //console.log(data);
                
                var newString =  data.toString().replace(/([0-2][0-9]|[0-9])[\/]([0-3][0-9]|[0-9])/g, 
                function (x) {
                    return 'TimeSeries.'+x;
                }
                )        
                //console.log(newString); 

                csv({
                    output: "json"
                })
                .fromString(newString)
                .then((jsonObj)=>{
                    //console.log(jsonObj);

                    //Only US states
                    var filtered = jsonObj.filter(a=>a["Country/Region"] === "US"
                    && a["Province/State"].search(",") === -1);

                    

                    response = {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*' 
                            },
                            body: JSON.stringify(filtered)                   
                            };
                    //response = jsonObj;
                    context.succeed(response);
                    //callback(null, response);
                });
        
                //return response;
                //console.log("response: " + JSON.stringify(response));
            
            
            
    });
    }).on('error', function(err) {
      console.log("Something went wrong");
      console.log(err);
    });
        
        

};

