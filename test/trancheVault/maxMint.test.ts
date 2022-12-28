import { ILenderVerifier__factory } from 'build/types/factories/ILenderVerifier__factory'
import { expect } from 'chai'
import { deployMockContract } from 'ethereum-waffle'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('TrancheVault.maxMint', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 in Closed status', async () => {
    const { equityTranche, wallet, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)
    await startAndClosePortfolio()
    expect(await equityTranche.maxMint(wallet.address)).to.eq(0)
  })

  it('returns (ceiling - totalAssets) in shares', async () => {
    const { equityTranche, wallet, depositToTranche, parseTokenUnits, startPortfolioAndEnableLiveActions, equityTrancheData, mintToPortfolio } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = parseTokenUnits(100)
    await depositToTranche(equityTranche, depositAmount)

    await startPortfolioAndEnableLiveActions()

    const extraAmount = parseTokenUnits(10)
    await mintToPortfolio(extraAmount)

    const ceiling = await equityTrancheData.depositController.ceiling()
    const totalAmount = depositAmount.add(extraAmount)

    const maxDepositAmount = ceiling.sub(totalAmount)
    const expectedMaxMintAmount = maxDepositAmount.mul(depositAmount).div(totalAmount)
    expect(await equityTranche.maxMint(wallet.address)).to.eq(expectedMaxMintAmount)
  })

  it('returns 0 for ceiling smaller than totalAssets', async () => {
    const { equityTranche, wallet, equityTrancheData, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const ceiling = await equityTrancheData.depositController.ceiling()
    await depositToTranche(equityTranche, ceiling)
    await equityTrancheData.depositController.setCeiling(ceiling.sub(1))
    expect(await equityTranche.maxMint(wallet.address)).to.eq(0)
  })

  it('returns 0 when lender not allowed by lender verifier', async () => {
    const { equityTranche, wallet, equityTrancheData: { depositController } } = await loadFixture(structuredPortfolioFixture)
    const mockLenderVerifier = await deployMockContract(wallet, ILenderVerifier__factory.abi)
    await mockLenderVerifier.mock.isAllowed.returns(false)
    await depositController.setLenderVerifier(mockLenderVerifier.address)
    expect(await equityTranche.maxMint(wallet.address)).to.eq(0)
  })
})
