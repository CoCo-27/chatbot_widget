const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')
const Dotenv = require('dotenv-webpack')

const getEnv = (env) => {
    // Get the root path (assuming your webpack config is in the root of your project!)
    const currentPath = path.join(__dirname)

    // Create the fallback path (the production .env)
    const basePath = currentPath + '/.env'

    // We're concatenating the environment name to our filename to specify the correct env file!
    const envPath = basePath + '.' + env

    // Check if the file exists, otherwise fall back to the production .env
    const finalPath = fs.existsSync(envPath) ? envPath : basePath

    // Set the path parameter in the dotenv config
    const fileEnv = dotenv.config({path: finalPath}).parsed

    // reduce it to a nice object, the same as before (but with the variables from the file)
    const envKeys = Object.keys(fileEnv).reduce((prev, next) => {
        prev[`process.env.${next}`] = JSON.stringify(fileEnv[next])
        return prev
    }, {})

    return envKeys
}

module.exports = (env, argv) => {
    const isDevBuild = argv.mode === 'development'
    const isInline = env.INLINE === 'true'

    // let plugins = [new Dotenv()]
    let plugins = [new Dotenv()]
    if (isInline) {
        plugins.push(
            new HtmlWebpackPlugin({
                filename: 'demo.html',
                template: path.resolve(__dirname, 'src', 'demo.html'),
                inject: 'body'
            })
        )
    }
    if (isDevBuild) {
        // plugins.push(new webpack.DefinePlugin(getEnv(argv.mode)))
        plugins.push(new webpack.HotModuleReplacementPlugin())
    }

    return [
        {
            mode: argv.mode ?? 'production',
            output: {
                filename: 'widget.js'
            },
            // devServer: {
            //     index: 'demo.html'
            // },
            plugins: plugins,
            module: {
                rules: [
                    {test: /\.html$/i, use: 'html-loader'},
                    {test: /\.s[ac]ss$/i, use: ['style-loader', 'css-loader', 'sass-loader', 'postcss-loader']},
                    {
                        test: /\.png/,
                        type: 'asset/inline'
                    },
                    {
                        test: /\.js$/i,
                        exclude: /node_modules/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    [
                                        '@babel/env',
                                        {
                                            targets: {
                                                browsers: ['ie 6', 'safari 7']
                                            }
                                        }
                                    ]
                                ]
                            }
                        }
                    }
                ]
            }
        }
    ]
}
