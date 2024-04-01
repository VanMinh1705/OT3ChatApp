import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  Modal,
  FlatList,
  ScrollView,
} from "react-native";
import { Dimensions } from "react-native";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDB } from "aws-sdk";
import IconAnt from "react-native-vector-icons/AntDesign";
import { ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION } from "@env";

export const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } =
  Dimensions.get("window");

const FriendScreen = ({ user, navigation }) => {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [numFriendRequests, setNumFriendRequests] = useState(0);

  const dynamoDB = new DynamoDB.DocumentClient({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });

  const fetchFriends = async () => {
    try {
      const getFriendsParams = {
        TableName: "Friends",
        Key: { senderPhoneNumber: user?.soDienThoai },
      };
      const friendData = await dynamoDB.get(getFriendsParams).promise();

      if (friendData.Item && friendData.Item.friends) {
        setFriends(friendData.Item.friends);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const getFriendRequestsParams = {
        TableName: "FriendRequests",
        Key: { soDienThoai: user?.soDienThoai },
      };
      const friendRequestsData = await dynamoDB
        .get(getFriendRequestsParams)
        .promise();

      if (friendRequestsData.Item && friendRequestsData.Item.friendRequests) {
        setFriendRequests(friendRequestsData.Item.friendRequests);
      } else {
        setFriendRequests([]);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, [user]);

  useEffect(() => {
    setNumFriendRequests(friendRequests.length);
  }, [friendRequests]);

  const handleAcceptFriendRequest = async (friendRequest) => {
    try {
      // Lấy danh sách bạn bè của người gửi lời mời từ cơ sở dữ liệu
      const getSenderFriendsParams = {
        TableName: "Friends",
        Key: { senderPhoneNumber: friendRequest.soDienThoai },
      };
      const senderFriendData = await dynamoDB
        .get(getSenderFriendsParams)
        .promise();

      // Cập nhật danh sách bạn bè của người gửi lời mời
      let updatedSenderFriends = [];
      if (!senderFriendData.Item) {
        updatedSenderFriends = [user];
      } else {
        updatedSenderFriends = [...(senderFriendData.Item.friends || []), user];
      }
      const updateSenderFriendEntry = {
        TableName: "Friends",
        Key: { senderPhoneNumber: friendRequest.soDienThoai },
        UpdateExpression: "set friends = :friends",
        ExpressionAttributeValues: { ":friends": updatedSenderFriends },
      };
      await dynamoDB.update(updateSenderFriendEntry).promise();

      // Lấy danh sách bạn bè của người nhận lời mời từ cơ sở dữ liệu
      const getReceiverFriendsParams = {
        TableName: "Friends",
        Key: { senderPhoneNumber: user?.soDienThoai },
      };
      const receiverFriendData = await dynamoDB
        .get(getReceiverFriendsParams)
        .promise();

      // Cập nhật danh sách bạn bè của người nhận lời mời
      let updatedReceiverFriends = [];
      if (!receiverFriendData.Item) {
        updatedReceiverFriends = [friendRequest];
      } else {
        updatedReceiverFriends = [
          ...(receiverFriendData.Item.friends || []),
          friendRequest,
        ];
      }
      const updateReceiverFriendEntry = {
        TableName: "Friends",
        Key: { senderPhoneNumber: user?.soDienThoai },
        UpdateExpression: "set friends = :friends",
        ExpressionAttributeValues: { ":friends": updatedReceiverFriends },
      };
      await dynamoDB.update(updateReceiverFriendEntry).promise();

      // Xóa lời mời kết bạn đã được chấp nhận khỏi danh sách lời mời kết bạn
      const getRequestParams = {
        TableName: "FriendRequests",
        Key: { soDienThoai: user?.soDienThoai },
      };
      const requestResult = await dynamoDB.get(getRequestParams).promise();

      if (!requestResult.Item || !requestResult.Item.friendRequests) {
        // Không có dữ liệu hoặc không có mảng friendRequests, không cần xóa
        return;
      }

      // Lọc ra mảng friendRequests mới mà không chứa friendRequest cần xóa
      const updatedFriendRequests = requestResult.Item.friendRequests.filter(
        (request) => request.soDienThoai !== friendRequest.soDienThoai
      );

      // Cập nhật lại mảng friendRequests mới vào cơ sở dữ liệu
      const updateParams = {
        TableName: "FriendRequests",
        Key: { soDienThoai: user?.soDienThoai },
        UpdateExpression: "SET friendRequests = :updatedRequests",
        ExpressionAttributeValues: {
          ":updatedRequests": updatedFriendRequests,
        },
      };
      await dynamoDB.update(updateParams).promise();

      // Cập nhật lại danh sách bạn bè và danh sách lời mời kết bạn
      fetchFriends();
      fetchFriendRequests();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const handleRejectFriendRequest = async (friendRequest) => {
    try {
      // Lấy danh sách friendRequests từ cơ sở dữ liệu
      const getRequestParams = {
        TableName: "FriendRequests",
        Key: { soDienThoai: user?.soDienThoai },
      };
      const requestResult = await dynamoDB.get(getRequestParams).promise();

      if (!requestResult.Item || !requestResult.Item.friendRequests) {
        // Không có dữ liệu hoặc không có mảng friendRequests, không cần xóa
        return;
      }

      // Lọc ra mảng friendRequests mới mà không chứa friendRequest cần xóa
      const updatedFriendRequests = requestResult.Item.friendRequests.filter(
        (request) => request.soDienThoai !== friendRequest.soDienThoai
      );

      // Cập nhật lại mảng friendRequests mới vào cơ sở dữ liệu
      const updateParams = {
        TableName: "FriendRequests",
        Key: { soDienThoai: user?.soDienThoai },
        UpdateExpression: "SET friendRequests = :updatedRequests",
        ExpressionAttributeValues: {
          ":updatedRequests": updatedFriendRequests,
        },
      };
      await dynamoDB.update(updateParams).promise();

      // Cập nhật lại danh sách lời mời kết bạn
      fetchFriendRequests();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
      fetchFriendRequests();
    }, [navigation])
  );

  const handleChatWithFriend = async (friend, user) => {
    try {
      // Tạo khóa kết hợp từ số điện thoại của người gửi và người nhận
      const senderReceiverKey = `${user.soDienThoai}_${friend.soDienThoai}`;
      const receiverSenderKey = `${friend.soDienThoai}_${user.soDienThoai}`;

      // Kiểm tra xem box chat đã tồn tại với khóa senderReceiverKey hoặc receiverSenderKey chưa
      const existingChatParams = {
        RequestItems: {
          BoxChats: {
            Keys: [
              { senderPhoneNumber: senderReceiverKey },
              { senderPhoneNumber: receiverSenderKey },
            ],
          },
        },
      };
      const existingChatData = await dynamoDB
        .batchGet(existingChatParams)
        .promise();

      // Nếu không tìm thấy box chat cho cả hai khóa, tạo mới
      if (existingChatData.Responses["BoxChats"].length === 0) {
        // Tạo box chat cho người gửi
        const senderChatParams = {
          RequestItems: {
            BoxChats: [
              {
                PutRequest: {
                  Item: {
                    senderPhoneNumber: senderReceiverKey,
                    receiverPhoneNumber: friend.soDienThoai,
                    messages: [],
                    // Thêm thông tin của người nhận vào box chat của người gửi
                    receiverInfo: {
                      soDienThoai: friend.soDienThoai,
                      hoTen: friend.hoTen,
                      avatarUser: friend.avatarUser,
                    },
                  },
                },
              },
              {
                PutRequest: {
                  Item: {
                    senderPhoneNumber: receiverSenderKey,
                    receiverPhoneNumber: user.soDienThoai,
                    messages: [],
                    // Thêm thông tin của người gửi vào box chat của người nhận
                    receiverInfo: {
                      soDienThoai: user.soDienThoai,
                      hoTen: user.hoTen,
                      avatarUser: user.avatarUser,
                    },
                  },
                },
              },
            ],
          },
        };
        await dynamoDB.batchWrite(senderChatParams).promise();
      }

      // Chuyển đến màn hình BoxChat với thông tin của người bạn
      navigation.navigate("BoxChat", { friend, user });
    } catch (error) {
      console.error("Error handling chat with friend:", error);
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
      <View style={styles.upperHeaderPlaceholer} />

      <View style={styles.viewContent}>
        <LinearGradient
          colors={["#4AD8C7", "#B728A9"]}
          style={styles.background}
        />
        <View style={styles.infoMenu}>
          <Pressable
            style={styles.menuTextContainer}
            onPress={() => {
              setModalVisible(true);
            }}
          >
            <Image
              style={styles.iconImage}
              source={require("../../assets/img/iconFriendScreen/icon-add-friend.png")}
            />
            <Text style={styles.txtUser}>Lời mời kết bạn</Text>
            {numFriendRequests > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{numFriendRequests}</Text>
              </View>
            )}
          </Pressable>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => {
              setModalVisible(!modalVisible);
            }}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.modalText}>Lời mời kết bạn</Text>
                <FlatList
                  data={friendRequests}
                  renderItem={({ item }) => (
                    <View
                      style={{
                        flexDirection: "row",
                        borderWidth: 1,
                        borderRadius: 10,
                        height: 60,
                        width: 300,
                        alignItems: "center",
                        padding: 3,
                      }}
                    >
                      <Image
                        style={{
                          width: 50,
                          height: 50,
                          borderWidth: 1,
                          borderColor: "#000",
                          borderRadius: 24,
                        }}
                        source={{ uri: item.avatarUser }}
                      />
                      <Text
                        style={{
                          color: "#000",
                          textAlign: "center",
                          marginLeft: 5,
                          fontSize: 18,
                          marginRight: 25,
                          fontWeight: "bold",
                        }}
                      >
                        {item.hoTen}
                      </Text>
                      <Pressable
                        onPress={() => handleAcceptFriendRequest(item)}
                      >
                        <IconAnt name="checkcircle" size={30} color={"green"} />
                      </Pressable>
                      <Pressable
                        style={{ marginLeft: 20 }}
                        onPress={() => handleRejectFriendRequest(item)}
                      >
                        <IconAnt name="closecircle" size={30} color={"red"} />
                      </Pressable>
                    </View>
                  )}
                  keyExtractor={(item, index) => index.toString()}
                />
                <Pressable
                  style={styles.buttonClose}
                  onPress={() => setModalVisible(!modalVisible)}
                >
                  <Text style={styles.textStyle}>Đóng</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>
        <View style={styles.contactPhone}>
          <ScrollView>
            {friends.length > 0 ? (
              friends.map((friend, index) => (
                <Pressable
                  onPress={() => handleChatWithFriend(friend, user)}
                  key={index}
                  style={styles.infoMenu}
                >
                  <Image
                    style={styles.avatarImage}
                    source={{ uri: friend.avatarUser }}
                  />
                  <Text style={styles.txtUser}>{friend.hoTen}</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.txtUser}>Không có bạn bè</Text>
            )}
          </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
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
    borderRadius: 25,
    marginLeft: 13,
  },
  txtUser: {
    color: "#000",
    fontSize: 18,
    marginLeft: 10,
  },
  contactPhone: {
    backgroundColor: "white",
    width: WINDOW_WIDTH,
    marginTop: 10,
    height: WINDOW_HEIGHT,
  },
  notificationBadge: {
    position: "absolute",
    left: 290,
    backgroundColor: "red",
    borderRadius: 50,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "white",
    fontSize: 12,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    width: "95%",
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
  modalText: {
    marginBottom: 15,
    textAlign: "center",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    width: 50,
    marginTop: 10,
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});
