const Joi = require('joi');
const mongoose = require('mongoose');

const Price_bsc = mongoose.model('Price_bsc', new mongoose.Schema({
    name : { 
        type: String,
        required: true    
    },
    symbol : {
        type : String,
        required:true
    },
    slug : {
        type:String,
        required:true
    },
    price: {
        type: Number,
        required:true
    },
    volume_24h: {
        type: Number,
        required:true
    },
    percent_change_1h: {
        type: Number,
        required:true
    },
    percent_change_24h: {
        type: Number,
        required:true
    },
    percent_change_7d :{
        type: Number,
        required:true
    },
    percent_change_30d: {
        type: Number,
        required:true
    },
    percent_change_60d : {
        type: Number,
        required:true
    },
    percent_change_90d : {
        type: Number,
        required:true
    },
    market_cap:{
        type: Number,
        required:true
    },
    created_date : {
        type: Date,
        required:true
    },
    updateed_date : {
        type: Date,
        required:true 
    }
}));

module.exports.Price_bsc   =   Price_bsc;