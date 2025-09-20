const Joi = require("joi");
module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    // Step 1: Owner Info
    ownerName: Joi.string().required(),
    dob: Joi.date().required(),
    contact: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.pattern.base": "Contact must be a valid 10-digit phone number starting with 6-9",
      }),

    // Step 2: Place Details
    category: Joi.array().items(Joi.string()).min(1).required()
      .messages({
        "array.min": "Select at least one category",
      }),
    placeType: Joi.string()
      .valid("Entire place", "Private room", "Shared room")
      .required(),
    manualAddress: Joi.string().allow(null, ""),
    geometry: Joi.object({
      type: Joi.string().valid("Point").required(),
      coordinates: Joi.array()
        .items(Joi.number())
        .length(2)
        .required()
        .messages({
          "array.length": "Coordinates must be an array of length 2",
        }),
    }).required(),
    location: Joi.string().required(),

    // Step 3: Final Details
    guests: Joi.number().integer().min(1).required(),
    bedrooms: Joi.number().integer().min(0).required(),
    beds: Joi.number().integer().min(0).required(),
    bathrooms: Joi.number().integer().min(0).required(),
    image: Joi.object({
      url: Joi.string().allow(null, ""),
      filename: Joi.string().allow(null, ""),
    }).allow(null),

    title: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().min(0).required(),
    residentialAddress: Joi.string().required(),

    // Optional fields (not required here)
    reviews: Joi.array().items(Joi.string()), // array of review object IDs (strings)
    owner: Joi.string(), // owner ObjectId as string (optional for validation)
  }).required(),
});

// Add this new schema to your validation file

module.exports.updateListingSchema = Joi.object({
    listing: Joi.object({
        // All fields from your edit form remain required
        ownerName: Joi.string().required(),
        dob: Joi.date().required(),
        contact: Joi.string().pattern(/^[6-9]\d{9}$/).required().messages({
            "string.pattern.base": "Contact must be a valid 10-digit phone number",
        }),
        category: Joi.array().items(Joi.string()).min(1).required().messages({
            "array.min": "Select at least one category",
        }),
        placeType: Joi.string().valid("Entire place", "Private room", "Shared room").required(),
        guests: Joi.number().integer().min(1).required(),
        bedrooms: Joi.number().integer().min(0).required(),
        beds: Joi.number().integer().min(0).required(),
        bathrooms: Joi.number().integer().min(0).required(),
        title: Joi.string().required(),
        description: Joi.string().required(),
        price: Joi.number().min(0).required(),

        // Address-related fields are NOT required for updates, so they are omitted
        // manualAddress, geometry, location, residentialAddress are not here

    }).required(),
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required()
    }).required()
});