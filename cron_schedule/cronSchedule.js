const cron      =   require('node-cron');
const coinToToken_bsc = require("../bsc_crons/coinToToken")
const tokenToCoin_bsc = require("../bsc_crons/TokenToCoin");
const tokenToToken_bsc = require("../bsc_crons/tokenToToken")
const cancelOrder_bsc = require("../bsc_crons/cancelOrder")
const prices = require("../bsc_crons/prices")
const complete_order_bsc = require("../bsc_crons/completeOrder")

const cancelOrder_eth = require("../eth_crons/cancelOrder")
const coinToToken_eth = require("../eth_crons/coinToToken")
const tokenToCoin_eth = require("../eth_crons/TokenToCoin");
const tokenToToken_eth = require("../eth_crons/tokenToToken")

const db = require('../database/connection')
db()

//######################################################################################################
//######################################################################################################
//#########################################        BNB CORONS       ####################################
//######################################################################################################
//######################################################################################################
cron.schedule('*/55 * * * * *', () => {
    cancelOrder_bsc.cancel_order();
});

cron.schedule('*/20 * * * * *', () => {
    coinToToken_bsc.coin_to_token();
});

cron.schedule('*/30 * * * * *', () => {
    tokenToCoin_bsc.token_to_coin();
});

cron.schedule('*/30 * * * * *', () => {
    tokenToToken_bsc.token_to_token();
});

cron.schedule('*/20 * * * * *', () => {
    prices.price();
});

cron.schedule('*/10 * * * * *', () => {
    complete_order_bsc.complete_order();
});

cron.schedule('*/10 * * * * *', () => {
    cancelOrder_bsc.move_cancel_order();
});



//######################################################################################################
//######################################################################################################
//#########################################        ETH CORONS       ####################################
//######################################################################################################
//######################################################################################################
cron.schedule('*/3 * * * * *', () => {
    cancelOrder_eth.cancel_order();
});

cron.schedule('*/10 * * * * *', () => {
    cancelOrder_eth.move_cancel_order();
});

cron.schedule('*/3 * * * * *', () => {
    coinToToken_eth.coin_to_token();
});

cron.schedule('*/3 * * * * *', () => {
    tokenToCoin_eth.token_to_coin();
});

cron.schedule('*/3 * * * * *', () => {
    tokenToToken_eth.token_to_token();
});

cron.schedule('*/10 * * * * *', () => {
    cancelOrder_eth.move_cancel_order();
});
