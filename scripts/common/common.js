const fs = require('fs');
const hardhat = require('hardhat');

const LOGFILE = `${__dirname}/log.txt`;
const ARTIFCATS_DIR = `${__dirname}/artifacts`;
const BBS_TOKEN_PATH = `${ARTIFCATS_DIR}/bbsToken.txt`;
const RTB_TOKEN_PATH = `${ARTIFCATS_DIR}/rtbToken.txt`;
const BRIDGE_PATH = `${ARTIFCATS_DIR}/bridge.txt`;
const STAKING_PATH = `${ARTIFCATS_DIR}/staking.txt`;

function getAddress(path) {
    return fs.existsSync(path) ? fs.readFileSync(path, 'utf8').toString() : null;
}

module.exports = {
    artifactsDir: ARTIFCATS_DIR,
    bbsTokenPath: BBS_TOKEN_PATH,
    rtbTokenPath: RTB_TOKEN_PATH,
    bridgePath: BRIDGE_PATH,
    stakingPath: STAKING_PATH,

    log: function (data) {
        console.log(data);
        fs.appendFileSync(LOGFILE, `${new Date().toString().slice(0, 24)} | ${data} \n`);
    },

    onError: function(error) {
        console.error(error);
        fs.appendFileSync(LOGFILE, `${new Date()} | ` + error + '\n');
        process.exit(1);
    },

    getBBStokenAddress: function () {
        return getAddress(BBS_TOKEN_PATH);
    },

    getRTBtokenAddress: function () {
        return getAddress(RTB_TOKEN_PATH);
    },

    getStakingAddress: function () {
        return getAddress(STAKING_PATH);
    },

    getBridgeAddress: function () {
        return getAddress(BRIDGE_PATH);
    },

    transferOwnership: async function (contractName, address, newOwner) {
        this.log('---Transfer ownership---');
        if (!address)
            throw new Error('Address is missing. aborting');
        if (!newOwner)
            throw new Error('New owner address is missing. aborting');

        const Contract = await hardhat.ethers.getContractFactory(`${contractName}`);
        const instance = Contract.attach(address);

        const currentOwner = await instance.owner();
        if (currentOwner != newOwner) {
            this.log(`Transfering ownership of ${contractName} to ${newOwner}`);
            const tx = await instance.transferOwnership(newOwner);
            this.etherscanLogTx(tx.hash, tx.chainId);
        } else {
            this.log(`${contractName} owner is already ${newOwner}`);
        }
        this.log('---Transfer ownership Done---');
    },

    writeArtifact: function (fileName, data) {
        fs.appendFileSync(`${ARTIFCATS_DIR}/${fileName}`, data);
    },

    artifactExists: function (fileName) {
        return fs.existsSync(`${ARTIFCATS_DIR}/${fileName}`);
    },

    getPrefix: function (chainId) {
        let network;
        switch (chainId) {
            case(1): {
                network = ''; //mainnet
                break;
            }
            case(3): {
                network = 'ropsten.';
                break;
            }
            case(4): {
                network = 'rinkeby.';
                break;
            }
            default: {
                network = 'undefined.';
            }
        }

        return `https://${network}etherscan.io`;
    },

    etherscanLogContract: function(address, chainId) {
        const prefix = this.getPrefix(chainId);
        if (prefix)
            this.log(`${prefix}/address/${address}`);
    },

    etherscanLogTx: function(hash, chainId) {
        const prefix = this.getPrefix(chainId);
        if (prefix)
            this.log(`${prefix}/tx/${hash}`);
    },
};
