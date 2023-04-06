const limitOrderHelper  =  require('../helper/limitOrder')
module.exports = {
    complete_order : async() => {
        console.log("Complete order cron starting...")
        let count = await limitOrderHelper.moveCompleteOrder("ETH");
        console.log("Order moves into Complete order collection ===>>>", count)
    }
}