import webpack from "webpack";
import { mergeWithRules } from "webpack-merge";
import common from "./webpack.common.js";

export default mergeWithRules({
    module: {
        rules: {
            test: "match",
            use: "replace",
        },
    },
})(common, {
    mode: "production",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: "ts-loader",
                    options: {
                        compilerOptions: {
                            declaration: false,
                            declarationMap: false,
                        },
                    },
                },
            },
        ],
    },
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    ],
});