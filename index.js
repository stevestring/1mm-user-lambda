const tickers = require('./Tickers.json')
const tickerRegEx = '\\b'+Object.keys(tickers).join('\\b|\\b')+'\\b/g'
var yahooStockPrices = require('yahoo-stock-prices');

const snoowrap = require('snoowrap');
const secrets = require('./secrets.json');

module.exports.handler = async (event, context, callback) => {
        let response;
        let user; //userid parameter from querystring or event
       
        if (event.user && event.user!=="") {
            user =  event.user;
        } else if (event.queryStringParameters && event.queryStringParameters.user && event.queryStringParameters.user !== "") {
            user = event.queryStringParameters.user;
        }
        
       
        //const body = await scrapeSubreddit('spy400qqq300');
        const body = await scrapeSubreddit(user);
        
        response = {
          statusCode: 200,
          headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*' 
          },
          body: JSON.stringify(body)                   
          };
          context.succeed(response);

};

async function scrapeSubreddit(userName ) {
  let retVal={};

  const r = new snoowrap({
      userAgent: secrets.userAgent,
      clientId: secrets.clientId,
      clientSecret: secrets.clientSecret,
      username: secrets.username,
      password: secrets.password
  });  
  
  try{
    await r.getUser(userName).fetch();
    //.log(redditUser);
  }
  catch (err)
  {
    retVal.user = userName;
    retVal.errorMessage = userName+" is not a reddit user";
    return retVal;
  }

  const redditUser = await r.getUser(userName).fetch();
  const userSubmissions= await redditUser.getSubmissions();

  let data = [];
  let trades = [];
  let firstPost = new Date();

  userSubmissions.forEach((post) => {
      if (post.subreddit.display_name==='wallstreetbets')
      {
          var d = new Date(0);
          d.setUTCSeconds(post.created_utc);
  
          // console.log(post.created_utc);
          // console.log(d);

          if (d<firstPost)
          {
            firstPost = d;
          }

          var p = new Post(d, post.title, post.selftext, post.id);
  
          data.push(
              p
          )
      }
  });

  
  //console.log (data);

  for (var i=0; i<data.length; i++)
  {
      if (data[i].hasTrade)
      {
          //console.log (await data[i].tradeJSON());  
          trades.push(await data[i].tradeJSON());
      }
  }
  
  
  retVal.trades = await trades;
  retVal.user = userName;
  retVal.tradeCount = trades.length //How many subreddit posts
  retVal.postCount = data.length+1;//How many actionable trades
  retVal.firstPost = firstPost;

  // //Calc Average performance for 4 time periods
  var sum = [0,0,0,0];
  var numTrades=[0,0,0,0];
  for( var i = 0; i < retVal.trades.length; i++ ){
    for (var j=0;j<4; j++)
    {
      if (!isNaN(retVal.trades[i].performance[j].performance )) {
        //console.log ( j +':' + retVal.trades[i].performance[j].performance);
        sum [j] += retVal.trades[i].performance[j].performance; 
        numTrades [j] ++;
      }
    }
  }

  // console.log(sum);
  // console.log(numTrades);

  var avg = [0,0,0,0];
  for (var j=0;j<4; j++)
  {
      avg[j] = sum[j]/numTrades [j];
  }

  retVal.meanPerformance = [];
  retVal.meanPerformance.push ({days:1, mean: avg[0], trades: numTrades[0]});
  retVal.meanPerformance.push ({days:2, mean: avg[1], trades: numTrades[1]});
  retVal.meanPerformance.push ({days:7, mean: avg[2], trades: numTrades[2]});
  retVal.meanPerformance.push ({days:30, mean: avg[3], trades: numTrades[3]});


  return retVal;

  //Test without Reddit API
      // var d = new Date(0);
      // d.setUTCSeconds(1581033600);
      // var p = new Post(d, 'TSLA 420P 4/17 (closest date to 4/20/20)', '');

      // return await p.tradeJSON();
};

class Post {
    
  constructor(created, title, text, id) {
    this.created = created;
    this.title = title;
    this.text = text;
    this.id = id;    
  }


  get hasTrade() {     
      if (this.tradeTicker != null)
      {
        
          return true;
      }
      return false;
  }

  //spy400qqq300 needs testing
  get tradeDirection()
  {
      if (this.hasTrade)
      {
          var buySell=1;
          var putCall=1;
          //look for BUY/SELL
          if (this.title.search(/(sell|short)/i)!=-1)//Trade for SPY
          {
              buySell = -1; //Sell
          }

          if (this.title.search(/put/i)>0 || this.title.search(/[0-9]{1,5}[P]/i)!=-1)
          {
              putCall = -1;
          }

          return buySell * putCall;
      }
      else
      {
          return 0;
      }
  }

  get longShort()
  {
      if (this.hasTrade)
      {
          if (this.tradeDirection === 1)
          {
              return "LONG";
          }
          else
          {
              return "SHORT";        
          }
      }
  }

  get tradeTicker()
  {
      let tickers = this.title.match(tickerRegEx);
        
      if (tickers!= null)
      {
          return tickers[0];
      }
      else
      {
           
          return null;
      }
  }

  get tradeDescription()
  {
      if (this.hasTrade)
      {            
          return this.performance().then((p)=> {
              return this.created +' '+ this.longShort + ' ' + this.tradeTicker + ' ' 
              // + p.price
              +' "'+this.title + '"';
          })

      }
      else
      {
          return null;
      }
      
  }

  async tradeJSON()
  {

      if (this.hasTrade)
      {        
        
          try{
            let Retval = {};
            Retval.ticker = this.tradeTicker;
            Retval.created= this.created;
            Retval.title = this.title;
            Retval.longShort = this.longShort;          
            Retval.performance = await this.performance();
            Retval.openPrice = Retval.performance[0].tradePrice;
            Retval.commentId = this.id;

            return Retval;
          }
          catch (err)
          {
            console.log(err); 
          }

      }
      else
      {
          return null;
      }
      
  }


  getPriceFromArray(date, priceArray)
  {       
      //console.log (date);
      //date.setHours(0,0,0,0);

      let arrayDate;
      for (let i=0; i<priceArray.length; i++)
      {
          //console.log(priceArray[i].date);
          arrayDate = new Date(parseInt(priceArray[i].date)*1000);
          arrayDate.setHours(16,0,0);
          //console.log(date +':'+ arrayDate);
          if (date <= arrayDate && 
              priceArray[i].adjclose != null) //Dividend entry - keep moving
          {              
              return {date: arrayDate, price: priceArray[i].adjclose};
          }
      }
      return 'price';
  }


  getPrices(startDate, endDate) {

      return new Promise((resolve, reject) => {
    
          yahooStockPrices.getHistoricalPrices(startDate.getMonth(), startDate.getDate(), 
          startDate.getFullYear() , endDate.getMonth(), endDate.getDate(), endDate.getFullYear(),
          this.tradeTicker, '1d',(err, prices)=>{
              if (err) reject(err);
              else resolve(prices);
          });         
      });      
  }



  ///TODO Try to send get prices as an argument to 
  performance()
  {
      if (!this.hasTrade)
      {
          return null;
      }
      else
      {
          let createDate = this.created;
          let thirtyFiveDayDate = new Date (this.created);            

          thirtyFiveDayDate.setDate(createDate.getDate()+35);

          return this.getPrices(createDate, thirtyFiveDayDate)
          .then(prices=> {
              let perfs = [];
              let basis;
              let price;

              prices = prices.reverse(); 

              //Get first trading day since post (i.e. account for weekends and holidays)
              let firstTradeDate = this.getPriceFromArray(createDate,prices);
              let tradeDate = firstTradeDate.date;

              if (tradeDate==null)
              {
                perfs.push ({days: 1, tradeDate:null, tradePrice: null, perfDate:null, perfPrice:null, performance: null});
                perfs.push ({days: 2, tradeDate:null, tradePrice: null, perfDate:null, perfPrice:null, performance: null});
                perfs.push ({days: 7, tradeDate:null, tradePrice: null, perfDate:null, perfPrice:null, performance: null});
                perfs.push ({days: 30, tradeDate:null, tradePrice: null, perfDate:null, perfPrice:null, performance: null});
                return perfs
              }

              let oneDayDate = new Date (tradeDate);
              oneDayDate.setDate(oneDayDate.getDate()+1);
              let twoDayDate = new Date (tradeDate);
              twoDayDate.setDate(twoDayDate.getDate()+2);
              let sevenDayDate = new Date (tradeDate);
              sevenDayDate.setDate(sevenDayDate.getDate()+7);
              let thirtyDayDate = new Date (tradeDate);
              thirtyDayDate.setDate(thirtyDayDate.getDate()+30);                
              
              basis = this.getPriceFromArray(tradeDate,prices);

              price = this.getPriceFromArray(oneDayDate,prices);
              perfs.push ({days: 1, tradeDate:basis.date, tradePrice: basis.price, 
                  perfDate:price.date, perfPrice:price.price, performance: this.calcPerf(basis.price, price.price, this.tradeDirection)})
              
              price = this.getPriceFromArray(twoDayDate,prices);
              perfs.push ({days: 2, tradeDate:basis.date, tradePrice: basis.price, 
                  perfDate:price.date, perfPrice:price.price, performance: this.calcPerf(basis.price, price.price, this.tradeDirection)})

              price = this.getPriceFromArray(sevenDayDate,prices);
              perfs.push ({days: 7, tradeDate:basis.date, tradePrice: basis.price, 
                  perfDate:price.date, perfPrice:price.price, performance: this.calcPerf(basis.price, price.price, this.tradeDirection)})

              price = this.getPriceFromArray(thirtyDayDate,prices);
              perfs.push ({days: 30, tradeDate:basis.date, tradePrice: basis.price, 
                  perfDate:price.date, perfPrice:price.price, performance: this.calcPerf(basis.price, price.price, this.tradeDirection)})

              return perfs;

          })// passed result of getPrices
          .catch(err => {             // called on any reject
              console.log('error', err);
          });
          //return retVal;            
      }

  }
  
  calcPerf(startPrice, endPrice, direction)
  {
      return (endPrice-startPrice)/startPrice * direction* 100;
  }
}
