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
  const [soDienThoai, setSoDienThoai] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [nhapLaiMatKhau, setNhapLaiMatKhau] = useState("");
  const [avatarUser, setAvatarUser] = useState(null);
  const [fileType, setFileType] = useState(""); // Thêm state mới để lưu trữ fileType
  const [errors, setErrors] = useState({
    hoTen: "",
    soDienThoai: "",
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
      if (!soDienThoai) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          soDienThoai: "Số điện thoại không được để trống",
        }));
        return;
      } else if (soDienThoai.length !== 10) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          soDienThoai: "Số điện thoại phải có 10 số",
        }));
        return;
      } else if (!soDienThoai.match(/^(0)[0-9]{9}$/)) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          soDienThoai: "Số điện thoại phải có định dạng số 0 đầu tiên",
        }));
        return;
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          soDienThoai: "",
        }));
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
      if (!matKhau.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]+$/)) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          matKhau: "Mật khẩu phải có chữ hoa, chữ thường và số",
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
      const filePath = `${soDienThoai}_${Date.now().toString()}.${fileType}`;

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

          // Lưu thông tin người dùng vào DynamoDB
          const paramsDynamoDb = {
            TableName: tableName,
            Item: {
              soDienThoai: soDienThoai,
              hoTen: hoTen,
              matKhau: matKhau,
              avatarUser: imageURL,
            },
          };

          try {
            const dynamoDB = new DynamoDB.DocumentClient({
              region: REGION,
              accessKeyId: ACCESS_KEY_ID,
              secretAccessKey: SECRET_ACCESS_KEY,
            });

            await dynamoDB.put(paramsDynamoDb).promise();
            Alert.alert("Đăng ký thành công");
            navigation.navigate("LoginForm");
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
        />
        <Text style={{ color: "red", fontSize: 12 }}>{errors.hoTen}</Text>
        <TextInput
          style={{
            ...styles.inputSDT,
            color: "#000",
            borderColor: errors.soDienThoai ? "red" : "transparent",
            borderWidth: errors.soDienThoai ? 1 : 0,
          }}
          placeholder="Số điện thoại"
          onChangeText={(text) => setSoDienThoai(text)}
          keyboardType="phone-pad" // Bàn phím chỉ hiển thị số
        />
        <Text style={{ color: "red", fontSize: 12 }}>{errors.soDienThoai}</Text>
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
          <Pressable style={styles.btnSignUp} onPress={pickImage}>
            <Text style={styles.txtSignUp}>Chọn hình ảnh</Text>
          </Pressable>
          <Image
            style={{
              width: 40,
              height: 40,
              alignSelf: "center",
              marginLeft: 30,
            }}
            source={{ uri: avatarUser }}
          />
        </View>
        <Pressable style={styles.btnSignUp} onPress={signUp}>
          <Text style={styles.txtSignUp}>Đăng Ký</Text>
        </Pressable>
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
  inputSDT: {
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
});

export default SignUpForm;
