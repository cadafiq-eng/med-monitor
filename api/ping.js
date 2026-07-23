export default function handler(req, res) {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'SALT'];
  const missing = required.filter((key) => !process.env[key]);

  res.status(missing.length ? 500 : 200).json({
    ok: missing.length === 0,
    api: 'online',
    env: missing.length === 0 ? 'configured' : 'missing',
    missing,
    time: new Date().toISOString(),
  });
}
