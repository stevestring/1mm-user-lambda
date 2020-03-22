var csv = require('csvtojson');
let fs = require("fs");
let path = require("path");
const https = require("https");
const url = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Confirmed.csv';

module.exports.handler = (event, context, callback) => {
        let response;
        // To debug your problem
        var usJson = {"Province/State":"United States","Country/Region":"US","Lat":"47.4009","Long":"-121.4905","TimeSeries":{"1/22/20":"0","1/23/20":"0","1/24/20":"0","1/25/20":"0","1/26/20":"0","1/27/20":"0"}};
        https.get(url, function(res) {
            var body = '';
        
            res.on('data', function(chunk) {
              body += chunk;
            });
        
            res.on('end', function() {
              var data = body;

                var newString =  data.toString().replace(/([0-2][0-9]|[0-9])[\/]([0-3][0-9]|[0-9])/g, 
                function (x) {
                    return 'TimeSeries.'+x;
                }
                )        

                csv({
                    output: "json"
                })
                .fromString(newString)
                .then((jsonObj)=>{
                    //Only US states
                    var filtered = jsonObj.filter(a=>a["Country/Region"] === "US"
                    && a["Province/State"].search(",") === -1);

                    //Create USA element by adding up all states
                    filtered.forEach(function(item) {
                      for (var key in item.TimeSeries) {
                        if (item.TimeSeries.hasOwnProperty(key)) {
                          if (usJson.TimeSeries.hasOwnProperty(key)) {                          
                            usJson.TimeSeries[key] = parseInt(usJson.TimeSeries[key])+ parseInt(item.TimeSeries[key]);
                          }
                          else
                          {
                            usJson.TimeSeries[key] = parseInt(item.TimeSeries[key]);
                          }
                        }
                      }
                      });
                    filtered.push(usJson);
                    response = {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*' 
                            },
                            body: JSON.stringify(filtered)                   
                            };
                    context.succeed(response);
                });                      
            
    });
    }).on('error', function(err) {
      console.log("Something went wrong");
      console.log(err);
    });
        
        

};

