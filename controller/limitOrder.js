var express = require('express');
var router = express.Router();
const limitHelper = require("../helper/limitOrder")
const { validate } = require("../models/Order_bsc")
router.post('/createLimitOrder', async (req, res) => {
    validate
    const { error } = validate(req.body);
    if (error) {
        let response = {};
        response.Status = 400;
        response.Error = error.details[0].message;
        return res.status(400).send(response);
    }
    let {userId, from_contract_address, to_contract_address, quantity, sellPrice, sellDateBefore, orderType, providerType, from_symbol, to_symbol } = req.body
    let response = await limitHelper.createOrder(userId, from_contract_address, to_contract_address, quantity, sellPrice, sellDateBefore, orderType, providerType,  from_symbol, to_symbol)
    if(response == true){
        res.status(200).send({message: "Your order is created successflly"})
    }else{
        res.status(400).send({message : "Order not created there is some issue try again later"})
    }
})

router.post("/getMyOrder", async(req, res) => {
    let {userId, status, providerType} = req.body
    if(userId && status && providerType){
       let orders =  await limitHelper.getOrders(userId, status, providerType);
       res.status(200).send({orders : orders})
    }else{
        res.status(400).send({message : "Payload missing"})
    }
})

router.post("/cancelOrder", async(req, res) => {
    let {orderId, userId, providerType} = req.body
    if(orderId && userId && providerType){
        let status = await limitHelper.cancelOrder(orderId, userId, providerType);
        let response = (status == true) ? {status: 200, message: "Your order is successfully cancelled"} : {status: 400, message: "There is some issue please try again later"}
        res.status(response.status).send(response)
    }else{
        res.status(400).send({message : "Payload missing"})
    }
})

router.post("/deleteOrder", async(req, res) => {
    let {orderId, userId, providerType} = req.body
    if(orderId && userId && providerType){
        let status = await limitHelper.deleteOrder(orderId, userId, providerType);
        let response = (status == true) ? {status: 200, message: "Your order is successfully deleted"} : {status: 400, message: "There is some issue please try again later"}
        res.status(response.status).send(response)
    }else{
        res.status(400).send({message : "Payload missing"})
    }
})

router.post("/pausePlayOrder", async(req, res) => {
    let {orderId, userId, status, providerType} = req.body
    if(orderId && userId && status && providerType){
        let data = await limitHelper.pausePlayOrderStatus(orderId, userId, status, providerType);
        let response = (data == true) ? {status : 200, message: "Your order is successfully paused"} : {status: 400, message: "There is some issue please try again later"}
        res.status(response.status).send(response)
    }else{
        res.status(400).send({message : "Payload missing"})
    }
})

router.post("/editOrder", async(req, res) => {
    let {orderId, userId, newPrice, newQuantity, newDate, providerType} = req.body
    if(orderId && userId && newPrice && newQuantity && newDate && providerType){
        let status = await limitHelper.updateOrder(orderId, userId, newPrice, newQuantity, newDate, providerType)
        let response = (status == true) ? {status: 200, message: "Order is successfully updated"} : {status: 400, message: "Something went wrong"}
        res.status(response.status).send(response)
    }else{
        res.status(400).send({message : "Payload missing"})
    }
})
module.exports = router;