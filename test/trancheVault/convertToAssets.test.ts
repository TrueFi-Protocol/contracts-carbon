import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.convertToAssets', () => {
  const loadFixture = setupFixtureLoader()

  const DELTA = 1e5

  it('returns 0 for no shares', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    expect(await equityTranche.convertToAssets(0)).to.eq(0)
  })

  it('capital formation, returns 1:1', async () => {
    const { equityTranche, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)
    const shares = parseTokenUnits(1e9)
    expect(await equityTranche.convertToAssets(shares)).to.eq(shares)
  })

  it('portfolio status Closed, returns correct value', async () => {
    const { seniorTranche, juniorTranche, tranchesData: [seniorData], parseTokenUnits, structuredPortfolio, withInterest, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)
    await depositToTranche(juniorTranche, depositAmount)

    await timeTravel(YEAR)
    await structuredPortfolio.close()

    const shares = parseTokenUnits(1e6)
    const expectedTrancheValue = withInterest(depositAmount, seniorData.targetApy, YEAR)
    const expectedAmount = shares.mul(expectedTrancheValue).div(depositAmount)
    expect(await seniorTranche.convertToAssets(shares)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Closed, returns 1:1 for no totalSupply', async () => {
    const { seniorTranche, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)
    await startAndClosePortfolio()
    const shares = 1e9
    expect(await seniorTranche.convertToAssets(shares)).to.eq(shares)
  })

  it('portfolio status Live, returns 1:1 for no totalSupply', async () => {
    const { seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.start()
    const shares = 1e9
    expect(await seniorTranche.convertToAssets(shares)).to.eq(shares)
  })

  it('portfolio status Live, tranche value increased, year passed', async () => {
    const { seniorTranche, senior, parseTokenUnits } = await loadFixture(structuredPortfolioLiveFixture)
    const totalSupply = senior.initialDeposit
    const targetTrancheValue = senior.calculateTargetValue()

    await timeTravel(YEAR)

    const shares = parseTokenUnits(1e6)
    const expectedAmount = shares.mul(targetTrancheValue).div(totalSupply)
    expect(await seniorTranche.convertToAssets(shares)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value increased, 1/4 year passed', async () => {
    const { seniorTranche, senior, parseTokenUnits } = await loadFixture(structuredPortfolioLiveFixture)
    const totalSupply = senior.initialDeposit
    const yearDivider = 4
    const targetTrancheValue = senior.calculateTargetValue(yearDivider)

    await timeTravel(YEAR / yearDivider)

    const shares = parseTokenUnits(1e6)
    const expectedAmount = shares.mul(targetTrancheValue).div(totalSupply)
    expect(await seniorTranche.convertToAssets(shares)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value dropped, year passed', async () => {
    const { equityTranche, senior, junior, equity, parseTokenUnits, getLoan, addAndFundLoan, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    const totalAssets = await structuredPortfolio.totalAssets()

    const principal = parseTokenUnits(1e6)
    const loan = getLoan({ principal })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(YEAR)
    await structuredPortfolio.markLoanAsDefaulted(loanId)

    const seniorTargetValue = senior.calculateTargetValue()
    const juniorTargetValue = junior.calculateTargetValue()
    const expectedTrancheValue = totalAssets.sub(principal).sub(seniorTargetValue).sub(juniorTargetValue)

    const shares = parseTokenUnits(1e6)
    const trancheTotalSupply = equity.initialDeposit
    const expectedAmount = shares.mul(expectedTrancheValue).div(trancheTotalSupply)
    expect(await equityTranche.convertToAssets(shares)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value dropped, 1/4 year passed', async () => {
    const { equityTranche, senior, junior, equity, parseTokenUnits, getLoan, addAndFundLoan, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    const totalAssets = await structuredPortfolio.totalAssets()

    const principal = parseTokenUnits(1e6)
    const loan = getLoan({ principal })
    const loanId = await addAndFundLoan(loan)

    const yearDivider = 4
    await timeTravel(YEAR / yearDivider)
    await structuredPortfolio.markLoanAsDefaulted(loanId)

    const seniorTargetValue = senior.calculateTargetValue(yearDivider)
    const juniorTargetValue = junior.calculateTargetValue(yearDivider)
    const expectedTrancheValue = totalAssets.sub(principal).sub(seniorTargetValue).sub(juniorTargetValue)

    const shares = parseTokenUnits(1e6)
    const trancheTotalSupply = equity.initialDeposit
    const expectedAmount = shares.mul(expectedTrancheValue).div(trancheTotalSupply)
    expect(await equityTranche.convertToAssets(shares)).to.be.closeTo(expectedAmount, DELTA)
  })
})
