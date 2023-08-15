import cryptoRandomString from 'crypto-random-string'
import middy from '@middy/core'
import { ConditionalCheckFailedException, DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer'
import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger'
import { logMetrics, Metrics, MetricUnits } from '@aws-lambda-powertools/metrics'
import { CLIENT_ID, COGNITO_OAUTH_CODE_URI, REDIRECT_URI, TABLE_NAME } from './config.js'
import { htmlResponse } from './util.js'
import { DeviceAuthStatus } from './constants.js'

const tracer = new Tracer()
const logger = new Logger()
const metrics = new Metrics()

const ddbClient = new DynamoDBClient()
const docClient = DynamoDBDocument.from(ddbClient)

/**
 * RFC8628 Device Authorization _Code Verification_
 * This handles the GET request to the verification URL.
 * The `user_code` query parameter is looked up and, if successful, the user agent is redirected
 * to the IDP authorization URL for the OAuth 2.0 authorization code flow.
 *
 * https:://www.rfc-editor.org/rfc/rfc8628#section-3.3
 * @param {*} event Lambda HTTP API Event
 * @param {*} context Lambda Context Object
 */
async function handler (event, context) {
  const { user_code: userCode } = event.queryStringParameters
  const userCodeKey = `user_code#${userCode}`

  // const expiryTime = (Date.now() / 1000) + CODE_EXPIRY_SECONDS
  const currentTime = Date.now() / 1000

  metrics.addMetric('VerificationAttemptCount', MetricUnits.Count, 1)

  // We would normally present a Proceed/Cancel view to the user before redirecting

  // Query authorization session
  const queryInput = {
    TableName: TABLE_NAME,
    IndexName: 'gsi1',
    KeyConditionExpression: 'gsi1pk = :userCodeKey and gsi1sk = :userCodeKey',
    ExpressionAttributeValues: {
      ':userCodeKey': userCodeKey
    }
  }

  logger.debug({ queryInput })
  const ddbQueryResponse = await docClient.query(queryInput)
  logger.debug({ ddbQueryResponse })

  if (ddbQueryResponse.Items?.length === 0) {
    return htmlResponse(400, 'Invalid code. Maybe it expired?')
  }

  const { pk, sk } = ddbQueryResponse.Items[0]
  const state = cryptoRandomString({ length: 32, type: 'url-safe' })
  const stateKey = `state#${state}`
  const updateItemInput = {
    TableName: TABLE_NAME,
    Key: { pk, sk },
    UpdateExpression: 'SET gsi2pk = :stateKey, gsi2sk = :stateKey, #status = :newStatus',
    ExpressionAttributeNames: {
      '#status': 's',
      '#exp': 'expiration'
    },
    ExpressionAttributeValues: {
      ':newStatus': DeviceAuthStatus.VERIFIED,
      ':stateKey': stateKey,
      ':prevStatus': DeviceAuthStatus.PENDING,
      // ':expiryTime': expiryTime,
      ':currentTime': currentTime
    },
    // ConditionExpression: '#status = :prevStatus AND #exp <= :expiryTime',
    ConditionExpression: '#status = :prevStatus AND :currentTime <= #exp'
  }

  try {
    logger.debug({ updateItemInput })
    const updateItemResponse = await docClient.update(updateItemInput)
    logger.debug({ updateItemResponse })
  } catch (err) {
    logger.error({ err })
    if (err instanceof ConditionalCheckFailedException) {
      return htmlResponse(400, 'The token is expired or already verified')
    }
    return htmlResponse(500, `Oops. Something went wrong with request ID: ${context.awsRequestId}`)
  }

  const destinationUrl = new URL(COGNITO_OAUTH_CODE_URI)
  const searchParams = new URLSearchParams(destinationUrl.searchParams)
  searchParams.set('response_type', 'code')
  searchParams.set('client_id', CLIENT_ID)
  searchParams.set('redirect_uri', REDIRECT_URI)
  searchParams.set('state', state)
  searchParams.set('scope', 'openid')
  destinationUrl.search = searchParams

  const apiResponse = {
    statusCode: 302,
    headers: {
      location: destinationUrl.href
    }
  }
  logger.debug({ apiResponse })
  return apiResponse
}

export const handleEvent = middy(handler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics))
  .use(captureLambdaHandler(tracer))
