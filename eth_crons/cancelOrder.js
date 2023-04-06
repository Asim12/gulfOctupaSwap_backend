const limitOrderHelper  =  require('../helper/limitOrder')
module.exports = {
    cancel_order : async() => {
        let orderCount = await limitOrderHelper.getNewOrder("ETH")
        console.log("Total canceled order count  ====>>>>",  orderCount)
    },

    move_cancel_order : async () => {
        console.log("<<<<<======= Cancel order move ======>>>>>")
        let count = await limitOrderHelper.moveCancelOrders("ETH")
        console.log("Total canceled order count  ====>>>>",  count)
    }
}