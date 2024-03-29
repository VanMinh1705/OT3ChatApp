import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import FriendScreen from "./FriendScreen";
import ChatSceen, { WINDOW_HEIGHT } from "./ChatSceen";
import GroupScreen from "./GroupScreen";

const PhoneBookScreen = ({ navigation, user }) => {
  const [select, setSelect] = useState(1);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabItem, select === 1 && styles.selectedTab]}
          onPress={() => setSelect(1)}
        >
          <Text style={styles.tabText}>Bạn bè</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, select === 2 && styles.selectedTab]}
          onPress={() => setSelect(2)}
        >
          <Text style={styles.tabText}>Nhóm</Text>
        </Pressable>
      </View>
      <View style={styles.dividerVertical} />
      <SafeAreaView style={styles.screenContainer}>
        {select === 1 ? (
          <FriendScreen user={user} navigation={navigation} />
        ) : (
          <GroupScreen user={user} navigation={navigation} />
        )}
      </SafeAreaView>
    </SafeAreaView>
  );
};

export default PhoneBookScreen;

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    height: 50,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  selectedTab: {
    backgroundColor: "#4AD8C7",
  },
  tabText: {
    fontSize: 20,
  },
  dividerVertical: {
    width: "100%",
    height: 1,
    backgroundColor: "#000000",
  },
  screenContainer: {
    flex: 1,
  },
});
