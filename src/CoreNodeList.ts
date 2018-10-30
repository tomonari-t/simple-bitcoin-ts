import { IPeer } from "./ConnectionManager"
import { isEqual } from 'lodash'

export default class CoreNodeList {
  constructor(private nodeList: IPeer[] = []) {}

  public add(peer: IPeer) {
    console.log(`Adding peer: ${peer}`)
    this.nodeList.push(peer)
    console.log(`Current list: ${this.nodeList}`)
  }

  public remove(peer: IPeer) {
    this.nodeList = this.nodeList.filter(node => {
      if (isEqual(node, peer)) {
        console.log(`Removing peer: ${peer}`)
        return false
      } else {
        return true
      }
    })
    console.log(`Current list: ${this.nodeList}`)
  }

  public overwrite(newList: IPeer[]) {
    console.log('core node list will be overwrited')
    this.nodeList = newList
    console.log(`Current list: ${this.nodeList}`)
  }

  public getList() {
    return this.nodeList
  }

}