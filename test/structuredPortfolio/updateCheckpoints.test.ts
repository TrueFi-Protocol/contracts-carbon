import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { getStructuredPortfolioFixture, structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'
import { setNextBlockTimestamp } from 'utils/setNextBlockTimestamp'

describe('StructuredPortfolio.updateCheckpoints', () => {
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

    it('calling multiple times doesn\'t change loan deficit', async () => {
      const {
        totalDeposit,
        addAndFundLoan,
        getLoan,
        protocolConfig,
        structuredPortfolio,
        tranches,
      } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 500
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

      const loanId = await addAndFundLoan(getLoan({
        periodCount: 1,
        principal: totalDeposit.sub(1e5),
        periodPayment: BigNumber.from(1e5),
      }))
      await timeTravel(YEAR / 2)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      for (const tranche of tranches) {
        expect(await tranche.unpaidProtocolFee()).to.be.gt(0)
      }

      const getDeficit = async i => (await structuredPortfolio.tranchesData(i)).loansDeficitCheckpoint.deficit

      const seniorDeficitBefore = await getDeficit(2)
      const juniorDeficitBefore = await getDeficit(1)
      const equityDeficitBefore = await getDeficit(0)

      for (let i = 0; i < 6; i++) {
        await structuredPortfolio.updateCheckpoints()
      }

      const seniorDeficitAfter = await getDeficit(2)
      const juniorDeficitAfter = await getDeficit(1)
      const equityDeficitAfter = await getDeficit(0)

      const delta = 1e5

      expect(seniorDeficitBefore).to.be.closeTo(seniorDeficitAfter, delta)
      expect(juniorDeficitBefore).to.be.closeTo(juniorDeficitAfter, delta)
      expect(equityDeficitBefore).to.be.closeTo(equityDeficitAfter, delta)
    })

    it('unpaid fees cannot repeatedly increase deficit', async () => {
      const { totalDeposit, addAndFundLoan, getLoan, protocolConfig, structuredPortfolio, repayLoanInFull, withInterest, senior, junior, equity, tranches } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 500
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

      const loanId = await addAndFundLoan(getLoan({ periodCount: 1, principal: totalDeposit.sub(1), periodPayment: BigNumber.from(1e5) }))
      await timeTravel(YEAR / 2)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      for (const tranche of tranches) {
        expect(await tranche.unpaidProtocolFee()).to.be.gt(0)
      }

      for (let i = 0; i < 6; i++) {
        await structuredPortfolio.updateCheckpoints()
      }

      await repayLoanInFull(loanId)

      const seniorProtocolFee = withInterest(senior.initialDeposit, protocolFeeRate, YEAR / 2).sub(senior.initialDeposit)
      const expectedSenior = withInterest(senior.initialDeposit, senior.targetApy, YEAR / 2).sub(seniorProtocolFee)

      const juniorProtocolFee = withInterest(junior.initialDeposit, protocolFeeRate, YEAR / 2).sub(junior.initialDeposit)
      const expectedJunior = withInterest(junior.initialDeposit, junior.targetApy, YEAR / 2).sub(juniorProtocolFee)

      const equityProtocolFee = withInterest(equity.initialDeposit, protocolFeeRate, YEAR / 2).sub(equity.initialDeposit)
      const expectedEquity = totalDeposit.sub(expectedSenior).sub(seniorProtocolFee).sub(expectedJunior).sub(juniorProtocolFee).sub(equityProtocolFee)

      const [equityValue, juniorValue, seniorValue] = await structuredPortfolio.calculateWaterfall()

      expect(seniorValue).to.be.closeTo(expectedSenior, expectedSenior.div(100))
      expect(juniorValue).to.be.closeTo(expectedJunior, expectedJunior.div(100))
      expect(equityValue).to.be.closeTo(expectedEquity, expectedEquity.div(100))
    })

    it('pending fees do not influence deficit', async () => {
      const {
        addAndFundLoan,
        protocolConfig,
        getLoan,
        parseTokenUnits,
        structuredPortfolio,
        equity,
        juniorTranche,
        junior,
        senior,
        depositToTranche,
        withInterest,
      } = await loadFixture(structuredPortfolioLiveFixture)

      // drain equity tranche and small amount from junior to cause deficit on default
      const loanPrincipal = equity.initialDeposit.add(BigNumber.from(1e3))
      const loanId = await addAndFundLoan(
        getLoan({
          periodCount: 1,
          principal: loanPrincipal,
          periodPayment: BigNumber.from(1),
          periodDuration: 1,
          gracePeriod: 0,
        }),
      )
      await timeTravel(1)
      await structuredPortfolio.markLoanAsDefaulted(loanId)
      expect((await structuredPortfolio.tranchesData(1)).loansDeficitCheckpoint.deficit).to.be.gt(0)

      // start accruing fees on junior
      const protocolFeeRate = 100
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      await structuredPortfolio.updateCheckpoints()

      await timeTravel(2 * YEAR)

      const seniorInterest = withInterest(senior.initialDeposit, senior.targetApy, 2 * YEAR).sub(senior.initialDeposit)
      const expectedJuniorBeforeFees = junior.initialDeposit.sub(seniorInterest)
      const expectedJuniorFees = withInterest(expectedJuniorBeforeFees, protocolFeeRate, 2 * YEAR).sub(expectedJuniorBeforeFees)

      const delta = parseTokenUnits('0.01')

      expect(await juniorTranche.pendingProtocolFee()).to.be.closeTo(expectedJuniorFees, delta)
      let { deficit } = (await structuredPortfolio.tranchesData(1)).loansDeficitCheckpoint
      expect(deficit).to.be.gt(0)
      expect(deficit).to.be.lt(parseTokenUnits(0.2))

      await depositToTranche(juniorTranche, parseTokenUnits(6e6))
      ;({ deficit } = (await structuredPortfolio.tranchesData(1)).loansDeficitCheckpoint)
      expect(deficit).to.be.gt(0)
      expect(deficit).to.be.lt(parseTokenUnits(0.2))

      await structuredPortfolio.updateCheckpoints()
      ;({ deficit } = (await structuredPortfolio.tranchesData(1)).loansDeficitCheckpoint)
      expect(deficit).to.be.gt(0)
      expect(deficit).to.be.lt(parseTokenUnits(0.2))
    })
  })
})
