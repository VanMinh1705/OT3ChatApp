const express = require("express");
const nodemailer = require("nodemailer");
const generatorOTP = require("./generatorOTP");
const AWS = require("aws-sdk"); // Import AWS SDK
const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: "",
  accessKeyId: "",
  secretAccessKey: "",
});

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

      // Lưu email và OTP vào DynamoDB
      const params = {
        TableName: "OptCheck", // Tên bảng DynamoDB
        Item: {
          email: email,
          otp: otp,
        },
      };

      await dynamoDB.put(params).promise(); // Lưu dữ liệu vào DynamoDB

      res.json({ message: "Email sent successfully", otp: otp });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "An error occurred while sending email" });
    }
  };
  sendMail(transporter, mailOptions);
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Kiểm tra xem email và OTP có tồn tại trong DynamoDB không
    const params = {
      TableName: "OptCheck",
      Key: {
        email: email,
      },
    };

    const result = await dynamoDB.get(params).promise();

    if (!result || !result.Item || result.Item.otp !== otp) {
      // Nếu không tìm thấy hoặc OTP không khớp, trả về lỗi
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    // Nếu email và OTP hợp lệ, xóa dữ liệu OTP từ DynamoDB
    await dynamoDB.delete(params).promise();

    // Trả về thành công
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while verifying OTP" });
  }
});

app.listen(3000, () => console.log("Server started on port 3000"));
