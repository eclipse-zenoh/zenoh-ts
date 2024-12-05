import HtmlWebpackPlugin from 'html-webpack-plugin';
// import { fileURLToPath } from "url";
// import path from "path";
// const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            filename: 'dist/index.html'
        }),
    ],
};
