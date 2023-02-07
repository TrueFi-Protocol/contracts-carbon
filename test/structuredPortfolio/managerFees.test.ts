import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { MONTH, ONE_IN_BPS, YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { setNextBlockTimestamp, timeTravel } from 'utils/timeTravel'
import { BigNumber } from 'ethers'

describe('StructuredPortfolio: manager fees', () => {
  const loadFixture = setupFixtureLoader()

  it('updates unpaid manager fees if insufficient liquidity', async () => {
    const {
      structuredPortfolio,
      seniorTranche,
      juniorTranche,
      equityTranche,
      depositToTranche,
      parseTokenUnits,
      startPortfolioAndEnableLiveActions,
      addAndFundLoan,
      getLoan,
      juniorTrancheData,
      seniorTrancheData,
      withInterest,
      token,
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 500
    await equityTranche.setManagerFeeRate(managerFee)
    await juniorTranche.setManagerFeeRate(managerFee)
    await seniorTranche.setManagerFeeRate(managerFee)

    await startPortfolioAndEnableLiveActions()
    const equityDeposit = parseTokenUnits(4000)
    const juniorDeposit = parseTokenUnits(2000)
    const seniorDeposit = parseTokenUnits(1000)

    await depositToTranche(equityTranche, equityDeposit)
    await depositToTranche(juniorTranche, juniorDeposit)
    await depositToTranche(seniorTranche, seniorDeposit)

    const portfolioBalance = await token.balanceOf(structuredPortfolio.address)
    await addAndFundLoan(getLoan({ principal: portfolioBalance.sub(1e4), periodPayment: parseTokenUnits(1) }))

    await timeTravel(YEAR)

    await structuredPortfolio.updateCheckpoints()

    const juniorValue = withInterest(juniorDeposit, juniorTrancheData.targetApy, YEAR)
    const expectedJuniorFee = juniorValue.mul(managerFee).div(ONE_IN_BPS)

    const seniorValue = withInterest(seniorDeposit, seniorTrancheData.targetApy, YEAR)
    const expectedSeniorFee = seniorValue.mul(managerFee).div(ONE_IN_BPS)

    const portfolioFees = await structuredPortfolio.totalPendingFees()
    const expectedEquityFee = portfolioFees.sub(expectedSeniorFee).sub(expectedJuniorFee)

    const delta = parseTokenUnits(0.01)
    expect(await equityTranche.unpaidManagerFee()).to.be.closeTo(expectedEquityFee, delta)
    expect(await juniorTranche.unpaidManagerFee()).to.be.closeTo(expectedJuniorFee, delta)
    expect(await seniorTranche.unpaidManagerFee()).to.be.closeTo(expectedSeniorFee, delta)
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
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 500
    await seniorTranche.setManagerFeeRate(managerFee)

    await startPortfolioAndEnableLiveActions()

    await depositToTranche(seniorTranche, parseTokenUnits(1000))
    await timeTravel(YEAR)

    const portfolioBalanceBefore = await token.balanceOf(structuredPortfolio.address)
    const managerBalanceBefore = await token.balanceOf(wallet.address)

    await depositToTranche(seniorTranche, 1)

    const delta = parseTokenUnits(0.0001)
    const expectedFeeAmount = parseTokenUnits(50)
    expect(await token.balanceOf(structuredPortfolio.address)).to.be.closeTo(portfolioBalanceBefore.sub(expectedFeeAmount), delta)
    expect(await token.balanceOf(wallet.address)).to.be.closeTo(managerBalanceBefore.add(expectedFeeAmount), delta)
  })

  it('emits ManagerFeePaid event', async () => {
    const {
      seniorTranche,
      depositToTranche,
      parseTokenUnits,
      startPortfolioAndEnableLiveActions,
      wallet,
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 500
    await seniorTranche.setManagerFeeRate(managerFee)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1e6)
    const firstDepositTx = await depositToTranche(seniorTranche, amount)
    await timeTravel(YEAR)

    const lastDepositTx = await depositToTranche(seniorTranche, 1)

    const timePassed = await getTxTimestamp(lastDepositTx) - await getTxTimestamp(firstDepositTx)
    const expectedFee = amount.mul(timePassed).mul(managerFee).div(YEAR).div(ONE_IN_BPS)
    await expect(lastDepositTx).to.emit(seniorTranche, 'ManagerFeePaid').withArgs(wallet.address, expectedFee)
  })

  it('almost no fee is applied for withdrawal right after deposit', async () => {
    const {
      seniorTranche,
      depositToTranche,
      redeemFromTranche,
      parseTokenUnits,
      wallet,
      token,
      startPortfolioAndEnableLiveActions,
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 500
    await seniorTranche.setManagerFeeRate(managerFee)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1e6)

    await depositToTranche(seniorTranche, amount)
    const balanceBefore = await token.balanceOf(wallet.address)
    await redeemFromTranche(seniorTranche, await seniorTranche.balanceOf(wallet.address))

    const delta = parseTokenUnits(0.01)
    expect(await token.balanceOf(wallet.address)).to.be.closeTo(balanceBefore.add(amount), delta)
  })

  it('fees do not have impact on given withdraw amount', async () => {
    const {
      seniorTranche,
      depositToTranche,
      withdrawFromTranche,
      parseTokenUnits,
      wallet,
      other,
      token,
      startPortfolioAndEnableLiveActions,
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 500
    await seniorTranche.setManagerFeeRate(managerFee)

    await startPortfolioAndEnableLiveActions()
    const amount = parseTokenUnits(1000000)
    await depositToTranche(seniorTranche, amount)

    await timeTravel(YEAR)

    const withdrawAmount = parseTokenUnits(500000)
    await expect(() => withdrawFromTranche(seniorTranche, withdrawAmount, wallet.address, other.address)).to.changeTokenBalance(token, other.address, withdrawAmount)
  })

  it('fees do not have impact on requested shares amount in mint', async () => {
    const {
      seniorTranche,
      mintToTranche,
      depositToTranche,
      parseTokenUnits,
      wallet,
      startPortfolioAndEnableLiveActions,
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 500
    await seniorTranche.setManagerFeeRate(managerFee)

    await startPortfolioAndEnableLiveActions()
    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await timeTravel(YEAR)

    const amount = parseTokenUnits(1e6)
    await expect(() => mintToTranche(seniorTranche, amount)).to.changeTokenBalance(seniorTranche, wallet.address, amount)
  })

  it('correctly calculates totalAssets when there are unpaid fees', async () => {
    const {
      structuredPortfolio,
      seniorTranche,
      depositToTranche,
      parseTokenUnits,
      token,
      startPortfolioAndEnableLiveActions,
      addAndFundLoan,
      getLoan,
    } = await loadFixture(structuredPortfolioFixture)
    const managerFee = 100
    await seniorTranche.setManagerFeeRate(managerFee)

    const seniorDeposit = parseTokenUnits(1e6)
    await depositToTranche(seniorTranche, seniorDeposit)
    await startPortfolioAndEnableLiveActions()

    const portfolioBalance = await token.balanceOf(structuredPortfolio.address)
    await addAndFundLoan(getLoan({ principal: portfolioBalance.sub(1e4), periodPayment: BigNumber.from(1) }))

    await timeTravel(YEAR)

    await structuredPortfolio.updateCheckpoints()

    expect(await seniorTranche.unpaidManagerFee()).to.be.gt(0)

    const seniorFees = seniorDeposit.mul(managerFee).div(ONE_IN_BPS)
    const expectedSeniorValue = seniorDeposit.sub(seniorFees)

    expect(await structuredPortfolio.totalAssets()).to.be.closeTo(expectedSeniorValue, parseTokenUnits(0.01))
  })

  it('not collected in capital formation', async () => {
    const { seniorTranche, depositToTranche, parseTokenUnits, token, another } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.setManagerFeeRate(500)
    await seniorTranche.setManagerFeeBeneficiary(another.address)

    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await timeTravel(MONTH)
    await depositToTranche(seniorTranche, 1)

    expect(await token.balanceOf(another.address)).to.eq(0)
  })

  it('not collected in Closed status', async () => {
    const { seniorTranche, depositToTranche, withdrawFromTranche, parseTokenUnits, token, startAndClosePortfolio, another } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.setManagerFeeRate(500)
    await seniorTranche.setManagerFeeBeneficiary(another.address)

    await depositToTranche(seniorTranche, parseTokenUnits(1e6))
    await startAndClosePortfolio()

    const balanceAfterClose = await token.balanceOf(another.address)
    await timeTravel(MONTH)
    await withdrawFromTranche(seniorTranche, 1)

    expect(await token.balanceOf(another.address)).to.eq(balanceAfterClose)
  })

  it('caps pending fees to tranche assets', async () => {
    const { juniorTranche, structuredPortfolio, portfolioStartTimestamp, senior, junior, totalDeposit, parseTokenUnits } = await loadFixture(structuredPortfolioLiveFixture)
    const managerFee = 12000
    await juniorTranche.setManagerFeeRate(managerFee)

    await setNextBlockTimestamp(portfolioStartTimestamp + YEAR)
    await structuredPortfolio.updateCheckpoints()

    const waterfall = await structuredPortfolio.calculateWaterfall()

    const expectedSenior = senior.calculateTargetValue()
    const expectedJunior = junior.calculateTargetValue()
    const expectedEquity = totalDeposit.sub(expectedSenior).sub(expectedJunior)

    const delta = parseTokenUnits(0.01)
    expect(waterfall[0]).to.be.closeTo(expectedEquity, delta)
    expect(waterfall[1]).to.eq(0)
    expect(waterfall[2]).to.be.closeTo(expectedSenior, delta)
  })

  it('caps pending fees to tranche assets for multiple fee types', async () => {
    const { juniorTranche, structuredPortfolio, portfolioStartTimestamp, senior, junior, totalDeposit, parseTokenUnits, protocolConfig } = await loadFixture(structuredPortfolioLiveFixture)
    const managerFee = 6000
    await juniorTranche.setManagerFeeRate(managerFee)
    const protocolFee = 6000
    await protocolConfig.setCustomProtocolFeeRate(juniorTranche.address, protocolFee)
    await structuredPortfolio.updateCheckpoints()

    await setNextBlockTimestamp(portfolioStartTimestamp + YEAR)
    await structuredPortfolio.updateCheckpoints()

    const waterfall = await structuredPortfolio.calculateWaterfall()

    const expectedSenior = senior.calculateTargetValue()
    const expectedJunior = junior.calculateTargetValue()
    const expectedEquity = totalDeposit.sub(expectedSenior).sub(expectedJunior)

    const delta = parseTokenUnits(0.01)
    expect(waterfall[0]).to.be.closeTo(expectedEquity, delta)
    expect(waterfall[1]).to.eq(0)
    expect(waterfall[2]).to.be.closeTo(expectedSenior, delta)
  })
})
