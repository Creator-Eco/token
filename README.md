# BBS Token Components

This repository will contain the components of the BBS token.

To start, make sure you have npm and node 10 installed and run the following command in the root directory of the repo:
```shell
npm install
```

nodeos, cleos, keosd and the eos-cdt are required for the eosio part.

## Token

Our token is an ethereum ERC20, with an eosio leg connected by a bridge.

### Ethereum Contract

`./contracts/BBSToken.sol`

[Boilerplate OpenZeppelin ERC20](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.2.0/contracts/token/ERC20/ERC20.sol), ownable, mintable, with the [permit](https://eips.ethereum.org/EIPS/eip-2612) mechanism.

### EOS Contract

[Boilerplate [eosio token](https://github.com/EOSIO/eosio.contracts/tree/master/contracts/eosio.token), which will give the bridge ownership over itself so only it (the bridge) can mint and burn tokens.

## Bridge

A pretty simple eos<=>ethereum bridge, heavily based on Bancor's implementation, and possibly using the same oracles.

### Ethereum Contract

`./contracts/Bridge.sol`

Heavily based on Bancor's [BancorX](https://github.com/bancorprotocol/contracts-solidity/blob/master/solidity/contracts/bancorx/BancorX.sol), ported to solidity 8, with [permit](https://eips.ethereum.org/EIPS/eip-2612) based transfer call, and all of the Bancor environment requirements removed.

### EOS Contract

We are using [Bancor's bridge contract](https://github.com/bancorprotocol/contracts_eos/tree/master/contracts/eos/BancorX) as is.

### Oracles

We are using Bancor's existing infrastructure.

## Governance

We will use [Snapshot](https://snapshot.page/#/) for voting, but we are considering a move to our own message board, probably with [snapshot api](https://docs.snapshot.org/hub-api). Then we may move to using our own voting, integrating eos token holders, give voting power to tokens staked in our staking rewards contract, and even implementing delegated based liquid democracy (see promising algorithm and implementation [here](https://arxiv.org/pdf/1911.08774.pdf).

### Staking Rewards

`./contracts/Staking.sol`

The staking contract is an upgradable contract that distributes rewards on a quarterly basis to addresses that are willing to lock up their BBS tokens. The rewards for each quarter is divided between the stakers according to the amount of tokens locked and the length of the locking period.

The essesntial idea is described and can be played with in this [web-based "paper" demo](https://deweb-io.github.io/token/staking.html).

## Tests

The eos components are either completely standard or maintained and tested by Bancor, so we only need tests for the ethereum components. These tests are all run on Hardhat, which makes it easy to test on the internal Hardhat network, on a local ganache-cli environment, or on a mainnet fork.

To test on Hardhat network:
```shell
npx hardhat test
```

To run tests with a coverage report:
```shell
npx hardhat coverage
```

To run tests with a gas report:
```shell
REPORT_GAS=true npx hardhat test
```

To run tests with load testing (use any desired number of iterations):
```shell
TEST_ITERATIONS=1000 npx hardhat test
```

To run tests with extra console.debug messages:
```shell
TEST_DEBUG=true npx hardhat test
```

## Audits

Our contracts have been audited twice by [Peckshield](https://peckshield.com/):
 - `./docs/audit.peckshield.2021.07.pdf`
 - `./docs/audit.peckshield.2021.11.pdf`

## Deployment

All our ethereum related deployment scripts are in `./scripts/deployment/`, and eosio related scripts are in `./eosio/deployment/`.

A gas calculator for the full deployment process can be found in `./scripts/utils/deployment_gas_calculator.sh`.

### Etherscan Support

We use Hardhat's Etherscan plugin to automoatically publish our contracts to Etherscan.

Etherscan API-Key token is required to be added to `hardhat.config.js`:
```javascript
etherscan: {
    apiKey: 'API_KEY'
}
```

After Contract deployment:
```shell
npx hardhat verify --network NETWORK_NAME CONTRACT_ADDRESS
```

### Scripts examples
```shell
    npx hardhat run ./scripts/deployment/verify_contract_rtb.js --network sepolia
    npx hardhat verify --contract contracts/Staking.sol:Staking --network ${config.network} ${STAKING_ADDRESS}
    npx hardhat verify --contract contracts/BBSToken.sol:BBSToken --network sepolia 0x0eAE3798e35b66352F24Bcb943DaE2bB19FE69e
    npx hardhat verify --contract contracts/RTBToken.sol:RTBToken --network sepolia 0xcb7F3D798523188DF5C7170590fD8B7Ea33b7417

    export NODE_OPTIONS=--openssl-legacy-provider && npx hardhat run ./scripts/deployment/promote_quarter.js --network sepolia
    QUARTER_INDEX=0 npx hardhat run ./scripts/deployment/declare_rewards.js --network sepolia
```

### Verify staking

// TODO - STAKING_ADDRESS should be the implementation address, not the proxy address.
// Then go to https://sepolia.etherscan.io/proxyContractChecker?a=0x94F32CA9c737FFe1b9e040de4027BAB92eb1f85a with PROXY_ADDRESS
// npx hardhat verify --contract contracts/StakingUpgrade1.sol:Staking --network sepolia 0x35153939fb080d6e1f416f4c78d8e17a72b03a35 

// Verify upgrate: params: contract address, bbs address, rtb address
// npx hardhat verify --contract contracts/StakingUpgrade2.sol:StakingUpgrade2 --network sepolia 0x09510105FC816478D77Ca9be8d941556dB8D9bEc "0x0eAE3798e35b66352F24Bcb943DaE2bB19FE69e6" "0xcb7F3D798523188DF5C7170590fD8B7Ea33b7417"


npx hardhat run ./scripts/deployment/deploy_rtb_token.js --network mainnet
npx hardhat verify --contract contracts/RTBToken.sol:RTBToken --network mainnet 0x055999B83f9cADE9E3988A0f34Ef72817566800D
npx hardhat run ./scripts/deployment/mint_rtb.js --network mainnet

npx hardhat run ./scripts/deployment/staking_upgrade_2.js --network mainnet
npx hardhat verify --contract contracts/StakingUpgrade2.sol:StakingUpgrade2 --network mainnet 0x9896Bf7C7b86b2D489a14E4b3f5BBE9520e5dA6D "0xFe459828c90c0BA4bC8b42F5C5D44F316700B430" "0x055999B83f9cADE9E3988A0f34Ef72817566800D"
npx hardhat run ./scripts/deployment/transfer_rtb_to_staking.js --network mainnet