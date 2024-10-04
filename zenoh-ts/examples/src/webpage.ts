import typescriptLogo from "./typescript.svg";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://zenoh.io/" target="_blank">
      <img src="https://zenoh.io/img/zenoh-dragon.png" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>

    <h1>Zenoh + TypeScript</h1>
    <p class="read-the-docs">
      Click on the Zenoh and TypeScript logos to learn more
    </p>
  </div>
`;
