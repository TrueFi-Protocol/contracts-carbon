import { BigNumber } from 'ethers'

export function convertToAssets(shares: BigNumber, totalAssets: BigNumber, totalShares: BigNumber) {
  return shares.mul(totalAssets).div(totalShares)
}

export function convertToAssetsCeil(shares: BigNumber, totalAssets: BigNumber, totalShares: BigNumber) {
  return (shares.mul(totalAssets).add(totalShares).sub(1)).div(totalShares)
}
