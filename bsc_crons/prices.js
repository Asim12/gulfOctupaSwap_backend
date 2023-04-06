const limitOrderHelper = require('../helper/limitOrder')
const CoinMarketCap = require('node-coinmarketcap');
const coinmarketcap = new CoinMarketCap();
const fetch = require('node-fetch');
const helper = require("../helper/authHelper")
const { Price_bsc } = require('../models/Price_bsc')
module.exports = {
    //coin marketcap prices
    price: () => {
        fetch('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=5000', {
            method: 'GET',
            headers: {
                'Postman-Token': '34a36f0e-88f4-4d46-8d2b-c0f5e620d71d',
                'cache-control': 'no-cache',
                Authorization: 'Basic ZGlnaWVib3QuY29tOllhQWxsYWg=',
                'Content-Type': 'application/json',
                'X-CMC_PRO_API_KEY': '4ebe5ba4-8e71-43e1-89a4-e386d9b3866f',
                "start" : 1,
                "limit": 5000
            }
        }).then(res => res.json()).then(json => {

            let prices = json.data
            console.log(" =============>>>>>>>>> length ", prices.length )
            for (var i = 0; i < prices.length; i++) {
                let insertedArray = {
                    name: prices[i]['name'],
                    symbol: prices[i]['symbol'],
                    slug: prices[i]['slug'],
                    price: prices[i]['quote']['USD']['price'],
                    volume_24h: prices[i]['quote']['USD']['volume_24h'],
                    percent_change_1h: prices[i]['quote']['USD']['percent_change_1h'],
                    percent_change_24h: prices[i]['quote']['USD']['percent_change_24h'],
                    percent_change_7d: prices[i]['quote']['USD']['percent_change_7d'],
                    percent_change_30d: prices[i]['quote']['USD']['percent_change_30d'],
                    percent_change_60d: prices[i]['quote']['USD']['percent_change_60d'],
                    percent_change_90d: prices[i]['quote']['USD']['percent_change_90d'],
                    market_cap: prices[i]['quote']['USD']['market_cap'],
                    created_date: new Date(),
                    updateed_date : new Date()
                }
                console.log(insertedArray)
                let where = { symbol: json.data[i]['symbol'] }
                Price_bsc.updateOne(where, { $set: insertedArray }, { upsert: true }, async (err, result) => {
                    if (err) {
                        console.log('We are Getting some DataBase Error!!')
                    } else {
                        //console.log('Updated SuccessFully Market Prices!!!')
                    }
                })

            }//end loop

        }).catch(err => console.log(err))
    },
}