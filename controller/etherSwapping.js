var express = require('express');
var router = express.Router();
const ethHelper = require('../helper/etherSwapping')
const helper = require('../helper/authHelper')
const uniswapRouter2Abi = require('../abi/uniswapRouter2ABI.json')
const { Pool, ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType, Percent, Token } = require('@uniswap/sdk');
const ethers = require('ethers');
const bscSwappingHelper = require('../helper/bscSwappingHelper');
require('dotenv').config()
const { uniswapRouter2Address, UNISWAP_POOL_ADDRESS } = process.env;


const { GelatoLimitOrders, GelatoStopLimitOrders, utils } = require("@gelatonetwork/limit-orders-lib")
//######################################################################################################
//######################################################################################################
//####################################    TOKEN TO COIN PRICE AND SWAP   ###############################
//######################################################################################################
//######################################################################################################
router.post('/tokenToCoinPrice', async (req, res) => {
    let { etherAmount, contract_address, providerType } = req.body
    if (etherAmount && contract_address && providerType) {
        try {
            const chainId = ChainId.MAINNET;
            const tokenAddress = contract_address;
            var amountIn = ethers.utils.parseEther(String(etherAmount));
            const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
            const weth = WETH[chainId];
            let provider = await ethHelper.getProvider();
            
            const pair = await Fetcher.fetchPairData(weth, swapToken, provider);
            const route = new Route([pair], swapToken);
            const trade = new Trade(route, new TokenAmount(swapToken, amountIn.toString()), TradeType.EXACT_INPUT)
           
            const ethPriceInToken = route.midPrice.invert().toSignificant(6);
            const ethPrice = route.midPrice.toSignificant(6);
            let finalPrice = Number(etherAmount) * ethPrice;
            let executionPrice = trade.executionPrice.toSignificant(6)
            console.log("execuate price", executionPrice)
            console.log("1 Eth = ", ethPriceInToken)
            console.log("total eth by given by token= ", finalPrice)
            console.log("Minimum received= ", executionPrice * Number(etherAmount))

            const minimumReceived = executionPrice * Number(etherAmount)
            const result = { ethPriceInToken: ethPriceInToken, ethCalculate: finalPrice, minimumReceived: minimumReceived }
            res.status(200).send(result);
        } catch (error) {
            console.log(error)
            let response = {
                message: error
            }
            res.status(400).send(response);
        }
    } else {
        let response = {
            message: 'Payload missing'
        }
        res.status(400).send(response);
    }
})

router.post('/tokenToCoinSwap', async (req, res) => {
    let { etherAmount, contract_address, providerType, userId } = req.body
    if (etherAmount && contract_address && providerType && userId) {
        try {
            const chainId = ChainId.MAINNET;
            const tokenAddress = contract_address
            var amountEth = ethers.utils.parseEther(String(etherAmount));
            const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
            const weth = WETH[chainId];
            let provider = await ethHelper.getProvider();
            const pair = await Fetcher.fetchPairData(weth, swapToken, provider);
            const route = new Route([pair], weth);
            const trade = new Trade(route, new TokenAmount(weth, String(amountEth)), TradeType.EXACT_INPUT)
            console.log(route.midPrice.toSignificant(6))
            console.log(route.midPrice.invert().toSignificant(6))
            console.log(trade.executionPrice.toSignificant(6))
            console.log(trade.nextMidPrice.toSignificant(6))
            //set Tolerance 0.5%
            const slippageTolerance = new Percent('50', "10000"); //10 bips 1 bip = 0.001%
            const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            const path = [weth.address, swapToken.address];
            const to = createWallet.walletAddress;
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const value = trade.inputAmount.raw;
            const singer = new ethers.Wallet(createWallet.privateKey);
            const account = singer.connect(provider);
            const uniswap = new ethers.Contract(uniswapRouter2Address, uniswapRouter2Abi, account);
            try {
                const tx = await uniswap.swapExactETHForTokens(
                    String(amountOutMin),
                    path,
                    to,
                    deadline,
                    { value: String(value), gasPrice: 5.5e10 }
                );
                console.log("tx======>>>>", tx)
                return res.status(200).json({ message: 'Transaction Submitted' });
            } catch (error) {
                return res.status(400).json({ error: error.reason });
            }
        } catch (error) {
            res.status(400).send({ message: error.message });
        }
    } else {
        res.status(400).send({ message: "payload missing" });
    }
})




//######################################################################################################
//######################################################################################################
//####################################    COIN TO TOKEN PRICE AND SWAP   ###############################
//######################################################################################################
//######################################################################################################
router.post('/coinToTokenPrice', async (req, res) => {
    let { etherAmount, contract_address, providerType } = req.body
    if (etherAmount && contract_address && providerType) {
        try {
            const chainId = ChainId.MAINNET;
            const tokenAddress = contract_address;
            var amountEth = ethers.utils.parseEther(String(etherAmount));
            const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
            const weth = WETH[chainId];
            let provider = await ethHelper.getProvider();
            const pair = await Fetcher.fetchPairData(swapToken, weth, provider);
            const route = new Route([pair], weth);
            const trade = new Trade(route, new TokenAmount(weth, String(amountEth)), TradeType.EXACT_INPUT)
            const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
            const tokenPrice = route.midPrice.toSignificant(6);
            let finalPrice = Number(etherAmount) * Number(tokenPrice);
            let executionPrice = trade.executionPrice.toSignificant(6)
            finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;

            console.log("1 token = ", tokenPriceInEth)
            console.log("total token by given by eth= ", finalPrice)
            console.log("Minimum received= ", executionPrice * etherAmount)

            const minimumReceived = executionPrice * etherAmount
            const result = { tokenPriceInEth: tokenPriceInEth, tokenCalculate: finalPrice, minimumReceived: minimumReceived }
            return res.status(200).json(result);
        } catch (error) {
            console.log(error)
            res.status(400).send({ message: error.message });
        }
    } else {
        let response = {
            message: 'Payload Missing!!!'
        }
        res.status(400).send(response);
    }
})

router.post('/coinToTokenSwap', async (req, res) => {
    let { etherAmount, contract_address, providerType, userId } = req.body
    if (etherAmount && contract_address && providerType && userId) {
        try {
            const chainId = ChainId.MAINNET;
            const tokenAddress = contract_address
            var amountEth = ethers.utils.parseEther(String(etherAmount));
            const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress);
            const weth = WETH[chainId];
            let provider = await ethHelper.getProvider();
            const pair = await Fetcher.fetchPairData(swapToken, weth, provider);
            const route = new Route([pair], weth);
            const trade = new Trade(route, new TokenAmount(weth, String(amountEth)), TradeType.EXACT_INPUT)
            console.log(route.midPrice.toSignificant(6))
            console.log(route.midPrice.invert().toSignificant(6))
            console.log(trade.executionPrice.toSignificant(6))
            console.log(trade.nextMidPrice.toSignificant(6))
            //set Tolerance 0.5%
            const slippageTolerance = new Percent('50', "10000"); //10 bips 1 bip = 0.001%
            const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
            //set path of token and ether
            const path = [weth.address, swapToken.address];
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            const to = createWallet.walletAddress;
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const value = trade.inputAmount.raw;
            const singer = new ethers.Wallet(createWallet.privateKey);
            const account = singer.connect(provider);
            const uniswap = new ethers.Contract(uniswapRouter2Address, uniswapRouter2Abi,
                account);
            try {
                const tx = await uniswap.swapExactETHForTokens(
                    String(amountOutMin),
                    path,
                    to,
                    deadline,
                    { value: String(value), gasPrice: 5.5e10 }
                );
                console.log("TX ====>>>> ", tx)
                return res.status(200).json({ message: 'Transaction Submitted' });
            } catch (error) {
                return res.status(400).json({ error: error.reason });
            }
        } catch (error) {
            console.log(error)
            let response = {
                message: error.message
            }
            res.status(400).send(response);
        }
    } else {
        let response = {
            message: 'Payload Missing!!!'
        }
        res.status(400).send(response);
    }
})




//######################################################################################################
//######################################################################################################
//####################################    TOKEN TO TOKEN PRICE AND SWAP   ##############################
//######################################################################################################
//######################################################################################################
router.post('/tokenToTokenPrice', async (req, res) => {
    let { etherAmount, fromContract_address, providerType, toContract_address } = req.body
    if (etherAmount && fromContract_address && providerType && toContract_address) {
        try {
            const chainId = ChainId.MAINNET;
            var amountEth = ethers.utils.parseEther(String(etherAmount));
            const fromSwapToken = await Fetcher.fetchTokenData(chainId, fromContract_address);
            const toSwapToken = await Fetcher.fetchTokenData(chainId, toContract_address);
            const weth = WETH[chainId];
            //fetching pair data for swap ether to token
            let provider = await ethHelper.getProvider();
            const pair = await Fetcher.fetchPairData(fromSwapToken, toSwapToken, provider);
            const route = new Route([pair], fromSwapToken);
            const trade = new Trade(route, new TokenAmount(fromSwapToken, String(amountEth)), TradeType.EXACT_INPUT)
            const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
            const tokenPrice = route.midPrice.toSignificant(6);
            let finalPrice = Number(etherAmount) * Number(tokenPrice);
            let executionPrice = trade.executionPrice.toSignificant(6)
            finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;

            console.log("1 token = ", tokenPriceInEth)
            console.log("total token by given by eth= ", finalPrice)
            console.log("Minimum received= ", executionPrice * etherAmount)

            const minimumReceived = executionPrice * etherAmount
            const result = { tokenPriceInEth: tokenPriceInEth, tokenCalculate: finalPrice, minimumReceived: minimumReceived }
            return res.status(200).json(result);
        } catch (error) {
            console.log(error)
            let response = {
                message: error
            }
            res.status(400).send(response);
        }
    } else {
        let response = {
            message: 'Payload Missing!!!'
        }
        res.status(400).send(response);
    }
})

router.post('/tokenToTokenSwap', async (req, res) => {
    let { etherAmount, fromContract_address, toContract_address, providerType, userId } = req.body
    if (etherAmount && fromContract_address && toContract_address && providerType && userId) {
        try {
            const chainId = ChainId.MAINNET;
            let provider = await ethHelper.getProvider();
            const swapTokenF = await Fetcher.fetchTokenData(chainId, fromContract_address);
            const swapTokenT = await Fetcher.fetchTokenData(chainId, toContract_address)
            let tokens = [swapTokenF, swapTokenT];
            const weth = WETH[chainId];
            let pair;
            for (token of tokens) {
                pair = await Fetcher.fetchPairData(token, weth);
            }
            const route = new Route([pair], weth);
            const trade = new Trade(route, new TokenAmount(weth, etherAmount.toString()), TradeType.EXACT_INPUT);
            console.log(route.midPrice.toSignificant(6))
            console.log(route.midPrice.invert().toSignificant(6))
            console.log(trade.executionPrice.toSignificant(6))
            console.log(trade.nextMidPrice.toSignificant(6))

            const slippageTolerance = new Percent('50', "10000"); //10 bips 1 bip = 0.001%
            const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
            const path = [fromContract_address, toContract_address];
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            const to = createWallet.walletAddress;
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const value = trade.inputAmount.raw;
            const singer = new ethers.Wallet(createWallet.privateKey);
            const account = singer.connect(provider);
            const uniswap = new ethers.Contract(uniswapRouter2Address, uniswapRouter2Abi, account);
            const tx = await uniswap.swapExactETHForTokens( //migration (transfer token from one blockchain to other)
                String(amountOutMin),
                path,
                to,
                deadline,
                { value: String(value), gasPrice: 5.5e10 }
            );
            console.log("TX ======>>>>>>", tx)
            return res.status(200).json({ message: 'Transaction Submitted' });
        } catch (error) {
            return res.status(400).send(error.reason);
        }
    } else {
        let response = {
            message: 'Payload Missing!!!'
        }
        res.status(400).send(response);
    }
})




//######################################################################################################
//######################################################################################################
//########################     APPROVE TOKEN TO TOKEN AND TOKEN TO COIN ONLY     #######################
//######################################################################################################
//######################################################################################################

router.post("/tokenApproveForSwap", async (req, res) => {
    const { userId, contract_address, providerType, tokenAmount } = req.body;
    if (userId && contract_address && providerType, tokenAmount) {
        try {
            let Web3Client = await helper.getWebClient(providerType);
            if (Web3Client == false) {
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            let recoveryPhrase = await helper.getRecoveryPhrase(userId)
            let decodeRecovery = await helper.decodeRecovery(recoveryPhrase)
            let createWallet = await helper.createTrustWallet(decodeRecovery);
            if (createWallet == false) {
                return res.status(400).send({ status: 400, message: "Recovery key is not valid" })
            }
            const balInEth = await Web3Client.eth.getBalance(createWallet.walletAddress)
            const ethAmount = Web3Client.utils.fromWei(balInEth, 'ether')
            if (Number(ethAmount) < 0.005) {
                return res.status(400).json({ message: `You do not have enough BNB to transfer/buy/send/swap. Kindly get more BNB to proceed.` });
            }
            let contract = await helper.getContractAddressInstanse(contract_address, Web3Client);
            var decimals = await contract.methods.decimals().call();
            console.log("decimal", decimals)
            let approveAmount_new = (parseFloat(tokenAmount) * (10 ** parseFloat(decimals)))
            let amountInWith = await helper.exponentialToDecimal(approveAmount_new)
            let approveAmount = amountInWith.replaceAll(',', '')
            const data = contract.methods.approve(uniswapRouter2Address, tokenAmount).encodeABI();
            // Determine the nonce
            const count = await Web3Client.eth.getTransactionCount(createWallet.walletAddress)
            // How many tokens do I have before sending?
            const nonce = Web3Client.utils.toHex(count);
            var gaseLimit = await Web3Client.eth.estimateGas({
                "from": createWallet.walletAddress,
                "to": contract_address,
                "data": data
            });
            var rawTransaction = await ethHelper.makeRawTransaction(data, createWallet.walletAddress, contract_address, Web3Client, gaseLimit)
            const signedTx = await Web3Client.eth.accounts.signTransaction(rawTransaction, createWallet.privateKey);
            const sentTx = await Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);
            return res.status(200).json({ "recipt": sentTx });
        } catch (error) {
            res.status(400).send({ message: error.message })
        }
    } else {
        let response = { message: "Payload missing" };
        res.status(400).send(response);
    }
}),

module.exports = router;

