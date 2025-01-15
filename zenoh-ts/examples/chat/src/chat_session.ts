import { Config, Session, Queryable, Query, Liveliness, LivelinessToken, Reply, Sample, Receiver, KeyExpr, Subscriber, SampleKind, Publisher, deserialize_string } from '@eclipse-zenoh/zenoh-ts';
import { validate_keyexpr } from './validate_keyexpr';

export function validate_username(username: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(username) && validate_keyexpr(username);
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
	public static fromKeyexpr(keyexpr: KeyExpr): ChatUser | null {
		let parts = (keyexpr.toString()).split("/");
		if (parts.length < 3 || parts[0] != "chat" || parts[1] != "user") {
			return null;
		}
		let username = parts[2];
		if (!validate_username(username)) {
			return null;
		}
		return new ChatUser(username);
	}
	public toKeyexpr(): KeyExpr {
		return new KeyExpr(`chat/user/${this.username}`);
	}
	public toString(): string {
		return this.username;
	}
}

export interface ChatMessage {
	t: string; // timestamp
	u: string; // username
	m: string; // message
}

export class ChatSession {
	session: Session | null = null;
	liveliness_token: LivelinessToken | null = null;
	liveliness_subscriber: Subscriber | null = null;
	messages_queryable: Queryable | null = null;
	messages_publisher: Publisher | null = null;
	message_subscriber: Subscriber | null = null;

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

	user: ChatUser;
	users: ChatUser[] = [];
	messages: ChatMessage[] = [];

	constructor(user: ChatUser) {
		this.user = user;
	}

	public async connect(serverName: string, serverPort: string): Promise<void> {
		let locator = `ws/${serverName}:${serverPort}`;
		let config = new Config(locator);
		this.session = await Session.open(config);
		log(`[Session] Open ${locator}`);

		let keyexpr = this.user.toKeyexpr();

		let receiver = await this.session.get("chat/messages") as Receiver;
		log(`[Session] Get from chat/messages`);
		let reply = await receiver.receive();
		if (reply instanceof Reply) {
			let resp = reply.result();
			if (resp instanceof Sample) {
				let payload = deserialize_string(resp.payload().to_bytes());
				log(`[Session] GetSuccess from ${resp.keyexpr().toString()}, messages: ${payload}`);
				this.messages = JSON.parse(payload);
			}
		} else {
			log(`[Session] GetError ${reply}`);
		}

		this.messages_queryable = await this.session.declare_queryable("chat/messages", {
			handler: async (query: Query) => {
				log(`[Queryable] Replying to query: ${query.selector().toString()}`);
				const response = JSON.stringify(this.messages);
				query.reply("chat/messages", response);
			},
			complete: true
		});
		log(`[Session] Declare queryable on ${keyexpr}`);

		this.messages_publisher = this.session.declare_publisher(keyexpr, {});
		log(`[Session] Declare publisher on ${keyexpr}`);

		this.message_subscriber = await this.session.declare_subscriber("chat/user/*",
			(sample: Sample) => {
				let message = deserialize_string(sample.payload().to_bytes());
				log(`[Subscriber] Received message: ${message} from ${sample.keyexpr().toString()}`);
				let user = ChatUser.fromKeyexpr(sample.keyexpr());
				if (user) {
					const timestamp = new Date().toISOString();
					this.messages.push({ t: timestamp, u: user.username, m: message });
					if (this.messageCallback) {
						this.messageCallback(user, message);
					}
				}
				return Promise.resolve();
			}
		);
		log(`[Session] Declare Subscriber on chat/user/*`);

		this.liveliness_token = this.session.liveliness().declare_token(keyexpr);
		log(`[Session] Declare liveliness token on ${keyexpr}`);

		// Subscribe to changes of users presence
		this.liveliness_subscriber = this.session.liveliness().declare_subscriber("chat/user/*", {
			callback: (sample: Sample) => {
				let keyexpr = sample.keyexpr();
				let user = ChatUser.fromKeyexpr(keyexpr);
				if (!user) {
					log(`Invalid user keyexpr: ${keyexpr.toString()}`);
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
		log(`[Session] Declare liveliness subscriber on chat/user/*`);

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