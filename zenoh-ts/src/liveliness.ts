// 
import {
  RemoteSession,
  UUIDv4
} from "./remote_api/session.js";
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { Sample, Sample_from_SampleWS } from "./sample.js";
import { Reply, Reply_from_ReplyWS } from "./query.js";

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
    let _key_expr: KeyExpr = new KeyExpr(key_expr);
    let uuid = await this.remote_session.declare_liveliness_token(_key_expr.toString());

    return new LivelinessToken(this.remote_session, uuid)
  }

  async declare_subscriber(key_expr: IntoKeyExpr, options?: LivelinessSubscriberOptions): Promise<Subscriber> {

    let _key_expr = new KeyExpr(key_expr);

    let _history = false;
    if (options?.history != undefined) {
      _history = options?.history;
    };

    let handler = options?.handler ?? new FifoChannel<Sample>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callback_ws = (sample_ws: SampleWS): void => {
      let sample: Sample = Sample_from_SampleWS(sample_ws);
      callback(sample);
    }

    let remote_subscriber = await this.remote_session.declare_liveliness_subscriber(_key_expr.toString(), _history, callback_ws, drop);

    let subscriber = Subscriber[NewSubscriber](
      remote_subscriber,
      _key_expr,
      receiver
    );

    return subscriber;
  }

  async get(key_expr: IntoKeyExpr, options?: LivelinessGetOptions): Promise<ChannelReceiver<Reply>| undefined> {

    let _key_expr = new KeyExpr(key_expr);

    let _timeout_millis: number | undefined = undefined;

    if (options?.timeout !== undefined) {
      _timeout_millis = Duration.milliseconds.from(options?.timeout);
    }

    let handler = options?.handler ?? new FifoChannel<Reply>(256);
    let [callback, drop, receiver] = into_cb_drop_receiver(handler);

    let callback_ws = (reply_ws: ReplyWS): void => {
      let reply: Reply = Reply_from_ReplyWS(reply_ws);
      callback(reply);
    }

    await this.remote_session.get_liveliness(
      _key_expr.toString(),
      callback_ws,
      drop,
      _timeout_millis,
    );

    return receiver;
  }
}

export class LivelinessToken {
  private remote_session: RemoteSession;
  private uuid: UUIDv4;

  constructor(
    remote_session: RemoteSession,
    uuid: UUIDv4
  ) {
    this.remote_session = remote_session;
    this.uuid = uuid;
  }

  async undeclare() {
    let control_msg: ControlMsg = {
      Liveliness: { "UndeclareToken": this.uuid.toString() },
    };

    await this.remote_session.send_ctrl_message(control_msg);
  }
}