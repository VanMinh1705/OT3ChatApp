// import { useState } from "react";
// import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
// import AWS from "aws-sdk";
// // import bcrypt from "bcryptjs";
// import {
//   ACCESS_KEY_ID,
//   SECRET_ACCESS_KEY,
//   REGION,
//   S3_BUCKET_NAME,
//   DYNAMODB_TABLE_NAME,
// } from "@env";

// // Configure AWS
// AWS.config.update({
//   accessKeyId: ACCESS_KEY_ID,
//   secretAccessKey: SECRET_ACCESS_KEY,
//   region: REGION,
// });

// const dynamodb = new AWS.DynamoDB.DocumentClient();

// const PhoneAuthScreen = ({ route, navigation }) => {
//   const [otp, setOtp] = useState(Array(6).fill(""));
//   const { soDienThoai, hoTen, matKhau, avatarUser } = route.params;

//   const handleChange = (index) => {
//     return (text) => {
//       let newOtp = [...otp];
//       newOtp[index] = text;
//       setOtp(newOtp);
//     };
//   };

//   const handleVerify = () => {
//     // Handle OTP verification here
//     const actualOtp = getActualOtp(); // Replace this with your function to get the actual OTP

//     const enteredOtp = otp.join("");
//     if (enteredOtp !== actualOtp) {
//       Alert.alert("Invalid OTP", "Please enter the correct OTP.");
//       return;
//     }
//     // After OTP verification, save data to AWS
//     // const hashedPassword = bcrypt.hashSync(matKhau, 8);
//     const params = {
//       TableName: DYNAMODB_TABLE_NAME,
//       Item: {
//         soDienThoai: soDienThoai,
//         hoTen: hoTen,
//         matKhau: matKhau,
//         avatarUser: avatarUser,
//       },
//     };

//     dynamodb.put(params, (err, data) => {
//       if (err) {
//         console.error("Error saving data to AWS:", err);
//         Alert.alert(
//           "Error",
//           "There was an error saving your data. Please try again."
//         );
//       } else {
//         console.log("Data saved to AWS:", data);
//         navigation.navigate("LoginForm");
//       }
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Enter OTP</Text>
//       <View style={styles.otpContainer}>
//         {otp.map((digit, index) => (
//           <TextInput
//             key={index}
//             style={styles.otpInput}
//             keyboardType="numeric"
//             maxLength={1}
//             onChangeText={handleChange(index)}
//             value={digit}
//           />
//         ))}
//       </View>
//       <Button title="Verify" onPress={handleVerify} />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 20,
//   },
//   otpContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginBottom: 20,
//   },
//   otpInput: {
//     width: 40,
//     height: 40,
//     borderWidth: 1,
//     borderColor: "#000",
//     textAlign: "center",
//   },
// });

// export default PhoneAuthScreen;
