// 
import {
  RemoteSession,
  UUIDv4
} from "./remote_api/session.js";
import { IntoKeyExpr, KeyExpr } from "./key_expr.js";
import { Sample, Sample_from_SampleWS } from "./sample.js";
import { Reply } from "./query.js";

// Import interface
import { ControlMsg } from "./remote_api/interface/ControlMsg.js";
import { SampleWS } from "./remote_api/interface/SampleWS.js";
import { NewSubscriber, Subscriber } from "./pubsub.js";

// Liveliness API
import { Receiver } from "./session.js";
import { SimpleChannel } from "channel-ts";
import { ReplyWS } from "./remote_api/interface/ReplyWS.js";

// External
import { Duration, TimeDuration } from 'typed-duration'

function executeAsync(func: any) {
  setTimeout(func, 0);
}

interface LivelinessSubscriberOptions {
  handler?: (sample: Sample) => Promise<void>, // TODO: add | Handler,
  history: boolean,
}

interface LivelinessGetOptions {
  handler?: (reply: Reply) => Promise<void>, // TODO: add | Handler,
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

    let remote_subscriber;
    let callback_subscriber = false;

    if (options?.handler !== undefined) {
      let callback = options?.handler;
      callback_subscriber = true;
      const callback_conversion = async function (sample_ws: SampleWS,): Promise<void> {
        let sample: Sample = Sample_from_SampleWS(sample_ws);
        if (callback !== undefined) {
          callback(sample);
        }
      };

      remote_subscriber = await this.remote_session.declare_liveliness_subscriber(_key_expr.toString(), _history, callback_conversion);
    } else {
      remote_subscriber = await this.remote_session.declare_liveliness_subscriber(_key_expr.toString(), _history);
    }

    let subscriber = Subscriber[NewSubscriber](
      remote_subscriber,
      _key_expr,
      callback_subscriber,
    );

    return subscriber;
  }

  async get(key_expr: IntoKeyExpr, options?: LivelinessGetOptions): Promise<Receiver| undefined> {

    let _key_expr = new KeyExpr(key_expr);

    let _timeout_millis: number | undefined = undefined;

    if (options?.timeout !== undefined) {
      _timeout_millis = Duration.milliseconds.from(options?.timeout);
    }

    let chan: SimpleChannel<ReplyWS> = await this.remote_session.get_liveliness(
      _key_expr.toString(),
      _timeout_millis
    );

    let receiver = Receiver.new(chan);

    let callback = options?.handler;
    if (callback !== undefined) {
      executeAsync(async () => {
        for await (const message of chan) {
          // This horribleness comes from SimpleChannel sending a 0 when the channel is closed
          if (message != undefined && (message as unknown as number) != 0) {
            let reply = new Reply(message);
            if (callback != undefined) {
              callback(reply);
            }
          } else {
            break
          }
        }
      });
      return undefined;
    } else {
      return receiver;
    }
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