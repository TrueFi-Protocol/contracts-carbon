import { expect } from 'chai'
import { PortfolioStatus, structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { timeTravel } from 'utils/timeTravel'
import { DAY, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'

describe('StructuredPortfolio.close', () => {
  const loadFixture = setupFixtureLoader()

  const DELTA = 1e5

  it('sets status to Closed', async () => {
    const { structuredPortfolio, PortfolioStatus } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.close()
    expect(await structuredPortfolio.status()).to.equal(PortfolioStatus.Closed)
  })

  it('transfers assets to vaults', async () => {
    const { structuredPortfolio, tranches, token, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)

    await structuredPortfolio.close()

    expect(await token.balanceOf(tranches[0].address)).to.be.closeTo(initialDeposits[0], DELTA)
    expect(await token.balanceOf(tranches[1].address)).to.be.closeTo(initialDeposits[1], DELTA)
    expect(await token.balanceOf(tranches[2].address)).to.be.closeTo(initialDeposits[2], DELTA)
    expect(await token.balanceOf(structuredPortfolio.address)).to.eq(0)
  })

  it('cannot be closed twice', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.close()
    await expect(structuredPortfolio.close()).to.be.revertedWith('SP: Portfolio already closed')
  })

  it('distribute assets correctly when no loan has been issued', async () => {
    const { portfolioDuration, structuredPortfolio, senior, junior, seniorTranche, juniorTranche, equityTranche, withInterest, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(portfolioDuration)
    await structuredPortfolio.close()

    const expectedSeniorAssets = withInterest(senior.initialDeposit, senior.targetApy, portfolioDuration)
    const expectedJuniorAssets = withInterest(junior.initialDeposit, junior.targetApy, portfolioDuration)
    const expectedEquityAssets = totalDeposit.sub(expectedSeniorAssets).sub(expectedJuniorAssets)
    expect(await seniorTranche.totalAssets()).to.eq(expectedSeniorAssets)
    expect(await juniorTranche.totalAssets()).to.eq(expectedJuniorAssets)
    expect(await equityTranche.totalAssets()).to.eq(expectedEquityAssets)
  })

  it('cannot close before end date when there are active loans', async () => {
    const { structuredPortfolio, addAndFundLoan } = await loadFixture(structuredPortfolioLiveFixture)
    await addAndFundLoan()
    await expect(structuredPortfolio.close()).to.be.revertedWith('SP: Active loans exist')
  })

  it('can close after end date when there are active loans', async () => {
    const { structuredPortfolio, addAndFundLoan, portfolioDuration } = await loadFixture(structuredPortfolioLiveFixture)
    await timeTravel(portfolioDuration)
    await addAndFundLoan()
    await structuredPortfolio.close()
    expect(await structuredPortfolio.status()).to.eq(PortfolioStatus.Closed)
  })

  it('user can\'t close before end date', async () => {
    const { structuredPortfolio, other } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(structuredPortfolio.connect(other).close()).to.be.revertedWith('SP: Cannot close before end date')
  })

  it('user can\'t close before deadline', async () => {
    const { structuredPortfolio, other } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(structuredPortfolio.connect(other).close()).to.be.revertedWith('SP: Cannot close before end date')
  })

  it('user can close after end date', async () => {
    const { structuredPortfolio, other, PortfolioStatus, portfolioDuration } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(portfolioDuration)

    await structuredPortfolio.connect(other).close()
    expect(await structuredPortfolio.status()).to.equal(PortfolioStatus.Closed)
  })

  it('can close after loan repaid', async () => {
    const { structuredPortfolio, addAndFundLoan, repayLoanInFull, PortfolioStatus } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndFundLoan()
    await repayLoanInFull(loanId)

    await structuredPortfolio.close()
    expect(await structuredPortfolio.status()).to.equal(PortfolioStatus.Closed)
  })

  it('sets distributed assets', async () => {
    const { structuredPortfolio, tranches } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.close()
    for (let i = 0; i < tranches.length; i++) {
      const { distributedAssets } = await structuredPortfolio.tranchesData(i)
      expect(distributedAssets).to.eq(await tranches[i].totalAssets())
    }
  })

  it('sets max possible waterfall values', async () => {
    const { structuredPortfolio, withInterest, senior, junior } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(YEAR / 2)
    await structuredPortfolio.updateCheckpoints()
    const waterfall = await structuredPortfolio.calculateWaterfall()

    await timeTravel(YEAR / 2)
    await structuredPortfolio.close()

    expect((await structuredPortfolio.tranchesData(0)).maxValueOnClose).to.eq(0)
    expect((await structuredPortfolio.tranchesData(1)).maxValueOnClose).to.be.closeTo(withInterest(waterfall[1], junior.targetApy, YEAR / 2), DELTA)
    expect((await structuredPortfolio.tranchesData(2)).maxValueOnClose).to.be.closeTo(withInterest(waterfall[2], senior.targetApy, YEAR / 2), DELTA)
  })

  it('close before predicted end date updates portfolio end date', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(YEAR)
    const tx = await structuredPortfolio.close()

    expect(await structuredPortfolio.endDate()).to.eq(await getTxTimestamp(tx))
  })

  it('close after predicted end date does not update portfolio end date', async () => {
    const { structuredPortfolio, portfolioDuration, portfolioStartTx } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(portfolioDuration + DAY)
    await structuredPortfolio.close()

    const expectedEndDate = await getTxTimestamp(portfolioStartTx) + portfolioDuration
    expect(await structuredPortfolio.endDate()).to.eq(expectedEndDate)
  })

  it('emits event', async () => {
    const { structuredPortfolio, PortfolioStatus } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(structuredPortfolio.close()).to.emit(structuredPortfolio, 'PortfolioStatusChanged').withArgs(PortfolioStatus.Closed)
  })

  it('transfers accrued protocol fees', async () => {
    const { structuredPortfolio, protocolConfig, protocolConfigParams, withInterest, token, tranches, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    const updateTx = await structuredPortfolio.updateCheckpoints()

    await timeTravel(YEAR)
    const closeTx = await structuredPortfolio.close()

    const timePassed = await getTxTimestamp(closeTx) - await getTxTimestamp(updateTx)
    const expectedProtocolFees = withInterest(totalDeposit, protocolFeeRate, timePassed).sub(totalDeposit)
    expect(await token.balanceOf(protocolConfigParams.protocolTreasury)).to.be.closeTo(expectedProtocolFees, tranches.length)
  })

  it('transfers accrued manager fees', async () => {
    const { seniorTranche, structuredPortfolio, withInterest, token, another, senior: { initialDeposit, targetApy }, parseTokenUnits } = await loadFixture(structuredPortfolioLiveFixture)
    const managerFeeRate = 500
    await seniorTranche.setManagerFeeBeneficiary(another.address)
    await seniorTranche.setManagerFeeRate(managerFeeRate)
    const updateTx = await structuredPortfolio.updateCheckpoints()

    await timeTravel(YEAR)
    const closeTx = await structuredPortfolio.close()

    const timePassed = await getTxTimestamp(closeTx) - await getTxTimestamp(updateTx)
    const expectedSeniorValue = withInterest(initialDeposit, targetApy, timePassed)
    const expectedManagerFees = withInterest(expectedSeniorValue, managerFeeRate, timePassed).sub(expectedSeniorValue)
    const delta = parseTokenUnits(0.1)
    expect(await token.balanceOf(another.address)).to.be.closeTo(expectedManagerFees, delta)
  })

  it('no assets remain in the portfolio', async () => {
    const { structuredPortfolio, protocolConfig, token } = await loadFixture(structuredPortfolioLiveFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)

    await timeTravel(YEAR)
    await structuredPortfolio.close()

    expect(await token.balanceOf(structuredPortfolio.address)).to.eq(0)
  })

  it('updates checkpoint with proper values in tranche', async () => {
    const { structuredPortfolio, seniorTranche, senior, protocolConfig, portfolioStartTimestamp, withInterest } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await timeTravel(YEAR)
    const tx = await structuredPortfolio.close()
    const [totalAssets, checkpointProtocolFeeRate, timestamp] = await seniorTranche.getCheckpoint()

    const closeTimestamp = await getTxTimestamp(tx)
    const timePassed = closeTimestamp - portfolioStartTimestamp
    const expectedTotalAssets = withInterest(senior.initialDeposit, senior.targetApy, timePassed)

    expect(totalAssets).to.eq(expectedTotalAssets)
    expect(checkpointProtocolFeeRate).to.eq(protocolFeeRate)
    expect(timestamp).to.eq(closeTimestamp)
  })

  it('updates checkpoint in each tranche', async () => {
    const { structuredPortfolio, seniorTranche, juniorTranche, equityTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await expect(structuredPortfolio.close())
      .to.emit(seniorTranche, 'CheckpointUpdated')
      .to.emit(juniorTranche, 'CheckpointUpdated')
      .to.emit(equityTranche, 'CheckpointUpdated')
  })

  describe('capital formation', () => {
    it('does not transfer assets', async () => {
      const { structuredPortfolio, token } = await loadFixture(structuredPortfolioFixture)

      const balanceBefore = await token.balanceOf(structuredPortfolio.address)
      const tx = await structuredPortfolio.close()
      const balanceAfter = await token.balanceOf(structuredPortfolio.address)

      expect(balanceAfter).to.eq(balanceBefore)
      await expect(Promise.resolve(tx)).to.not.emit(token, 'Transfer')
    })

    it('user can close after deadline', async () => {
      const { structuredPortfolio, other, PortfolioStatus, maxCapitalFormationDuration } = await loadFixture(structuredPortfolioFixture)
      await timeTravel(maxCapitalFormationDuration)
      await structuredPortfolio.connect(other).close()
      expect(await structuredPortfolio.status()).to.equal(PortfolioStatus.Closed)
    })
  })

  it('reverts when portfolio is paused', async () => {
    const { structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(structuredPortfolio.close())
      .to.be.revertedWith('Pausable: paused')
  })
})
