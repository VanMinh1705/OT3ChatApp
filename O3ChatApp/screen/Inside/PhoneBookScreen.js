import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import FriendScreen from "./FriendScreen";
import ChatSceen from "./ChatSceen";

const PhoneBookScreen = () => {
  const [select, setSelect] = useState(1);

  const renderScreen = () => {
    if (select === 1) {
      return <FriendScreen />;
    } else if (select === 2) {
      return <ChatSceen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          height: 50,
          alignItems: "center",
          backgroundColor: "#ccc",
          flexDirection: "row",
          justifyContent: "space-around",
        }}
      >
        <Pressable
          onPress={() => {
            setSelect(1);
          }}
          style={{}}
        >
          <Text>Bạn bè</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSelect(2);
          }}
          style={{}}
        >
          <Text>Nhóm</Text>
        </Pressable>
      </View>

      <SafeAreaView>{renderScreen()}</SafeAreaView>
    </SafeAreaView>
  );
};

export default PhoneBookScreen;

const styles = StyleSheet.create({});
