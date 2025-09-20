
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
  // Step 1: Owner Info
  ownerName: {
    type: String,
    required: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  contact: {  // Phone number, 10 digits as per your validation
    type: String,
    required: true,
    // You can add match for regex if you want mongoose validation as well
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number.'],
  },

  // Step 2: Place Details
  category: {
    type: [String], // Array of strings since your form allows multi-select checkboxes
    required: true,
    validate: [arr => arr.length > 0, "Select at least one category."],
  },
  placeType: {
    type: String,
    enum: ['Entire place', 'Private room', 'Shared room'],
    required: true,
  },
  manualAddress: {
    type: String,  // The user-entered "Full Address" used for geocoding, can be stored if needed
  },
  geometry: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
      
    },
  },
  location: {
    type: String,
    required: true,   // This is the full formatted address (includes country, city, etc.)
  },

  // Step 3: Final Details
  guests: {
    type: Number,
    required: true,
    min: 1,
  },
  bedrooms: {
    type: Number,
    required: true,
    min: 0,
  },
  beds: {
    type: Number,
    required: true,
    min: 0,
  },
  bathrooms: {
    type: Number,
    required: true,
    min: 0,
  },
  image: {
    url: String,
    filename: String,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },
  residentialAddress: {
    type: String,
    required: true,
  },

  // Common fields
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
});

// Post middleware to delete associated reviews when a listing is deleted
listingSchema.post("findOneAndDelete", async function(listing) {
  if (listing) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
