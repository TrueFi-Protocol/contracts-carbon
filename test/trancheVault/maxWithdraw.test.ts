import { expect } from 'chai'
import {
  PortfolioStatus,
  structuredPortfolioFixture,
  structuredPortfolioLiveFixture,
} from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils/parseUSDC'

describe('TrancheVault.maxWithdraw', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when withdrawals are disabled on portfolio', async () => {
    const { equityTranche, wallet, depositToTranche, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, false)
    await depositToTranche(equityTranche, 1000)
    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(0)
  })

  it('returns deposited amount in capital formation if allowed', async () => {
    const { equityTranche, wallet, depositToTranche, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = 100

    await depositToTranche(equityTranche, depositAmount)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(depositAmount)
  })

  it('returns max available lender\'s assets for Closed portfolio', async () => {
    const { equityTranche, other, depositToTranche, parseTokenUnits, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)

    await depositToTranche(equityTranche, parseTokenUnits(2e5), other.address)
    await startAndClosePortfolio()

    const lenderShares = await equityTranche.balanceOf(other.address)
    const expectedAssets = await equityTranche.convertToAssets(lenderShares)
    expect(await equityTranche.maxWithdraw(other.address)).to.eq(expectedAssets)
  })

  it('returns max available lender\'s assets for Live portfolio', async () => {
    const { equityTranche, other, depositToTranche, parseTokenUnits, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)

    await depositToTranche(equityTranche, parseTokenUnits(2e5), other.address)
    await startPortfolioAndEnableLiveActions()

    const lenderShares = await equityTranche.balanceOf(other.address)
    const expectedAssets = await equityTranche.convertToAssets(lenderShares)
    expect(await equityTranche.maxWithdraw(other.address)).to.eq(expectedAssets)
  })

  it('returns 0 for totalAssets equal 0', async () => {
    const { seniorTranche, wallet, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    expect(await seniorTranche.maxWithdraw(wallet.address)).to.eq(0)
  })

  it('returns 0 for total assets below floor in CapitalFormation', async () => {
    const { equityTranche, depositToTranche, wallet, equityTrancheData: { withdrawController } } = await loadFixture(structuredPortfolioFixture)
    await withdrawController.setFloor(1000)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await depositToTranche(equityTranche, 999)
    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(0)
  })

  it('respects floor in capital formation', async () => {
    const { equityTranche, equityTrancheData, depositToTranche, wallet, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    const depositedAmount = 1000
    const floor = 500
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    await equityTrancheData.withdrawController.setFloor(floor)
    await depositToTranche(equityTranche, depositedAmount)

    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(depositedAmount - floor)
  })

  it('respects floor in live', async () => {
    const { equityTranche, equityTrancheData, depositToTranche, wallet, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const depositedAmount = 1000
    const floor = 500
    await startPortfolioAndEnableLiveActions()
    await equityTrancheData.withdrawController.setFloor(floor)
    await depositToTranche(equityTranche, depositedAmount)

    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(depositedAmount - floor)
  })

  it('no floor in closed', async () => {
    const { equityTranche, depositToTranche, wallet, startAndClosePortfolio, equityTrancheData } = await loadFixture(structuredPortfolioFixture)
    const depositedAmount = 1000
    await equityTrancheData.withdrawController.setFloor(500)
    await equityTrancheData.depositController.setCeiling(2 * depositedAmount)

    await depositToTranche(equityTranche, depositedAmount)

    await startAndClosePortfolio()

    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(depositedAmount)
  })

  it('is limited by virtual token balance if it is below totalAssets', async () => {
    const { structuredPortfolio, addAndFundLoan, getLoan, juniorTranche, seniorTranche, wallet } = await loadFixture(structuredPortfolioLiveFixture)

    const maxLoanValue = (await structuredPortfolio.totalAssets()).sub(parseUSDC(1))
    const loan = getLoan({ principal: maxLoanValue })
    await addAndFundLoan(loan)
    await structuredPortfolio.updateCheckpoints()
    expect(await juniorTranche.maxWithdraw(wallet.address)).to.equal(await structuredPortfolio.virtualTokenBalance())
    expect(await seniorTranche.maxWithdraw(wallet.address)).to.equal(await structuredPortfolio.virtualTokenBalance())
  })
})
