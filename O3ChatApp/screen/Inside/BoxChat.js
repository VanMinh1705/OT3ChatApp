import React, { useEffect, useState, useRef } from "react";
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
import {
  PanGestureHandler,
  PinchGestureHandler,
} from "react-native-gesture-handler";

const BoxChat = ({ navigation, route }) => {
  const { friend, user } = route.params;
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

  const s3 = new S3({
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: REGION,
  });
  const bucketName = S3_BUCKET_NAME;

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

  const cancelImage = () => {
    setAvatarImg(null);
    setFileType(""); // Reset loại của hình ảnh khi hủy gửi
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
      // Tìm kiếm tin nhắn cần xóa trong danh sách messages
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
        TableName: "BoxChats",
        Key: {
          senderEmail: `${user.email}_${friend.email}`,
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
      console.error("Error deleting message:", error);
    }
  };

  const retractMessage = async () => {
    try {
      // Thay đổi nội dung của tin nhắn thành "Tin nhắn đã được thu hồi"
      const timestamp = new Date().toISOString();
      const retractedMessageContent = "Tin nhắn đã được thu hồi";

      // Xóa hình ảnh nếu có
      const updatedMessages = messages.map((msg, index) => {
        if (index === selectedMessageIndex) {
          return {
            ...msg,
            content: retractedMessageContent,
            image: null,
          };
        }
        return msg;
      });

      // Cập nhật tin nhắn ở cả hai bên
      const updateSenderParams = {
        TableName: "BoxChats",
        Key: {
          senderEmail: `${user.email}_${friend.email}`,
        },
        UpdateExpression:
          "SET messages[" +
          selectedMessageIndex +
          "].content = :content, messages[" +
          selectedMessageIndex +
          "].image = :image",
        ExpressionAttributeValues: {
          ":content": retractedMessageContent,
          ":image": null,
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(updateSenderParams).promise();

      const updateReceiverParams = {
        TableName: "BoxChats",
        Key: {
          senderEmail: `${friend.email}_${user.email}`,
        },
        UpdateExpression:
          "SET messages[" +
          selectedMessageIndex +
          "].content = :content, messages[" +
          selectedMessageIndex +
          "].image = :image",
        ExpressionAttributeValues: {
          ":content": retractedMessageContent,
          ":image": null,
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(updateReceiverParams).promise();

      // Cập nhật state và đóng modal
      setMessages(updatedMessages);
      closeModal();
    } catch (error) {
      console.error("Error retracting message:", error);
    }
  };

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
                {selectedMessage.isSender ? (
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
    // fetchMessages();
    const interval = setInterval(fetchMessages, 500); // Gọi fetch tin nhắn mỗi 1 giây
    return () => clearInterval(interval); // Xóa interval khi component unmount
  }, []);

  const fetchMessages = async () => {
    try {
      const senderParams = {
        TableName: "BoxChats",
        Key: {
          senderEmail: `${user.email}_${friend.email}`,
        },
      };
      const senderResponse = await dynamoDB.get(senderParams).promise();
      const senderMessages = senderResponse.Item
        ? senderResponse.Item.messages
        : [];

      // Không cần thay đổi đường dẫn hình ảnh ở đây, sử dụng trực tiếp đường dẫn từ tin nhắn
      setMessages(senderMessages);
      scrollToBottom();
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const sendMessage = async () => {
    try {
      // Nếu không có tin nhắn văn bản hoặc hình ảnh, không thực hiện gửi
      if (newMessage.trim() === "" && avatarImg === null) {
        return;
      }

      const timestamp = new Date().toISOString();

      // Tin nhắn văn bản
      if (newMessage.trim() !== "") {
        const senderMessage = {
          content: newMessage,
          senderEmail: `${user.email}_${friend.email}`,
          receiverEmail: friend.email,
          timestamp: timestamp,
          isSender: true,
        };

        const receiverMessage = {
          content: newMessage,
          senderEmail: `${friend.email}_${user.email}`,
          receiverEmail: user.email,
          timestamp: timestamp,
          isSender: false,
        };

        // Cập nhật tin nhắn cho người gửi
        const senderParams = {
          TableName: "BoxChats",
          Key: {
            senderEmail: `${user.email}_${friend.email}`,
          },
          UpdateExpression: "SET messages = list_append(messages, :newMessage)",
          ExpressionAttributeValues: {
            ":newMessage": [senderMessage],
          },
          ReturnValues: "UPDATED_NEW",
        };
        await dynamoDB.update(senderParams).promise();

        // Cập nhật tin nhắn cho người nhận
        const receiverParams = {
          TableName: "BoxChats",
          Key: {
            senderEmail: `${friend.email}_${user.email}`,
          },
          UpdateExpression: "SET messages = list_append(messages, :newMessage)",
          ExpressionAttributeValues: {
            ":newMessage": [receiverMessage],
          },
          ReturnValues: "UPDATED_NEW",
        };
        await dynamoDB.update(receiverParams).promise();

        // Cập nhật state tin nhắn và làm mới input
        setMessages([...messages, senderMessage]);
        setNewMessage(""); // Reset giá trị của newMessage sau khi gửi tin nhắn
        scrollToBottom();
      }

      // Tin nhắn hình ảnh
      if (avatarImg !== null) {
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
        const filePath = `${user.email}_${Date.now().toString()}.${fileType}`;

        const response = await fetch(avatarImg);
        const blob = await response.blob();
        // Upload hình ảnh lên S3
        const paramsS3 = {
          Bucket: bucketName,
          Key: filePath,
          Body: blob,
          ContentType: contentType,
        };
        const data = await s3.upload(paramsS3).promise();
        const imageURL = data.Location;

        // Thêm tin nhắn hình ảnh vào danh sách tin nhắn của người gửi và người nhận
        const senderMessage = {
          content: imageURL,
          senderEmail: `${user.email}_${friend.email}`,
          receiverEmail: friend.email,
          timestamp: timestamp,
          isSender: true,
          image: imageURL,
        };

        const receiverMessage = {
          content: imageURL,
          senderEmail: `${friend.email}_${user.email}`,
          receiverEmail: user.email,
          timestamp: timestamp,
          isSender: false,
          image: imageURL,
        };

        // Cập nhật tin nhắn cho người gửi
        const senderParams = {
          TableName: "BoxChats",
          Key: {
            senderEmail: `${user.email}_${friend.email}`,
          },
          UpdateExpression: "SET messages = list_append(messages, :newMessage)",
          ExpressionAttributeValues: {
            ":newMessage": [senderMessage],
          },
          ReturnValues: "UPDATED_NEW",
        };
        await dynamoDB.update(senderParams).promise();

        // Cập nhật tin nhắn cho người nhận
        const receiverParams = {
          TableName: "BoxChats",
          Key: {
            senderEmail: `${friend.email}_${user.email}`,
          },
          UpdateExpression: "SET messages = list_append(messages, :newMessage)",
          ExpressionAttributeValues: {
            ":newMessage": [receiverMessage],
          },
          ReturnValues: "UPDATED_NEW",
        };
        await dynamoDB.update(receiverParams).promise();

        // Cập nhật state tin nhắn và làm mới input
        setMessages([...messages, senderMessage]);
        cancelImage();
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
        <Text style={styles.headerText}>{friend.hoTen}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        ref={scrollViewRef}
      >
        {messages.map((message, index) => (
          <Pressable
            key={index}
            onLongPress={() => handleLongPress(message, index)}
            style={[
              styles.messageContainer,
              {
                alignSelf: message.isSender ? "flex-end" : "flex-start",
                backgroundColor: message.isSender ? "#94e5f2" : "#dddddd",
                opacity:
                  selectedMessage && selectedMessageIndex !== index ? 0.5 : 1,
              },
            ]}
          >
            {message.image ? (
              <Lightbox underlayColor="transparent">
                <Image
                  resizeMode="contain"
                  source={{ uri: message.image }}
                  style={{
                    width: "100%", // Điều chỉnh kích thước theo ý muốn của bạn
                    aspectRatio: 1, // Duy trì tỷ lệ khung hình
                    borderRadius: 10,
                  }}
                />
              </Lightbox>
            ) : (
              <Text style={styles.messageText}>{message.content}</Text>
            )}
            <Text style={styles.messageTimestamp}>
              {formatMessageTimestamp(message.timestamp)}
            </Text>
          </Pressable>
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
      <View style={styles.inputContainer}>
        <Pressable>
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
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gửi</Text>
        </Pressable>
      </View>
      {renderModal()}
    </View>
  );
};

export default BoxChat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    maxWidth: "80%",
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  messageText: {
    fontSize: 16,
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
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    padding: 20,
    alignSelf: "stretch",
    flexDirection: "row",
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
});
