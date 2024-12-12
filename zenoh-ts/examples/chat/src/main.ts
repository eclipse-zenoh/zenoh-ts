import { ChatSession, ChatUser } from './chat_session';

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

	function onConnect(chatSession: ChatSession) {
		usersList.innerHTML = '';
		chatSession.getUsers().forEach(user => {
			const li = document.createElement('li');
			li.textContent = user.toString();
			usersList.appendChild(li);
		});
		chatLog.innerHTML = '';
		chatSession.getMessages().forEach(message => {
			const messageElement = document.createElement('div');
			if (message.u === chatSession.getUser().username) {
				messageElement.innerHTML = `<strong>${message.u}</strong>: ${message.m}`;
			} else {
				messageElement.textContent = `${message.u}: ${message.m}`;
			}
			chatLog.appendChild(messageElement);
		});
	}

	function onDisconnect(chatSession: ChatSession) {
		usersList.innerHTML = '';
		chatLog.innerHTML = '';
	}

	connectButton?.addEventListener('click', () => {
		log_catch(async () => {
			let user = ChatUser.fromString(usernameInput.value);
			if (!user) {
				log(`Invalid username: ${usernameInput.value}`);
				return;
			}
			let chatSession: ChatSession = new ChatSession(user);
			chatSession.onChangeUsers((chatSession) => {
				usersList.innerHTML = '';
				chatSession.getUsers().forEach(user => {
					const li = document.createElement('li');
					li.textContent = user.toString();
					usersList.appendChild(li);
				});
			});
			chatSession.onNewMessage((chatSession, user, message) => {
				const messageElement = document.createElement('div');
				if (user.username === chatSession.getUser().username) {
					messageElement.innerHTML = `<strong>${user.toString()}</strong>: ${message}`;
				} else {
					messageElement.textContent = `${user.toString()}: ${message}`;
				}
				chatLog.appendChild(messageElement);
				chatLog.scrollTop = chatLog.scrollHeight; // Scroll to the latest message
			});
			chatSession.onConnect(onConnect);
			chatSession.onDisconnect(onDisconnect);
			if (globalChatSession) {
				await globalChatSession.disconnect();
			}
			globalChatSession = chatSession;
			await chatSession.connect(serverNameInput.value, serverPortInput.value);
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
			globalChatSession.sendMessage(messageInput.value);
			messageInput.value = '';
		}
	});

	messageInput?.addEventListener('keypress', (event) => {
		if (event.key === 'Enter') {
			if (globalChatSession) {
				globalChatSession.sendMessage(messageInput.value);
				messageInput.value = '';
			}
		}
	});
});

function log(message: string) {
	const technicalLog = document.getElementById('technical-log') as HTMLDivElement;
	const timestamp = new Date().toLocaleTimeString();
	const logMessage = document.createElement('div');
	logMessage.textContent = `[${timestamp}] ${message}`;
	technicalLog.appendChild(logMessage);
	technicalLog.scrollTop = technicalLog.scrollHeight; // Scroll to the latest log message
}

async function log_catch(asyncFunc: () => Promise<void>) {
	try {
		await asyncFunc();
	} catch (error) {
		log(`Error: ${error}`);
	}
}
