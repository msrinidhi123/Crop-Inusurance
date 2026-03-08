const express = require("express");
const router = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware");
const Claim = require("../models/Claim");
const Policy = require("../models/Policy");
const User = require("../models/User");
const { sendSMS } = require("../utils/sms");
// ================= APPROVE POLICY =================
// ================= GET PENDING POLICIES =================
router.get("/all-policies", async (req, res) => {
  try {
    const policies = await Policy.find()
      .populate("userId", "name email mobile photo")
      .sort({ createdAt: -1 });

    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.put("/approve-policy/:id", async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id).populate("userId");

    if (!policy)
      return res.status(404).json({ message: "Policy not found" });

    policy.status = "Active";

    const today = new Date();
    policy.startDate = today;

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 180);
    policy.endDate = expiry;

    await policy.save();

    res.json({ message: "Policy Approved & Activated for 180 Days" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ================= REJECT POLICY =================
router.put("/reject-policy/:id", async (req, res) => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy)
      return res.status(404).json({ message: "Policy not found" });

    policy.status = "Rejected";
    await policy.save();

    res.json({ message: "Policy Rejected" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/claims", async (req, res) => {
  try {
    const claims = await Claim.find()
      .populate("userId", "name email mobile language")
      .populate("policyId")
      .sort({ createdAt: -1 });

    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/approve-claim/:id", async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate("policyId")
      .populate("userId"); // 👈 Needed for mobile

    if (!claim)
      return res.status(404).json({ message: "Claim not found" });

    // ✅ Mark claim approved
    claim.status = "Approved";
    await claim.save();

    // ✅ Mark policy as Claimed
    const policy = await Policy.findById(claim.policyId._id);

    if (policy) {
      policy.status = "Claimed";
      await policy.save();
    }

    // ================= SMS PART ADDED =================

    if (claim.userId && claim.userId.mobile) {
      try {
        await sendSMS(
          "+91" + claim.userId.mobile,
          `Hello ${claim.userId.name}, your crop insurance claim has been APPROVED successfully.`
        );
        console.log("SMS sent successfully");
      } catch (smsError) {
        console.log("SMS sending failed:", smsError.message);
      }
    }

    // Optional: SMS to admin (your number)
    try {
      await sendSMS(
        "+919014463028",
        `Admin Alert: Claim ID ${claim._id} approved successfully.`
      );
    } catch (err) {
      console.log("Admin SMS failed");
    }

    // ===================================================

    res.json({ message: "Claim approved & policy marked as Claimed" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.put("/reject-claim/:id", async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim)
      return res.status(404).json({ message: "Claim not found" });

    claim.status = "Rejected";
    await claim.save();

    res.json({ message: "Claim rejected" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;