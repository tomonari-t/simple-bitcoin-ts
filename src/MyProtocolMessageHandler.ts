import * as util from 'util'
export default class MyProtocolMessageHandler {
  constructor() {
    console.log('Initializing MyProtocolMessageHandler')
  }

  public handleMsg(msg: any) {
    // TODO:
    console.log(`MyProtocolMessageHandler received ${util.inspect(msg)}`)
  }
}
