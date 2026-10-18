import { handleApi } from '../../src/api.js';
export async function onRequest({ request, env, params }) { return handleApi(request, env, (params.path || []).join('/')); }
