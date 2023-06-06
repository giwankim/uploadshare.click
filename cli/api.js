import fs from 'node:fs'
import { request } from 'undici'
import httpStatus from 'http-status'

const BASE_URL = 'https://uploadshare.click/share/'

const HTTP_METHOD = {
  POST (headers, body) {
    return {
      method: 'POST', headers, body
    }
  },
  PUT (headers, body) {
    return {
      method: 'PUT', headers, body
    }
  }
}

export const UploadshareApi = {
  async createShare (filename) {
    const url = new URL(BASE_URL)
    url.searchParams.append('filename', filename)

    const headers = {
      accept: 'application/json',
      'user-agent': 'uploadshare.click cli'
    }
    const response = await request(url, HTTP_METHOD.POST(headers))
    if (response.statusCode !== httpStatus.CREATED) {
      const responseText = await response.body.text()
      throw new Error(`Unexpected status code received from server: ${response.statusCode}\n\n${responseText}`)
    }
    return response.body.json()
  }
}

export const S3Api = {
  async upload (url, headers, filepath) {
    const { size } = await fs.promises.stat(filepath)
    const fileStream = fs.createReadStream(filepath)
    const response = await request(url, HTTP_METHOD.PUT({
      'content-type': 'application/octet-stream',
      'content-length': size,
      ...headers
    }, fileStream))
    if (response.statusCode !== httpStatus.OK) {
      const responseText = await response.body.text()
      throw new Error(`Unexpected status code received from S3: ${response.statusCode}\n\n${responseText}`)
    }
  }
}
