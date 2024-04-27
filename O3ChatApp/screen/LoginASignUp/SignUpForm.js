import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDB, S3 } from "aws-sdk";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  REGION,
  S3_BUCKET_NAME,
  DYNAMODB_TABLE_NAME,
} from "@env";

const SignUpForm = ({ navigation }) => {
  const [hoTen, setHoTen] = useState("");
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [nhapLaiMatKhau, setNhapLaiMatKhau] = useState("");
  const [avatarUser, setAvatarUser] = useState(null);
  const [fileType, setFileType] = useState(""); // Thêm state mới để lưu trữ fileType
  const [errors, setErrors] = useState({
    hoTen: "",
    email: "",
    matKhau: "",
    nhapLaiMatKhau: "",
  });

  const s3 = new S3({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: REGION,
  });
  const bucketName = S3_BUCKET_NAME;
  const tableName = DYNAMODB_TABLE_NAME;

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setAvatarUser(result.assets[0].uri);

      // Xác định fileType từ tên file
      const image = result.assets[0].uri.split(".");
      const fileType = image[image.length - 1];
      setFileType(fileType); // Lưu fileType vào state hoặc truyền vào hàm signUp
    }
  };

  const signUp = async () => {
    try {
      // Kiểm tra số điện thoại
      if (!email) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          email: "email không được để trống",
        }));
        return;
      } else if (
        !email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          email: "email phải có dạng example@gmail.com",
        }));
        return;
      }

      // Kiểm tra tên
      if (!hoTen.match(/^[a-zA-ZÀ-ỹ ]+$/)) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          hoTen: "Tên không được rỗng",
        }));
        return;
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          hoTen: "",
        }));
      }

      // Kiểm tra mật khẩu
      if (!/^.{8,}$/.test(matKhau)) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          matKhau: "Mật khẩu phải có ít nhất 8 ký tự",
        }));
        return;
      } else if (matKhau !== nhapLaiMatKhau) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          nhapLaiMatKhau: "Mật khẩu nhập lại không khớp",
        }));
        return;
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          matKhau: "",
          nhapLaiMatKhau: "",
        }));
      }

      if (!avatarUser) {
        Alert.alert("Thông báo", "Vui lòng chọn hình ảnh");
        return;
      }

      let contentType = "";
      switch (fileType) {
        case "jpg":
        case "jpeg":
          contentType = "image/jpeg";
          break;
        case "png":
          contentType = "image/png";
          break;
        case "gif":
          contentType = "image/gif";
          break;
        default:
          contentType = "application/octet-stream"; // Loại mặc định
      }
      const filePath = `${email}_${Date.now().toString()}.${fileType}`;

      // Sử dụng fetch để tải dữ liệu hình ảnh từ URI
      const response = await fetch(avatarUser);
      const blob = await response.blob();

      const paramsS3 = {
        Bucket: bucketName,
        Key: filePath,
        Body: blob, // Sử dụng dữ liệu blob của hình ảnh
        ContentType: contentType,
      };

      s3.upload(paramsS3, async (err, data) => {
        if (err) {
          console.error("Error uploading image to S3:", err);
          Alert.alert("Lỗi", "Có lỗi xảy ra khi tải lên hình ảnh");
        } else {
          const imageURL = data.Location;

          try {
            const responseOTP = await fetch(
              "http://172.28.107.37:3000/send-otp",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
              }
            );

            const dataOTP = await responseOTP.json();
            console.log(dataOTP);
            navigation.navigate("PhoneAuthScreen", {
              email,
              hoTen,
              matKhau,
              imageURL,
            });
          } catch (error) {
            console.error("Error saving user data to DynamoDB:", error);
            Alert.alert("Đăng ký thất bại");
          }
        }
      });
    } catch (error) {
      console.error("Lỗi khi đăng ký:", error);
      Alert.alert("Đăng ký thất bại");
    }
  };

  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });
  if (!fontsLoaded) {
    return null;
  }
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#4AD8C7", "#B728A9"]}
        style={styles.background}
      />
      <ScrollView>
        <View style={{ alignItems: "center" }}>
          <View style={styles.logo}>
            <Text style={styles.txtLogo}>4MChat</Text>
          </View>
          <Text
            style={{
              color: "#F5EEEE",
              fontSize: 40,
              fontWeight: "bold",
            }}
          >
            Đăng ký
          </Text>
          <TextInput
            style={{
              ...styles.inputHoTen,
              color: "#000",
              borderColor: errors.hoTen ? "red" : "transparent",
              borderWidth: errors.hoTen ? 1 : 0,
            }}
            placeholder="Họ và Tên"
            onChangeText={(text) => setHoTen(text)}
            value={hoTen}
          />
          <Text style={{ color: "red", fontSize: 12 }}>{errors.hoTen}</Text>
          <TextInput
            style={{
              ...styles.inputEmail,
              color: "#000",
              borderColor: errors.email ? "red" : "transparent",
              borderWidth: errors.email ? 1 : 0,
            }}
            placeholder="Email"
            onChangeText={(text) => setEmail(text)}
            value={email}
          />
          <Text style={{ color: "red", fontSize: 12 }}>{errors.email}</Text>
          <TextInput
            style={{
              ...styles.inputPass,
              color: "#000",
              borderColor: errors.matKhau ? "red" : "transparent",
              borderWidth: errors.matKhau ? 1 : 0,
            }}
            placeholder="Mật khẩu"
            secureTextEntry={true}
            onChangeText={(text) => setMatKhau(text)}
          />
          <Text style={{ color: "red", fontSize: 12 }}>{errors.matKhau}</Text>
          <TextInput
            style={{
              ...styles.inputConfirmPass,
              color: "#000",
              borderColor: errors.nhapLaiMatKhau ? "red" : "transparent",
              borderWidth: errors.nhapLaiMatKhau ? 1 : 0,
            }}
            placeholder="Nhập lại mật khẩu"
            secureTextEntry={true}
            onChangeText={(text) => setNhapLaiMatKhau(text)}
          />
          <Text style={{ color: "red", fontSize: 12 }}>
            {errors.nhapLaiMatKhau}
          </Text>

          <View
            style={{
              flexDirection: "row",
            }}
          >
            <Pressable style={styles.btnImg} onPress={pickImage}>
              <Text style={styles.txtImg}>Chọn hình ảnh</Text>
            </Pressable>
            <Image
              style={{
                width: 70,
                height: 70,
                marginLeft: 30,
                top: 30,
                borderRadius: 30,
              }}
              source={{ uri: avatarUser }}
            />
          </View>
          <Pressable style={styles.btnSignUp} onPress={signUp}>
            <Text style={styles.txtSignUp}>Đăng Ký</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  background: {
    position: "absolute",
    height: "100%",
    width: "100%",
  },
  txtLogo: {
    color: "#fff",
    fontSize: 64,
    fontFamily: "keaniaone-regular",
  },
  logo: {
    width: 243,
    alignItems: "center",
    height: 84,
    borderRadius: 10,
    backgroundColor: "rgba(217, 217, 217, 0.50)",
    marginTop: 48,
  },
  inputHoTen: {
    width: 318,
    height: 46,
    backgroundColor: "rgba(255, 255, 255, 0.80)",
    color: "#BCB2B2",
    fontSize: 16,
    borderRadius: 10,
    paddingLeft: 10,
    marginTop: 36,
  },
  inputEmail: {
    width: 318,
    height: 46,
    backgroundColor: "rgba(255, 255, 255, 0.80)",
    color: "#BCB2B2",
    fontSize: 16,
    borderRadius: 10,
    paddingLeft: 10,
    marginTop: 30,
  },
  inputPass: {
    width: 318,
    height: 46,
    backgroundColor: "rgba(255, 255, 255, 0.80)",
    color: "#BCB2B2",
    fontSize: 16,
    borderRadius: 10,
    paddingLeft: 10,
    marginTop: 30,
  },
  inputConfirmPass: {
    width: 318,
    height: 46,
    backgroundColor: "rgba(255, 255, 255, 0.80)",
    color: "#BCB2B2",
    fontSize: 16,
    borderRadius: 10,
    paddingLeft: 10,
    marginTop: 30,
  },
  btnSignUp: {
    width: 200,
    height: 50,
    borderRadius: 13,
    backgroundColor: "rgba(117, 40, 215, 0.47)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  txtSignUp: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  btnImg: {
    width: 150,
    height: 50,
    borderRadius: 13,
    backgroundColor: "rgba(117, 40, 215, 0.47)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  txtImg: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default SignUpForm;
