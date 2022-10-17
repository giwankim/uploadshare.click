import httpStatus from 'http-status'
import { basename } from 'node:path'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { request } from 'undici'

const BASE_URL = 'https://uploadshare.click/share/'

const HTTP_METHOD = {
  POST () {
    return {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'user-agent': 'uploadshare.click cli'
      }
    }
  },
  PUT ({ fileStream, fileSize, headers }) {
    return {
      method: 'PUT',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': fileSize,
        ...headers
      },
      body: fileStream
    }
  }
}

const ShareApi = {
  async createShare ({ filepath }) {
    const filename = basename(filepath)
    const shareUrl = new URL(BASE_URL)
    shareUrl.searchParams.append('filename', filename)

    const shareUrlResp = await request(shareUrl, HTTP_METHOD.POST())

    if (shareUrlResp.statusCode !== httpStatus.CREATED) {
      const responseText = await shareUrlResp.body.text()
      throw new Error(
        `Unexpected status code received from server: ${shareUrlResp.statusCode}\n\n${responseText}`
      )
    }
    return shareUrlResp
  },
  async uploadShare ({ uploadUrl, headers, filepath }) {
    const stats = await stat(filepath)
    const fileStream = createReadStream(filepath)

    const uploadResp = await request(
      uploadUrl,
      HTTP_METHOD.PUT({ fileStream, fileSize: stats.size, headers })
    )

    if (uploadResp.statusCode !== httpStatus.OK) {
      const responseText = await uploadResp.body.text()
      throw new Error(
        `Unexpected status code received from S3: ${uploadResp.statusCode}\n\n${responseText}`
      )
    }
    return uploadResp
  }
}

export default ShareApi
