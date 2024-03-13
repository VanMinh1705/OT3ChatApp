import React, { useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";

const LoginForm = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch(
        "https://650424bdc8869921ae2491fd.mockapi.io/users"
      );

      if (!response.ok) {
        throw new Error("Network request failed");
      }

      const userData = await response.json();

      // Find the user with matching phone number and password
      const user = userData.find(
        (u) => u.soDT === phoneNumber && u.matKhau === password
      );

      if (user) {
        // Authentication successful
        navigation.navigate("HomeScreen", { user });
      } else {
        // Authentication failed
        Alert.alert("Login Failed", "Invalid phone number or password");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  if (!fontsLoaded) {
    return undefined;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#4AD8C7", "#B728A9"]}
        style={styles.background}
      />
      <View style={styles.logo}>
        <Text style={styles.txtLogo}>4MChat</Text>
      </View>

      <TextInput
        style={{ ...styles.inputSdt, color: "#000" }}
        placeholder="Số điện thoại"
        onChangeText={(text) => setPhoneNumber(text)}
        value={phoneNumber}
      />
      <TextInput
        style={{ ...styles.inputPass, color: "#000" }}
        placeholder="Mật khẩu"
        secureTextEntry
        onChangeText={(text) => setPassword(text)}
        value={password}
      />
      <Text
        style={{ color: "#0B0B0B", fontSize: 14, marginTop: 20 }}
        onPress={() => {
          // Implement the logic for handling forgotten password
          Alert.alert("Forgot Password", "Feature coming soon");
        }}
      >
        Quên mật khẩu?
      </Text>
      <Pressable onPress={handleLogin} style={styles.btnLogin}>
        <Text style={styles.txtLogin}>Đăng Nhập</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default LoginForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
<<<<<<< HEAD
    // backgroundColor: "transparent",
    // backgroundImage: "linear-gradient(180deg, #4AD8C7, #B728A9)", // Định nghĩa linear gradient bằng cách sử dụng backgroundImage
=======
>>>>>>> 77219f6b0b11d7883cead69f6a3a566262c3edf7
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
  inputSdt: {
    width: 318,
    height: 46,
    backgroundColor: "rgba(255, 255, 255, 0.80)",
    color: "#BCB2B2",
    fontSize: 16,
    borderRadius: 10,
    paddingLeft: 10,
    marginTop: 36,
  },
  inputPass: {
    width: 318,
    height: 46,
    backgroundColor: "rgba(255, 255, 255, 0.80)",
    color: "#BCB2B2",
    fontSize: 16,
    borderRadius: 10,
    paddingLeft: 10,
    marginTop: 36,
  },
  btnLogin: {
    width: 200,
    height: 50,
    borderRadius: 13,
    backgroundColor: "rgba(117, 40, 215, 0.47)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  txtLogin: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
});
