module.exports = {
    'extends': 'eslint:recommended',
    'parserOptions': {'ecmaVersion': 12},
    'env': {
        'browser': true,
        'commonjs': true,
        'es2021': true
    },
    'globals': {
        '__dirname': 'readonly',
        '__filename': 'readonly',
        'after': 'readonly',
        'before': 'readonly',
        'beforeEach': 'readonly',
        'describe': 'readonly',
        'ethers': 'readonly',
        'it': 'readonly',
        'context': 'readonly',
        'network': 'readonly',
        'process': 'readonly',
        'upgrades': 'readonly'
    },
    'rules': {
        'indent': ['error', 4, {'SwitchCase': 1}],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always']
    }
};
