var express = require('express');
var router = express.Router();
const helper = require('../helper/authHelper')
const{validateToken} = require('../models/Token')
require('dotenv').config()
const { pancakeSwapRouter2Address } = process.env;


router.post('/addToken', async (req, res) => {
    validateToken
    const { error } = validateToken(req.body);
    if (error) {
        console.log(error.details[0].message)
        let response = {};
        response.Status = 400;
        response.Error = error.details[0].message;
        return res.status(400).send(response);
    }
    try {
        let Web3Client = await helper.getWebClient(req.body.providerType)
        if(Web3Client == false){
            return res.status(400).send({ status: 400, message: "Provider type is invalid" })
        }
        let contract = await helper.getContractAddressInstanse(req.body.contract_address, Web3Client)
        let checkStatus = await helper.isContractAddressIsValid(contract);
        console.log("status ====>>>", checkStatus.status)
        if (checkStatus.status == 400) {
            res.status(checkStatus.status).send({ status: 400, message: checkStatus.message });
            return true;
        }
        let isAlreadyExists = await helper.isContractAddressAlreadyExists(req.body.contract_address, req.body.providerType);
        if (isAlreadyExists == false) {
            helper.addContractAddress(req.body.contract_address, checkStatus.symbol, checkStatus.decimals, req.body.providerType, req.body.type, req.body.icon);
        }
        let message = (checkStatus.status == 200 && isAlreadyExists == false) ? 'Successfully Added!!!' : 'Token is already exists!!!';
        checkStatus.message = message
        res.status(checkStatus.status).send(checkStatus);
    } catch (error) {
        res.status(400).send(error)
    }
})

router.post("/getTokens", async(req,res) => {
    let {providerType} = req.body
    if(providerType){
        let tokens = await helper.getToken(providerType)
        res.status(200).send(tokens)
    }else{
        res.status(400).send({message: "Payload missing"})
    }
})

router.post("/getTokenBalance", async (req, res) => {
    try {
        if (req.body.contract_address && req.body.userId && req.body.providerType) {
            let { contract_address, userId, providerType } = req.body;
            let Web3Client = await helper.getWebClient(providerType);
            if(Web3Client == false){
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            let balance = await helper.getWalletAddressBalance(createWallet.walletAddress, contract_address, Web3Client);
            res.status(200).send({ balance });
        } else {
            res.status(400).send({ status: 400, message: "Payload missing" });
        }
    } catch (error) {
        console.log(error)
        res.status(400).send({ status: 400, message: error.message });
    }
});

router.post("/getCoinBalance", async (req, res) => {
    if (req.body.userId && req.body.providerType) {
        try {
            let { userId, providerType } = req.body
            let Web3Client = await helper.getWebClient(providerType);
            if(Web3Client == false){
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            const ethBalance = await Web3Client.eth.getBalance(createWallet.walletAddress);
            console.log(ethBalance);
            // convert amount to ether or bnb from wei
            const coinBalance = Web3Client.utils.fromWei(ethBalance, "ether");
            res.status(200).send({ coinBalance });
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    } else {
        let response = {
            message: "Payload missing",
        };
        res.status(400).send(response);
    }
});

router.post("/calculateGassForSendToken", async (req, res) => {
    if (req.body.userId && req.body.numTokens && req.body.contract_address && req.body.receiverWallet && req.body.providerType) {
        try {
            let { userId, numTokens, contract_address, receiverWallet, providerType } = req.body
            let Web3Client = await helper.getWebClient(providerType);
            if(Web3Client == false){
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            let contract = await helper.getContractAddressInstanse(contract_address, Web3Client);
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            let response = await helper.countNonceAndData(createWallet.walletAddress, numTokens, receiverWallet, contract, Web3Client);
            let nonce = response.nonce;
            let data = response.data;
            let gaseLimit = await helper.calculateGassLimitEstimate(
                createWallet.walletAddress,
                nonce,
                contract_address,
                data,
                Web3Client
            );
            let responseGass = {
                gaseLimit: gaseLimit,
            };
            res.status(200).send(responseGass);
        } catch (error) {
            res.status(400).send({ status: 400, message: error.message })
        }
    } else {
        let response = {
            message: "Payload missing",
        };
        res.status(400).send(response);
    }
});

router.post("/sendToken", async (req, res) => {
    if (req.body.userId && req.body.numTokens && req.body.contract_address, req.body.receiverAddress && req.body.providerType) {
        try {
            let { userId, numTokens, contract_address, receiverAddress, providerType } = req.body
            let Web3Client = await helper.getWebClient(providerType);
            if(Web3Client == false){
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            const balInEthM = await Web3Client.eth.getBalance(createWallet.walletAddress)
            const ethAmountM = Web3Client.utils.fromWei(balInEthM, 'ether')
            if (Number(ethAmountM) < 0.005) {
                return res.status(400).json({ error: `Insufficient Funds For Transaction` });
            }
            let contract = await helper.getContractAddressInstanse(contract_address, Web3Client);
            let response = await helper.countNonceAndData(createWallet.walletAddress, numTokens, receiverAddress, contract, Web3Client);
            let nonce = response.nonce;
            let data = response.data;
            let gaseLimit = await helper.calculateGassLimit(createWallet.walletAddress, nonce, contract_address, data, Web3Client);
            console.log("gaseLimit", gaseLimit);
            let balance = await helper.getWalletAddressBalance(createWallet.walletAddress, contract_address, Web3Client);
            console.log("balance of wallet are =====", balance);
            if (balance < req.body.numTokens) {
                let response = { message: `Insufficiat balance` };
                res.status(400).send(response);
            } else {
                let trasctionData = await helper.transferTokenToOtherWallets(gaseLimit, data, createWallet.walletAddress, nonce, createWallet.privateKey, contract_address, Web3Client);
                res.status(200).send(trasctionData);
            }
        } catch (error) {
            res.status(400).send(error.message)
        }
    } else {
        let response = {
            message: "Missing Data",
        };
        res.status(400).send(response);
    }
});

router.post("/sendCoin", async (req, res) => {
    if (req.body.userId && req.body.receiverWallet && req.body.amount && req.body.providerType) {
        let { userId, receiverWallet, amount, providerType } = req.body
        let Web3Client = await helper.getWebClient(providerType);
        if(Web3Client == false){
            return res.status(400).send({ status: 400, message: "Provider type is invalid" })
        }
        let recoveryPhrase = await helper.getRecoveryPhrase(userId)
        let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
        let createWallet = await helper.createTrustWallet(decodeRecovery);
        if (createWallet == false) {
            return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
        }
        const balInEthM = await Web3Client.eth.getBalance(createWallet.walletAddress)
        const ethAmountM = Web3Client.utils.fromWei(balInEthM, 'ether')
        if (Number(ethAmountM) < 0.005) {
            return res.status(400).json({ error: `Insufficient Funds For Transaction` });
        }
        const isvalid = Web3Client.utils.isAddress(receiverWallet);
        console.log(isvalid);
        if (!isvalid) {
            //Web3Client
            return res.status(400).json({
                error: `Please Confirm The Address, and Try Again. Kindly confirm the address and try again.`,
            });
        }
        try {
            //get ether balance before transaction
            const ethBalance = await Web3Client.eth.getBalance(createWallet.walletAddress);
            console.log(ethBalance);
            // convert amount to ether from wei
            const ethAmount = Web3Client.utils.fromWei(ethBalance, "ether");
            //check sending amount is greater then ether balance
            if (ethAmount > amount) {
                const count = await Web3Client.eth.getTransactionCount(
                    createWallet.walletAddress,
                    "latest"
                );
                let etherValue = Web3Client.utils.toWei(amount.toString(), "ether");
                const transaction = {
                    to: receiverWallet,
                    value: etherValue,
                    gas: 30000,
                    nonce: count,
                    // optional data field to send message or execute smart contract
                };
                const signedTx = await Web3Client.eth.accounts.signTransaction(
                    transaction,
                    createWallet.privateKey
                );
                Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);
                // deductTransactionFee(walletDetail.user_id, feeInSwet)
                return res
                    .status(200)
                    .json({ transactionHash: signedTx.transactionHash });
            } else {
                let response = {
                    message: "Insufficient Funds",
                };
                res.status(400).send(response);
            }
        } catch (error) {
            console.log(error);
            let response = {
                message: error,
            };
            res.status(400).send(response);
        }
    } else {
        let response = {
            message: "payload missing",
        };
        res.status(400).send(response);
    }
});

router.post("/calculateGassFeeCoin", async (req, res) => {
    if (req.body.userId && req.body.receiverWallet && req.body.amount && req.body.providerType) {
        let { userId, receiverWallet, amount, providerType } = req.body
        let Web3Client = await helper.getWebClient(providerType);
        if(Web3Client == false){
            return res.status(400).send({ status: 400, message: "Provider type is invalid" })
        }
        let recoveryPhrase = await helper.getRecoveryPhrase(userId)
        let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
        let createWallet = await helper.createTrustWallet(decodeRecovery);
        if (createWallet == false) {
            return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
        }
        const isvalid = await Web3Client.utils.isAddress(createWallet.walletAddress);
        if (!isvalid) {
            return res.status(400).send({ message: `Please Confirm The Address, and Try Again. Kindly confirm the address and try again` });
        } else {
            let fee = await helper.estimateGasForEthTransaction(createWallet.walletAddress, receiverWallet, amount, Web3Client);
            res.status(fee.status).send(fee);
        }
    } else {
        res.status(400).send({ message: "Payload missing" });
    }
});

router.post("/checkAllowance", async(req, res) => {
    let {userId, providerType, amount, contract_address} = req.body
    if(userId && providerType, amount){
        try{
            let Web3Client = await helper.getWebClient(providerType);
            if(Web3Client == false){
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            console.log("starting.....")
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            console.log("checking.....")
            let contract = await helper.getContractAddressInstanse(contract_address, Web3Client)
            let response = await contract.methods.allowance(createWallet.walletAddress, pancakeSwapRouter2Address ).call()
            let status = (response >= amount) ? true : false
            console.log("allowance responce => ", response)
            res.status(200).send({"buttonStatus" : status})
        }catch(error){
            res.status(400).send({message: error.message });
        }
    }else{
        res.status(400).send({ message: "Payload missing" });
    }
})

// let gulfContractObject = await helper.getContractObjectGulf(web3);

router.post("/approveAllowance", async(req, res) => {
    let {userId, amount, providerType, contract_address} = req.body
    if(userId && amount && providerType){
       try{
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            let web3 = await helper.getWeb3ObjectForAllowance(decodeRecovery, providerType);
            let contract = await helper.getContractAddressInstanseForAllowance(contract_address, web3)
            let resp = await helper.transferAllow(providerType, createWallet.walletAddress, amount, web3, contract)
            console.log("resp=====>>>>>", resp)
            res.status(200).send({data: resp})
        }catch(error){
            console.log(error)
            res.status(400).send({message: error.message})
        }
    }else{
        res.status(400).send({message: "Payload missing"})   
    }
})
module.exports = router;


