const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common.js');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const RTB_TOKEN_ADDRESS = common.getRTBtokenAddress();
const STAKING_ADDRESS = common.getStakingAddress();

async function main() {
    log('---Staking upgrade 2---');

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!RTB_TOKEN_ADDRESS)
        throw new Error('RTB token address is missing. aborting.');

    if (!STAKING_ADDRESS)
        throw new Error('No Staking address is missing. aborting.');

    log('Upgrading Staking...');
    const staking = await upgrades.upgradeProxy(STAKING_ADDRESS, await ethers.getContractFactory('StakingUpgrade2'), {
        constructorArgs: [BBS_TOKEN_ADDRESS, RTB_TOKEN_ADDRESS],
        unsafeAllow: ['delegatecall']
    });
    await staking.deployed();
    common.etherscanLogContract(staking.address, staking.deployTransaction.chainId);

    log('---Staking upgrade 2 done---');

}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
