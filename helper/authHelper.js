const { User } = require('../models/User');
const { Token } = require('../models/Token');
const { signup_users_code } = require("../models/signup_users_code")
const md5 = require('md5');
const nodemailer = require("nodemailer");
const bip39 = require('bip39')
const Web3 = require('web3');
const ethers = require('ethers')
var CryptoJS = require("crypto-js");
require('dotenv').config()
const USDTABI = require('../abi/USDTABI.json')
const router2Abi = require('../abi/Router2abi.json')
const HDWalletProvider = require('@truffle/hdwallet-provider');
const tokenAbi = require("../abi/tokenAbi.json");
const { resolve } = require('path');
const {PROVIDER_GOERLI_TESTNET ,pancakeSwapRouter2Address, uniswapRouter2Address, ENCRYPTIONDECRYPTIONKEY, PROVIDER_ETH_MAINNET, PROVIDER_ETH_TESTNET, PROVIDER_BNB_TESTNET, PROVIDER_BNB_MAINNET, EMAIL, PASSWORD} = process.env;
module.exports = {
    isUserAlreadyExists: (email, phone_number) => {
        return new Promise(async (resolve) => {
            let email_new = (email.trim()).toLowerCase();
            let count = await User.countDocuments({ '$or': [{ email: email_new }, { phone_number: phone_number }] });
            if (count > 0) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    },

    generateRecoveryPhrase: () => {
        return new Promise(resolve => {
            let recoveryPhrase = bip39.generateMnemonic();
            resolve(recoveryPhrase)
        })
    },

    encodeRecovery: (recovery) => {
        return new Promise(resolve => {
            var encodedRecovery = CryptoJS.AES.encrypt(recovery, ENCRYPTIONDECRYPTIONKEY).toString();
            resolve(encodedRecovery)
        })
    },

    decodeRecovery: (encodedRecovery) => {
        return new Promise(resolve => {
            let key = (ENCRYPTIONDECRYPTIONKEY) ? ENCRYPTIONDECRYPTIONKEY : "95bcqr1GulfSwapping"
            var bytes = CryptoJS.AES.decrypt(encodedRecovery, key);
            var decodedRecovery = bytes.toString(CryptoJS.enc.Utf8);
            resolve(decodedRecovery);
        })
    },

    sigupNewUser: (insertData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let status = await User.create(insertData)
                resolve({ userId: status._id, status: true })
            } catch (error) {
                resolve(error)
            }
        })
    },

    varifyCredentials: (email, password) => {
        return new Promise(async (resolve) => {
            let query = [
                {
                    $match: {
                        email: email,
                        password: md5(password)
                    }
                },
                {
                    $project: {
                        _id: 1,
                        first_name: 1,
                        last_name: 1,
                        password: 1,
                        email: 1,
                        phone_number: 1,
                        created_date: new Date()
                    }
                }
            ]
            let userObject = await User.aggregate(query)
            resolve(userObject)
        })
    },

    varifyPasswordAndUpdate: (user_id, old_password, new_password) => {
        return new Promise(async (resolve) => {
            let status = await User.updateOne({ password: md5(old_password), _id: user_id.toString() }, { '$set': { password: md5(new_password) } })
            if (status.modifiedCount > 0) {
                resolve(true)
            } else {

                resolve(false)
            }
        })
    },

    updatePassword: (email, password) => {
        return new Promise(async (resolve) => {
            let status = await User.updateOne({ email: email }, { '$set': { password: md5(password) } })
            if (status.modifiedCount > 0) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    },

    getWebClient: (providerType) => {
        return new Promise(resolve => {
            let provider = ''
            if (providerType == "ETH") {
                provider = PROVIDER_GOERLI_TESTNET
            } else if (providerType == "BNB") {
                provider = PROVIDER_BNB_MAINNET
            } else {
                resolve(false)
            }
            console.log("Provider URL ===>>>", provider)
            const Web3Client = new Web3(provider)
            resolve(Web3Client);
        })
    },

    getWebClientTest: (providerType) => {
        return new Promise(resolve => {
            let provider = (providerType == "ETH") ? PROVIDER_ETH_TESTNET : PROVIDER_BNB_MAINNET;
            const Web3Client = new Web3(provider)
            resolve(Web3Client);
        })
    },

    getWeb3ObjectForAllowance : (mnemonicPhrase, providerType) => {
        return new Promise(async(resolve) => {
            let rpcurl = (providerType == "ETH") ? PROVIDER_ETH_TESTNET : PROVIDER_BNB_TESTNET;
            let provider = new HDWalletProvider({
                mnemonic: {
                  phrase: mnemonicPhrase
                },
                providerOrUrl: rpcurl
              });
            var web3 = new Web3(provider);
            resolve(web3)
        })
    },

    transferAllow: (providerType, walletAddress, amount, web3, contract) => {
        return new Promise(async(resolve) => {
            try {
                let ADDRESSFORALLOWANCE = (providerType == "BNB") ? pancakeSwapRouter2Address : uniswapRouter2Address
                let result = await contract.methods.increaseAllowance(ADDRESSFORALLOWANCE, web3.utils.toWei(amount.toString()) ).send({from : walletAddress})
                console.log("transfer allow Hash ====>>>>>", result.transactionHash);
                resolve(result.transactionHash);
            }catch(error){
                resolve(error)
            }
        })
    },

    getContractAddressInstanse: (contractAddress, Web3Client) => {
        return new Promise(resolve => {
            let contract = new Web3Client.eth.Contract(
                USDTABI, //abi
                contractAddress //contract address
            );
            resolve(contract)
        })
    },

    getContractAddressInstanseForAllowance: (contractAddress, Web3Client) => {
        return new Promise(resolve => {
            let contract = new Web3Client.eth.Contract(
                tokenAbi, //abi
                contractAddress //contract address
            );
            resolve(contract)
        })
    },

    isContractAddressIsValid: (contract) => {
        return new Promise(async (resolve) => {
            try {
                let decimals = await contract.methods.decimals().call();
                let symbol = await contract.methods.symbol().call();
                resolve({ status: 200, decimals, symbol })
            } catch (error) {
                console.log(error.message)
                resolve({ status: 400, message: error.message })
            }
        })
    },

    isContractAddressAlreadyExists: (contractAddress, providerType) => {
        return new Promise(resolve => {
            Token.countDocuments({ contract_address: contractAddress, providerType: providerType }, async (error, result) => {
                if (error) {
                    console.log('DataBase have some issue')
                    resolve(true)
                } else {
                    let count = await result;
                    if (count > 0) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                }
            })
        })
    },

    addContractAddress: (contract_address, symbol, decimal, providerType, type, icon) => {
        return new Promise(async (resolve) => {
            let insertData = {
                contract_address,
                symbol,
                decimal,
                providerType,
                type,
                updated_date: new Date(),
                icon
            }
            console.log('insertData', insertData)
            Token.create(insertData);
            resolve(true);
        })
    },

    checkIsRecoveryPhraseValid: (recovery) => {
        return new Promise(resolve => {
            try {
                ethers.Wallet.fromMnemonic(recovery);
                resolve(true)
            } catch (error) {
                resolve(false)
            }
        })
    },

    createTrustWallet: (decodeRecovery) => {
        return new Promise(async (resolve) => {
            try {
                const accountDetail = ethers.Wallet.fromMnemonic(decodeRecovery);
                const wallet = accountDetail.address
                const private = accountDetail.privateKey
                let accountDetails = {
                    walletAddress: wallet,
                    privateKey: private,
                }
                resolve(accountDetails)
            } catch (error) {
                resolve(false)
            }
        })
    },

    getWalletAddressBalance: (walletAddress, contractAddress, Web3Client) => {
        return new Promise(async (resolve) => {
            try {
                let contract = new Web3Client.eth.Contract(
                    USDTABI,
                    contractAddress
                );
                let balance = await contract.methods.balanceOf(walletAddress).call();
                console.log('balance helper', balance)
                var decimals = await contract.methods.decimals().call();
                balance = (balance / (10 ** decimals));
                resolve(balance)
            } catch (error) {
                console.log(error)
                resolve(false)
            }
        })
    },

    countNonceAndData: (walletAddress, amount, receiverAddress, contract, Web3Client) => {
        return new Promise(async (resolve) => {
            var decimals = await contract.methods.decimals().call();
            const amountIn_new = ((parseFloat(amount) * (10 ** parseFloat(decimals))))
            let amountInWith = await exponentialToDecimalInLibrary(amountIn_new)
            let convertedNumTokens = amountInWith.replaceAll(',', '')
            const data = contract.methods.transfer(receiverAddress, convertedNumTokens).encodeABI();
            const count = await Web3Client.eth.getTransactionCount(walletAddress);
            const nonce = Web3Client.utils.toHex(count);
            let returnObject = {
                nonce: nonce,
                data: data,
            };
            resolve(returnObject);
        });
    },

    calculateGassLimitEstimate: (senderWalletAddress, nonce, contractAddress, data, Web3Client) => {
        return new Promise(async (resolve) => {
            try {

                var gaseLimit = await Web3Client.eth.estimateGas({
                    from: senderWalletAddress,
                    nonce: nonce,
                    to: contractAddress,
                    data: data,
                }); // gwai
                const estimatePrice = gaseLimit / 10 ** 9; // Ether and BNB
                const gassEstimatePrice = estimatePrice * 30;
                resolve(gassEstimatePrice);
            } catch (error) {
                console.log(error)
                resolve(error.message)
            }
        });
    },

    getRecoveryPhrase: (userId) => {
        return new Promise(async (resolve) => {
            let userObject = await User.findOne({ _id: userId })
            resolve(userObject.recoveryPhrase)
        })
    },

    transferTokenToOtherWallets: (gaseLimit, data, walletAddress, nonce, senderPrivateKey, contractAddress, Web3Client) => {
        return new Promise(async (resolve) => {
            try {
                const gasLimit = Web3Client.utils.toHex(gaseLimit);
                const gasPrice = Web3Client.utils.toHex(20 * 1e9);
                const value = Web3Client.utils.toHex(Web3Client.utils.toWei('0', 'wei'));

                // Chain ID of Ropsten Test Net is 97, mainNet replace it to 56 for Main Net
                // var chainId = 97;
                var chainId = 97;
                var rawTransaction = {
                    from: walletAddress,
                    nonce: nonce,
                    gasPrice: gasPrice,
                    gasLimit: gasLimit,
                    to: contractAddress,
                    value: value,
                    data: data,
                    chainId: chainId,
                };
                // console.log('rawTransaction', rawTransaction)
                const signedTx = await Web3Client.eth.accounts.signTransaction(
                    rawTransaction,
                    senderPrivateKey
                );
                Web3Client.eth.sendSignedTransaction(signedTx.rawTransaction);
                let reponseObject = {
                    transactionHash: signedTx.transactionHash,
                };
                console.log("reponseObject", reponseObject);
                resolve(reponseObject);
            } catch (error) {
                resolve({ message: error.message });
            }
        });
    },

    estimateGasForEthTransaction: (fromAddress, toAddress, amount, Web3Client) => {
        return new Promise(async (resolve) => {
            try {
                const count = await Web3Client.eth.getTransactionCount(
                    fromAddress,
                    "latest"
                );
                const nonce = Web3Client.utils.toHex(count);
                let etherValue = Web3Client.utils.toWei(amount.toString(), "ether");
                const transaction = {
                    to: toAddress,
                    value: etherValue,
                    nonce: nonce,
                };
                const estimate = await Web3Client.eth.estimateGas(transaction);
                const estimatePrice = estimate / 10 ** 9;
                const balInEth = await Web3Client.eth.getBalance(fromAddress);
                const ethAmount = Web3Client.utils.fromWei(balInEth, "ether");

                if (estimatePrice + etherValue > ethAmount) {
                    resolve({
                        error: `Insufficient Funds`,
                        status: 400,
                    });
                } else {
                    resolve({ estimatedGasFee: estimatePrice, status: 200 });
                }
            } catch (error) {
                resolve({ error: error.message, status: 400 });
            }
        });
    },

    calculateGassLimit: (senderWalletAddress, nonce, contractAddress, data, Web3Client) => {
        return new Promise(async (resolve) => {
            var gaseLimit = await Web3Client.eth.estimateGas({
                from: senderWalletAddress,
                nonce: nonce,
                to: contractAddress,
                data: data,
            });
            const gassFeeEstimate = gaseLimit * 10;
            resolve(gassFeeEstimate);
        });
    },

    exponentialToDecimal: (exponential) => {
        return new Promise((resolve) => {

            let decimal = exponential.toString().toLowerCase();
            if (decimal.includes('e+')) {
                const exponentialSplitted = decimal.split('e+');
                let postfix = '';
                for (
                    let i = 0;
                    i <
                    +exponentialSplitted[1] -
                    (exponentialSplitted[0].includes('.') ? exponentialSplitted[0].split('.')[1].length : 0);
                    i++
                ) {
                    postfix += '0';
                }
                const addCommas = text => {
                    let j = 3;
                    let textLength = text.length;
                    while (j < textLength) {
                        text = `${text.slice(0, textLength - j)},${text.slice(textLength - j, textLength)}`;
                        textLength++;
                        j += 3 + 1;
                    }
                    return text;
                };
                decimal = addCommas(exponentialSplitted[0].replace('.', '') + postfix);
            }
            if (decimal.toLowerCase().includes('e-')) {
                const exponentialSplitted = decimal.split('e-');
                let prefix = '0.';
                for (let i = 0; i < +exponentialSplitted[1] - 1; i++) {
                    prefix += '0';
                }
                decimal = prefix + exponentialSplitted[0].replace('.', '');
            }
            resolve(decimal.toString());
        });
    },

    getSwapInstanse: (contractAddress, Web3Client) => {
        return new Promise((resolve) => {
            let contract = new Web3Client.eth.Contract(
                router2Abi,
                contractAddress //contract address
            );
            resolve(contract);
        });
    },

    generateEmailConfirmationCodeSendIntoEmail: (email) => {
        return new Promise(async (resolve, reject) => {
            let generatedNumber = Math.floor(
                100000 + Math.random() * 900000
            ).toString();
            let updateArry = {
                email_code: parseFloat(generatedNumber),
                code_generate_time: new Date(),
            };
            let where = { email: email };
            signup_users_code.updateOne(
                where,
                { $set: updateArry },
                { upsert: true },
                (err, result) => {
                    if (err) {
                        resolve(false);
                    } else {
                        let transporter = nodemailer.createTransport({
                            host: "smtp.gmail.com",
                            port: 465,
                            secure: "true",
                            auth: {
                                user: EMAIL,
                                pass: PASSWORD,
                            },
                        });
                        var mailOptions = {
                            from: 'ikram92578@gmail.com',
                            to: email,
                            subject: 'no_reply',
                            html:
                                "<b>This is your Confirmation Code:" +
                                generatedNumber + " Do not share with anyone </b>",
                        };
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                                resolve(false)
                            } else {
                                console.log('Email sent: ' + info.response);
                                resolve(true)
                            }
                        });
                    }
                }
            );
        });
    },

    codeVarifyEmail: (email, code) => {
        return new Promise((resolve) => {
            let currentTime = new Date();
            var dd = currentTime.setMinutes(currentTime.getMinutes() - 5);
            currentTime = new Date(dd);
            let match = {
                email: email.toString(),
                email_code: parseFloat(code),
                code_generate_time: { $gte: currentTime },
            };
            signup_users_code.countDocuments(
                match,
                async (err, result) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(await result);
                    }
                }
            );

        });
    },

    getToken : (providerType) => {
        return new Promise(async(resolve) => {
            let tokens = await Token.find({providerType : providerType})
            resolve(tokens)
        })
    }
}
const exponentialToDecimalInLibrary = (exponential) => {
    return new Promise((resolve) => {
        let decimal = exponential.toString().toLowerCase();
        if (decimal.includes('e+')) {
            const exponentialSplitted = decimal.split('e+');
            let postfix = '';
            for (let i = 0; i < +exponentialSplitted[1] - (exponentialSplitted[0].includes('.') ? exponentialSplitted[0].split('.')[1].length : 0); i++) {
                postfix += '0';
            }
            const addCommas = text => {
                let j = 3;
                let textLength = text.length;
                while (j < textLength) {
                    text = `${text.slice(0, textLength - j)},${text.slice(textLength - j, textLength)}`;
                    textLength++;
                    j += 3 + 1;
                }
                return text;
            };
            decimal = addCommas(exponentialSplitted[0].replace('.', '') + postfix);
        }
        if (decimal.toLowerCase().includes('e-')) {
            const exponentialSplitted = decimal.split('e-');
            let prefix = '0.';
            for (let i = 0; i < +exponentialSplitted[1] - 1; i++) {
                prefix += '0';
            }
            decimal = prefix + exponentialSplitted[0].replace('.', '');
        }
        resolve(decimal.toString());
    });
}