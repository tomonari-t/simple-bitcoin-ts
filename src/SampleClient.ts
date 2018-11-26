import ClientCore from './ClientCore'
import { MessageType } from './MessageManager';

let myP2PClient: ClientCore

const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

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

  await wait(2000)

  const msg = {
    message: 'test',
  }
  await myP2PClient.sendMsgToMyCoreNode(MessageType.enhanced, msg)
}

main()
