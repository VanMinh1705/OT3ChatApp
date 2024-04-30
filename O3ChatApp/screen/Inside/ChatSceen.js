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
import { useFocusEffect } from "@react-navigation/native";
import {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  REGION,
  DYNAMODB_TABLE_NAME,
} from "@env";

export const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } =
  Dimensions.get("window");

const ChatScreen = ({ navigation, user, friend }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [boxChats, setBoxChats] = useState([]);
  const [searchResult, setSearchResult] = useState([]);
  const [searchedUser, setSearchedUser] = useState(null);
  const [selectedBoxChat, setSelectedBoxChat] = useState(null);
  const [isFriend, setIsFriend] = useState(false);
  useEffect(() => {
    fetchBoxChats();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchBoxChats();
    }, [])
  );

  const fetchBoxChats = async () => {
    try {
      const senderReceiverKey = user.email.split("_")[0]; // Chỉ lấy phần trước dấu "_"
      const params = {
        TableName: "BoxChats",
        FilterExpression: "begins_with(senderEmail, :senderEmail)",
        ExpressionAttributeValues: {
          ":senderEmail": senderReceiverKey,
        },
      };
      const response = await dynamoDB.scan(params).promise();
      if (response.Items) {
        setBoxChats(response.Items);
      }
    } catch (error) {
      console.error("Error fetching box chats:", error);
    }
  };
  const handleChatWithSearchedUser = (user) => {
    // Kiểm tra xem người dùng tìm kiếm có phải là bạn bè không
    const isFriend = boxChats.some(
      (boxChat) => boxChat.receiverInfo.email === user.email
    );
    setIsFriend(isFriend);
    navigation.navigate("BoxChat", { friend: user, user: user });
  };
  const handleChatWithFriend = (friend) => {
    navigation.navigate("BoxChat", { friend, user });
  };

  const searchUser = async (searchText) => {
    try {
      // Kiểm tra nếu không có dữ liệu nhập vào hoặc độ dài của dữ liệu nhập là 0
      if (!searchText || searchText.trim().length === 0) {
        setSearchResult([]); // Ẩn giao diện kết quả tìm kiếm
        return;
      }

      // Tìm kiếm trước trong bảng Friends dựa trên email của bạn
      let params = {
        TableName: "Friends",
        Key: {
          senderEmail: user?.email, // Thay YOUR_EMAIL_HERE bằng email của bạn
        },
      };

      let response = await dynamoDB.get(params).promise();

      if (response.Item && response.Item.friends) {
        // Lọc ra các mục trong mảng friends mà chứa searchText
        const users = response.Item.friends
          .filter((friend) => {
            return (
              friend.email
                .toLowerCase()
                .includes(searchText.toLowerCase().trim()) ||
              friend.hoTen
                .toLowerCase()
                .includes(searchText.toLowerCase().trim())
            );
          })
          .map(async (friend) => {
            const isFriend = await checkFriendshipStatus(friend.email);
            return { ...friend, isFriend };
          });

        // Chờ cho tất cả các promise hoàn thành trước khi cập nhật state
        const resolvedUsers = await Promise.all(users);
        setSearchResult(resolvedUsers);

        // Kiểm tra nếu có kết quả từ bảng Friends thì kết thúc hàm tìm kiếm
        if (resolvedUsers.length > 0) {
          return;
        }
      }

      // Nếu không tìm thấy trong bảng Friends và searchText không phải là một địa chỉ email hợp lệ,
      // thì không tìm trong bảng Users và kết thúc hàm tìm kiếm
      if (!isValidEmail(searchText) && !isValidPhoneNumber(searchText)) {
        return;
      }

      if (searchText === user.email || searchText === user.soDienThoai) {
        return;
      }

      // Nếu không tìm thấy trong bảng Friends và searchText là một địa chỉ email hợp lệ,
      // tìm trong bảng Users
      params = {
        TableName: DYNAMODB_TABLE_NAME,
        FilterExpression:
          "contains(email, :search) or contains(soDienThoai, :search)",
        ExpressionAttributeValues: {
          ":search": searchText.toLowerCase().trim(),
        },
      };

      response = await dynamoDB.scan(params).promise();

      if (response.Items) {
        const users = await Promise.all(
          response.Items.map(async (item) => {
            const isFriend = await checkFriendshipStatus(item.email);
            return { ...item, isFriend };
          })
        );
        setSearchResult(users);
      } else {
        setSearchResult([]);
      }
    } catch (error) {
      console.error("Error searching user:", error);
      setSearchResult([]);
    }
  };

  // Hàm kiểm tra xem một chuỗi có phải là một địa chỉ email hợp lệ không
  const isValidEmail = (email) => {
    // Sử dụng một biểu thức chính quy để kiểm tra xem chuỗi có khớp với định dạng email hay không
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhoneNumber = (phoneNumber) => {
    // Sử dụng một biểu thức chính quy để kiểm tra xem chuỗi có khớp với định dạng số điện thoại hay không
    const phoneRegex = /^0\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  const handleChangeText = (text) => {
    setEmail(text); // Cập nhật state email
    searchUser(text); // Gọi hàm searchUser với dữ liệu nhập vào
  };

  const handleClearText = () => {
    setEmail("");
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
            <Text style={styles.receiverMessage}>
              {boxChat.messages.length > 0
                ? boxChat.messages[boxChat.messages.length - 1].isSender
                  ? "Bạn: " +
                    boxChat.messages[boxChat.messages.length - 1].content
                  : boxChat.receiverInfo.hoTen +
                    ": " +
                    boxChat.messages[boxChat.messages.length - 1].content // Lấy tên của người nhận
                : ""}
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
      // Kiểm tra email có tồn tại trong bảng User không
      const userExistsParams = {
        TableName: DYNAMODB_TABLE_NAME,
        Key: { email: email },
      };

      const userData = await dynamoDB.get(userExistsParams).promise();

      if (!userData.Item) {
        // Hiển thị thông báo nếu email không tồn tại
        alert("Email không tồn tại");
        return;
      }

      // Kiểm tra xem email đã kết bạn với bạn chưa
      const isFriendParams = {
        TableName: "Friends",
        Key: { senderEmail: user?.email },
      };
      const friendData = await dynamoDB.get(isFriendParams).promise();

      if (friendData.Item && friendData.Item.friends) {
        const isFriend = friendData.Item.friends.some(
          (friend) => friend.email === email
        );
        if (isFriend) {
          // Hiển thị thông báo nếu đã kết bạn với người dùng này
          alert("Bạn đã kết bạn với người dùng này");
          return;
        }
      }

      // Kiểm tra nếu email là của chính bạn
      if (email === user?.email) {
        alert("Đây là email của bạn, không thể kết bạn!");
        return;
      }

      // Thêm thông tin của người nhận vào danh sách lời mời kết bạn của người gửi
      const addFriendRequestParams = {
        TableName: "FriendRequests",
        Key: { email: email },
        UpdateExpression:
          "SET friendRequests = list_append(if_not_exists(friendRequests, :empty_list), :request)",
        ExpressionAttributeValues: {
          ":request": [
            {
              email: user?.email,
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
  const checkFriendshipStatus = async (searchedEmail) => {
    try {
      // Kiểm tra trong bảng Friends
      const friendsParams = {
        TableName: "Friends",
        Key: { senderEmail: user.email },
      };
      const friendsData = await dynamoDB.get(friendsParams).promise();
      if (friendsData.Item && friendsData.Item.friends) {
        const isFriend = friendsData.Item.friends.some(
          (friend) => friend.email === searchedEmail
        );
        if (isFriend) return true;
      }

      // Kiểm tra trong bảng FriendRequests
      const friendRequestsParams = {
        TableName: "FriendRequests",
        Key: { email: searchedEmail },
      };
      const friendRequestsData = await dynamoDB
        .get(friendRequestsParams)
        .promise();
      if (friendRequestsData.Item && friendRequestsData.Item.friendRequests) {
        const hasFriendRequest = friendRequestsData.Item.friendRequests.some(
          (request) => request.email === user.email
        );
        if (hasFriendRequest) return false; // Nếu có lời mời kết bạn, không được coi là bạn bè
      }

      return false; // Nếu không có mối quan hệ hoặc lời mời, không phải là bạn bè
    } catch (error) {
      console.error("Error checking friendship status:", error);
      return false;
    }
  };
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
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
          <Pressable onPress={searchUser}>
            <IconAnt name="search1" size={30} color={"#fff"} />
          </Pressable>
          <View style={{ flexDirection: "row" }}>
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
              value={email}
              onChangeText={handleChangeText}
            />
            <Pressable
              style={{
                position: "absolute",
                right: 10,
                top: 5,
              }}
              onPress={handleClearText}
            >
              <IconAnt name="close" size={15} color={"#000"} />
            </Pressable>
          </View>
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
                placeholder="Nhập email"
                onChangeText={(text) => setEmail(text)}
                value={email}
              />
              <View style={{ flexDirection: "row" }}>
                <Pressable
                  style={{
                    left: -60,
                    backgroundColor: "#3de36f",
                    marginTop: 10,
                    width: 60,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    sendFriendRequest();
                  }}
                >
                  <Text style={styles.textStyle}>Kết bạn</Text>
                </Pressable>
                <Pressable
                  style={{
                    left: 60,
                    backgroundColor: "#db8781",
                    marginTop: 10,
                    width: 60,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.textStyle}>Hủy</Text>
                </Pressable>
              </View>
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

        {/* Hiển thị kết quả tìm kiếm */}
        {searchResult.length > 0 && email.length > 0 && (
          <View
            style={[
              styles.searchResultsContainer,
              {
                backgroundColor: "#fff",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
              },
            ]}
          >
            {searchResult.map((user, index) => (
              <Pressable
                key={index}
                style={styles.searchResultItem}
                onPress={() => {
                  if (user.isFriend) {
                    handleChatWithFriend(user);
                  } else {
                    handleChatWithSearchedUser(user);
                  }
                }}
              >
                <Image
                  source={{ uri: user.avatarUser }}
                  style={styles.avatar}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.searchResultName}>{user.hoTen}</Text>
                  <Text style={styles.searchResultEmail}>{user.email}</Text>
                  {/* Hiển thị các thông tin khác của người dùng nếu cần */}
                </View>
                {!user.isFriend && (
                  <Pressable
                    style={styles.addButton}
                    onPress={() => sendFriendRequest(user.email)}
                  >
                    <Text style={styles.addButtonText}>Kết bạn</Text>
                  </Pressable>
                )}
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.scrollViewContent} />
      </ScrollView>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  addButton: {
    backgroundColor: "#03c6fc",
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 5,
    alignSelf: "center",
    marginLeft: "auto",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  searchResultItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  searchResultName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 2,
  },
  searchResultEmail: {
    color: "#888",
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
    backgroundColor: "#fff",
    borderRadius: 10,
    margin: 2,
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
  receiverMessage: {
    fontSize: 14,
    color: "#888",
  },
});
