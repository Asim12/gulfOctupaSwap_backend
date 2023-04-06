const Joi      =  require('joi');
const mongoose =  require('mongoose');
const Sell_order_bsc = mongoose.model('Sell_order_bsc', new mongoose.Schema({
    userId : {
        type: String,
        required: true
    },
    orderType : {
        type: String,
        required: true
    },
    from_contract_address: {
        type: String,
        required: true
    },
    to_contract_address: {
        type: String,
        required: true,
    },
    from_symbol: {
        type: String,
        required: true,
    },
    to_symbol:{
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true
    },
    sellPrice : {
        type : Number,
        required : true
    },
    sellDateBefore:{
        type : Date,
        required : true
    },
    status: {
        type: String,
        required : true
    },
    providerType : {
        type : String,
        required :true
    },
    created_date : {
        type: Date,
        required : true
    },
    updated_date : {
        type: Date,
        required : true
    },
    sold_price : {
        type:Number,
        required:true
    },
    sell_date: {
        type : Date,
        required: true
    },
    transaction_hash : {
        type : String,
        required : true
    }
}));
module.exports.Sell_order_bsc    =   Sell_order_bsc;
