import { Config, Session, Queryable, Query } from '@eclipse-zenoh/zenoh-ts';
import CryptoJS from 'crypto-js';

class ChatSession {
	session: Session;
	queryable: Queryable;

	constructor(session: Session, queryable: Queryable) {
		this.session = session;
		this.queryable = queryable;
	}

	public static async connect(serverName: string, serverPort: string, username: string): Promise<ChatSession> {
		let locator = `ws/${serverName}:${serverPort}`;
		let config = new Config(locator);
		log(`Connecting to zenohd on ${locator}`);
		let session = await Session.open(config);
		log(`Connected to zenohd on ${locator}`);
		let user_id = CryptoJS.MD5(username).toString();
		let queryable_keyexpr = `user/${user_id}`;
		let queriable = await session.declare_queryable(queryable_keyexpr, { 
			callback: (query: Query) => {
				log(`Replying to query: ${query.selector().toString()}`);
				query.reply(queryable_keyexpr, username);
			},
			complete: true
		});
		log(`Created queryable on ${queryable_keyexpr}`);
		return new ChatSession(session, queriable)
	}
}

let chatSession: ChatSession | null = null;

document.addEventListener('DOMContentLoaded', () => {
	const toggleLogButton = document.getElementById('toggle-log-button');
	const technicalLogPanel = document.getElementById('technical-log-panel');
	const connectButton = document.getElementById('connect-button');
	const serverNameInput = document.getElementById('server-name') as HTMLInputElement;
	const serverPortInput = document.getElementById('server-port') as HTMLInputElement;
	const usernameInput = document.getElementById('username') as HTMLInputElement;

	toggleLogButton?.addEventListener('click', () => {
		if (technicalLogPanel) {
			technicalLogPanel.classList.toggle('hidden');
		}
	});

	connectButton?.addEventListener('click', () => {
		connect(serverNameInput.value, serverPortInput.value, usernameInput.value);
	});
});

function log(message: string) {
	const technicalLog = document.getElementById('technical-log');
	const timestamp = new Date().toLocaleTimeString();
	const logMessage = document.createElement('div');
	logMessage.textContent = `[${timestamp}] ${message}`;
	technicalLog?.appendChild(logMessage);
}

async function connect(serverName: string, serverPort: string, username: string) {
	chatSession = await ChatSession.connect(serverName, serverPort, username);
}
