import * as net from 'net'

const client = net.createConnection({ host: 'localhost', port: 9999 }, () => {
  console.log('connect')
  client.write('hello')
})

client.on('data', (data) => {
  console.log(data.toString())
})

client.on('end', () => {
  console.log('disconnect from server')
})
