const {createHash} = require('node:crypto')

module.exports = async function ({options, resolveVariable}) {
  const account = await resolveVariable('aws:accountId')
  const region = await resolveVariable('aws:region')
  const stage = await resolveVariable('sls:stage')
  const input = `uploadshare-${account}-${region}-${stage}`
  const bucketName = 'uploadshare-' + createHash('md5').update(input).digest('hex')
  return {
    bucketName
  }
}
