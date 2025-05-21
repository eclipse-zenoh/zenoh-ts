// 
import {
  RemoteSession,
  UUIDv4
} from "./remote_api/session.js";
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { Sample, sampleFromSampleWS } from "./sample.js";
import { Reply, replyFromReplyWS } from "./query.js";

// Import interface
import { ControlMsg } from "./remote_api/interface/ControlMsg.js";
import { SampleWS } from "./remote_api/interface/SampleWS.js";
import { Subscriber } from "./pubsub.js";

// Liveliness API
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";

// External
import { Duration, TimeDuration } from 'typed-duration'
import { ChannelReceiver, FifoChannel, Handler, intoCbDropReceiver } from "./remote_api/channels.js";

interface LivelinessSubscriberOptions {
  handler?: Handler<Sample>,
  history: boolean,
}

interface LivelinessGetOptions {
  handler?: Handler<Reply>,
  timeout?: TimeDuration,
}

export class Liveliness {

  constructor(private remoteSession: RemoteSession) {}

  async declareToken(intoKeyExpr: IntoKeyExpr): Promise<LivelinessToken> {
    let keyExpr: KeyExpr = new KeyExpr(intoKeyExpr);
    let uuid = await this.remoteSession.declareLivelinessToken(keyExpr.toString());

    return new LivelinessToken(this.remoteSession, uuid)
  }

  async declareSubscriber(intoKeyExpr: IntoKeyExpr, options?: LivelinessSubscriberOptions): Promise<Subscriber> {

    let keyExpr = new KeyExpr(intoKeyExpr);

    let history = false;
    if (options?.history != undefined) {
      history = options?.history;
    };

    let handler = options?.handler ?? new FifoChannel<Sample>(256);
    let [callback, drop, receiver] = intoCbDropReceiver(handler);

    let callbackWS = (sampleWS: SampleWS): void => {
      let sample: Sample = sampleFromSampleWS(sampleWS);
      callback(sample);
    }

    let remoteSubscriber = await this.remoteSession.declareLivelinessSubscriber(keyExpr.toString(), history, callbackWS, drop);

    let subscriber = new Subscriber(
      remoteSubscriber,
      keyExpr,
      receiver
    );

    return subscriber;
  }

  async get(intoKeyExpr: IntoKeyExpr, options?: LivelinessGetOptions): Promise<ChannelReceiver<Reply>| undefined> {

    let keyExpr = new KeyExpr(intoKeyExpr);

    let timeoutMillis: number | undefined = undefined;

    if (options?.timeout !== undefined) {
      timeoutMillis = Duration.milliseconds.from(options?.timeout);
    }

    let handler = options?.handler ?? new FifoChannel<Reply>(256);
    let [callback, drop, receiver] = intoCbDropReceiver(handler);

    let callbackWS = (replyWS: ReplyWS): void => {
      let reply: Reply = replyFromReplyWS(replyWS);
      callback(reply);
    }

    await this.remoteSession.getLiveliness(
      keyExpr.toString(),
      callbackWS,
      drop,
      timeoutMillis,
    );

    return receiver;
  }
}

export class LivelinessToken {
  constructor(
    private remoteSession: RemoteSession,
    private uuid: UUIDv4
  ) {
    this.remoteSession = remoteSession;
    this.uuid = uuid;
  }

  async undeclare() {
    let controlMsg: ControlMsg = {
      Liveliness: { "UndeclareToken": this.uuid.toString() },
    };

    await this.remoteSession.sendCtrlMessage(controlMsg);
  }
}