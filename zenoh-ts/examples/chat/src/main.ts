import { Config, Session, Queryable, Query, Liveliness, LivelinessToken, Reply, Sample, RecvErr, Receiver, KeyExpr, Subscriber, SampleKind } from '@eclipse-zenoh/zenoh-ts';
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
	token: LivelinessToken | null = null;
	queryable: Queryable | null = null;
	liveliness_subscriber: Subscriber | null = null;
	usersCallback: ((users: string[]) => void) | null = null;

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
		this.queryable = await this.session.declare_queryable(keyexpr, {
			callback: (query: Query) => {
				log(`[Queryable] Replying to query: ${query.selector().toString()}`);
				query.reply(keyexpr, this.user.username);
			},
			complete: true
		});
		log(`[Session] Created queryable on ${keyexpr}`);

		this.token = this.session.liveliness().declare_token(keyexpr);

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
							this.users.push(user);
							log(
								`[LivelinessSubscriber] New alive token ${keyexpr}`
							);
							break;
						}
						case SampleKind.DELETE: {
							this.users = this.users.filter(u => u.username != user.username);
							log(
								`[LivelinessSubscriber] Dropped token ${keyexpr}`
							);
							break;
						}
					}
				}
				if (this.usersCallback) {
					this.usersCallback(this.users.map(u => u.username));
				}
				return Promise.resolve();
			},
			history: true
		});
	}

	onChangeUsers(callback: (users: string[]) => void) {
		this.usersCallback = callback;
	}

	async disconnect() {
		if (this.session) {
			await this.session.close();
			this.session = null;
			this.token = null;
			this.queryable = null;
			this.liveliness_subscriber = null;
			this.users = [];
		}
	}
}

let chatSession: ChatSession | null = null;

document.addEventListener('DOMContentLoaded', () => {
	const toggleLogButton = document.getElementById('toggle-log-button');
	const technicalLogPanel = document.getElementById('technical-log-panel');
	const connectButton = document.getElementById('connect-button');
	const disconnectButton = document.getElementById('disconnect-button');
	const serverNameInput = document.getElementById('server-name') as HTMLInputElement;
	const serverPortInput = document.getElementById('server-port') as HTMLInputElement;
	const usernameInput = document.getElementById('username') as HTMLInputElement;
	const usersList = document.getElementById('users') as HTMLUListElement;

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
			chatSession = new ChatSession(user);
			await chatSession.connect(serverNameInput.value, serverPortInput.value);
			chatSession.onChangeUsers((users) => {
				usersList.innerHTML = '';
				users.forEach(user => {
					const li = document.createElement('li');
					li.textContent = user;
					usersList.appendChild(li);
				});
			});
		});
	});

	disconnectButton?.addEventListener('click', () => {
		if (chatSession) {
			log_catch(async () => {
				if (chatSession) {
					await chatSession.disconnect();
					chatSession = null;
				}
			});
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
