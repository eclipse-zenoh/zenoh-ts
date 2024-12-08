import { Config, Session, Queryable, Query, Liveliness, LivelinessToken, Reply, Sample, RecvErr, Receiver, KeyExpr } from '@eclipse-zenoh/zenoh-ts';
import { Duration } from 'typed-duration';
import { validate_keyexpr } from './validate_keyexpr';

function validate_username(username: string): boolean {
	return /^[a-zA-Z0-9_-]+$/.test(username) && validate_keyexpr(username);
}

class ChatSession {
	session: Session;
	token: LivelinessToken;
	queryable: Queryable;

	constructor(session: Session, queryable: Queryable, token: LivelinessToken) {
		this.session = session;
		this.queryable = queryable;
		this.token = token;
	}

	public static async connect(serverName: string, serverPort: string, username: string): Promise<ChatSession> {
		if (!validate_username(username)) {
			return Promise.reject(`Invalid username: ${username}`);
		}

		let locator = `ws/${serverName}:${serverPort}`;
		let config = new Config(locator);
		log(`Connecting to zenohd on ${locator}`);
		let session = await Session.open(config);
		log(`Connected to zenohd on ${locator}`);
		let queryable_keyexpr = `user/${username}`;
		let queryable = await session.declare_queryable(queryable_keyexpr, {
			callback: (query: Query) => {
				log(`Replying to query: ${query.selector().toString()}`);
				query.reply(queryable_keyexpr, username);
			},
			complete: true
		});
		log(`Created queryable on ${queryable_keyexpr}`);

		let token = session.liveliness().declare_token(queryable_keyexpr);

		let receiver = await session.liveliness().get("user/*", {
			timeout: Duration.seconds.of(20)
		}) as Receiver;

		let reply = await receiver.receive();
		while (reply != RecvErr.Disconnected) {
			if (reply instanceof Reply) {
				let resp = reply.result();
				if (resp instanceof Sample) {
					let sample: Sample = resp;
					let keyexpr = sample.keyexpr();
					log(`Alive token from ${keyexpr}`);
				}
			}
			reply = await receiver.receive();
		}

		return new ChatSession(session, queryable, token);
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
		log_catch(() => connect(serverNameInput.value, serverPortInput.value, usernameInput.value));
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
