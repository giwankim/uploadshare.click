import HttpStatus from 'http-status'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'

const { BUCKET_NAME } = process.env
const EXPIRY_DEFAULT = 24 * 60 * 60 // 1 day

const s3Client = new S3Client()

export const handle = async (event, context) => {
  const id = randomUUID()
  const key = `shares/${id[0]}/${id[1]}/${id}`

  const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: EXPIRY_DEFAULT })

  const putCommand = new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: EXPIRY_DEFAULT })

  return {
    statusCode: HttpStatus.CREATED,
    body: `
    Upload with: curl -X PUT -T <filename> ${uploadUrl}
    Download with: curl ${downloadUrl}
    `
  }
}
