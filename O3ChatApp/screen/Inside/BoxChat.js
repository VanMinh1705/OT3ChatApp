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
  Platform,
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

const socket = io("http://172.28.107.37:3000");

const BoxChat = ({ navigation, route }) => {
  const { friend, user } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollViewRef = useRef(null);
  const textInputRef = useRef(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [avatarImg, setAvatarImg] = useState(null);
  const [fileType, setFileType] = useState(""); // Thêm state mới để lưu trữ fileType
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileTypeDoc, setFileTypeDoc] = useState(""); // Thêm state mới để lưu trữ fileType

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

  // Hàm gửi file
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
        content: "Đã gửi một file",
        senderEmail: `${user.email}_${friend.email}`,
        receiverEmail: friend.email,
        timestamp: timestamp,
        isSender: true,
        fileURL: fileURL,
        fileName: selectedFile.name, // Thêm URL của file vào tin nhắn
      };
      const receiverMessage = {
        content: "Đã gửi một file",
        senderEmail: `${friend.email}_${user.email}`,
        receiverEmail: user.email,
        timestamp: timestamp,
        isSender: false,
        fileURL: fileURL,
        fileName: selectedFile.name, // Thêm URL của file vào tin nhắn
      };

      // Gửi tin nhắn qua Socket.IO
      socket.emit("sendFileMessage", { senderMessage, receiverMessage });

      // Cập nhật state messages
      setMessages([...messages, senderMessage]);
      scrollToBottom(); // Cuộn xuống cuối danh sách tin nhắn

      // Reset selectedFile state
      cancelDoc();
    } catch (error) {
      console.error("Error sending file:", error);
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

  // Cập nhật mã trong phần BoxChat.js

  // Gửi tin nhắn thu hồi
  const retractMessage = async () => {
    try {
      // Cập nhật tin nhắn thu hồi trong cơ sở dữ liệu và gửi thông báo đến máy nhận
      socket.emit("retractMessage", {
        senderEmail: `${user.email}_${friend.email}`,
        receiverEmail: `${friend.email}_${user.email}`,
        selectedMessageIndex: selectedMessageIndex,
      });

      // Cập nhật trạng thái tin nhắn thu hồi trên máy của bạn
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
      console.error("Error retracting message:", error);
    }
  };

  // Socket.IO connections
  useEffect(() => {
    // Lắng nghe sự kiện tin nhắn thu hồi từ server
    socket.on(
      "receiveRetractMessage",
      ({ senderEmail, receiverEmail, selectedMessageIndex }) => {
        // Kiểm tra xem tin nhắn thu hồi có thuộc về máy nhận không
        if (receiverEmail === `${user.email}_${friend.email}`) {
          // Cập nhật trạng thái tin nhắn thu hồi trên máy của bạn
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
      socket.off("receiveRetractMessage");
    };
  }, [messages]);

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
        <View style={styles.modalContainer}>
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
    fetchMessages();
  }, []);

  // Client
  // Đăng ký sự kiện lắng nghe receiveMessage từ server
  useEffect(() => {
    socket.on("receiveMessage", ({ senderMessage }) => {
      // Xác định liệu tin nhắn đó có phải từ người gửi hiện tại hay không
      const isCurrentSender =
        senderMessage.senderEmail === `${user.email}_${friend.email}`;

      // Chỉ cập nhật tin nhắn nếu không phải là tin nhắn từ client gửi
      if (!isCurrentSender) {
        // Cập nhật giao diện người dùng với tin nhắn mới
        setMessages((prevMessages) => [
          ...prevMessages,
          { ...senderMessage, isSender: isCurrentSender },
        ]);
        scrollToBottom(); // Cuộn xuống cuối danh sách tin nhắn
      }
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, []);

  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const reachedEnd =
      contentOffset.y >= contentSize.height - layoutMeasurement.height;
    setShouldScrollToBottom(reachedEnd); // Chỉ tự động cuộn xuống nếu đang ở cuối danh sách
  };

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
      if (shouldScrollToBottom) {
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  // Hàm gửi tin nhắn văn bản
  const sendTextMessage = async () => {
    try {
      if (newMessage.trim() === "") return;

      const timestamp = new Date().toISOString();
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

      socket.emit("sendMessage", { senderMessage, receiverMessage });

      setMessages([...messages, senderMessage]);
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Hàm gửi hình ảnh
  const sendImageMessage = async () => {
    try {
      if (avatarImg === null) return;

      const timestamp = new Date().toISOString();
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
          contentType = "application/octet-stream";
      }

      const filePath = `${user.email}_${Date.now().toString()}.${fileType}`;
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
        content: "Đã gửi một hình ảnh",
        senderEmail: `${user.email}_${friend.email}`,
        receiverEmail: friend.email,
        timestamp: timestamp,
        isSender: true,
        image: imageURL,
      };
      const receiverMessage = {
        content: "Đã gửi một hình ảnh",
        senderEmail: `${friend.email}_${user.email}`,
        receiverEmail: user.email,
        timestamp: timestamp,
        isSender: false,
        image: imageURL,
      };

      socket.emit("sendImage", { senderMessage, receiverMessage });

      setMessages([...messages, senderMessage]);
      cancelImage();
      scrollToBottom();
    } catch (error) {
      console.error("Error sending image:", error);
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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{friend.hoTen}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        ref={scrollViewRef}
        onScroll={handleScroll}
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
            {message.fileURL ? (
              <View style={[styles.fileContainer, { flexDirection: "row" }]}>
                <Text style={styles.fileName}>File: {message.fileName}</Text>
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
                }}
              />
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
              sendTextMessage(); // Gửi tin nhắn văn bản nếu có nội dung tin nhắn
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
    top: 680,
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
  cancelFileButton: {
    position: "absolute", // Định vị nút hủy gửi tương đối với phần tử cha (selectedImageContainer)
    top: -18, // Đặt vị trí của nút từ trên xuống 5px
    right: 5, // Đặt vị trí của nút từ phải sang trái 5px
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Màu nền của nút hủy gửi
    borderRadius: 20, // Bo tròn các góc của nút
    padding: 5, // Tăng khoảng cách giữa biên nút và văn bản bên trong nút
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
