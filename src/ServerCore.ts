import { ConnectionManager } from "./ConnectionManager"
import * as net from 'net'

enum ServerStatus {
  init,
  standby,
  conectedToNetwork,
  shuttingDown,
}

class ServerCore {
  private status: ServerStatus
  private cm: ConnectionManager
  private myIp: string
  private
  constructor(
    private myPort: number,
    private coreNodeHost: string,
    private coreNodePort: number,
  ) {
    this.status = ServerStatus.init
    console.log('Initializing Server...')
    this.myIp = this.getMyIp()
    this.cm = new ConnectionManager(this.myIp, this.myPort)
  }

  public start() {
    this.status = ServerStatus.standby
    this.cm.start()
  }

  public joinNetwork() {
    if (!this.coreNodeHost) {
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

  private getMyIp() {
    const s = net.createConnection({ host: '8.8.8.8', port: 80 })
    const { address } = s.address() as net.AddressInfo
    return address
  }
}
