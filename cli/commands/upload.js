import { basename } from 'node:path'
import { stat } from 'node:fs/promises'
import { S3Api, UploadshareApi } from './api.js'

export default async function upload (filepath) {
  try {
    // read the filepath and check that it exists, and it's a file
    const stats = await stat(filepath)
    if (!stats.isFile()) {
      throw new Error(`${filepath} is not a file`)
    }
    const filename = basename(filepath)

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
}
