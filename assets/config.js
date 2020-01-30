module.exports = {
    'db': {
        'connstr': {
            'UAT': 'DATABASE=TEST;HOSTNAME=test1.domain.com;UID=USER;PWD=;PORT=50000;PROTOCOL=TCPIP',
            'STI': 'DATABASE=TEST;HOSTNAME=test2.domain.com;UID=USER;PWD=;PORT=50000;PROTOCOL=TCPIP',
            'DEV': 'DATABASE=TEST;HOSTNAME=test3.domain.com;UID=USER;PWD=;PORT=50000;PROTOCOL=TCPIP',
            'DEFAULT': 'DATABASE=TEST;HOSTNAME=test3.domain.com;UID=USER;PWD=;PORT=50000;PROTOCOL=TCPIP'
        }
    },
    'env': {
        'uat': {
            'ud': 'https://test.domain.com',
            'uc': 'service'
        }
    }
}