const hre = require('hardhat');

async function main() {
    await hre.storageLayout.export();
}

main();
