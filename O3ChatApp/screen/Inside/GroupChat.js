import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  BackHandler,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Keyboard,
  Animated,
  Alert,
} from "react-native";
import { DynamoDB, S3 } from "aws-sdk";
import {
  ACCESS_KEY_ID,
  SECRET_ACCESS_KEY,
  REGION,
  S3_BUCKET_NAME,
  DYNAMODB_TABLE_NAME,
} from "@env";
import Icon from "react-native-vector-icons/AntDesign";
import * as ImagePicker from "expo-image-picker";
import Lightbox from "react-native-lightbox-v2";
import io from "socket.io-client";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Checkbox } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

const socket = io("http://192.168.1.41:3000");

const GroupChat = ({ navigation, route }) => {
  const { user } = route.params;
  const [group, setGroup] = useState(route.params.group);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [avatarImg, setAvatarImg] = useState(null);
  const [fileType, setFileType] = useState(""); // Thêm state mới để lưu trữ fileType
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [friendsNotInGroup, setFriendsNotInGroup] = useState([]);
  const [friendsInGroup, setFriendsInGroup] = useState([]);
  const [isAddMemberModalVisible, setIsAddMemberModalVisible] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileTypeDoc, setFileTypeDoc] = useState(""); // Thêm state mới để lưu trữ fileType
  // Trong hàm renderOptions:
  const renderOptions = () => {
    // Sắp xếp danh sách friendsInGroup để đưa Trưởng nhóm lên đầu
    const sortedFriendsInGroup = [...friendsInGroup].sort((a, b) => {
      if (group.roles[a.email] === "Trưởng nhóm") return -1;
      if (group.roles[b.email] === "Trưởng nhóm") return 1;
      return 0;
    });

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isOptionsVisible}
        onRequestClose={() => setIsOptionsVisible(false)}
      >
        <View style={styles.optionsContainer}>
          <View style={styles.membersContainer}>
            <Text style={styles.memberHeaderText}>Thành viên trong nhóm:</Text>
            <ScrollView>
              {sortedFriendsInGroup.length > 0 ? (
                sortedFriendsInGroup.map((friend, index) => (
                  <View key={index} style={styles.infoMenu}>
                    <Pressable
                      style={styles.checkboxContainer}
                      onPress={() => toggleFriendSelection(friend.email)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: selectedFriends[friend.email]
                              ? "black"
                              : "transparent",
                          },
                        ]}
                      >
                        {selectedFriends[friend.email] && (
                          <Icon name="check" size={18} color="white" />
                        )}
                      </View>
                    </Pressable>
                    <Image
                      style={styles.avatarImage}
                      source={{ uri: friend.avatarUser }}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.txtUser}>{friend.hoTen}</Text>
                      <Text style={styles.txtRole}>
                        {group.roles[friend.email]}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.txtUser}>Không có bạn bè</Text>
              )}
            </ScrollView>
          </View>

          <Pressable style={styles.optionItem} onPress={openAddMemberModal}>
            <Text style={styles.optionText}>Thêm thành viên</Text>
          </Pressable>
          <Pressable
            style={styles.optionItem}
            onPress={handleDeleteSelectedMembers}
          >
            <Text style={styles.optionText}>Xóa thành viên</Text>
          </Pressable>
          <Pressable style={styles.optionItem} onPress={leaveGroup}>
            <Text style={styles.optionText}>Rời nhóm</Text>
          </Pressable>
          <Pressable style={styles.optionItem} onPress={handleDeleteGroup}>
            <Text style={styles.optionText}>Giải tán nhóm</Text>
          </Pressable>

          <Pressable
            onPress={() => setIsOptionsVisible(false)}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </Pressable>
        </View>
      </Modal>
    );
  };
  // Hàm xử lý khi người dùng chọn "Rời nhóm"
  const leaveGroup = async () => {
    try {
      // Loại bỏ người dùng ra khỏi danh sách thành viên của nhóm
      const updatedGroupMembers = group.members.filter(
        (member) => member !== user.email
      );

      // Loại bỏ người dùng ra khỏi danh sách vai trò của nhóm
      const updatedGroupRoles = { ...group.roles };
      delete updatedGroupRoles[user.email];

      // Cập nhật dữ liệu trong cơ sở dữ liệu
      const params = {
        TableName: "GroupChats",
        Key: {
          groupId: group.groupId,
        },
        UpdateExpression: "SET members = :members, #r = :roles",
        ExpressionAttributeValues: {
          ":members": updatedGroupMembers,
          ":roles": updatedGroupRoles,
        },
        ExpressionAttributeNames: {
          "#r": "roles",
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(params).promise();

      // Cập nhật state của nhóm để loại bỏ người dùng ra khỏi danh sách thành viên và vai trò
      setGroup((prevGroup) => ({
        ...prevGroup,
        members: updatedGroupMembers,
        roles: updatedGroupRoles,
      }));

      // Đóng modal sau khi rời nhóm thành công
      setIsOptionsVisible(false);
      navigation.goBack();
      // Thực hiện các hành động cần thiết sau khi rời nhóm thành công
      // Ví dụ: hiển thị thông báo, cập nhật giao diện người dùng, v.v.
    } catch (error) {
      console.error("Error leaving group:", error);
      // Xử lý lỗi cụ thể ở đây, ví dụ: hiển thị thông báo lỗi cho người dùng
    }
  };

  // Hàm kiểm tra vai trò của người dùng
  const isGroupLeader = () => {
    return group.roles && group.roles[user.email] === "Trưởng nhóm";
  };
  // Hàm xóa thành viên khỏi nhóm trong DynamoDB
  const deleteMembersFromGroup = async (selectedEmails) => {
    try {
      // Tạo một bản cập nhật để loại bỏ các thành viên đã chọn khỏi nhóm
      const updatedGroupMembers = group.members.filter(
        (member) => !selectedEmails.includes(member)
      );

      // Cập nhật danh sách thành viên của nhóm trong DynamoDB
      const params = {
        TableName: "GroupChats", // Thay thế bằng tên bảng của bạn
        Key: {
          groupId: `${group.groupId}`, // Sử dụng groupId của nhóm cần cập nhật
        },
        UpdateExpression: "SET members = :members",
        ExpressionAttributeValues: {
          ":members": updatedGroupMembers,
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(params).promise();

      // Cập nhật state của nhóm để hiển thị người dùng mới
      setGroup((prevGroup) => ({
        ...prevGroup,
        members: updatedGroupMembers,
      }));

      // Đóng modal sau khi xóa thành viên thành công
      setIsOptionsVisible(false);

      // Thực hiện các hành động cần thiết khác sau khi xóa thành viên
      // Ví dụ: hiển thị thông báo, cập nhật giao diện người dùng, v.v.
    } catch (error) {
      console.error("Error deleting members from group:", error);
      // Xử lý lỗi cụ thể ở đây, ví dụ: hiển thị thông báo lỗi cho người dùng
    }
  };

  // Hàm xử lý khi nhấn nút "Xóa thành viên"
  const handleDeleteSelectedMembers = () => {
    if (isGroupLeader()) {
      const selectedEmails = Object.keys(selectedFriends).filter(
        (email) => selectedFriends[email]
      );

      if (selectedEmails.length === 0) {
        Alert.alert("Thông báo", "Vui lòng chọn ít nhất một thành viên để xóa");
        return;
      }

      // Gọi hàm xóa thành viên khỏi nhóm
      deleteMembersFromGroup(selectedEmails);
    } else {
      Alert.alert("Thông báo", "Bạn không có quyền thực hiện hành động này.");
    }
  };
  const openAddMemberModal = () => {
    setIsAddMemberModalVisible(true);
    fetchFriendsNotInGroup();
  };
  const toggleFriendSelection = (email) => {
    setSelectedFriends((prevSelectedFriends) => ({
      ...prevSelectedFriends,
      [email]: !prevSelectedFriends[email],
    }));
  };
  // Hàm đóng modal
  const closeAddMemberModal = () => {
    setIsAddMemberModalVisible(false);
  };

  const fetchFriendsNotInGroup = async () => {
    try {
      if (!user?.email || !group?.groupId) {
        console.error("User email or group ID is not defined.");
        return;
      }

      const getFriendsParams = {
        TableName: "Friends",
        Key: { senderEmail: user.email },
      };
      const friendData = await dynamoDB.get(getFriendsParams).promise();

      if (friendData.Item && friendData.Item.friends) {
        const existingGroupMemberEmails = group.members.map((member) => member);
        const friends = friendData.Item.friends.filter(
          (friend) => !existingGroupMemberEmails.includes(friend.email)
        );

        // Truy vấn cơ sở dữ liệu để lấy vai trò của các bạn trong nhóm
        const getRolesParams = {
          TableName: "GroupChats",
          Key: { groupId: group.groupId },
        };
        const groupData = await dynamoDB.get(getRolesParams).promise();

        if (groupData.Item && groupData.Item.roles) {
          // Duyệt qua danh sách bạn mới thêm vào và thiết lập vai trò cho họ
          const friendsWithRoles = friends.map((friend) => ({
            ...friend,
            role: groupData.Item.roles[friend.email] || "Thành viên",
          }));
          setFriendsNotInGroup(friendsWithRoles);
        } else {
          // Nếu không tìm thấy dữ liệu về vai trò, mặc định vai trò của các bạn là "Thành viên"
          const friendsWithRoles = friends.map((friend) => ({
            ...friend,
            role: "Thành viên",
          }));
          setFriendsNotInGroup(friendsWithRoles);
        }
      } else {
        setFriendsNotInGroup([]);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
      // Xử lý lỗi cụ thể ở đây, ví dụ: hiển thị thông báo lỗi cho người dùng
    }
  };

  const fetchFriendsInGroup = async () => {
    try {
      if (!user?.email) {
        console.error("User email is not defined.");
        return;
      }

      const getUsersParams = {
        TableName: "Users",
      };
      const usersData = await dynamoDB.scan(getUsersParams).promise();

      if (usersData.Items) {
        const allUsers = usersData.Items;
        const groupMemberEmails = group.members;
        const friendsInGroup = allUsers.filter((user) =>
          groupMemberEmails.includes(user.email)
        );
        setFriendsInGroup(friendsInGroup);
      } else {
        setFriendsInGroup([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      // Xử lý lỗi cụ thể ở đây, ví dụ: hiển thị thông báo lỗi cho người dùng
    }
  };

  useEffect(() => {
    fetchFriendsInGroup();
    fetchFriendsNotInGroup();
  }, [group]);

  const s3 = new S3({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: REGION,
  });
  const bucketName = S3_BUCKET_NAME;
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      console.log(result);

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);
        const file = result.assets[0].uri.split(".");
        const fileType = file[file.length - 1];
        setFileTypeDoc(fileType); // Lưu thông tin về tệp đã chọn
      }
    } catch (error) {
      console.log("Error picking file:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFriendsInGroup(); // Cập nhật danh sách nhóm khi màn hình được focus
    }, [])
  );

  const addSelectedMembersToGroup = async () => {
    try {
      const selectedMembers = Object.keys(selectedFriends).filter(
        (email) => selectedFriends[email]
      );
      if (selectedMembers.length === 0) {
        console.log("No members selected.");
        return;
      }

      const updatedGroupMembers = [...group.members, ...selectedMembers];
      const updatedGroupRoles = { ...group.roles };

      selectedMembers.forEach((email) => {
        updatedGroupRoles[email] = "Thành viên";
      });

      const params = {
        TableName: "GroupChats",
        Key: {
          groupId: `${group.groupId}`,
        },
        UpdateExpression: "SET members = :members, #roles = :roles",
        ExpressionAttributeNames: {
          "#roles": "roles",
        },
        ExpressionAttributeValues: {
          ":members": updatedGroupMembers,
          ":roles": updatedGroupRoles,
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(params).promise();

      setGroup((prevGroup) => ({
        ...prevGroup,
        members: updatedGroupMembers,
        roles: updatedGroupRoles,
      }));

      setIsAddMemberModalVisible(false);
    } catch (error) {
      console.error("Error adding members to group:", error);
    }
  };

  const openModal = (message, index) => {
    setSelectedMessageIndex(index);
    setSelectedMessage(message);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedMessage(null);
    setSelectedMessageIndex(null);
  };

  const deleteMessage = async () => {
    try {
      // Tạo bản sao của mảng messages và cập nhật tin nhắn cần xóa
      const updatedMessages = messages.map((msg, index) => {
        if (index === selectedMessageIndex) {
          // Nếu là tin nhắn cần xóa, thay đổi nội dung thành "Tin nhắn đã được xóa"
          return {
            ...msg,
            content: "Tin nhắn đã được xóa",
            image: null,
          };
        }
        return msg; // Trả về tin nhắn không cần xóa
      });

      // Cập nhật danh sách tin nhắn trong DynamoDB
      const params = {
        TableName: "GroupChats",
        Key: {
          groupId: group.groupId,
        },
        UpdateExpression: "SET messages = :messages",
        ExpressionAttributeValues: {
          ":messages": updatedMessages,
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(params).promise();

      // Cập nhật state và đóng modal
      setMessages(updatedMessages);
      closeModal();
    } catch (error) {
      console.error("Error deleting group message:", error);
    }
  };

  // Cập nhật mã trong phần BoxChat.js

  // Gửi tin nhắn thu hồi
  const retractMessage = async () => {
    try {
      // Cập nhật tin nhắn thu hồi trong cơ sở dữ liệu và gửi thông báo đến tất cả thành viên trong nhóm
      socket.emit("retractGroupMessage", {
        groupId: group.groupId,
        selectedMessageIndex: selectedMessageIndex,
      });

      // Cập nhật trạng thái tin nhắn thu hồi trong giao diện người dùng
      const updatedMessages = [...messages];
      updatedMessages[selectedMessageIndex] = {
        ...updatedMessages[selectedMessageIndex],
        content: "Tin nhắn đã được thu hồi",
        image: null,
      };
      setMessages(updatedMessages);

      // Đóng modal
      closeModal();
    } catch (error) {
      console.error("Error retracting group message:", error);
    }
  };

  // Lắng nghe sự kiện tin nhắn thu hồi từ server
  useEffect(() => {
    socket.on(
      "receiveRetractGroupMessage",
      ({ groupId, selectedMessageIndex }) => {
        // Kiểm tra xem tin nhắn thu hồi có thuộc về nhóm hiện tại không
        if (groupId === group.groupId) {
          // Cập nhật trạng thái tin nhắn thu hồi trong giao diện người dùng
          const updatedMessages = [...messages];
          updatedMessages[selectedMessageIndex] = {
            ...updatedMessages[selectedMessageIndex],
            content: "Tin nhắn đã được thu hồi",
            image: null,
          };
          setMessages(updatedMessages);
        }
      }
    );

    return () => {
      socket.off("receiveRetractGroupMessage");
    };
  }, [messages, group.id]);

  // Giao diện modal xử lý tin nhắn
  const renderModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal} />
        <View style={[styles.modalContainer, modalPosition]}>
          <View style={styles.modalContent}>
            {selectedMessage && (
              <>
                {selectedMessage.senderEmail === user.email ? (
                  // Tin nhắn của người dùng hiện tại
                  <>
                    <Pressable style={styles.modalItem} onPress={deleteMessage}>
                      <Icon name="delete" size={25} />
                      <Text style={styles.modalItemText}>Xóa</Text>
                    </Pressable>
                    <Pressable
                      style={styles.modalItem}
                      onPress={retractMessage}
                    >
                      <Icon name="reload1" size={25} />
                      <Text style={styles.modalItemText}>Thu hồi</Text>
                    </Pressable>
                  </>
                ) : (
                  // Tin nhắn của người khác
                  <Pressable style={styles.modalItem} onPress={deleteMessage}>
                    <Icon name="delete" size={25} />
                    <Text style={styles.modalItemText}>Xóa</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const handleDeleteGroup = () => {
    if (isGroupLeader()) {
      Alert.alert(
        "Xác nhận",
        "Bạn có chắc muốn xóa nhóm không?",
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Xóa",
            onPress: async () => {
              try {
                // Thực hiện logic xóa nhóm trên AWS
                const params = {
                  TableName: "GroupChats", // Thay thế bằng tên bảng của bạn
                  Key: {
                    groupId: `${group.groupId}`, // Sử dụng groupId của nhóm cần xóa
                  },
                };
                await dynamoDB.delete(params).promise();

                // Chuyển người dùng trở lại màn hình trước đó sau khi xóa nhóm thành công
                navigation.goBack();
              } catch (error) {
                console.error("Error deleting group:", error);
              }
            },
            style: "destructive",
          },
        ],
        { cancelable: true }
      );
    } else {
      Alert.alert("Thông báo", "Bạn không có quyền thực hiện hành động này.");
    }
  };
  const dynamoDB = new DynamoDB.DocumentClient({
    region: REGION,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  });

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

  useEffect(() => {
    // const intervalId = setInterval(async () => {
    //   await fetchMessages();
    // }, 500);

    // Gọi hàm fetchMessages khi component được mount lần đầu tiên
    fetchMessages();

    // Cleanup function để ngăn chặn memory leaks khi component unmount
    // return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Tham gia vào phòng chat nhóm
    socket.emit("joinGroup", group.groupId);

    // ... Các logic khác ...

    return () => {
      // Rời khỏi phòng chat nhóm khi component unmount
      socket.emit("leaveGroup", group.groupId);
    };
  }, [group.groupId]);

  useEffect(() => {
    socket.on("receiveGroupMessage", async ({ senderMessage }) => {
      console.log("Received group message:", senderMessage); // In ra tin nhắn nhận được
      // Gọi hàm để lấy thông tin người gửi
      const senderInfo = await fetchSenderInfo(senderMessage.senderEmail);
      // Thêm thông tin người gửi vào tin nhắn
      const updatedMessage = { ...senderMessage, senderInfo };
      // Cập nhật tin nhắn vào state
      setMessages((prevMessages) => [...prevMessages, updatedMessage]);
      scrollToBottom();
    });

    return () => {
      socket.off("receiveGroupMessage");
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const senderParams = {
        TableName: "GroupChats",
        Key: {
          groupId: `${group.groupId}`,
        },
      };
      const senderResponse = await dynamoDB.get(senderParams).promise();
      const senderMessages = senderResponse.Item
        ? senderResponse.Item.messages
        : [];

      // Lặp qua các tin nhắn để lấy thông tin về người gửi từ bảng Users
      const updatedMessages = await Promise.all(
        senderMessages.map(async (message) => {
          // Gọi hàm không đồng bộ để lấy thông tin người gửi
          const senderInfo = await fetchSenderInfo(message.senderEmail);
          // Thêm thông tin về người gửi vào tin nhắn
          return { ...message, senderInfo };
        })
      );

      // Cập nhật trạng thái messages với các tin nhắn đã được cập nhật thông tin người gửi
      setMessages(updatedMessages);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchSenderInfo = async (email) => {
    try {
      const params = {
        TableName: "Users",
        Key: { email: email },
      };
      const response = await dynamoDB.get(params).promise();
      return response.Item; // Trả về toàn bộ thông tin của người gửi
    } catch (error) {
      console.error("Error fetching sender info:", error);
      return null; // Trả về null nếu xảy ra lỗi
    }
  };

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  // Hàm gửi tin nhắn văn bản
  const sendGroupMessage = async () => {
    try {
      if (newMessage.trim() === "") return;

      const timestamp = new Date().toISOString();
      const senderMessage = {
        content: newMessage,
        groupId: group.groupId,
        senderEmail: user.email,
        timestamp: timestamp,
      };

      // Thêm tin nhắn mới vào danh sách tin nhắn chỉ sau khi nó được gửi thành công
      setNewMessage("");
      scrollToBottom();

      socket.emit("sendGroupMessage", { senderMessage }); // Gửi tin nhắn nhóm
    } catch (error) {
      console.error("Error sending group message:", error);
    }
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      aspect: [1, 1],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setAvatarImg(result.assets[0].uri);

      // Xác định fileType từ tên file
      const image = result.assets[0].uri.split(".");
      const fileType = image[image.length - 1];
      setFileType(fileType); // Lưu fileType vào state hoặc truyền vào hàm signUp
    }
  };

  const sendImageMessage = async () => {
    try {
      if (avatarImg === null) return;

      const timestamp = new Date().toISOString();
      let contentType = "";
      switch (fileTypeDoc) {
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
          contentType = "application/octet-stream";
      }

      const filePath = `${user.email}_${Date.now().toString()}.${fileTypeDoc}`;
      const response = await fetch(avatarImg);
      const blob = await response.blob();

      const paramsS3 = {
        Bucket: bucketName,
        Key: filePath,
        Body: blob,
        ContentType: contentType,
      };
      const data = await s3.upload(paramsS3).promise();
      const imageURL = data.Location;

      const senderMessage = {
        content: "Sent an image",
        groupId: group.groupId,
        senderEmail: user.email,
        timestamp: timestamp,
        image: imageURL,
      };

      // Gửi tin nhắn hình ảnh trong nhóm thông qua socket
      socket.emit("sendGroupMessage", { senderMessage });

      // Không cần thêm tin nhắn vào danh sách trước khi nhận phản hồi từ socket

      cancelImage();
      scrollToBottom();
    } catch (error) {
      console.error("Error sending group image:", error);
    }
  };

  const cancelImage = () => {
    setAvatarImg(null);
    setFileType(""); // Reset loại của hình ảnh khi hủy gửi
  };

  const handleFileDownload = async (fileURL, fileName) => {
    try {
      // Xác định đường dẫn thư mục Download
      let downloadDirectory = FileSystem.documentDirectory;
      if (Platform.OS === "android") {
        downloadDirectory += "Download/";
      }

      // Kiểm tra xem thư mục Download đã tồn tại chưa
      const directoryInfo = await FileSystem.getInfoAsync(downloadDirectory);
      if (!directoryInfo.exists) {
        // Nếu thư mục không tồn tại, tạo mới nó
        await FileSystem.makeDirectoryAsync(downloadDirectory, {
          intermediates: true,
        });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        fileURL,
        downloadDirectory + fileName // Lưu file vào thư mục Download với tên fileName
      );

      const { uri } = await downloadResumable.downloadAsync();

      // Hiển thị thông báo cho người dùng
      if (Platform.OS === "android") {
        alert("File đã được tải xuống. Vui lòng mở thư mục Downloads để xem.");
      } else {
        alert(
          "File đã được tải xuống. Bạn có thể mở nó từ trình quản lý tệp của thiết bị."
        );
      }
      console.log("File downloaded to:", uri);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const cancelDoc = () => {
    setSelectedFile(null);
    setFileTypeDoc("");
  };

  const sendFile = async () => {
    try {
      if (selectedFile === null) return;

      const timestamp = new Date().toISOString();

      // Xác định loại nội dung của file
      let contentType = "";
      switch (fileTypeDoc) {
        case "pdf":
          contentType = "application/pdf";
          break;
        case "docx":
          contentType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          break;
        case "xls":
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          break;
        case "txt":
          contentType = "text/plain";
          break;
        default:
          contentType = "application/octet-stream"; // Loại mặc định nếu không phù hợp với các loại đã chỉ định
      }

      // Tạo đường dẫn cho file trên S3
      const filePath = `${user.email}_${Date.now().toString()}.${fileTypeDoc}`;

      // Tải blob của file
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      // Upload file lên S3
      const paramsS3 = {
        Bucket: bucketName,
        Key: filePath,
        Body: blob,
        ContentType: contentType, // Thêm loại nội dung của file vào yêu cầu tải lên S3
      };
      const data = await s3.upload(paramsS3).promise();
      const fileURL = data.Location;

      // Tạo tin nhắn cho việc gửi file
      const senderMessage = {
        content: "Sent a file",
        groupId: group.groupId,
        senderEmail: user.email,
        timestamp: timestamp,
        fileURL: fileURL,
        fileName: selectedFile.name, // Thêm tên của file vào tin nhắn
      };

      // Gửi tin nhắn file trong nhóm qua Socket.IO
      socket.emit("sendGroupMessage", { senderMessage });

      // Cập nhật state messages
      setMessages([...messages, senderMessage]);
      scrollToBottom(); // Cuộn xuống cuối danh sách tin nhắn

      // Reset selectedFile state
      cancelDoc();
    } catch (error) {
      console.error("Error sending group file:", error);
    }
  };

  const formatMessageTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${formattedHours}:${formattedMinutes}`;
  };

  const handleLongPress = (message, index) => {
    openModal(message, index);
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        scrollToBottom();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedMessage) {
      calculateModalPosition();
    }
  }, [selectedMessage]);

  const calculateModalPosition = () => {
    const index = messages.findIndex((msg) => msg === selectedMessage);
    const messageHeight = 80; // Thay đổi giá trị này theo chiều cao thực của tin nhắn
    const modalTop = index * messageHeight;
    const isSender = selectedMessage.isSender;
    const modalLeft = isSender ? "20%" : "25%"; // Hiển thị modal bên trái nếu là tin nhắn người gửi, ngược lại hiển thị bên phải
    setModalPosition({ top: modalTop, left: modalLeft });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{group.groupName}</Text>
        <Pressable
          onPress={() => setIsOptionsVisible(true)}
          style={styles.optionsButton}
        >
          <Icon name="ellipsis1" size={25} color="white" />
        </Pressable>
        {renderOptions()}
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        ref={scrollViewRef}
      >
        {messages.map((message, index) => (
          <View key={index}>
            {message.senderEmail !== user.email && (
              <View style={{ flexDirection: "row" }}>
                {message.senderInfo && message.senderInfo.avatarUser && (
                  <Image
                    source={{ uri: message.senderInfo.avatarUser }}
                    style={styles.avatarImage}
                  />
                )}
                <Pressable
                  key={index}
                  onLongPress={() => handleLongPress(message, index)}
                  style={[
                    styles.messageContainer,
                    {
                      alignSelf: "flex-start",
                      backgroundColor: "#dddddd",
                      opacity:
                        selectedMessage && selectedMessageIndex !== index
                          ? 0.5
                          : 1,
                      marginLeft: 10, // Add margin to separate avatar and message
                    },
                  ]}
                >
                  {message.senderInfo && message.senderInfo.hoTen && (
                    <Text style={{ fontWeight: "bold", fontSize: 13 }}>
                      {message.senderInfo.hoTen}
                    </Text>
                  )}
                  {message.fileURL ? (
                    <View
                      style={[styles.fileContainer, { flexDirection: "row" }]}
                    >
                      <Text style={styles.fileName}>
                        File: {message.fileName}
                      </Text>
                      <Pressable
                        style={{ marginLeft: 5 }}
                        onPress={() =>
                          handleFileDownload(message.fileURL, message.fileName)
                        }
                      >
                        <Icon name="download" size={20} color="black" />
                      </Pressable>
                    </View>
                  ) : message.image ? (
                    <Image
                      resizeMode="contain"
                      source={{ uri: message.image }}
                      style={{
                        width: "90%",
                        aspectRatio: 1,
                        borderRadius: 10,
                        alignSelf: "center",
                      }}
                    />
                  ) : (
                    <Text style={styles.messageText}>{message.content}</Text>
                  )}
                  <Text style={styles.messageTimestamp}>
                    {formatMessageTimestamp(message.timestamp)}
                  </Text>
                </Pressable>
              </View>
            )}
            {message.senderEmail === user.email && (
              <View style={{ flexDirection: "row-reverse" }}>
                <Pressable
                  key={index}
                  onLongPress={() => handleLongPress(message, index)}
                  style={[
                    styles.messageContainer,
                    {
                      alignSelf: "flex-end",
                      backgroundColor: "#94e5f2",
                      opacity:
                        selectedMessage && selectedMessageIndex !== index
                          ? 0.5
                          : 1,
                    },
                  ]}
                >
                  {message.fileURL ? (
                    <View
                      style={[styles.fileContainer, { flexDirection: "row" }]}
                    >
                      <Text style={styles.fileName}>
                        File: {message.fileName}
                      </Text>
                      <Pressable
                        style={{ marginLeft: 5 }}
                        onPress={() =>
                          handleFileDownload(message.fileURL, message.fileName)
                        }
                      >
                        <Icon name="download" size={20} color="black" />
                      </Pressable>
                    </View>
                  ) : message.image ? (
                    <Image
                      resizeMode="contain"
                      source={{ uri: message.image }}
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: 10,
                        alignSelf: "center",
                      }}
                    />
                  ) : (
                    <Text style={styles.messageText}>{message.content}</Text>
                  )}
                  <Text style={styles.messageTimestamp}>
                    {formatMessageTimestamp(message.timestamp)}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {avatarImg && (
        <View style={styles.selectedImageContainer}>
          <Image source={{ uri: avatarImg }} style={styles.selectedImage} />
          <Pressable onPress={cancelImage} style={styles.cancelImageButton}>
            <Icon name="close" size={20} color="white" />
          </Pressable>
        </View>
      )}

      {selectedFile && (
        <View style={styles.selectedImageContainer}>
          <Text style={{ textAlign: "center", fontSize: 13 }}>
            {selectedFile.name}
          </Text>
          {/* Hiển thị thông tin khác của file nếu cần */}
          <Pressable onPress={cancelDoc} style={styles.cancelFileButton}>
            <Icon name="close" size={14} color="white" />
          </Pressable>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddMemberModalVisible}
        onRequestClose={() => setIsAddMemberModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              {friendsNotInGroup.length > 0 ? (
                friendsNotInGroup.map((friend, index) => (
                  <Pressable
                    key={index}
                    onPress={() => toggleFriendSelection(friend.email)}
                    style={{ flexDirection: "row", marginTop: 10 }}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: selectedFriends[friend.email]
                            ? "black"
                            : "#ccc",
                        },
                      ]}
                    >
                      {selectedFriends[friend.email] ? (
                        <Icon name="check" size={18} color="black" />
                      ) : null}
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
            </ScrollView>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-around" }}
          >
            <Pressable onPress={closeAddMemberModal} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </Pressable>
            <Pressable
              onPress={addSelectedMembersToGroup}
              style={styles.addMemberButton}
            >
              <Text style={styles.addMemberButtonText}>Thêm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.inputContainer}>
        <Pressable onPress={pickFile}>
          <Icon
            name="paperclip"
            size={25}
            style={{ marginLeft: 5, borderRightWidth: 1, paddingRight: 5 }}
          />
        </Pressable>
        <Pressable onPress={pickImage}>
          <Icon name="picture" size={25} style={{ marginLeft: 5 }} />
        </Pressable>
        <TextInput
          style={styles.inputBox}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Nhập tin nhắn"
          ref={textInputRef}
        />
        <Pressable
          style={styles.sendButton}
          onPress={() => {
            if (newMessage.trim() !== "") {
              sendGroupMessage(); // Gửi tin nhắn văn bản nếu có nội dung tin nhắn
            } else if (avatarImg !== null) {
              sendImageMessage(); // Gửi hình ảnh nếu có hình ảnh được chọn
            } else if (selectedFile !== null) {
              sendFile(); // Gửi file nếu có file được chọn
            }
          }}
        >
          <Text style={styles.sendButtonText}>Gửi</Text>
        </Pressable>
      </View>
      {renderModal()}
    </View>
  );
};

export default GroupChat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  closeButton: {
    backgroundColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "black",
    fontWeight: "bold",
  },
  addMemberButton: {
    backgroundColor: "green",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  addMemberButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  infoMenu: {
    width: "100%",
    height: 65,
    paddingLeft: 10,
    backgroundColor: "white",
    flexDirection: "row",
    borderColor: "#ccc",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: "#4AD8C7",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#fff",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageContainer: {
    maxWidth: "70%",
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  messageText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  inputBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#000",
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
    marginRight: 10,
    marginLeft: 5,
  },
  sendButton: {
    width: 50,
    height: 40,
    backgroundColor: "lightblue",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  messageTimestamp: {
    fontSize: 12,
    color: "gray",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    width: 300,
    position: "absolute",
    alignSelf: "center",
    top: 100,
  },
  avatarImage: {
    width: 35,
    height: 35,
    borderRadius: 25,
    marginLeft: 13,
    borderWidth: 1,
    borderColor: "#000",
    top: 5,
  },
  txtUser: {
    marginTop: 5,
    color: "#000",
    fontSize: 18,
    marginLeft: 10,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    alignSelf: "stretch",
    flexDirection: "row",
  },
  txtRole: {
    marginLeft: 10,
    fontSize: 12,
    color: "gray",
  },
  userInfo: {
    flexDirection: "column",
    marginLeft: 10,
  },
  modalItem: {
    flex: 1, // Sử dụng flex để tin nhắn tự mở rộng theo nội dung của nó
    alignItems: "center",
  },
  modalItemText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  selectedImageContainer: {
    position: "relative", // Đảm bảo vị trí tương đối để các phần tử con có thể được định vị một cách đúng đắn
    alignItems: "center",
    marginVertical: 20,
  },
  selectedImage: {
    width: 100, // Kích thước của hình ảnh đã chọn
    height: 100,
    borderRadius: 10,
  },
  cancelImageButton: {
    position: "absolute", // Định vị nút hủy gửi tương đối với phần tử cha (selectedImageContainer)
    top: 5, // Đặt vị trí của nút từ trên xuống 5px
    right: 5, // Đặt vị trí của nút từ phải sang trái 5px
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Màu nền của nút hủy gửi
    borderRadius: 20, // Bo tròn các góc của nút
    padding: 5, // Tăng khoảng cách giữa biên nút và văn bản bên trong nút
  },
  cancelFileButton: {
    position: "absolute", // Định vị nút hủy gửi tương đối với phần tử cha (selectedImageContainer)
    top: -18, // Đặt vị trí của nút từ trên xuống 5px
    right: 5, // Đặt vị trí của nút từ phải sang trái 5px
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Màu nền của nút hủy gửi
    borderRadius: 20, // Bo tròn các góc của nút
    padding: 5, // Tăng khoảng cách giữa biên nút và văn bản bên trong nút
  },
  optionsButton: {
    position: "absolute",
    right: 10,
    top: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignSelf: "center",
  },
  optionsContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 10,
    margin: 20,
    marginTop: 100,
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "red",
  },
  fileContainer: {
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  downloadLink: {
    color: "blue",
    textDecorationLine: "underline",
  },
});
