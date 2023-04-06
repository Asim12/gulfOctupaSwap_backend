var express = require('express');
var router = express.Router();
const bscHelper = require('../helper/bscSwappingHelper')
const helper = require('../helper/authHelper')
const router2abi = require('../abi/Router2abi.json')
const { WETH, ChainId, Route, Router, Fetcher, Trade, TokenAmount, TradeType, Token, Percent } = require("@pancakeswap-libs/sdk") //require("@pancakeswap/sdk");
const ethers = require('ethers')
require('dotenv').config()
const { pancakeSwapRouter2Address } = process.env;




//######################################################################################################
//######################################################################################################
//####################################    COIN TO TOKEN PRICE AND SWAP  ################################
//######################################################################################################
//######################################################################################################
router.post("/coinToTokenPrice", async (req, res) => {
    let { amount, contract_address } = req.body;
    if (amount && contract_address) {
        try {
            var tradeAmount = ethers.utils.parseEther(String(amount));
            const chainId = ChainId.MAINNET;
            const weth = WETH[chainId];
            const tokenAddress = contract_address;
            let provider = await bscHelper.getProvider();

            const swapToken = await Fetcher.fetchTokenData(chainId, tokenAddress, provider)//tokenAddress, provider);
            const pair = await Fetcher.fetchPairData(swapToken, weth, provider);
            const route = new Route([pair], weth);
            const trade = new Trade(
                route,
                new TokenAmount(weth, tradeAmount),
                TradeType.EXACT_INPUT
            );

            // create transaction parameters
            const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
            const tokenPrice = route.midPrice.toSignificant(6);
            let finalPrice = Number(amount) * Number(tokenPrice);
            let executionPrice = trade.executionPrice.toSignificant(6);
            finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;
            const minimumReceived = executionPrice * amount;
            const result = {
                tokenPriceInEth: tokenPriceInEth,
                tokenCalculate: finalPrice,
                minimumReceived: minimumReceived,
            };
            return res.status(200).json(result);
        } catch (error) {
            console.log(error)
            res.status(400).send({ message: error.message });
        }
    } else {
        let response = {
            message: "Payload missing",
        };
        res.status(400).send(response);
    }
});

router.post("/coinToTokenSwap", async (req, res) => {
    let { userId, contract_address, amount, providerType, slippagePercentage } = req.body
    if (userId && contract_address && amount && providerType && slippagePercentage) {
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
        let provider = await bscHelper.getProvider();
        const balInEthM = await Web3Client.eth.getBalance(createWallet.walletAddress)
        const ethAmountM = Web3Client.utils.fromWei(balInEthM, 'ether')
        if (Number(ethAmountM) < 0.005) {
            return res.status(400).json({ error: `Insufficient Funds For Transaction` });
        }
        var tradeAmount = ethers.utils.parseEther(String(amount));
        const chainId = ChainId.MAINNET;
        const weth = WETH[chainId];

        const addresses = {
            WBNB: weth.address,
            BUSD: contract_address,
            PANCAKE_ROUTER: pancakeSwapRouter2Address, //pancakeswap router 2 mainnet
        };
        const [WBNB, BUSD] = await Promise.all(
            [addresses.WBNB, addresses.BUSD].map(
                (tokenAddress) => new Token(ChainId.MAINNET, tokenAddress, 18)
            )
        );
        const pair = await Fetcher.fetchPairData(WBNB, BUSD, provider);
        const route = await new Route([pair], WBNB);
        const trade = await new Trade(
            route,
            new TokenAmount(WBNB, tradeAmount),
            TradeType.EXACT_INPUT
        );
        const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
        const tokenPrice = route.midPrice.toSignificant(6);
        // set Tolerance 0.5%
        const slippageTolerance = new Percent(
            slippagePercentage ? slippagePercentage : "50",
            "10000"
        );
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        //set path of token and ether
        const path = [weth.address, BUSD.address];
        const to = createWallet.walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const value = trade.inputAmount.raw;
        const singer = new ethers.Wallet(createWallet.privateKey);

        const account = singer.connect(provider);
        const PANCAKE_ROUTER = new ethers.Contract(
            pancakeSwapRouter2Address,
            router2abi,
            account
        );
        try {
            const tx = await PANCAKE_ROUTER.swapExactETHForTokens(
                String(amountOutMin),
                path,
                to,
                deadline,
                { value: String(value), gasPrice: 1.5e10 }
            );

            const receipt = await tx.wait();
            console.log(`Tx-hash: ${tx.hash}`);
            console.log(`Tx was mined in block: ${receipt.blockNumber}`);

            let response = {
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
            };
            return res.status(200).json(response);
        } catch (error) {
            return res.status(400).json({ error: error.reason });
        }
    } else {
        let response = {
            message: "Payload missing",
        };
        res.status(400).send(response);
    }
});


router.get('/testing', async(req, res) => {
    let Web3Client = await helper.getWebClientTest("BNB");
    if (Web3Client == false) {
        return res.status(400).send({ status: 400, message: "Provider type is invalid" })
    }
    try {
        path = ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", '0x55d398326f99059fF775485246999027B3197955', "0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a"];
        let PANCAKE_ROUTER = await helper.getSwapInstanse(pancakeSwapRouter2Address, Web3Client);
        const tokenPrices = await PANCAKE_ROUTER.methods.getAmountsOut("2", path).call();
        console.log("token price ===>>>", tokenPrices)

        const amNew = ((parseFloat(1) * (10 ** parseFloat(18))))
        let amountWith = await helper.exponentialToDecimal(amNew)

        let amnt = (amountWith.indexOf(',') > -1) ? amountWith.replaceAll(',', '') : amountWith;
        const toTokenPriceInFrom = await PANCAKE_ROUTER.methods.getAmountsOut(amnt.toString(), path).call();
        minimumReceived = tokenPrices[2];
        ethPriceInToken = toTokenPriceInFrom[2];
        console.log("minimum recived ==>>>", minimumReceived)
        console.log("eth price to token ====>>>>>>", ethPriceInToken)
    } catch (ex){
        console.log(ex)
        pair = null;
    }
})






//######################################################################################################
//######################################################################################################
//####################################    TOKEN TO COIN PRICE AND SWAP  ################################
//######################################################################################################
//######################################################################################################
router.post("/tokenToCoinPrice", async (req, res) => {
    if (req.body.amount && req.body.contract_address && req.body.providerType) {
        let etherAmount = parseFloat(req.body.amount);
        let contract_address = req.body.contract_address;
        try {
            var tradeAmount = ethers.utils.parseEther(String(etherAmount));
            const chainId = ChainId.MAINNET;
            const weth = WETH[chainId];
            const addresses = {
                WBNB: contract_address,
                BUSD: weth.address,
                PANCAKE_ROUTER: pancakeSwapRouter2Address, //router 2 address
            };
            const [WBNB, BUSD] = await Promise.all(
                [addresses.WBNB, addresses.BUSD].map(
                    (tokenAddress) => new Token(ChainId.MAINNET, tokenAddress, 18)
                )
            );
            let provider = await bscHelper.getProvider();
            const pair = await Fetcher.fetchPairData(WBNB, BUSD, provider);
            const route = new Route([pair], WBNB);
            const trade = new Trade(
                route,
                new TokenAmount(WBNB, tradeAmount),
                TradeType.EXACT_INPUT
            );
            const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
            const tokenPrice = route.midPrice.toSignificant(6);
            let finalPrice = Number(etherAmount) * Number(tokenPrice);
            let executionPrice = trade.executionPrice.toSignificant(6);
            finalPrice = Math.round((finalPrice + Number.EPSILON) * 100) / 100;
            console.log("1 token = ", tokenPriceInEth);
            console.log("total token by given by eth= ", finalPrice);
            console.log("Minimum received= ", executionPrice * etherAmount);
            const minimumReceived = executionPrice * etherAmount;
            const result = {
                tokenPriceInEth: tokenPriceInEth,
                tokenCalculate: finalPrice,
                minimumReceived: minimumReceived,
            };
            return res.status(200).json(result);
        } catch (error) {
            console.log(error.message);
            let response = {
                message: error,
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

router.post("/tokenToCoinSwap", async (req, res) => {
    if (req.body.userId && req.body.contract_address && req.body.amount && req.body.providerType) {
        let { userId, contract_address, amount, providerType } = req.body
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
        const balInEthM = await Web3Client.eth.getBalance(createWallet.walletAddress)
        const ethAmountM = Web3Client.utils.fromWei(balInEthM, 'ether')
        if (Number(ethAmountM) < 0.005) {
            return res.status(400).json({ error: `Insufficient Funds For Transaction` });
        }

        var tradeAmount = ethers.utils.parseEther(String(amount));
        const chainId = ChainId.MAINNET;
        const weth = WETH[chainId];

        const addresses = {
            WBNB: contract_address,
            BUSD: weth.address,
            PANCAKE_ROUTER: pancakeSwapRouter2Address, //pancakeswap router 2 mainnet
        };
        const [WBNB, BUSD] = await Promise.all(
            [addresses.WBNB, addresses.BUSD].map(
                (tokenAddress) => new Token(ChainId.MAINNET, tokenAddress, 18)
            )
        );
        let provider = await bscHelper.getProvider();
        const pair = await Fetcher.fetchPairData(WBNB, BUSD, provider);

        const route = new Route([pair], WBNB);
        const trade = new Trade(
            route,
            new TokenAmount(WBNB, tradeAmount),
            TradeType.EXACT_INPUT
        );

        const tokenPriceInEth = route.midPrice.invert().toSignificant(6);
        const tokenPrice = route.midPrice.toSignificant(6);
        // set Tolerance 0.5%
        const slippageTolerance = new Percent("50", "10000"); //10 bips 1 bip = 0.001%
        const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        //set path of token and ether
        const path = [WBNB.address, BUSD.address];
        const to = createWallet.walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const value = trade.inputAmount.raw;
        const singer = new ethers.Wallet(createWallet.privateKey);
        const account = singer.connect(provider);
        const PANCAKE_ROUTER = new ethers.Contract(
            pancakeSwapRouter2Address,
            router2abi,
            account
        );
        try {
            const tx = await PANCAKE_ROUTER.swapExactETHForTokens(
                String(amountOutMin),
                path,
                to,
                deadline,
                { value: String(value), gasPrice: 1.5e10 }
            );
            const receipt = await tx.wait();
            console.log(`Tx-hash: ${tx.hash}`);
            console.log(`Tx was mined in block: ${receipt.blockNumber}`);

            let response = {
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
            };
            return res.status(200).json(response);
        } catch (error) {
            return res.status(400).json({ error: error.reason });
        }
    } else {
        let response = {
            message: "payload missing",
        };
        res.status(400).send(response);
    }
});




//######################################################################################################
//######################################################################################################
//#####################################   TOKEN TO TOKEN PRICE AND SWAP   ##############################
//######################################################################################################
//######################################################################################################
router.post("/tokenToTokenPrice", async (req, res) => {
    const { amount, fromContract_address, toContract_address, providerType } = req.body;
    if (amount && fromContract_address && toContract_address && providerType) {
        try {
            let Web3Client = await helper.getWebClientTest(providerType);
            if (Web3Client == false) {
                return res.status(400).send({ status: 400, message: "Provider type is invalid" })
            }
            let contract = await helper.getContractAddressInstanse(fromContract_address, Web3Client);
            var decimals = await contract.methods.decimals().call();
            let contract2 = await helper.getContractAddressInstanse(toContract_address, Web3Client);
            var decimals2 = await contract2.methods.decimals().call();
            const amountIn_new = ((parseFloat(amount) * (10 ** parseFloat(decimals))))
            let amountInWith = await helper.exponentialToDecimal(amountIn_new)
            let amountIn = amountInWith.replaceAll(',', '')
            let path = [fromContract_address, toContract_address];
            //if from or to address will be gulf then make path this 
            if (fromContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a' || toContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a') {
                path = [fromContract_address, '0x55d398326f99059fF775485246999027B3197955', toContract_address];
            }
            let PANCAKE_ROUTER = await helper.getSwapInstanse(pancakeSwapRouter2Address, Web3Client);
            const tokenPrices = await PANCAKE_ROUTER.methods.getAmountsOut(amountIn.toString(), path).call();
            const amNew = ((parseFloat(1) * (10 ** parseFloat(decimals))))
            let amountWith = await helper.exponentialToDecimal(amNew)
            let amnt = (amountWith.indexOf(',') > -1) ? amountWith.replaceAll(',', '') : amountWith;
            const toTokenPriceInFrom = await PANCAKE_ROUTER.methods.getAmountsOut(amnt.toString(), path).call();
            let minimumReceived = tokenPrices[1];
            let ethPriceInToken = toTokenPriceInFrom[1];
            if (fromContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a' || toContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a') {
                minimumReceived = tokenPrices[2];
                ethPriceInToken = toTokenPriceInFrom[2];
            }
            console.log("minimum price ===>>>>>>", minimumReceived)
            minimumReceived = (parseFloat(minimumReceived) / 10 ** parseFloat(decimals2))
            console.log("🚀 ~ file: trasection.js ~ line 788 ~ router.post ~ minimumReceived", minimumReceived)
            ethPriceInToken = (parseFloat(ethPriceInToken) / 10 ** parseFloat(decimals2))
            console.log("🚀 ~ file: trasection.js ~ line 790 ~ router.post ~ ethPriceInToken", ethPriceInToken)

            const result = { tokenPriceInToken: ethPriceInToken, tokenCalculate: minimumReceived, minimumReceived: minimumReceived }
            return res.status(200).json(result);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    } else {
        let response = {
            message: "Payload missing",
        };
        res.status(400).send(response);
    }
});

router.post("/tokenToTokenSwap", async (req, res) => {
    const { userId, toContract_address, fromContract_address, amount, providerType, percentage } = req.body;
    if (userId && toContract_address && fromContract_address && amount && providerType && percentage) {
        const swapTokenFrom = fromContract_address
        const SwapTokenTo = toContract_address
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
        const balInEthM = await Web3Client.eth.getBalance(createWallet.walletAddress)
        const ethAmountM = Web3Client.utils.fromWei(balInEthM, 'ether')
        if (Number(ethAmountM) < 0.005) {
            return res.status(400).json({ error: `Insufficient Funds For Transaction` });
        }
        let contract = await helper.getContractAddressInstanse(swapTokenFrom, Web3Client);
        var decimals = await contract.methods.decimals().call();

        const amountIn_new = ((parseFloat(amount) * (10 ** parseFloat(decimals))))
        let amountInWith = await helper.exponentialToDecimal(amountIn_new)
        let amountIn = amountInWith.replaceAll(',', '')

        const chainId = ChainId.MAINNET;
        const weth = WETH[chainId];
        let provider = await bscHelper.getProvider();
        const swapTokenF = await Fetcher.fetchTokenData(chainId, swapTokenFrom, provider);
        const swapTokenM = await Fetcher.fetchTokenData(chainId, '0x55d398326f99059fF775485246999027B3197955', provider);
        const swapTokenT = await Fetcher.fetchTokenData(chainId, SwapTokenTo, provider);

        let pair
        if (toContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a' || fromContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a') {
            pair = await Fetcher.fetchPairData(swapTokenF, swapTokenM, provider);
        } else {
            pair = await Fetcher.fetchPairData(swapTokenF, swapTokenT, provider);
        }
        const route = new Route([pair], swapTokenF);
        const trade = new Trade(route, new TokenAmount(swapTokenF, amountIn.toString()), TradeType.EXACT_INPUT);
        let tAmount = route.midPrice.toSignificant(6)
        const slippageTolerance = new Percent(percentage ? percentage : "50", "10000"); //10 bips 1 bip = 0.001%

        let amountOutMin = trade.minimumAmountOut(slippageTolerance).raw;
        let path = [swapTokenF.address, swapTokenT.address];

        if (toContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a' || fromContract_address === '0x014a087b646Bd90E7DCEad3993F49EB1F4B5f30a') {
            const pair2 = await Fetcher.fetchPairData(swapTokenM, swapTokenT, provider);
            const route2 = new Route([pair2], swapTokenM);

            console.log("🚀 ~ file: trasection.js ~ line 836 ~ router.post ~ tAmount.toString()", tAmount.toString())

            const amIn_new = ((parseFloat(tAmount) * (10 ** parseFloat(18))))
            let amInWith = await helper.exponentialToDecimal(amIn_new)

            const BNBAmount = parseInt(amInWith);
            const trade2 = new Trade(route2, new TokenAmount(swapTokenM, BNBAmount.toString()), TradeType.EXACT_INPUT);
            path = [swapTokenF.address, swapTokenM.address, swapTokenT.address];
            amountOutMin = trade2.minimumAmountOut(slippageTolerance).raw;
        }
        const to = createWallet.walletAddress;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const singer = new ethers.Wallet(createWallet.privateKey);

        const account = singer.connect(provider);
        const PANCAKE_ROUTER = new ethers.Contract(pancakeSwapRouter2Address, router2abi, account);
        try {
            const tx = await PANCAKE_ROUTER.swapExactTokensForTokens(
                amountIn.toString(),
                amountOutMin.toString(),
                path,
                to,
                deadline,
                { gasPrice: 1.5e10, gasLimit: 1000000 }
            );
            const receipt = await tx.wait();
            console.log(`Tx-hash: ${tx.hash}`);
            console.log(`Tx was mined in block: ${receipt.blockNumber}`);
            let response = {
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
            };
            return res.status(200).json(response);
        } catch (error) {
            return res.status(400).json({ error: error.reason });
        }
    } else {
        let response = { message: "Payload missing" };
        res.status(400).send(response);
    }
});




//######################################################################################################
//######################################################################################################
//########################     APPROVE TOKEN TO TOKEN AND TOKEN TO COIN ONLY     #######################
//######################################################################################################
//######################################################################################################

router.post("/tokenApproveForSwap", async (req, res) => {
    const { userId, contract_address, providerType, tokenAmount } = req.body;
    if (userId && contract_address && providerType, tokenAmount) {
        try{
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
            const data = contract.methods.approve(pancakeSwapRouter2Address, tokenAmount).encodeABI();
            // Determine the nonce
            const count = await Web3Client.eth.getTransactionCount(createWallet.walletAddress)
            // How many tokens do I have before sending?
            const nonce = Web3Client.utils.toHex(count);
            var gaseLimit = await Web3Client.eth.estimateGas({
                "from": createWallet.walletAddress,
                "to": contract_address,
                "data": data
            });
            var rawTransaction = await bscHelper.makeRawTransaction(data, createWallet.walletAddress, contract_address, Web3Client, gaseLimit) 
            const signedTx = await Web3Client.eth.accounts.signTransaction(rawTransaction, createWallet.privateKey);
            const sentTx = await Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);
            return res.status(200).json({"recipt" : sentTx});
        }catch(error){
            res.status(400).send({message: error.message})
        }
    } else {
        let response = { message: "Payload missing" };
        res.status(400).send(response);
    }
}),
// check allowed api is pending 
module.exports = router;
