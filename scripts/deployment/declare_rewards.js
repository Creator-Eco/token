const hardhat = require('hardhat');
const config = require('./config.js');
const common = require('../common/common');
const {signPermit, getSigner} = require('../utils/utils');
const log = common.log;

const BBS_TOKEN_ADDRESS = common.getBBStokenAddress();
const STACKING_ADDRESS = common.getStakingAddress();

const QUARTER_INDEX = process.env.QUARTER_INDEX;
const ARTIFACT_FILE = `reward_quarter_${QUARTER_INDEX}_tx.txt`;

async function main() {
    log('---Declare rewards---');

    if (!BBS_TOKEN_ADDRESS)
        throw new Error('BBS token address is missing. aborting.');

    if (!STACKING_ADDRESS)
        throw new Error('No Stacking address is missing. aborting.');

    if (!QUARTER_INDEX)
        throw new Error('No quarter index. aborting');

    const Staking = await hardhat.ethers.getContractFactory('Staking');
    const staking = Staking.attach(STACKING_ADDRESS);

    const rewardConfig = config.rewards.find(reward => reward.q == QUARTER_INDEX);
    const rewardAmountWei = hardhat.ethers.BigNumber.from(hardhat.ethers.utils.parseEther(rewardConfig.amount));
    log(`Required rewards for quarter ${rewardConfig.q} is ${rewardAmountWei} (wei)`);
    const currentRewardWei = (await staking.quarters(QUARTER_INDEX)).reward;
    log(`Current rewards for quarter ${rewardConfig.q} is ${currentRewardWei} (wei)`);

    if (common.artifactExists(ARTIFACT_FILE))
        throw new Error('script already run. aborting.');

    if (currentRewardWei.gt(rewardAmountWei)) {
        throw new Error(`Quarter ${QUARTER_INDEX} already has a BIGGER reward (${currentRewardWei}) then configured ${rewardAmountWei}. aborting.`);
    }

    if (currentRewardWei.eq(rewardAmountWei)) {
        throw new Error(`Quarter ${QUARTER_INDEX} already has a reward: ${currentRewardWei}. aborting.`);
    }

    // calculate reward to be added to quarter
    const rewardToAddWei = rewardAmountWei.sub(currentRewardWei);
    log(`Adding rewards for quarter ${QUARTER_INDEX}, amount (wei): ${rewardToAddWei}`);

    const provider = await (ethers.getDefaultProvider(hardhat.network.config.url));
    const deadline = (await provider.getBlock(await provider.getBlockNumber())).timestamp + 10000000000;

    const Token = await hardhat.ethers.getContractFactory('BBSToken');
    const bbsToken = Token.attach(BBS_TOKEN_ADDRESS);
    const tokenName = await bbsToken.name();

    const holder = await getSigner();
    const {v, r, s} = await signPermit(holder, STACKING_ADDRESS, rewardToAddWei, deadline, bbsToken, tokenName);

    const tx = await staking.declareReward(QUARTER_INDEX, rewardToAddWei, deadline, v, r, s);
    common.etherscanLogTx(tx.hash, tx.chainId);
    common.writeArtifact(ARTIFACT_FILE, JSON.stringify(tx));

    log('---Declare rewards Done---');
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
