import * as net from 'net'

const handData = (data: Buffer) => {
  console.log(data.toString())
}

const server = net.createServer((connection) => {
  console.log('server connect')

  connection.on('data', handData)

  connection.on('end', () => {
    console.log('connection disconnect')
  })
})

server.on('error', (err) => {
  throw err
})


server.listen('9999', () => {
  console.log('server bound')
})
