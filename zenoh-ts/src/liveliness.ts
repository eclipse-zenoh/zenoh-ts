import {
  RemoteSession,
  UUIDv4
} from "./remote_api/session";
import { IntoKeyExpr, KeyExpr } from "./key_expr";
import { Sample } from "./sample";
import { Reply } from "./query";
// Import interface
import { ControlMsg } from "./remote_api/interface/ControlMsg";
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

  declare_subscriber(key_expr: IntoKeyExpr, options?: LivelinessSubscriberOptions) {
    console.log(key_expr,options)
    // let _history = false;
    // if (options?.history != undefined) {
    //   _history = options?.history;
    // };

    // let subscriber = this.remote_session.declare_liveliness_subscriber(key_expr,);
  }

  get(key_expr: IntoKeyExpr, options: LivelinessGetOptions) {
    console.log(key_expr,options)
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