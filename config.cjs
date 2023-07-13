// @ts-check
'use strict'

const {defineConfig} = require('./uploadshare.cjs')

exports.config = defineConfig({
  // region: 'ap-northeast-2', // inferred from AWS_REGION or DEFAULT_AWS_REGION (or 'ap-northeast-2' if not set)
  // stage: 'dev', // the name of the stage to deploy to (e.g. 'dev', 'prod')
  // serviceName: 'uploadshare', // the name of the service (for resource naming)
  domain: 'files.uploadshare.click' // <-- ADD YOUR DOMAIN NAME HERE (e.g. 'files.weshare.click' or 'weshare.click')
})
