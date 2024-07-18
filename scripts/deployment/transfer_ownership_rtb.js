const config = require('./config.js');
const common = require('../common/common.js');

const RTB_TOKEN_ADDRESS = common.getRTBtokenAddress();

async function main() {
    await common.transferOwnership('RTBToken', RTB_TOKEN_ADDRESS, config.safe.address);
}

main().then(() => process.exit(0)).catch(error => {
    common.onError(error);
});
