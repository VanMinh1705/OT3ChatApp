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
  Alert,
  BackHandler,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { Checkbox } from "react-native-paper";
import { Dimensions } from "react-native";
import IconAnt from "react-native-vector-icons/AntDesign";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDB, S3 } from "aws-sdk";
import { useFocusEffect } from "@react-navigation/native";

import {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  REGION,
  S3_BUCKET_NAME,
  DYNAMODB_TABLE_NAME,
} from "@env";

import { useState } from "react";
export const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } =
  Dimensions.get("window");

const CreateGroupScreen = ({ navigation, route }) => {
  const { user } = route.params;
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });
  const [friends, setFriends] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [avatarUri, setAvatarUri] = useState(user?.avatarGroup);
  const [fileType, setFileType] = useState("");
  const bucketName = S3_BUCKET_NAME;
  const [isAvatarSelected, setIsAvatarSelected] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState({});
  const [groupChats, setGroupChats] = useState([]);
  const [groupName, setGroupName] = useState("");
  const groupNameRef = useRef(null);

  const tableName = DYNAMODB_TABLE_NAME;

  const dynamoDB = new DynamoDB.DocumentClient({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });

  const fetchFriends = async () => {
    try {
      const getFriendsParams = {
        TableName: "Friends",
        Key: { senderEmail: user?.email },
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

  useEffect(() => {
    fetchFriends();
  }, [user]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        navigation.goBack();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [navigation]);
  const pickAvatar = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Xác định fileType từ tên file
        const image = result.assets[0].uri.split(".");
        const fileType = image[image.length - 1];

        // Set state avatarUri và fileType
        setAvatarUri(result.assets[0].uri);
        setFileType(fileType);
        setIsAvatarSelected(true);
        // Upload avatar
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking avatar:", error);
      Alert.alert("Error", "Failed to pick avatar");
    }
  };
  const uploadAvatar = async (avatarUri) => {
    try {
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
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const filePath = `${user?.email}_${Date.now().toString()}.${fileType}`;

      const s3 = new S3({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      });

      const paramsS3 = {
        Bucket: S3_BUCKET_NAME,
        Key: filePath,
        Body: blob,
        ContentType: contentType,
        ContentLength: blob.size,
      };

      const data = await s3.upload(paramsS3).promise();
      updateGroupAvatar(data.Location);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert("Error", "Failed to upload avatar");
    }
  };

  const updateGroupAvatar = async (avatarUrl) => {
    try {
      const dynamoDB = new DynamoDB.DocumentClient({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      });

      const paramsDynamoDb = {
        TableName: tableName,
        Key: { email: user.email },
        UpdateExpression: "set avatarGroup = :avatar",
        ExpressionAttributeValues: {
          ":avatar": avatarUrl,
        },
        ReturnValues: "UPDATED_NEW",
      };

      // Cập nhật đường dẫn avatar mới trong cơ sở dữ liệu DynamoDB
      await dynamoDB.update(paramsDynamoDb).promise();

      // Cập nhật đường dẫn avatar mới trong state avatarUri
      setAvatarUri(avatarUrl);

      Alert.alert("Xong", "Avatar đã được cập nhật!");
    } catch (error) {
      console.error("Error updating user data:", error);
      Alert.alert("Error", "Failed to update user data");
    }
  };
  const handleSelectFriend = (index) => {
    setSelectedFriends((prevState) => ({
      ...prevState,
      [index]: !prevState[index],
    }));
  };
  const checkMinimumSelectedMembers = () => {
    const selectedCount = Object.values(selectedFriends).filter(
      (selected) => selected
    ).length;
    return selectedCount >= 2;
  };

  const createGroup = async () => {
    if (checkMinimumSelectedMembers()) {
      try {
        const groupId = `${user.email}_${Date.now().toString()}`;
        const groupNameValue = groupName;
        const getSelectedFriendsEmail = () => {
          const selectedFriendsEmail = Object.keys(selectedFriends)
            .filter((index) => selectedFriends[index])
            .map((index) => friends[index].email);
          // Thêm email của người dùng vào danh sách thành viên
          selectedFriendsEmail.push(user.email);
          return selectedFriendsEmail;
        };

        const groupData = {
          groupId: groupId,
          members: getSelectedFriendsEmail(), // Sửa đổi ở đây để trả về một mảng các địa chỉ email riêng lẻ
          groupName: groupNameValue, // Sử dụng giá trị từ state
          avatarGroup: avatarUri || "", // Đảm bảo avatarUri được xác định hoặc gán giá trị mặc định
          messages: [],
        };

        const putParams = {
          TableName: "GroupChats",
          Item: groupData,
        };

        await dynamoDB.put(putParams).promise();

        navigation.navigate("PhoneBookScreen", { groups: groupData });
      } catch (error) {
        console.error("Error creating group:", error);
        Alert.alert("Error", "Failed to create group");
      }
    } else {
      Alert.alert(
        "Thông báo",
        "Bạn cần chọn ít nhất 2 thành viên để tạo nhóm."
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaView>
        <View style={styles.upperHeaderPlaceholer} />
      </SafeAreaView>

      <SafeAreaView style={styles.header}>
        <Text
          style={{ fontSize: 18, textAlign: "center", alignItems: "center" }}
        >
          Nhóm mới
        </Text>
      </SafeAreaView>
      <View style={styles.paddingForHeader} />
      <View style={styles.viewContent}>
        <LinearGradient
          colors={["#4AD8C7", "#B728A9"]}
          style={styles.background}
        />

        {/* Chọn ảnh nhóm và đặt tên nhóm */}
        <View style={styles.infoPersonal}>
          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <Pressable onPress={pickAvatar}>
              {isAvatarSelected ? (
                <Image
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 25,
                  }}
                  source={
                    avatarUri
                      ? { uri: avatarUri }
                      : require("../../assets/img/no-avatar.png")
                  }
                />
              ) : (
                <IconAnt name="camerao" size={40} color="black" />
              )}
            </Pressable>
            <View style={{ marginLeft: 10, flexDirection: "row" }}>
              <TextInput
                style={[
                  styles.textInput,
                  isInputFocused && styles.textInputFocused,
                ]}
                placeholder="Đặt tên nhóm"
                value={groupName}
                onChangeText={(text) => setGroupName(text)}
              />
            </View>
          </View>
          {/* Tìm tên danh bạ */}
          <View>
            <View
              style={{
                width: "95%",
                borderRadius: 10,
                flexDirection: "row",
                backgroundColor: "#DDDDDD",
                marginTop: 20,
              }}
            >
              <IconAnt
                name="search1"
                size={25}
                color={"#fff"}
                style={{ marginLeft: 10, marginTop: 3 }}
              />
              <TextInput
                placeholder="Tìm tên hoặc email"
                placeholderTextColor={"#fff"}
                style={{
                  width: "90%",
                  height: 30,
                  color: "#000",
                  fontSize: 16,
                  borderRadius: 10,
                  paddingLeft: 10,
                }}
              />
            </View>
            <Text style={styles.pickMember}>Chọn thành viên</Text>
          </View>
        </View>
        <View style={styles.contactPhone}>
          <ScrollView>
            {friends.length > 0 ? (
              friends.map((friend, index) => (
                <Pressable
                  key={index}
                  style={styles.infoMenu}
                  onPress={() => handleSelectFriend(index)}
                >
                  <View style={styles.checkboxContainer}>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: selectedFriends[index]
                            ? "black"
                            : "#ccc",
                        },
                      ]}
                    >
                      {selectedFriends[index] ? (
                        <Icon name="check" size={18} color="black" />
                      ) : null}
                    </View>
                  </View>
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
            <Pressable style={styles.createGroupButton} onPress={createGroup}>
              <Text style={styles.createGroupButtonText}>Tạo nhóm</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};
export default CreateGroupScreen;

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
  paddingForHeader: {
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
  infoPersonal: {
    width: "100%",
    height: 170,
    fontSize: 16,
    paddingLeft: 10,
    borderWidth: 1,
    backgroundColor: "white",
    borderColor: "#ccc",
  },

  txtUser: {
    color: "#000",
    fontSize: 18,
  },
  txtViewUser: {
    color: "#696969",
    fontSize: 16,
  },
  textInput: {
    fontSize: 18,
    width: "90%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  textInputFocused: {
    borderBottomColor: "#00f", // Màu border khi ô nhập được chọn
  },
  contactPhone: {
    backgroundColor: "white",
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  },
  infoMenu: {
    width: "100%",
    height: 65,
    flexDirection: "row",
    borderColor: "#ccc",
    alignItems: "center",
    paddingHorizontal: 10,
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
  pickMember: {
    marginTop: 20,
    fontSize: 20,
    textAlign: "center",
    width: 200,
    alignSelf: "center",
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignSelf: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignSelf: "center",
  },
  createGroupButton: {
    backgroundColor: "#4AD8C7",
    width: "90%",
    height: 50,
    borderRadius: 25,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20, // Để tạo khoảng cách giữa nút và các phần khác của giao diện
  },
  createGroupButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
