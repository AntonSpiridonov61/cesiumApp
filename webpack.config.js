// The path to the CesiumJS source code
const cesiumSource = 'node_modules/cesium/Source';
const cesiumWorkers = '../Build/Cesium/Workers';
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    context: __dirname,
    entry: {
        app: './src/index.js'
    },
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'dist'),
        sourcePrefix: ''
    },
    amd: {
        toUrlUndefined: true
    },
    resolve: {
        alias: {
            cesium: path.resolve(__dirname, cesiumSource)
        },
        mainFiles: ['index', 'Cesium']
    },
    module: {
        rules: [{
            test: /\.css$/,
            use: [ 'style-loader', 'css-loader' ]
        }, 
        {
            test: /\.(png|gif|jpg|jpeg|svg|xml)$/,
            use: [ 'url-loader' ]
        },
        {
            test: /\.json$/,
            loader: 'json-loader',
            type: 'javascript/auto',
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html'
        }),

        new CopyWebpackPlugin({
            patterns: [
                { from: path.join(cesiumSource, cesiumWorkers), to: 'Workers' },
                { from: path.join(cesiumSource, 'Assets'), to: 'Assets' },
                { from: path.join(cesiumSource, 'Widgets'), to: 'Widgets' }
            ]
        }),
        new webpack.DefinePlugin({
            CESIUM_BASE_URL: JSON.stringify('')
        })
    ],
    mode: 'development',
    devtool: 'eval',
};