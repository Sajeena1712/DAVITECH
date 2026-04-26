import chatHandler from "../../api/chat.js";

function createResponse() {
  let statusCode = 200;
  const headers = {};
  let body = "";

  return {
    res: {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(name, value) {
        headers[name] = value;
      },
      json(payload) {
        body = JSON.stringify(payload);
        headers["Content-Type"] = "application/json; charset=utf-8";
        return this;
      },
      send(payload) {
        body = typeof payload === "string" ? payload : JSON.stringify(payload);
        return this;
      },
    },
    finish() {
      return {
        statusCode,
        headers,
        body,
      };
    },
  };
}

export async function handler(event) {
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch {
    body = {};
  }
  const { res, finish } = createResponse();

  await chatHandler({ method: event.httpMethod, body }, res);

  return finish();
}
