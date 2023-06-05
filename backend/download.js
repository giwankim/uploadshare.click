import httpStatus from 'http-status'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { BUCKET_NAME } = process.env
const EXPIRY_DEFAULT = 60
const s3Client = new S3Client()

export const handleEvent = async (event, context) => {
  // extract the id from the URL (path parameter called id)
  const id = event.pathParameters.id
  if (!id) {
    return {
      statusCode: httpStatus.BAD_REQUEST,
      body: 'Missing id'
    }
  }

  // create a presigned URL for the file in the bucket with the given id
  const key = `shares/${id[0]}/${id[1]}/${id}`
  const getObjectCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
  const downloadUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: EXPIRY_DEFAULT })

  // return an HTTP redirect response to the presigned URL
  return {
    statusCode: httpStatus.MOVED_PERMANENTLY,
    headers: {
      Location: downloadUrl
    }
  }
}
