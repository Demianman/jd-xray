import {createServer} from "node:http";
import worker from "../dist/server/index.js";

const server = createServer(async (request, response) => {
  const body = [];
  for await (const chunk of request) body.push(chunk);
  const webRequest = new Request(`http://localhost:4174${request.url}`, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : Buffer.concat(body)
  });
  const result = await worker.fetch(webRequest, {}, {});
  response.writeHead(result.status, Object.fromEntries(result.headers));
  response.end(Buffer.from(await result.arrayBuffer()));
});

server.listen(4174, "127.0.0.1", () => console.log("JD X-ray Worker preview: http://127.0.0.1:4174"));
