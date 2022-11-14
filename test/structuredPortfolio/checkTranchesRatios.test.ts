import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { scaleToPercentage } from 'utils/scaleToPercentage'

describe('StructuredPortfolio.checkTranchesRatios', () => {
  const loadFixture = setupFixtureLoader()

  const minSubordinateRatio = 2000

  describe('tranche 1', () => {
    it('ratio smaller than min subordinate ratio', async () => {
      const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
      await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)

      const juniorDeposit = parseTokenUnits(1000)
      const expectedSubordinateValue = scaleToPercentage(juniorDeposit, minSubordinateRatio)
      const equityDeposit = expectedSubordinateValue.sub(1)

      await depositToTranche(equityTranche, equityDeposit)
      await depositToTranche(juniorTranche, juniorDeposit)

      await expect(structuredPortfolio.checkTranchesRatios()).to.be.revertedWith('SP: Tranche min ratio not met')
    })

    it('ratio equal to min subordinate ratio', async () => {
      const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
      await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)

      const equityDeposit = parseTokenUnits(1000)
      await depositToTranche(equityTranche, equityDeposit)

      const juniorDeposit = scaleToPercentage(equityDeposit, minSubordinateRatio)
      await depositToTranche(juniorTranche, juniorDeposit)

      expect(await structuredPortfolio.checkTranchesRatios()).not.to.be.reverted
    })
  })

  describe('tranche 2', () => {
    it('ratio smaller than min subordinate ratio', async () => {
      const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
      await structuredPortfolio.setTrancheMinSubordinateRatio(2, minSubordinateRatio)

      const seniorDeposit = parseTokenUnits(1000)
      const expectedSubordinateDeposit = scaleToPercentage(seniorDeposit, minSubordinateRatio)
      const subordinateDeposit = expectedSubordinateDeposit.sub(2)

      const equityDeposit = subordinateDeposit.div(2)
      await depositToTranche(equityTranche, equityDeposit)

      const juniorDeposit = subordinateDeposit.div(2)
      await depositToTranche(juniorTranche, juniorDeposit)

      await depositToTranche(seniorTranche, seniorDeposit)

      await expect(structuredPortfolio.checkTranchesRatios()).to.be.revertedWith('SP: Tranche min ratio not met')
    })

    it('ratio equal to min subordinate ratio', async () => {
      const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
      await structuredPortfolio.setTrancheMinSubordinateRatio(2, minSubordinateRatio)

      const equityDeposit = parseTokenUnits(1000)
      await depositToTranche(equityTranche, equityDeposit)

      const juniorDeposit = parseTokenUnits(1000)
      await depositToTranche(juniorTranche, juniorDeposit)

      const subordinateDeposit = juniorDeposit.add(equityDeposit)
      const seniorDeposit = scaleToPercentage(subordinateDeposit, minSubordinateRatio)
      await depositToTranche(seniorTranche, seniorDeposit)

      expect(await structuredPortfolio.checkTranchesRatios()).not.to.be.reverted
    })
  })
})
