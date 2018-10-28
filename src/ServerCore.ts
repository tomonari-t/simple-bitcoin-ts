enum ServerStatus {
  init,
  standby,
  conectedToNetwork,
  shuttingDown,
}

class ServerCore {
  private status: ServerStatus
  constructor() {
    this.status = ServerStatus.init
    console.log('Initializing Server...')
  }

  public start() {
    this.status = ServerStatus.standby
  }

  public joinNetwork() {
    this.status = ServerStatus.conectedToNetwork
  }

  public shutdown() {
    this.status = ServerStatus.shuttingDown
    console.log('Shutting down...')
  }

  public getCurrentStatus() {
    return this.status
  }
}
