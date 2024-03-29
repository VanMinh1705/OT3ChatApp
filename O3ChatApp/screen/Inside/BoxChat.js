import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  BackHandler,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import { DynamoDB } from "aws-sdk";
import { ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION } from "@env";

const BoxChat = ({ navigation, route }) => {
  const { friend, user } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
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

  const fetchMessages = async () => {
    try {
      // Lấy tin nhắn từ cơ sở dữ liệu của người gửi
      const senderParams = {
        TableName: "BoxChats",
        Key: {
          senderPhoneNumber: user.soDienThoai,
        },
      };
      const senderResponse = await dynamoDB.get(senderParams).promise();
      const senderMessages = senderResponse.Item
        ? senderResponse.Item.messages
        : [];

      setMessages(senderMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === "") {
      return;
    }

    const timestamp = new Date().toISOString();

    const senderMessage = {
      content: newMessage,
      senderPhoneNumber: user.soDienThoai,
      receiverPhoneNumber: friend.soDienThoai,
      timestamp: timestamp,
      isSender: true,
    };

    const receiverMessage = {
      content: newMessage,
      senderPhoneNumber: friend.soDienThoai,
      receiverPhoneNumber: user.soDienThoai,
      timestamp: timestamp,
      isSender: false,
    };

    try {
      // Cập nhật tin nhắn vào cơ sở dữ liệu của người gửi
      const senderParams = {
        TableName: "BoxChats",
        Key: {
          senderPhoneNumber: user.soDienThoai,
        },
        UpdateExpression: "SET messages = list_append(messages, :newMessage)",
        ExpressionAttributeValues: {
          ":newMessage": [senderMessage],
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(senderParams).promise();

      // Cập nhật tin nhắn vào cơ sở dữ liệu của người nhận
      const receiverParams = {
        TableName: "BoxChats",
        Key: {
          senderPhoneNumber: friend.soDienThoai,
        },
        UpdateExpression: "SET messages = list_append(messages, :newMessage)",
        ExpressionAttributeValues: {
          ":newMessage": [receiverMessage],
        },
        ReturnValues: "UPDATED_NEW",
      };
      await dynamoDB.update(receiverParams).promise();

      // Cập nhật tin nhắn trong state của BoxChat
      setMessages([...messages, senderMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{friend.hoTen}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {messages.map((message, index) =>
          // Render tin nhắn của người gửi
          message.isSender ? (
            <View
              key={index}
              style={[
                styles.messageContainer,
                {
                  alignSelf: "flex-end",
                  backgroundColor: "#ffffff",
                },
              ]}
            >
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          ) : (
            // Render tin nhắn của người nhận
            <View
              key={index}
              style={[
                styles.messageContainer,
                {
                  alignSelf: "flex-start",
                  backgroundColor: "#dddddd",
                },
              ]}
            >
              <Text style={styles.messageText}>{message.content}</Text>
            </View>
          )
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.inputBox}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Nhập tin nhắn"
        />
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Gửi</Text>
        </Pressable>
      </View>
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
});
