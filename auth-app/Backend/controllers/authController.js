const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Otp = require("../models/Otp");

const generateOtp = require("../utils/generateOtp");
const sendOtpEmail = require("../utils/sendEmail");


// ==========================================
// REGISTER - SEND OTP
// ==========================================

const register = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();


    // Check if user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email already exists. Please login.",
      });
    }


    // Generate OTP
    const otp = generateOtp();

    // Hash OTP
    const otpHash = await bcrypt.hash(
      otp,
      10
    );


    // Expire after 10 minutes
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );


    // Remove old OTP
    await Otp.deleteMany({
      email: normalizedEmail,
      purpose: "registration",
    });


    // Save OTP
    await Otp.create({
      email: normalizedEmail,
      otpHash,
      expiresAt,
      purpose: "registration",
    });


    // Send email
    await sendOtpEmail(
      normalizedEmail,
      otp
    );


    res.json({
      success: true,
      message:
        "Verification code sent to your email.",
    });

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to start registration.",
    });
  }
};


// ==========================================
// VERIFY REGISTRATION OTP
// ==========================================

const verifyRegistrationOtp = async (
  req,
  res
) => {

  try {

    const { email, otp } = req.body;


    if (!email || !otp) {

      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required.",
      });

    }


    const normalizedEmail =
      email.trim().toLowerCase();


    const otpRecord =
      await Otp.findOne({
        email: normalizedEmail,
        purpose: "registration",
      });


    if (!otpRecord) {

      return res.status(400).json({
        success: false,
        message:
          "OTP not found. Please request a new code.",
      });

    }


    // Check expiry

    if (
      otpRecord.expiresAt <
      new Date()
    ) {

      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new code.",
      });

    }


    // Attempt limit

    if (otpRecord.attempts >= 5) {

      await Otp.deleteOne({
        _id: otpRecord._id,
      });

      return res.status(429).json({
        success: false,
        message:
          "Too many attempts. Request a new OTP.",
      });

    }


    // Compare OTP

    const valid =
      await bcrypt.compare(
        otp.toString(),
        otpRecord.otpHash
      );


    if (!valid) {

      otpRecord.attempts += 1;

      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: "Invalid OTP.",
      });

    }


    // OTP correct

    await Otp.deleteOne({
      _id: otpRecord._id,
    });

    // Generate short-lived verification token (15 minutes)
    const verificationToken = jwt.sign(
      {
        email: normalizedEmail,
        purpose: "registration_verified",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    res.json({
      success: true,
      message:
        "Email verified successfully.",
      verificationToken,
    });

  } catch (error) {

    console.error(
      "VERIFY REGISTRATION ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to verify email.",
    });

  }

};


// ==========================================
// COMPLETE REGISTRATION
// ==========================================

const completeRegistration = async (
  req,
  res
) => {

  try {

    const {
      email,
      password,
      confirmPassword,
      verificationToken,
    } = req.body;


    if (
      !email ||
      !password ||
      !confirmPassword
    ) {

      return res.status(400).json({
        success: false,
        message:
          "All fields are required.",
      });

    }


    if (!verificationToken) {

      return res.status(401).json({
        success: false,
        message:
          "Email verification is required.",
      });

    }


    const normalizedEmail =
      email.trim().toLowerCase();


    // Verify verification token
    let decoded;
    try {
      decoded = jwt.verify(
        verificationToken,
        process.env.JWT_SECRET
      );
    } catch (tokenErr) {
      if (tokenErr.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message:
            "Verification token has expired. Please verify your email again.",
        });
      }

      return res.status(401).json({
        success: false,
        message:
          "Invalid verification token. Please verify your email again.",
      });
    }


    if (
      !decoded ||
      decoded.purpose !== "registration_verified" ||
      !decoded.email ||
      decoded.email.trim().toLowerCase() !== normalizedEmail
    ) {

      return res.status(403).json({
        success: false,
        message:
          "Email verification is required or token does not match.",
      });

    }


    if (password !== confirmPassword) {

      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });

    }


    if (password.length < 8) {

      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters.",
      });

    }


    // Make sure account doesn't already exist

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });


    if (existingUser) {

      return res.status(409).json({
        success: false,
        message:
          "An account already exists. Please login.",
      });

    }


    // Hash password

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );


    // Create user

    const user =
      await User.create({
        email: normalizedEmail,
        password: passwordHash,
        provider: "email",
        isEmailVerified: true,
      });


    res.json({
      success: true,
      message:
        "Account created successfully.",
    });

  } catch (error) {

    console.error(
      "COMPLETE REGISTRATION ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to create account.",
    });

  }

};


// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {

  try {

    const {
      email,
      password,
    } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });

    }


    const normalizedEmail =
      email.trim().toLowerCase();


    const user =
      await User.findOne({
        email: normalizedEmail,
      });


    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "No account found with this email. Please register first.",
      });

    }


    // Check password

    const validPassword =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!validPassword) {

      return res.status(401).json({
        success: false,
        message:
          "Incorrect email or password.",
      });

    }


    // Create JWT

    const token =
      jwt.sign(
        {
          userId:
            user._id.toString(),

          email:
            user.email,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "7d",
        }
      );


    // Cookie

    res.cookie(
      "token",
      token,
      {
        httpOnly: true,

        secure: false,

        sameSite: "lax",

        maxAge:
          7 *
          24 *
          60 *
          60 *
          1000,
      }
    );


    res.json({
      success: true,
      message:
        "Login successful.",
      user: {
        id: user._id,
        email: user.email,
      },
    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to login.",
    });

  }

};


// ==========================================
// GET CURRENT USER
// ==========================================

const getMe = async (req, res) => {

  try {

    const user =
      await User.findById(
        req.user.userId
      ).select("-password");


    if (!user) {

      return res.status(404).json({
        success: false,
        message:
          "User not found.",
      });

    }


    res.json({
      success: true,
      user,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message:
        "Unable to get user.",
    });

  }

};


// ==========================================
// LOGOUT
// ==========================================

const logout = (req, res) => {

  res.clearCookie("token");

  res.json({
    success: true,
    message:
      "Logged out successfully.",
  });

};


module.exports = {
  register,
  verifyRegistrationOtp,
  completeRegistration,
  login,
  getMe,
  logout,
};