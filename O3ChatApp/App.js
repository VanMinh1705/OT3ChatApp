import * as React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import AnimationBackground from "./screen/AnimationBackground";

const LoginASign = () => {
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("./assets/fonts/KeaniaOne-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return undefined;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        // Background Linear Gradient
        colors={["#4AD8C7", "#B728A9"]}
        style={styles.background}
      />
      <View style={styles.logo}>
        <Text style={styles.txtLogo}>O3Chat</Text>
      </View>
      <Pressable style={styles.btnLogin}>
        <Text style={styles.txtLogin}>Đăng Nhập</Text>
      </Pressable>
      <Pressable style={styles.btnSignUp}>
        <Text style={styles.txtSignUp}>Đăng Ký</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AnimationBackground"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen
          name="AnimationBackground"
          component={AnimationBackground}
        />
        <Stack.Screen name="LoginASign" component={LoginASign} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

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
    marginTop: 132,
  },
  btnLogin: {
    width: 200,
    height: 50,
    borderRadius: 13,
    backgroundColor: "rgba(117, 40, 215, 0.47)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 150,
  },
  txtLogin: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  btnSignUp: {
    width: 200,
    height: 50,
    borderRadius: 13,
    backgroundColor: "rgba(117, 40, 215, 0.47)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  txtSignUp: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
  },
});
