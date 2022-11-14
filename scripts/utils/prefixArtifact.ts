import { ArtifactFrom } from 'ethereum-mars'
import { Name } from 'ethereum-mars/build/src/symbols'

export function uncapitalize(value) {
  return value !== '' ? `${value[0].toLowerCase()}${value.substring(1)}` : ''
}

export function getNameWithPrefix(artifact: ArtifactFrom<any>, prefix = '') {
  return `${prefix}${uncapitalize(artifact[Name])}`
}
