import { IPeer } from "./ConnectionManager"
import { isEqual } from 'lodash'
import * as util from 'util'

export default class CoreNodeList {
  constructor(private nodeList: IPeer[] = []) {}

  public add(peer: IPeer) {
    console.log(`Adding peer: ${util.inspect(peer)}`)
    this.nodeList.push(peer)
    console.log(`Current list: ${util.inspect(this.nodeList)}`)
  }

  public remove(peer: IPeer) {
    this.nodeList = this.nodeList.filter(node => {
      if (isEqual(node, peer)) {
        console.log(`Removing peer: ${util.inspect(peer)}`)
        return false
      } else {
        return true
      }
    })
    console.log(`Current list: ${util.inspect(this.nodeList)}`)
  }

  public overwrite(newList: IPeer[]) {
    console.log('core node list will be overwrited')
    this.nodeList = newList
    console.log(`Current list: ${util.inspect(this.nodeList)}`)
  }

  public getList() {
    return this.nodeList
  }

}