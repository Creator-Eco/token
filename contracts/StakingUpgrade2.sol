// SPDX-License-Identifier: MIT
// RTB staking rewards program.
// Token holders lock transfer approved tokens until the end of the current quarter plus 0 to 12 additional quarters.
// Rewards are divided pro-rata, with a 25% boost given for every locked quarter beyond the current one.
pragma solidity 0.8.6;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakingUpgrade2 is OwnableUpgradeable {
    using SafeERC20 for ERC20Permit;

    /// @custom:oz-renamed-from bbsToken
    // Note: As part of the V2 upgrade optimizations, we are reducing gas costs by converting bbsToken and rtbToken to
    // immutable state variables. Consequently, the previously used slot is now marked as `__deprecated`.
    ERC20Permit __deprecated;

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    ERC20Permit public immutable bbsToken;

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    ERC20Permit public immutable rtbToken;

    uint256 public constant QUARTER_LENGTH = 91 days;

    // This has nothing to do with decimals, it's just a precision multiplier to minimize dust.
    uint256 public constant PRECISION = 10**18;

    uint256 public nextQuarterStart;
    uint16 public currentQuarter;

    struct Quarter {
        uint256 shares;
        uint256 reward;
    }

    struct Stake {
        uint256 amount;
        uint256 lockTime;
        uint16 lockQuarter;
        uint16 unlockQuarter;
        uint16 earliestUnclaimedQuarter;
    }

    mapping(uint16 => Quarter) public quarters;
    mapping(address => Stake[]) public stakes;
    mapping(address => mapping(uint16 => uint256)[]) public shares;

    event QuarterPromoted(uint16 quarterIdx);
    event RewardDeclared(uint16 quarterIdx, uint256 amount, uint256 totalAmount);
    event StakeLocked(
        address indexed staker, uint16 stakeIdx, uint256 amount, uint16 unlockQuarter,
        uint256 originalAmount, uint16 originalUnlockQuarter);
    event RewardsClaimed(address indexed staker, uint16 stakeIdx, uint256 amount, uint256 stakeAmount);
    event TokensMigrated(address indexed holder, uint256 amount);

    /**
     * @dev Constructor function.
     * @param _bbsToken The address of the BBS token contract.
     * @param _rtbToken The address of the RTB token contract.
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(ERC20Permit _bbsToken, ERC20Permit _rtbToken) {
        require(address(_bbsToken) != address(0), "invalid BBS token");
        require(address(_rtbToken) != address(0), "invalid RTB token");

        bbsToken = _bbsToken;
        rtbToken = _rtbToken;
    }

    /**
     * @dev Initializer function.
     */
    function initialize() public initializer {
        __Ownable_init();

        currentQuarter = 0;
        nextQuarterStart = block.timestamp + QUARTER_LENGTH;
    }

    /**
     * @dev Get the number of stakes for an address (automatic getters require the index of the stake).
     * @param staker The address of the staker.
     */
    function getNumOfStakes(address staker) public view returns(uint256 numOfStakes) {
        return stakes[staker].length;
    }

    /**
     * @dev Get the total number of shares for an address on a quarter (sum of all its stakes).
     * @param staker The address of the staker.
     * @param quarterIdx The index of the quarter a reward is declared for.
     */
    function getTotalShares(address staker, uint16 quarterIdx) public view returns(uint256 numOfShares) {
        for (uint16 stakeIdx = 0; stakeIdx < getNumOfStakes(staker); stakeIdx++) {
            numOfShares += shares[staker][stakeIdx][quarterIdx];
        }
    }

    /**
     * @dev Get the voting power of an address, which is currently defined as the number of shares for next quarter.
     * Mostly here for Snapshot integration.
     * @param voter The address of the voter.
     */
    function getVotingPower(address voter) external view returns(uint256 votingPower) {
        return getTotalShares(voter, currentQuarter + 1);
    }

    /**
     * @dev Declare a reward for a quarter by transferring (approved) tokens to the contract.
     * @param quarterIdx The index of the quarter a reward is declared for.
     * @param amount The amount of tokens in the reward - must have sufficient allowance.
     * @param deadline A deadline for the permit to transfer tokens on behalf of that address.
     * @param v, r, s The signature parameters for the permit.
     */
    function declareReward(
        uint16 quarterIdx, uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external {
        require(quarterIdx >= currentQuarter, "can not declare rewards for past quarters");
        rtbToken.permit(msg.sender, address(this), amount, deadline, v, r, s);
        rtbToken.safeTransferFrom(msg.sender, address(this), amount);
        quarters[quarterIdx].reward += amount;
        emit RewardDeclared(quarterIdx, amount, quarters[quarterIdx].reward);
    }

    /**
     * @dev Promote the current quarter if a quarter ended and has a reward.
     */
    function promoteQuarter() public {
        require(block.timestamp >= nextQuarterStart, "current quarter is not yet over");
        require(quarters[currentQuarter].reward > 0, "current quarter has no reward");
        currentQuarter++;
        nextQuarterStart += QUARTER_LENGTH;
        emit QuarterPromoted(currentQuarter);
    }

    /**
     * @dev Update the shares of a stake.
     * @param staker The address of the staker.
     * @param stakeIdx The index of the stake for that staker.
     */
    function updateShare(address staker, uint16 stakeIdx) internal {
        Stake memory stake = stakes[staker][stakeIdx];
        for (uint16 quarterIdx = currentQuarter; quarterIdx < stake.unlockQuarter; quarterIdx++) {
            uint256 oldShare = shares[staker][stakeIdx][quarterIdx];
            uint256 newShare = stake.amount * (100 + ((stake.unlockQuarter - quarterIdx - 1) * 25));

            // For the quarter in which the stake was locked, we reduce the share amount
            // to reflect the part of the quarter that has already passed.
            // Note that this only happens when quarterIdx == currentQuarter.
            if (quarterIdx == stake.lockQuarter) {
                newShare = newShare * (nextQuarterStart - stake.lockTime) / QUARTER_LENGTH;
            }

            shares[staker][stakeIdx][quarterIdx] = newShare;
            quarters[quarterIdx].shares += newShare - oldShare;
        }
    }

    /**
     * @dev Calculate the unclaimed rewards a stake deserves and mark them as claimed.
     * @param staker The address of the staker.
     * @param stakeIdx The index of the stake for that staker.
     */
    function getRewards(address staker, uint16 stakeIdx) internal returns(uint256 amount) {
        for (
            uint16 quarterIdx = stakes[staker][stakeIdx].earliestUnclaimedQuarter;
            quarterIdx < currentQuarter && quarterIdx < stakes[staker][stakeIdx].unlockQuarter;
            quarterIdx++
        ) {
            if (quarters[quarterIdx].shares > 0) {
                amount +=
                    PRECISION *
                    shares[staker][stakeIdx][quarterIdx] *
                    quarters[quarterIdx].reward /
                    quarters[quarterIdx].shares;
                shares[staker][stakeIdx][quarterIdx] = 0;
            }
        }

        stakes[staker][stakeIdx].earliestUnclaimedQuarter = currentQuarter;

        return amount / PRECISION;
    }

    /**
     * @dev Require currentQuarter to be valid.
     */
    function validateCurrentQuarter() internal view {
        require(block.timestamp < nextQuarterStart, "quarter must be promoted");
    }

    /**
     * @dev Require a valid unlock quarter, which also requires currentQuarter to be valid.
     * @param unlockQuarter Quarter in which a stake will unlock.
     */
    function validateUnlockQuarter(uint16 unlockQuarter) internal view {
        validateCurrentQuarter();
        require(unlockQuarter > currentQuarter, "can not lock for less than one quarter");
        require(unlockQuarter - currentQuarter <= 13, "can not lock for more than 13 quarters");
    }

    /**
     * @dev Lock a stake of tokens.
     * @param amount Amount of tokens to lock.
     * @param unlockQuarter The index of the quarter the stake unlocks on.
     * @param deadline A deadline for the permit to transfer tokens on behalf of that address.
     * @param v, r, s The signature parameters for the permit.
     */
    function lock(
        uint256 amount, uint16 unlockQuarter,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external {
        validateUnlockQuarter(unlockQuarter);
        rtbToken.permit(msg.sender, address(this), amount, deadline, v, r, s);
        rtbToken.safeTransferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].push(Stake(amount, block.timestamp, currentQuarter, unlockQuarter, currentQuarter));
        shares[msg.sender].push();
        updateShare(msg.sender, uint16(stakes[msg.sender].length - 1));
        emit StakeLocked(msg.sender, uint16(stakes[msg.sender].length - 1), amount, unlockQuarter, 0, 0);
    }

    /**
     * @dev Lock a stake of tokens.
     * @param amount Amount of tokens to lock.
     * @param unlockQuarter The index of the quarter the stake unlocks on.
     */
    function lock(uint256 amount, uint16 unlockQuarter) external {
        validateUnlockQuarter(unlockQuarter);
        rtbToken.safeTransferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].push(Stake(amount, block.timestamp, currentQuarter, unlockQuarter, currentQuarter));
        shares[msg.sender].push();
        updateShare(msg.sender, uint16(stakes[msg.sender].length - 1));
        emit StakeLocked(msg.sender, uint16(stakes[msg.sender].length - 1), amount, unlockQuarter, 0, 0);
    }

    /**
     * @dev Extend the lock of an existing stake.
     * @param stakeIdx The index of the stake to be extended.
     * @param unlockQuarter The index of the new quarter the lock ends on.
     */
    function extend(uint16 stakeIdx, uint16 unlockQuarter) external {
        validateUnlockQuarter(unlockQuarter);
        uint16 originalUnlockQuarter = stakes[msg.sender][stakeIdx].unlockQuarter;
        require(originalUnlockQuarter > currentQuarter, "can not extend an unlocked stake");
        require(unlockQuarter > stakes[msg.sender][stakeIdx].unlockQuarter, "must extend beyond current lock");
        stakes[msg.sender][stakeIdx].unlockQuarter = unlockQuarter;
        updateShare(msg.sender, stakeIdx);
        emit StakeLocked(
            msg.sender, stakeIdx, stakes[msg.sender][stakeIdx].amount, unlockQuarter,
            stakes[msg.sender][stakeIdx].amount, originalUnlockQuarter);
    }

    /**
     * @dev Add the rewards of a stake to the locked amount.
     * @param stakeIdx The index of the stake to be restaked.
     */
    function lockRewards(uint16 stakeIdx) external {
        validateUnlockQuarter(stakes[msg.sender][stakeIdx].unlockQuarter);
        uint256 rewards = getRewards(msg.sender, stakeIdx);
        uint256 originalAmount = stakes[msg.sender][stakeIdx].amount;
        require(rewards > 0, "no rewards to lock");
        stakes[msg.sender][stakeIdx].amount += rewards;
        updateShare(msg.sender, stakeIdx);
        emit StakeLocked(
            msg.sender, stakeIdx, stakes[msg.sender][stakeIdx].amount, stakes[msg.sender][stakeIdx].unlockQuarter,
            originalAmount, stakes[msg.sender][stakeIdx].unlockQuarter);
    }

    /**
     * @dev Claim rewards for a stake, and the locked amount if the stake is no longer locked.
     * @param stakeIdx The index of the stake to be claimed.
     */
    function claim(uint16 stakeIdx) external {
        validateCurrentQuarter();
        uint256 claimAmount = getRewards(msg.sender, stakeIdx);
        uint256 stakeAmount = 0;
        if (stakes[msg.sender][stakeIdx].unlockQuarter <= currentQuarter) {
            stakeAmount = stakes[msg.sender][stakeIdx].amount;
            claimAmount += stakeAmount;
            stakes[msg.sender][stakeIdx].amount = 0;
        }
        require(claimAmount > 0, "nothing to claim");
        rtbToken.safeTransfer(msg.sender, claimAmount);
        emit RewardsClaimed(msg.sender, stakeIdx, claimAmount, stakeAmount);
    }

    /**
     * @dev Migrate BBS to RTB.
     * @param amount Amount of BBS tokens to migrate to RTB.
     */
    function migrate(uint256 amount) external {
        require(amount > 0, "invalid amount");

        _migrate(msg.sender, amount);
    }

    /**
     * @dev Migrate BBS to RTB.
     * @param amount Amount of BBS tokens to migrate to RTB.
     * @param deadline A deadline for the permit to transfer tokens on behalf of that address.
     * @param v, r, s The signature parameters for the permit.
     */
    function migrate(uint256 amount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(amount > 0, "invalid amount");

        bbsToken.permit(msg.sender, address(this), amount, deadline, v, r, s);

        _migrate(msg.sender, amount);
    }

    /**
     * @dev Migrate BBS to RTB.
     * @param sender  The address of the sender.
     * @param amount Amount of BBS tokens to migrate to RTB.
     */
    function _migrate(address sender, uint256 amount) private {
        require(amount > 0, "invalid amount");

        bbsToken.safeTransferFrom(sender, address(this), amount);
        rtbToken.safeTransfer(sender, amount);

        emit TokensMigrated(sender, amount);
    }
}
