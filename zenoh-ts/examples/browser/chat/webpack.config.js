import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    entry: './src/main.ts',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.wasm$/,
                type: 'webassembly/async'
            }
        ]
    },
    experiments: {
        asyncWebAssembly: true
    },
    devtool: 'source-map',
    mode: 'development',
    devServer: {
        static: {
            directory: path.join(__dirname, 'assets'),
        },
        compress: true,
        port: 8080,
        open: true
    }
};
