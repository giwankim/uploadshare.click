#!/usr/bin/env node

import path from 'node:path'
import fs from 'node:fs'
import { program } from 'commander'
import { S3Api, UploadshareApi } from './api.js'

program
  .name('uploadshare')
  .description('The uploadshare.click cli tool for uploading files')
  .addHelpText('after', `
  
  To upload a file from the local directory:
  
  $ uploadshare <FILENAME>
  `)
  .argument('<filepath>', 'Path to the file to upload')
  .action(async function (filepath) {
    try {
      // read the filepath and check that it exists, and it's a file
      const stats = await fs.promises.stat(filepath)
      if (!stats.isFile()) {
        throw new Error(`${filepath} is not a file`)
      }
      const filename = path.basename(filepath)

      // call the uploadshare POST endpoint and get an upload url with the filepath name
      const { uploadUrl, downloadUrl, headers } = await UploadshareApi.createShare(filename)

      // upload the file using the presigned uploadUrl
      await S3Api.upload(uploadUrl, headers, filepath)

      // print the download url
      console.log(downloadUrl)
    } catch (err) {
      console.error(err)
      process.exit(1)
    }
  })
  .parse()
