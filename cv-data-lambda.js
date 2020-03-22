var http = require('http');
var csv = require('csvtojson');
const readFile = require('fs').readFile;
const csvFilePath=  ('./data.csv');

readFile(csvFilePath, 'utf-8', (err, fileContent) => {
  if(err) {
      console.log(err); // Do something to handle the error or just throw it
      throw new Error(err);
  }
  else {
  var newString =  fileContent.replace(/([0-2][0-9]|[0-9])[\/]([0-3][0-9]|[0-9])/g, 
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
      console.log (jsonObj[0]);
      //console.log(jsonObj);
      //res.json(jsonObj);
  });
  }
});



// http.createServer(function (req, res) {
//   res.writeHead(200, {'Content-Type': 'text/html'});
//   res.end('Hello World!');
// }).listen(8080);