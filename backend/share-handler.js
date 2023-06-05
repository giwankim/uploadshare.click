import { randomUUID } from 'node:crypto'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import httpStatus from 'http-status'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { BUCKET_NAME, BASE_URL } = process.env
const EXPIRY_DEFAULT = 24 * 60 * 60
const MIME_TYPE = 'application/octet-stream'

const s3Client = new S3Client()

export const handleEvent = async (event, context) => {
  // Create a key (file name)
  const id = randomUUID()
  const key = `shares/${id[0]}/${id[1]}/${id}`

  const filename = event?.queryStringParameters?.filename
  const contentDisposition = `attachment; filename="${filename}"`
  const contentDispositionHeader = contentDisposition && `content-disposition: ${contentDisposition}`

  // Create the download URL
  const downloadUrl = `${BASE_URL}/share/${id}`

  // Create an upload URL
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentDisposition: contentDisposition
  })

  const signableHeaders = new Set([`content-type: ${MIME_TYPE}`])
  if (contentDisposition) {
    signableHeaders.add(contentDispositionHeader)
  }

  const uploadUrl = await getSignedUrl(s3Client, putCommand, {
    expiresIn: EXPIRY_DEFAULT,
    signableHeaders
  })

  return {
    statusCode: httpStatus.CREATED,
    body: `
Upload with: curl -X PUT -T ${filename || '<FILENAME>'} ${contentDispositionHeader ? `-H '${contentDispositionHeader}'` : ''} '${uploadUrl}'

Download with curl: curl ${downloadUrl}
    `
  }
}
