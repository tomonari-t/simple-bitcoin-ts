import * as publicIp from 'public-ip'
import * as ip from 'ip'
import ConnectionManagerForEdge from './ConnectionManagerForEdge'
import { MessageType } from './MessageManager';

enum ClientCoreStatus {
  init,
  active,
  shuttingDown,
}

export default class ClientCore {
  private status: ClientCoreStatus
  private myPublicIp: string
  private myLocalIp: string
  private cm: ConnectionManagerForEdge
  constructor(
    private myPort = 50082,
    private coreHost: string | undefined,
    private corePort: number | undefined,
  ) {}

  public async init() {
    this.status = ClientCoreStatus.init
    console.log('Initializing Client Core....')
    const publicip = await publicIp.v4()
    this.myPublicIp = publicip
    this.myLocalIp = ip.address()
    console.log(`Server local ip address is : ${this.myLocalIp}`)
    console.log(`Server public ip address is set to ...: ${this.myPublicIp}`)
    this.cm = new ConnectionManagerForEdge(this.myLocalIp, this.myPort, this.coreHost, this.corePort)
  }

  public async start() {
    this.status = ClientCoreStatus.active
    this.cm.start()
    await this.cm.connectToCoreNode()
  }

  public async shutdown() {
    this.status = ClientCoreStatus.shuttingDown
    console.log('Shutdown edge node...')
    this.cm.connectionClose()
  }

  public getCurrentStatus() {
    return this.status
  }

  public async sendMsgToMyCoreNode(msgType: MessageType, msg: any) {
    const msgTxt = this.cm.getMsgText(msgType, msg)
    await this.cm.sendMsg({ host: this.coreHost, port: this.corePort }, msgTxt)
  }
}
