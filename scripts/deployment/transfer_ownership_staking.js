const config = require('./config.js');
const common = require('../common/common.js');

const STACKING_ADDRESS = common.getStakingAddress();


async function main() {
    await common.transferOwnership('StakingUpgrade1', STACKING_ADDRESS, config.safe.address);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
