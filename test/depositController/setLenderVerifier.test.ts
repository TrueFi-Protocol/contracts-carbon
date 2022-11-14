import { expect } from 'chai'
import { Wallet } from 'ethers'
import { depositControllerFixture } from 'fixtures/depositControllerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('DepositController.setLenderVerifier', () => {
  const loadFixture = setupFixtureLoader()

  const lenderVerifierAddress = Wallet.createRandom().address

  it('only manager', async () => {
    const { depositController, other } = await loadFixture(depositControllerFixture)
    await expect(depositController.connect(other).setLenderVerifier(lenderVerifierAddress)).to.be.revertedWith('DC: Only manager')
  })

  it('sets new lender verifier', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    await depositController.setLenderVerifier(lenderVerifierAddress)
    expect(await depositController.lenderVerifier()).to.eq(lenderVerifierAddress)
  })

  it('emits event', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    await expect(depositController.setLenderVerifier(lenderVerifierAddress)).to.emit(depositController, 'LenderVerifierChanged').withArgs(lenderVerifierAddress)
  })
})
