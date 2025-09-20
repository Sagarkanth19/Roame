const express = require("express");
const router = express.Router();
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const { isLoggedIn } = require("../middleware");

// =================================================================
//  GET: Show the booking form to the user
// =================================================================
router.get("/new/:listingId", isLoggedIn, async (req, res) => {
    try {
        const { listingId } = req.params;
        const listing = await Listing.findById(listingId);

        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }

        const bookings = await Booking.find({ listing: listingId });

        let disabledDates = [];
        bookings.forEach(b => {
            // ✅ CORRECTED: Create dates in UTC to avoid time zone shifts
            let currentDate = new Date(b.checkIn.toISOString().split('T')[0] + 'T00:00:00.000Z');
            const endDate = new Date(b.checkOut.toISOString().split('T')[0] + 'T00:00:00.000Z');

            // The loop now correctly operates on UTC dates
            // NOTE: The loop should go up to, but NOT include, the checkout date.
            while (currentDate < endDate) {
                disabledDates.push(currentDate.toISOString().split("T")[0]);
                // Use setUTCDate to safely increment the day in UTC
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        });

        res.render("bookings/new", {
            listing,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            disabledDates
        });

    } catch (e) {
        console.error("Error loading booking form:", e);
        req.flash("error", "Could not load the booking page.");
        res.redirect(`/listings/${req.params.listingId}`);
    }
});

module.exports = router;