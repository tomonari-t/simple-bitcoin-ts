import { ConnectionManager } from "./ConnectionManager"
import * as net from 'net'
import * as publicIp from 'public-ip'

enum ServerStatus {
  init,
  standby,
  conectedToNetwork,
  shuttingDown,
}

export default class ServerCore {
  private status: ServerStatus
  private cm: ConnectionManager
  private myIp: string
  constructor (
    private myPort: number,
    private coreNodeHost?: string,
    private coreNodePort?: number,
  ) {
    this.status = ServerStatus.init
  }

  public async init() {
    console.log('Initializing Server...')
    const ip = await publicIp.v4()
    this.myIp = ip
    console.log(`Server ip address is set to ...: ${this.myIp}`)
    this.cm = new ConnectionManager(this.myIp, this.myPort)
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
