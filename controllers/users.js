require("dotenv").config();
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user");
const Booking = require("../models/booking");
const Listing = require("../models/listing");

// Temporary OTP store (in-memory for simplicity)
const otpStore = {};

// Render signup page
module.exports.renderSignupForm = (req, res) => {
  res.render("users/signup.ejs");
};

// Signup - send OTP
module.exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log("📩 Signup attempt:", { username, email });

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ error: "Email already registered" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    otpStore[email] = {
      username,
      password,
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    console.log("🔑 OTP generated:", otp);

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Roamé - Verify your Email",
      text: `Your OTP is: ${otp}`
    });

    console.log("📧 OTP sent to:", email);

    res.json({ success: "OTP sent to your email", email });

  } catch (err) {
    console.error("❌ Signup Error:", err);
    res.json({ error: "Something went wrong. Please try again." });
  }
};

// Verify OTP & create user
module.exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = otpStore[email];
    if (!record) return res.json({ error: "No OTP request found for this email." });

    if (record.otp === otp && record.expires > Date.now()) {
      // OTP valid → create user
      const user = new User({ username: record.username, email, isVerified: true });
      const registeredUser = await User.register(user, record.password);

      // Remove from temp store
      delete otpStore[email];

      // Auto login
      req.login(registeredUser, (err) => {
        if (err) return res.json({ error: "Login failed. Please try again." });
        return res.json({ success: "Email verified! Account created and logged in." });
      });
    } else {
      return res.json({ error: "Invalid or expired OTP." });
    }
  } catch (err) {
    console.error(err);
    return res.json({ error: "Something went wrong during OTP verification." });
  }
};

// Resend OTP
module.exports.resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const record = otpStore[email];
    if (!record) return res.json({ error: "No OTP request found for this email." });

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    record.otp = otp;
    record.expires = Date.now() + 5 * 60 * 1000;

    // Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Roamé - Verify your Email",
      text: `Your new OTP is: ${otp}`
    });

    res.json({ success: "A new OTP has been sent to your email." });

  } catch (err) {
    console.error(err);
    res.json({ error: "Something went wrong while resending OTP." });
  }
};
// Render login page
module.exports.renderLoginForm = (req, res) => {
  res.render("users/login.ejs");
};

// Login handler (username + password only)
module.exports.login = (req, res) => {
  // At this point, Passport has already authenticated the user
  req.flash("success", "Welcome back to Roamé!");
  res.redirect("/listings");
};

// Logout
module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You are logged out!");
    res.redirect("/login");
  });
};


// Dashboard
module.exports.dashboard = async (req, res) => {
  const user = req.user;

  let userBookings = await Booking.find({ user: user._id }).populate("listing");
  userBookings = userBookings.filter((b) => b.listing);

  let hostListings = [];
  let bookingsOnHostListings = [];

  if (user.isHost) {
    hostListings = await Listing.find({ owner: user._id });
    const listingIds = hostListings.map((l) => l._id);
    bookingsOnHostListings = await Booking.find({
      listing: { $in: listingIds },
    }).populate("user listing");
    bookingsOnHostListings = bookingsOnHostListings.filter((b) => b.listing && b.user);
  }

  res.render("users/dashboard", {
    user,
    userBookings,
    hostListings,
    bookingsOnHostListings,
  });
};
