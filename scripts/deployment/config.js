module.exports = {
    'network': 'mainnet',
    'mint': {
        'totalSupply': '1000000000'
    },
    'safe' : {
        'address' : '0x8fFf2c4517708d51540eD6ef9124BB48b5Db50e4'
    },
    'rewards': [
        { 'q' : 0, 'amount': '10000000'},
        { 'q' : 1, 'amount': '10000000'},
        { 'q' : 2, 'amount': '10000000'},
        { 'q' : 3, 'amount': '10000000'},
        { 'q' : 4, 'amount': '10000000'},
        { 'q' : 5, 'amount': '10000000'},
        { 'q' : 6, 'amount': '10000000'},
        { 'q' : 7, 'amount': '10000000'},
        { 'q' : 8, 'amount': '10000000'},
        { 'q' : 9, 'amount': '10000000'},
        { 'q' : 10, 'amount': '10000000'},
        { 'q' : 11, 'amount': '10000000'},
        { 'q' : 12, 'amount': '10000000'},
        { 'q' : 13, 'amount': '10000000'}],
    'bridge': {
        'maxLockLimit' : '357142',
        'maxReleaseLimit': '357142',
        'minLimit': '135',
        'limitIncPerBlock': '1300',
        'minRequiredReports': 1,
        'commissionAmount': '340',
        'reporters': {
            'addresses': ['0x0dAD71Ad92C4770AF7c3c28bc1E4F50e12eE4860'],
            'active': [true]
        }
    }
}
