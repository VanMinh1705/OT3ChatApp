import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import FriendScreen from "./FriendScreen";
import ChatSceen from "./ChatSceen";
import GroupScreen from "./GroupScreen";

const PhoneBookScreen = () => {
  const [select, setSelect] = useState(1);

  const renderScreen = () => {
    if (select === 1) {
      return <FriendScreen />;
    } else if (select === 2) {
      return <GroupScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          height: 50,
          alignItems: "center",
          backgroundColor: "#FFFFFF",
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
          <Text style={{fontSize:20}}>Bạn bè</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSelect(2);
          }}
          style={{}}
        >
          <Text style={{fontSize:20}}>Nhóm</Text>
        </Pressable>
      </View>
      <View style={styles.dividerVertical} />
      <SafeAreaView>{renderScreen()}</SafeAreaView>
    </SafeAreaView>
  );
};

export default PhoneBookScreen;

const styles = StyleSheet.create({
  dividerVertical: {
    width: "100%",
    height: 1,
    backgroundColor: '#000000',
  },
});
