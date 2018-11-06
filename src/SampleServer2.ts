import ServerCore from './ServerCore'

let myP2PServer: ServerCore

const shutdown = () => {
  myP2PServer.shutdown()
  process.exit()
}

const main = async () => {
  myP2PServer = new ServerCore(50022, '127.0.0.1', 50091)
  await myP2PServer.init()
  myP2PServer.start()
  myP2PServer.joinNetwork()
  //catches ctrl+c event
  process.on('SIGINT', shutdown)
}

main()