import { Config, Session } from "@eclipse-zenoh/zenoh-ts";
import { SimpleChannel } from "channel-ts";

let q = new SimpleChannel();

document.addEventListener('DOMContentLoaded', () => {
	const toggleLogButton = document.getElementById('toggle-log-button');
	const technicalLogPanel = document.getElementById('technical-log-panel');
	const connectButton = document.getElementById('connect-button');
	const serverNameInput = document.getElementById('server-name') as HTMLInputElement;
	const serverPortInput = document.getElementById('server-port') as HTMLInputElement;

	toggleLogButton?.addEventListener('click', () => {
		if (technicalLogPanel) {
			technicalLogPanel.classList.toggle('hidden');
		}
	});

	connectButton?.addEventListener('click', () => {
		connect(serverNameInput.value, serverPortInput.value);
	});
});

function log(message: string) {
	const technicalLog = document.getElementById('technical-log');
	const timestamp = new Date().toLocaleTimeString();
	const logMessage = document.createElement('div');
	logMessage.textContent = `[${timestamp}] ${message}`;
	technicalLog?.appendChild(logMessage);
}

async function connect(serverName: string, serverPort: string) {
	let locator = `ws/${serverName}:${serverPort}`;
	let config = new Config(locator);
	log(`Connecting to zenohd on ${locator}`);
	let session = await Session.open(config);
	log(`Connected to zenohd on ${locator}`);
}
