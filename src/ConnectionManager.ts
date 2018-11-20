import { xorWith, isEqual } from 'lodash'
import * as net from 'net'
import MessageManager, { ErrorType, MessageType, SuccessType } from './MessageManager'
import CoreNodeList from './CoreNodeList'
import * as util from 'util'
import EdgeNodeList from './EdgeNodeList'

const PING_INTERVAL = 10000

export interface IPeer {
  host: string
  port: number
}

export class ConnectionManager {
  private coreNode: CoreNodeList
  private socket: net.Server
  private mm: MessageManager
  private connectedHost: string
  private connectedPort: number
  private pingTimerId: NodeJS.Timeout
  private edgeNodeList: EdgeNodeList
  constructor(private host: string, private port: number) {
    console.log('Initializing Connection Manager')
    this.mm = new MessageManager()
    this.coreNode = new CoreNodeList()
    this.edgeNodeList = new EdgeNodeList()
    this.addPeer({ host, port })
  }

  public start() {
    this.waitForAccess()
    this.pingTimerId = setTimeout(this.checkPeersConnection, PING_INTERVAL)
  }

  public async joinNetwork(host: string, port: number) {
    this.connectedHost = host
    this.connectedPort = port
    await this.connnectToP2PNW(host, port)
  }

  private connnectToP2PNW(host: string, port: number) {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(port, host, () => {
        const msg = this.mm.build(MessageType.add, this.port)
        client.write(msg)
        client.end()
        resolve()
      })
    })
  }

  public sendMsg = ({ host, port }: IPeer, msg): Promise<void> => {
    return new Promise((resolve, reject) => {
        const client = net.createConnection({ host, port }, () => {
          client.write(msg)
          client.end()
          resolve()
        })
        client.on('error', () => {
          console.log(`Connection refused to ${host}:${port}`)
          this.removePeer({ host, port })
          reject()
        })
    })
  }

  public sendMsgToAllPeer = async (msg: string) => {
    console.log('sndMsgToAllPeer was called')
    for (let node of this.coreNode.getList()) {
      if (node.host !== this.host || node.port !== this.port) {
        console.log(`Send to ${node.host}:${node.port}`)
        await this.sendMsg({ host: node.host, port: node.port }, msg).catch(() => {

        })
      }
    }
  }

  public async connectionClose() {
    this.socket.close()
    console.log('=============================================')
    clearTimeout(this.pingTimerId)
    const msg = this.mm.build(MessageType.remove, this.port)
    await this.sendMsg({ host: this.connectedHost, port: this.connectedPort }, msg)
  }

  private async handleMsg(address: string, port: number, data: Buffer) {
    const parsedMsg = this.mm.parse(data.toString())
    const { result, reason, msgType, payload } = parsedMsg
    const nodeListneningPort =  parsedMsg.myPort

    console.log(`Handled messae from ${address}:${port} ${msgType} ${util.inspect(payload)}`)
    console.log(`From port is ${nodeListneningPort}`)

    if (result === 'error') {
      if (reason === ErrorType.protocolUnmatch) {
        console.log('Protocol is not match')
        return
      } else if (reason === ErrorType.versionUnmatch) {
        console.log('Protocol version is not matched')
        return
      }
    } else if (result === 'ok' && reason === SuccessType.withoutPayload) {
      if (msgType === MessageType.add) {
        console.log('Add node request received!')
        this.addPeer({ host: address, port: nodeListneningPort })
        if (address === this.host && nodeListneningPort === this.port) {
          return
        } else {
          const message = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
          await this.sendMsgToAllPeer(message)
        }
      } else if (msgType === MessageType.remove) {
        console.log(`Remove request was receiver from ${address}:${port}`)
        this.removePeer({ host: address, port: nodeListneningPort })
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
        await this.sendMsgToAllPeer(msg)
      } else if (msgType === MessageType.ping) {
        return
      } else if (msgType === MessageType.coreList) {
        console.log('List for Core nodes was requested')
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
        await this.sendMsgToAllPeer(msg)
      } else if (msgType === MessageType.addAsEdge) {
        this.addEdgeNode({ host:address, port: nodeListneningPort })
        const msg = this.mm.build(MessageType.coreList, this.port, [...this.coreNode.getList()])
        await this.sendMsg({ host: address, port: nodeListneningPort }, msg)
      } else if (msgType === MessageType.removeEdge) {
        this.removeEdgeNode({ host:address, port: nodeListneningPort })
      } else {
        console.log('Received unknown msgtype')
      }
    } else if (result === 'ok' && reason === SuccessType.withPayload) {
      if (msgType === MessageType.coreList) {
        console.log('Refresh core node list')
        console.log(`latest core list ${util.inspect(payload)}`)
        this.coreNode.overwrite(payload)
      } else {
        console.log('Received unknown msgtype')
      }
    } else {
      console.log(`Unexpected result: ${result}, reason: ${reason}`)
    }
  }

  private addPeer(peer: IPeer) {
    console.log(`Adding peer: ${peer.host}:${peer.port}`)
    this.coreNode.add(peer)
  }

  private removePeer(peer: IPeer) {
    this.coreNode.remove(peer)
  }

  private addEdgeNode(edge: IPeer) {
    this.edgeNodeList.add(edge)
  }

  private removeEdgeNode(edge: IPeer) {
    this.edgeNodeList.add(edge)
  }

  private checkPeersConnection = async () => {
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
      console.log(`Removeing: ${util.inspect(deadConnectNodes)}`)
      const newList = xorWith(this.coreNode.getList(), deadConnectNodes, isEqual)
      this.coreNode.overwrite(newList)
    }

    console.log(`Current node list: ${util.inspect(this.coreNode.getList())}`)

    if (isChanged) {
      const msg = this.mm.build(MessageType.coreList, this.port, this.coreNode.getList())
      await this.sendMsgToAllPeer(msg)
    }

    this.pingTimerId = setTimeout(() => {
      this.checkPeersConnection()
    }, PING_INTERVAL)
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
        const fromAddress = connection.remoteAddress
        const fromPort = connection.remotePort
        this.handleMsg(fromAddress, fromPort, data)
      })

      connection.on('end', () => {
        console.log('connection disconnect')
      })
    })

    this.socket.listen(this.port, this.host, () => {
      console.log('Waiting for connection')
    })
  }
}
