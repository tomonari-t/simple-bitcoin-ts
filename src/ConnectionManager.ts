import { every, remove, xorWith, isEqual } from 'lodash'
import * as net from 'net'
import MessageManager, { ErrorType, MessageType, SuccessType } from './MessageManager'
import CoreNodeList from './CoreNodeList';

const PING_INTERVAL = 180000

export interface IPeer {
  host: string
  port: number
}

export class ConnectionManager {
  private coreNode: CoreNodeList
  private socket: net.Server
  private mm: MessageManager
  constructor(private host: string, private port: number) {
    console.log('Initializing Connection Manager')
    this.mm = new MessageManager()
    this.coreNode = new CoreNodeList()
    this.addPeer({ host, port })
  }

  public start() {}

  public joinNetwork() {}

  public sendMsg({ host, port }: IPeer, msg): Promise<void>{
    return new Promise((resolve, reject) => {
      try {
        const client = net.createConnection({ host, port }, () => {
          client.write(msg)
          client.end()
          resolve()
        })
      } catch (err) {
        console.log(`Connection refused to ${host}:${port}`)
        this.removePeer({ host, port })
        reject()
      }
    })
  }

  public async sendMsgToAllPeer(msg: string) {
    console.log('sndMsgToAllPeer was called')
    for (let node of this.coreNode.getList()) {
      if (node.host !== this.host && node.port !== this.port) {
        console.log(`Send to ${node.host}:${node.port}`)
        await this.sendMsg({ host: node.host, port: node.port }, msg)
      }
    }
  }

  public connectionClose() {}

  private async handleMsg(address: string, port: number, data: Buffer) {
    const {result, reason, msgType, myPort, payload } = this.mm.parse(data.toString())

    if (result === 'error') {
      if (reason === ErrorType.protocolUnmatch) {
        console.log('Protocol is not match')
        return
      } else if (reason === ErrorType.versionUnmatch) {
        console.log('Protocol version is not matched')
        return
      }
    } else if (result === 'ok' && reason === SuccessType.withPayload) {
      if (msgType === MessageType.add) {
        console.log('Add node request received!')
        this.addPeer({ host: address, port })
        if (address === this.host && port === this.port) {
          return
        } else {
          const message = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
          await this.sendMsgToAllPeer(message)
        }
      } else if (msgType === MessageType.remove) {
        console.log(`Remove request was receiver from ${address}:${port}`)
        this.removePeer({ host: address, port })
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
        await this.sendMsgToAllPeer(msg)
      } else if (msgType === MessageType.ping) {
        return
      } else if (msgType === MessageType.coreList) {
        console.log('List for Core nodes was requested')
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
        await this.sendMsgToAllPeer(msg)
      } else {
        console.log('Received unknown msgtype')
      }
    } else if (result === 'ok' && reason === SuccessType.withoutPayload) {
      if (msgType === MessageType.coreList) {
        console.log('Refresh core node list')
        console.log(`latest core list ${payload}`)
        this.coreNode = payload
      } else {
        console.log('Received unknown msgtype')
      }
    } else {
      console.log(`Unexpected result: ${result}, reason: ${reason}`)
    }
  }

  private addPeer(peer: IPeer) {
    console.log(`Adding peer: ${peer}`)
    this.coreNode.add(peer)
  }

  private removePeer(peer: IPeer) {
    this.coreNode.remove(peer)
  }

  private async checkPeersConnection() {
    console.log('Check peers connection was called')
    let isChanged = false
    const deadConnectNodes = []
    for (let node of this.coreNode.getList()) {
      if (!await this.isAlive(node)) {
        deadConnectNodes.push(node)
      }
    }

    if (deadConnectNodes.length !== 0) {
      isChanged = true
      console.log(`Removeing: ${deadConnectNodes}`)
      const newList = xorWith(this.coreNode.getList(), deadConnectNodes, isEqual)
      this.coreNode.overWrite(newList)
    }

    console.log(`Current node list: ${this.coreNode.getList()}`)

    if (isChanged) {
      const msg = this.mm.build(MessageType.coreList, this.port, this.coreNode.getList())
      await this.sendMsgToAllPeer(msg)
    }

    setTimeout(this.checkPeersConnection, PING_INTERVAL)
  }

  private async isAlive({ host, port }: IPeer) {
    try {
      const msg = this.mm.build(MessageType.ping, this.port)
      await this.sendMsg({ host, port }, msg)
      return true
    } catch(err) {
      return false
    }
  }

  private waitForAccess() {
    this.socket = net.createServer((connection) => {

      connection.on('data', (data) => {
        const { address, port } = (connection.address() as net.AddressInfo)
        this.handleMsg(address, port, data)
      })

      connection.on('end', () => {
        console.log('connection disconnect')
      })
    })

    this.socket.listen(this.host, this.port, () => {
      console.log('Waiting for connection')
    })
  }
}
