import { handleApi, runCron } from './api.js';
import * as R from '../public/recur.mjs';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env, url.pathname.slice(5));
    return env.ASSETS.fetch(req);
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(runCron(env, R)); }
};
