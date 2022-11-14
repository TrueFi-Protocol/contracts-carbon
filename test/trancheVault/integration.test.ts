import { expect } from 'chai'
import { BigNumberish, constants, Wallet } from 'ethers'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault integration tests', () => {
  const loadFixture = setupFixtureLoader()

  it('multiple deposits and withdrawals', async () => {
    const { juniorTranche, provider, parseTokenUnits, token } = await loadFixture(structuredPortfolioLiveFixture)
    const [lenderA, lenderB, lenderC] = provider.getWallets().slice(3)

    let lenderAShares = constants.Zero
    let lenderBShares = constants.Zero
    let lenderCShares = constants.Zero

    let lenderABalance = constants.Zero
    let lenderBBalance = constants.Zero
    let lenderCBalance = constants.Zero

    async function prepare() {
      for (const lender of [lenderA, lenderB, lenderC]) {
        await token.mint(lender.address, parseTokenUnits(1e9))
        await token.connect(lender).approve(juniorTranche.address, constants.MaxUint256)
      }

      const updateBalances = async () => {
        lenderAShares = await juniorTranche.balanceOf(lenderA.address)
        lenderBShares = await juniorTranche.balanceOf(lenderB.address)
        lenderCShares = await juniorTranche.balanceOf(lenderC.address)
        lenderABalance = await token.balanceOf(lenderA.address)
        lenderBBalance = await token.balanceOf(lenderB.address)
        lenderCBalance = await token.balanceOf(lenderC.address)
      }

      function depositToTranche(amount: BigNumberish, lender: Wallet) {
        return juniorTranche.connect(lender).deposit(amount, lender.address)
      }

      function redeemFromTranche(amount: BigNumberish, owner: Wallet) {
        return juniorTranche.connect(owner).redeem(amount, owner.address, owner.address)
      }

      return { updateBalances, depositToTranche, redeemFromTranche }
    }

    const { updateBalances, depositToTranche, redeemFromTranche } = await prepare()

    const delta = parseTokenUnits(1).toNumber()

    await depositToTranche(parseTokenUnits(1e6), lenderA)
    await depositToTranche(parseTokenUnits(1e6), lenderB)
    await updateBalances()

    expect(lenderAShares).to.be.closeTo(parseTokenUnits(1_000_000), delta)
    expect(lenderBShares).to.be.closeTo(parseTokenUnits(1_000_000), delta)
    expect(lenderCShares).to.be.closeTo(0, delta)

    expect(lenderABalance).to.eq(parseTokenUnits(999_000_000))
    expect(lenderBBalance).to.eq(parseTokenUnits(999_000_000))
    expect(lenderCBalance).to.eq(parseTokenUnits(1_000_000_000))

    await timeTravel(YEAR / 2)

    await depositToTranche(parseTokenUnits(1e6), lenderB)
    await depositToTranche(parseTokenUnits(1e6), lenderC)
    await updateBalances()

    expect(lenderAShares).to.be.closeTo(parseTokenUnits(1_000_000), delta)
    expect(lenderBShares).to.be.closeTo(parseTokenUnits(1_975_609), delta)
    expect(lenderCShares).to.be.closeTo(parseTokenUnits(975_609), delta)

    expect(lenderABalance).to.eq(parseTokenUnits(999_000_000))
    expect(lenderBBalance).to.eq(parseTokenUnits(998_000_000))
    expect(lenderCBalance).to.eq(parseTokenUnits(999_000_000))

    await timeTravel(YEAR / 2)

    // TODO update rounding in controllers
    await redeemFromTranche(lenderAShares.sub(1), lenderA)
    await redeemFromTranche(parseTokenUnits(1e6), lenderB)
    await updateBalances()

    expect(lenderAShares).to.eq(1)
    expect(lenderBShares).to.be.closeTo(parseTokenUnits(975_609), delta)
    expect(lenderCShares).to.be.closeTo(parseTokenUnits(975_609), delta)

    expect(lenderABalance).to.be.closeTo(parseTokenUnits(1_000_050_625), delta)
    expect(lenderBBalance).to.be.closeTo(parseTokenUnits(999_050_625), delta)
    expect(lenderCBalance).to.eq(parseTokenUnits(999_000_000))

    await timeTravel(YEAR / 2)

    await depositToTranche(parseTokenUnits(1e6), lenderA)
    const depositTx = await depositToTranche(parseTokenUnits(1e6), lenderB)
    const mintedShares = await extractEventArgFromTx(depositTx, [juniorTranche.address, 'Deposit', 'shares'])
    await redeemFromTranche(mintedShares, lenderB)
    await redeemFromTranche(lenderCShares.div(2), lenderC)
    await updateBalances()

    expect(lenderAShares).to.be.closeTo(parseTokenUnits(928_599), delta)
    expect(lenderBShares).to.be.closeTo(parseTokenUnits(975_609), delta)
    expect(lenderCShares).to.be.closeTo(parseTokenUnits(487_804), delta)

    expect(lenderABalance).to.be.closeTo(parseTokenUnits(999_050_625), delta)
    expect(lenderBBalance).to.be.closeTo(parseTokenUnits(999_050_625), delta)
    expect(lenderCBalance).to.be.closeTo(parseTokenUnits(999_525_312), delta)
  })
})
