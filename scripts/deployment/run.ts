import { deploy } from 'ethereum-mars'
import { deployCarbon } from './deployCarbon'

deploy({ verify: true }, deployCarbon)
