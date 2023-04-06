const limitOrderHelper  =  require('../helper/limitOrder')
var axios = require('axios');
module.exports = {
    coin_to_token : async() => {
        let orders = await limitOrderHelper.getLimitOrders_eth("coin_to_token");
        console.log("order count ===>", orders.length)
        if (orders.length > 0) {
            for (let orderLoop = 0; orderLoop < orders.length; orderLoop++) {
                let orderId = orders[orderLoop]["_id"]
                let userId = orders[orderLoop]["userId"]
                let amount = orders[orderLoop]["quantity"]
                let providerType = orders[orderLoop]["providerType"]
                let contract_address = orders[orderLoop]["to_contract_address"]
                let status = orders[orderLoop]['status']
                if (orders[orderLoop]["prices"].length > 0) {
                    var data = JSON.stringify({
                       "etherAmount": amount,
                       "contract_address": contract_address,
                        "providerType": providerType,
                        "userId": userId,
                    });
                    var config = {
                        method: 'post',
                        url: 'http://localhost:3000/etherSwapping/coinToTokenSwap',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        data: data
                    };
                    axios(config)
                        .then(async function (response) {
                            console.log(JSON.stringify(response.data));
                            await limitOrderHelper.makeOrderSold(orderId, providerType, orders[orderLoop].prices[0].price, response.data.hash);
                        })
                        .catch(async(error) => {
                            await limitOrderHelper.orderUpdate(orderId, providerType, "error")
                            console.log("catch_id ====>>>", error.response.data)
                        });
                } else {
                    console.log("else ======>")
                    await limitOrderHelper.orderUpdate(orderId, providerType, status)
                }
            }
        } else {
            console.log("No order found");
        }
    }
}