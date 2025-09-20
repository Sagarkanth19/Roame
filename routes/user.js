const express = require("express");
const router = express.Router();
const passport = require("passport");
const users = require("../controllers/users");

// -----------------------------
// SIGNUP & OTP
// -----------------------------
router
  .route("/signup")
  .get(users.renderSignupForm)   // show signup form
  .post(users.signup);           // handle signup + send OTP (JSON)

// OTP verify
router.post("/verify-otp", users.verifyOtp);

// Resend OTP
router.post("/resend-otp", users.resendOtp);

// -----------------------------
// LOGIN / LOGOUT
// -----------------------------
router
  .route("/login")
  .get(users.renderLoginForm) // show login form
  .post(
    passport.authenticate("local", { failureFlash: true, failureRedirect: "/login" }),
    users.login                 // returns JSON, not redirect
  );

// Logout
router.get("/logout", users.logout);

// -----------------------------
// DASHBOARD (protected)
// -----------------------------
const { isLoggedIn } = require("../middleware");
router.get("/dashboard", isLoggedIn, users.dashboard);

module.exports = router;
