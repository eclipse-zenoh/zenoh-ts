import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpacklPlugin from 'copy-webpack-plugin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const importmap = fs.readFileSync(path.resolve(__dirname, 'importmap.json'), 'utf-8');

export default {
    mode: 'none',
    entry: {},
    output: {
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'src/index.html'),
            filename: 'index.html',
            templateParameters: {
                importmap
            }
        }),
        new CopyWebpacklPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'src/index.css'),
                    to: path.resolve(__dirname, 'dist')
                }
            ]

        })
    ],
};