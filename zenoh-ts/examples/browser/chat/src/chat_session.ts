import { Config, Session, Queryable, Query, LivelinessToken, Reply, Sample, KeyExpr, Subscriber, SampleKind, Publisher, ChannelReceiver } from '@eclipse-zenoh/zenoh-ts';
import { NumberFormat, ZBytesDeserializer, ZBytesSerializer, ZD, zdeserialize, ZDeserializeable, ZS, zserialize, ZSerializeable } from '@eclipse-zenoh/zenoh-ts/ext';

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
		public timestamp: Date = new Date(),
		public user: string = "",
		public message: string = ""
	) {}
	public serializeWithZSerializer(serializer: ZBytesSerializer): void {
		serializer.serialize(this.timestamp.valueOf(), ZS.number(NumberFormat.Uint64));
		serializer.serialize(this.user, ZS.string());
		serializer.serialize(this.message, ZS.string());
	}
	public deserializeWithZDeserializer(deserializer: ZBytesDeserializer): void {
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
		return this.domain_keyexpr.join("history");
	}

	public userFromKeyexpr(keyexpr: KeyExpr): ChatUser | null {
		let keyexprStr = keyexpr.toString();
		// strip the prefix or return null if it doesn't match
		let prefix = this.domain_keyexpr.join("user").toString() + "/";
		if (!keyexprStr.startsWith(prefix)) {
			return null;
		}
		let username = keyexprStr.substring(prefix.length);
		if (!validate_username(username)) {
			return null;
		}
		return new ChatUser(username);
	}

	async requestMessageHistory(session: Session, keyexpr: KeyExpr) {
		let receiver = await session.get(keyexpr) as ChannelReceiver<Reply>;
		log(`[Session] Get from ${keyexpr}`);
		let reply = await receiver.receive().catch(reason => {
			log(`[Session] GetError ${reason}`) 
			return undefined;
		});

		let resp = reply?.result();
		if (resp instanceof Sample) {
			let payload = resp.payload();
			let attachment = resp.attachment()?.toString() ?? "";
			log(`[Session] GetSuccess from ${resp.keyexpr().toString()}, payload size: ${payload.len()}, from user: ${attachment}`);
			let messages: ChatMessage[] = [];
			try {
				messages = zdeserialize(ZD.array(ZD.object(ChatMessage)), payload);
				log(`[Session] Deserialized ${messages.length} messages`);
			} catch (e) {
				log(`[Session] Error deserializing messages: ${e}`);
			}
			return messages;
		} else {
			return [];
		}
	}

	async declareMessageHistoryQueryable(session: Session, keyexpr: KeyExpr): Promise<Queryable> {
		const queryable = await session.declareQueryable(keyexpr, {
			handler: (query: Query) => {
				log(`[Queryable] Replying to query: ${query.selector().toString()}`);
				const response = zserialize(this.messages); //type parameter is ZS.array(ZS.object<ChatMessage>()) but this can be omitted
				query.reply(keyexpr, response, {
					attachment: this.user.username
				});
			},
			complete: true
		});
		log(`[Session] Declare queryable on ${keyexpr}`);
		return queryable;
	}

	async declareMessagePublisher(session: Session, keyexpr: KeyExpr): Promise<Publisher> {
		const publisher = await session.declarePublisher(keyexpr, {});
		log(`[Session] Declare publisher on ${keyexpr}`);
		return publisher;
	}

	async declareMessageSubscriber(session: Session, keyexpr: KeyExpr): Promise<Subscriber> {
		const subscriber = await session.declareSubscriber(keyexpr, {
			handler: (sample: Sample) => {
				let message = sample.payload().toString();
				log(`[Subscriber] Received message: ${message} from ${sample.keyexpr()}`);
				let user = this.userFromKeyexpr(sample.keyexpr());
				if (user) {
					const timestamp = new Date();
					let messageRec = new ChatMessage(timestamp, user.username, message);
					this.messages.push(messageRec);
					if (this.messageCallback) {
						this.messageCallback(user, message);
					}
				} else {
					log(`[Subscriber] Invalid user keyexpr: ${sample.keyexpr()}`);
				}
			}
		});
		log(`[Session] Declare Subscriber on ${keyexpr}`);
		return subscriber;
	}

	async declareLivelinessToken(session: Session, keyexpr: KeyExpr): Promise<LivelinessToken> {
		const token = await session.liveliness().declareToken(keyexpr);
		log(`[Session] Declare liveliness token on ${keyexpr}`);
		return token;
	}

	async declareLivelinessSubscriber(session: Session, keyexpr: KeyExpr): Promise<Subscriber> {
		const subscriber = await session.liveliness().declareSubscriber(keyexpr, {
			handler: (sample: Sample) => {
				let keyexpr = sample.keyexpr();
				let user = this.userFromKeyexpr(keyexpr);
				if (!user) {
					log(`[LivelinessSubscriber] Invalid user keyexpr: ${keyexpr}`);
				} else {
					switch (sample.kind()) {
						case SampleKind.PUT: {
							log(`[LivelinessSubscriber] New alive token ${keyexpr}`);
							this.users.push(user);
							break;
						}
						case SampleKind.DELETE: {
							log(`[LivelinessSubscriber] Dropped token ${keyexpr}`);
							this.users = this.users.filter(u => u.username != user.username);
							break;
						}
					}
				}
				if (this.usersCallback) {
					this.usersCallback();
				}
			},
			history: true
		});
		log(`[Session] Declare liveliness subscriber on ${keyexpr}`);
		return subscriber;
	}

	public async connect(serverUrl: string): Promise<void> {
		let config = new Config(serverUrl);
		const session = await Session.open(config);
		log(`[Session] Open ${serverUrl}`);

		this.session = session;
		this.messages = await this.requestMessageHistory(session, this.getHistoryKeyexpr());
		this.messages_queryable = await this.declareMessageHistoryQueryable(session, this.getHistoryKeyexpr());
		this.messages_publisher = await this.declareMessagePublisher(session, this.getUserKeyexpr());
		this.message_subscriber = await this.declareMessageSubscriber(session, this.getAllUsersKeyexpr());
		this.liveliness_token = await this.declareLivelinessToken(session, this.getUserKeyexpr());
		this.liveliness_subscriber = await this.declareLivelinessSubscriber(session, this.getAllUsersKeyexpr());

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