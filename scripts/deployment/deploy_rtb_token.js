const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const RTB_TOKEN_ADDRESS = common.getRTBtokenAddress();

async function main() {
    log('---Deplyoment of RTB token---');

    if (!fs.existsSync(common.artifactsDir))
        fs.mkdirSync(common.artifactsDir);

    if (!RTB_TOKEN_ADDRESS) {
        log('Deploying RTB token...');
        const Token = await hardhat.ethers.getContractFactory('RTBToken');
        const token = await Token.deploy();
        common.etherscanLogContract(token.address, token.deployTransaction.chainId);
        fs.writeFileSync(common.rtbTokenPath, token.address);
    } else
        log(`RTB token already deployed at ${RTB_TOKEN_ADDRESS}`);

    log('---Deplyoment of RTB token Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
