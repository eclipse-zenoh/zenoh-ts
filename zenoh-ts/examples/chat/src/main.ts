import { Config, Session, Queryable, Query, Liveliness, LivelinessToken, Reply, Sample, RecvErr, Receiver, KeyExpr, Subscriber, SampleKind, Publisher } from '@eclipse-zenoh/zenoh-ts';
import { Duration } from 'typed-duration';
import { validate_keyexpr } from './validate_keyexpr';

function validate_username(username: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(username) && validate_keyexpr(username);
}

class ChatUser {
	username: string;
	constructor(username: string) {
		this.username = username;
	}
	public static fromString(username: string): ChatUser | null {
		if (!validate_username(username)) {
			return null
		}
		return new ChatUser(username);
	}
	public static fromKeyexpr(keyexpr: KeyExpr): ChatUser | null {
		let parts = (keyexpr.toString()).split("/");
		if (parts.length < 2 || parts[0] != "user") {
			return null;
		}
		let username = parts[1];
		if (!validate_username(username)) {
			return null;
		}
		return new ChatUser(username);
	}
	public toKeyexpr(): KeyExpr {
		return new KeyExpr(`user/${this.username}`);
	}
	public toString(): string {
		return this.username;
	}
}

class ChatSession {
	session: Session | null = null;
	liveliness_token: LivelinessToken | null = null;
	liveliness_subscriber: Subscriber | null = null;
	messages_queryable: Queryable | null = null;
	messages_publisher: Publisher | null = null;
	message_subscriber: Subscriber | null = null;

	usersCallback: (() => void) | null = null;
	messageCallback: ((message: string) => void) | null = null;

	user: ChatUser;
	users: ChatUser[] = [];

	constructor(user: ChatUser) {
		this.user = user;
	}

	public async connect(serverName: string, serverPort: string): Promise<void> {
		let locator = `ws/${serverName}:${serverPort}`;
		let config = new Config(locator);
		this.session = await Session.open(config);
		log(`[Session] Connected to zenohd on ${locator}`);

		let keyexpr = this.user.toKeyexpr();

		this.messages_queryable = await this.session.declare_queryable(keyexpr, {
			callback: (query: Query) => {
				log(`[Queryable] Replying to query: ${query.selector().toString()}`);
				query.reply(keyexpr, this.user.username);
			},
			complete: true
		});
		log(`[Session] Created queryable on ${keyexpr}`);

		this.messages_publisher = this.session.declare_publisher(keyexpr, {});

		this.message_subscriber = await this.session.declare_subscriber(keyexpr, (sample) => {
			log(`[Subscriber] Received message: ${sample.payload.toString()} from ${sample.keyexpr().toString()}`);
			if (this.messageCallback) {
				this.messageCallback(sample.payload.toString());
			}
			return Promise.resolve();
		});

		this.liveliness_token = this.session.liveliness().declare_token(keyexpr);

		// Subscribe to changes of users presence
		this.liveliness_subscriber = this.session.liveliness().declare_subscriber("user/*", {
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
	}

	onChangeUsers(callback: () => void) {
		this.usersCallback = callback;
	}

	onNewMessage(callback: (message: string) => void) {
		this.messageCallback = callback;
	}

	getUsers(): ChatUser[] {
		return this.users;
	}

	async send_message(message: string) {
		if (this.messages_publisher) {
			log(`[Publisher] Sending message: ${message}`);
			await this.messages_publisher.put(message);
		}
	}

	async disconnect() {
		if (this.session) {
			await this.session.close();
			this.session = null;
			this.liveliness_token = null;
			this.messages_queryable = null;
			this.liveliness_subscriber = null;
			this.messages_publisher = null;
			this.message_subscriber = null;
			this.users = [];
			if (this.usersCallback) {
				this.usersCallback();
			}
		}
	}
}

let globalChatSession: ChatSession | null = null;

document.addEventListener('DOMContentLoaded', () => {
	const toggleLogButton = document.getElementById('toggle-log-button');
	const technicalLogPanel = document.getElementById('technical-log-panel');
	const connectButton = document.getElementById('connect-button');
	const disconnectButton = document.getElementById('disconnect-button');
	const sendButton = document.getElementById('send-button');
	const serverNameInput = document.getElementById('server-name') as HTMLInputElement;
	const serverPortInput = document.getElementById('server-port') as HTMLInputElement;
	const usernameInput = document.getElementById('username') as HTMLInputElement;
	const messageInput = document.getElementById('message-input') as HTMLInputElement;
	const usersList = document.getElementById('users') as HTMLUListElement;
	const chatLog = document.getElementById('chat-log') as HTMLDivElement;

	const adjectives = [
		'adorable', 'beautiful', 'clean', 'drab', 'elegant', 'fancy', 'glamorous', 'handsome', 'long', 'magnificent',
		'old-fashioned', 'plain', 'quaint', 'sparkling', 'ugliest', 'unsightly', 'angry', 'bewildered', 'clumsy', 'defeated',
		'embarrassed', 'fierce', 'grumpy', 'helpless', 'itchy', 'jealous', 'lazy', 'mysterious', 'nervous', 'obnoxious'
	];
	const animals = [
		'ant', 'bear', 'cat', 'dog', 'elephant', 'frog', 'giraffe', 'horse', 'iguana', 'jaguar', 'kangaroo', 'lion', 'monkey',
		'newt', 'owl', 'penguin', 'quail', 'rabbit', 'snake', 'tiger', 'unicorn', 'vulture', 'walrus', 'xerus', 'yak', 'zebra'
	];
	let randomUsername = `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${animals[Math.floor(Math.random() * animals.length)]}`;
	usernameInput.value = randomUsername;

	toggleLogButton?.addEventListener('click', () => {
		if (technicalLogPanel) {
			technicalLogPanel.classList.toggle('hidden');
		}
	});

	connectButton?.addEventListener('click', () => {
		log_catch(async () => {
			let user = ChatUser.fromString(usernameInput.value);
			if (!user) {
				log(`Invalid username: ${usernameInput.value}`);
				return;
			}
			let chatSession: ChatSession = new ChatSession(user);
			await chatSession.connect(serverNameInput.value, serverPortInput.value);
			chatSession.onChangeUsers(() => {
				usersList.innerHTML = '';
				chatSession.getUsers().forEach(user => {
					const li = document.createElement('li');
					li.textContent = user.toString();
					usersList.appendChild(li);
				});
			});
			chatSession.onNewMessage((message) => {
				const messageElement = document.createElement('div');
				messageElement.textContent = message;
				chatLog.appendChild(messageElement);
			});
			if (globalChatSession) {
				await globalChatSession.disconnect();
			}
			globalChatSession = chatSession;
		});
	});

	disconnectButton?.addEventListener('click', () => {
		log_catch(async () => {
			if (globalChatSession) {
				await globalChatSession.disconnect();
				globalChatSession = null;
			}
		});
	});

	sendButton?.addEventListener('click', () => {
		if (globalChatSession) {
			globalChatSession.send_message(messageInput.value);
			messageInput.value = '';
		}
	});
});

function log(message: string) {
	const technicalLog = document.getElementById('technical-log');
	const timestamp = new Date().toLocaleTimeString();
	const logMessage = document.createElement('div');
	logMessage.textContent = `[${timestamp}] ${message}`;
	technicalLog?.appendChild(logMessage);
}

async function log_catch(asyncFunc: () => Promise<void>) {
	try {
		await asyncFunc();
	} catch (error) {
		log(`Error: ${error}`);
	}
}
