const arg = require('arg')

function dateValidator(_value, argName, previousValue) {
    const date = Date.parse(previousValue)
    if (Number.isNaN(date)) {
        throw new Error(`${argName} must be a valid date`)
    }

    return previousValue
}

const args = arg({
    '--telegramOnlyMode': Boolean,
    '--emailOnlyMode': Boolean,
    '--listenForNewEmails': Boolean,
    '--fetchOldEmails': Boolean,
    '--fetchSince': arg.flag(dateValidator),
    '-t': '--telegramOnlyMode',
    '-e': '--emailOnlyMode',
})

module.exports = { args }
