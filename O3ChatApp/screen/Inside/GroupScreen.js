  import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    Image,
    Pressable,
    FlatList,
    ScrollView
  } from "react-native";
  import React, { useState,useEffect,useCallback  } from "react";
  import { useFocusEffect } from "@react-navigation/native";
  import { LinearGradient } from "expo-linear-gradient";
  import { DynamoDB } from "aws-sdk";
  import { ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION } from "@env";
  import { WINDOW_HEIGHT, WINDOW_WIDTH } from "./ChatSceen";

  const GroupScreen = ({ user, navigation}) => {
    const [groups, setGroups] = useState([]);
    const [numGroupJoins, setNumGroupJoins] = useState(0);
    const dynamoDB = new DynamoDB.DocumentClient({
      region: REGION,
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    });
    const fetchNumGroupJoins = async () => {
      try {
        // Thực hiện lấy số lượng nhóm đã tham gia từ cơ sở dữ liệu
        // Ví dụ:
        // const numJoins = await getNumGroupJoins(user.email);
        // setNumGroupJoins(numJoins);
      } catch (error) {
        console.error("Error fetching number of group joins:", error);
      }
    };
    const fetchGroups = async () => {
      try {
        const scanParams = {
          TableName: "GroupChats",
        };
    
        const groupData = await dynamoDB.scan(scanParams).promise();
    
        if (groupData.Items && groupData.Items.length > 0) {
          // Lọc những nhóm mà người dùng hiện tại đã tham gia
          const userJoinedGroups = groupData.Items.filter(group => 
              group.members.find(member => member === user.email) || Object.keys(group.roles).includes(user.email)
          );
          setGroups(userJoinedGroups);
      } else {
          setGroups([]);
      }
      
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };
    useEffect(() => {
      fetchGroups(); // Thêm hàm này để tải danh sách nhóm
    }, [user]);
    const handleViewGroup = (group) => {
      navigation.navigate("GroupChat", { group, user });
    };
    <FlatList
  data={groups}
  renderItem={({ item }) => (
    <Pressable
      onPress={() => handleViewGroup(item)}
      style={styles.groupItem}
    >
      <Image
        style={styles.avatarImage}
        source={{ uri: item.avatarGroup }}
      />
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.groupName}</Text>
        <Text style={styles.memberCount}>{`Thành viên: ${item.members.length}`}</Text>
      </View>
    </Pressable>
  )}
  keyExtractor={(item) => item.groupId}
/>
  useFocusEffect(
    useCallback(() => {
      fetchGroups(); // Cập nhật danh sách nhóm khi màn hình được focus
    }, [])
);


    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
        <LinearGradient
          colors={["#4AD8C7", "#B728A9"]}
          style={styles.background}
        />
        <Pressable
          onPress={() => navigation.navigate("CreateGroupScreen", { user: user })}
          style={{
            flexDirection: "row",
            backgroundColor: "white",
            height: 60,
            alignItems: "center",
            width: WINDOW_WIDTH,
          }}
        >
          <Image
            style={{ width: 30, height: 30, marginLeft: 15 }}
            source={require("../../assets/img/iconGroupScreen/icons8-add-male-user-group-30.png")}
          />

          <Text style={{ fontSize: 18, marginLeft: 15 }}>Tạo nhóm mới</Text>
        </Pressable>

        {/* Tính năng nổi bật */}
        <View
          style={{
            width: WINDOW_WIDTH,
            marginTop: 15,
            backgroundColor: "white",
            height: 150,
          }}
        >
          <Text style={{ fontSize: 16, marginLeft: 15, marginTop: 10 }}>
            Tính năng nổi bật
          </Text>
          <View
            style={{
              flexDirection: "row",
              marginTop: 20,
              justifyContent: "space-evenly",
            }}
          >
            <Pressable
              style={{
                width: 54,
                height: 58,
                backgroundColor: "#EEEEEE",
                borderRadius: 10,
              }}
            >
              <Image
                style={{ width: 48, height: 48, marginLeft: 3, marginTop: 3 }}
                source={require("../../assets/img/iconGroupScreen/icons8-calendar-48.png")}
              />
              <Text style={{ marginTop: 15, fontSize: 12, textAlign: "center" }}>
                Lịch
              </Text>
            </Pressable>
            <Pressable
              style={{
                width: 54,
                height: 58,
                backgroundColor: "#EEEEEE",
                borderRadius: 10,
              }}
            >
              <Image
                style={{ width: 48, height: 48, marginLeft: 3, marginTop: 3 }}
                source={require("../../assets/img/iconGroupScreen/icons8-remind-48.png")}
              />
              <Text style={{ marginTop: 15, fontSize: 12, textAlign: "center" }}>
                Nhắc hẹn
              </Text>
            </Pressable>
            <Pressable
              style={{
                width: 54,
                height: 58,
                backgroundColor: "#EEEEEE",
                borderRadius: 10,
              }}
            >
              <Image
                style={{ width: 48, height: 48, marginLeft: 3, marginTop: 3 }}
                source={require("../../assets/img/iconGroupScreen/icons8-offline-30.png")}
              />
              <Text style={{ marginTop: 15, fontSize: 12, width: 70 }}>
                Nhóm offline
              </Text>
            </Pressable>
            <Pressable
              style={{
                width: 54,
                height: 58,
                backgroundColor: "#EEEEEE",
                borderRadius: 10,
              }}
            >
              <Image
                style={{ width: 48, height: 48, marginLeft: 3, marginTop: 3 }}
                source={require("../../assets/img/iconGroupScreen/icons8-share-picture-48.png")}
              />
              <Text style={{ marginTop: 15, fontSize: 12, width: 70 }}>
                Chia sẻ ảnh
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Nhóm tham gia */}
        <View
          style={{
            backgroundColor: "white",
            height: "100%",
            width: WINDOW_WIDTH,
            marginTop: 20,
          }}
        >
      
          {/* Render nhóm ở đây */}
          {/* Phần FlatList hiển thị danh sách nhóm */}
          <View style={styles.contactPhone}>
    <ScrollView>
      
      {groups && groups.length > 0 ? (
        groups.map((group, index) => (
          <Pressable
            onPress={() => handleViewGroup(group)}
            key={index}
            style={styles.infoMenu}
          >
            <Image
              style={styles.avatarImage}
              source={{ uri: group.avatarGroup }}
            />
            <Text style={styles.txtUser}>{group.groupName}</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.txtUser}>Không có nhóm</Text>
      )}
    </ScrollView>

  </View>


        </View>
      </SafeAreaView>
    );
  };

  export default GroupScreen;

  const styles = StyleSheet.create({
    background: {
      position: "absolute",
      height: "100%",
      width: WINDOW_WIDTH,
    },
    contactPhone: {
      backgroundColor: "white",
      width: WINDOW_WIDTH,
      marginTop: 10,
      height: WINDOW_HEIGHT,
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
  });