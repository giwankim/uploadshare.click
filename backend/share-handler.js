import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import httpStatus from 'http-status'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { BUCKET_NAME } = process.env
const EXPIRY_DEFAULT = 24 * 60 * 60

const s3Client = new S3Client()

export const handleEvent = async (event, context) => {
  // Create a key (file name)
  const id = randomUUID()
  const key = `shares/${id[0]}/${id[1]}/${id}`

  // Create the download URL
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  })
  const retrievalUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: EXPIRY_DEFAULT })

  // Create an upload URL
  const putCommand = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: EXPIRY_DEFAULT })

  return {
    statusCode: httpStatus.CREATED,
    body: `
Upload with: curl -X PUT -T <filename> ${uploadUrl}

Download with curl: curl ${retrievalUrl}
    `
  }
}
