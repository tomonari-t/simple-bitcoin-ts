import ClientCore from './ClientCore'

let myP2PClient: ClientCore

const shutdown = async () => {
  await myP2PClient.shutdown()
  process.exit()
}

const main = async () => {
  myP2PClient = new ClientCore(
    50095,
    '192.168.11.14',
    50091,
  )
  await myP2PClient.init()
  await myP2PClient.start()

  process.on('SIGINT', async() => {
    await shutdown()
  })
}

main()
