import { IPeer } from "./ConnectionManager";
import * as util from 'util'
import { isEqual } from 'lodash'

export default class EdgeNodeList {
  private nodeList: IPeer[]
  constructor() {
    this.nodeList = []
  }

  public add(edge: IPeer) {
    console.log(`Adding Edge: ${util.inspect(edge)}`)
    this.nodeList.push(edge)
    console.log(`Current Edge List: ${util.inspect(this.nodeList)}`)
  }

  public remove(edge: IPeer) {
    this.nodeList = this.nodeList.filter((node) => {
      if (isEqual(edge, node)) {
        console.log(`Removing Edge: ${util.inspect(edge)}`)
        return false
      } else {
        return true
      }
    })
    console.log(`Current Edge List: ${util.inspect(this.nodeList)}`)
  }

  public overwrite(newList: IPeer[]) {
    console.log(`Edge Node List will be overwrited`)
    this.nodeList = newList
    console.log(`Current Edge List: ${util.inspect(this.nodeList)}`)
  }

  public getList() {
    return this.nodeList
  }
}