import httpStatus from 'http-status'
import middy from '@middy/core'
import httpContentNegotiation from '@middy/http-content-negotiation'
import httpHeaderNormalizer from '@middy/http-header-normalizer'
import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  Metrics,
  logMetrics,
  MetricUnits
} from '@aws-lambda-powertools/metrics'
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer'
import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger'

const { BUCKET_NAME, BASE_URL } = process.env
const EXPIRY_DEFAULT = 24 * 60 * 60 // 1 day
const MIME_TYPE = 'application/octet-stream'

const tracer = new Tracer()
const logger = new Logger()
const metrics = new Metrics()
const s3Client = new S3Client()

const getUploadUrl = ({
  key,
  contentDisposition,
  contentDispositionHeader
}) => {
  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentDisposition: contentDisposition
  })
  const signableHeaders = new Set([`content-type: ${MIME_TYPE}`])
  if (contentDisposition) {
    signableHeaders.add(contentDispositionHeader)
  }
  return getSignedUrl(s3Client, putCommand, {
    expiresIn: EXPIRY_DEFAULT,
    signableHeaders
  })
}

async function handler (event, context) {
  const id = randomUUID()
  const key = `shares/${id[0]}/${id[1]}/${id}`
  const filename = event?.queryStringParameters?.filename
  const contentDisposition = filename && `attachment; filename="${filename}"`
  const contentDispositionHeader =
    contentDisposition && `content-disposition: ${contentDisposition}`

  logger.info('Creating share', {
    id,
    key,
    filename,
    contentDispositionHeader
  })
  metrics.addMetric('createShare', MetricUnits.Count, 1)

  const downloadUrl = `${BASE_URL}/share/${id}`
  const uploadUrl = await getUploadUrl({
    key,
    contentDisposition,
    contentDispositionHeader
  })

  let body = `
  Upload with: curl -X PUT -T ${filename || '<FILENAME>'} ${
    contentDispositionHeader ? `-H '${contentDispositionHeader}'` : ''
  } '${uploadUrl}'
  
  Download with: curl ${downloadUrl}
  `
  let headers = { 'content-type': 'text/plain' }

  if (event.preferredMediaType === 'application/json') {
    body = JSON.stringify({
      filename,
      headers: { 'content-disposition': contentDisposition },
      uploadUrl,
      downloadUrl
    })
    headers = { 'content-type': 'application/json' }
  }

  return {
    statusCode: httpStatus.CREATED,
    headers,
    body
  }
}

export const handle = middy(handler)
  .use(injectLambdaContext(logger), { logEvents: true })
  .use(logMetrics(metrics))
  .use(captureLambdaHandler(tracer))
  .use(httpHeaderNormalizer())
  .use(
    httpContentNegotiation({
      parseCharsets: false,
      parseEncodings: false,
      parseLanguages: false,
      failOnMismatch: false,
      availableMediaTypes: ['text/plain', 'application/json']
    })
  )
