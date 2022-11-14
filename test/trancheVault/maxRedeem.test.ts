import { expect } from 'chai'
import { PortfolioStatus, structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('TrancheVault.maxRedeem', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when withdrawals are disabled on portfolio', async () => {
    const { equityTranche, wallet, depositToTranche, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, false)
    await depositToTranche(equityTranche, 1000)
    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(0)
  })

  it('returns deposited amount in capital formation if allowed', async () => {
    const { equityTranche, wallet, depositToTranche, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = 100

    await depositToTranche(equityTranche, depositAmount)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(depositAmount)
  })

  it('is capped by controller max withdraw', async () => {
    const { equityTranche, wallet, parseTokenUnits, startAndClosePortfolio, depositToTranche, increaseAssetsInTranche } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(2e5)
    await depositToTranche(equityTranche, depositAmount)

    await startAndClosePortfolio()

    const extraAmount = parseTokenUnits(2e5)
    await increaseAssetsInTranche(equityTranche, extraAmount)

    const controllerMaxWithdraw = await equityTranche.maxWithdraw(wallet.address)

    const totalAmount = depositAmount.add(extraAmount)
    const controllerMaxWithdrawInShares = controllerMaxWithdraw.mul(depositAmount).div(totalAmount)

    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(controllerMaxWithdrawInShares)
  })

  it('returns max available lender\'s shares', async () => {
    const { equityTranche, wallet, other, depositToTranche, parseTokenUnits, startAndClosePortfolio, token } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(2e5)
    await depositToTranche(equityTranche, depositAmount, other.address)

    const extraAmount = parseTokenUnits(1e5)
    await token.transfer(equityTranche.address, extraAmount)

    await depositToTranche(equityTranche, depositAmount, wallet.address)

    await startAndClosePortfolio()

    expect(await equityTranche.maxRedeem(other.address)).to.eq(depositAmount)
  })

  it('returns 0 for totalAssets equal 0', async () => {
    const { seniorTranche, wallet, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    expect(await seniorTranche.maxRedeem(wallet.address)).to.eq(0)
  })

  it('returns 0 for total assets below floor in CapitalFormation', async () => {
    const { equityTranche, depositToTranche, wallet, equityTrancheData: { withdrawController } } = await loadFixture(structuredPortfolioFixture)
    await withdrawController.setFloor(1000)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await depositToTranche(equityTranche, 999)
    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(0)
  })

  it('respects floor in capital formation', async () => {
    const { equityTranche, equityTrancheData, depositToTranche, wallet, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    const depositedAmount = 1000
    const floor = 500
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)

    await equityTrancheData.withdrawController.setFloor(floor)
    await depositToTranche(equityTranche, depositedAmount)

    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(depositedAmount - floor)
  })

  it('respects floor in live', async () => {
    const { equityTranche, equityTrancheData, depositToTranche, wallet, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
    const depositedAmount = 1000
    const floor = 500
    await startPortfolioAndEnableLiveActions()
    await equityTrancheData.withdrawController.setFloor(floor)
    await depositToTranche(equityTranche, depositedAmount)

    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(depositedAmount - floor)
  })

  it('no floor in closed', async () => {
    const { equityTranche, depositToTranche, wallet, startAndClosePortfolio, equityTrancheData } = await loadFixture(structuredPortfolioFixture)
    const depositedAmount = 1000
    await equityTrancheData.withdrawController.setFloor(500)
    await equityTrancheData.depositController.setCeiling(2 * depositedAmount)

    await depositToTranche(equityTranche, depositedAmount)

    await startAndClosePortfolio()

    expect(await equityTranche.maxRedeem(wallet.address)).to.eq(depositedAmount)
  })
})
