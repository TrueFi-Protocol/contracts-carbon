import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, MAX_UINT_128, ONE_IN_BPS, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'
import { convertToAssets, convertToAssetsCeil } from 'utils/convertToAssets'

describe('TrancheVault.mint', () => {
  const loadFixture = setupFixtureLoader()

  it('cannot mint zero shares', async () => {
    const { equityTranche, mintToTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(mintToTranche(equityTranche, 0)).to.be.revertedWith('TV: Amount cannot be zero')
  })

  it('transfers sender\'s tokens to vault', async () => {
    const { juniorTranche, token, mintToTranche, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)

    const shares = parseTokenUnits(1000)
    await mintToTranche(juniorTranche, shares)

    expect(await token.balanceOf(juniorTranche.address)).to.eq(shares)
  })

  it('mints share tokens to sender', async () => {
    const { equityTranche, wallet, mintToTranche } = await loadFixture(structuredPortfolioFixture)
    const shares = 1000

    await mintToTranche(equityTranche, shares)
    expect(await equityTranche.balanceOf(wallet.address)).to.eq(shares)
  })

  it('reverts when exceeds max value', async () => {
    const { equityTranche, wallet } = await loadFixture(structuredPortfolioFixture)
    const amount = MAX_UINT_128.add(1)

    await expect(equityTranche.mint(amount, wallet.address))
      .to.be.revertedWith('TV: Amount exceeds max mint')
  })

  it('reverts if deposit above ceiling', async () => {
    const { equityTranche, equityTrancheData, parseTokenUnits, mintToTranche } = await loadFixture(structuredPortfolioFixture)
    const mintAmount = parseTokenUnits(1)
    await equityTrancheData.depositController.setCeiling(mintAmount.sub(1))

    await expect(mintToTranche(equityTranche, mintAmount)).to.be.revertedWith('TV: Amount exceeds max mint')
  })

  it('pays deposit controller fees', async () => {
    const { equityTranche, wallet, another, mintToTranche, equityTrancheData: { depositController }, token } = await loadFixture(structuredPortfolioFixture)
    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const depositFee = Math.floor(amount * depositFeeRate / ONE_IN_BPS)
    const totalDepositAmount = amount + depositFee
    await expect(() => mintToTranche(equityTranche, amount))
      .to.changeTokenBalances(
        token,
        [wallet, another, equityTranche],
        [-totalDepositAmount, depositFee, amount],
      )
  })

  it('minted amount not influenced by the controller fee', async () => {
    const { equityTranche, wallet, another, mintToTranche, equityTrancheData: { depositController } } = await loadFixture(structuredPortfolioFixture)
    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    await expect(() => mintToTranche(equityTranche, amount)).to.changeTokenBalance(equityTranche, wallet, amount)
  })

  it('emits ManagerFeePaid event when controller fee set', async () => {
    const { equityTranche, another, mintToTranche, equityTrancheData: { depositController } } = await loadFixture(structuredPortfolioFixture)
    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const depositFee = Math.floor(amount * depositFeeRate / ONE_IN_BPS)
    await expect(mintToTranche(equityTranche, amount))
      .to.emit(equityTranche, 'ManagerFeePaid').withArgs(another.address, depositFee)
  })

  it('returns asset amount', async () => {
    const { juniorTranche, token, wallet } = await loadFixture(structuredPortfolioLiveFixture)
    const shares = 1000
    const yearlyVaultValueGrowthFactor = 1.05
    const assetAmount = shares * yearlyVaultValueGrowthFactor + 1

    await timeTravel(YEAR)
    await token.approve(juniorTranche.address, assetAmount)

    expect(await juniorTranche.callStatic.mint(shares, wallet.address)).to.eq(assetAmount)
  })

  it('emits Deposit event', async () => {
    const { wallet, other, seniorTranche, token, senior, withInterest } = await loadFixture(structuredPortfolioLiveFixture)
    await timeTravel(YEAR)

    const shares = 1000
    const amount = withInterest(shares, senior.targetApy, YEAR).add(1)
    await token.approve(seniorTranche.address, amount)
    await expect(seniorTranche.mint(shares, other.address)).to.emit(seniorTranche, 'Deposit').withArgs(wallet.address, other.address, amount, shares)
  })

  it('reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.mint(100, wallet.address))
      .to.be.revertedWith('TV: Portfolio is paused')
  })

  it('reverts if receiver is not allowed by Lender Verifier', async () => {
    const { lenderVerifier, other, equityTranche, mintToTranche } = await loadFixture(structuredPortfolioFixture)
    await lenderVerifier.setIsBlacklisted(other.address, true)
    await expect(mintToTranche(equityTranche, 100, other.address)).to.be.revertedWith('TV: Amount exceeds max mint')
  })

  describe('Live status', () => {
    it('transfers sender\'s tokens to portfolio', async () => {
      const { juniorTranche, junior, withInterest, mintToTranche, token, structuredPortfolio, wallet, parseTokenUnits, portfolioStartTimestamp } = await loadFixture(structuredPortfolioLiveFixture)
      const initialWalletBalance = await token.balanceOf(wallet.address)
      const initialPortfolioBalance = await token.balanceOf(structuredPortfolio.address)

      await timeTravel(YEAR)
      const shares = parseTokenUnits(1000)

      const mintTx = await mintToTranche(juniorTranche, shares)

      const timePassed = await getTxTimestamp(mintTx) - portfolioStartTimestamp
      const totalAssetsOnMint = withInterest(junior.initialDeposit, junior.targetApy, timePassed)
      const expectedAmount = convertToAssetsCeil(shares, totalAssetsOnMint, junior.initialDeposit)

      expect(await token.balanceOf(wallet.address)).to.eq(initialWalletBalance.sub(expectedAmount))
      expect(await token.balanceOf(structuredPortfolio.address)).to.eq(initialPortfolioBalance.add(expectedAmount))
    })

    it('updates checkpoint', async () => {
      const { seniorTranche, mintToTranche, senior, parseTokenUnits, portfolioStartTimestamp, withInterest } = await loadFixture(structuredPortfolioLiveFixture)
      const shares = parseTokenUnits(1000)

      const mintTx = await mintToTranche(seniorTranche, shares)

      const timePassed = await getTxTimestamp(mintTx) - portfolioStartTimestamp
      const seniorTotalAssetsBeforeMint = withInterest(senior.initialDeposit, senior.targetApy, timePassed)
      const amount = convertToAssetsCeil(shares, seniorTotalAssetsBeforeMint, senior.initialDeposit)
      const seniorTotalAssets = seniorTotalAssetsBeforeMint.add(amount)

      expect((await seniorTranche.getCheckpoint()).totalAssets).to.eq(seniorTotalAssets)
    })

    it('takes accrued interest into account', async () => {
      const { seniorTranche, mintToTranche, parseTokenUnits, calculateTargetTrancheValue, senior, token, other, wallet, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
      const { trancheIdx, initialDeposit } = senior

      await timeTravel(YEAR)
      const seniorTotalAssets = calculateTargetTrancheValue(trancheIdx)

      const shares = parseTokenUnits(1000)
      const expectedAmount = convertToAssets(shares, seniorTotalAssets, initialDeposit)

      const walletBalanceBefore = await token.balanceOf(wallet.address)
      const portfolioBalanceBefore = await token.balanceOf(structuredPortfolio.address)
      await mintToTranche(seniorTranche, shares, other.address)

      const delta = 20
      expect(await token.balanceOf(wallet.address)).to.be.closeTo(walletBalanceBefore.sub(expectedAmount), delta)
      expect(await token.balanceOf(structuredPortfolio.address)).to.be.closeTo(portfolioBalanceBefore.add(expectedAmount), delta)
      expect(await seniorTranche.balanceOf(other.address)).to.eq(shares)
    })

    it('correctly calculates interest after live deposits', async () => {
      const { seniorTranche, mintToTranche, parseTokenUnits, withInterest, senior, other } = await loadFixture(structuredPortfolioLiveFixture)
      const { initialDeposit, targetApy } = senior

      await timeTravel(YEAR)
      const totalAssetsAfterYear = withInterest(initialDeposit, targetApy, YEAR)

      const shares = parseTokenUnits(1e6)
      const expectedFirstDeposit = convertToAssets(shares, totalAssetsAfterYear, initialDeposit)
      await mintToTranche(seniorTranche, shares, other.address)
      const totalAssetsAfterFirstDeposit = totalAssetsAfterYear.add(expectedFirstDeposit)

      await timeTravel(YEAR)
      await mintToTranche(seniorTranche, shares, other.address)

      const totalAssetsAfterTwoYears = withInterest(totalAssetsAfterFirstDeposit, targetApy, YEAR)
      const totalSharesAfterTwoYears = initialDeposit.add(shares)
      const expectedSecondDeposit = convertToAssets(shares, totalAssetsAfterTwoYears, totalSharesAfterTwoYears)

      const delta = 10
      expect(await seniorTranche.totalAssets()).to.be.closeTo(totalAssetsAfterTwoYears.add(expectedSecondDeposit), delta)
    })

    it('emits CheckpointUpdated event', async () => {
      const { seniorTranche, portfolioStartTimestamp, mintToTranche, parseTokenUnits, withInterest, senior } = await loadFixture(structuredPortfolioLiveFixture)
      const shares = parseTokenUnits(1000)

      const tx = await mintToTranche(seniorTranche, shares)

      const depositTimestamp = await getTxTimestamp(tx)
      const timePassed = depositTimestamp - portfolioStartTimestamp

      const seniorTotalAssetsBeforeMint = withInterest(senior.initialDeposit, senior.targetApy, timePassed)
      const amount = convertToAssetsCeil(shares, seniorTotalAssetsBeforeMint, senior.initialDeposit)
      const seniorTotalAssets = seniorTotalAssetsBeforeMint.add(amount)

      await expect(tx).to.emit(seniorTranche, 'CheckpointUpdated').withArgs(seniorTotalAssets, 0)
    })

    it('cannot mint if tranche token price is 0', async () => {
      const { addAndFundLoan, getLoan, equity, structuredPortfolio, equityTranche, mintToTranche } = await loadFixture(structuredPortfolioLiveFixture)

      const loanId = await addAndFundLoan(getLoan({
        principal: equity.initialDeposit.mul(2),
      }))

      await timeTravel(3 * DAY)
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      await expect(mintToTranche(equityTranche, 100)).to.be.revertedWith('TV: Amount cannot be zero')
    })

    it('reverts if deposit above ceiling', async () => {
      const { equityTranche, equityTrancheData, parseTokenUnits, mintToTranche } = await loadFixture(structuredPortfolioLiveFixture)
      const mintAmount = parseTokenUnits(1)
      await equityTrancheData.depositController.setCeiling(mintAmount.sub(1))

      await expect(mintToTranche(equityTranche, mintAmount)).to.be.revertedWith('TV: Amount exceeds max mint')
    })

    it('respects tranche ratios', async () => {
      const { createPortfolioAndSetupControllers, depositToTranche, tranchesInitData, mintToTranche, setDepositAllowed, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
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
      await expect(mintToTranche(tranches[1], 1010)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(mintToTranche(tranches[2], 10500)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(mintToTranche(tranches[2], 9000)).to.be.not.reverted
      await expect(mintToTranche(tranches[1], 1000)).to.be.not.reverted
      await expect(mintToTranche(tranches[0], 10000)).to.be.not.reverted
    })
  })
})
