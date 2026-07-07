const { validationResult } = require("express-validator");
const { fail } = require("../utils/respond");

module.exports = function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return fail(res, errors.array()[0].msg, 422, errors.array());
};
