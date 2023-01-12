import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, MAX_UINT_128, ONE_IN_BPS, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.deposit', () => {
  const loadFixture = setupFixtureLoader()

  it('cannot deposit zero assets', async () => {
    const { equityTranche, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(depositToTranche(equityTranche, 0)).to.be.revertedWith('TV: Amount cannot be zero')
  })

  it('transfers sender\'s tokens to vault', async () => {
    const { equityTranche, token, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const amount = 1000

    await depositToTranche(equityTranche, amount)

    expect(await token.balanceOf(equityTranche.address)).to.eq(amount)
  })

  it('mints share tokens to given account', async () => {
    const { equityTranche, depositToTranche, other } = await loadFixture(structuredPortfolioFixture)
    const amount = 1000

    await depositToTranche(equityTranche, amount, other.address)
    const balance = await equityTranche.balanceOf(other.address)
    expect(balance).to.eq(await equityTranche.previewDeposit(amount))
  })

  it('exceeds max value', async () => {
    const { equityTranche, wallet } = await loadFixture(structuredPortfolioFixture)
    const amount = MAX_UINT_128.add(1)

    await expect(equityTranche.deposit(amount, wallet.address))
      .to.be.revertedWith('TV: Amount exceeds max deposit')
  })

  it('returns shares', async () => {
    const { equityTranche, wallet, token } = await loadFixture(structuredPortfolioFixture)
    const amount = 1000

    await token.approve(equityTranche.address, amount)

    const shares = await equityTranche.previewDeposit(amount)
    expect(await equityTranche.callStatic.deposit(amount, wallet.address)).to.eq(shares)
  })

  it('reverts if deposit above ceiling', async () => {
    const { equityTranche, parseTokenUnits, depositToTranche, equityTrancheData } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = parseTokenUnits(1)
    await equityTrancheData.depositController.setCeiling(depositAmount.sub(1))

    await expect(depositToTranche(equityTranche, depositAmount)).to.be.revertedWith('TV: Amount exceeds max deposit')
  })

  it('pays deposit controller fees', async () => {
    const { equityTranche, wallet, another, depositToTranche, equityTrancheData: { depositController }, token } = await loadFixture(structuredPortfolioFixture)
    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const depositFee = Math.floor(amount * depositFeeRate / ONE_IN_BPS)
    await expect(() => depositToTranche(equityTranche, amount))
      .to.changeTokenBalances(
        token,
        [wallet, another, equityTranche],
        [-amount, depositFee, amount - depositFee],
      )
  })

  it('minted amount is influenced by controller fee', async () => {
    const { equityTranche, wallet, another, depositToTranche, equityTrancheData: { depositController } } = await loadFixture(structuredPortfolioFixture)
    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const depositFee = Math.floor(amount * depositFeeRate / ONE_IN_BPS)
    await expect(() => depositToTranche(equityTranche, amount)).to.changeTokenBalance(equityTranche, wallet, amount - depositFee)
  })

  it('emits ManagerFeePaid event when controller fee set', async () => {
    const { equityTranche, another, depositToTranche, equityTrancheData: { depositController } } = await loadFixture(structuredPortfolioFixture)
    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const depositFee = Math.floor(amount * depositFeeRate / ONE_IN_BPS)
    await expect(depositToTranche(equityTranche, amount))
      .to.emit(equityTranche, 'ManagerFeePaid').withArgs(another.address, depositFee)
  })

  it('emits Deposit event', async () => {
    const { wallet, other, seniorTranche, token, senior } = await loadFixture(structuredPortfolioLiveFixture)
    await timeTravel(YEAR)

    const amount = 1000
    const shares = Math.floor(amount / (1 + senior.targetApy / ONE_IN_BPS))
    await token.approve(seniorTranche.address, amount)
    await expect(seniorTranche.deposit(amount, other.address)).to.emit(seniorTranche, 'Deposit').withArgs(wallet.address, other.address, amount, shares)
  })

  it('reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.deposit(100, wallet.address))
      .to.be.revertedWith('TV: Portfolio is paused')
  })

  it('reverts if receiver is not allowed by Lender Verifier', async () => {
    const { lenderVerifier, other, equityTranche, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    await lenderVerifier.setIsBlacklisted(other.address, true)
    await expect(depositToTranche(equityTranche, 100, other.address)).to.be.revertedWith('TV: Amount exceeds max deposit')
  })

  describe('Live status', () => {
    it('transfers sender\'s tokens to portfolio', async () => {
      const { equityTranche, token, depositToTranche, structuredPortfolio, wallet } = await loadFixture(structuredPortfolioLiveFixture)
      const amount = 1000
      await expect(() => depositToTranche(equityTranche, amount)).to.changeTokenBalances(token, [structuredPortfolio.address, wallet.address], [amount, -amount])
    })

    it('updates checkpoint', async () => {
      const { seniorTranche, depositToTranche, senior, parseTokenUnits, portfolioStartTimestamp, withInterest } = await loadFixture(structuredPortfolioLiveFixture)
      const amount = parseTokenUnits(1000)

      const tx = await depositToTranche(seniorTranche, amount)

      const depositTimestamp = await getTxTimestamp(tx)
      const timePassed = depositTimestamp - portfolioStartTimestamp
      const seniorTotalAssets = withInterest(senior.initialDeposit, senior.targetApy, timePassed).add(amount)

      expect((await seniorTranche.getCheckpoint()).totalAssets).to.eq(seniorTotalAssets)
    })

    it('takes accrued interest into account', async () => {
      const { seniorTranche, depositToTranche, parseTokenUnits, calculateTargetTrancheValue, senior, other } = await loadFixture(structuredPortfolioLiveFixture)
      const { trancheIdx, initialDeposit } = senior

      await timeTravel(YEAR)
      const seniorTotalAssets = calculateTargetTrancheValue(trancheIdx)

      const amount = parseTokenUnits(1000)
      await depositToTranche(seniorTranche, amount, other.address)

      const expectedShares = amount.mul(initialDeposit).div(seniorTotalAssets)
      expect(await seniorTranche.balanceOf(other.address)).to.be.closeTo(expectedShares, 10)
    })

    it('correctly calculates interest after live deposits', async () => {
      const { seniorTranche, depositToTranche, parseTokenUnits, withInterest, senior, other } = await loadFixture(structuredPortfolioLiveFixture)
      const { initialDeposit, targetApy } = senior

      await timeTravel(YEAR)
      const totalAssetsAfterYear = withInterest(initialDeposit, targetApy, YEAR)

      const amount = parseTokenUnits(1e6)
      await depositToTranche(seniorTranche, amount, other.address)
      const totalAssetsAfterFirstDeposit = totalAssetsAfterYear.add(amount)

      await timeTravel(YEAR)
      await depositToTranche(seniorTranche, amount, other.address)

      const totalAssetsAfterSecondDeposit = withInterest(totalAssetsAfterFirstDeposit, targetApy, YEAR)
      const delta = parseTokenUnits(0.1)
      expect(await seniorTranche.totalAssets()).to.be.closeTo(totalAssetsAfterSecondDeposit.add(amount), delta)
    })

    it('emits CheckpointUpdated event', async () => {
      const { seniorTranche, portfolioStartTimestamp, depositToTranche, parseTokenUnits, withInterest, senior } = await loadFixture(structuredPortfolioLiveFixture)
      const amount = parseTokenUnits(1000)

      const tx = await depositToTranche(seniorTranche, amount)

      const depositTimestamp = await getTxTimestamp(tx)
      const timePassed = depositTimestamp - portfolioStartTimestamp
      const seniorTotalAssets = withInterest(senior.initialDeposit, senior.targetApy, timePassed).add(amount)

      await expect(tx).to.emit(seniorTranche, 'CheckpointUpdated').withArgs(seniorTotalAssets, 0)
    })

    it('cannot deposit if tranche token price is 0', async () => {
      const { addAndFundLoan, getLoan, equity, structuredPortfolio, equityTranche, depositToTranche } = await loadFixture(structuredPortfolioLiveFixture)

      const loanId = await addAndFundLoan(getLoan({
        principal: equity.initialDeposit.mul(2),
      }))

      await timeTravel(3 * DAY)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      await expect(depositToTranche(equityTranche, 100)).to.be.revertedWith('TV: Amount exceeds max deposit')
    })

    it('reverts if deposit above ceiling', async () => {
      const { equityTranche, equityTrancheData, parseTokenUnits, depositToTranche } = await loadFixture(structuredPortfolioLiveFixture)
      const depositAmount = parseTokenUnits(1)
      await equityTrancheData.depositController.setCeiling(depositAmount.sub(1))

      await expect(depositToTranche(equityTranche, depositAmount)).to.be.revertedWith('TV: Amount exceeds max deposit')
    })

    it('pending fees are than higher liquid assets plus loans', async () => {
      const { seniorTranche, structuredPortfolio, addAndFundLoan, getLoan, depositToTranche, protocolConfig } = await loadFixture(structuredPortfolioLiveFixture)
      await protocolConfig.setDefaultProtocolFeeRate(100)
      const defaultedLoanAmount = (await structuredPortfolio.totalAssets()).sub(1)
      const loanId = await addAndFundLoan(getLoan({
        principal: defaultedLoanAmount,
        periodDuration: DAY,
        periodCount: 1,
        gracePeriod: 0,
      }))
      await timeTravel(3 * DAY)
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      await expect(depositToTranche(seniorTranche, 1)).to.be.revertedWith('TV: Amount exceeds max deposit')
    })

    it('respects tranche ratios', async () => {
      const { createPortfolioAndSetupControllers, tranchesInitData, depositToTranche, setDepositAllowed, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
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
      await expect(depositToTranche(tranches[1], 1010)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(depositToTranche(tranches[2], 10500)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(depositToTranche(tranches[2], 9000)).to.be.not.reverted
      await expect(depositToTranche(tranches[1], 1000)).to.be.not.reverted
      await expect(depositToTranche(tranches[0], 10000)).to.be.not.reverted
    })
  })
})
