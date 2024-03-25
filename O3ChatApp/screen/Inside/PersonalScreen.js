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
} from "react-native";
import React from "react";
import { Dimensions } from "react-native";
import IconAnt from "react-native-vector-icons/AntDesign";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { DynamoDB, S3 } from "aws-sdk";
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

const UserScreen = ({ navigation, user }) => {
  const [fontsLoaded] = useFonts({
    "keaniaone-regular": require("../../assets/fonts/KeaniaOne-Regular.ttf"),
  });
  const [avatarUri, setAvatarUri] = useState(user?.avatarUser);
  const [fileType, setFileType] = useState("");
  const bucketName = S3_BUCKET_NAME;
  const tableName = DYNAMODB_TABLE_NAME;
  const pickAvatar = async () => {
    // Hiển thị hộp thoại xác nhận trước khi chọn hình
    Alert.alert(
      "Xác nhận",
      "Bạn có muốn chọn ảnh mới?",
      [
        {
          text: "Hủy",
          onPress: () => console.log("Hủy"),
          style: "cancel",
        },
        {
          text: "Chọn",
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.All,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
            });

            if (!result.canceled) {
              setAvatarUri(result.assets[0].uri);

              // Xác định fileType từ tên file
              const image = result.assets[0].uri.split(".");
              const fileType = image[image.length - 1];
              setFileType(fileType);
              uploadAvatar(result.assets[0].uri);
            }
          },
        },
      ],
      { cancelable: false }
    );
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
      const filePath = `${
        user?.soDienThoai
      }_${Date.now().toString()}.${fileType}`;

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
      updateUserAvatar(data.Location);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      Alert.alert("Error", "Failed to upload avatar");
    }
  };

  const updateUserAvatar = async (avatarUrl) => {
    try {
      const dynamoDB = new DynamoDB.DocumentClient({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      });

      const paramsDynamoDb = {
        TableName: tableName,
        Key: { soDienThoai: user.soDienThoai },
        UpdateExpression: "set avatarUser = :avatar",
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

  return (
    <SafeAreaView style={styles.container}>
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
          <IconAnt name="setting" size={30} color={"#fff"} />
        </View>
      </SafeAreaView>
      <View style={styles.paddingForHeader} />
      <View style={styles.viewContent}>
        <LinearGradient
          colors={["#4AD8C7", "#B728A9"]}
          style={styles.background}
        />
        <View style={styles.infoPersonal}>
          <Pressable onPress={pickAvatar}>
            <Image
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                marginLeft: 10,
              }}
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : require("../../assets/img/no-avatar.png")
              }
            />
          </Pressable>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.txtUser}>{user?.hoTen}</Text>
            <Pressable onPress={pickAvatar}>
              <Text style={styles.txtViewUser}>Cập nhật ảnh đại diện</Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.securityAccount}>
          <Icon
            name="security"
            size={30}
            color={"#000"}
            style={{ marginLeft: 10, marginTop: 10 }}
          />
          <Text style={styles.txtSecurity}>Tài khoản và bảo mật</Text>
        </Pressable>

        <Pressable style={styles.Privacy}>
          <IconAnt
            name="lock"
            size={30}
            style={{ marginLeft: 10, marginTop: 10 }}
          />
          <Text style={styles.txtPrivacy}>Quyền riêng tư</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
export default UserScreen;

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
    height: 80,
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
});
