import { expect } from 'chai'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'

const testCases = [
  { selector: '0x01ffc9a7', name: 'ERC165' },
  { selector: '0x36372b07', name: 'ERC20' },
  { selector: '0x87dfe5a0', name: 'ERC4626' },
  { selector: '0x5a05180f', name: 'AccessControlEnumerableUpgradeable' },
] as const

describe('TrancheVault.supportsInterface', () => {
  const loadFixture = setupFixtureLoader()

  for (const { name, selector } of testCases) {
    it(`returns true for ${name} interface`, async () => {
      const { tranche } = await loadFixture(trancheVaultFixture)
      expect(await tranche.supportsInterface(selector)).to.be.true
    })
  }

  it('returns false for null selector', async () => {
    const nullSelector = '0xffffffff'
    const { tranche } = await loadFixture(trancheVaultFixture)
    expect(await tranche.supportsInterface(nullSelector)).to.be.false
  })
})
