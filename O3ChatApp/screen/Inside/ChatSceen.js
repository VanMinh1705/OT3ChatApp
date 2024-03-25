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
import { useState } from "react";
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

const ChatSceen = ({ navigation, user }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  const dynamoDB = new DynamoDB.DocumentClient({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });
  const addFriend = async () => {
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

      // Lấy dữ liệu hiện tại từ bảng Messager
      const getMessageParams = {
        TableName: "Messager",
        Key: { senderPhoneNumber: user?.soDienThoai },
      };

      const messageData = await dynamoDB.get(getMessageParams).promise();

      let receiverPhoneNumbers = [];
      if (messageData.Item && messageData.Item.receiverPhoneNumbers) {
        // Nếu đã có dữ liệu cho senderPhoneNumber này, thêm receiverPhoneNumber mới vào mảng
        receiverPhoneNumbers = messageData.Item.receiverPhoneNumbers;
      }

      // Thêm thông tin của receiver vào mảng receiverPhoneNumbers
      receiverPhoneNumbers.push({
        soDienThoai: phoneNumber,
        hoTen: userData.Item.hoTen,
        avatarUser: userData.Item.avatarUser, // Lưu thông tin avatarUser
      });

      // Thêm thông tin vào bảng Messager
      const addMessageParams = {
        TableName: "Messager", // Tên bảng Messager
        Item: {
          senderPhoneNumber: user?.soDienThoai,
          receiverPhoneNumbers: receiverPhoneNumbers, // Mảng các đối tượng chứa thông tin soDienThoai, hoTen và avatarUser
          // Thêm các thông tin khác nếu cần
        },
      };

      await dynamoDB.put(addMessageParams).promise();

      // Hiển thị thông báo thành công
      alert("Kết bạn thành công!");
      setModalVisible(false);
    } catch (error) {
      console.error("Error adding friend:", error);
      alert("Đã xảy ra lỗi khi kết bạn");
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
              color: "#000", // This is the text color when there is input
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
            }}
          >
            <IconAnt name="plus" size={30} color={"#fff"} />
          </Pressable>
          {/* Modal ở đây */}
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
                  addFriend(); // Gọi hàm addFriend khi nhấn nút "Kết bạn"
                }}
              >
                <Text style={styles.textStyle}>Kết bạn</Text>
              </Pressable>
              {/* Nút để đóng modal */}
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

          {/* --------------------------------------- */}
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
            // Background Linear Gradient
            colors={["#4AD8C7", "#B728A9"]}
            style={styles.background}
          />
          {/* <Text>Viet code ở đây  </Text> */}
        </View>
        <View style={styles.scrollViewContent} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChatSceen;

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
});
