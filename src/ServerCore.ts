import { ConnectionManager } from "./ConnectionManager"
import * as publicIp from 'public-ip'
import * as ip from 'ip'

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
  constructor (
    private myPort: number,
    private coreNodeHost?: string,
    private coreNodePort?: number,
  ) {
    this.status = ServerStatus.init
  }

  public async init() {
    console.log('Initializing Server...')
    const publicip = await publicIp.v4()
    this.myPublicIp = publicip
    this.myLocalIp = ip.address()
    console.log(`Server local ip address is : ${this.myLocalIp}`)
    console.log(`Server public ip address is set to ...: ${this.myPublicIp}`)
    this.cm = new ConnectionManager(this.myLocalIp, this.myPort)
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

}
