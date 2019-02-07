import path from 'path'
import stream from 'stream'

import express from 'express'

const jwt = require('express-jwt')

import Environment, { Platform, SessionParameters } from './Environment'

const app = express()
const expressWs = require('express-ws')(app)

// Serve static assets from ./static
app.use(express.static(path.join(__dirname, 'static')))

// JSON Body Parsing
const jsonParser = require('body-parser').json()
app.use(jsonParser)

const DEFAULT_ENVIRONMENT = 'multi-mega'

/**
 * Secret for JSON web tokens.
 */
let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'development') JWT_SECRET = 'not-a-secret'
  else throw Error('JWT_SECRET must be set')
}

app.use(jwt({ secret: JWT_SECRET }))

/**
 * Validates that all the `requiredParameters` are properties of `body`.
 * Returns an array of all parameters that are missing.
 *
 * @param body
 * @param requiredParameters
 */
function validateParameters (body: any, requiredParameters: Array<string>): Array<string> {
  let missingParameters: Array<string> = []

  requiredParameters.forEach(parameter => {
    if (!body[parameter]) {
      missingParameters.push(parameter)
    }
  })

  return missingParameters
}

/**
 * Send a 400 status code to the response, with the `errorMessage` as a JSON response.
 *
 * @param response
 * @param errorMessage
 */
function sendBadRequestResponse (response: express.Response, errorMessage: string) {
  response.status(400).json({
    error: errorMessage
  })
}

/**
 * Validate that a request has a valid JSON body and has all the `requiredParameters`. It sends appropriate error
 * messages back to the client, and then returns false, if the request is not valid; the calling function should
 * then stop sending its response. If this function returns true the calling function should continue as normal.
 *
 * @param request
 * @param response
 * @param requiredParameters
 */
function doRequestValidation (request: express.Request, response: express.Response,
                              requiredParameters: Array<string>): boolean {
  if (!request.body) {
    sendBadRequestResponse(response, 'Valid JSON body was not found.')
    return false
  }

  const missingParameters = validateParameters(request.body, requiredParameters)

  if (missingParameters.length) {
    const missingParametersStr = missingParameters.join(', ')
    sendBadRequestResponse(response, `Missing parameter(s) in body: ${missingParametersStr}.`)
    return false
  }

  return true
}

/**
 * Get the JWT data from a Request. Will either return the JWT data or null:
 *
 * The `exepectedContainerId` argument is the containerId that is expected to be found in the JWT. If one is provieded
 * and it does not exist/does not match in the JWT token then a 403 status and message will be sent to the response.
 * Similarly, if this is null and a containerId is sent a 403 status is sent and message written.
 *
 * @param request
 * @param response
 * @param expectedContainerId
 */
function getJwtData (request: express.Request, response: express.Response, expectedContainerId: string | null = null): any {
  // @ts-ignore
  const jwtData: any = request.user

  if (expectedContainerId) {
    if (expectedContainerId !== jwtData.cid) {
      response.status(403).send('Contained ID in JWT does not match expected.')
      return null
    }
  } else if (jwtData.cid) {
    response.status(403).send('Attempted to use JWT that already has a container id.')
    return null
  }

  return jwtData
}

// Instantiate shell and set up data handlers
expressWs.app.ws('/shell', async (ws: any, req: express.Request) => {
  const environment = req.query.environment || DEFAULT_ENVIRONMENT

  const jwtData = getJwtData(req, ws, null)

  if (jwtData === null) {
    return ws.close()
  }

  try {
    // Create streams that pipe between the Websocket and
    // the pseudo terminal

    // A pseudo stdin that receives data from the Websocket
    const stdin = new stream.PassThrough()
    ws.on('message', (msg: any) => {
      stdin.write(msg)
    })

    // A pseudo stdout that writes data to the Websocket
    const stdout = new stream.Writable({
      write (chunk: Buffer, encoding: any, callback: any) {
        ws.send(chunk)
        callback()
      }
    })

    let env = new Environment(environment)

    const sessionParameters = new SessionParameters()
    sessionParameters.platform = req.query.platform === undefined ? Platform.UNIX : req.query.platform
    sessionParameters.stdin = stdin
    sessionParameters.stdout = stdout
    await env.enter(sessionParameters)
  } catch (error) {
    console.error(error)
  }
})

// Instantiate shell and set up data handlers
expressWs.app.ws('/interact', async (ws: any, req: express.Request) => {
  const environment = req.query.environment || DEFAULT_ENVIRONMENT
  const containerId = req.query.containerId || ''

  const jwtData = getJwtData(req, ws, containerId)

  if (jwtData === null) {
    return ws.close()
  }

  try {
    // Create streams that pipe between the Websocket and
    // the pseudo terminal

    // A pseudo stdin that receives data from the Websocket
    const stdin = new stream.PassThrough()
    ws.on('message', (msg: any) => {
      stdin.write(msg)
    })

    // A pseudo stdout that writes data to the Websocket
    const stdout = new stream.Writable({
      write (chunk: Buffer, encoding: any, callback: any) {
        ws.send(chunk)
        callback()
      }
    })

    let env = new Environment(environment)

    const sessionParameters = new SessionParameters()
    sessionParameters.platform = Platform.DOCKER
    sessionParameters.containerId = containerId
    sessionParameters.stdin = stdin
    sessionParameters.stdout = stdout

    await env.attach(sessionParameters)
  } catch (error) {
    console.error(error)
  }
})

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: any) => {
  console.error(error.stack)
  res.status(500)
  res.render('error', { error })
  next(error)
})

expressWs.app.post('/start', async (req: express.Request, res: express.Response) => {
  const jwtData = getJwtData(req, res)

  if (jwtData === null) {
    return res.end()
  }

  if (!doRequestValidation(req, res, ['environmentId'])) {
    return res.end()
  }

  const env = new Environment(req.body.environmentId)

  const sessionParameters = new SessionParameters()
  sessionParameters.platform = Platform.DOCKER
  sessionParameters.command = req.body.command || ''

  const containerId = await env.start(sessionParameters)
  return res.json({
    containerId: containerId
  })
})

expressWs.app.post('/execute', async (req: express.Request, res: express.Response) => {
  if (!doRequestValidation(req, res, ['environmentId', 'containerId', 'command'])) {
    return res.end()
  }

  const jwtData = getJwtData(req, res, req.body.containerId)

  if (jwtData === null) {
    return res.end()
  }

  const env = new Environment(req.body.environmentId)

  const sessionParameters = new SessionParameters()
  sessionParameters.platform = Platform.DOCKER
  sessionParameters.containerId = req.body.containerId
  sessionParameters.command = req.body.command

  return res.json({
    output: await env.execute(sessionParameters, req.body.daemonize === true)
  })
})

expressWs.app.post('/stop', async (req: express.Request, res: express.Response) => {
  // req: some JSON -> with container ID that will stop the container
  if (!doRequestValidation(req, res, ['environmentId', 'containerId'])) {
    return res.end()
  }

  const jwtData = getJwtData(req, res, req.body.containerId)

  if (jwtData === null) {
    return res.end()
  }

  const env = new Environment(req.body.environmentId)
  const sessionParameters = new SessionParameters()
  sessionParameters.platform = Platform.DOCKER

  const containerId = req.body.containerId

  if (!await env.containerIsRunning(containerId)) {
    sendBadRequestResponse(res, `Container ${containerId} is not running.`)
    return res.end()
  }

  if (await env.stopContainer(containerId)) {
    return res.json({
      message: `Container ${containerId} stopped.`
    })
  } else {
    return res.status(500).json({
      error: `Container ${containerId} was not stopped.`
    })
  }

})

/**
 * Start the server
 *
 * @param port Port to listen on
 * @param address Address to listen on
 */
export default function serve (port: number = 3000, address: string = '') {
  app.listen(port, address)
  return { port, address }
}
