import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { timeTravel, timeTravelAndMine } from 'utils/timeTravel'

describe('TrancheVault.convertToShares', () => {
  const loadFixture = setupFixtureLoader()

  const DELTA = 1e5

  it('returns 1:1 for totalAssets equal 0', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioFixture)
    const assets = 1e6
    expect(await seniorTranche.convertToShares(assets)).to.eq(assets)
  })

  it('returns 0 for 0 assets', async () => {
    const { seniorTranche, token } = await loadFixture(structuredPortfolioFixture)
    await token.mint(seniorTranche.address, 1e6)
    expect(await seniorTranche.convertToShares(0)).to.eq(0)
  })

  it('capital formation, returns 1:1', async () => {
    const { tranches: [tranche], parseTokenUnits, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(tranche, 2e6)
    const assets = parseTokenUnits(1e6)
    expect(await tranche.convertToShares(assets)).to.eq(assets)
  })

  it('portfolio status Closed, returns correct value', async () => {
    const {
      structuredPortfolio,
      parseTokenUnits,
      seniorTranche,
      juniorTranche,
      depositToTranche,
      withInterest,
      tranchesData: [seniorData],
    } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)
    await depositToTranche(juniorTranche, depositAmount)

    await timeTravel(YEAR)
    await structuredPortfolio.close()

    const assets = parseTokenUnits(1e6)
    const expectedTrancheValue = withInterest(depositAmount, seniorData.targetApy, YEAR)
    const expectedAmount = assets.mul(depositAmount).div(expectedTrancheValue)
    expect(await seniorTranche.convertToShares(assets)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value increased, year passed', async () => {
    const {
      tranches,
      parseTokenUnits,
      calculateTargetTrancheValue,
      initialDeposits,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const seniorTrancheIdx = tranches.length - 1
    const seniorTranche = tranches[seniorTrancheIdx]
    const totalSupply = initialDeposits[seniorTrancheIdx]
    const targetTrancheValue = calculateTargetTrancheValue(seniorTrancheIdx)

    await timeTravelAndMine(YEAR)

    const assets = parseTokenUnits(1e6)
    const expectedAmount = assets.mul(totalSupply).div(targetTrancheValue)
    expect(await seniorTranche.convertToShares(assets)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value increased, 1/4 year passed', async () => {
    const {
      tranches,
      parseTokenUnits,
      calculateTargetTrancheValue,
      initialDeposits,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const seniorTrancheIdx = tranches.length - 1
    const seniorTranche = tranches[seniorTrancheIdx]
    const totalSupply = initialDeposits[seniorTrancheIdx]
    const yearDivider = 4
    const targetTrancheValue = calculateTargetTrancheValue(2, yearDivider)

    await timeTravelAndMine(YEAR / yearDivider)

    const assets = parseTokenUnits(1e6)
    const expectedAmount = assets.mul(totalSupply).div(targetTrancheValue)
    expect(await seniorTranche.convertToShares(assets)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value dropped, year passed', async () => {
    const {
      equityTranche,
      equity,
      parseTokenUnits,
      getLoan,
      addAndFundLoan,
      structuredPortfolio,
      withInterest,
      senior,
      junior,
      provider,
      portfolioStartTimestamp,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const totalAssets = await structuredPortfolio.totalAssets()

    const principal = parseTokenUnits(1e6)
    const loan = getLoan({ principal })
    const loanId = await addAndFundLoan(loan)

    await timeTravel(YEAR)
    await structuredPortfolio.markLoanAsDefaulted(loanId)

    const now = (await provider.getBlock('latest')).timestamp
    const timePassed = now - portfolioStartTimestamp
    const seniorTargetValue = withInterest(senior.initialDeposit, senior.targetApy, timePassed)
    const juniorTargetValue = withInterest(junior.initialDeposit, junior.targetApy, timePassed)
    const expectedTrancheValue = totalAssets.sub(principal).sub(seniorTargetValue).sub(juniorTargetValue)

    const assets = parseTokenUnits(1e6)
    const trancheTotalSupply = equity.initialDeposit
    const expectedAmount = assets.mul(trancheTotalSupply).div(expectedTrancheValue)

    expect(await equityTranche.convertToShares(assets)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('portfolio status Live, tranche value dropped, 1/4 year passed', async () => {
    const {
      tranches: [equityTranche],
      initialDeposits,
      parseTokenUnits,
      getLoan,
      addAndFundLoan,
      structuredPortfolio,
      provider,
      senior,
      junior,
      withInterest,
      portfolioStartTimestamp,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const [equityDeposit] = initialDeposits
    const totalAssets = await structuredPortfolio.totalAssets()

    const principal = parseTokenUnits(1e6)
    const loan = getLoan({ principal })
    const loanId = await addAndFundLoan(loan)

    const yearDivider = 4
    await timeTravel(YEAR / yearDivider)
    await structuredPortfolio.markLoanAsDefaulted(loanId)

    const now = (await provider.getBlock('latest')).timestamp
    const timePassed = now - portfolioStartTimestamp
    const seniorTargetValue = withInterest(senior.initialDeposit, senior.targetApy, timePassed)
    const juniorTargetValue = withInterest(junior.initialDeposit, junior.targetApy, timePassed)
    const expectedTrancheValue = totalAssets.sub(principal).sub(seniorTargetValue).sub(juniorTargetValue)

    const assets = parseTokenUnits(1e6)
    const trancheTotalSupply = equityDeposit
    const expectedAmount = assets.mul(trancheTotalSupply).div(expectedTrancheValue)

    expect(await equityTranche.convertToShares(assets)).to.be.closeTo(expectedAmount, DELTA)
  })
})
