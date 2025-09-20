if (process.env.NODE_ENV !== "production") {
    require("dotenv").config({ path: __dirname + "/../.env" });
}

const mongoose = require("mongoose");
const initData = require("./data.js"); // Your sample listings data
const Listing = require("../models/listing.js"); // Your Listing model

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

// ✅ Safety check
if (!dbUrl) {
  console.error("❌ ATLASDB_URL is not defined. Please check your .env file or environment variables.");
  process.exit(1); // Stop execution
}

// Function to connect to the database
async function main() {
  // await mongoose.connect(MONGO_URL);
  await mongoose.connect(dbUrl);
}

main()
  .then(() => {
    console.log("✅ Connected to DB");
    initDB(); // Run the seeder function after connecting
  })
  .catch((err) => {
    console.log(err);
  });

// The main seeder function
const initDB = async () => {
  //Clear all existing listings
  await Listing.deleteMany({});
  console.log("Existing listings deleted.");

  
  const ownerIds = [
    "68c9bbed92573d723d1fa85c", 
    "68c9c53fd71ef6e3235ec3d2", 
    "68c9c656d71ef6e3235ec3db", 
  ];

  // 3. Map through the sample data and assign a random owner to each listing
  const updatedListings = initData.data.map((obj) => {
    // Pick a random index from the ownerIds array
    const randomIndex = Math.floor(Math.random() * ownerIds.length);
    const randomOwner = ownerIds[randomIndex];

    // Return the new listing object with the owner property
    return { ...obj, owner: randomOwner };
  });

  // 4. Insert the updated array of listings into the database
  await Listing.insertMany(updatedListings);
  console.log("✅ Data was initialized with random owners.");
};
