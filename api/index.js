import app from '../server/index.js';

export default function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = req.query?.__route ?? url.searchParams.get('__route');
  if (typeof route !== 'string' || !/^[\w/-]+$/.test(route)) {
    req.url = '/api/unknown';
    return app(req, res);
  }
  url.searchParams.delete('__route');
  req.url = `/api/${route}${url.search}`;
  return app(req, res);
}
