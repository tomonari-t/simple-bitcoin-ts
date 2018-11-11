import ServerCore from './ServerCore'

let myP2PServer: ServerCore

const shutdown = async () => {
  myP2PServer.shutdown()
  process.exit()
}

const main = async () => {
  myP2PServer = new ServerCore(50022, '192.168.11.14', 50091)
  await myP2PServer.init()
  myP2PServer.start()
  myP2PServer.joinNetwork()

  process.on('SIGINT', async() => {
    await shutdown()
  })
}

main()