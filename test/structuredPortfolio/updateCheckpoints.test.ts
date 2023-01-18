import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { getStructuredPortfolioFixture, structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'
import { setNextBlockTimestamp } from 'utils/setNextBlockTimestamp'

describe('StructuredPortfolio.updateCheckpoint', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts in capital formation', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await expect(structuredPortfolio.updateCheckpoints()).to.be.revertedWith('SP: No checkpoints before start')
  })

  it('collects fees in closed state', async () => {
    const { structuredPortfolio, depositToTranche, parseTokenUnits, maxCapitalFormationDuration, createPortfolioTx, protocolConfig, seniorTranche } = await loadFixture(structuredPortfolioFixture)
    const protocolFee = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFee)

    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)

    const portfolioCreationTimestamp = await getTxTimestamp(createPortfolioTx)
    await setNextBlockTimestamp(portfolioCreationTimestamp + maxCapitalFormationDuration)
    const tx = await structuredPortfolio.close()
    const closeTimestamp = await getTxTimestamp(tx)
    await setNextBlockTimestamp(closeTimestamp + YEAR)

    expect(await seniorTranche.totalAssets()).to.eq(depositAmount)
    await structuredPortfolio.updateCheckpoints()

    const expectedFee = depositAmount.mul(protocolFee).div(ONE_IN_BPS)
    expect(await seniorTranche.totalAssets()).to.eq(depositAmount.sub(expectedFee))
  })

  it('updates checkpoint', async () => {
    const { protocolConfig, structuredPortfolio, senior, junior, seniorTranche, juniorTranche, equityTranche, parseTokenUnits, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await timeTravel(YEAR)

    const tx = await structuredPortfolio.updateCheckpoints()
    const txTimestamp = await getTxTimestamp(tx)

    const seniorTargetValue = senior.calculateTargetValue()
    const juniorTargetValue = junior.calculateTargetValue()
    const equityTargetValue = totalDeposit.sub(seniorTargetValue).sub(juniorTargetValue)

    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const equityCheckpoint = await equityTranche.getCheckpoint()

    const delta = parseTokenUnits(0.1)
    expect(seniorCheckpoint.totalAssets).to.be.closeTo(seniorTargetValue, delta)
    expect(seniorCheckpoint.protocolFeeRate).to.eq(protocolFeeRate)
    expect(seniorCheckpoint.timestamp).to.eq(txTimestamp)

    expect(juniorCheckpoint.totalAssets).to.be.closeTo(juniorTargetValue, delta)
    expect(juniorCheckpoint.protocolFeeRate).to.eq(protocolFeeRate)
    expect(juniorCheckpoint.timestamp).to.eq(txTimestamp)

    expect(equityCheckpoint.totalAssets).to.be.closeTo(equityTargetValue, delta)
    expect(equityCheckpoint.protocolFeeRate).to.eq(protocolFeeRate)
    expect(equityCheckpoint.timestamp).to.eq(txTimestamp)
  })

  it('emits CheckpointUpdated event', async () => {
    const { protocolConfig, structuredPortfolio, senior, junior, seniorTranche, juniorTranche, equityTranche, withInterest, portfolioStartTimestamp, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await timeTravel(YEAR)

    const tx = await structuredPortfolio.updateCheckpoints()

    const refreshTimestamp = await getTxTimestamp(tx)
    const timePassed = refreshTimestamp - portfolioStartTimestamp

    const seniorExpectedValue = withInterest(senior.initialDeposit, senior.targetApy, timePassed)
    const juniorExpectedValue = withInterest(junior.initialDeposit, junior.targetApy, timePassed)
    const equityExpectedValue = totalDeposit.sub(seniorExpectedValue).sub(juniorExpectedValue)

    await expect(tx)
      .to.emit(seniorTranche, 'CheckpointUpdated').withArgs(seniorExpectedValue, protocolFeeRate)
      .to.emit(juniorTranche, 'CheckpointUpdated').withArgs(juniorExpectedValue, protocolFeeRate)
      .to.emit(equityTranche, 'CheckpointUpdated').withArgs(equityExpectedValue, protocolFeeRate)
  })

  it('updating multiple times does not add too much interest', async () => {
    const { structuredPortfolio, portfolioDuration, parseTokenUnits, withInterest, senior, junior } = await loadFixture(structuredPortfolioLiveFixture)
    const updatesCount = 20
    const period = portfolioDuration / updatesCount

    for (let i = 0; i < updatesCount; i++) {
      await structuredPortfolio.updateCheckpoints()
      await timeTravel(period)
    }

    const waterfall = await structuredPortfolio.calculateWaterfall()

    const seniorExpectedValue = withInterest(senior.initialDeposit, senior.targetApy, portfolioDuration)
    const juniorExpectedValue = withInterest(junior.initialDeposit, junior.targetApy, portfolioDuration)

    const delta = parseTokenUnits(3e4)
    expect(waterfall[2]).to.be.closeTo(seniorExpectedValue, delta)
    expect(waterfall[1]).to.be.closeTo(juniorExpectedValue, delta)
  })

  it('reverts when portfolio is paused', async () => {
    const { structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(structuredPortfolio.updateCheckpoints()).to.be.revertedWith('Pausable: paused')
  })

  it('does not revert when fee is over balance', async () => {
    const { structuredPortfolio, protocolConfig, seniorTranche, juniorTranche, equityTranche, depositToTranche, parseTokenUnits, token, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 10000
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    await depositToTranche(equityTranche, parseTokenUnits(4000))
    await depositToTranche(juniorTranche, parseTokenUnits(2000))
    await depositToTranche(seniorTranche, parseTokenUnits(1000))
    await timeTravel(YEAR)

    await token.transfer(structuredPortfolio.address, parseTokenUnits(0.1))

    await expect(structuredPortfolio.updateCheckpoints()).not.to.be.reverted
  })

  describe('with defaulted loans deficit', () => {
    it('deficit cannot be repeatedly assigned to tranche interest', async () => {
      const { depositToTranche, seniorTranche, juniorTranche, equityTranche, parseTokenUnits, structuredPortfolio, addAndFundLoan, getLoan, tranches } = await loadFixture(getStructuredPortfolioFixture({ tokenDecimals: 18, targetApys: [0, 200, 100] }))

      const totalAssets: BigNumber[] = []
      const delta = parseTokenUnits('0.000001')
      async function assertTotalAssets() {
        for (let i = 0; i < tranches.length; i++) {
          expect(await tranches[i].totalAssets()).to.be.closeTo(totalAssets[i], delta)
        }
      }

      const amount = parseTokenUnits(100)
      await depositToTranche(seniorTranche, amount)
      await depositToTranche(juniorTranche, amount)
      await depositToTranche(equityTranche, amount)

      await structuredPortfolio.start()

      const loanB = getLoan({
        principal: parseTokenUnits(180),
        periodCount: 12,
        periodPayment: parseTokenUnits(180 / 12 * 0.1), // 10%
        periodDuration: YEAR / 12,
        gracePeriod: 0,
      })
      await addAndFundLoan(loanB)

      const loanA = getLoan({
        principal: parseTokenUnits(102),
        periodCount: 1,
        periodPayment: BigNumber.from(1), // 0%
        periodDuration: 1,
        gracePeriod: 0,
      })
      const loanAId = await addAndFundLoan(loanA)

      await timeTravel(1)

      await structuredPortfolio.markLoanAsDefaulted(loanAId)

      await timeTravel(YEAR)
      for (let i = 0; i < tranches.length; i++) {
        totalAssets.push(await tranches[i].totalAssets())
      }

      await structuredPortfolio.updateCheckpoints()
      await assertTotalAssets()

      await structuredPortfolio.updateCheckpoints()
      await assertTotalAssets()

      await structuredPortfolio.updateCheckpoints()
      await assertTotalAssets()
    })
  })
})
