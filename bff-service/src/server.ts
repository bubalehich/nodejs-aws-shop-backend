import 'dotenv/config';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { request as undiciRequest } from 'undici';
import { TtlCache } from './cache';

const PORT = Number(process.env.PORT ?? 3000);
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS ?? 120);

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-authenticate',
  'upgrade',
  'host',
  'content-length',
]);

const cache = new TtlCache(CACHE_TTL_SECONDS * 1000);

function resolveRecipient(name: string): string | undefined {
  return process.env[name];
}

// Allowlist: forward only headers needed by upstream services.
// Forwarding more (e.g. x-amzn-*, x-forwarded-*) makes API Gateway interpret
// the request as an AWS SigV4 attempt and reject the Authorization header.
const FORWARD_HEADERS = new Set([
  'authorization',
  'content-type',
  'accept',
  'cookie',
]);

function buildHeaders(req: FastifyRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (!FORWARD_HEADERS.has(name.toLowerCase())) continue;
    if (value === undefined) continue;
    headers[name] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return headers;
}

function copyResponseHeaders(reply: FastifyReply, headers: Record<string, string | string[]>): void {
  for (const [name, value] of Object.entries(headers)) {
    if (HOP_BY_HOP.has(name.toLowerCase())) continue;
    reply.header(name, value);
  }
}

async function handleProxy(req: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | void> {
  const params = req.params as { recipient: string; '*'?: string };
  const recipient = params.recipient;
  const upstreamBase = resolveRecipient(recipient);

  if (!upstreamBase) {
    return reply.code(502).send({ message: 'Cannot process request' });
  }

  const tail = params['*'] ? `/${params['*']}` : '';
  const queryString = req.raw.url?.includes('?') ? req.raw.url.slice(req.raw.url.indexOf('?')) : '';
  const upstreamUrl = `${upstreamBase.replace(/\/$/, '')}${tail}${queryString}`;

  const isCacheable =
    req.method === 'GET' && recipient === 'product' && (tail === '/products' || tail === '/products/');

  if (isCacheable) {
    const hit = cache.get(upstreamUrl);
    if (hit) {
      reply.code(hit.status);
      copyResponseHeaders(reply, hit.headers);
      reply.header('x-bff-cache', 'HIT');
      return reply.send(hit.body);
    }
  }

  const headers = buildHeaders(req);
  let body: Buffer | string | undefined;
  if (!['GET', 'HEAD'].includes(req.method) && req.body !== undefined) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    headers['content-type'] = headers['content-type'] ?? 'application/json';
  }

  try {
    const response = await undiciRequest(upstreamUrl, {
      method: req.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
      headers,
      body,
    });

    const responseBody = await response.body.text();
    const responseHeaders: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(response.headers)) {
      if (v !== undefined) responseHeaders[k] = v as string | string[];
    }

    if (isCacheable && response.statusCode >= 200 && response.statusCode < 300) {
      cache.set(upstreamUrl, {
        status: response.statusCode,
        headers: Object.fromEntries(Object.entries(responseHeaders).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : String(v)])),
        body: responseBody,
      });
    }

    if (
      recipient === 'product' &&
      (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') &&
      response.statusCode >= 200 &&
      response.statusCode < 300
    ) {
      cache.invalidate(`${upstreamBase.replace(/\/$/, '')}/products`);
    }

    reply.code(response.statusCode);
    copyResponseHeaders(reply, responseHeaders);
    reply.header('x-bff-cache', isCacheable ? 'MISS' : 'BYPASS');
    return reply.send(responseBody);
  } catch (err) {
    req.log.error(err, 'Upstream request failed');
    return reply.code(502).send({ message: 'Cannot process request' });
  }
}

async function bootstrap(): Promise<void> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok' }));

  app.all('/:recipient', handleProxy);
  app.all('/:recipient/*', handleProxy);

  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`BFF listening on :${PORT}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
