import * as semver from 'semver'
import * as util from 'util'

const PROTOCOL_NAME = 'simpleBitcoinProtocol'
const VERSION = '0.1.0'

export enum MessageType {
  add,
  remove,
  coreList,
  requestCoreList,
  ping,
  addAsEdge,
  removeEdge
}

export enum ErrorType {
  protocolUnmatch,
  versionUnmatch,
}

export enum SuccessType {
  withPayload,
  withoutPayload,
}

interface IMessage {
  protocol: string
  version: string
  msgType: MessageType
  myPort: number
  payload: any | undefined
}

interface IParsedMessage {
  result: 'ok' | 'error'
  reason: ErrorType | SuccessType
  msgType: MessageType
  myPort: number
  payload: any | undefined
}

export default class MessageManager {
  public build(msgType: MessageType, myPort = 9999, payload = undefined) {
    const message: IMessage = {
      protocol: PROTOCOL_NAME,
      version: VERSION,
      msgType: msgType,
      myPort,
      payload: undefined,
    }

    if (payload) {
      message.payload = payload
    }

    return JSON.stringify(message)
  }

  public parse(messageJSON: string): IParsedMessage {
    const msg = JSON.parse(messageJSON)
    const { protocol, version, msgType, payload, myPort }: IMessage = msg

    if (protocol !== PROTOCOL_NAME) {
      return {
        result: 'error',
        reason: ErrorType.protocolUnmatch,
        msgType: undefined,
        myPort,
        payload: undefined,
      }
    } else if (semver.gt(version, VERSION)) {
      return {
        result: 'error',
        reason: ErrorType.versionUnmatch,
        myPort,
        msgType: undefined,
        payload: undefined,
      }
    } else if (msgType === MessageType.coreList) {
      return {
        result: 'ok',
        reason: SuccessType.withPayload,
        msgType,
        myPort,
        payload,
      }
    } else {
      return {
        result: 'ok',
        reason: SuccessType.withoutPayload,
        msgType,
        myPort,
        payload: undefined,
      }
    }

  }
}