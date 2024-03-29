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
  Modal,
} from "react-native";
import React from "react";
import { useState, useEffect } from "react";
import { Dimensions } from "react-native";
import IconAnt from "react-native-vector-icons/AntDesign";
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

const ChatScreen = ({ navigation, user }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [boxChats, setBoxChats] = useState([]);

  useEffect(() => {
    fetchBoxChats();
  }, []);

  const fetchBoxChats = async () => {
    try {
      const params = {
        TableName: "BoxChats",
        KeyConditionExpression: "senderPhoneNumber = :senderPhoneNumber",
        ExpressionAttributeValues: {
          ":senderPhoneNumber": user?.soDienThoai,
        },
      };
      const response = await dynamoDB.query(params).promise();
      if (response.Items) {
        setBoxChats(response.Items);
      }
    } catch (error) {
      console.error("Error fetching box chats:", error);
    }
  };

  const handleChatWithFriend = (friend) => {
    navigation.navigate("BoxChat", { friend, user });
  };

  // Render danh sách các box chat
  const renderBoxChats = () => {
    return boxChats.map((boxChat, index) => (
      <Pressable
        key={index}
        style={styles.boxChatItem}
        onPress={() => handleChatWithFriend(boxChat.receiverInfo)}
      >
        <View style={styles.boxChatItemContent}>
          <Image
            source={{ uri: boxChat.receiverInfo.avatarUser }}
            style={styles.avatar}
          />
          <View style={styles.textContainer}>
            <Text style={styles.receiverName}>
              {boxChat.receiverInfo.hoTen}
            </Text>
            <Text style={styles.receiverPhoneNumber}>
              {boxChat.receiverPhoneNumber}
            </Text>
          </View>
        </View>
      </Pressable>
    ));
  };

  const dynamoDB = new DynamoDB.DocumentClient({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });

  const sendFriendRequest = async () => {
    try {
      // Kiểm tra số điện thoại có tồn tại trong bảng User không
      const userExistsParams = {
        TableName: DYNAMODB_TABLE_NAME,
        Key: { soDienThoai: phoneNumber },
      };

      const userData = await dynamoDB.get(userExistsParams).promise();

      if (!userData.Item) {
        // Hiển thị thông báo nếu số điện thoại không tồn tại
        alert("Số điện thoại không tồn tại");
        return;
      }

      // Kiểm tra xem số điện thoại đã kết bạn với bạn chưa
      const isFriendParams = {
        TableName: "Friends",
        Key: { senderPhoneNumber: user?.soDienThoai },
      };
      const friendData = await dynamoDB.get(isFriendParams).promise();

      if (friendData.Item && friendData.Item.friends) {
        const isFriend = friendData.Item.friends.some(
          (friend) => friend.soDienThoai === phoneNumber
        );
        if (isFriend) {
          // Hiển thị thông báo nếu đã kết bạn với người dùng này
          alert("Bạn đã kết bạn với người dùng này");
          return;
        }
      }

      // Kiểm tra nếu số điện thoại là của chính bạn
      if (phoneNumber === user?.soDienThoai) {
        alert("Đây là số điện thoại của bạn, không thể kết bạn!");
        return;
      }

      // Thêm thông tin của người nhận vào danh sách lời mời kết bạn của người gửi
      const addFriendRequestParams = {
        TableName: "FriendRequests",
        Key: { soDienThoai: phoneNumber },
        UpdateExpression:
          "SET friendRequests = list_append(if_not_exists(friendRequests, :empty_list), :request)",
        ExpressionAttributeValues: {
          ":request": [
            {
              soDienThoai: user?.soDienThoai,
              hoTen: user?.hoTen,
              avatarUser: user?.avatarUser,
            },
          ],
          ":empty_list": [],
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(addFriendRequestParams).promise();

      // Hiển thị thông báo thành công
      alert("Đã gửi lời mời kết bạn!");
      setFriendRequestSent(true);
      setModalVisible(false);
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Đã xảy ra lỗi khi gửi lời mời kết bạn");
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
      <StatusBar barStyle="light-content" backgroundColor={"#1197bd"} />

      <SafeAreaView>
        <View style={styles.upperHeaderPlaceholer} />
      </SafeAreaView>

      <SafeAreaView style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginTop: 10,
          }}
        >
          <IconAnt name="search1" size={30} color={"#fff"} />
          <TextInput
            placeholder="Tìm kiếm"
            placeholderTextColor={"#fff"}
            style={{
              width: 235,
              height: 30,
              color: "#000",
              fontSize: 16,
              borderRadius: 10,
              paddingLeft: 10,
              borderWidth: 1,
            }}
          />
          <Pressable
            onPress={() => {
              navigation.navigate("QRScanner");
            }}
          >
            <IconAnt name="qrcode" size={30} color={"#fff"} />
          </Pressable>
          <Pressable
            onPress={() => {
              setModalVisible(true);
              setFriendRequestSent(false);
            }}
          >
            <IconAnt name="plus" size={30} color={"#fff"} />
          </Pressable>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <View style={styles.modalView}>
              <TextInput
                style={styles.input}
                placeholder="Nhập số điện thoại"
                onChangeText={(text) => setPhoneNumber(text)}
                value={phoneNumber}
              />
              <Pressable
                style={[
                  styles.button,
                  { backgroundColor: "red", marginTop: 10 },
                ]}
                onPress={() => {
                  sendFriendRequest();
                }}
              >
                <Text style={styles.textStyle}>Kết bạn</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  { backgroundColor: "red", marginTop: 10 },
                ]}
                onPress={() => {
                  setModalVisible(false);
                }}
              >
                <Text style={styles.textStyle}>Hủy</Text>
              </Pressable>
            </View>
          </Modal>
        </View>
        <View style={styles.logo}>
          <Text style={styles.txtLogo}>4MChat</Text>
        </View>
        <View style={styles.upperHeader} />
        <View style={styles.lowerHeader} />
      </SafeAreaView>
      <ScrollView>
        <View style={styles.paddingForHeader} />
        <View style={styles.viewContent}>
          <LinearGradient
            colors={["#4AD8C7", "#B728A9"]}
            style={styles.background}
          />
          {/* Render BoxChatt */}
          {renderBoxChats()}
        </View>
        <View style={styles.scrollViewContent} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChatScreen;

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
    backgroundColor: "#03c6fc",
    position: "absolute",
  },
  paddingForHeader: {
    height: 50,
  },
  upperHeaderPlaceholer: {
    height: 50,
  },
  upperHeader: {
    height: 50,
  },
  lowerHeader: {
    height: 50,
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
  txtLogo: {
    color: "#fff",
    fontSize: 30,
    fontFamily: "keaniaone-regular",
  },
  logo: {
    width: 120,
    alignItems: "center",
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(217, 217, 217, 0.50)",
    alignSelf: "center",
    marginTop: 10,
  },
  modalView: {
    marginTop: WINDOW_HEIGHT / 2 - 100,
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: WINDOW_WIDTH - 100,
    borderRadius: 5,
  },

  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  boxChatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  boxChatItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  textContainer: {
    justifyContent: "center",
  },
  receiverName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  receiverPhoneNumber: {
    fontSize: 14,
    color: "#888",
  },
});
