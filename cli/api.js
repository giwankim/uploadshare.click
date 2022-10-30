import fs from 'node:fs/promises'
import path from 'node:path'
import httpStatus from 'http-status'
import { createReadStream } from 'node:fs'
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
  PUT ({ headers, filepath, stats }) {
    return {
      method: 'PUT',
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': stats.size,
        ...headers
      },
      body: createReadStream(filepath)
    }
  }
}

const Api = {
  async createShare ({ filepath }) {
    const filename = path.basename(filepath)
    const url = new URL(BASE_URL)
    url.searchParams.append('filename', filename)

    const response = await request(url, HTTP_METHOD.POST())

    if (response.statusCode !== httpStatus.CREATED) {
      const responseText = await response.body.text()
      throw new Error(
        `Unexpected status code received from server: ${response.statusCode}\n\n${responseText}`
      )
    }
    return response.body.json()
  },
  async upload ({ uploadUrl, headers, filepath }) {
    const stats = await fs.stat(filepath)
    const response = await request(
      uploadUrl,
      HTTP_METHOD.PUT({ headers, filepath, stats })
    )
    if (response.statusCode !== httpStatus.OK) {
      const responseText = await response.body.text()
      throw new Error(
        `Unexpected status code received from S3: ${response.statusCode}\n\n${responseText}`
      )
    }
  }
}

export default Api
