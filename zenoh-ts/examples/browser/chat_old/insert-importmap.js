
const fs = require('fs');
const path = require('path');

const importmapPath = path.join(__dirname, 'importmap.json');
const indexPath = path.join(__dirname, 'index.html');

const importmap = fs.readFileSync(importmapPath, 'utf-8');
const indexContent = fs.readFileSync(indexPath, 'utf-8');

const updatedIndexContent = indexContent.replace(
    '<script type="importmap"/>',
    `<script type="importmap">${importmap}</script>`
);

fs.writeFileSync(indexPath, updatedIndexContent, 'utf-8');
console.log('importmap.json has been inserted into index.html');