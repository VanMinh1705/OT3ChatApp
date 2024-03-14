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
import * as Permissions from "expo-permissions";
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
  const [avatarUri, setAvatarUri] = useState(user.avatarUser);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission denied to access media library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.cancelled) {
      Alert.alert(
        "Confirmation",
        "Do you want to select this image?",
        [
          {
            text: "Yes",
            onPress: () => uploadAvatar(result.uri),
          },
          {
            text: "No",
            style: "cancel",
          },
        ],
        { cancelable: false }
      );
    }
  };

  const uploadAvatar = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileType = uri.split(".").pop();
      const fileName = `${user.soDienThoai}_${Date.now()}.${fileType}`;

      const s3 = new S3({
        region: REGION,
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      });

      const paramsS3 = {
        Bucket: "minh22222",
        Key: fileName,
        Body: blob,
        ContentType: `image/${fileType}`,
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
        TableName: DYNAMODB_TABLE_NAME,
        Key: { soDienThoai: user.soDienThoai },
        UpdateExpression: "set avatarUser = :avatar",
        ExpressionAttributeValues: {
          ":avatar": avatarUrl,
        },
        ReturnValues: "UPDATED_NEW",
      };

      await dynamoDB.update(paramsDynamoDb).promise();

      setAvatarUri(avatarUrl);

      Alert.alert("Success", "Avatar updated successfully");
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
                  : require("../../assets/img/iconFriendScreen/icon-list.png")
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
