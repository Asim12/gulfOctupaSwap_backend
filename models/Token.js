const Joi = require('joi');
const mongoose = require('mongoose');

const Token = mongoose.model('Token', new mongoose.Schema({
    contract_address : { 
        type: String,
        required: true    
    },
    symbol: {
        type: String,
        required: true    
    },
    decimal : {
        type: Number,
        required: true,
    },
    icon:{
        type:String,
        required : true
    },
    type: {
        type:String,
        required : true
    },
    providerType : { 
        type: String,
        required: true,
    }
}));

function validateTokens(token){
    const schema = Joi.object({
        contract_address  :  Joi.string().required(),
        providerType      :  Joi.string().required(),
        type              :  Joi.string().required(),
        icon              :  Joi.string().required(),
    });
    return schema.validate(token);
}
module.exports.validateToken =   validateTokens;
module.exports.Token   =   Token;