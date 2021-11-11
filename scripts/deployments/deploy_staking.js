const fs = require('fs');
const hardhat = require('hardhat');
const common = require('../common/common');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();


async function main() {
    log(`---Deployment of Staking---`);

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (common.getStakingAddress() && !process.env.ENFORCE_STACKING_DEPLOY)
        throw new Error('Staking already deployed. aborting.');

    log(`Deploying Staking...`);
    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = await upgrades.deployProxy(Staking, [BBS_TOKEN_ADDRESS]);
    await staking.deployed();
    log(`Staking deployed at ${staking.address}`);
    fs.writeFileSync(common.stakingPath, staking.address);

    log(`---Deployment of Staking Done---`);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
