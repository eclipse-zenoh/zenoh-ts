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
import { NewSubscriber, Subscriber } from "./pubsub.js";

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

  private remote_session: RemoteSession;

  constructor(remote_session: RemoteSession) {
    this.remote_session = remote_session;
  }

  async declare_token(key_expr: IntoKeyExpr): Promise<LivelinessToken> {
    let keyExpr: KeyExpr = new KeyExpr(key_expr);
    let uuid = await this.remote_session.declare_liveliness_token(keyExpr.toString());

    return new LivelinessToken(this.remote_session, uuid)
  }

  async declare_subscriber(key_expr: IntoKeyExpr, options?: LivelinessSubscriberOptions): Promise<Subscriber> {

    let keyExpr = new KeyExpr(key_expr);

    let history = false;
    if (options?.history != undefined) {
      history = options?.history;
    };

    let handler = options?.handler ?? new FifoChannel<Sample>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callbackWS = (sample_ws: SampleWS): void => {
      let sample: Sample = SampleFromSampleWS(sample_ws);
      callback(sample);
    }

    let remoteSubscriber = await this.remote_session.declare_liveliness_subscriber(keyExpr.toString(), history, callbackWS, drop);

    let subscriber = Subscriber[NewSubscriber](
      remoteSubscriber,
      keyExpr,
      receiver
    );

    return subscriber;
  }

  async get(key_expr: IntoKeyExpr, options?: LivelinessGetOptions): Promise<ChannelReceiver<Reply>| undefined> {

    let keyExpr = new KeyExpr(key_expr);

    let timeoutMillis: number | undefined = undefined;

    if (options?.timeout !== undefined) {
      timeoutMillis = Duration.milliseconds.from(options?.timeout);
    }

    let handler = options?.handler ?? new FifoChannel<Reply>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callbackWS = (reply_ws: ReplyWS): void => {
      let reply: Reply = ReplyFromReplyWS(reply_ws);
      callback(reply);
    }

    await this.remote_session.get_liveliness(
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
    remote_session: RemoteSession,
    uuid: UUIDv4
  ) {
    this.remoteSession = remote_session;
    this.uuid = uuid;
  }

  async undeclare() {
    let controlMsg: ControlMsg = {
      Liveliness: { "UndeclareToken": this.uuid.toString() },
    };

    await this.remoteSession.send_ctrl_message(controlMsg);
  }
}