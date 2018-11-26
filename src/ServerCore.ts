import { ConnectionManager, IPeer } from "./ConnectionManager"
import * as publicIp from 'public-ip'
import * as ip from 'ip'
import * as util from 'util'
import { MessageType, IParsedMessage } from "./MessageManager";
import MyProtocolMessageHandler from './MyProtocolMessageHandler'

enum ServerStatus {
  init,
  standby,
  conectedToNetwork,
  shuttingDown,
}

export default class ServerCore {
  private status: ServerStatus
  private cm: ConnectionManager
  private myPublicIp: string
  private myLocalIp: string
  private myProtocolHandler: MyProtocolMessageHandler
  constructor (
    private myPort: number,
    private coreNodeHost?: string,
    private coreNodePort?: number,
  ) {}

  public async init() {
    this.status = ServerStatus.init
    console.log('Initializing Server...')
    this.myProtocolHandler = new MyProtocolMessageHandler()
    const publicip = await publicIp.v4()
    this.myPublicIp = publicip
    this.myLocalIp = ip.address()
    console.log(`Server local ip address is : ${this.myLocalIp}`)
    console.log(`Server public ip address is set to ...: ${this.myPublicIp}`)
    this.cm = new ConnectionManager(this.myLocalIp, this.myPort, this.handleMsg)
  }

  public start() {
    this.status = ServerStatus.standby
    this.cm.start()
  }

  public joinNetwork() {
    if (this.coreNodeHost) {
      this.status = ServerStatus.conectedToNetwork
      this.cm.joinNetwork(this.coreNodeHost, this.coreNodePort)
    } else {
      console.log('This server is running as Genesis Core node...')
    }
    this.status = ServerStatus.conectedToNetwork
  }

  public async shutdown() {
    this.status = ServerStatus.shuttingDown
    console.log('Shutting down...')
    await this.cm.connectionClose()
  }

  public getCurrentStatus() {
    return this.status
  }

  private handleMsg(message: IParsedMessage, peer: IPeer) {
    if (peer) {
      console.log(`Send out latest blockchain for reply to: ${util.inspect(peer)}`)
      return
    }
    switch(message.msgType) {
      case MessageType.newTransaction:
        // 新規トランザクションを登録する処理を呼び出す
        break
      case MessageType.newBlock:
        // 新規ブロックを検証する処理
        break
      case MessageType.responseFullChain:
        // ブロックチェーン送信要求に応じて返却されたブロックチェーンを検証する処理を呼び出す
        break
      case MessageType.enhanced:
        // P2Pを単なるトランスポートとして使っているアプリが独自拡張したメッセージはここ。
        this.myProtocolHandler.handleMsg(message.payload)
        break
    }
  }

}
