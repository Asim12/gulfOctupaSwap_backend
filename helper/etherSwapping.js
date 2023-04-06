const { JsonRpcProvider } = require("@ethersproject/providers");
require('dotenv').config()
const {PROVIDER_ETH_TESTNET, PROVIDER_ETH_MAINNET, ETH_TESTNET_CHAINID, ETH_MAINNET_CHAINID } = process.env;
module.exports = {
    getProvider : () => {
        return new Promise(resolve => {
            const provider = new JsonRpcProvider(PROVIDER_ETH_MAINNET);
            resolve(provider)
        })
    },

    makeRawTransaction : (data, senderWalletAddress, contractAddress, Web3Client, gaseLimitForTransaction) => {
        return new Promise(async(resolve) => {
            const count = await Web3Client.eth.getTransactionCount(senderWalletAddress)
            const nonce = Web3Client.utils.toHex(count);
            const gasLimit = Web3Client.utils.toHex(gaseLimitForTransaction * 5);
            let gasPrice = Web3Client.utils.toHex(50 * 1e9);
            const value = Web3Client.utils.toHex(Web3Client.utils.toWei('0', 'wei'));
            var rawTransaction = {
                "from": senderWalletAddress,
                "nonce": nonce,
                "gasPrice": gasPrice,
                "gasLimit": gasLimit,
                "to": contractAddress,
                "value": value,
                "data": data,
                "chainId": Number(ETH_TESTNET_CHAINID)
            };
            resolve(rawTransaction);
        })
    },
}
