const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common.js');
const {getSigner} = require('../utils/utils.js');
const log = common.log;

const RTB_TOKEN_ADDRESS = common.getRTBtokenAddress();
const MINT_ARTIFACT_FILE = 'mint_rtb_tx.txt';


async function main() {
    log('---Mint RTB tokens---');
    if (!RTB_TOKEN_ADDRESS)
        throw new Error('RTB token address is missing. aborting.');

    if (common.artifactExists(MINT_ARTIFACT_FILE))
        throw new Error('script already run. aborting.');

    const Token = await hardhat.ethers.getContractFactory('RTBToken');
    const rtbToken = Token.attach(RTB_TOKEN_ADDRESS);

    const deployer = (await getSigner()).address;
    log(`Minting ${config.mint.totalSupply} tokens to ${deployer}`);

    const totalSupplyWei = hardhat.ethers.utils.parseEther(config.mint.totalSupply);
    const tx = await rtbToken.mint(deployer, totalSupplyWei);
    common.etherscanLogTx(tx.hash, tx.chainId);

    common.writeArtifact(MINT_ARTIFACT_FILE, JSON.stringify(tx));

    log('---Mint RTB tokens Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
