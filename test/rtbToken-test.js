const {expect} = require('chai');
const {expectRevert, expectBigNum } = require('./utils');
const {signPermit} = require('../scripts/utils/utils');

describe('RTBToken (our token is almost entirely written by openzeppelin, so we just verify our usage)', () => {
    let accounts, rtbToken, bbsContractOwner;
    beforeEach(async() => {
        const RTBToken = await ethers.getContractFactory('RTBToken');
        rtbToken = await RTBToken.deploy();
        accounts = await ethers.getSigners();
        bbsContractOwner = accounts[0].address;
    });

    it('test change of ownership', async() => {
        expect(await rtbToken.owner()).to.equal(bbsContractOwner);
        await rtbToken.transferOwnership(accounts[1].address);
        expect(await rtbToken.owner()).to.equal(accounts[1].address);
    });

    it('test tokens minting', async() => {
        expectBigNum(await rtbToken.balanceOf(bbsContractOwner)).to.equal(0);
        expectBigNum(await rtbToken.balanceOf(accounts[1].address)).to.equal(0);

        await rtbToken.mint(bbsContractOwner, 100);
        expectBigNum(await rtbToken.balanceOf(bbsContractOwner)).to.equal(100);
        expectBigNum(await rtbToken.balanceOf(accounts[1].address)).to.equal(0);

        await expectRevert(rtbToken.connect(accounts[1]).transferOwnership(accounts[2].address), 'caller is not the owner');
        await expectRevert(rtbToken.connect(accounts[1]).mint(accounts[2].address, 100), 'caller is not the owner');
    });

    it('test permit mechanism', async() => {
        const tokenOwner = accounts[1];
        const tokenSpender = accounts[2];
        const transmitter = accounts[3];
        const value = 100;
        const tokenName = await rtbToken.name();
        const nonce = (await rtbToken.nonces(tokenOwner.address)).toNumber();
        const provider = accounts[0].provider;
        const latestBlockTimestamp = (await provider.getBlock(await provider.getBlockNumber())).timestamp;
        const deadline = latestBlockTimestamp + 10000000000;

        const {v, r, s} = await signPermit(tokenOwner, tokenSpender.address, value, deadline, rtbToken, tokenName);

        expect((await rtbToken.allowance(tokenOwner.address, tokenSpender.address)).toNumber()).to.equal(0);
        await rtbToken.connect(transmitter).permit(tokenOwner.address, tokenSpender.address, value, deadline, v, r, s);
        expect((await rtbToken.allowance(tokenOwner.address, tokenSpender.address)).toNumber()).to.equal(value);
        expect((await rtbToken.nonces(tokenOwner.address)).toNumber()).to.equal(nonce + 1);
    });
});
