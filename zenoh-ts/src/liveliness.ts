// 
import {
  RemoteSession,
  UUIDv4
} from "./remote_api/session.js";
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { Sample, SampleFromSampleWS } from "./sample.js";
import { Reply, ReplyFromReplyWS } from "./query.js";

// Import interface
import { ControlMsg } from "./remote_api/interface/ControlMsg.js";
import { SampleWS } from "./remote_api/interface/SampleWS.js";
import { Subscriber } from "./pubsub.js";

// Liveliness API
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";

// External
import { Duration, TimeDuration } from 'typed-duration'
import { ChannelReceiver, FifoChannel, Handler, into_cb_drop_receiver } from "./remote_api/channels.js";

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

  async declare_token(intoKeyExpr: IntoKeyExpr): Promise<LivelinessToken> {
    let keyExpr: KeyExpr = new KeyExpr(intoKeyExpr);
    let uuid = await this.remoteSession.declare_liveliness_token(keyExpr.toString());

    return new LivelinessToken(this.remoteSession, uuid)
  }

  async declare_subscriber(intoKeyExpr: IntoKeyExpr, options?: LivelinessSubscriberOptions): Promise<Subscriber> {

    let keyExpr = new KeyExpr(intoKeyExpr);

    let history = false;
    if (options?.history != undefined) {
      history = options?.history;
    };

    let handler = options?.handler ?? new FifoChannel<Sample>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callbackWS = (sampleWS: SampleWS): void => {
      let sample: Sample = SampleFromSampleWS(sampleWS);
      callback(sample);
    }

    let remoteSubscriber = await this.remoteSession.declare_liveliness_subscriber(keyExpr.toString(), history, callbackWS, drop);

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
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callbackWS = (replyWS: ReplyWS): void => {
      let reply: Reply = ReplyFromReplyWS(replyWS);
      callback(reply);
    }

    await this.remoteSession.get_liveliness(
      keyExpr.toString(),
      callbackWS,
      drop,
      timeoutMillis,
    );

    return receiver;
  }
}

export class LivelinessToken {
  private remoteSession: RemoteSession;
  private uuid: UUIDv4;

  constructor(
    remoteSession: RemoteSession,
    uuid: UUIDv4
  ) {
    this.remoteSession = remoteSession;
    this.uuid = uuid;
  }

  async undeclare() {
    let controlMsg: ControlMsg = {
      Liveliness: { "UndeclareToken": this.uuid.toString() },
    };

    await this.remoteSession.send_ctrl_message(controlMsg);
  }
}