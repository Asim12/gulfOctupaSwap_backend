var express = require('express');
var router = express.Router();
const helper = require('../helper/authHelper')
const md5 = require('md5');
const {validate, validateLogin, validateResetPassword} = require("../models/User")

router.post('/signup', async (req, res) => {
  validate
  const { error } = validate(req.body);
  if (error) {
    console.log(error.details[0].message)
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let userObject = await helper.isUserAlreadyExists(req.body.email, req.body.phone_number)
  if (userObject == false) {
    let phraseStatus = await helper.checkIsRecoveryPhraseValid(req.body.recoveryPhrase);
    if (phraseStatus == false) {
      return res.status(400).send({ status: 400, message: "Recovery phrase is invalid!" });
    }
    let recovery = await helper.encodeRecovery(req.body.recoveryPhrase);
    let insertData = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      password: md5(req.body.password.trim()),
      email: (req.body.email.trim()).toLowerCase(),
      phone_number: req.body.phone_number.trim(),
      recoveryPhrase: recovery,
      created_date: new Date()
    }
    let responseRes = await helper.sigupNewUser(insertData)
    insertData['userId'] = responseRes.userId
    let responseData = (responseRes.status == true) ? insertData : responseRes;
    let status = (responseRes.status == true) ? 200 : 400;
    res.status(status).send(responseData);
  } else {
    let response = {
      message: 'email or phone number already exists!!!'
    }
    res.status(400).send(response);
  }
})

router.get("/createRecoveryPhrase", async (req, res) => {
  let response = await helper.generateRecoveryPhrase();
  console.log("🚀 ~ file: auth.js ~ line 153 ~ router.post ~ response", response)
  res.status(200).send({ status: 200, recoveryPhrase: response });
});

router.post('/login', async (req, res) => {
  validateLogin
  const { error } = validateLogin(req.body);
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let userObject = await helper.varifyCredentials((req.body.email.trim()).toLowerCase(), req.body.password)
  if (userObject) {
    let response = {
      data: userObject
    }
    res.status(200).send(response);
  } else {
    let response = {
      message: 'credential invalid!!!'
    }
    res.status(400).send(response);
  }
})

router.post('/resetPassword', async (req, res) => {
  validateResetPassword
  let { error } = validateResetPassword(req.body)
  if (error) {
    let response = {};
    response.Status = 400;
    response.Error = error.details[0].message;
    return res.status(400).send(response);
  }
  let status = await helper.varifyPasswordAndUpdate(req.body.user_id, req.body.old_password, req.body.new_password)
  if (status == true) {
    let response = {
      message: 'updated successfully!!!'
    }
    res.status(200).send(response);
  } else {

    let response = {
      message: 'not updated old password are not matched or password is already updated!!! '
    }
    res.status(400).send(response);
  }
})

router.post('/forgetPassword', async (req, res) => {
  if (req.body.email && req.body.password) {
    let status = await helper.updatePassword(req.body.email, req.body.password)
    if (status == true) {
      let response = {
        message: 'updated successfully!!!'
      }
      res.status(200).send(response);
    } else {

      let response = {
        message: 'User not exists or password already updated!!! '
      }
      res.status(400).send(response);
    }
  } else {
    let response = {
      message: 'payload missing!!!'
    }
    res.status(400).send(response);
  }
})

router.post("/sendOTPEmail", async (req, res) => {
  let {email} = req.body
  if (email) {
    try{
      let check = await helper.generateEmailConfirmationCodeSendIntoEmail(
        email
      );
      console.log("ceheck =====>>>>", check)
      if (check == true) {
        let response = {
          message: "Code Has Been Sent to Your E-Mail",
        };
        res.status(200).send(response);
      } else {
        let response = {
          message: "Code Not Sent, Try Again.",
        };
        res.status(400).send(response);
      }
    }catch(error){
      console.log(error)
    }
  } else {
    let response = {
      message: "payload missing",
    };
    res.status(400).send(response);
  }
});

router.post("/varifyOTPUsingEmail", async (req, res) => {
  let {email, code } = req.body
  if (email && code) {
    let check = await helper.codeVarifyEmail(email, code);
    console.log("assas", check);
    if (check > 0) {
      let response = {
        message: "Code Verified",
      };
      res.status(200).send(response);
    } else {
      let response = {
        message: "Verification failed, Try Again.",
      };
      res.status(400).send(response);
    }
  } else {
    let response = {
      message: "Payload missing",
    };
    res.status(400).send(response);
  }
});
module.exports = router;
