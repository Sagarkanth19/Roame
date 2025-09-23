const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto"); // 👈 **Important: Required for payment verification**
const router = express.Router();
const generateInvoice = require("../utils/generateInvoice");
const path = require("path");
const Booking = require("../models/booking");

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =================================================================
//  STEP 1: CREATE RAZORPAY ORDER
//  (Does NOT save the booking to the database)
// =================================================================
router.post("/create-order", async (req, res) => {
    try {
        const { amount } = req.body;

        // Create Razorpay order options
        const options = {
            amount: Math.round(amount * 100), // amount in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        // Create the order with Razorpay
        const order = await instance.orders.create(options);
        
        // Send the order details to the frontend to open the payment modal
        res.json(order);

    } catch (err) {
        console.error("❌ Error creating Razorpay order:", err);
        res.status(500).json({ error: "Error creating Razorpay order" });
    }
});

// =================================================================
//  STEP 2: VERIFY PAYMENT & SAVE BOOKING
//  (This is the most critical new part)
// =================================================================
// =================================================================
//  STEP 2: VERIFY PAYMENT & SAVE BOOKING
// =================================================================
router.post("/verify-payment", async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingDetails // contains checkIn, checkOut, listingId, guests, amount
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            console.log("❌ Payment verification failed: Invalid signature.");
            return res.status(400).json({ status: "failure" });
        }

        console.log("✅ Payment verification successful.");
        
        // ✅ CORRECTED: Create dates in UTC to prevent time zone errors.
        const checkInDate = new Date(bookingDetails.checkIn + "T00:00:00.000Z");
        const checkOutDate = new Date(bookingDetails.checkOut + "T00:00:00.000Z");

        // 🔒 Check for booking conflicts. This query finds any booking that overlaps with the requested date range.
        const existingBooking = await Booking.findOne({
            listing: bookingDetails.listingId,
            $or: [
                { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
            ]
        });
        
        if (existingBooking) {
            console.log("❌ Booking conflict found.");
            return res.status(400).json({ 
                status: "failure", 
                message: "Sorry, these dates are no longer available. Please select different dates." 
            });
        }

        // ✅ No conflict → Save the new booking with the correct checkOut date.
        const booking = new Booking({
            user: req.user._id,
            listing: bookingDetails.listingId,
            checkIn: checkInDate,
            checkOut: checkOutDate, // ✅ CORRECTED: Use the actual checkOutDate from the booking details.
            guests: bookingDetails.guests,
            totalPrice: bookingDetails.amount,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
        });

        await booking.save();
        req.session.bookingId = booking._id;
        res.json({ status: "success", bookingId: booking._id });

    } catch (err) {
        console.error("❌ Error verifying payment:", err);
        res.status(500).json({ error: "Server error during payment verification" });
    }
});
// =================================================================
//  STEP 3: RENDER THE SUCCESS PAGE
//  (This runs after the booking is successfully saved)
// =================================================================
router.get("/payment-success", async (req, res) => {
    try {
        const booking = await Booking.findById(req.session.bookingId).populate("user listing");

        if (!booking) {
            req.flash("error", "Booking not found or session expired.");
            return res.redirect("/listings");
        }

        const base = Math.round(booking.totalPrice / 1.15);
        const gst = booking.totalPrice - base;
        const total = booking.totalPrice;

        // Use existing invoice if already generated
        let invoiceId = booking.invoiceId;
        let filePath = booking.invoiceFilePath;

        if (!invoiceId || !filePath) {
            invoiceId = `INV-${booking._id.toString().slice(-6).toUpperCase()}`;
            const fileName = `${invoiceId}.pdf`;
            filePath = path.join(__dirname, "../invoices", fileName);

            const bookingData = {
                invoiceId,
                customerName: booking.user?.name || booking.user?.username || "Guest",
                date: booking.createdAt.toLocaleDateString(),
                from: booking.checkIn.toLocaleDateString(),
                to: booking.checkOut.toLocaleDateString(),
                baseAmount: base,
                gst: gst,
                totalAmount: total,
            };
const fs = require("fs");

const invoicesDir = path.join(__dirname, "../invoices");
if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir);
}

            generateInvoice(bookingData, filePath);

            // Save invoice info in DB
            booking.invoiceId = invoiceId;
            booking.invoiceFilePath = filePath;
            await booking.save();
        }

        // Render success page
        res.render("bookings/success", {
            booking: {
                invoiceId: booking.invoiceId,
                customerName: booking.user?.name || booking.user?.username || "Guest",
                date: booking.createdAt.toLocaleDateString(),
                from: booking.checkIn.toLocaleDateString(),
                to: booking.checkOut.toLocaleDateString(),
                baseAmount: base,
                gst,
                totalAmount: total
            },
            invoiceFile: `/invoices/${booking.invoiceId}.pdf`,
        });
    } catch (err) {
        console.error("Error on payment success page:", err);
        req.flash("error", "Something went wrong while showing your booking confirmation.");
        res.redirect("/listings");
    }
});

module.exports = router;
