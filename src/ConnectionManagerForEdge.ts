import CoreNodeList from './CoreNodeList'
import MessageManager, { MessageType, ErrorType, SuccessType } from './MessageManager'
import { IPeer } from './ConnectionManager'
import * as net from 'net'
import * as util from 'util'

const PING_INTERVAL = 100
export default class ConnectionManagerForEdge {
  coreNodeList: CoreNodeList
  mm: MessageManager
  timeoutId: NodeJS.Timeout
  connection: net.Server
  constructor(
    private myhost: string,
    private myPort: number,
    private coreHost: string,
    private corePort: number,
  ) {
    console.log(`Initializing ConnectionManagerForEdge`)
    this.coreNodeList = new CoreNodeList()
    this.mm = new MessageManager()
  }

  public start() {
    this.waitForAccess()
    this.timeoutId = setTimeout(() => {
      this.sendPing()
    }, PING_INTERVAL)
  }

  public connectToCoreNode = async () => {
    await this.connectToP2PNW(this.coreHost, this.corePort)
  }

  public sendMsg = (peer: IPeer, msg: any) => {

    console.log(`Sending: ${util.inspect(msg)}`)
    return new Promise((resolve, reject) => {
      const client = net.createConnection(peer, () => {
        client.write(msg)
        client.end()
        resolve()
      })
      client.on('error', async () => {
        console.log(`Connection Failed for peer: ${peer}`)
        this.coreNodeList.remove(peer)
        console.log('Trying to connect into P2P newtwork...')
        const currentCoreList = this.coreNodeList.getList()
        if (currentCoreList.length !== 0) {
          const newCore = currentCoreList[0]
          this.coreHost = newCore.host
          this.corePort = newCore.port
          await this.connectToCoreNode()
          await this.sendMsg(newCore, msg)
          resolve()
        } else {
          console.log('No core node found in out list')
          clearTimeout(this.timeoutId)
          resolve()
        }
      })
  })
  }

  public connectionClose() {
    this.connection.close()
    clearTimeout(this.timeoutId)
  }

  private connectToP2PNW = (host: string, port: number) => {
    return new Promise((resolve, reject) => {
      const connection = net.createConnection(port, host, () => {
        const msg = this.mm.build(MessageType.addAsEdge, this.myPort)
        connection.write(msg)
        connection.end()
        resolve()
      })
    })
  }

  private waitForAccess() {
    this.connection = net.createServer((connection) => {
      connection.on('data', (data) => {
        const fromAddress = connection.remoteAddress
        const fromPort = connection.remotePort
        this.handleMessage(fromAddress, fromPort, data)
      })

      connection.on('end', () => {
        console.log('connection disconnect')
      })
    })

    this.connection.listen(this.myPort, this.myhost, () => {
      console.log('Waiting for connection')
    })
  }

  private sendPing = () => {
    const client = net.createConnection(this.corePort, this.coreHost, () => {
      const msg = this.mm.build(MessageType.ping, this.myPort)
      client.write(msg)
      client.end()
    })
    client.on('error', () => {
      console.log(`Connection refused to ${this.coreHost}:${this.corePort}`)
      this.coreNodeList.remove({ host: this.coreHost, port: this.corePort })
      console.log('Trying to connect into P2P net work...')
      const nodeList = this.coreNodeList.getList()

      if (nodeList.length !== 0) {
        const otherCorenode = nodeList[0]
        this.coreHost = otherCorenode.host
        this.corePort = otherCorenode.port
        this.connectToCoreNode()
      } else {
        console.log('Core Node Not Found...')
        clearTimeout(this.timeoutId)
      }
    })

    setTimeout(() => {
      this.sendPing()
    }, PING_INTERVAL)
  }

  private handleMessage(fromAddress: string, fromPort: number, rawMsg: Buffer) {
    const parsedMsg = this.mm.parse(rawMsg.toString())
    const { result, reason, msgType, payload } = parsedMsg
    const toPort = parsedMsg.myPort
    const nodeListneningPort =  parsedMsg.myPort

    console.log(`Handled messae from ${fromAddress}:${fromPort} ${msgType} ${util.inspect(payload)}`)
    console.log(`From port is ${nodeListneningPort}`)

    if (result === 'error') {
      if (reason === ErrorType.protocolUnmatch) {
        console.log('Protocol is not match')
        return
      } else if (reason === ErrorType.versionUnmatch) {
        console.log('Protocol version is not matched')
        return
      }
    } else if (reason === SuccessType.withoutPayload) {
      if (msgType === MessageType.ping) {
        return
      } else {
        console.log('Edge node does not have functions for this message!')
      }
    } else if (reason === SuccessType.withPayload) {
      if (msgType === MessageType.coreList) {
        console.log('Refresh the node list...')
        this.coreNodeList.overwrite(payload)
        console.log(`Lates core node list: ${util.inspect(payload)}`)
      }
    } else {
      console.log(`Unexpected status: ${util.inspect(status)}`)
    }
  }
}
