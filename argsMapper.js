const arg = require('arg')

function dateValidator(_value, argName) {
    const date = Date.parse(_value)
    if (Number.isNaN(date)) {
        throw new Error(`${argName} must be a valid date, received ${_value}`)
    }

    return _value
}

const args = arg({
    '--telegramOnlyMode': Boolean,
    '--emailOnlyMode': Boolean,
    '--listenForNewEmails': Boolean,
    '--fetchOldEmails': Boolean,
    '--fetchSince': dateValidator,
    '-t': '--telegramOnlyMode',
    '-e': '--emailOnlyMode',
})

module.exports = { args }
