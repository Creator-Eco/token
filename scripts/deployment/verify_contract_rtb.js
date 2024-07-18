const { exec } = require('child_process');
const config = require('./config.js');
const common = require('../common/common.js');
const log = common.log;

const RTB_TOKEN_ADDRESS = common.getRTBtokenAddress();


log('---Verify RTB contract---');
exec(`npx hardhat verify --network ${config.network} ${RTB_TOKEN_ADDRESS}`, (error, stdout, stderr) => {
    if (error) {
        log(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        log(`stderr: ${stderr}`);
        return;
    }
    log(`stdout: ${stdout}`);
    log('---Verify RTB contract Done---');
});
