import {
  RemoteSession,
  UUIDv4
} from "./remote_api/session";
import { IntoKeyExpr, KeyExpr } from "./key_expr";
import { Sample, Sample_from_SampleWS } from "./sample";
import { Reply } from "./query";
// Import interface
import { ControlMsg } from "./remote_api/interface/ControlMsg";
import { SampleWS } from "./remote_api/interface/SampleWS";
import { NewSubscriber, Subscriber } from "./pubsub";
// Liveliness API

interface LivelinessSubscriberOptions {
  callback?: (sample: Sample) => Promise<void>,
  history: boolean,
}

interface LivelinessGetOptions {
  callback?: (reply: Reply) => Promise<void>,
  timeout: boolean,
}

export class Liveliness {

  private remote_session: RemoteSession;

  constructor(remote_session: RemoteSession) {
    this.remote_session = remote_session;
  }

  declare_token(key_expr: IntoKeyExpr): LivelinessToken {
    let _key_expr: KeyExpr = new KeyExpr(key_expr);
    let uuid = this.remote_session.declare_liveliness_token(_key_expr.toString());

    return new LivelinessToken(this.remote_session, uuid)
  }

  declare_subscriber(key_expr: IntoKeyExpr, options?: LivelinessSubscriberOptions): Subscriber {
    console.log(key_expr, options)

    let _key_expr = new KeyExpr(key_expr);

    let _history = false;
    if (options?.history != undefined) {
      _history = options?.history;
    };

    let remote_subscriber;
    let callback_subscriber = false;

    if (options?.callback !== undefined) {
      let callback = options?.callback;
      callback_subscriber = true;
      const callback_conversion = async function (sample_ws: SampleWS,): Promise<void> {
        let sample: Sample = Sample_from_SampleWS(sample_ws);
        if (callback !== undefined) {
          callback(sample);
        }
      };

      remote_subscriber = this.remote_session.declare_liveliness_subscriber(_key_expr.toString(), _history, callback_conversion);
    } else {
      remote_subscriber = this.remote_session.declare_liveliness_subscriber(_key_expr.toString(), _history);
    }

    let subscriber = Subscriber[NewSubscriber](
      remote_subscriber,
      callback_subscriber,
    );

    return subscriber;
  }

  get(key_expr: IntoKeyExpr, options: LivelinessGetOptions) {
    console.log(key_expr, options)
    // @todo;

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

  undeclare() {
    let control_msg: ControlMsg = {
      Liveliness: { "UndeclareToken": this.uuid.toString() },
    };

    this.remote_session.send_ctrl_message(control_msg);
  }
}