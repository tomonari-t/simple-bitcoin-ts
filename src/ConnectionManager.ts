import { every, remove, xorWith, isEqual } from 'lodash'
import * as net from 'net'
import MessageManager, { ErrorType, MessageType, SuccessType } from './MessageManager'

const PING_INTERVAL = 180000

interface IPeer {
  host: string
  port: number
}

class ConnectionManager {
  private coreNode: {host: string, port: number}[] = []
  private socket: net.Server
  private mm: MessageManager
  constructor(private host: string, private port: number) {
    console.log('Initializing Connection Manager')
    this.addPeer({ host, port })
    this.mm = new MessageManager()
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
    for (let node of this.coreNode) {
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
          const message = this.mm.build(MessageType.coreList, this.port, [...this.coreNode])
          await this.sendMsgToAllPeer(message)
        }
      } else if (msgType === MessageType.remove) {
        console.log(`Remove request was receiver from ${address}:${port}`)
        this.removePeer({ host: address, port })
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode])
        await this.sendMsgToAllPeer(msg)
      } else if (msgType === MessageType.ping) {
        return
      } else if (msgType === MessageType.coreList) {
        console.log('List for Core nodes was requested')
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode])
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
    this.coreNode.push(peer)
  }

  private removePeer(peer: IPeer) {
    if (every(this.coreNode, peer)) {
      console.log(`Removing peer: ${peer}`)
      remove(this.coreNode, (node) => {
        if (node.host === peer.host && node.port === peer.port) {
          return true
        } else {
          return false
        }
      })
      console.log(`Current Core List: ${this.coreNode}`)
    }
  }

  private async checkPeersConnection() {
    console.log('Check peers connection was called')
    let isChanged = false
    const deadConnectNodes = []
    for (let node of this.coreNode) {
      if (!await this.isAlive(node)) {
        deadConnectNodes.push(node)
      }
    }

    if (deadConnectNodes.length !== 0) {
      isChanged = true
      console.log(`Removeing: ${deadConnectNodes}`)
      this.coreNode = xorWith(this.coreNode, deadConnectNodes, isEqual)
    }

    console.log(`Current node list: ${this.coreNode}`)

    if (isChanged) {
      const msg = this.mm.build(MessageType.coreList, this.port, this.coreNode)
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