module.exports = {
    plugins: ['prettier'],// eslint-plugin-prettier的缩写
    extends: [
        'alloy',
        'prettier'
    ],
    env: {
        node: true // eslint-config-prettier的缩写
    },
    rules: {
        'prettier/prettier': 'error'
    }
}