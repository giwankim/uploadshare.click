import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer'
import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger'
import { logMetrics, Metrics } from '@aws-lambda-powertools/metrics'
import middy from '@middy/core'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

const tracer = new Tracer()
const logger = new Logger()
const metrics = new Metrics()

const ddbClient = new DynamoDBClient()
const docClient = DynamoDBDocument.from(ddbClient)

/**
 *  Handles an RFC8628 Device Access Token Request
 *  https://www.rfc-editor.org/rfc/rfc8628#page-10
 *
 * @param event Lambda HTTP API Event
 * @param context
 * @return {Promise<void>}
 */
async function handler (event, context) {

}

export const handleEvent = middy(handler)
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics))
  .use(captureLambdaHandler(tracer))
