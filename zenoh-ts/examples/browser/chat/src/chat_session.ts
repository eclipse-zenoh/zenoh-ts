import { Config, Session, Queryable, Query, Liveliness, LivelinessToken, Reply, Sample, Receiver, KeyExpr, Subscriber, SampleKind, Publisher } from '@eclipse-zenoh/zenoh-ts';
import { BigIntFormat, NumberFormat, ZBytesDeserializer, ZBytesSerializer, ZD, ZDeserializeable, ZS, ZSerializeable } from '@eclipse-zenoh/zenoh-ts/ext';

export function validate_username(username: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(username);
}

export class ChatUser {
	username: string;
	constructor(username: string) {
		this.username = username;
	}
	public static fromString(username: string): ChatUser | null {
		if (!validate_username(username)) {
			return null;
		}
		return new ChatUser(username);
	}
	public toString(): string {
		return this.username;
	}
}

export class ChatMessage implements ZSerializeable, ZDeserializeable {
	constructor(
		public timestamp: Date,
		public user: string,
		public message: string
	) {}
	public serialize_with_zserializer(serializer: ZBytesSerializer): void {
		serializer.serialize(this.timestamp.valueOf(), ZS.number(NumberFormat.Uint64));
		serializer.serialize(this.user, ZS.string());
		serializer.serialize(this.message, ZS.string());
	}

	public deserialize_with_zdeserializer(deserializer: ZBytesDeserializer): void {
		this.timestamp = new Date(deserializer.deserialize(ZD.number(NumberFormat.Uint64)));
		this.user = deserializer.deserialize(ZD.string());
		this.message = deserializer.deserialize(ZD.string());
	}
}

export class ChatSession {
	constructor(public readonly domain_keyexpr: KeyExpr, public readonly user: ChatUser) {}

	session: Session | null = null;
	liveliness_token: LivelinessToken | null = null;
	liveliness_subscriber: Subscriber | null = null;
	messages_queryable: Queryable | null = null;
	messages_publisher: Publisher | null = null;
	message_subscriber: Subscriber | null = null;
	users: ChatUser[] = [];
	messages: ChatMessage[] = [];

	usersCallback: (() => void) | null = null;
	messageCallback: ((user: ChatUser, message: string) => void) | null = null;
	onConnectCallback: ((chatSession: ChatSession) => void) | null = null;
	onDisconnectCallback: ((chatSession: ChatSession) => void) | null = null;

	onConnect(callback: (chatSession: ChatSession) => void) {
		this.onConnectCallback = callback;
	}

	onDisconnect(callback: (chatSession: ChatSession) => void) {
		this.onDisconnectCallback = callback;
	}

	onChangeUsers(callback: (chatSession: ChatSession) => void) {
		this.usersCallback = () => callback(this);
	}

	onNewMessage(callback: (chatSession: ChatSession, user: ChatUser, message: string) => void) {
		this.messageCallback = (user, message) => callback(this, user, message);
	}

	public getUserKeyexpr(): KeyExpr {
		return this.domain_keyexpr.join("user").join(this.user.username);
	}

	public getAllUsersKeyexpr(): KeyExpr {
		return this.domain_keyexpr.join("user/*");
	}

	public getHistoryKeyexpr(): KeyExpr {
		return this.domain_keyexpr.join("messages");
	}

	public userFromKeyexpr(keyexpr: KeyExpr): ChatUser | null {
		let keyexpr_str = keyexpr.toString();
		// strip the prefix or return null if it doesn't match
		let prefix = this.domain_keyexpr.join("user").toString() + "/";
		if (!keyexpr_str.startsWith(prefix)) {
			return null;
		}
		let username = keyexpr_str.substring(prefix.length);
		if (!validate_username(username)) {
			return null;
		}
		return new ChatUser(username);
	}

	async requestMessageHistory() {
		if (!this.session) {
			log(`[Session] Session is null in requestMessageHistory`);
			return;
		}
		let keyexpr = this.getHistoryKeyexpr();
		let receiver = await this.session.get(keyexpr) as Receiver;
		log(`[Session] Get from ${keyexpr}`);
		let reply = await receiver.receive();
		if (reply instanceof Reply) {
			let resp = reply.result();
			if (resp instanceof Sample) {
				let payload = resp.payload().to_string();
				let attachment = resp.attachment()?.to_string() ?? "";
				log(`[Session] GetSuccess from ${resp.keyexpr().toString()}, messages: ${payload}, from user: ${attachment}`);
				this.messages = JSON.parse(payload);
			}
		} else {
			log(`[Session] GetError ${reply}`);
		}
	}

	async declareMessageHistoryQueryable() {
		if (!this.session) {
			log(`[Session] Session is null in declareMessageHistoryQueryable`);
			return;
		}
		let keyexpr = this.getHistoryKeyexpr();
		this.messages_queryable = await this.session.declare_queryable(keyexpr, {
			handler: async (query: Query) => {
				log(`[Queryable] Replying to query: ${query.selector().toString()}`);
				const response = JSON.stringify(this.messages);
				query.reply(keyexpr, response, {
					attachment: this.user.username
				});
			},
			complete: true
		});
		log(`[Session] Declare queryable on ${keyexpr}`);
	}

	async declareMessagePublisher() {
		if (!this.session) {
			log(`[Session] Session is null in declareMessagePublisher`);
			return;
		}
		let keyexpr = this.getUserKeyexpr();
		this.messages_publisher = this.session.declare_publisher(keyexpr, {});
		log(`[Session] Declare publisher on ${keyexpr}`);
	}

	async declareMessageSubscriber() {
		if (!this.session) {
			log(`[Session] Session is null in declareMessageSubscriber`);
			return;
		}
		let keyexpr = this.getAllUsersKeyexpr();
		this.message_subscriber = await this.session.declare_subscriber(keyexpr, {
			handler: (sample: Sample) => {
				let message = sample.payload().to_string();
				log(`[Subscriber] Received message: ${message} from ${sample.keyexpr()}`);
				let user = this.userFromKeyexpr(sample.keyexpr());
				if (user) {
					const timestamp = new Date();
					let message_rec = new ChatMessage(timestamp, user.username, message);
					this.messages.push(message_rec);
					if (this.messageCallback) {
						this.messageCallback(user, message);
					}
				} else {
					log(`[Subscriber] Invalid user keyexpr: ${sample.keyexpr()}`);
				}
				return Promise.resolve();
			}
		});
		log(`[Session] Declare Subscriber on ${keyexpr}`);
	}

	async declareLivelinessToken() {
		if (!this.session) {
			log(`[Session] Session is null in declareLivelinessToken`);
			return;
		}
		let keyexpr = this.getUserKeyexpr();
		this.liveliness_token = this.session.liveliness().declare_token(keyexpr);
		log(`[Session] Declare liveliness token on ${keyexpr}`);
	}

	async declareLivelinessSubscriber() {
		if (!this.session) {
			log(`[Session] Session is null in declareLivelinessSubscriber`);
			return;
		}
		let keyexpr = this.getAllUsersKeyexpr();
		this.liveliness_subscriber = this.session.liveliness().declare_subscriber(keyexpr, {
			handler: (sample: Sample) => {
				let keyexpr = sample.keyexpr();
				let user = this.userFromKeyexpr(keyexpr);
				if (!user) {
					log(`[LivelinessSubscriber] Invalid user keyexpr: ${keyexpr}`);
				} else {
					switch (sample.kind()) {
						case SampleKind.PUT: {
							log(
								`[LivelinessSubscriber] New alive token ${keyexpr}`
							);
							this.users.push(user);
							break;
						}
						case SampleKind.DELETE: {
							log(
								`[LivelinessSubscriber] Dropped token ${keyexpr}`
							);
							this.users = this.users.filter(u => u.username != user.username);
							break;
						}
					}
				}
				if (this.usersCallback) {
					this.usersCallback();
				}
				return Promise.resolve();
			},
			history: true
		});
		log(`[Session] Declare liveliness subscriber on ${keyexpr}`);
	}

	public async connect(serverUrl: string): Promise<void> {
		let config = new Config(serverUrl);
		this.session = await Session.open(config);
		log(`[Session] Open ${serverUrl}`);

		this.requestMessageHistory();
		this.declareMessageHistoryQueryable();
		this.declareMessagePublisher();
		this.declareMessageSubscriber();
		this.declareLivelinessToken();
		this.declareLivelinessSubscriber();

		if (this.onConnectCallback) {
			this.onConnectCallback(this);
		}
	}

	getUser(): ChatUser {
		return this.user;
	}

	getUsers(): ChatUser[] {
		return this.users;
	}

	getMessages(): ChatMessage[] {
		return this.messages;
	}

	async sendMessage(message: string) {
		if (this.messages_publisher) {
			log(`[Publisher] Put message: ${message}`);
			await this.messages_publisher.put(message);
		}
	}

	async disconnect() {
		if (this.session) {
			await this.session.close();
			log(`[Session] Close`);
			this.session = null;
			this.liveliness_token = null;
			this.messages_queryable = null;
			this.liveliness_subscriber = null;
			this.messages_publisher = null;
			this.message_subscriber = null;
			this.users = [];
			this.messages = [];
			if (this.onDisconnectCallback) {
				this.onDisconnectCallback(this);
			}
		}
	}
}

function log(message: string) {
	const technicalLog = document.getElementById('technical-log') as HTMLDivElement;
	const timestamp = new Date().toLocaleTimeString();
	const logMessage = document.createElement('div');
	logMessage.textContent = `[${timestamp}] ${message}`;
	technicalLog.appendChild(logMessage);
	technicalLog.scrollTop = technicalLog.scrollHeight; // Scroll to the latest log message
}