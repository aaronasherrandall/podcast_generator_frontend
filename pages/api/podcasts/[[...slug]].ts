import { NextApiRequest, NextApiResponse } from 'next';
import httpProxyMiddleware from 'next-http-proxy-middleware';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await httpProxyMiddleware(req, res, {
    target: 'http://127.0.0.1:8000',
    pathRewrite: [
      {
        patternStr: '^/api/podcasts',
        replaceStr: '/podcasts/',
      },
    ],
  });
}
