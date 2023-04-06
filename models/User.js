const Joi      =  require('joi');
const mongoose =  require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
    first_name : {
        type: String,
        required: true
    },
    last_name : {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        required: true,
        unique : true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    created_date : {
        type: Date,
        required : true
    },

    recoveryPhrase  :{
        type : String,
        required : true
    },
}));

function validateUser(user){
    const schema = Joi.object({
        first_name              : Joi.string().required(),
        last_name               : Joi.string().required(),
        email                   : Joi.string().required(),
        phone_number            : Joi.string().required(),
        password                : Joi.string().required(),
        recoveryPhrase          : Joi.string().required(),
    });
    return schema.validate(user);
}

function validateResetPassword(user){
    const schema = Joi.object({
        user_id       :  Joi.string().required(), 
        old_password  :  Joi.string().required(),
        new_password  :  Joi.string().required()

    });
    return schema.validate(user);
}

function validateLogin(user){
    const schema = Joi.object({
        email      : Joi.string().required(),
        password   : Joi.string().required()
    });
    return schema.validate(user);
}

function sendOTPNumber(user){
    const schema = Joi.object({
        phone_number      : Joi.string().required(),
    });
    return schema.validate(user);
}

function varifyOTPNumber(user){
    const schema = Joi.object({
        phone_number      : Joi.string().required(),
        code              : Joi.number().required(),
    });
    return schema.validate(user);
}
module.exports.User                     =   User;
module.exports.varifyValidate           =   varifyOTPNumber;
module.exports.validate                 =   validateUser;
module.exports.validateOTP              =   sendOTPNumber;
module.exports.validateLogin            =   validateLogin;
module.exports.validateResetPassword    =   validateResetPassword;