import { expect } from 'chai'
import { BigNumber, constants, ContractTransaction, Wallet } from 'ethers'
import { PortfolioStatus, structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { MONTH, ONE_IN_BPS, YEAR } from 'utils/constants'
import { convertToAssets } from 'utils/convertToAssets'
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'
import { timeTravel } from 'utils/timeTravel'
import { waffle } from 'hardhat'

describe('TrancheVault.redeem', () => {
  const loadFixture = setupFixtureLoader()

  async function structuredPortfolioClosedFixture() {
    const fixtureResult = await loadFixture(structuredPortfolioLiveFixture)
    await fixtureResult.structuredPortfolio.close()
    return fixtureResult
  }

  it('cannot redeem zero shares', async () => {
    const { equityTranche, redeemFromTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(redeemFromTranche(equityTranche, 0)).to.be.revertedWith('TV: Amount cannot be zero')
  })

  it('reverts in capital formation if not allowed', async () => {
    const { seniorTranche, redeemFromTranche } = await loadFixture(structuredPortfolioFixture)
    const amount = 1000
    await expect(redeemFromTranche(seniorTranche, amount))
      .to.be.revertedWith('TV: Amount exceeds max redeem')
  })

  it('can redeem in capital formation if allowed', async () => {
    const { equityTranche, depositToTranche, token, wallet, redeemFromTranche, equityTrancheData, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    const amount = 1000
    await depositToTranche(equityTranche, amount)

    await expect(redeemFromTranche(equityTranche, amount)).to.changeTokenBalances(token, [equityTranche, wallet], [-amount, amount])
  })

  it('cannot redeem below floor', async () => {
    const { equityTranche, equityTrancheData, depositToTranche, redeemFromTranche, setWithdrawAllowed } = await loadFixture(structuredPortfolioFixture)
    await setWithdrawAllowed(equityTrancheData.withdrawController, true)
    const amount = 1000
    await equityTrancheData.withdrawController.setFloor(amount / 2)
    await depositToTranche(equityTranche, amount)

    await expect(redeemFromTranche(equityTranche, amount)).to.be.revertedWith('TV: Amount exceeds max redeem')
  })

  it('transfers tokens to the receiver', async () => {
    const { seniorTranche, other, wallet, parseTokenUnits, token } = await structuredPortfolioClosedFixture()
    const amount = parseTokenUnits(1000)
    const balanceBefore = await token.balanceOf(other.address)
    await seniorTranche.redeem(amount, other.address, wallet.address)
    const delta = 10
    expect(await token.balanceOf(other.address)).to.be.closeTo(balanceBefore.add(amount), delta)
  })

  it('cannot redeem more than max withdraw amount', async () => {
    const { seniorTranche, redeemFromTranche, wallet } = await structuredPortfolioClosedFixture()
    const maxWithdraw = await seniorTranche.maxWithdraw(wallet.address)
    await expect(redeemFromTranche(seniorTranche, maxWithdraw.add(1))).to.be.revertedWith('TV: Amount exceeds max redeem')
  })

  it('cannot redeem funds without owner approve', async () => {
    const { equityTranche, wallet, other, token, parseTokenUnits } = await structuredPortfolioClosedFixture()
    const sharesAmount = parseTokenUnits(1000)
    const assetsAmount = await equityTranche.convertToAssets(sharesAmount)

    await expect(equityTranche.connect(other).redeem(sharesAmount, other.address, wallet.address))
      .to.be.revertedWith('TV: Insufficient allowance')

    await equityTranche.approve(other.address, sharesAmount)

    await expect(() => equityTranche.connect(other).redeem(sharesAmount, other.address, wallet.address))
      .to.changeTokenBalance(token, other.address, assetsAmount)
  })

  it('decreases allowance when sender is not owner', async () => {
    const { equityTranche, wallet, other, parseTokenUnits } = await structuredPortfolioClosedFixture()

    const redeemAmount = parseTokenUnits(1000)
    const approveAmount = parseTokenUnits(2000)
    await equityTranche.approve(other.address, approveAmount)
    await equityTranche.connect(other).redeem(redeemAmount, other.address, wallet.address)

    expect(await equityTranche.allowance(wallet.address, other.address)).to.eq(approveAmount.sub(redeemAmount))
  })

  it('burns shares from owner address', async () => {
    const { equityTranche, wallet, redeemFromTranche, parseTokenUnits } = await structuredPortfolioClosedFixture()

    const sharesAmount = parseTokenUnits(1000)
    const totalSupplyBefore = await equityTranche.totalSupply()

    await expect(() => redeemFromTranche(equityTranche, sharesAmount))
      .to.changeTokenBalance(equityTranche, wallet, -sharesAmount)
    expect(await equityTranche.totalSupply()).to.equal(totalSupplyBefore.sub(sharesAmount))
  })

  it('correctly converts shares to assets', async () => {
    const { equityTranche, redeemFromTranche, token, wallet, parseTokenUnits } = await structuredPortfolioClosedFixture()

    const totalAssets = await equityTranche.totalAssets()
    const totalSupply = await equityTranche.totalSupply()
    expect(totalSupply).to.be.gt(totalAssets)

    const sharesAmount = parseTokenUnits(1000)
    const redeem = () => redeemFromTranche(equityTranche, sharesAmount)

    const expectedAssetsReceived = convertToAssets(sharesAmount, totalAssets, totalSupply)
    await expect(redeem).to.changeTokenBalance(token, wallet, expectedAssetsReceived)
    await expect(redeem).to.changeTokenBalance(equityTranche, wallet, -sharesAmount)
  })

  it('pays withdraw controller fee', async () => {
    const { equityTranche, depositToTranche, redeemFromTranche, token, wallet, another, equityTrancheData: { withdrawController }, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(1000))

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const withdrawFee = Math.floor(amount * withdrawFeeRate / ONE_IN_BPS)
    await expect(() => redeemFromTranche(equityTranche, amount))
      .to.changeTokenBalances(
        token,
        [wallet, another, equityTranche],
        [amount - withdrawFee, withdrawFee, -amount],
      )
  })

  it('controller fee does not influence burnt shares', async () => {
    const { equityTranche, depositToTranche, redeemFromTranche, wallet, another, parseTokenUnits, equityTrancheData: { withdrawController } } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(1000))

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    await expect(() => redeemFromTranche(equityTranche, amount))
      .to.changeTokenBalance(equityTranche, wallet, -amount)
  })

  it('emits ManagerFeePaid event when controller fee set', async () => {
    const { equityTranche, depositToTranche, redeemFromTranche, parseTokenUnits, another, equityTrancheData: { withdrawController } } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(1000))

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)
    await withdrawController.setWithdrawAllowed(true, PortfolioStatus.CapitalFormation)
    await equityTranche.setManagerFeeBeneficiary(another.address)

    const amount = 1000
    const withdrawFee = Math.floor(amount * withdrawFeeRate / ONE_IN_BPS)

    await expect(redeemFromTranche(equityTranche, amount))
      .to.emit(equityTranche, 'ManagerFeePaid').withArgs(another.address, withdrawFee)
  })

  it('Closed status: can redeem all when controller fee set', async () => {
    const { equityTranche, wallet, redeemFromTranche, token, structuredPortfolio, equity: { withdrawController } } = await loadFixture(structuredPortfolioLiveFixture)
    await withdrawController.setWithdrawFeeRate(500)
    await structuredPortfolio.close()

    const allShares = await equityTranche.balanceOf(wallet.address)
    await expect(() => redeemFromTranche(equityTranche, allShares))
      .to.changeTokenBalance(equityTranche, wallet, -allShares)
    expect(await token.balanceOf(equityTranche.address)).to.eq(0)
  })

  it('Live status: can redeem all when controller fee set', async () => {
    const { equityTranche, wallet, redeemFromTranche, token, equity: { withdrawController } } = await loadFixture(structuredPortfolioLiveFixture)
    await withdrawController.setWithdrawFeeRate(500)

    const allShares = await equityTranche.balanceOf(wallet.address)
    await expect(() => redeemFromTranche(equityTranche, allShares))
      .to.changeTokenBalance(equityTranche, wallet, -allShares)
    expect(await token.balanceOf(equityTranche.address)).to.eq(0)
  })

  it('can redeem all when all types of fees set', async () => {
    const { equityTranche, wallet, redeemFromTranche, token, structuredPortfolio, protocolConfig, equity: { withdrawController } } = await loadFixture(structuredPortfolioLiveFixture)

    await withdrawController.setWithdrawFeeRate(500)
    await equityTranche.setManagerFeeRate(300)
    await protocolConfig.setDefaultProtocolFeeRate(700)
    await structuredPortfolio.updateCheckpoints()

    await timeTravel(YEAR)
    await structuredPortfolio.close()

    const allShares = await equityTranche.balanceOf(wallet.address)
    await expect(() => redeemFromTranche(equityTranche, allShares))
      .to.changeTokenBalance(equityTranche, wallet, -allShares)
    expect(await token.balanceOf(equityTranche.address)).to.be.closeTo(0, 1e4)
  })

  it('emits event', async () => {
    const { senior, seniorTranche, wallet, other, another } = await loadFixture(structuredPortfolioLiveFixture)

    await timeTravel(YEAR)
    const shares = 1000
    const assets = Math.floor(shares * (1 + senior.targetApy / ONE_IN_BPS))
    await seniorTranche.approve(other.address, constants.MaxUint256)
    await expect(seniorTranche.connect(other).redeem(shares, another.address, wallet.address)).to.emit(seniorTranche, 'Withdraw')
      .withArgs(other.address, another.address, wallet.address, assets, shares)
  })

  it('reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.pause()

    await expect(equityTranche.redeem(100, wallet.address, wallet.address))
      .to.be.revertedWith('TV: Portfolio is paused')
  })

  describe('Live', () => {
    it('transfers tokens to receiver', async () => {
      const { seniorTranche, token, redeemFromTranche, structuredPortfolio, wallet, other, withInterest, senior } = await loadFixture(structuredPortfolioLiveFixture)
      const sharesAmount = 1000
      const expectedAssetAmount = withInterest(sharesAmount, senior.targetApy, YEAR)
      await timeTravel(YEAR)
      await expect(() => redeemFromTranche(seniorTranche, sharesAmount, wallet.address, other.address))
        .to.changeTokenBalances(token, [other.address, structuredPortfolio.address, wallet.address], [expectedAssetAmount, -expectedAssetAmount, 0])
    })

    it('burns owner\'s shares', async () => {
      const { juniorTranche, redeemFromTranche, wallet } = await loadFixture(structuredPortfolioLiveFixture)
      const sharesAmount = 1000
      await timeTravel(YEAR)
      const totalSupplyBefore = await juniorTranche.totalSupply()
      await expect(() => redeemFromTranche(juniorTranche, sharesAmount))
        .to.changeTokenBalance(juniorTranche, wallet.address, -sharesAmount)
      expect(await juniorTranche.totalSupply()).to.equal(totalSupplyBefore.sub(sharesAmount))
    })

    it('tranche total assets are calculated correctly after multiple redeems', async () => {
      const { juniorTranche, redeemFromTranche, withInterest, parseTokenUnits, junior } = await loadFixture(structuredPortfolioLiveFixture)
      const { targetApy, initialDeposit } = junior
      const shares = parseTokenUnits(1e6)
      const delta = parseTokenUnits(0.1)

      await timeTravel(MONTH)
      let tx = await redeemFromTranche(juniorTranche, shares)
      let amount = await getWithdrawnAssets(tx)
      const expectedAssetsAfterMonth1 = withInterest(initialDeposit, targetApy, MONTH).sub(amount)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedAssetsAfterMonth1, delta)

      await timeTravel(MONTH)
      tx = await redeemFromTranche(juniorTranche, shares)
      amount = await getWithdrawnAssets(tx)
      const expectedAssetsAfterMonth2 = withInterest(expectedAssetsAfterMonth1, targetApy, MONTH).sub(amount)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedAssetsAfterMonth2, delta)

      await timeTravel(MONTH)
      const expectedAssetsAfterMonth3 = withInterest(expectedAssetsAfterMonth2, targetApy, MONTH)
      expect(await juniorTranche.totalAssets()).to.be.closeTo(expectedAssetsAfterMonth3, delta)
    })

    it('interest depends on vesting period', async () => {
      const { seniorTranche, depositToTranche, parseTokenUnits, senior, withInterest, token } = await loadFixture(structuredPortfolioLiveFixture)
      const emptyWallets = (await waffle.provider.getWallets()).slice(2)
      const [lenderA, lenderB, lenderC] = emptyWallets

      const amount = parseTokenUnits(1000)
      await depositToTranche(seniorTranche, amount, lenderA.address)
      await timeTravel(YEAR / 2)
      await depositToTranche(seniorTranche, amount, lenderB.address)
      await timeTravel(YEAR / 2)
      await depositToTranche(seniorTranche, amount, lenderC.address)

      const redeemAll = async (wallet: Wallet) => {
        const balance = await seniorTranche.balanceOf(wallet.address)
        return seniorTranche.connect(wallet).redeem(balance, wallet.address, wallet.address)
      }

      await redeemAll(lenderA)
      await redeemAll(lenderB)
      await redeemAll(lenderC)

      const expectedLenderAAmount = withInterest(amount, senior.targetApy, YEAR)
      const expectedLenderBAmount = withInterest(amount, senior.targetApy, YEAR / 2)
      const expectedLenderCAmount = amount

      expect(await token.balanceOf(lenderA.address)).to.be.closeTo(expectedLenderAAmount, parseTokenUnits(1))
      expect(await token.balanceOf(lenderB.address)).to.be.closeTo(expectedLenderBAmount, parseTokenUnits(0.00001))
      expect(await token.balanceOf(lenderC.address)).to.be.closeTo(expectedLenderCAmount, parseTokenUnits(0.00001))
    })

    it('cannot redeem below floor', async () => {
      const { equityTranche, equityTrancheData, redeemFromTranche, depositToTranche, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)
      await startPortfolioAndEnableLiveActions()
      const amount = 1000
      await equityTrancheData.withdrawController.setFloor(amount / 2)
      await depositToTranche(equityTranche, amount)

      await expect(redeemFromTranche(equityTranche, amount)).to.be.revertedWith('TV: Amount exceeds max redeem')
    })

    it('lenders can redeem all shares when fees are on', async () => {
      const { wallet, other, another, juniorTranche, parseTokenUnits, depositToTranche, protocolConfig, seniorTranche, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)

      const redeemAll = async (account: Wallet) => {
        return juniorTranche.connect(account).redeem(await juniorTranche.balanceOf(account.address), account.address, account.address)
      }

      await protocolConfig.setDefaultProtocolFeeRate(500)
      await startPortfolioAndEnableLiveActions()

      await depositToTranche(seniorTranche, parseTokenUnits(500), wallet.address)
      await depositToTranche(juniorTranche, parseTokenUnits(100), wallet.address)
      await depositToTranche(juniorTranche, parseTokenUnits(200), other.address)
      await depositToTranche(juniorTranche, parseTokenUnits(300), another.address)

      await timeTravel(YEAR)

      const pendingProtocolFee = await juniorTranche.pendingProtocolFee()
      expect(pendingProtocolFee).to.be.gt(0)

      await redeemAll(wallet)
      await redeemAll(other)
      await redeemAll(another)

      expect(await juniorTranche.totalAssets()).to.eq(0)
      expect(await juniorTranche.balanceOf(wallet.address)).to.eq(0)
      expect(await juniorTranche.balanceOf(other.address)).to.eq(0)
      expect(await juniorTranche.balanceOf(another.address)).to.eq(0)
    })

    it('respects tranche ratios', async () => {
      const { createPortfolioAndSetupControllers, tranchesInitData, depositToTranche, setDepositAllowed, setWithdrawAllowed, redeemFromTranche } = await loadFixture(structuredPortfolioFixture)
      const { portfolio, tranches, controllers } = await createPortfolioAndSetupControllers({
        tranchesInitData: [
          tranchesInitData[0],
          {
            ...tranchesInitData[1],
            minSubordinateRatio: 1000,
          },
          {
            ...tranchesInitData[2],
            minSubordinateRatio: 2000,
          },
        ],
      })

      await depositToTranche(tranches[0], 300)
      await depositToTranche(tranches[1], 2000)
      await depositToTranche(tranches[2], 2000)

      await portfolio.start()
      for (const { depositController, withdrawController } of controllers) {
        await setDepositAllowed(depositController, true, portfolio)
        await setWithdrawAllowed(withdrawController, true, portfolio)
      }
      await expect(redeemFromTranche(tranches[0], 200)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(redeemFromTranche(tranches[0], 100)).to.be.not.reverted
      await expect(redeemFromTranche(tranches[1], 1900)).to.be.revertedWith('SP: Tranche min ratio not met')
      await expect(redeemFromTranche(tranches[1], 1800)).to.be.not.reverted
      await expect(redeemFromTranche(tranches[2], 1999)).to.be.not.reverted
    })
  })

  describe('Closed', () => {
    it('can redeem below floor', async () => {
      const { equityTranche, redeemFromTranche, depositToTranche, startAndClosePortfolio, token, wallet, equityTrancheData } = await loadFixture(structuredPortfolioFixture)
      const amount = 1000
      await equityTrancheData.withdrawController.setFloor(500)
      await equityTrancheData.depositController.setCeiling(2 * amount)

      await depositToTranche(equityTranche, amount)

      await startAndClosePortfolio()

      await expect(redeemFromTranche(equityTranche, amount)).to.changeTokenBalances(token, [equityTranche, wallet], [-amount, amount])
    })
  })

  it('lenders can burn all their shares', async () => {
    const { wallet, other, another, juniorTranche, seniorTranche, parseTokenUnits, depositToTranche, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)

    const redeemAll = async (account: Wallet) => {
      return juniorTranche.connect(account).redeem(await juniorTranche.balanceOf(account.address), account.address, account.address)
    }

    await depositToTranche(seniorTranche, parseTokenUnits(500), wallet.address)
    await depositToTranche(juniorTranche, parseTokenUnits(100), wallet.address)
    await depositToTranche(juniorTranche, parseTokenUnits(200), other.address)
    await depositToTranche(juniorTranche, parseTokenUnits(300), another.address)

    await startAndClosePortfolio()

    await redeemAll(wallet)
    await redeemAll(other)
    await redeemAll(another)

    expect(await juniorTranche.totalAssets()).to.eq(0)
    expect(await juniorTranche.balanceOf(wallet.address)).to.eq(0)
    expect(await juniorTranche.balanceOf(other.address)).to.eq(0)
    expect(await juniorTranche.balanceOf(another.address)).to.eq(0)
  })
})

function getWithdrawnAssets(tx: ContractTransaction): Promise<BigNumber> {
  return extractEventArgFromTx(tx, [tx.to, 'Withdraw', 'assets'])
}
