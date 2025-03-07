import middy from '@middy/core'
import cryptoRandomString from 'crypto-random-string'
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer'
import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger'
import { logMetrics, Metrics, MetricUnits } from '@aws-lambda-powertools/metrics'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { CODE_EXPIRY_SECONDS, TABLE_NAME, TOKEN_REQUEST_INTERVAL_SECONDS, VERIFICATION_URI } from './config.js'
import { DeviceAuthStatus } from './constants.js'
import { jsonResponse } from './util.js'

const tracer = new Tracer()
const logger = new Logger()
const metrics = new Metrics()

const ddbClient = new DynamoDBClient()
const docClient = DynamoDBDocument.from(ddbClient)

/**
 *
 * @param event
 * @return {Promise<{headers: {"content-type": string}, body: *|string, statusCode: *}>}
 */
async function handler (event) {
  // Create a device code (high entropy)
  const deviceCode = cryptoRandomString({ length: 48, type: 'url-safe' })

  // Create a user code (readable, typeable, lower entropy)
  const userCode = cryptoRandomString({ length: 8, type: 'distinguishable' })

  // Create an entry in the table
  // Store: device_code, user_code, expiration, state
  const expiration = (Date.now() / 1000) + CODE_EXPIRY_SECONDS

  const deviceKey = `device_code#${deviceCode}`
  const userCodeKey = `user_code#${userCode}`

  const putItemInput = {
    TableName: TABLE_NAME,
    Item: {
      pk: deviceKey,
      sk: deviceKey,
      gsi1pk: userCodeKey,
      gsi1sk: userCodeKey,
      s: DeviceAuthStatus.PENDING,
      expiration
    }
  }

  logger.debug({ putItemInput })
  const ddbResponse = await docClient.put(putItemInput)
  logger.debug({ ddbResponse })

  // Create some metrics
  metrics.addMetric('DeviceAuthRequestCount', MetricUnits.Count, 1)

  // Construct the RFC8628 device authorization response
  const deviceAuthResponsePayload = {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: VERIFICATION_URI,
    verification_uri_complete: `${VERIFICATION_URI}?user_code=${userCode}`,
    expires_in: CODE_EXPIRY_SECONDS,
    interval: TOKEN_REQUEST_INTERVAL_SECONDS
  }

  return jsonResponse(200, deviceAuthResponsePayload)
}

export const handleEvent = middy(handler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics))
  .use(captureLambdaHandler(tracer))
