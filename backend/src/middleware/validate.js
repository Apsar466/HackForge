/**
 * Request validation middleware helper using Joi
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message)
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errorDetails,
    })
  }
  req.body = value
  next()
}

module.exports = validate
