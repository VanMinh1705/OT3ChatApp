import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Dimensions } from "react-native";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDB } from "aws-sdk";
import {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  REGION,
  DYNAMODB_TABLE_NAME,
} from "@env";

export const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } =
  Dimensions.get("window");

const FriendScreen = ({ user, navigation }) => {
  const [friends, setFriends] = useState([]);
  const dynamoDB = new DynamoDB.DocumentClient({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });

  const fetchFriends = async () => {
    try {
      const getFriendsParams = {
        TableName: "Messager",
        Key: { senderPhoneNumber: user?.soDienThoai },
      };
      const friendData = await dynamoDB.get(getFriendsParams).promise();

      if (friendData.Item && friendData.Item.receiverPhoneNumbers) {
        setFriends(friendData.Item.receiverPhoneNumbers);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  // Sử dụng useFocusEffect để gọi fetchFriends mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [navigation])
  );

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
          colors={["#4AD8C7", "#B728A9"]}
          style={styles.background}
        />
        <View style={styles.infoMenu}>
          <Image
            style={styles.iconImage}
            source={require("../../assets/img/iconFriendScreen/icon-add-friend.png")}
          />
          <Pressable style={styles.menuTextContainer}>
            <Text style={styles.txtUser}>Lời mời kết bạn</Text>
          </Pressable>
        </View>
        <View style={styles.infoMenu}>
          <Image
            style={styles.avatarImage}
            source={require("../../assets/img/iconFriendScreen/icon-list.png")}
          />
          <Pressable style={styles.menuTextContainer}>
            <Text style={styles.txtUser}>{user?.soDienThoai}</Text>
          </Pressable>
        </View>
        <View style={styles.infoMenu}>
          <Image
            style={styles.iconImage}
            source={require("../../assets/img/iconFriendScreen/icon-birthday.png")}
          />
          <Pressable style={styles.menuTextContainer}>
            <Text style={styles.txtUser}>Lịch sinh nhật</Text>
          </Pressable>
        </View>
        <View style={styles.contactPhone}>
          {friends.map((friend, index) => (
            <View key={index} style={styles.infoMenu}>
              <Image
                style={styles.avatarImage}
                source={{ uri: friend.avatarUser }}
              />
              <Pressable style={styles.menuTextContainer}>
                <Text style={styles.txtUser}>{friend.hoTen}</Text>
              </Pressable>
            </View>
          ))}
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
  viewContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
  },
  infoMenu: {
    width: "100%",
    height: 65,
    paddingLeft: 10,
    borderWidth: 1,
    backgroundColor: "white",
    flexDirection: "row",
    borderColor: "#ccc",
    alignItems: "center",
  },
  menuTextContainer: {
    marginLeft: 10,
  },
  iconImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginLeft: 10,
    resizeMode: "contain",
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 20,
    marginLeft: 13,
  },
  txtUser: {
    color: "#000",
    fontSize: 18,
  },
  contactPhone: {
    backgroundColor: "white",
    width: WINDOW_WIDTH,
    marginTop: 10,
    height: WINDOW_HEIGHT,
  },
});
