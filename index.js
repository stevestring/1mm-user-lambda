var csv = require('csvtojson');
let fs = require("fs");
let path = require("path");
const https = require("https");
const url = 'https://www.bing.com/covid/graphdata';

module.exports.handler = (event, context, callback) => {
        let response;
        // To debug your problem
        //var usJson = {"Province/State":"United States","Country/Region":"US","Lat":"47.4009","Long":"-121.4905","TimeSeries":{"1/22/20":"0","1/23/20":"0","1/24/20":"0","1/25/20":"0","1/26/20":"0","1/27/20":"0"}};
        
        
        https.get(url, function(res) {
            var body = '';
        
            res.on('data', function(chunk) {
              body += chunk;
            });
        
            res.on('end', function() {
              var data = JSON.parse(body);             
              for (var key in data) {               
                //console.log(key + " -> " + data1[0].TimeSeries[key]);
                if (key.search("houstoncounty_alabama_unitedstates") ==-1 )
                {
                  //console.log("delete");
                  delete data[key];
                }    
              } 
              
              response = {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*' 
                },
                body: JSON.stringify(data)                   
                };
                context.succeed(response);
              });                      
            

    }).on('error', function(err) {
      console.log("Something went wrong");
      console.log(err);
    });
        
        

};

