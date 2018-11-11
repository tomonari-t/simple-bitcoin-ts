import ServerCore from './ServerCore'

let myP2PServer: ServerCore

const shutdown = async () => {
  await myP2PServer.shutdown()
  process.exit()
}

const main = async () => {
  myP2PServer = new ServerCore(50091)
  await myP2PServer.init()
  myP2PServer.start()

  process.on('SIGINT', async() => {
    await shutdown()
  })
}

main()
