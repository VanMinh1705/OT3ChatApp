const express = require("express");
const nodemailer = require("nodemailer");
const generatorOTP = require("./generatorOTP");
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

app.post("/send-otp", async (req, res) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "huynhvminhofficial@gmail.com",
      pass: "wbag hyzg ocum csfw",
    },
  });

  // Tạo OTP ngẫu nhiên 6 chữ số
  let otp = generatorOTP();
  let email = req.body.email;
  let mailOptions = {
    from: {
      name: "Minh Huynh",
      address: "huynhvminhofficial@gmail.com",
    },
    to: email,
    subject: "OTP for Verification",
    text: `Your OTP is: ${otp}`,
  };

  const sendMail = async (transporter, mailOptions) => {
    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
      res.json({ message: "Email sent successfully", otp: otp });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "An error occurred while sending email" });
    }
  };
  sendMail(transporter, mailOptions);
});

app.listen(3000, () => console.log("Server started on port 3000"));
