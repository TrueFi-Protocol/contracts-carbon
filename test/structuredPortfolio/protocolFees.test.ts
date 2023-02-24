import { expect } from 'chai'
import { getStructuredPortfolioFixture, structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, MONTH, ONE_IN_BPS, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel, timeTravelAndMine } from 'utils/timeTravel'
import { BigNumber } from 'ethers'

describe('StructuredPortfolio: protocol fees', () => {
  const loadFixture = setupFixtureLoader()

  it('uses protocol fee rate from checkpoint', async () => {
    const { protocolConfig, seniorTranche, depositToTranche, parseTokenUnits, token, protocolConfigParams, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const { protocolTreasury } = protocolConfigParams
    const initialProtocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(initialProtocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, amount)

    await timeTravel(YEAR)

    await protocolConfig.setDefaultProtocolFeeRate(10_000)
    await depositToTranche(seniorTranche, 1)

    const delta = parseTokenUnits(0.00001)
    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(amount.mul(initialProtocolFeeRate).div(ONE_IN_BPS), delta)
  })

  it('updates unpaid protocol fees if insufficient liquidity', async () => {
    const { structuredPortfolio, protocolConfig, seniorTranche, juniorTranche, equityTranche, depositToTranche, parseTokenUnits, startPortfolioAndEnableLiveActions, addAndFundLoan, getLoan, withInterest, seniorTrancheData, juniorTrancheData } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()

    const equityDeposit = parseTokenUnits(4000)
    const juniorDeposit = parseTokenUnits(2000)
    const seniorDeposit = parseTokenUnits(1000)

    await depositToTranche(equityTranche, equityDeposit)
    await depositToTranche(juniorTranche, juniorDeposit)
    await depositToTranche(seniorTranche, seniorDeposit)
    await addAndFundLoan(getLoan({ principal: parseTokenUnits(6999), periodPayment: parseTokenUnits(1) }))
    await timeTravel(YEAR)

    await structuredPortfolio.updateCheckpoints()

    const juniorValue = withInterest(juniorDeposit, juniorTrancheData.targetApy, YEAR)
    const expectedJuniorFee = juniorValue.mul(protocolFeeRate).div(ONE_IN_BPS)

    const seniorValue = withInterest(seniorDeposit, seniorTrancheData.targetApy, YEAR)
    const expectedSeniorFee = seniorValue.mul(protocolFeeRate).div(ONE_IN_BPS)

    const portfolioFees = await structuredPortfolio.totalPendingFees()
    const expectedEquityFee = portfolioFees.sub(expectedSeniorFee).sub(expectedJuniorFee)

    const delta = parseTokenUnits(0.0001)
    expect(await equityTranche.unpaidProtocolFee()).to.be.closeTo(expectedEquityFee, parseTokenUnits(1))
    expect(await juniorTranche.unpaidProtocolFee()).to.be.closeTo(expectedJuniorFee, delta)
    expect(await seniorTranche.unpaidProtocolFee()).to.be.closeTo(expectedSeniorFee, delta)
  })

  it('transfers protocol fee to protocol if sufficient liquidity', async () => {
    const { structuredPortfolio, protocolConfig, seniorTranche, depositToTranche, parseTokenUnits, protocolConfigParams, token, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const { protocolTreasury } = protocolConfigParams
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    await depositToTranche(seniorTranche, parseTokenUnits(1000))
    await timeTravel(YEAR)

    const portfolioBalanceBefore = await token.balanceOf(structuredPortfolio.address)
    const protocolBalanceBefore = await token.balanceOf(protocolTreasury)

    await depositToTranche(seniorTranche, 1)

    const delta = parseTokenUnits(0.0001)
    const expectedFeeAmount = parseTokenUnits(50)
    expect(await token.balanceOf(structuredPortfolio.address)).to.be.closeTo(portfolioBalanceBefore.sub(expectedFeeAmount), delta)
    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(protocolBalanceBefore.add(expectedFeeAmount), delta)
  })

  it('emits ProtocolFeePaid event', async () => {
    const { protocolConfig, protocolConfigParams, seniorTranche, depositToTranche, parseTokenUnits, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1000000)
    const firstDepositTx = await depositToTranche(seniorTranche, amount)
    await timeTravel(YEAR)

    const lastDepositTx = await depositToTranche(seniorTranche, 1)

    const timePassed = await getTxTimestamp(lastDepositTx) - await getTxTimestamp(firstDepositTx)
    const expectedFee = amount.mul(timePassed).mul(protocolFeeRate).div(YEAR).div(ONE_IN_BPS)
    await expect(lastDepositTx).to.emit(seniorTranche, 'ProtocolFeePaid').withArgs(protocolConfigParams.protocolTreasury, expectedFee)
  })

  it('almost no fee is applied for withdrawal right after deposit', async () => {
    const { protocolConfig, seniorTranche, depositToTranche, redeemFromTranche, parseTokenUnits, wallet, token, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1e6)

    await depositToTranche(seniorTranche, amount)
    const balanceBefore = await token.balanceOf(wallet.address)
    await redeemFromTranche(seniorTranche, await seniorTranche.balanceOf(wallet.address))

    const delta = parseTokenUnits(0.01)
    expect(await token.balanceOf(wallet.address)).to.be.closeTo(balanceBefore.add(amount), delta)
  })

  it('fees do not have impact on given withdraw amount', async () => {
    const { protocolConfig, seniorTranche, depositToTranche, withdrawFromTranche, parseTokenUnits, wallet, token, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 100
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1000000)
    await depositToTranche(seniorTranche, amount)

    await timeTravel(YEAR)

    const withdrawAmount = parseTokenUnits(500000)
    await expect(() => withdrawFromTranche(seniorTranche, withdrawAmount)).to.changeTokenBalance(token, wallet.address, withdrawAmount)
  })

  it('fees do not have impact on requested shares amount in mint', async () => {
    const { protocolConfig, seniorTranche, mintToTranche, depositToTranche, parseTokenUnits, wallet, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 100
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()
    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await timeTravel(YEAR)

    const amount = parseTokenUnits(1e6)
    await expect(() => mintToTranche(seniorTranche, amount)).to.changeTokenBalance(seniorTranche, wallet.address, amount)
  })

  it('correctly calculates totalAssets when there are unpaid fees', async () => {
    const { structuredPortfolio, protocolConfig, seniorTranche, depositToTranche, parseTokenUnits, startPortfolioAndEnableLiveActions, addAndFundLoan, getLoan } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 100
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    const depositAmount = parseTokenUnits(1e6)
    await depositToTranche(seniorTranche, depositAmount)
    await startPortfolioAndEnableLiveActions()

    await timeTravelAndMine(YEAR)
    const totalAssets = await structuredPortfolio.totalAssets()
    const amountToBurn = (totalAssets).sub(1e3)
    await addAndFundLoan(getLoan({ principal: amountToBurn, periodPayment: BigNumber.from(1) }))

    await structuredPortfolio.updateCheckpoints()

    expect(await seniorTranche.unpaidProtocolFee()).to.be.gt(0)

    expect(await structuredPortfolio.totalAssets()).to.be.closeTo(totalAssets, parseTokenUnits(0.01))
  })

  it('not collected in capital formation', async () => {
    const { seniorTranche, depositToTranche, protocolConfig, parseTokenUnits, token, protocolConfigParams: { protocolTreasury } } = await loadFixture(structuredPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)

    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await timeTravel(MONTH)
    await depositToTranche(seniorTranche, 1)

    expect(await token.balanceOf(protocolTreasury)).to.eq(0)
  })

  it('collected in Closed status after transition from Live', async () => {
    const { seniorTranche, depositToTranche, withdrawFromTranche, protocolConfig, parseTokenUnits, token, protocolConfigParams: { protocolTreasury }, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)

    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await startAndClosePortfolio()

    const balanceAfterClose = await token.balanceOf(protocolTreasury)
    await timeTravel(MONTH)
    await withdrawFromTranche(seniorTranche, 1)

    expect(await token.balanceOf(protocolTreasury)).to.be.gt(balanceAfterClose)
  })

  it('protocol fees paid when updating checkpoint from portfolio in Closed', async () => {
    const { seniorTranche, protocolConfig, depositToTranche, parseTokenUnits, addAndFundLoan, getLoan, structuredPortfolio, portfolioDuration, token, protocolConfigParams: { protocolTreasury } } = await loadFixture(structuredPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)

    await depositToTranche(seniorTranche, parseTokenUnits(1e6))

    await structuredPortfolio.start()
    const loanId = await addAndFundLoan(getLoan({ periodCount: 1, periodDuration: portfolioDuration + DAY }))

    await timeTravel(portfolioDuration)
    await structuredPortfolio.close()

    await timeTravel(MONTH)

    const protocolBalanceBeforeDefault = await token.balanceOf(protocolTreasury)
    await expect(structuredPortfolio.markLoanAsDefaulted(loanId)).to.emit(seniorTranche, 'ProtocolFeePaid')
    const protocolBalanceAfterDefault = await token.balanceOf(protocolTreasury)

    expect(protocolBalanceAfterDefault.gt(protocolBalanceBeforeDefault)).to.be.true
  })

  it('collected in Closed status after transition from CapitalFormation', async () => {
    const { seniorTranche, depositToTranche, protocolConfig, parseTokenUnits, token, protocolConfigParams: { protocolTreasury }, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)

    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await structuredPortfolio.close()

    const balanceAfterClose = await token.balanceOf(protocolTreasury)
    await timeTravel(MONTH)
    await seniorTranche.updateCheckpoint()

    expect(await token.balanceOf(protocolTreasury)).to.be.gt(balanceAfterClose)
  })

  it('not accrue fees on unpaid fees', async () => {
    const { structuredPortfolio, protocolConfig, parseTokenUnits, depositToTranche, getLoan, seniorTranche, equityTranche, juniorTranche, addAndFundLoan } = await loadFixture(getStructuredPortfolioFixture({ tokenDecimals: 18, targetApys: [0, 0, 0] }))
    const protocolFeeRate = 5_000
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate) // 50%

    const seniorDeposit = parseTokenUnits(0.001)
    const juniorDeposit = parseTokenUnits(1000)
    const equityDeposit = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, seniorDeposit)
    await depositToTranche(juniorTranche, juniorDeposit)
    await depositToTranche(equityTranche, equityDeposit)

    await structuredPortfolio.start()

    const loan = getLoan({
      principal: parseTokenUnits(2000),
      periodCount: 1,
      periodPayment: BigNumber.from(1),
      periodDuration: 12 * YEAR,
      gracePeriod: 0,
    })
    await addAndFundLoan(loan)

    const expectedFeesAfterEachYear = [
      [0, 0, 0],
      [500, 500, 0.0005],
      [750, 750, 0.00075],
      [875, 875, 0.000875],
      [937.5, 937.5, 0.0009375],
      [968.75, 968.75, 0.00096875],
    ]

    const delta = parseTokenUnits(0.01)

    for (let year = 0; year < expectedFeesAfterEachYear.length; year++) {
      await structuredPortfolio.updateCheckpoints()
      expect(await seniorTranche.unpaidProtocolFee()).to.be.closeTo(parseTokenUnits(expectedFeesAfterEachYear[year][2]), delta)
      expect(await juniorTranche.unpaidProtocolFee()).to.be.closeTo(parseTokenUnits(expectedFeesAfterEachYear[year][1]), delta)
      expect(await equityTranche.unpaidProtocolFee()).to.be.closeTo(parseTokenUnits(expectedFeesAfterEachYear[year][0]), delta)

      await timeTravel(YEAR)
    }
  })

  describe('manager + protocol fee', () => {
    it('updates both unpaid fees if insufficient liquidity', async () => {
      const {
        structuredPortfolio,
        seniorTranche,
        juniorTranche,
        equityTranche,
        depositToTranche,
        parseTokenUnits,
        startPortfolioAndEnableLiveActions,
        protocolConfig,
        addAndFundLoan,
        getLoan,
        withInterest,
        juniorTrancheData,
        seniorTrancheData,
        token,
      } = await loadFixture(structuredPortfolioFixture)
      const feeRate = 500
      await seniorTranche.setManagerFeeRate(feeRate)
      await juniorTranche.setManagerFeeRate(feeRate)
      await equityTranche.setManagerFeeRate(feeRate)
      await protocolConfig.setDefaultProtocolFeeRate(feeRate)

      await startPortfolioAndEnableLiveActions()
      const equityDeposit = parseTokenUnits(4000)
      const juniorDeposit = parseTokenUnits(2000)
      const seniorDeposit = parseTokenUnits(1000)

      await depositToTranche(equityTranche, equityDeposit)
      await depositToTranche(juniorTranche, juniorDeposit)
      await depositToTranche(seniorTranche, seniorDeposit)
      const portfolioBalance = await token.balanceOf(structuredPortfolio.address)

      await addAndFundLoan(getLoan({ principal: portfolioBalance.sub(1e4), periodPayment: BigNumber.from(1) }))

      await timeTravel(YEAR)

      await structuredPortfolio.updateCheckpoints()

      const delta = parseTokenUnits(0.01)

      const juniorWithInterest = withInterest(juniorDeposit, juniorTrancheData.targetApy, YEAR)
      const expectedJuniorFee = juniorWithInterest.mul(feeRate).div(ONE_IN_BPS)
      expect(await juniorTranche.unpaidProtocolFee()).to.be.closeTo(expectedJuniorFee, delta)
      expect(await juniorTranche.unpaidManagerFee()).to.be.closeTo(expectedJuniorFee, delta)

      const seniorWithInterest = withInterest(seniorDeposit, seniorTrancheData.targetApy, YEAR)
      const expectedSeniorFee = seniorWithInterest.mul(feeRate).div(ONE_IN_BPS)
      expect(await seniorTranche.unpaidProtocolFee()).to.be.closeTo(expectedSeniorFee, delta)
      expect(await seniorTranche.unpaidManagerFee()).to.be.closeTo(expectedSeniorFee, delta)

      const portfolioFees = await structuredPortfolio.totalPendingFees()
      const expectedEquityFee = portfolioFees.sub(expectedSeniorFee.mul(2)).sub(expectedJuniorFee.mul(2)).div(2)
      expect(await equityTranche.unpaidProtocolFee()).to.be.closeTo(expectedEquityFee, delta)
      expect(await equityTranche.unpaidManagerFee()).to.be.closeTo(expectedEquityFee, delta)
    })

    it('transfers manager fee to manager if sufficient liquidity', async () => {
      const {
        structuredPortfolio,
        seniorTranche,
        depositToTranche,
        parseTokenUnits,
        token,
        startPortfolioAndEnableLiveActions,
        wallet,
        protocolConfig,
        protocolConfigParams,
      } = await loadFixture(structuredPortfolioFixture)
      const feeRate = 500
      await seniorTranche.setManagerFeeRate(feeRate)
      await protocolConfig.setDefaultProtocolFeeRate(feeRate)
      const { protocolTreasury } = protocolConfigParams

      await startPortfolioAndEnableLiveActions()
      await depositToTranche(seniorTranche, parseTokenUnits(1000))
      await timeTravel(YEAR)

      const portfolioBalanceBefore = await token.balanceOf(structuredPortfolio.address)
      const managerBalanceBefore = await token.balanceOf(wallet.address)
      const protocolBalanceBefore = await token.balanceOf(protocolTreasury)

      await structuredPortfolio.updateCheckpoints()
      await depositToTranche(seniorTranche, 1)

      const delta = parseTokenUnits(0.0001)
      const expectedFeeAmount = parseTokenUnits(50)
      expect(await token.balanceOf(structuredPortfolio.address)).to.be.closeTo(portfolioBalanceBefore.sub(expectedFeeAmount.mul(2)), delta)
      expect(await token.balanceOf(wallet.address)).to.be.closeTo(managerBalanceBefore.add(expectedFeeAmount), delta)
      expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(protocolBalanceBefore.add(expectedFeeAmount), delta)
    })
  })
})
