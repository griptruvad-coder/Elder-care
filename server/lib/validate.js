// Small helper: validate req.body with a zod schema, reply 400 with a friendly message on failure.
const validate = schema => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.') || 'input';
    return res.status(400).json({ error: `${field}: ${issue.message}` });
  }
  req.body = result.data;
  next();
};

module.exports = { validate };
