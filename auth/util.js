export function htmlResponse (statusCode, text) {
  return {
    statusCode,
    body: `<html>${text}</html>`,
    headers: {
      'content-type': 'text/html'
    }
  }
}
