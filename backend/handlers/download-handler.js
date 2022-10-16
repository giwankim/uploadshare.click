import httpStatus from 'http-status'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { BUCKET_NAME } = process.env
const EXPIRY_DEFAULT = 60
const s3Client = new S3Client()

export const handle = async (event, context) => {
  const id = event.pathParameters.id
  const key = `shares/${id[0]}/${id[1]}/${id}`

  const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: EXPIRY_DEFAULT })

  return {
    statusCode: httpStatus.MOVED_PERMANENTLY,
    headers: { Location: downloadUrl }
  }
}
