import {
  structuredPortfolioFixture,
  structuredPortfolioLiveFixture,
} from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { timeTravel } from 'utils/timeTravel'
import { YEAR, MINUTE, ONE_IN_BPS } from 'utils/constants'
import { expect } from 'chai'
import { sum } from 'utils/sum'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { parseUSDC } from 'utils/parseUSDC'
import { setNextBlockTimestamp } from 'utils/setNextBlockTimestamp'

describe('StructuredPortfolio.calculateWaterfall', () => {
  const loadFixture = setupFixtureLoader()

  const DELTA = 1e5

  it('capital formation, returns deposits', async () => {
    const { structuredPortfolio, depositToTranche, tranches, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)

    const seniorDeposit = parseTokenUnits(1000)
    const juniorDeposit = parseTokenUnits(1000)
    const equityDeposit = parseTokenUnits(1000)

    await depositToTranche(tranches[2], seniorDeposit)
    await depositToTranche(tranches[1], juniorDeposit)
    await depositToTranche(tranches[0], equityDeposit)

    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    expect(waterfallValues[2]).to.eq(seniorDeposit)
    expect(waterfallValues[1]).to.eq(juniorDeposit)
    expect(waterfallValues[0]).to.eq(equityDeposit)
  })

  it('returns 0 for no deposit on tranche', async () => {
    const { structuredPortfolio, juniorTranche, equityTranche, depositToTranche, parseTokenUnits, withInterest, tranchesData } = await loadFixture(structuredPortfolioFixture)
    const amount = parseTokenUnits(1000)
    await depositToTranche(juniorTranche, amount)
    await depositToTranche(equityTranche, amount)

    await structuredPortfolio.start()
    await timeTravel(YEAR)

    const waterfallValues = await structuredPortfolio.calculateWaterfall()
    expect(waterfallValues[2]).to.eq(0)
    const juniorExpectedAmount = withInterest(amount, tranchesData[1].targetApy, YEAR)
    expect(waterfallValues[1]).to.be.closeTo(juniorExpectedAmount, DELTA)
    expect(waterfallValues[0]).to.be.closeTo(amount.mul(2).sub(juniorExpectedAmount), DELTA)
  })

  it('closed, returns deposits', async () => {
    const { structuredPortfolio, initialDeposits, portfolioStartTimestamp, withInterest, tranchesData } = await loadFixture(structuredPortfolioLiveFixture)

    await setNextBlockTimestamp(portfolioStartTimestamp + YEAR)
    await structuredPortfolio.close()
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedSenior = withInterest(initialDeposits[2], tranchesData[2].targetApy, YEAR)
    const expectedJunior = withInterest(initialDeposits[1], tranchesData[1].targetApy, YEAR)

    const totalAssets = await structuredPortfolio.totalAssets()
    const expectedEquity = totalAssets.sub(expectedSenior).sub(expectedJunior)

    expect(waterfallValues[2]).to.eq(expectedSenior)
    expect(waterfallValues[1]).to.eq(expectedJunior)
    expect(waterfallValues[0]).to.eq(expectedEquity)
  })

  it('portfolio didn\'t change value, no time has passed', async () => {
    const { structuredPortfolio, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)

    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    expect(waterfallValues[2]).to.be.closeTo(initialDeposits[2], DELTA)
    expect(waterfallValues[1]).to.be.closeTo(initialDeposits[1], DELTA)
    expect(waterfallValues[0]).to.be.closeTo(initialDeposits[0], DELTA)
  })

  it('each tranche gains target value, 1 year passed', async () => {
    const { structuredPortfolio, mintToPortfolio, parseTokenUnits, tranchesData, initialDeposits, withInterest } = await loadFixture(structuredPortfolioLiveFixture)

    const mintedTokens = parseTokenUnits(1e9)
    await mintToPortfolio(mintedTokens)

    const targetApys = tranchesData.map(({ targetApy }) => targetApy)

    await timeTravel(YEAR)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedPortfolioValue = sum(...initialDeposits, mintedTokens)
    const expectedEquityValue = expectedPortfolioValue.sub(waterfallValues[2]).sub(waterfallValues[1])

    expect(waterfallValues[2]).to.be.closeTo(withInterest(initialDeposits[2], targetApys[2], YEAR), DELTA)
    expect(waterfallValues[1]).to.be.closeTo(withInterest(initialDeposits[1], targetApys[1], YEAR), DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
  })

  it('each tranche gains target value, half a year passed', async () => {
    const { structuredPortfolio, mintToPortfolio, parseTokenUnits, tranchesData, initialDeposits, withInterest } = await loadFixture(structuredPortfolioLiveFixture)

    const mintedTokens = parseTokenUnits(1e9)
    await mintToPortfolio(mintedTokens)

    const targetApys = tranchesData.map(({ targetApy }) => targetApy)

    await timeTravel(YEAR / 2)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedPortfolioValue = sum(...initialDeposits, mintedTokens)
    const expectedEquityValue = expectedPortfolioValue.sub(waterfallValues[2]).sub(waterfallValues[1])

    expect(waterfallValues[2]).to.be.closeTo(withInterest(initialDeposits[2], targetApys[2], YEAR / 2), DELTA)
    expect(waterfallValues[1]).to.be.closeTo(withInterest(initialDeposits[1], targetApys[1], YEAR / 2), DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
  })

  it('portfolio didn\'t change value', async () => {
    const { structuredPortfolio, tranchesData, initialDeposits, withInterest, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)

    const targetApys = tranchesData.map(({ targetApy }) => targetApy)

    await timeTravel(YEAR)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedPortfolioValue = totalDeposit
    const expectedEquityValue = expectedPortfolioValue.sub(waterfallValues[2]).sub(waterfallValues[1])

    expect(waterfallValues[2]).to.be.closeTo(withInterest(initialDeposits[2], targetApys[2], YEAR), DELTA)
    expect(waterfallValues[1]).to.be.closeTo(withInterest(initialDeposits[1], targetApys[1], YEAR), DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
    expect(sum(...waterfallValues)).to.equal(expectedPortfolioValue)
  })

  it('portfolio lost value, equity lost everything, junior still has funds', async () => {
    const { structuredPortfolio, tranchesData, addAndFundLoan, getLoan, parseTokenUnits, initialDeposits, withInterest, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)

    const targetApys = tranchesData.map(({ targetApy }) => targetApy)

    const defaultedLoanValue = parseTokenUnits(2e6)

    const loan = getLoan({ principal: defaultedLoanValue })

    const loanId = await addAndFundLoan(loan)
    await timeTravel(YEAR)
    await structuredPortfolio.markLoanAsDefaulted(loanId)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedPortfolioValue = totalDeposit.sub(defaultedLoanValue)
    const expectedJuniorValue = expectedPortfolioValue.sub(waterfallValues[2])
    const expectedEquityValue = 0

    expect(waterfallValues[2]).to.be.closeTo(withInterest(initialDeposits[2], targetApys[2], YEAR), DELTA)
    expect(waterfallValues[1]).to.be.closeTo(expectedJuniorValue, DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
    expect(sum(...waterfallValues)).to.equal(expectedPortfolioValue)
  })

  it('portfolio lost value, equity and junior lost everything', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan, parseTokenUnits, initialDeposits, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)

    const defaultedLoanValue = parseTokenUnits(5e6)
    const loan = getLoan({ principal: defaultedLoanValue })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(YEAR)
    await structuredPortfolio.markLoanAsDefaulted(loanId)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedPortfolioValue = totalDeposit.sub(defaultedLoanValue)
    const expectedJuniorValue = 0
    const expectedEquityValue = 0

    expect(waterfallValues[2]).to.be.closeTo(initialDeposits[2], DELTA)
    expect(waterfallValues[1]).to.be.closeTo(expectedJuniorValue, DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
    expect(sum(...waterfallValues)).to.equal(expectedPortfolioValue)
  })

  it('portfolio lost everything', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)

    const loan = getLoan({ principal: totalDeposit })

    const loanId = await addAndFundLoan(loan)
    await timeTravel(YEAR)
    await structuredPortfolio.markLoanAsDefaulted(loanId)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedSeniorValue = 0
    const expectedJuniorValue = 0
    const expectedEquityValue = 0

    expect(waterfallValues[2]).to.be.closeTo(expectedSeniorValue, DELTA)
    expect(waterfallValues[1]).to.be.closeTo(expectedJuniorValue, DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
  })

  it('waterfall values change after 1 minute', async () => {
    const { structuredPortfolio, parseTokenUnits, mintToPortfolio } = await loadFixture(structuredPortfolioLiveFixture)

    const mintedTokens = parseTokenUnits(1e9)
    await mintToPortfolio(mintedTokens)

    const waterfallValuesBefore = await structuredPortfolio.calculateWaterfall()
    await timeTravel(MINUTE)
    const waterfallValuesAfter = await structuredPortfolio.calculateWaterfall()

    expect(waterfallValuesBefore[2]).to.lt(waterfallValuesAfter[2])
    expect(waterfallValuesBefore[1]).to.lt(waterfallValuesAfter[1])
    expect(waterfallValuesBefore[0]).to.gt(waterfallValuesAfter[0])
  })

  it('waterfall calculated after portfolio end date', async () => {
    const { structuredPortfolio, tranchesData, portfolioDuration, initialDeposits, withInterest, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)

    const targetApys = tranchesData.map(({ targetApy }) => targetApy)

    await timeTravel(portfolioDuration + YEAR)
    const waterfallValues = await structuredPortfolio.calculateWaterfall()

    const expectedSeniorValue = withInterest(initialDeposits[2], targetApys[2], portfolioDuration)
    expect(waterfallValues[2]).to.be.closeTo(expectedSeniorValue, DELTA)

    const expectedjuniorValue = withInterest(initialDeposits[1], targetApys[1], portfolioDuration)
    expect(waterfallValues[1]).to.be.closeTo(expectedjuniorValue, DELTA)

    const expectedEquityValue = totalDeposit.sub(waterfallValues[2]).sub(waterfallValues[1])
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)

    expect(sum(...waterfallValues)).to.equal(totalDeposit)
  })

  it('each tranche gains target value, 1 year passed, 2 tranches', async () => {
    const {
      mintToPortfolio,
      parseTokenUnits,
      tranchesData,
      initialDeposits,
      withInterest,
      tranchesInitData,
      depositToTranche,
      createPortfolioAndSetupControllers,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const { portfolio, tranches } = await createPortfolioAndSetupControllers({
      tranchesInitData: [tranchesInitData[0], tranchesInitData[1]],
    })

    for (let i = 0; i < tranches.length; i++) {
      await depositToTranche(tranches[i], initialDeposits[i])
    }

    await portfolio.start()

    const mintedTokens = parseTokenUnits(1e9)
    await mintToPortfolio(mintedTokens, portfolio)

    const targetApys = [tranchesData[0].targetApy, tranchesData[1].targetApy]

    await timeTravel(YEAR)
    const waterfallValues = await portfolio.calculateWaterfall()

    const expectedPortfolioValue = sum(initialDeposits[0], initialDeposits[1], mintedTokens)
    const expectedEquityValue = expectedPortfolioValue.sub(waterfallValues[1])
    expect(waterfallValues[1]).to.be.closeTo(withInterest(initialDeposits[1], targetApys[1], YEAR), DELTA)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
  })

  it('each tranche gains target value, 1 year passed, 1 tranche', async () => {
    const {
      mintToPortfolio,
      parseTokenUnits,
      initialDeposits,
      tranchesInitData,
      depositToTranche,
      createPortfolioAndSetupControllers,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const { portfolio, tranches } = await createPortfolioAndSetupControllers({
      tranchesInitData: [tranchesInitData[0]],
    })

    await depositToTranche(tranches[0], initialDeposits[0])

    await portfolio.start()

    const mintedTokens = parseTokenUnits(1e9)
    await mintToPortfolio(mintedTokens, portfolio)
    await timeTravel(YEAR)
    const waterfallValues = await portfolio.calculateWaterfall()

    const expectedEquityValue = sum(initialDeposits[0], mintedTokens)
    expect(waterfallValues[0]).to.be.closeTo(expectedEquityValue, DELTA)
    expect(waterfallValues).to.have.lengthOf(1)
  })

  describe('with fees', () => {
    const DELTA = 1e6

    it('portfolio didn\'t change value', async () => {
      const { structuredPortfolio, senior, junior, protocolConfig, withInterest } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 50
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      await structuredPortfolio.updateCheckpoints()

      await timeTravel(YEAR)

      const seniorValue = withInterest(senior.initialDeposit, senior.targetApy, YEAR)
      const juniorValue = withInterest(junior.initialDeposit, junior.targetApy, YEAR)

      const seniorValueWithFees = seniorValue.sub(seniorValue.mul(protocolFeeRate).div(ONE_IN_BPS))
      const juniorValueWithFees = juniorValue.sub(juniorValue.mul(protocolFeeRate).div(ONE_IN_BPS))
      const portfolioValue = await structuredPortfolio.totalAssets()
      const equityValueWithFees = portfolioValue.sub(seniorValueWithFees).sub(juniorValueWithFees)

      const waterfallValues = await structuredPortfolio.calculateWaterfall()
      expect(waterfallValues[2]).to.be.closeTo(seniorValueWithFees, DELTA)
      expect(waterfallValues[1]).to.be.closeTo(juniorValueWithFees, DELTA)
      expect(waterfallValues[0]).to.be.closeTo(equityValueWithFees, DELTA)
    })

    it('portfolio lost value, equity lost everything, junior still has funds', async () => {
      const { structuredPortfolio, addAndFundLoan, getLoan, parseTokenUnits, withInterest, senior, protocolConfig, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 50
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      await structuredPortfolio.updateCheckpoints()

      const defaultedLoanValue = parseTokenUnits(2e6)
      const loan = getLoan({ principal: defaultedLoanValue })
      const loanId = await addAndFundLoan(loan)

      await timeTravel(YEAR)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      const portfolioValue = totalDeposit.sub(defaultedLoanValue)
      const seniorValue = withInterest(senior.initialDeposit, senior.targetApy, YEAR)
      const seniorValueWithFees = seniorValue.sub(seniorValue.mul(protocolFeeRate).div(ONE_IN_BPS))

      const totalAssets = await structuredPortfolio.totalAssets()
      const juniorValueWithFees = totalAssets.sub(seniorValueWithFees)

      const equityValue = 0

      const waterfallValues = await structuredPortfolio.calculateWaterfall()

      expect(waterfallValues[2]).to.be.closeTo(seniorValueWithFees, DELTA)
      expect(waterfallValues[1]).to.be.closeTo(juniorValueWithFees, DELTA)
      expect(waterfallValues[0]).to.eq(equityValue)

      const totalFee = withInterest(totalDeposit, protocolFeeRate, YEAR).sub(totalDeposit)
      expect(sum(...waterfallValues)).to.be.closeTo(portfolioValue.sub(totalFee), DELTA)
    })

    it('portfolio lost value, equity and junior lost everything', async () => {
      const { structuredPortfolio, addAndFundLoan, getLoan, parseTokenUnits, withInterest, protocolConfig, totalDeposit, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 50
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      await structuredPortfolio.updateCheckpoints()

      const defaultedLoanValue = parseTokenUnits(5e6)
      const loan = getLoan({ principal: defaultedLoanValue })
      const loanId = await addAndFundLoan(loan)

      await timeTravel(YEAR)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      const seniorValue = totalDeposit.sub(defaultedLoanValue)
      const tranchesFees = initialDeposits.map(deposit => withInterest(deposit, protocolFeeRate, YEAR).sub(deposit))
      const totalFee = sum(...tranchesFees)
      const seniorValueWithFees = seniorValue.sub(totalFee)

      const waterfallValues = await structuredPortfolio.calculateWaterfall()

      expect(waterfallValues[2]).to.be.closeTo(seniorValueWithFees, DELTA)
      expect(waterfallValues[1]).to.eq(0)
      expect(waterfallValues[0]).to.eq(0)
    })

    it('portfolio lost everything', async () => {
      const { structuredPortfolio, addAndFundLoan, getLoan, protocolConfig, portfolioStartTimestamp, initialDeposits, withInterest, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 50
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      const updateTx = await structuredPortfolio.updateCheckpoints()

      const timePassed = await getTxTimestamp(updateTx) - portfolioStartTimestamp
      const tranchesFees = initialDeposits.map(deposit => withInterest(deposit, protocolFeeRate, timePassed).sub(deposit))
      const totalFee = sum(...tranchesFees)

      const defaultedLoanValue = totalDeposit.sub(totalFee)
      const loan = getLoan({ principal: defaultedLoanValue })
      const loanId = await addAndFundLoan(loan)

      await timeTravel(YEAR)
      await structuredPortfolio.markLoanAsDefaulted(loanId)

      const waterfallValues = await structuredPortfolio.calculateWaterfall()

      expect(waterfallValues[2]).to.eq(0)
      expect(waterfallValues[1]).to.eq(0)
      expect(waterfallValues[0]).to.eq(0)
    })

    it('with unpaid fees when tranche is called', async () => {
      const { structuredPortfolio, addAndFundLoan, getLoan, protocolConfig, depositToTranche, juniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 50
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      await structuredPortfolio.updateCheckpoints()
      const delta = parseUSDC(1)

      const maxLoanValue = (await structuredPortfolio.liquidAssets()).sub(parseUSDC(1))
      const loan = getLoan({ principal: maxLoanValue })
      await addAndFundLoan(loan)
      await timeTravel(YEAR)
      const waterfallBeforeFees = await structuredPortfolio.calculateWaterfall()
      for (let i = 0; i < 5; i++) {
        await depositToTranche(juniorTranche, 10)
      }
      const waterfallAfterFees = await structuredPortfolio.calculateWaterfall()
      expect(waterfallAfterFees[0]).to.be.closeTo(waterfallBeforeFees[0], delta)
      expect(waterfallAfterFees[1]).to.be.closeTo(waterfallBeforeFees[1], delta)
      expect(waterfallAfterFees[2]).to.be.closeTo(waterfallBeforeFees[2], delta)
    })

    it('with unpaid fees when updateCheckpoints is called', async () => {
      const { structuredPortfolio, addAndFundLoan, getLoan, protocolConfig } = await loadFixture(structuredPortfolioLiveFixture)
      const protocolFeeRate = 50
      await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
      await structuredPortfolio.updateCheckpoints()
      const delta = parseUSDC(1)

      const maxLoanValue = (await structuredPortfolio.totalAssets()).sub(parseUSDC(100))
      const loan = getLoan({ principal: maxLoanValue })
      await addAndFundLoan(loan)
      await timeTravel(YEAR)
      const waterfallBeforeFees = await structuredPortfolio.calculateWaterfall()
      for (let i = 0; i < 5; i++) {
        await structuredPortfolio.updateCheckpoints()
      }
      const waterfallAfterFees = await structuredPortfolio.calculateWaterfall()
      expect(waterfallAfterFees[0]).to.be.closeTo(waterfallBeforeFees[0], delta)
      expect(waterfallAfterFees[1]).to.be.closeTo(waterfallBeforeFees[1], delta)
      expect(waterfallAfterFees[2]).to.be.closeTo(waterfallBeforeFees[2], delta)
    })
  })
})
