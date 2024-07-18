const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common.js');
const log = common.log;

const STAKING_ADDRESS = common.getStakingAddress();
const RTB_TOKEN_ADDRESS = common.getRTBtokenAddress();
const TRANSFER_RTB_TO_STAKING_ARTIFACT_FILE = 'transfer_rtb_to_staking_tx.txt';

async function main() {
    log('---Transfer RTB to Staking contract---');
    if (!RTB_TOKEN_ADDRESS)
        throw new Error('RTB token address is missing. aborting.');

    if (common.artifactExists(TRANSFER_RTB_TO_STAKING_ARTIFACT_FILE))
        throw new Error('script already run. aborting.');

    const Token = await hardhat.ethers.getContractFactory('RTBToken');
    const rtbToken = Token.attach(RTB_TOKEN_ADDRESS);

    log(`Transfering ${config.mint.totalSupply} RTB tokens to ${STAKING_ADDRESS}`);

    const totalSupplyWei = hardhat.ethers.utils.parseEther(config.mint.totalSupply);

    const tx = await rtbToken.transfer(STAKING_ADDRESS, totalSupplyWei);
    common.etherscanLogTx(tx.hash, tx.chainId);

    common.writeArtifact(TRANSFER_RTB_TO_STAKING_ARTIFACT_FILE, JSON.stringify(tx));

    log('---Transfer RTB to Staking contract Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
