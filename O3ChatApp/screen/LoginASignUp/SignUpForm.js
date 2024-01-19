import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";

const SignUpForm = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });
  if (!fontsLoaded) {
    return null;
  }
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        // Background Linear Gradient
        colors={["#4AD8C7", "#B728A9"]}
        style={styles.background}
      />
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
        style={{ ...styles.inputHoTen, color: "#000" }}
        placeholder="Họ và Tên"
      />
      <TextInput
        style={{ ...styles.inputSDT, color: "#000" }}
        placeholder="Số điện thoại"
      />
      <TextInput
        style={{ ...styles.inputPass, color: "#000" }}
        placeholder="Mật khẩu"
      />
      <TextInput
        style={{ ...styles.inputConfirmPass, color: "#000" }}
        placeholder="Nhập lại mật khẩu"
      />

      <Pressable style={styles.btnSignUp}>
        <Text style={styles.txtSignUp}>Đăng Ký</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default SignUpForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
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
