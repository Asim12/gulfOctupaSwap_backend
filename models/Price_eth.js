const { number } = require('joi');
const Joi = require('joi');
const mongoose = require('mongoose');

const Price_eth = mongoose.model('Price_eth', new mongoose.Schema({
    contract_address : { 
        type: String,
        required: true    
    },
    price : {
        type : Number,
        required:true
    }
}));

module.exports.Price_eth   =   Price_eth;