import { expect } from 'chai'
import {
  PortfolioStatus,
  structuredPortfolioFixture,
  structuredPortfolioLiveFixture,
} from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { timeTravel, timeTravelAndMine } from 'utils/timeTravel'
import { DAY, MONTH, ONE_IN_BPS, WEEK, YEAR } from 'utils/constants'
import { constants } from 'ethers'
import { getTxTimestamp } from 'utils/getTxTimestamp'

describe('TrancheVault.withdraw', () => {
  const loadFixture = setupFixtureLoader()

  async function structuredPortfolioClosedFixture() {
    const fixtureResult = await loadFixture(structuredPortfolioLiveFixture)
    await fixtureResult.structuredPortfolio.close()
    return fixtureResult
  }

  it('cannot withdraw zero assets', async () => {
    const { equityTranche, withdrawFromTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(withdrawFromTranche(equityTranche, 0)).to.be.revertedWith('TV: Amount cannot be zero')
  })

  it('cannot withdraw in capital formation if not allowed', async () => {
    const { equityTranche, withdrawFromTranche } = await loadFixture(structuredPortfolioFixture)
    const amount = 1000
    await expect(withdrawFromTranche(equityTranche, amount))
      .to.be.revertedWith('TV: Amount exceeds max withdraw')
  })

  it('can withdraw in capital formation if allowed', async () => {
    const { equityTranche, withdrawFromTranche, depositToTranche, token, wallet, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    const amount = 1000
    await depositToTranche(equityTranche, amount)

    await expect(withdrawFromTranche(equityTranche, amount)).to.changeTokenBalances(token, [equityTranche, wallet], [-amount, amount])
  })

  it('cannot withdraw below floor', async () => {
    const { equityTranche, equityTrancheData, withdrawFromTranche, depositToTranche, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    const amount = 1000
    await equityTrancheData.withdrawController.setFloor(amount / 2)
    await depositToTranche(equityTranche, amount)

    await expect(withdrawFromTranche(equityTranche, amount)).to.be.revertedWith('TV: Amount exceeds max withdraw')
  })

  it('transfers tokens to the receiver', async () => {
    const {
      equityTranche,
      token,
      other,
      wallet,
      withdrawFromTranche,
    } = await structuredPortfolioClosedFixture()

    const amount = 1000
    await expect(() => withdrawFromTranche(equityTranche, amount, wallet.address, other.address))
      .to.changeTokenBalance(token, other.address, amount)
  })

  it('cannot withdraw funds without owner approve', async () => {
    const { equityTranche, wallet, other, token } = await structuredPortfolioClosedFixture()
    const amount = 1000
    await expect(equityTranche.connect(other).withdraw(amount, other.address, wallet.address)).to.be.revertedWith('TV: Insufficient allowance')
    await equityTranche.approve(other.address, amount + 1)
    await expect(() => equityTranche.connect(other).withdraw(amount, other.address, wallet.address)).to.changeTokenBalance(token, other.address, amount)
  })

  it('decreases allowance when sender is not owner', async () => {
    const { equityTranche, wallet, other, parseTokenUnits } = await structuredPortfolioClosedFixture()

    const withdrawAmount = parseTokenUnits(1000)
    const withdrawAmountInShares = (await equityTranche.convertToShares(withdrawAmount)).add(1)
    const approveAmount = parseTokenUnits(2000)
    await equityTranche.approve(other.address, approveAmount)
    await equityTranche.connect(other).withdraw(withdrawAmount, other.address, wallet.address)

    expect(await equityTranche.allowance(wallet.address, other.address)).to.eq(approveAmount.sub(withdrawAmountInShares))
  })

  it('cannot withdraw more than max withdraw amount', async () => {
    const { equityTranche, withdrawFromTranche, wallet } = await structuredPortfolioClosedFixture()
    await expect(withdrawFromTranche(equityTranche, (await equityTranche.maxWithdraw(wallet.address)).add(1)))
      .to.be.revertedWith('TV: Amount exceeds max withdraw')
  })

  it('burns shares from owner address', async () => {
    const { equityTranche, wallet, withdrawFromTranche } = await structuredPortfolioClosedFixture()

    const amount = 1000
    const totalSupplyBefore = await equityTranche.totalSupply()
    const expectedShares = Math.ceil(amount * (await equityTranche.totalSupply()).toNumber() / (await equityTranche.totalAssets()).toNumber())
    await expect(() => withdrawFromTranche(equityTranche, amount))
      .to.changeTokenBalance(equityTranche, wallet, -expectedShares)
    expect(await equityTranche.totalSupply()).to.equal(totalSupplyBefore.sub(expectedShares))
  })

  it('correctly converts shares to assets', async () => {
    const { equityTranche, withdrawFromTranche, token, wallet, increaseAssetsInTranche } = await structuredPortfolioClosedFixture()
    await increaseAssetsInTranche(equityTranche, await equityTranche.totalAssets())
    const assetAmount = 1000
    const withdraw = () => withdrawFromTranche(equityTranche, assetAmount)
    await expect(withdraw).to.changeTokenBalance(token, wallet, assetAmount)
    await expect(withdraw).to.changeTokenBalance(equityTranche, wallet, -assetAmount / 2 - 1)
  })

  it('pays withdraw controller fee', async () => {
    const { equityTranche, withdrawFromTranche, token, wallet, another, equityTrancheData: { withdrawController }, depositToTranche, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(1000))

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const withdrawFee = Math.floor(amount * withdrawFeeRate / ONE_IN_BPS)
    await equityTranche.approve(equityTranche.address, amount + withdrawFee)
    await expect(() => withdrawFromTranche(equityTranche, amount))
      .to.changeTokenBalances(token, [wallet, another, equityTranche], [amount, withdrawFee, -(amount + withdrawFee)])
  })

  it('burnt amount is influenced by controller fee', async () => {
    const { equityTranche, depositToTranche, withdrawFromTranche, wallet, equityTrancheData: { withdrawController }, parseTokenUnits, another } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(1000))

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const withdrawFee = Math.floor(amount * withdrawFeeRate / ONE_IN_BPS)
    await expect(() => withdrawFromTranche(equityTranche, amount))
      .to.changeTokenBalance(equityTranche, wallet, -(amount + withdrawFee))
  })

  it('emits ManagerFeePaid event when controller fee set', async () => {
    const { equityTranche, depositToTranche, withdrawFromTranche, parseTokenUnits, another, equityTrancheData: { withdrawController } } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(1000))

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const withdrawFee = Math.floor(amount * withdrawFeeRate / ONE_IN_BPS)

    await expect(withdrawFromTranche(equityTranche, amount))
      .to.emit(equityTranche, 'ManagerFeePaid').withArgs(another.address, withdrawFee)
  })

  it('emits event', async () => {
    const { seniorTranche, senior, wallet, other, another } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(YEAR)
    const amount = 1000
    const shares = Math.ceil(amount / (1 + senior.targetApy / ONE_IN_BPS))
    await seniorTranche.approve(other.address, constants.MaxUint256)
    await expect(seniorTranche.connect(other).withdraw(amount, another.address, wallet.address)).to.emit(seniorTranche, 'Withdraw')
      .withArgs(other.address, another.address, wallet.address, amount, shares)
  })

  it('reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.withdraw(100, wallet.address, wallet.address))
      .to.be.revertedWith('TV: Portfolio is paused')
  })

  describe('Live', () => {
    it('transfers tokens to receiver', async () => {
      const { equityTranche, token, withdrawFromTranche, structuredPortfolio, wallet, other } = await loadFixture(structuredPortfolioLiveFixture)
      const amount = 1000
      await expect(() => withdrawFromTranche(equityTranche, amount, wallet.address, other.address))
        .to.changeTokenBalances(token, [other.address, structuredPortfolio.address, wallet.address], [amount, -amount, 0])
    })

    it('burns owner\'s shares', async () => {
      const { juniorTranche, withdrawFromTranche, wallet } = await loadFixture(structuredPortfolioLiveFixture)
      const amount = 1000
      const expectedSharesAmount = Math.ceil(amount / 1.05)
      await timeTravel(YEAR)
      const totalSupplyBefore = await juniorTranche.totalSupply()
      await expect(() => withdrawFromTranche(juniorTranche, amount))
        .to.changeTokenBalance(juniorTranche, wallet.address, -expectedSharesAmount)
      expect(await juniorTranche.totalSupply()).to.equal(totalSupplyBefore.sub(expectedSharesAmount))
    })

    it('tranche total assets are calculated correctly after multiple withdraws', async () => {
      const { juniorTranche, withdrawFromTranche, withInterest, parseTokenUnits, junior } = await loadFixture(structuredPortfolioLiveFixture)
      const { targetApy, initialDeposit } = junior
      const amount = parseTokenUnits(1e6)
      const delta = parseTokenUnits(0.1)

      await timeTravel(MONTH)
      const expectedAssetsAfterMonth1 = withInterest(initialDeposit, targetApy, MONTH).sub(amount)
      await withdrawFromTranche(juniorTranche, amount)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedAssetsAfterMonth1, delta)

      await timeTravel(MONTH)
      const expectedAssetsAfterMonth2 = withInterest(expectedAssetsAfterMonth1, targetApy, MONTH).sub(amount)
      await withdrawFromTranche(juniorTranche, amount)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedAssetsAfterMonth2, delta)

      await timeTravelAndMine(MONTH)
      const expectedAssetsAfterMonth3 = withInterest(expectedAssetsAfterMonth2, targetApy, MONTH)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedAssetsAfterMonth3, delta)
    })

    it('cannot withdraw below floor', async () => {
      const { equityTranche, equityTrancheData, withdrawFromTranche, depositToTranche, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
      await startPortfolioAndEnableLiveActions()
      const amount = 1000
      await equityTrancheData.withdrawController.setFloor(amount / 2)
      await depositToTranche(equityTranche, amount)

      await expect(withdrawFromTranche(equityTranche, amount)).to.be.revertedWith('TV: Amount exceeds max withdraw')
    })
  })

  describe('Closed', () => {
    it('updates checkpoint', async () => {
      const { withdrawFromTranche, seniorTranche, protocolConfig, token, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
      await structuredPortfolio.close()
      await timeTravel(WEEK)

      const protocolFeeRate = 500
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      const seniorBalance = await token.balanceOf(seniorTranche.address)

      const tx = await withdrawFromTranche(seniorTranche, 1)

      const [totalAssets, checkpointProtocolFeeRate, timestamp] = await seniorTranche.getCheckpoint()
      expect(totalAssets).to.eq(seniorBalance.sub(1))
      expect(checkpointProtocolFeeRate).to.eq(protocolFeeRate)
      expect(timestamp).to.eq(await getTxTimestamp(tx))
    })

    async function weekAfterCloseFixture() {
      const portfolioFixtureResult = await loadFixture(structuredPortfolioLiveFixture)
      const { senior, protocolConfig, structuredPortfolio, withInterest, portfolioStartTimestamp } = portfolioFixtureResult
      const protocolFeeRate = 500
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

      const closeTx = await structuredPortfolio.close()
      const portfolioCloseTimestamp = await getTxTimestamp(closeTx)
      const timePassedSinceStart = portfolioCloseTimestamp - portfolioStartTimestamp
      const seniorAssetsOnClose = withInterest(senior.initialDeposit, senior.targetApy, timePassedSinceStart)

      await timeTravel(WEEK)

      return { ...portfolioFixtureResult, seniorAssetsOnClose, portfolioCloseTimestamp, protocolFeeRate }
    }

    it('transfers accrued protocol fees', async () => {
      const { withdrawFromTranche, seniorTranche, portfolioCloseTimestamp, protocolFeeRate, withInterest, seniorAssetsOnClose, protocolConfigParams, token } = await weekAfterCloseFixture()
      const withdrawTx = await withdrawFromTranche(seniorTranche, 1)

      const timePassedSinceClose = await getTxTimestamp(withdrawTx) - portfolioCloseTimestamp
      const expectedProtocolFee = withInterest(seniorAssetsOnClose, protocolFeeRate, timePassedSinceClose).sub(seniorAssetsOnClose)
      expect(await token.balanceOf(protocolConfigParams.protocolTreasury)).to.eq(expectedProtocolFee)
    })

    it('emits ProtocolFeePaid event', async () => {
      const { withdrawFromTranche, seniorTranche, portfolioCloseTimestamp, protocolFeeRate, withInterest, seniorAssetsOnClose, protocolConfigParams } = await weekAfterCloseFixture()
      const withdrawTx = await withdrawFromTranche(seniorTranche, 1)

      const timePassedSinceClose = await getTxTimestamp(withdrawTx) - portfolioCloseTimestamp
      const expectedProtocolFee = withInterest(seniorAssetsOnClose, protocolFeeRate, timePassedSinceClose).sub(seniorAssetsOnClose)
      await expect(withdrawTx).to.emit(seniorTranche, 'ProtocolFeePaid').withArgs(protocolConfigParams.protocolTreasury, expectedProtocolFee)
    })

    it('can withdraw below floor', async () => {
      const { equityTranche, withdrawFromTranche, depositToTranche, startAndClosePortfolio, token, wallet, equityTrancheData } = await loadFixture(structuredPortfolioFixture)
      const amount = 1000
      await equityTrancheData.withdrawController.setFloor(500)
      await equityTrancheData.depositController.setCeiling(2 * amount)

      await depositToTranche(equityTranche, amount)

      await startAndClosePortfolio()

      await expect(withdrawFromTranche(equityTranche, amount)).to.changeTokenBalances(token, [equityTranche, wallet], [-amount, amount])
    })

    it('pending fees are than higher liquid assets plus loans', async () => {
      const { seniorTranche, structuredPortfolio, addAndFundLoan, getLoan, withdrawFromTranche, protocolConfig, wallet } = await loadFixture(structuredPortfolioLiveFixture)
      await protocolConfig.setDefaultProtocolFeeRate(100)
      const defaultedLoanAmount = (await structuredPortfolio.totalAssets()).sub(100)
      const loanId = await addAndFundLoan(getLoan({
        principal: defaultedLoanAmount,
        periodDuration: DAY,
        periodCount: 1,
        gracePeriod: 0,
      }))
      await timeTravel(3 * DAY)
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      expect(await seniorTranche.maxWithdraw(wallet.address)).to.eq(0)
      await expect(withdrawFromTranche(seniorTranche, 1)).to.be.revertedWith('TV: Amount exceeds max withdraw')
    })

    it('respects tranche ratios', async () => {
      const { createPortfolioAndSetupControllers, tranchesInitData, depositToTranche, setDepositAllowed, setWithdrawAllowed, withdrawFromTranche } = await loadFixture(structuredPortfolioFixture)
      const { portfolio, tranches, controllers } = await createPortfolioAndSetupControllers({
        tranchesInitData: [
          tranchesInitData[0],
          {
            ...tranchesInitData[1],
            minSubordinateRatio: 1000,
          },
          {
            ...tranchesInitData[2],
            minSubordinateRatio: 2000,
          },
        ],
      })

      await depositToTranche(tranches[0], 300)
      await depositToTranche(tranches[1], 2000)
      await depositToTranche(tranches[2], 2000)

      await portfolio.start()
      for (const { depositController, withdrawController } of controllers) {
        await setDepositAllowed(depositController, true, portfolio)
        await setWithdrawAllowed(withdrawController, true, portfolio)
      }
      await expect(withdrawFromTranche(tranches[0], 200)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(withdrawFromTranche(tranches[0], 100)).to.be.not.reverted
      await expect(withdrawFromTranche(tranches[1], 1900)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(withdrawFromTranche(tranches[1], 1800)).to.be.not.reverted
      await expect(withdrawFromTranche(tranches[2], 1999)).to.be.not.reverted
    })
  })
})
