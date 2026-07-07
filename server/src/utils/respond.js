function ok(res, message, data = null, status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message, status = 500, data = null) {
  return res.status(status).json({ success: false, message, data });
}

module.exports = { ok, fail };
