const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// When the site is served through Netlify, every API request reaches Render from a Netlify server,
// so req.ip would be the same for all users. Netlify passes the real visitor IP in this header.
// (Someone calling Render directly could fake it; that only affects their own rate limit bucket.)
function clientIp(req) {
  const nf = req.get('x-nf-client-connection-ip');
  return nf && /^[0-9a-fA-F:.]{3,45}$/.test(nf) ? nf : req.ip;
}

const limiter = opts => rateLimit({
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: req => ipKeyGenerator(clientIp(req)),
  ...opts
});

module.exports = { limiter, clientIp };
