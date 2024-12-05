import { Config, Session } from '@eclipse-zenoh/zenoh-ts';
document.addEventListener('DOMContentLoaded', () => {
    const toggleLogButton = document.getElementById('toggle-log-button');
    const technicalLogPanel = document.getElementById('technical-log-panel');
    const connectButton = document.getElementById('connect-button');
    const serverNameInput = document.getElementById('server-name');
    const serverPortInput = document.getElementById('server-port');
    toggleLogButton?.addEventListener('click', () => {
        if (technicalLogPanel) {
            technicalLogPanel.classList.toggle('hidden');
        }
    });
    connectButton?.addEventListener('click', () => {
        connect(serverNameInput.value, serverPortInput.value);
    });
});
function log(message) {
    const technicalLog = document.getElementById('technical-log');
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = document.createElement('div');
    logMessage.textContent = `[${timestamp}] ${message}`;
    technicalLog?.appendChild(logMessage);
}
async function connect(serverName, serverPort) {
    let locator = `ws/${serverName}:${serverPort}`;
    let config = new Config(locator);
    log(`Connecting to zenohd on ${locator}`);
    let session = await Session.open(config);
    log(`Connected to zenohd on ${locator}`);
}
