import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Pressable,
} from "react-native";
import React from "react";
import { Dimensions } from "react-native";
import IconAnt from "react-native-vector-icons/AntDesign";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";

export const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } =
  Dimensions.get("window");

const FriendScreen = () => {
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });
  if (!fontsLoaded) {
    return null;
  }
  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaView>
        <View style={styles.upperHeaderPlaceholer} />
      </SafeAreaView>

      <View style={styles.viewContent}>
        <LinearGradient
          // Background Linear Gradient
          colors={["#4AD8C7", "#B728A9"]}
          style={styles.background}
        />
        <View style={styles.infoMenu}>
          <Image
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginLeft: 10,
              resizeMode: "contain",
            }}
            source={require("../../assets/img/iconFriendScreen/icon-add-friend.png")}
          />
          <Pressable style={{ marginLeft: 10 }}>
            <Text style={styles.txtUser}>Lời mời kết bạn</Text>
          </Pressable>
        </View>
        <View style={styles.infoMenu}>
          <Image
            style={{
              width: 46,
              height: 46,
              borderRadius: 20,
              marginLeft: 13,
            }}
            source={require("../../assets/img/iconFriendScreen/icon-list.png")}
          />
          <Pressable style={{ marginLeft: 10 }}>
            <Text style={styles.txtUser}>Danh bạ máy</Text>
          </Pressable>
        </View>
        <View style={styles.infoMenu}>
          <Image
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              marginLeft: 10,
              resizeMode: "contain",
            }}
            source={require("../../assets/img/iconFriendScreen/icon-birthday.png")}
          />
          <Pressable style={{ marginLeft: 10 }}>
            <Text style={styles.txtUser}>Lịch sinh nhật</Text>
          </Pressable>
        </View>
        <View style={styles.contactPhone}>
          <Text>Thông tin danh bạ liên lạc ở đây</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};
export default FriendScreen;

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
  header: {
    width: "100%",
    height: "100%",
    backgroundColor: "#03c6fc",
    position: "absolute",
  },

  scrollViewContent: {
    height: WINDOW_HEIGHT,
    backgroundColor: "white",
  },
  viewContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
  },
  infoMenu: {
    width: "100%",
    height: 65,
    fontSize: 16,
    paddingLeft: 10,
    borderWidth: 1,
    backgroundColor: "white",
    flexDirection: "row",
    borderColor: "#ccc",
    alignItems: "center",
  },
  securityAccount: {
    flexDirection: "row",
    marginTop: 10,
    backgroundColor: "white",
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  txtSecurity: {
    marginLeft: 10,
    fontSize: 20,
    marginTop: 12,
  },
  Privacy: {
    flexDirection: "row",
    backgroundColor: "white",
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  txtPrivacy: {
    marginLeft: 10,
    fontSize: 20,
    marginTop: 12,
  },
  txtUser: {
    color: "#000",
    fontSize: 18,
  },
  txtViewUser: {
    color: "#696969",
    fontSize: 16,
  },
  contactPhone: {
    backgroundColor: "white",
    width: WINDOW_WIDTH,
    marginTop: 10,
    height: WINDOW_HEIGHT,
  },
});
