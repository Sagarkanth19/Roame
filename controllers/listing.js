const Listing = require("../models/listing.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const User = require("../models/user");
const Fuse = require("fuse.js");

module.exports.index = async (req, res) => {
  const { q, category } = req.query;
  let allListings;

  try {
    if (q && category) {
      const filtered = await Listing.find({ category });
      const fuse = new Fuse(filtered, {
        keys: ["title", "description", "location", "category"],
        threshold: 0.4,
      });
      allListings = fuse.search(q).map(r => r.item);
    } else if (q) {
      const all = await Listing.find({});
      const fuse = new Fuse(all, {
        keys: ["title", "description", "location", "category"],
        threshold: 0.4,
      });
      allListings = fuse.search(q).map(r => r.item);
    } else if (category) {
      allListings = await Listing.find({ category });
    } else {
      allListings = await Listing.find({});
    }

    res.render("listings/index.ejs", { allListings, q, category });
  } catch (err) {
    console.error("Error fetching listings:", err);
    req.flash("error", "Failed to load listings.");
    res.redirect("/");
  }
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate({
        path: "reviews",
        populate: { path: "author" },
      })
      .populate("owner");

    if (!listing) {
      req.flash("error", "Listing does not exist!");
      return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not find the listing.");
    res.redirect("/listings");
  }
};

module.exports.createListing = async (req, res) => {
  try {
    const { listing } = req.body;

    // ✅ Extract coordinates from nested geometry object
    const coords = listing.geometry?.coordinates;
    if (!coords || coords.length !== 2 || !coords[0] || !coords[1]) {
      req.flash("error", "Map location (latitude and longitude) is required.");
      return res.redirect("/listings/new");
    }

    const url = req.file?.path || "";
    const filename = req.file?.filename || "";

    const newListing = new Listing({
      ownerName: listing.ownerName,
      dob: listing.dob,
      contact: listing.contact,
      category: listing.category,
      placeType: listing.placeType,
      manualAddress: listing.manualAddress || "",
      location: listing.location,
      geometry: {
        type: "Point",
        coordinates: [
          parseFloat(coords[0]),
          parseFloat(coords[1])
        ],
      },
      guests: listing.guests,
      bedrooms: listing.bedrooms,
      beds: listing.beds,
      bathrooms: listing.bathrooms,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      residentialAddress: listing.residentialAddress,
      image: { url, filename },
      owner: req.user._id,
    });

    await newListing.save();

    if (!req.user.isHost) {
      const user = await User.findById(req.user._id);
      user.isHost = true;
      await user.save();
    }

    req.flash("success", "New listing created!");
    res.redirect("/listings");
  } catch (err) {
    console.error("Create listing error:", err);
    req.flash("error", "Something went wrong while creating the listing.");
    res.redirect("/listings/new");
  }
};


module.exports.renderEditForm = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash("error", "Listing does not exist!");
      return res.redirect("/listings");
    }

    let originalImageUrl = listing.image?.url || "";
    if (originalImageUrl) {
      originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_100,w_250");
    }

    res.render("listings/edit.ejs", { listing, originalImageUrl });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not load edit form.");
    res.redirect("/listings");
  }
};

module.exports.updateListing = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Find the complete, original listing from the database
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Cannot find that listing!");
            return res.redirect("/listings");
        }

        // 2. Get the editable data from the form
        const editableData = req.body.listing;

        // 3. Manually update ONLY the fields that should be editable.
        // This ensures permanent fields like address and geometry are NEVER touched.
        listing.ownerName = editableData.ownerName;
        listing.dob = editableData.dob;
        listing.contact = editableData.contact;
        listing.category = editableData.category;
        listing.placeType = editableData.placeType;
        listing.guests = editableData.guests;
        listing.bedrooms = editableData.bedrooms;
        listing.beds = editableData.beds;
        listing.bathrooms = editableData.bathrooms;
        listing.title = editableData.title;
        listing.description = editableData.description;
        listing.price = editableData.price;

        // 4. Handle the optional image update
        if (req.file) {
            listing.image = { url: req.file.path, filename: req.file.filename };
        }

        // 5. Save the document.
        // The original geometry is still on the 'listing' object, so validation will pass.
        await listing.save();

        req.flash("success", "Listing Updated Successfully!");
        res.redirect(`/listings/${id}`);

    } catch (err) {
        // Generic error handling
        console.error(err);
        req.flash("error", "Something went wrong while updating the listing.");
        res.redirect(`/listings/${req.params.id}/edit`);
    }
};

module.exports.destroyListing = async (req, res) => {
  try {
    const deletedListing = await Listing.findByIdAndDelete(req.params.id);
    if (!deletedListing) {
      req.flash("error", "Listing not found to delete!");
      return res.redirect("/listings");
    }

    req.flash("success", "Listing deleted!");
    res.redirect("/listings");
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to delete listing.");
    res.redirect("/listings");
  }
};
