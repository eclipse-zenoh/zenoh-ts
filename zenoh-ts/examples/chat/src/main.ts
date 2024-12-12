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
	session: Session;
	token: LivelinessToken;
	queryable: Queryable;
	liveliness_subscriber: Subscriber;
	usersCallback: ((users: string[]) => void) | null = null;

	user: ChatUser;
	users: ChatUser[];

	constructor(session: Session,
		queryable: Queryable,
		token: LivelinessToken,
		liveliness_subscriber: Subscriber,
		user: ChatUser,
		users: ChatUser[]
	) {
		this.session = session;
		this.queryable = queryable;
		this.token = token;
		this.liveliness_subscriber = liveliness_subscriber;
		this.user = user;
		this.users = users;
	}

	public static async connect(serverName: string, serverPort: string, username: string): Promise<ChatSession> {
		let user = ChatUser.fromString(username);
		if (!user) {
			throw new Error("Invalid username");
		}
		let locator = `ws/${serverName}:${serverPort}`;
		let config = new Config(locator);
		let session = await Session.open(config);
		log(`[Session] Connected to zenohd on ${locator}`);
		let queryable_keyexpr = `user/${username}`;
		let queryable = await session.declare_queryable(queryable_keyexpr, {
			callback: (query: Query) => {
				log(`[Queryable] Replying to query: ${query.selector().toString()}`);
				query.reply(queryable_keyexpr, username);
			},
			complete: true
		});
		log(`[Session] Created queryable on ${queryable_keyexpr}`);

		let token = session.liveliness().declare_token(queryable_keyexpr);

		// Suscribe to changes of users presence
		let users: ChatUser[] = [];
		let liveliness_subscriber = session.liveliness().declare_subscriber("user/*", {
			callback: (sample: Sample) => {
				let keyexpr = sample.keyexpr();
				let user = ChatUser.fromKeyexpr(keyexpr);
				if (!user) {
					log(`Invalid user keyexpr: ${keyexpr.toString()}`);
				} else {
					switch (sample.kind()) {
						case SampleKind.PUT: {
							users.push(user);
							log(
								`[LivelinessSubscriber] New alive token ${keyexpr}`
							);
							break;
						}
						case SampleKind.DELETE: {
							users = users.filter(u => u.username != user.username);
							log(
								`[LivelinessSubscriber] Dropped token ${keyexpr}`
							);
							break;
						}
					}
				}
				return Promise.resolve();
			},
			history: true
		});

		return new ChatSession(session, queryable, token, liveliness_subscriber, user, users);
	}

	onChangeUsers(callback: (users: string[]) => void) {
		this.usersCallback = callback;
	}

	async disconnect() {
		await this.session.close();
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
			await connect(serverNameInput.value, serverPortInput.value, usernameInput.value);
			if (chatSession) {
				chatSession.onChangeUsers((users) => {
					usersList.innerHTML = '';
					users.forEach(user => {
						const li = document.createElement('li');
						li.textContent = user;
						usersList.appendChild(li);
					});
				});
			}
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

async function connect(serverName: string, serverPort: string, username: string) {
	if (chatSession) {
		await chatSession.disconnect();
	}
	chatSession = await ChatSession.connect(serverName, serverPort, username);
}
