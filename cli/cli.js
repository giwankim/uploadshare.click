#!/usr/bin/env node

import { stat } from 'node:fs/promises'
import { program } from 'commander'
import ShareApi from './api/share-api.js'

const validate = async (filepath) => {
  const stats = await stat(filepath)
  if (!stats.isFile()) {
    throw new Error(`${filepath} is not a file`)
  }
}

program
  .name('uploadshare')
  .description('The uploadshare.click cli tool for uploading files')
  .addHelpText(
    'after',
    `

  To upload a file from the local directory:

  $ uploadshare <FILENAME>
  `
  )
  .argument('<filepath>', 'Path to the file to upload')
  .action(async function (filepath) {
    console.log(`Uploading ${filepath}`)
    try {
      // read the filepath and validate
      await validate(filepath)

      // call the uploadshare POST endpoint to get an upload url with the filepath name
      const shareUrlResp = await ShareApi.createShare({ filepath })
      const shareUrlRespBody = await shareUrlResp.body.json()
      const { uploadUrl, downloadUrl, headers } = shareUrlRespBody

      // upload the file using the presigned uploadUrl
      await ShareApi.uploadShare({
        uploadUrl,
        headers,
        filepath
      })

      // print the download url
      console.log(downloadUrl)
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })
  .parse()
