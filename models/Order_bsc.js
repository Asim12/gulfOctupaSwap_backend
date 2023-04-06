const Joi      =  require('joi');
const mongoose =  require('mongoose');
const Order_bsc = mongoose.model('Order_bsc', new mongoose.Schema({
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
    cron_update_time : {
        type : Date,
        required: true
    },
    sold_price : {
        type : Number
    },
    sell_date : {
        type : Date
    },
    transaction_hash : {
        type : String
    }
}));
function validateOrder(Order_bsc){
    const schema = Joi.object({
        userId              : Joi.string().required(),
        from_contract_address: Joi.string().required(),
        to_contract_address : Joi.string().required(),
        quantity            : Joi.number().required(),
        sellPrice           : Joi.number().required(),
        orderType           : Joi.string().required(),
        sellDateBefore      : Joi.date().required(),
        providerType        : Joi.string().required(),
        from_symbol         : Joi.string().required(), 
        to_symbol           : Joi.string().required()
    });
    return schema.validate(Order_bsc);
}
module.exports.Order_bsc        =   Order_bsc;
module.exports.validate     =   validateOrder;